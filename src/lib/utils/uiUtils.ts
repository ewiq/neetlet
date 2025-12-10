import { settings } from '$lib/stores/settings.svelte';

export function trackDeviceState() {
	if (typeof window === 'undefined') return () => {};

	const mediaQuery = window.matchMedia('(max-width: 768px)');
	settings.isMobile = mediaQuery.matches;

	const handler = (e: MediaQueryListEvent) => (settings.isMobile = e.matches);
	mediaQuery.addEventListener('change', handler);

	return () => mediaQuery.removeEventListener('change', handler);
}

export function lockScroll() {
	settings.isScrollLocked = true;
	document.body.style.overflow = 'hidden';
	// Scroll possible within list of subscriptions?
	document.body.style.touchAction = 'none';
}

export function unlockScroll() {
	settings.isScrollLocked = false;
	document.body.style.overflow = '';
	document.body.style.touchAction = '';
}

export function extractDomain(url: string): string {
	try {
		const urlObj = new URL(url);
		let hostname = urlObj.hostname;

		if (hostname.startsWith('www.')) {
			hostname = hostname.substring(4);
		}

		return hostname;
	} catch {
		return '';
	}
}
