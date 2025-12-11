<script lang="ts">
	import FeedCard from '$lib/components/feed/FeedCard.svelte';
	import Searchbar from '$lib/components/searchbar/Searchbar.svelte';
	import { LoaderCircle, Search } from 'lucide-svelte';
	import { searchItem } from '$lib/utils/searchUtils';
	import { slide } from 'svelte/transition';
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { updateItem } from '$lib/db/db';
	import { sync } from '$lib/stores/sync.svelte';
	import { duration } from 'drizzle-orm/gel-core';

	beforeNavigate(({ type, cancel }) => {
		if (type === 'popstate') {
			const SCROLL_THRESHOLD = 300;
			if (window.scrollY > SCROLL_THRESHOLD) {
				cancel();
				window.scrollTo({ top: 0, behavior: 'smooth' });
			}
		}
	});

	afterNavigate(() => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	});

	let { data }: { data: PageData; isSyncing: boolean } = $props();

	let allItems = $state(data.items);

	// 2. Keep local state in sync if data changes (e.g. navigation or search param reload)
	$effect(() => {
		allItems = data.items;
	});

	let itemsPerPage = 10;
	let visibleCount = $state(itemsPerPage);

	let loadTrigger: HTMLElement | undefined = $state();
	let focusedIndex = $state(0);
	let isKeyboardScrolling = $state(false);

	let feedFilter = $derived(page.url.searchParams.get('feed'));

	let filteredItems = $derived.by(() => {
		if (data.searchQuery.trim()) {
			return allItems.filter((item) => searchItem(item, data.searchQuery));
		}
		if (feedFilter) {
			return allItems.filter((item) => item.channelTitle === feedFilter);
		}
		return allItems;
	});

	let visibleItems = $derived(filteredItems.slice(0, visibleCount));

	$effect(() => {
		const _q = data.searchQuery;
		const _f = feedFilter;

		visibleCount = itemsPerPage;
		focusedIndex = 0;
	});

	$effect(() => {
		if (focusedIndex >= visibleItems.length && visibleItems.length > 0) {
			focusedIndex = visibleItems.length - 1;
		}
	});

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
		// 4. Optimistic UI
		allItems = allItems.filter((item) => item.id !== itemId);

		// 5. Background: Persist to DB
		try {
			await updateItem(itemId, { closed: true });
		} catch (e) {
			console.error('Failed to close item', e);
		}
	}

	function handleClearSearch() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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

<main class="mx-auto max-w-2xl p-4 pb-32">
	{#if sync.isSyncing}
		<div
			transition:slide={{ duration: 200 }}
			class="mb-2 flex flex-col items-center justify-center gap-2 p-4"
		>
			<LoaderCircle class="h-10 w-10 animate-spin text-primary" />
			<span class="font-sm text-tertiary">Checking for fresh news...</span>
		</div>
	{/if}
	{#if allItems.length === 0}
		<div class="rounded-xl border border-dashed border-tertiary p-10 text-center">
			<p class="text-lg text-content">No stories yet.</p>
			<p class="text-tertiary">Subscribe to an RSS channel.</p>
		</div>
	{:else}
		{#if data.searchQuery || feedFilter}
			<div transition:slide={{ duration: 200 }} class="snap-start scroll-mt-32">
				<div class="mb-4 flex items-center justify-between px-2">
					<p class="truncate text-sm text-tertiary">
						<span class="text-primary">{filteredItems.length}</span>
						{#if data.searchQuery}
							search results for "<span class="font-medium text-content">{data.searchQuery}</span>"
						{:else if feedFilter}
							results for <span class="font-medium text-content">{feedFilter}</span>
						{/if}
					</p>

					{#if filteredItems.length !== 0}
						<a
							href="?"
							onclick={handleClearSearch}
							class="shrink-0 cursor-pointer text-sm text-primary hover:underline"
						>
							Clear search
						</a>
					{/if}
				</div>
			</div>

			{#if filteredItems.length === 0}
				<div class="flex flex-col items-center justify-center py-20 text-center">
					<Search class="mb-4 h-12 w-12 text-tertiary/50" />
					<p class="text-lg text-content">
						No results found for "{data.searchQuery || feedFilter}"
					</p>
					<a
						href="?"
						onclick={handleClearSearch}
						class="mt-2 cursor-pointer text-primary hover:underline"
					>
						Clear search
					</a>
				</div>
			{/if}
		{/if}

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
				/>
			{/each}
		</div>

		<div bind:this={loadTrigger} class="flex h-20 items-center justify-center py-8">
			{#if visibleItems.length < filteredItems.length}
				<LoaderCircle class="h-6 w-6 animate-spin text-tertiary" />
			{:else if visibleItems.length > 0}
				<span class="text-sm text-tertiary">
					{data.searchQuery ? '' : "You're all caught up!"}
				</span>
			{/if}
		</div>
	{/if}
</main>

<Searchbar initialValue={data.searchQuery} />
