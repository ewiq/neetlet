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

	let { children } = $props();
	let lastScrollY = 0;

	// Configuration
	const REFRESH_INTERVAL = 15 * 60 * 1000;
	const INITIAL_SYNC_COOLDOWN = 5 * 60 * 1000;
	const SYNC_KEY = 'leaklet-last-sync';

	let isSyncing = $state(false);

	async function performSync() {
		if (isSyncing) return;
		isSyncing = true;
		try {
			await syncAllFeeds();
			localStorage.setItem(SYNC_KEY, Date.now().toString());
			await invalidate('app:feed');
		} catch (error) {
			console.error('Auto-sync failed:', error);
		} finally {
			isSyncing = false;
		}
	}

	$effect(() => {
		let intervalId: ReturnType<typeof setInterval>;

		const init = async () => {
			const lastSync = parseInt(localStorage.getItem(SYNC_KEY) || '0');
			const now = Date.now();
			const timeSinceLast = now - lastSync;

			if (timeSinceLast > INITIAL_SYNC_COOLDOWN) {
				console.log('Doing initial feed refresh...');
				await performSync();
			} else {
				console.log(
					`Skipping initial refresh (Last sync: ${Math.round(timeSinceLast / 1000)}s ago)`
				);
			}

			intervalId = setInterval(async () => {
				console.log('Triggering periodic refresh...');
				await performSync();
			}, REFRESH_INTERVAL);
		};

		init();

		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	});

	function handleScroll() {
		if (menuState.isSubsMenuOpen) return;

		const currentScrollY = window.scrollY;

		// Ignore invalid scroll values
		if (currentScrollY < 0) return;

		// Mobile
		if (settings.isMobile) {
			if (currentScrollY <= 50) {
				menuState.isMenuHidden = false;
			} else {
				menuState.isMenuHidden = true;
				menuState.isSettingsMenuOpen = false;
			}
			lastScrollY = currentScrollY;
			return;
		}

		// Desktop
		const scrollDelta = currentScrollY - lastScrollY;

		if (Math.abs(scrollDelta) > 10) {
			if (scrollDelta > 0) {
				if (currentScrollY > 50) {
					menuState.isMenuHidden = true;
					menuState.isSettingsMenuOpen = false;
				}
			} else {
				menuState.isMenuHidden = false;
			}
		}

		if (currentScrollY <= 50) {
			menuState.isMenuHidden = false;
		}

		lastScrollY = currentScrollY;
	}

	function handleKeydown(e: KeyboardEvent) {
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
		const stop = currentTime.startUpdating();
		initializeSettings();
		return stop;
	});

	// Scroll tracking
	$effect(() => {
		const cleanup = trackDeviceState();

		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			cleanup();
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

		return () => {
			unlockScroll();
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>leaklet</title>
</svelte:head>

<main class="h-100dvh border-0 bg-background">
	<Menu {handleNewSubscription} />
	{@render children()}
</main>

<Toast message={toastData.message} type={toastData.type} />
