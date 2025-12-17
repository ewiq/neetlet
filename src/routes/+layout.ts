import { getAllChannels, getAllCollections } from '$lib/db/db';
import type { LayoutLoad } from './$types';

export const ssr = false;

export const load: LayoutLoad = async ({ url, depends }) => {
	depends('app:feed');

	const [channels, collections] = await Promise.all([getAllChannels(), getAllCollections()]);

	return {
		channels,
		collections
	};
};
