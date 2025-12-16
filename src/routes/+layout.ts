// src/routes/+layout.ts

import { getAllItems, getAllChannels, getAllCollections } from '$lib/db/db';
import type { LayoutLoad } from './$types';
import type { UIItem, DBChannel } from '$lib/types/rss';

export const ssr = false;

export const load: LayoutLoad = async ({ url, depends }) => {
	depends('app:feed');

	const searchQuery = url.searchParams.get('q') || '';
	const channelFilter = url.searchParams.get('channel');
	const collectionFilter = url.searchParams.get('collection');
	const favFilter = url.searchParams.get('favs');

	const [items, channels, collections] = await Promise.all([
		getAllItems(),
		getAllChannels(),
		getAllCollections()
	]);

	const channelMap = new Map<string, DBChannel>(channels.map((c) => [c.link, c]));
	const nonClosedItems = items.filter((item) => !item.closed);

	let activeChannelTitle: string | undefined;
	let activeCollectionName: string | undefined;

	if (channelFilter) {
		const activeChannel = channelMap.get(channelFilter);
		activeChannelTitle = activeChannel
			? activeChannel.customTitle || activeChannel.title
			: undefined;
	}

	if (collectionFilter) {
		const activeCollection = collections.find((c) => c.id === collectionFilter);
		activeCollectionName = activeCollection ? activeCollection.name : undefined;
	}

	const enrichedItems: UIItem[] = nonClosedItems.map((item) => {
		const channel = channelMap.get(item.channelId);
		return {
			...item,
			channelTitle: channel ? channel.customTitle || channel.title : 'Unknown Feed',
			channelImage: channel ? channel.image : undefined
		};
	});

	let filteredItems = enrichedItems;

	if (channelFilter) {
		filteredItems = filteredItems.filter((item) => item.channelId === channelFilter);
	} else if (collectionFilter) {
		const allowedChannelIds = new Set(
			channels
				.filter((c) => c.collectionIds && c.collectionIds.includes(collectionFilter))
				.map((c) => c.link)
		);
		filteredItems = filteredItems.filter((item) => allowedChannelIds.has(item.channelId));
	}

	const isAggregatedView = !channelFilter && !collectionFilter && !favFilter;

	let processedItems = filteredItems;

	if (isAggregatedView) {
		const itemsByLink = new Map<string, UIItem[]>();

		filteredItems.forEach((item) => {
			const channel = channelMap.get(item.channelId);

			if (channel?.hideOnMainFeed) {
				return;
			}

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

	if (favFilter) {
		processedItems = processedItems.filter((item) => item.favourite);
	}

	const sortedItems = processedItems.sort((a, b) => {
		const dateA = a.pubDate ? new Date(a.pubDate).getTime() : a.savedAt;
		const dateB = b.pubDate ? new Date(b.pubDate).getTime() : b.savedAt;
		return dateB - dateA;
	});

	return {
		items: sortedItems,
		channels,
		collections,
		searchQuery,
		activeCollection: collectionFilter,
		activeChannel: channelFilter,
		activeChannelTitle,
		activeCollectionName
	};
};
