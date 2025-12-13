import { openDB, type IDBPDatabase } from 'idb';
import type { DBChannel, DBItem, NormalizedRSSFeed, RSSDatabase } from '$lib/types/rss';
import { generateItemId } from '$lib/utils/itemId';
import { normalizeText } from '$lib/utils/searchUtils';

const DB_NAME = 'rss-reader-db';
const DB_VERSION = 1;

export async function getDB(): Promise<IDBPDatabase<RSSDatabase>> {
	return openDB<RSSDatabase>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			// Create Channels Store
			if (!db.objectStoreNames.contains('channels')) {
				db.createObjectStore('channels', { keyPath: 'link' });
			}

			// Create Items Store
			if (!db.objectStoreNames.contains('items')) {
				const itemStore = db.createObjectStore('items', { keyPath: 'id' });
				itemStore.createIndex('by-channel', 'channelId');
			}
		}
	});
}

export async function saveFeedToDB(feed: NormalizedRSSFeed, sourceUrl: string) {
	const db = await getDB();
	const tx = db.transaction(['channels', 'items'], 'readwrite');
	const channelStore = tx.objectStore('channels');
	const itemStore = tx.objectStore('items');

	const timestamp = Date.now();
	const channelId = feed.data.link;

	// --- Save Channel ---
	await channelStore.put({
		...feed.data,
		savedAt: timestamp,
		feedUrl: sourceUrl
	});

	// --- Save Items (Upsert Strategy)---
	const operations = feed.items.map(async (item) => {
		const itemId = generateItemId(item, channelId);
		const existingItem = await itemStore.get(itemId);
		const searchTokens = createSearchTokens(item);

		if (!existingItem) {
			const newItem: DBItem = {
				...item,
				id: itemId,
				channelId: channelId,
				savedAt: timestamp,
				read: false,
				closed: false,
				favourite: false,
				_searchTokens: searchTokens
			};
			return itemStore.put(newItem);
		} else {
			// UPDATE: Existing Item
			// We recognize this item (same GUID/Link), but the title might be fixed.

			const hasContentChanged =
				existingItem.title !== item.title ||
				existingItem.description !== item.description ||
				existingItem.image !== item.image;

			if (hasContentChanged) {
				const updatedItem: DBItem = {
					...existingItem,
					title: item.title,
					description: item.description,
					link: item.link,
					pubDate: item.pubDate,
					author: item.author,
					category: item.category,
					image: item.image,
					_searchTokens: searchTokens
				};
				return itemStore.put(updatedItem);
			}

			return Promise.resolve();
		}
	});

	await Promise.all(operations);
	await tx.done;
}

export async function getAllItems(): Promise<DBItem[]> {
	const db = await getDB();
	return db.getAll('items');
}

export async function getAllChannels(): Promise<DBChannel[]> {
	const db = await getDB();
	return db.getAll('channels');
}

export async function deleteChannel(channelId: string) {
	const db = await getDB();
	const tx = db.transaction(['channels', 'items'], 'readwrite');
	const channelStore = tx.objectStore('channels');
	const itemStore = tx.objectStore('items');

	await channelStore.delete(channelId);

	const index = itemStore.index('by-channel');
	let cursor = await index.openCursor(IDBKeyRange.only(channelId));

	while (cursor) {
		await cursor.delete();
		cursor = await cursor.continue();
	}

	await tx.done;
}

export async function updateItem(itemId: string, updates: Partial<DBItem>) {
	const db = await getDB();
	const tx = db.transaction('items', 'readwrite');
	const store = tx.objectStore('items');

	const item = await store.get(itemId);
	if (item) {
		const updatedItem = { ...item, ...updates };
		await store.put(updatedItem);
	}
	await tx.done;
}

function createSearchTokens(item: any): string {
	console.log(
		normalizeText(
			[
				item.title,
				item.description,
				item.author,
				Array.isArray(item.category) ? item.category.join(' ') : item.category
			].join(' ')
		)
	);
	return normalizeText(
		[
			item.title,
			item.description,
			item.author,
			Array.isArray(item.category) ? item.category.join(' ') : item.category
		].join(' ')
	);
}
