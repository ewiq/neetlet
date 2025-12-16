<script lang="ts">
	import { getAllChannels } from '$lib/db/db';
	import { menuState } from '$lib/stores/menu.svelte';
	import type { DBChannel } from '$lib/types/rss';
	import { normalizeText } from '$lib/utils/searchUtils';
	import {
		ArrowDownAZ,
		ArrowDownZA,
		ClockArrowDown,
		Search,
		X,
		List,
		ChevronDown,
		Share2
	} from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import ChannelList from './ChannelList.svelte';

	let { isExpanded = true, onToggle } = $props();

	let filterText = $state('');
	let sortMode = $state<'a_z' | 'z_a' | 'date'>(
		typeof localStorage !== 'undefined'
			? (localStorage.getItem('subSortMode') as 'a_z' | 'z_a' | 'date') || 'a_z'
			: 'a_z'
	);
	let subscribedChannels: DBChannel[] = $state([]);
	let menuJustOpened = $state(false);

	let filteredChannels = $derived.by(() => {
		let list = [...subscribedChannels];
		list = list.filter((c) =>
			normalizeText(c.title)?.toLowerCase().includes(normalizeText(filterText).toLowerCase())
		);

		if (sortMode === 'a_z') {
			list.sort((a, b) => a.title.localeCompare(b.title));
		} else if (sortMode === 'z_a') {
			list.sort((a, b) => b.title.localeCompare(a.title));
		} else if (sortMode === 'date') {
			list.sort((a, b) => b.savedAt - a.savedAt);
		}

		return list;
	});

	$effect(() => {
		if (menuState.isSubsMenuOpen) {
			menuJustOpened = true;
			setTimeout(() => {
				menuJustOpened = false;
			}, 50);
		}
	});

	$effect(() => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('subSortMode', sortMode);
		}
	});

	async function loadChannels() {
		subscribedChannels = await getAllChannels();
	}

	$effect(() => {
		subscribedChannels;
		loadChannels();
		filterText;
	});

	function cycleSortMode() {
		if (sortMode === 'a_z') {
			sortMode = 'z_a';
		} else if (sortMode === 'z_a') {
			sortMode = 'date';
		} else {
			sortMode = 'a_z';
		}
	}
</script>

<div class="flex h-full flex-col border-b border-muted">
	<button
		onclick={onToggle}
		class="flex w-full cursor-pointer items-center justify-between px-4 py-3 transition hover:bg-secondary/50"
	>
		<div class="flex items-center gap-2.5">
			<List size={18} class="text-primary" />
			<h3 class="text-sm font-medium tracking-widest text-content uppercase">All Subs</h3>
			<span class="text-xs text-tertiary">({subscribedChannels.length})</span>
		</div>
		<ChevronDown
			size={20}
			class="text-tertiary transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
		/>
	</button>

	{#if isExpanded}
		<div class="mt-2 flex flex-col" transition:slide={{ duration: 150 }}>
			<div class="mb-1 flex items-center gap-2 px-4">
				<div class="relative flex-1">
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
						<Search class="h-4 w-4 text-tertiary" />
					</div>
					<input
						type="text"
						bind:value={filterText}
						placeholder="Search..."
						class="w-full rounded-lg border border-muted bg-background py-2 pr-10 pl-10 text-sm font-light text-content placeholder:text-tertiary focus:ring-2 focus:ring-primary focus:outline-none"
					/>
					{#if filterText}
						<button
							type="button"
							onclick={() => (filterText = '')}
							class="absolute inset-y-0 right-0 flex cursor-pointer items-center rounded-full p-2 text-tertiary hover:text-content"
							aria-label="Clear search"
						>
							<X class="h-4 w-4" />
						</button>
					{/if}
				</div>
				<button
					onclick={cycleSortMode}
					class="flex cursor-pointer items-center rounded-lg p-2 text-content transition hover:bg-secondary hover:text-primary"
					title="Sort: {sortMode === 'a_z' ? 'A-Z' : sortMode === 'z_a' ? 'Z-A' : 'Date'}"
				>
					{#if sortMode === 'a_z'}
						<ArrowDownAZ size={20} />
					{:else if sortMode === 'z_a'}
						<ArrowDownZA size={20} />
					{:else if sortMode === 'date'}
						<ClockArrowDown size={20} />
					{/if}
				</button>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto px-4">
				<ChannelList
					channels={filteredChannels}
					settings={true}
					onChannelDeleted={async () => {
						await loadChannels();
					}}
				/>
			</div>

			<div class="border-t border-b border-muted px-4 py-2">
				<button
					onclick={() => {}}
					class="m-auto flex w-54 cursor-pointer items-center justify-center gap-2 rounded-lg border border-muted bg-primary/60 px-4 py-2.5 text-sm text-content transition hover:bg-secondary"
				>
					<Share2 size={16} />
					<span>Share my Leatly</span>
				</button>
			</div>
		</div>
	{/if}
</div>
