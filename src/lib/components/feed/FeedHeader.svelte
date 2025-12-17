<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Search } from 'lucide-svelte';

	let {
		filteredCount,
		totalCount,
		searchQuery,
		channelFilter,
		favFilter,
		collectionFilter,
		channelTitle,
		collectionName,
		onClear
	}: {
		filteredCount: number;
		totalCount: number;
		searchQuery: string;
		channelFilter: string | null;
		favFilter: string | null;
		collectionFilter: string | null;
		channelTitle: string | undefined;
		collectionName: string | undefined;
		onClear: () => void;
	} = $props();

	let isFiltering = $derived(!!searchQuery || !!channelFilter || !!favFilter || !!collectionFilter);
</script>

{#if totalCount === 0 && !isFiltering}
	<div class="rounded-xl p-10 text-center">
		<p class="text-lg text-content">Nothing here yet...</p>
		<p class="text-tertiary">Subscribe to channel.</p>
	</div>
{:else if isFiltering}
	<div transition:slide={{ duration: 150 }} class="snap-start scroll-mt-32">
		<div class="mb-4 flex items-center justify-between px-2">
			<p class="truncate text-sm text-tertiary">
				<span class="text-primary">{filteredCount}</span>
				{#if searchQuery}
					search result{filteredCount === 1 ? '' : 's'} for "<span class="font-medium text-content"
						>{searchQuery}</span
					>"
				{:else if favFilter}
					<span>favourite{filteredCount === 1 ? '' : 's'}</span>
				{:else if channelFilter}
					result{filteredCount === 1 ? '' : 's'} for
					<span class="font-medium text-content">{channelTitle || channelFilter}</span>
				{:else if collectionFilter}
					result{filteredCount === 1 ? '' : 's'} for
					<span class="font-medium text-content">{collectionName || collectionFilter}</span>
				{/if}
			</p>

			{#if filteredCount !== 0}
				<a
					href="?"
					onclick={onClear}
					class="shrink-0 cursor-pointer text-sm text-primary hover:underline"
				>
					Clear search
				</a>
			{/if}
		</div>
	</div>

	{#if filteredCount === 0}
		<div class="flex flex-col items-center justify-center py-20 text-center">
			<Search class="mb-4 h-12 w-12 text-tertiary/50" />
			<p class="text-lg text-content">
				{#if searchQuery}
					No results found for "{searchQuery}"
				{:else if favFilter}
					No favourites yet.
				{:else if channelFilter}
					No results found for "{channelTitle || channelFilter}"
				{:else if collectionFilter}
					No results found for "{collectionName || collectionFilter}"
				{/if}
			</p>
			<a href="?" onclick={onClear} class="mt-2 cursor-pointer text-primary hover:underline">
				Clear search
			</a>
		</div>
	{/if}
{/if}
