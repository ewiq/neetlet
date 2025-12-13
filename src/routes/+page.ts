import { getAllItems, getAllChannels } from '$lib/db/db';
import type { PageLoad } from './$types';
import type { UIItem } from '$lib/types/rss';

export const ssr = false;

export const load: PageLoad = async ({ url, depends }) => {
	depends('app:feed');

	const searchQuery = url.searchParams.get('q') || '';
	const feedFilter = url.searchParams.get('feed');

	const [items, channels] = await Promise.all([getAllItems(), getAllChannels()]);

	const channelMap = new Map(channels.map((c) => [c.link, c]));
	const nonClosedItems = items.filter((item) => !item.closed);

	// Add channel title and channel img to items
	const enrichedItems: UIItem[] = nonClosedItems.map((item) => {
		const channel = channelMap.get(item.channelId);
		return {
			...item,
			channelTitle: channel ? channel.title : 'Unknown Feed',
			channelImage: channel ? channel.image : undefined
		};
	});

	// Deduplicate items on main feed
	let processedItems = enrichedItems;

	if (!feedFilter) {
		const itemsByLink = new Map<string, UIItem[]>();

		enrichedItems.forEach((item) => {
			const key = item.link;
			if (!itemsByLink.has(key)) {
				itemsByLink.set(key, []);
			}
			itemsByLink.get(key)!.push(item);
		});

		processedItems = Array.from(itemsByLink.values()).map((duplicates) => {
			if (duplicates.length === 1) {
				return duplicates[0];
			}
			return duplicates.sort((a, b) => b.savedAt - a.savedAt)[0];
		});
	}

	// Sort by publication date
	const sortedItems = processedItems.sort((a, b) => {
		const dateA = a.pubDate ? new Date(a.pubDate).getTime() : a.savedAt;
		const dateB = b.pubDate ? new Date(b.pubDate).getTime() : b.savedAt;
		return dateB - dateA;
	});

	return {
		items: sortedItems,
		searchQuery
	};
};
