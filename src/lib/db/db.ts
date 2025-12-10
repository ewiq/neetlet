import { openDB, type IDBPDatabase } from 'idb';
import type { DBChannel, DBItem, NormalizedRSSFeed, RSSDatabase } from '$lib/types/rss';

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

	// --- Save Channel ---
	const channelData: DBChannel = {
		...feed.data,
		savedAt: timestamp,
		feedUrl: sourceUrl
	};

	await channelStore.put(channelData);

	// --- Save Items ---
	const operations = feed.items.map(async (item) => {
		const itemId = item.guid || item.link;
		const channelId = feed.data.link;

		const existingItem = await itemStore.get(itemId);

		if (!existingItem) {
			const newItem: DBItem = {
				...item,
				id: itemId,
				channelId: channelId,
				savedAt: timestamp,
				read: false,
				closed: false,
				favourite: false
			};
			return itemStore.add(newItem);
		} else {
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
