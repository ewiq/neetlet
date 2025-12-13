<script lang="ts">
	import { Search, X, ChevronRight } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { settings } from '$lib/stores/settings.svelte';
	import { menuState } from '$lib/stores/menu.svelte';
	import SearchButton from './SearchButton.svelte';
	import { searchbarState } from '$lib/stores/searchbar.svelte';
	import { goto } from '$app/navigation';

	let { initialValue = '' } = $props<{
		initialValue?: string;
	}>();

	let value = $state('');
	let inputRef: HTMLInputElement | undefined = $state();

	$effect(() => {
		value = initialValue;
	});

	$effect(() => {
		if (searchbarState.isSearchbarOpen && inputRef) {
			setTimeout(() => inputRef?.focus(), 0);
		}
	});

	function handleClear() {
		value = '';
		if (searchbarState.isSearchbarOpen && !settings.isMobile) {
			inputRef?.focus();
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		const params = new URLSearchParams();
		if (value.trim()) {
			params.set('q', value.trim());
		}

		await goto(`?${params.toString()}`, {
			keepFocus: true
		});

		window.scrollTo({ top: 0, behavior: 'smooth' });

		if (settings.isMobile) {
			menuState.isSubsMenuOpen = false;
		}

		setTimeout(() => inputRef?.blur(), 100);
	}
</script>

{#if !searchbarState.isSearchbarOpen && !settings.isMobile}
	<SearchButton bind:inputRef></SearchButton>
{/if}

{#if searchbarState.isSearchbarOpen}
	<div
		class="fixed right-0 left-0 md:bottom-0 {settings.isMobile
			? 'top-0 z-300'
			: 'z-50'} h-15 border-t border-muted bg-surface py-2 shadow md:px-4"
		transition:fly={{ x: 1000, duration: 150 }}
	>
		<div class="mx-auto flex max-w-2xl items-center gap-3 px-4">
			<button
				onclick={() => searchbarState.closeBar()}
				class="cursor-pointer rounded-full p-2 text-accent transition-colors hover:text-tertiary"
				aria-label="Close search"
			>
				<X class="h-5 w-5" />
			</button>
			<form onsubmit={handleSubmit} class="relative flex-1">
				<div class="relative">
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
						<Search class="h-4 w-4 text-tertiary" />
					</div>
					<input
						bind:this={inputRef}
						type="text"
						bind:value
						placeholder="Search..."
						class="w-full rounded-lg border border-muted bg-background py-2 pr-10
                               pl-10 text-content transition-all
                               placeholder:text-tertiary focus:ring-2
                               focus:ring-primary focus:outline-none"
					/>
					{#if value}
						<button
							type="button"
							onclick={handleClear}
							class="absolute inset-y-0 right-0 my-1 flex items-center rounded-full p-2 text-tertiary hover:text-content"
							aria-label="Clear search"
						>
							<X class="h-4 w-4" />
						</button>
					{/if}
				</div>
			</form>
			<button
				onclick={handleSubmit}
				class="cursor-pointer rounded-full p-2 text-accent transition-colors hover:text-tertiary"
				aria-label="Submit search"
			>
				<ChevronRight class="h-5 w-5" />
			</button>
		</div>
	</div>
{/if}
