<script lang="ts">
	import FeedCard from '$lib/components/feed/FeedCard.svelte';
	import Searchbar from '$lib/components/searchbar/Searchbar.svelte';
	import { LoaderCircle, Search } from 'lucide-svelte';
	import type { UIItem } from '$lib/types/rss';
	import { searchItem } from '$lib/utils/searchUtils';
	import { slide } from 'svelte/transition';
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { afterNavigate, beforeNavigate } from '$app/navigation';

	beforeNavigate(({ type, cancel }) => {
		if (type === 'popstate') {
			const SCROLL_THRESHOLD = 300;

			if (window.scrollY > SCROLL_THRESHOLD) {
				cancel();

				window.scrollTo({
					top: 0,
					behavior: 'smooth'
				});
			}
		}
	});

	afterNavigate(() => {
		window.scrollTo({ top: 0, behavior: 'instant' });
	});

	let { data }: { data: PageData } = $props();

	let visibleItems: UIItem[] = $state([]);
	let itemsPerPage = 10;
	let loadTrigger: HTMLElement | undefined = $state();

	let feedFilter = $derived(page.url.searchParams.get('feed'));

	let filteredItems = $derived.by(() => {
		if (data.searchQuery.trim()) {
			return data.items.filter((item) => searchItem(item, data.searchQuery));
		}
		if (feedFilter) {
			return data.items.filter((item) => item.channelTitle === feedFilter);
		}
		return data.items;
	});

	$effect(() => {
		const _ = filteredItems;
		visibleItems = filteredItems.slice(0, itemsPerPage);
	});

	$effect(() => {
		if (!loadTrigger) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && visibleItems.length < filteredItems.length) {
					setTimeout(() => {
						const nextBatch = filteredItems.slice(
							visibleItems.length,
							visibleItems.length + itemsPerPage
						);
						visibleItems = [...visibleItems, ...nextBatch];
					}, 300);
				}
			},
			{ rootMargin: '100px' } // Increased margin slightly for smoother loading before hitting bottom
		);

		observer.observe(loadTrigger);

		return () => {
			observer.disconnect();
		};
	});

	function handleClearSearch() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<main class="mx-auto max-w-2xl p-4 pb-32">
	{#if data.items.length === 0}
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
			{#each visibleItems as item (item.id)}
				<FeedCard {item} />
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
