<script lang="ts">
	import Logo from '$lib/assets/logo.png';
	import MenuSettings from './SettingsMenu.svelte';
	import MenuSubscriptions from './SubsMenu.svelte';
	import { ChevronDown } from 'lucide-svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { menuState } from '$lib/stores/menu.svelte';
	import SearchButton from '../searchbar/SearchButton.svelte';
	import { slide } from 'svelte/transition';
	import { formatDateTime } from '$lib/utils/dateUtils';
	import { searchbarState } from '$lib/stores/searchbar.svelte';

	let { handleNewSubscription } = $props();

	let currentTime = $state(new Date());
	let settingsBtnRef: HTMLButtonElement | undefined = $state();
	let settingsDropdownRef: HTMLDivElement | undefined = $state();
	let subsBtnRef: HTMLButtonElement | undefined = $state();
	let subsDropdownRef: HTMLDivElement | undefined = $state();
	let searchInputRef: HTMLInputElement | undefined = $state();

	let dateTime = $derived(formatDateTime(currentTime));

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as Node;

		// Check if click is outside settings button and dropdown
		if (
			menuState.isSettingsMenuOpen &&
			settingsBtnRef &&
			settingsDropdownRef &&
			!settingsBtnRef.contains(target) &&
			!settingsDropdownRef.contains(target)
		) {
			menuState.isSettingsMenuOpen = false;
		}
	}

	$effect(() => {
		// Update time every second
		const timer = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		if (menuState.isSettingsMenuOpen || menuState.isSubsMenuOpen) {
			document.addEventListener('click', handleClickOutside);
		}

		return () => {
			clearInterval(timer);
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<nav
	class="sticky top-0 right-0 left-0 z-200 h-15 bg-surface shadow-sm transition-transform duration-300 ease-in-out {menuState.isMenuHidden
		? '-translate-y-full'
		: 'translate-y-0'}"
>
	<div class="mp-2 relative flex h-full items-center justify-between px-4">
		<div class="relative flex grow-2 justify-start">
			<button
				bind:this={subsBtnRef}
				onclick={() => {
					menuState.toggleSubs();
				}}
				class="font-hepta flex h-10 cursor-pointer items-center gap-1 rounded-full border border-muted px-3 text-sm text-content shadow transition hover:bg-secondary md:border-0 md:shadow-none"
				aria-label="Subscriptions"
				aria-expanded={menuState.isSubsMenuOpen}
			>
				my subs
				<ChevronDown
					class="h-5 w-5 transition-transform duration-200 {menuState.isSubsMenuOpen
						? 'rotate-180'
						: ''}"
				/>
			</button>

			{#if menuState.isSubsMenuOpen}
				<div
					bind:this={subsDropdownRef}
					class="fixed top-0 left-0 z-60 mt-15 w-screen border-t border-muted bg-surface px-4 py-2 shadow-lg transition-[height] duration-300 md:w-84"
					style="height: {menuState.isMenuHidden ? '100vh' : 'calc(100vh - 3.75rem)'};"
					role="menu"
				>
					<MenuSubscriptions onSubscribe={handleNewSubscription} />
				</div>
			{/if}
		</div>

		<div
			class="font-hepta md:text-normal hidden grow items-center justify-center gap-2 text-sm text-content md:visible md:flex"
		>
			<span class="">{dateTime.month.toLowerCase()} {dateTime.year} </span>
			<span class="text-accent">|</span>
			<span>{dateTime.hours}:{dateTime.minutes}</span>
		</div>

		<div
			class="font-hepta md:text-normal visible flex grow items-center justify-end gap-2 text-sm text-content md:hidden md:justify-center"
		>
			{#if !searchbarState.isSearchbarOpen}
				<SearchButton bind:inputRef={searchInputRef} />
			{/if}
		</div>

		<div class="relative flex grow-2 items-center justify-end gap-2 select-none md:gap-4">
			<span class="font-hepta text-2xl font-normal text-content">leaklet</span>
			<button
				bind:this={settingsBtnRef}
				class="w-10 cursor-pointer overflow-hidden rounded-full border border-muted bg-white shadow hover:opacity-70"
				onclick={() => {
					menuState.toggleSettings();
				}}
				aria-label="Settings Menu"
				aria-expanded={menuState.isSettingsMenuOpen}
			>
				<img src={Logo} alt="Menu" class="h-full w-full scale-75 bg-white object-cover" />
			</button>

			{#if menuState.isSettingsMenuOpen}
				<div
					bind:this={settingsDropdownRef}
					class="left fixed top-0 right-0 z-210 mt-15 w-screen border-t border-muted bg-surface px-4 py-4 shadow-lg md:right-4 md:w-64"
					role="menu"
				>
					<MenuSettings
						isDark={settings.isDark}
						isFontSerif={settings.isFontSerif}
						isSnapped={settings.isSnapped}
					/>
				</div>
			{/if}
		</div>
	</div>
</nav>
