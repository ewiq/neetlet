<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/logo.png';
	import Toast from '$lib/components/menu/Toast.svelte';
	import Menu from '$lib/components/menu/Menu.svelte';
	import { toastData } from '$lib/stores/toast.svelte';
	import { invalidate } from '$app/navigation';
	import { initializeSettings, settings } from '$lib/stores/settings.svelte';
	import { menuState } from '$lib/stores/menu.svelte';
	import { lockScroll, trackDeviceState, unlockScroll } from '$lib/utils/uiUtils';
	import { searchbarState } from '$lib/stores/searchbar.svelte';
	import { currentTime } from '$lib/stores/time.svelte';
	import { syncAllFeeds } from '$lib/services/feedSync';
	import { sync } from '$lib/stores/sync.svelte';

	let { children } = $props();

	const REFRESH_INTERVAL = 15 * 60 * 1000;
	const INITIAL_SYNC_COOLDOWN = 5 * 60 * 1000;
	const SYNC_KEY = 'lastSync';
	let lastScrollY = 0;

	async function performSync() {
		if (sync.isSyncing) return;
		sync.isSyncing = true;
		try {
			await syncAllFeeds();
			localStorage.setItem(SYNC_KEY, Date.now().toString());
			await invalidate('app:feed');
		} catch (error) {
			console.error('Auto-sync failed:', error);
		} finally {
			sync.isSyncing = false;
		}
	}

	$effect(() => {
		const lastSync = parseInt(localStorage.getItem(SYNC_KEY) || '0');
		const timeSinceLast = Date.now() - lastSync;

		if (timeSinceLast > INITIAL_SYNC_COOLDOWN) {
			performSync();
		}

		const intervalId = setInterval(performSync, REFRESH_INTERVAL);

		return () => clearInterval(intervalId);
	});

	function handleScroll() {
		if (menuState.isSubsMenuOpen) return;
		const currentScrollY = window.scrollY;

		// Ignore bounce scrolling
		if (currentScrollY < 0) return;

		const scrollDelta = currentScrollY - lastScrollY;

		// Always show menu at very top
		if (currentScrollY < 50) {
			menuState.isMenuHidden = false;
			lastScrollY = currentScrollY;
			return;
		}

		// Toggle menu based on scroll direction
		if (Math.abs(scrollDelta) > 10) {
			menuState.isMenuHidden = scrollDelta > 0;
			if (menuState.isMenuHidden) menuState.isSettingsMenuOpen = false;
			lastScrollY = currentScrollY;
		}
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		// Ctrl + K for search
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			searchbarState.toggleSearchbar();
			return;
		}

		if (e.key === 'Escape') {
			menuState.closeAllMenus();
			searchbarState.closeBar();
		}
	}

	async function handleNewSubscription() {
		await invalidate('app:feed');
	}

	$effect(() => {
		const stopTime = currentTime.startUpdating();
		initializeSettings();

		const stopDevice = trackDeviceState();

		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			stopDevice();
			stopTime();
			window.removeEventListener('scroll', handleScroll);
		};
	});

	$effect(() => {
		if (settings.isMobile && menuState.isSubsMenuOpen) {
			lockScroll();
			menuState.isMenuHidden = false;
		} else {
			unlockScroll();
		}

		return () => unlockScroll();
	});
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>leatly</title>
</svelte:head>

<main class="m-0 min-h-dvh border-0 bg-background p-0">
	<Menu {handleNewSubscription} />
	{@render children()}
</main>

<Toast message={toastData.message} type={toastData.type} />
