import { openDB, type IDBPDatabase } from 'idb';
import type {
	DBChannel,
	DBCollection,
	DBItem,
	NormalizedRSSFeed,
	RSSDatabase
} from '$lib/types/rss';
import { generateItemId } from '$lib/utils/itemId';
import { normalizeText } from '$lib/utils/searchUtils';

const DB_NAME = 'rss-reader-db';
const DB_VERSION = 2;

export async function getDB(): Promise<IDBPDatabase<RSSDatabase>> {
	return openDB<RSSDatabase>(DB_NAME, DB_VERSION, {
		upgrade(db, oldversion, newVersion, transaction) {
			// Create Channels Store
			if (!db.objectStoreNames.contains('channels')) {
				db.createObjectStore('channels', { keyPath: 'link' });
			}

			// Create Items Store
			if (!db.objectStoreNames.contains('items')) {
				const itemStore = db.createObjectStore('items', { keyPath: 'id' });
				itemStore.createIndex('by-channel', 'channelId');
			}

			// Create Collections Store
			if (!db.objectStoreNames.contains('collections')) {
				db.createObjectStore('collections', { keyPath: 'id' });
			}

			const itemStore = transaction.objectStore('items');

			if (!itemStore.indexNames.contains('by-date')) {
				itemStore.createIndex('by-date', 'timestamp');
			}

			if (!itemStore.indexNames.contains('by-channel-date')) {
				itemStore.createIndex('by-channel-date', ['channelId', 'timestamp']);
			}

			if (!itemStore.indexNames.contains('by-fav-date')) {
				itemStore.createIndex('by-fav-date', ['favourite', 'timestamp']);
			}
		}
	});
}

function getTimestamp(dateStr?: string): number {
	if (!dateStr) return Date.now();
	const date = new Date(dateStr);
	return isNaN(date.getTime()) ? Date.now() : date.getTime();
}

export async function saveFeedToDB(feed: NormalizedRSSFeed, sourceUrl: string) {
	const db = await getDB();
	const tx = db.transaction(['channels', 'items'], 'readwrite');
	const channelStore = tx.objectStore('channels');
	const itemStore = tx.objectStore('items');

	const channelId = feed.data.link;
	const existingChannel = await channelStore.get(channelId);

	// Save Channel
	await channelStore.put({
		...feed.data,
		savedAt: Date.now(),
		feedUrl: sourceUrl,
		collectionIds: existingChannel?.collectionIds ?? [],
		hideOnMainFeed: existingChannel?.hideOnMainFeed ?? false,
		customTitle: existingChannel?.customTitle
	});

	// Save Items
	const operations = feed.items.map(async (item) => {
		const itemId = generateItemId(item, channelId);
		const existingItem = await itemStore.get(itemId);

		const timestamp = getTimestamp(item.pubDate);

		if (!existingItem) {
			const newItem: DBItem = {
				...item,
				id: itemId,
				channelId: channelId,
				savedAt: Date.now(),
				timestamp,
				read: false,
				closed: false,
				favourite: 0,
				_searchTokens: createSearchTokens(item)
			};
			return itemStore.put(newItem);
		} else {
			// Only update if content changed, but preserve local state (read, fav, etc)
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
					_searchTokens: createSearchTokens(item)
				};
				return itemStore.put(updatedItem);
			}

			return Promise.resolve();
		}
	});

	await Promise.all(operations);
	await tx.done;
}

// OPTIMIZED LOADING
export interface FeedFilter {
	channelId?: string;
	collectionId?: string;
	onlyFavourites?: boolean;
	searchQuery?: string;
}

export interface PaginatedResult {
	items: DBItem[];
	total: number;
}

export async function getPaginatedItems(
	page: number = 1,
	limit: number = 20,
	filter: FeedFilter
): Promise<PaginatedResult> {
	const db = await getDB();

	// 1. Handle Search Mode (Fast exit)
	if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
		return searchItemsInDB(filter.searchQuery, page, limit);
	}

	// 2. PREPARE DATA - Do this BEFORE opening the transaction
	// We fetch channel info first to avoid transaction auto-close/deadlock issues
	let allowedChannelIds: Set<string> | null = null;
	let indexName: 'by-date' | 'by-channel-date' | 'by-fav-date' = 'by-date';
	let range: IDBKeyRange | null = null;

	if (filter.channelId) {
		// Single Channel: No extra fetching needed
		indexName = 'by-channel-date';
		range = IDBKeyRange.bound([filter.channelId, 0], [filter.channelId, Infinity]);
	} else if (filter.onlyFavourites) {
		// Favourites: No extra fetching needed
		indexName = 'by-fav-date';
		range = IDBKeyRange.bound([1, 0], [1, Infinity]);
	} else if (filter.collectionId) {
		// Collection: We must fetch channels to know which IDs belong to this collection
		indexName = 'by-date';
		const channels = await db.getAll('channels');
		allowedChannelIds = new Set(
			channels.filter((c) => c.collectionIds?.includes(filter.collectionId!)).map((c) => c.link)
		);
	} else {
		// Main Feed: We must fetch channels to filter out "Hide on Main Feed"
		indexName = 'by-date';
		const channels = await db.getAll('channels');
		const hiddenChannels = channels.filter((c) => c.hideOnMainFeed);

		if (hiddenChannels.length > 0) {
			allowedChannelIds = new Set(channels.filter((c) => !c.hideOnMainFeed).map((c) => c.link));
		}
	}

	// 3. START TRANSACTION - Now that we have our IDs, we can open the tx safely
	// Note: We only need 'items' here, not 'channels'
	const tx = db.transaction('items', 'readonly');
	const itemStore = tx.objectStore('items');
	const index = itemStore.index(indexName);

	// 4. ITERATE
	let cursor = await index.openCursor(range, 'prev');

	const items: DBItem[] = [];
	let skipped = 0;
	const skipCount = (page - 1) * limit;
	let matchCount = 0;

	while (cursor) {
		const item = cursor.value;
		let matches = !item.closed;

		// Apply Allowed Channels Filter (for Collections or Hidden feeds)
		if (matches && allowedChannelIds) {
			matches = allowedChannelIds.has(item.channelId);
		}

		if (matches) {
			matchCount++;

			if (skipped < skipCount) {
				skipped++;
			} else if (items.length < limit) {
				items.push(item);
			}
		}

		// Optimization: If we have enough items, we technically don't need to iterate more
		// unless we strictly need the EXACT total for the scrollbar.
		// For performance on large DBs, you might want to break here later.

		cursor = await cursor.continue();
	}

	// If we didn't filter by a Set, we can use the fast index count
	let total = matchCount;
	if (!allowedChannelIds && !filter.collectionId && !filter.onlyFavourites && !filter.channelId) {
		// Fallback for clean main feed if no hidden channels exist
		// But since we are iterating anyway to calculate 'matchCount', using matchCount is safer.
	}

	return { items, total: matchCount };
}

