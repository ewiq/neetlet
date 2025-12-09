<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/logo.png';
	import Toast from '$lib/components/menu/Toast.svelte';
	import Menu from '$lib/components/menu/Menu.svelte';
	import { toastData } from '$lib/stores/toast.svelte';
	import { beforeNavigate, invalidate } from '$app/navigation';
	import { settings } from '$lib/stores/settings.svelte';
	import { menuState } from '$lib/stores/menu.svelte';
	import { lockScroll, trackDeviceState, unlockScroll } from '$lib/utils/uiUtils';
	import { handleKeydown, handleScroll } from '$lib/utils/domUtils';

	async function handleNewSubscription() {
		await invalidate('app:feed');
	}

	let { children } = $props();

	$effect(() => {
		// Initialize device tracking
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

<main class="h-100dvh bg-background">
	<Menu {handleNewSubscription} />
	{@render children()}
</main>

<Toast message={toastData.message} type={toastData.type} />
