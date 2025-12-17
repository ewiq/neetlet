<script lang="ts">
	import FeedCard from '$lib/components/feed/FeedCard.svelte';
	import FeedHeader from '$lib/components/feed/FeedHeader.svelte';
	import Searchbar from '$lib/components/searchbar/Searchbar.svelte';
	import { getPaginatedItems, updateItem } from '$lib/db/db';
	import { afterNavigate, beforeNavigate, goto, invalidate } from '$app/navigation';
	import type { PageData } from './$types';
	import type { UIItem } from '$lib/types/rss';
	import { LoaderCircle } from 'lucide-svelte';
	import { sync } from '$lib/stores/sync.svelte';
	import { slide } from 'svelte/transition';
	import { feed } from '$lib/stores/feed.svelte';

	let { data }: { data: PageData } = $props();

	let items = $state<UIItem[]>([]);
	let totalCount = $state(0);
	let currentPage = $state(1);
	let isLoadingMore = $state(false);
	let loadTrigger: HTMLElement | undefined = $state();

	let focusedIndex = $state(0);
	let isKeyboardScrolling = $state(false);

	let searchQuery = $derived(data.searchQuery);

	// Enrich items
	function enrichItems(rawItems: any[]): UIItem[] {
		const channelMap = new Map(data.channels.map((c) => [c.link, c]));

		return rawItems.map((item) => {
			const channel = channelMap.get(item.channelId);
			return {
				...item,
				channelTitle: channel ? channel.customTitle || channel.title : 'Unknown Feed',
				channelImage: channel ? channel.image : undefined
			};
		});
	}

	// Reset when URL (filter) changes
	$effect(() => {
		items = enrichItems(data.initialItems);
		totalCount = data.totalCount;
		currentPage = 1;
		focusedIndex = 0;
		scrollToTop();
	});

	// Infinite Scroll Loader with "Charging Effect"
	async function loadMore() {
		if (isLoadingMore || items.length >= totalCount) return;

		isLoadingMore = true;

		// await new Promise((resolve) => setTimeout(resolve, 150));

		const nextPage = currentPage + 1;

		try {
			const result = await getPaginatedItems(nextPage, 15, data.filter);
			const newItems = enrichItems(result.items);

			items = [...items, ...newItems];
			currentPage = nextPage;

			if (result.total !== totalCount) totalCount = result.total;
		} catch (e) {
			console.error('Failed to load more', e);
		} finally {
			isLoadingMore = false;
		}
	}

	// Intersection Observer for Infinite Scroll
	$effect(() => {
		if (!loadTrigger) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					loadMore();
				}
			},
			{ rootMargin: '0px' }
		);

		observer.observe(loadTrigger);
		return () => observer.disconnect();
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

		if (e.key === 'j' || e.key === 'ArrowDown') {
			e.preventDefault();
			isKeyboardScrolling = true;
			focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
		} else if (e.key === 'k' || e.key === 'ArrowUp') {
			e.preventDefault();
			isKeyboardScrolling = true;
			focusedIndex = Math.max(focusedIndex - 1, 0);
		}
	}

	function updateFocusedIndexFromScroll(index: number) {
		if (!isKeyboardScrolling) {
			focusedIndex = index;
		}
	}

	function scrollToTop() {
		if (typeof window !== 'undefined') {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function clearFilters() {
		goto('/');
	}

	beforeNavigate(({ type, cancel }) => {
		if (type === 'popstate' && window.scrollY > 300) {
			cancel();
			scrollToTop();
		}
	});

	afterNavigate(() => {
		scrollToTop();
	});

	async function handleCloseItem(itemId: string) {
		feed.isItemClosing = true;
		items = items.filter((item) => item.id !== itemId);
		totalCount--;
		if (focusedIndex >= items.length) focusedIndex = Math.max(0, items.length - 1);
		await updateItem(itemId, { closed: true });
		feed.isItemClosing = false;
	}

	async function handleAddToFavourites(itemId: string) {
		feed.isFavouriteRemoving = true;
		const index = items.findIndex((i) => i.id === itemId);
		if (index > -1) {
			// Optimistic update
			const newState = items[index].favourite === 1 ? 0 : 1;
			items[index].favourite = newState;

			// Remove if looking at favourites only
			if (data.filter.onlyFavourites && !newState) {
				items = items.filter((i) => i.id !== itemId);
				totalCount--;
			}
			await updateItem(itemId, { favourite: newState });
		}
		feed.isFavouriteRemoving = false;
	}

	async function markAsRead(itemId: string) {
		const index = items.findIndex((i) => i.id === itemId);
		if (index > -1 && !items[index].read) {
			items[index].read = true;
			await updateItem(itemId, { read: true });
		}
	}

	async function markAsUnread(itemId: string) {
		const index = items.findIndex((i) => i.id === itemId);
		if (index > -1 && items[index].read) {
			items[index].read = false;
			await updateItem(itemId, { read: false });
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<main class="mx-auto max-w-2xl {sync.isSyncing ? '' : 'snap-y snap-mandatory'} p-4 pb-32">
	<div id="top-snap" class="h-px snap-start"></div>

	{#if sync.isSyncing}
		<div
			transition:slide={{ duration: 200 }}
			class="mb-2 flex flex-col items-center justify-center gap-2 p-4"
		>
			<LoaderCircle class="h-10 w-10 animate-spin text-primary" />
			<span class="font-sm text-tertiary">Checking for fresh news...</span>
		</div>
	{/if}

	<FeedHeader
		filteredCount={totalCount}
		{totalCount}
		searchQuery={data.searchQuery}
		channelFilter={data.filter.channelId || null}
		favFilter={data.filter.onlyFavourites ? '1' : null}
		collectionFilter={data.filter.collectionId || null}
		channelTitle={data.activeChannelTitle}
		collectionName={data.activeCollectionName}
		onClear={clearFilters}
	/>

	<div class="flex flex-col gap-4">
		{#each items as item, index (item.id)}
			<FeedCard
				{item}
				{index}
				focused={index === focusedIndex}
				shouldScroll={isKeyboardScrolling}
				onVisible={() => updateFocusedIndexFromScroll(index)}
				onScrollComplete={() => (isKeyboardScrolling = false)}
				onClose={handleCloseItem}
				onAddToFavourite={handleAddToFavourites}
				onMarkAsRead={markAsRead}
				onMarkAsUnread={markAsUnread}
			/>
		{/each}
	</div>

	<div
		bind:this={loadTrigger}
		class="flex flex-col items-center justify-center p-12 transition-all"
	>
		{#if isLoadingMore}
			<div class="flex flex-col items-center gap-2">
				<LoaderCircle class="h-8 w-8 animate-spin text-primary" />
			</div>
		{:else if items.length >= totalCount && totalCount > 0}
			<div class="flex flex-col items-center gap-2 opacity-60">
				<div class="bg-border mb-2 h-px w-12"></div>
				<span class="text-sm font-medium text-tertiary">
					{data.searchQuery ? 'End of search results' : "You're all caught up!"}
				</span>
			</div>
		{:else}
			<div class="h-20"></div>
		{/if}
	</div>
</main>

<Searchbar initialValue={searchQuery || ''} />
