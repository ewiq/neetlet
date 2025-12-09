import { menuState } from '$lib/stores/menu.svelte';
import { searchbarState } from '$lib/stores/searchbar.svelte';
import { settings } from '$lib/stores/settings.svelte';

let lastScrollY = 0;

export function handleScroll() {
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

export function handleKeydown(e: KeyboardEvent) {
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
