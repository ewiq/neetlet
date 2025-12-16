import { goto } from '$app/navigation';
import { menuState } from '$lib/stores/menu.svelte';
import { settings } from '$lib/stores/settings.svelte';
import type { DBChannel } from '$lib/types/rss';

export async function filterByChannel(channel: DBChannel) {
	const params = new URLSearchParams();
	params.set('channel', channel.link);

	await goto(`?${params.toString()}`, {});

	window.scrollTo({ top: 0, behavior: 'smooth' });

	if (settings.isMobile) {
		menuState.isSubsMenuOpen = false;
	}
}
