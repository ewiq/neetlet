<script lang="ts">
	import { invalidate } from '$app/navigation';
	import {
		deleteChannel,
		getAllCollections,
		toggleChannelCollection,
		updateChannelSettings
	} from '$lib/db/db';
	import { toastData } from '$lib/stores/toast.svelte';
	import type { DBChannel, DBCollection } from '$lib/types/rss';
	import { Check, Copy, Folder } from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	let {
		channel,
		triggerElement,
		onRenameRequest,
		onClose,
		onChannelDeleted,
		onDeletingStateChange
	}: {
		channel: DBChannel;
		triggerElement: HTMLElement | null;
		onRenameRequest: () => void;
		onClose: () => void;
		onChannelDeleted?: () => Promise<void>;
		onDeletingStateChange?: (isDeleting: boolean) => void;
	} = $props();

	let isDeleting = $state(false);
	let copiedChannelId = $state<string | null>(null);
	let copyTimeout: ReturnType<typeof setTimeout> | null = null;

	// Collection State
	let showCollectionMenu = $state(false);
	let availableCollections = $state<DBCollection[]>([]);

	// Position calculation
	let style = $state('');

	$effect(() => {
		if (triggerElement) {
			const rect = triggerElement.getBoundingClientRect();
			// Match original logic: bottom + 4, right align (subtract width)
			style = `top: ${rect.bottom + 4}px; left: ${rect.right - 180}px;`;
		}
	});

	$effect(() => {
		if (onDeletingStateChange) {
			onDeletingStateChange(isDeleting);
		}
	});

	// Click outside handler
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		// Don't close if clicking inside the dropdown or the trigger button
		if (
			!target.closest('[data-dropdown-content]') &&
			target !== triggerElement &&
			!triggerElement?.contains(target)
		) {
			onClose();
		}
	}

	$effect(() => {
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	async function handleToggleCollectionMenu(event: Event) {
		event.stopPropagation();
		showCollectionMenu = !showCollectionMenu;
		if (showCollectionMenu) {
			availableCollections = await getAllCollections();
		}
	}

	async function handleCollectionClick(collectionId: string, event: Event) {
		event.stopPropagation();
		const isAlreadyInCollection = channel.collectionIds?.includes(collectionId) ?? false;
		try {
			await toggleChannelCollection(channel.link, collectionId, !isAlreadyInCollection);
			await invalidate('app:feed');
		} catch (error) {
			console.error('Failed to update collection', error);
		}
	}

	async function handleToggleHideFromFeed(event: Event) {
		event.stopPropagation();
		try {
			const newHideState = !channel.hideOnMainFeed;
			await updateChannelSettings(channel.link, { hideOnMainFeed: newHideState });
			await invalidate('app:feed');
		} catch (error) {}
		onClose();
	}

	async function handleCopyUrl(event: Event) {
		event.stopPropagation();
		try {
			await navigator.clipboard.writeText(channel.feedUrl);
			copiedChannelId = channel.feedUrl;
			if (copyTimeout) clearTimeout(copyTimeout);
			copyTimeout = setTimeout(() => {
				copiedChannelId = null;
				copyTimeout = null;
			}, 4000);
		} catch (error) {
			console.error('Failed to copy URL', error);
		}
	}

	async function handleUnsubscribe(event: Event) {
		event.stopPropagation();
		if (!confirm('Are you sure you want to remove this channel?')) return;
		isDeleting = true;
		try {
			await deleteChannel(channel.link);
			await invalidate('app:feed');
			if (onChannelDeleted) await onChannelDeleted();
			toastData.message = 'Channel removed';
			toastData.type = 'success';
		} catch (error) {
			toastData.message = 'Failed to remove channel';
			toastData.type = 'error';
		} finally {
			isDeleting = false;
			onClose();
		}
	}
</script>

<div
	data-dropdown-content
	class="font-hepta fixed z-50 min-w-[180px] rounded-lg border border-muted bg-background text-xs shadow-lg"
	{style}
>
	<div class="flex flex-col py-1">
		<button
			onclick={onRenameRequest}
			class="w-full cursor-pointer px-4 py-2.5 text-right text-accent transition-colors hover:bg-secondary hover:text-content"
		>
			Rename
		</button>

		<button
			onclick={handleToggleCollectionMenu}
			class="flex w-full cursor-pointer items-center justify-end gap-2 px-4 py-2.5 text-right text-accent transition-colors hover:bg-secondary hover:text-content {showCollectionMenu
				? 'bg-secondary text-content'
				: ''}"
		>
			<span>Add to Collection</span>
		</button>

		{#if showCollectionMenu}
			<div class="w-full bg-secondary/30" transition:slide={{ duration: 150 }}>
				{#if availableCollections.length === 0}
					<div class="px-4 py-3 text-center text-xs text-tertiary">No collections yet</div>
				{:else}
					<div class="max-h-[200px] overflow-y-auto">
						{#each availableCollections as collection}
							{@const isSelected = channel.collectionIds?.includes(collection.id)}
							<button
								onclick={(e) => handleCollectionClick(collection.id, e)}
								class="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-right text-accent transition-colors hover:bg-secondary hover:text-content"
							>
								<span class="w-4 text-primary">
									{#if isSelected}<Check size={14} />{/if}
								</span>
								<div class="flex items-center gap-2">
									<span>{collection.name}</span>
									<Folder size={12} class="text-tertiary" />
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<button
			onclick={handleToggleHideFromFeed}
			class="w-full cursor-pointer px-4 py-2.5 text-right text-accent transition-colors hover:bg-secondary hover:text-content"
		>
			{channel.hideOnMainFeed ? 'Show in main feed' : 'Hide in main feed'}
		</button>

		<button
			onclick={handleCopyUrl}
			class="relative w-full cursor-pointer px-4 py-2.5 text-right text-accent transition-colors hover:bg-secondary hover:text-content"
		>
			<span class="flex items-center justify-end gap-2">
				{#if copiedChannelId === channel.feedUrl}
					<span class="text-primary"><Copy size={16} /></span>
				{/if}
				Cop{copiedChannelId === channel.feedUrl ? 'ied' : 'y'} URL
			</span>
		</button>

		<button
			onclick={handleUnsubscribe}
			disabled={isDeleting}
			class="w-full cursor-pointer px-4 py-2.5 text-right text-accent transition-colors hover:bg-secondary hover:text-content disabled:cursor-not-allowed disabled:opacity-50"
		>
			{isDeleting ? 'Deleting...' : 'Delete'}
		</button>
	</div>
</div>