async function searchItemsInDB(
	query: string,
	page: number,
	limit: number
): Promise<PaginatedResult> {
	const db = await getDB();
	const tx = db.transaction('items', 'readonly');
	const store = tx.objectStore('items');
	const index = store.index('by-date');
	const lowerQuery = query.toLowerCase();

	let cursor = await index.openCursor(null, 'prev');

	const items: DBItem[] = [];
	let skipped = 0;
	const skipCount = (page - 1) * limit;
	let totalMatches = 0;

	while (cursor) {
		const item = cursor.value;

		if (item._searchTokens.includes(lowerQuery) && !item.closed) {
			totalMatches++;

			if (skipped < skipCount) {
				skipped++;
			} else if (items.length < limit) {
				items.push(item);
			}
		}

		cursor = await cursor.continue();
	}

	return { items, total: totalMatches };
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

// --- Collection Management ---
export async function getAllCollections(): Promise<DBCollection[]> {
	const db = await getDB();
	return db.getAll('collections');
}

export async function createCollection(name: string) {
	const db = await getDB();
	const newCollection: DBCollection = {
		id: await generateUniqueCollectionId(db, name),
		name,
		createdAt: Date.now()
	};
	await db.put('collections', newCollection);
}

async function generateUniqueCollectionId(
	db: IDBPDatabase<RSSDatabase>,
	name: string
): Promise<string> {
	const baseSlug = name
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.substring(0, 50);

	// Check if base slug is unique
	let slug = baseSlug;
	let counter = 1;

	while (await db.get('collections', slug)) {
		slug = `${baseSlug}-${counter}`;
		counter++;
	}

	return slug;
}

export async function deleteCollection(collectionId: string) {
	const db = await getDB();
	const tx = db.transaction(['collections', 'channels'], 'readwrite');

	await tx.objectStore('collections').delete(collectionId);

	const channelStore = tx.objectStore('channels');
	let cursor = await channelStore.openCursor();

	while (cursor) {
		const channel = cursor.value;
		if (channel.collectionIds && channel.collectionIds.includes(collectionId)) {
			const updatedChannel = {
				...channel,
				collectionIds: channel.collectionIds.filter((id) => id !== collectionId)
			};
			await cursor.update(updatedChannel);
		}
		cursor = await cursor.continue();
	}

	await tx.done;
}

// --- Channel Metadata Management ---
export async function updateChannelSettings(
	channelId: string,
	updates: {
		customTitle?: string;
		hideOnMainFeed?: boolean;
		collectionIds?: string[];
	}
) {
	const db = await getDB();
	const tx = db.transaction('channels', 'readwrite');
	const store = tx.objectStore('channels');

	const channel = await store.get(channelId);
	if (channel) {
		// Apply updates, fallback to existing if undefined
		const updatedChannel: DBChannel = {
			...channel,
			customTitle: updates.customTitle !== undefined ? updates.customTitle : channel.customTitle,
			hideOnMainFeed:
				updates.hideOnMainFeed !== undefined ? updates.hideOnMainFeed : channel.hideOnMainFeed,
			collectionIds:
				updates.collectionIds !== undefined ? updates.collectionIds : channel.collectionIds || []
		};

		await store.put(updatedChannel);
	}
	await tx.done;
}

export async function toggleChannelCollection(
	channelId: string,
	collectionId: string,
	addToCollection: boolean
) {
	const db = await getDB();
	const channel = await db.get('channels', channelId);

	if (channel) {
		const currentCollections = new Set(channel.collectionIds || []);
		if (addToCollection) {
			currentCollections.add(collectionId);
		} else {
			currentCollections.delete(collectionId);
		}

		await updateChannelSettings(channelId, { collectionIds: Array.from(currentCollections) });
	}
}

function createSearchTokens(item: any): string {
	return normalizeText(
		[
			item.title,
			item.description,
			item.author,
			Array.isArray(item.category) ? item.category.join(' ') : item.category
		].join(' ')
	);
}
