<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { syncAllFeeds } from '$lib/services/feedSync';
	import { sync } from '$lib/stores/sync.svelte';
	import { menuState } from '$lib/stores/menu.svelte';
	import { page } from '$app/state';

	const REFRESH_INTERVAL = 15 * 60 * 1000;
	const SYNC_KEY = 'lastSync';

	// Logic to determine if we should show the spinner or do it quietly
	function shouldSyncQuietly() {
		const isScrolled = typeof window !== 'undefined' && window.scrollY > 200;
		const isFiltering =
			!!page.url.searchParams.get('q') ||
			!!page.url.searchParams.get('channel') ||
			!!page.url.searchParams.get('collection');
		const isMenuOpen = menuState.isSubsMenuOpen || menuState.isSettingsMenuOpen;

		return isScrolled || isFiltering || isMenuOpen;
	}

	async function performSync() {
		if (sync.isSyncing) return;

		const quiet = shouldSyncQuietly();

		if (!quiet) sync.isSyncing = true;

		try {
			const result = await syncAllFeeds();

			if (result.success) {
				localStorage.setItem(SYNC_KEY, Date.now().toString());
			}

			if (result.hasChanges) {
				if (quiet) {
					sync.hasNewData = true;
				} else {
					await invalidate('app:feed');
					sync.hasNewData = false;
				}
			}
		} catch (error) {
			console.error('Sync failed:', error);
		} finally {
			sync.isSyncing = false;
		}
	}

	$effect(() => {
		const lastSync = parseInt(localStorage.getItem(SYNC_KEY) || '0');
		if (Date.now() - lastSync > REFRESH_INTERVAL) performSync();

		const intervalId = setInterval(performSync, REFRESH_INTERVAL);
		return () => clearInterval(intervalId);
	});
</script>
