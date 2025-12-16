<script lang="ts">
	import { goto } from '$app/navigation';
	import { invalidate } from '$app/navigation';
	import { menuState } from '$lib/stores/menu.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { Bookmark, ChevronDown, Folder, Plus, X, Check, Trash2, FolderOpen } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { tick } from 'svelte';
	import { createCollection, deleteCollection, getAllChannels } from '$lib/db/db';
	import type { DBChannel, DBCollection } from '$lib/types/rss';
	import ChannelList from './ChannelList.svelte';

	interface Props {
		collections: Array<{
			id: string;
			name: string;
			createdAt: number;
		}>;
		isExpanded?: boolean;
		onToggle?: () => void;
	}

	let { collections = [], isExpanded = false, onToggle } = $props();

	let openCollectionId = $state<string | null>(null);
	let showNewCollectionInput = $state(false);
	let newCollectionName = $state('');
	let collectionJustCreated = $state(false);
	let allChannels = $state<DBChannel[]>([]);

	let sortedCollections = $derived.by(() =>
		[...collections].sort((a, b) => b.createdAt - a.createdAt)
	);

	$effect(() => {
		if (collections) {
			loadChannels();
		}
	});

	async function loadChannels() {
		allChannels = await getAllChannels();
	}

	function getCollectionChannels(collectionId: string) {
		return allChannels.filter((c) => c.collectionIds?.includes(collectionId));
	}

	function toggleCollection(collectionId: string) {
		openCollectionId = openCollectionId === collectionId ? null : collectionId;
	}

	async function filterByFavourite() {
		const params = new URLSearchParams();
		params.set('favs', '1');

		await goto(`/?${params.toString()}`, {});
		window.scrollTo({ top: 0, behavior: 'smooth' });

		if (settings.isMobile) {
			menuState.isSubsMenuOpen = false;
		}
	}

	async function filterByCollection(collection: DBCollection) {
		const params = new URLSearchParams();
		params.set('collection', collection.id);

		await goto(`/?${params.toString()}`, {});
		window.scrollTo({ top: 0, behavior: 'smooth' });

		if (settings.isMobile) {
			menuState.isSubsMenuOpen = false;
		}
	}

	function showCollectionInput() {
		showNewCollectionInput = true;
	}

	async function addCollection() {
		const trimmedName = newCollectionName.trim();
		if (!trimmedName) return;

		collectionJustCreated = true;

		try {
			await createCollection(trimmedName);
			newCollectionName = '';
			showNewCollectionInput = false;
			await invalidate('app:feed');
		} catch (error) {
			console.error('Failed to create collection:', error);
		}

		await tick();
		collectionJustCreated = false;
	}

	function cancelAddingCollection() {
		showNewCollectionInput = false;
		newCollectionName = '';
	}

	async function handleDeleteCollection(collectionId: string) {
		const confirmed = confirm(`Are you sure you want to delete this collection?`);
		if (!confirmed) return;

		try {
			await deleteCollection(collectionId);
			collections = collections.filter((c) => c.id !== collectionId);

			if (openCollectionId === collectionId) {
				openCollectionId = null;
			}

			await invalidate('app:feed');
		} catch (error) {
			console.error('Failed to delete collection:', error);
		}
	}
</script>

