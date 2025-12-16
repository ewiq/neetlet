<script lang="ts">
	import FeedCard from '$lib/components/feed/FeedCard.svelte';
	import FeedHeader from '$lib/components/feed/FeedHeader.svelte';
	import Searchbar from '$lib/components/searchbar/Searchbar.svelte';
	import { LoaderCircle } from 'lucide-svelte';
	import { searchItem } from '$lib/utils/searchUtils';
	import { slide } from 'svelte/transition';
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { updateItem } from '$lib/db/db';
	import { sync } from '$lib/stores/sync.svelte';
	import { feed } from '$lib/stores/feed.svelte';
	import { tick } from 'svelte';

	let { data }: { data: PageData } = $props();

	let allItems = $state(data.items);
	let itemsPerPage = 10;
	let visibleCount = $state(itemsPerPage);
	let loadTrigger: HTMLElement | undefined = $state();

	let focusedIndex = $state(0);
	let isKeyboardScrolling = $state(false);

	let channelFilter = $derived(page.url.searchParams.get('channel'));
	let favFilter = $derived(page.url.searchParams.get('favs'));
	let collectionFilter = $derived(page.url.searchParams.get('collection'));
	let searchQuery = $derived(data.searchQuery);

	let filteredItems = $derived.by(() => {
		let items = allItems;

		if (searchQuery.trim()) {
			items = allItems.filter((item) => searchItem(item, searchQuery));
		}
		if (channelFilter) {
			items = allItems.filter((item) => item.channelId === channelFilter);
		}

		if (collectionFilter) {
			const validChannels = data.channels.filter((c) =>
				c.collectionIds?.includes(collectionFilter)
			);
			const validChannelIds = new Set(validChannels.map((c) => c.link));
			items = items.filter((item) => validChannelIds.has(item.channelId));
		}

		if (favFilter) {
			items = items.filter((item) => item.favourite);
		}
		return items;
	});

	let visibleItems = $derived(filteredItems.slice(0, visibleCount));

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
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

	$effect(() => {
		allItems = data.items;
	});

	$effect(() => {
		visibleCount = itemsPerPage;
		focusedIndex = 0;
	});

	$effect(() => {
		if (focusedIndex >= visibleItems.length && visibleItems.length > 0) {
			focusedIndex = visibleItems.length - 1;
		}
	});

	// Infinite Scroll
	$effect(() => {
		if (!loadTrigger) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && visibleItems.length < filteredItems.length) {
					setTimeout(() => {
						visibleCount += itemsPerPage;
					}, 300);
				}
			},
			{ rootMargin: '0px' }
		);
		observer.observe(loadTrigger);

		return () => {
			observer.disconnect();
		};
	});

	async function handleCloseItem(itemId: string) {
		feed.isItemClosing = true;
		allItems = allItems.filter((item) => item.id !== itemId);
		try {
			await updateItem(itemId, { closed: true });
		} catch (e) {
			console.error('Failed to close item', e);
		} finally {
			feed.isItemClosing = false;
		}
	}

	async function handleAddToFavourites(itemId: string) {
		feed.isFavouriteRemoving = true;
		const item = allItems.find((item) => item.id === itemId);

		if (!item) {
			console.error('Item not found');
			return;
		}

		try {
			const newFavouriteStatus = !item.favourite;
			await updateItem(itemId, { favourite: newFavouriteStatus });

			allItems = allItems.map((i) =>
				i.id === itemId ? { ...i, favourite: newFavouriteStatus } : i
			);
			await tick();
		} catch (e) {
			console.error('Failed to update favourite status', e);
		} finally {
			feed.isFavouriteRemoving = false;
		}
	}

	async function markAsRead(itemId: string) {
		const item = allItems.find((item) => item.id === itemId);
		if (!item) {
			console.error('Item not found');
			return;
		}
		// Only mark as read if not already read
		if (!item.read) {
			try {
				await updateItem(itemId, { read: true });
				allItems = allItems.map((i) => (i.id === itemId ? { ...i, read: true } : i));
			} catch (e) {
				console.error('Failed to mark as read', e);
			}
		}
	}

	async function markAsUnread(itemId: string) {
		const item = allItems.find((item) => item.id === itemId);
		if (!item) {
			console.error('Item not found');
			return;
		}
		try {
			await updateItem(itemId, { read: false });
			allItems = allItems.map((i) => (i.id === itemId ? { ...i, read: false } : i));
		} catch (e) {
			console.error('Failed to mark as unread', e);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

		if (e.key === 'j' || e.key === 'ArrowDown') {
			e.preventDefault();
			isKeyboardScrolling = true;
			focusedIndex = Math.min(focusedIndex + 1, visibleItems.length - 1);
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
</script>

<svelte:window onkeydown={(e) => handleKeydown(e)} />

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
		filteredCount={filteredItems.length}
		totalCount={allItems.length}
		{searchQuery}
		{channelFilter}
		{favFilter}
		{collectionFilter}
		channelTitle={data.activeChannelTitle}
		collectionName={data.activeCollectionName}
		onClear={scrollToTop}
	/>

	<div class="flex flex-col gap-4">
		{#each visibleItems as item, index (item.id)}
			<FeedCard
				{item}
				focused={index === focusedIndex}
				{index}
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

	{#if allItems.length > 0}
		<div bind:this={loadTrigger} class="flex h-20 items-center justify-center py-8">
			{#if visibleItems.length < filteredItems.length}
				<LoaderCircle class="h-6 w-6 animate-spin text-tertiary" />
			{:else if visibleItems.length > 0}
				<span class="text-sm text-tertiary">
					{searchQuery ? '' : "You're all caught up!"}
				</span>
			{/if}
		</div>
	{/if}
</main>

<Searchbar initialValue={searchQuery} />
