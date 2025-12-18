<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { updateChannelSettings } from '$lib/db/db';
	import type { DBChannel } from '$lib/types/rss';
	import { filterByChannel } from '$lib/utils/filterByChannel';
	import { Ellipsis, HashIcon, ChevronRight, Loader } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import ChannelDropdown from './ChannelDropdown.svelte';
	import { clickOutside } from '$lib/utils/clickOutside';
	import { scrollToView } from '$lib/stores/mobileKeyboard.svelte';

	let {
		channel,
		settings = false,
		onChannelDeleted,
		isEditing,
		isDropdownOpen,
		onSetEditingId,
		onSetDropdownId
	}: {
		channel: DBChannel;
		settings?: Boolean;
		onChannelDeleted?: () => Promise<void>;
		isEditing: boolean;
		isDropdownOpen: boolean;
		onSetEditingId: (id: string | null) => void;
		onSetDropdownId: (id: string | null) => void;
	} = $props();

	let previousIsEditing = $state(false);
	let editingTitle = $state('');
	let editInputElement: HTMLInputElement | null = $state(null);
	let dropdownButtonElement = $state<HTMLButtonElement | null>(null);
	let editContainerElement = $state<HTMLDivElement | null>(null);
	let isDeleting = $state(false);

	// Initialize edit state when entering edit mode
	$effect(() => {
		if (isEditing && !previousIsEditing) {
			editingTitle = channel.customTitle || channel.title;
			editInputElement?.focus();
		}
		previousIsEditing = isEditing;
	});

	function handleStartRename() {
		editingTitle = channel.customTitle || channel.title;
		onSetDropdownId(null);
		onSetEditingId(channel.link);
	}

	function handleCancelRename() {
		onSetEditingId(null);
		editingTitle = '';
	}

	async function handleSaveRename() {
		if (!editingTitle.trim()) {
			handleCancelRename();
			return;
		}

		try {
			await updateChannelSettings(channel.link, { customTitle: editingTitle.trim() });
			await invalidate('app:feed');
		} catch (error) {
			console.error('Failed to rename channel', error);
		} finally {
			onSetEditingId(null);
			editingTitle = '';
		}
	}

	function handleDropdownToggle(event: Event) {
		event.stopPropagation();
		if (isDropdownOpen) {
			onSetDropdownId(null);
		} else {
			onSetDropdownId(channel.link);
		}
	}

	function handleDeletingStateChange(deletingState: boolean) {
		isDeleting = deletingState;
	}
</script>

<div
	class="flex items-center transition-opacity {isDeleting ? 'opacity-50' : ''}"
	transition:slide={{ duration: 200 }}
>
	{#if isEditing}
		<div
			bind:this={editContainerElement}
			use:clickOutside={handleCancelRename}
			class="flex min-w-0 grow items-center gap-2 rounded-lg py-1 pr-2 pl-2 transition-colors {channel.hideOnMainFeed
				? 'opacity-60'
				: ''}"
		>
			<div class="relative flex h-6 w-6 shrink-0 items-center justify-center rounded text-tertiary">
				{#if channel.image && !isDeleting}
					<img
						src={channel.image}
						alt={channel.title}
						class="h-full w-full scale-90 rounded object-cover"
					/>
				{:else if !channel.image && !isDeleting}
					<HashIcon size={16} />
				{/if}
				{#if isDeleting}
					<div class="inset-0 flex items-center justify-center">
						<Loader size={20} class="animate-spin text-tertiary" />
					</div>
				{/if}
			</div>

			<input
				type="text"
				bind:value={editingTitle}
				bind:this={editInputElement}
				use:scrollToView
				class="-ml-1 h-full min-w-0 grow rounded bg-secondary px-1 text-sm text-content outline-none"
				onkeydown={(e) => {
					e.stopPropagation();
					if (e.key === 'Enter') handleSaveRename();
					if (e.key === 'Escape') handleCancelRename();
				}}
				onclick={(e) => e.stopPropagation()}
			/>

			<button
				onclick={handleSaveRename}
				class="flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 text-primary transition hover:bg-secondary"
				aria-label="Save rename"
			>
				<ChevronRight size={20} />
			</button>
		</div>
	{:else}
		<button
			onclick={() => filterByChannel(channel)}
			class="flex min-w-0 grow cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-2 pl-2 text-left text-sm text-accent transition-colors hover:bg-secondary {channel.hideOnMainFeed
				? 'opacity-60'
				: ''}"
		>
			<div class="relative flex h-6 w-6 shrink-0 items-center justify-center rounded text-tertiary">
				{#if channel.image && !isDeleting}
					<img
						src={channel.image}
						alt={channel.title}
						class="h-full w-full scale-90 rounded object-cover"
					/>
				{:else if !channel.image && !isDeleting}
					<HashIcon size={16} />
				{/if}
				{#if isDeleting}
					<div class="flex items-center justify-center rounded bg-surface/50">
						<Loader size={16} class="animate-spin text-tertiary" />
					</div>
				{/if}
			</div>
			<span class="block min-w-0 truncate">
				{channel.customTitle || channel.title}
			</span>
		</button>
	{/if}

	{#if settings && !isEditing}
		<div class="relative">
			<button
				bind:this={dropdownButtonElement}
				onclick={handleDropdownToggle}
				class="flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-2 text-accent transition hover:bg-secondary hover:text-tertiary"
				aria-label="Channel options"
			>
				<Ellipsis size={20} />
			</button>

			{#if isDropdownOpen}
				<ChannelDropdown
					{channel}
					triggerElement={dropdownButtonElement}
					{onChannelDeleted}
					onRenameRequest={handleStartRename}
					onClose={() => onSetDropdownId(null)}
					onDeletingStateChange={handleDeletingStateChange}
				/>
			{/if}
		</div>
	{/if}
</div>