<div class="flex flex-col border-b border-muted">
	<button
		onclick={onToggle}
		class="flex w-full cursor-pointer items-center justify-between px-4 py-3 transition hover:bg-secondary/50"
	>
		<div class="flex items-center gap-2.5">
			<FolderOpen size={18} class="text-primary" />
			<h3 class="text-sm font-medium tracking-widest text-content uppercase">Collections</h3>
			<span class="text-xs text-tertiary">({collections.length})</span>
		</div>
		<div class="flex items-center gap-1">
			{#if isExpanded}
				<button
					onclick={(e) => {
						e.stopPropagation();
						showCollectionInput();
					}}
					class="mr-1.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-tertiary transition hover:bg-primary/10 hover:text-primary"
					aria-label="Add new collection"
				>
					<Plus size={18} />
				</button>
			{/if}
			<ChevronDown
				size={20}
				class="text-tertiary transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
			/>
		</div>
	</button>

	{#if isExpanded}
		<div
			class="flex max-h-[60vh] flex-col overflow-y-auto px-2 pb-2"
			transition:slide={{ duration: 150 }}
		>
			{#if showNewCollectionInput}
				<div
					class="flex items-center gap-1 rounded-lg bg-secondary/50 py-1 pr-0.5 pl-3"
					transition:slide={{ duration: collectionJustCreated ? 0 : 150 }}
				>
					<Folder size={18} class="shrink-0  text-tertiary" />
					<input
						type="text"
						bind:value={newCollectionName}
						onkeydown={(e) => {
							if (e.key === 'Enter') addCollection();
							if (e.key === 'Escape') cancelAddingCollection();
						}}
						placeholder="Collection name..."
						class="ml-2 min-w-0 flex-1 bg-transparent text-sm text-content outline-none placeholder:text-tertiary"
					/>
					<button
						onclick={addCollection}
						class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded transition hover:bg-primary/10"
						aria-label="Save collection"
					>
						<Check size={18} strokeWidth={3} class="text-primary" />
					</button>
					<button
						onclick={cancelAddingCollection}
						class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded transition hover:bg-secondary"
						aria-label="Cancel"
					>
						<X size={18} class="text-tertiary" />
					</button>
				</div>
			{/if}

			<div>
				{#each sortedCollections as collection (collection.id)}
					{@const collectionChannels = getCollectionChannels(collection.id)}

					<div class="collection-item">
						<div class="flex items-center rounded-lg transition hover:bg-secondary">
							<button
								onclick={() => filterByCollection(collection)}
								class="group flex h-full shrink-0 cursor-pointer items-center justify-center rounded-l-lg px-3 py-2.5 transition"
								aria-label="Filter by {collection.name}"
							>
								<Folder
									size={18}
									class="text-content group-hover:fill-primary group-hover:text-primary"
								/>
							</button>

							<button
								onclick={() => toggleCollection(collection.id)}
								class="flex flex-1 cursor-pointer items-center gap-2.5 py-2.5 text-left text-sm text-content"
							>
								<span class="font-medium">{collection.name}</span>
								<span class="text-xs text-tertiary">({collectionChannels.length})</span>
							</button>

							<div class="flex items-center">
								{#if openCollectionId === collection.id}
									<button
										onclick={() => handleDeleteCollection(collection.id)}
										class="flex h-full shrink-0 cursor-pointer items-center justify-center px-2.5 py-2.5 text-tertiary transition hover:bg-red-50 hover:text-red-600"
										aria-label="Delete collection"
									>
										<Trash2 size={16} />
									</button>
								{/if}

								<button
									onclick={() => toggleCollection(collection.id)}
									class="flex h-full shrink-0 cursor-pointer items-center justify-center rounded-r-lg px-2.5 py-2.5 text-tertiary transition hover:bg-primary/10 hover:text-primary"
									aria-label="Toggle collection"
								>
									<ChevronDown
										size={16}
										class="transition-transform duration-200 {openCollectionId === collection.id
											? 'rotate-180'
											: ''}"
									/>
								</button>
							</div>
						</div>

						{#if openCollectionId === collection.id}
							<div class="pl-4" transition:slide={{ duration: 150 }}>
								{#if collectionChannels.length > 0}
									<ChannelList
										channels={collectionChannels}
										settings={false}
										onChannelDeleted={loadChannels}
									/>
								{:else}
									<div class="px-3 py-3 text-xs text-tertiary italic">No channels yet...</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<button
				onclick={filterByFavourite}
				class="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-content transition hover:bg-secondary"
			>
				<Bookmark size={18} class="shrink-0 fill-current text-primary" />
				<span class="text-sm font-medium">Favourites</span>
			</button>
		</div>
	{/if}
</div>
