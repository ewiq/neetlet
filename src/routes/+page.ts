import { getPaginatedItems, getDB, type FeedFilter } from '$lib/db/db'; // Import getDB or a getChannels helper
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, depends }) => {
	depends('app:feed');
	const db = await getDB();
	const channels = await db.getAll('channels');
	const collections = await db.getAll('collections');

	const searchQuery = url.searchParams.get('q') || '';
	const channelFilter = url.searchParams.get('channel') || '';
	const collectionFilter = url.searchParams.get('collection') || '';
	const favFilter = url.searchParams.get('favs') || '';

	let activeChannelTitle: string | undefined;
	let activeCollectionName: string | undefined;

	if (channelFilter) {
		const c = channels.find((ch) => ch.link === channelFilter);
		activeChannelTitle = c?.customTitle || c?.title;
	}
	if (collectionFilter) {
		const c = collections.find((col) => col.id === collectionFilter);
		activeCollectionName = c?.name;
	}

	const filter: FeedFilter = {
		searchQuery,
		channelId: channelFilter || undefined,
		collectionId: collectionFilter || undefined,
		onlyFavourites: favFilter === '1'
	};

	const { items, total } = await getPaginatedItems(1, 15, filter);

	return {
		initialItems: items,
		totalCount: total,
		channels,
		filter,
		activeChannelTitle,
		activeCollectionName,
		searchQuery
	};
};
