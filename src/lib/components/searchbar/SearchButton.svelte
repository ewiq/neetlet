<script lang="ts">
	import { searchbarState } from '$lib/stores/searchbar.svelte';
	import { Command, Search } from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	let { inputRef = $bindable() } = $props();

	const isAppleDevice = $derived(
		typeof window !== 'undefined' &&
			/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent)
	);
</script>

<div class="z-50 md:fixed md:right-4 md:bottom-4">
	<button
		onclick={() => searchbarState.toggleSearchbar()}
		class="group flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-muted bg-surface text-content shadow transition hover:bg-secondary md:w-auto md:min-w-10 md:space-x-2 md:px-3"
		aria-label="Open Search"
	>
		<Search class="h-5 w-5" />
		<span class="hidden items-center gap-1 text-xs text-tertiary md:flex">
			{#if isAppleDevice}
				<Command class="h-3 w-3" />
			{:else}
				<span class="font-medium">Ctrl</span>
			{/if}
			<span>K</span>
		</span>
	</button>
</div>
