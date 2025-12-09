export const settings = $state({
	isDark: false,
	isFontSerif: false,
	isSnapped: false,
	isMobile: false,
	isScrollLocked: false,
	isShuffled: true,

	toggleDarkMode() {
		this.isDark = !this.isDark;
		persistSettings();
	},
	toggleFont() {
		this.isFontSerif = !this.isFontSerif;
		persistSettings();
	},
	toggleScrollSnap() {
		this.isSnapped = !this.isSnapped;
		persistSettings();
	},
	toggleShuffle() {
		this.isShuffled = !this.isShuffled;
		persistSettings();
	}
});

export function initializeSettings() {
	const savedTheme = localStorage.getItem('theme');
	const savedFont = localStorage.getItem('font');
	const savedScrollSnap = localStorage.getItem('scrollSnap');
	const savedShuffleType = localStorage.getItem('isShuffled');

	if (savedTheme) {
		settings.isDark = savedTheme === 'dark';
	} else {
		settings.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	if (savedFont === 'serif') {
		settings.isFontSerif = true;
	}

	if (savedScrollSnap === 'true') {
		settings.isSnapped = true;
	}

	if (savedShuffleType === 'true') {
		settings.isShuffled = true;
	}

	applySettings();
}

function applySettings() {
	// Apply theme
	if (settings.isDark) {
		document.documentElement.classList.add('dark');
	} else {
		document.documentElement.classList.remove('dark');
	}
	// Apply font
	if (settings.isFontSerif) {
		document.documentElement.classList.add('font-serif');
		document.documentElement.classList.remove('font-sans');
	} else {
		document.documentElement.classList.add('font-sans');
		document.documentElement.classList.remove('font-serif');
	}
	// Apply scroll snap
	if (settings.isSnapped) {
		document.documentElement.classList.add('snap-y', 'snap-mandatory', 'scroll-smooth');
	} else {
		document.documentElement.classList.remove('snap-y', 'snap-mandatory', 'scroll-smooth');
	}

	// Apply shuffle
	if (settings.isShuffled) {
		// TODO: Apply random shuffle
	} else {
		// TODO: Apply chronological shuffle
	}
}

function persistSettings() {
	localStorage.setItem('theme', settings.isDark ? 'dark' : 'light');
	localStorage.setItem('font', settings.isFontSerif ? 'serif' : 'sans');
	localStorage.setItem('scrollSnap', settings.isSnapped ? 'true' : 'false');
	localStorage.setItem('isShuffled', settings.isShuffled ? 'true' : 'false');
	applySettings();
}
