<script lang="ts">
	import type { UIItem } from '$lib/types/rss';
	import { Bookmark, MailCheck, X } from 'lucide-svelte';
	import { timeAgo } from '$lib/utils/dateUtils';
	import { extractDomain } from '$lib/utils/uiUtils';
	import { menuState } from '$lib/stores/menu.svelte';
	import { currentTime } from '$lib/stores/time.svelte';
	import { slide } from 'svelte/transition';
	import { settings } from '$lib/stores/settings.svelte';
	import { feed } from '$lib/stores/feed.svelte';

	let {
		item,
		focused = false,
		shouldScroll = false,
		onVisible = () => {},
		onScrollComplete = () => {},
		onClose = () => {},
		onAddToFavourite = () => {},
		onMarkAsRead = () => {},
		onMarkAsUnread = () => {}
	}: {
		item: UIItem;
		focused?: boolean;
		index?: number;
		shouldScroll?: boolean;
		onVisible?: () => void;
		onScrollComplete?: () => void;
		onClose?: (itemId: string) => void;
		onAddToFavourite?: (itemId: string) => void;
		onMarkAsRead?: (itemId: string) => void;
		onMarkAsUnread?: (itemId: string) => void;
	} = $props();

	let publishedDate = $derived.by(() => {
		const date = new Date(item.pubDate);
		if (isNaN(date.getTime())) {
			return '';
		}
		return timeAgo(date, currentTime.value);
	});
	let feedCardElement: HTMLElement | undefined = $state();

	let cleanDescription = $derived.by(() => {
		const doc = new DOMParser().parseFromString(item.description, 'text/html');
		return doc.body.textContent || '';
	});

	let domainName = $derived(extractDomain(item.link));

	// Handle keyboard scrolling
	$effect(() => {
		if (focused && shouldScroll && feedCardElement) {
			feedCardElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
			// Reset keyboard scrolling flag after animation
			setTimeout(onScrollComplete, 500);
		}
	});

	// Track visibility for manual scrolling
	$effect(() => {
		if (!feedCardElement) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && entries[0].intersectionRatio > 0.5) {
					onVisible();
				}
			},
			{ threshold: 0.5 }
		);

		observer.observe(feedCardElement);

		return () => {
			observer.disconnect();
		};
	});
</script>

<article
	out:slide={{ duration: feed.isItemClosing || feed.isFavouriteRemoving ? 150 : 0 }}
	bind:this={feedCardElement}
	class="flex max-h-[85vh] snap-start flex-col overflow-hidden rounded-xl border border-muted bg-surface shadow-sm transition lg:max-h-[70vh] {menuState.isMenuHidden
		? 'scroll-mt-2'
		: 'scroll-mt-18'}"
	class:opacity-30={item.read === true && settings.isReadHidden}
>
	<div class="shrink-0 px-5 py-3">
		<div class="flex items-center gap-3">
			{#if item.channelImage}
				<img src={item.channelImage} alt="" class="h-9 w-9 rounded-full object-cover" />
			{/if}
			<div class="flex flex-1 flex-col leading-tight">
				<span class="line-clamp-1 text-base font-semibold text-content">
					{item.channelTitle}
				</span>
				<div class="flex items-center gap-1 text-sm text-tertiary">
					{#if item.author}
						<span class="line-clamp-1">{item.author}</span>
						<span>·</span>
					{/if}
					<span>{publishedDate}</span>
				</div>
			</div>
			{#if item.read === true && settings.isReadHidden}
				<button
					onclick={() => onMarkAsUnread(item.id)}
					class="group relative cursor-pointer rounded-full p-2 text-content opacity-50 transition hover:bg-secondary hover:text-primary"
					title="Mark as Unread"
				>
					<MailCheck class="h-5 w-5" />
				</button>
			{/if}
		</div>
	</div>
	{#if item.image}
		<div class="flex h-full w-full flex-1 items-center justify-center overflow-hidden bg-muted/40">
			<img src={item.image} alt={item.title} class="h-full w-full object-cover" loading="lazy" />
		</div>
	{/if}
	<div class="shrink-0 px-5 py-2">
		<a
			onclick={() => onMarkAsRead(item.id)}
			href={item.link}
			target="_blank"
			rel="noopener noreferrer"
			class="group block"
		>
			{#if domainName}
				<div class="tracking-wifade mb-1 text-xs text-tertiary uppercase">
					{domainName}
				</div>
			{/if}
			<h2
				class="mb-1 line-clamp-2 text-base font-semibold text-content transition-colors group-hover:text-primary"
			>
				{item.title}
			</h2>
		</a>
		<p class="mb-3 line-clamp-3 text-[0.90rem] leading-relaxed text-content/80">
			{cleanDescription}
		</p>
		<div class="mt-2 flex items-center justify-between border-t border-muted pt-2">
			<button
				onclick={() => onAddToFavourite(item.id)}
				class="cursor-pointer rounded-full p-2 text-content transition hover:bg-secondary hover:text-primary {item.favourite
					? ' bg-secondary '
					: 'text-content'}"
				title="Save to Favourites"
			>
				<Bookmark
					class="h-6 w-6 transition-all {item.favourite
						? 'scale-105 fill-current text-primary'
						: ''}"
				/>
			</button>
			<button
				onclick={() => onClose(item.id)}
				class="flex cursor-pointer items-center rounded-full bg-secondary/50 p-3 text-sm font-medium text-content transition hover:bg-secondary"
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	</div>
</article>
