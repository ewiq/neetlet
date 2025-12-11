<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { deleteChannel, getAllChannels } from '$lib/db/db';
	import { menuState } from '$lib/stores/menu.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toastData } from '$lib/stores/toast.svelte';
	import type { DBChannel } from '$lib/types/rss';
	import { normalizeText } from '$lib/utils/searchUtils';
	import {
		ArrowDownAZ,
		ArrowDownZA,
		ClockArrowDown,
		HashIcon,
		Rss,
		Search,
		X
	} from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	let isDeleting = $state(false);
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
			}, 20);
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

	async function filterByChannel(channel: DBChannel) {
		if (!channel.title) return;

		const params = new URLSearchParams();
		params.set('feed', channel.title);

		await goto(`?${params.toString()}`, {});

		window.scrollTo({ top: 0, behavior: 'smooth' });

		if (settings.isMobile) {
			menuState.isSubsMenuOpen = false;
		}
	}

	async function handleUnsubscribe(channelId: string, event: Event) {
		event.stopPropagation();

		if (!confirm('Are you sure you want to remove this channel?')) return;

		isDeleting = true;
		try {
			await deleteChannel(channelId);
			await loadChannels();
			await invalidate('app:feed');
			toastData.message = 'Channel removed';
			toastData.type = 'success';
		} catch (error) {
			console.error('Failed to delete channel', error);
			toastData.message = 'Failed to remove channel';
			toastData.type = 'error';
		} finally {
			isDeleting = false;
		}
	}

	$effect(() => {
		subscribedChannels;
		loadChannels();
		filterText;
	});
</script>

<div class="flex h-full flex-col">
	<div class="space-between mb-2 flex items-center text-base font-semibold text-content">
		<div class="flex shrink-0 items-center gap-2">
			<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded text-tertiary">
				<Rss size={20} class="text-primary" />
			</div>
		</div>

		<div class="relative mx-2 flex-1 flex-row">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<Search class="h-4 w-4 text-tertiary" />
			</div>

			<input
				type="text"
				bind:value={filterText}
				class="p w-full rounded-lg border border-muted bg-background py-1 pr-8 pl-8
                   text-sm font-light text-content placeholder:text-tertiary
                   focus:ring-2 focus:ring-primary focus:outline-none"
			/>

			{#if filterText}
				<button
					type="button"
					onclick={() => (filterText = '')}
					class="absolute inset-y-0 right-0 my-1 flex items-center rounded-full p-2 text-tertiary hover:text-content"
					aria-label="Clear search"
				>
					<X class="h-4 w-4" />
				</button>
			{/if}
		</div>

		<button
			onclick={() => {
				if (sortMode === 'a_z') {
					sortMode = 'z_a';
				} else if (sortMode === 'z_a') {
					sortMode = 'date';
				} else {
					sortMode = 'a_z';
				}
			}}
			class="flex cursor-pointer items-center rounded-full p-2 text-content transition hover:text-tertiary"
			title="Sort"
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

	<div class="border-t border-muted"></div>

	<div class="flex flex-col overflow-y-auto">
		{#each filteredChannels as channel (channel.title)}
			<div
				class="group flex items-center"
				transition:slide={{ duration: menuJustOpened ? 0 : 200 }}
			>
				<button
					onclick={() => filterByChannel(channel)}
					class="flex min-w-0 grow items-center gap-2 rounded-md px-1.5 pr-1 pl-0 text-left text-sm text-accent transition-colors group-hover:opacity-50 hover:bg-secondary"
				>
					<div
						class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white text-tertiary group-hover:opacity-50"
					>
						{#if channel.image}
							<img
								src={channel.image}
								alt={channel.title}
								class=" h-full w-full scale-75 rounded object-cover"
							/>
						{:else}
							<HashIcon size={16} />
						{/if}
					</div>

					<span class="block min-w-0 truncate">
						{channel.title}
					</span>
				</button>

				<button
					onclick={(e) => handleUnsubscribe(channel.link, e)}
					disabled={isDeleting}
					class="group m-0.5 mr-1 flex shrink-0 items-center justify-center rounded-full p-1 text-accent transition hover:text-tertiary"
					aria-label="Unsubscribe"
				>
					<X size={20} />
				</button>
			</div>
		{/each}
	</div>
</div>
