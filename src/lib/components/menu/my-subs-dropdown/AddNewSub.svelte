<script lang="ts">
	import { ChevronDown, LoaderCircle, Plus, Share2 } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { tick } from 'svelte';
	import { toastData } from '$lib/stores/toast.svelte';
	import { menuState } from '$lib/stores/menu.svelte';
	import { getAllChannels, saveFeedToDB } from '$lib/db/db';
	import type { RSSFeedResponse } from '$lib/types/rss';

	let { onSubscribe, isExpanded = false, onToggle } = $props();

	let subscriptionUrl = $state('');

	async function subscribe(event: Event) {
		event.preventDefault();
		if (!subscriptionUrl.trim()) return;

		menuState.isSubscriptionLoading = true;
		toastData.message = '';
		await tick();

		try {
			const response = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: subscriptionUrl })
			});

			const result = (await response.json()) as RSSFeedResponse;

			if (result.success) {
				const existingChannels = await getAllChannels();
				const isDuplicate = existingChannels.some(
					(channel) => channel.link === result.data.data.link
				);

				if (isDuplicate) {
					toastData.message = 'You are already subscribed to this channel!';
					toastData.type = 'info';
					subscriptionUrl = '';
					return;
				}

				try {
					await saveFeedToDB(result.data, result.feedUrl);
					console.log('Feed saved to IDB');
				} catch (dbError) {
					toastData.message = 'Failed to save to DB:';
					console.error(dbError);
				}

				toastData.message = 'Successfully subscribed to RSS feed!';
				toastData.type = 'success';
				onSubscribe?.(result.data);
				subscriptionUrl = '';
			} else {
				toastData.message = result.error || 'Failed to subscribe. Please try again.';
				toastData.type = 'error';
			}
		} catch (error) {
			console.error('Error subscribing:', error);
			toastData.message = 'An error occurred. Please try again.';
			toastData.type = 'error';
		} finally {
			menuState.isSubscriptionLoading = false;
		}
	}
</script>

<div class="border-b border-muted">
	<button
		onclick={onToggle}
		class="flex w-full cursor-pointer items-center justify-between px-4 py-3 transition hover:bg-secondary/50"
	>
		<div class="flex items-center gap-2.5">
			<Plus size={18} class="text-primary" strokeWidth={2.5} />
			<h3 class="text-sm font-medium tracking-widest text-content uppercase">Add New</h3>
		</div>
		<ChevronDown
			size={20}
			class="text-tertiary transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
		/>
	</button>

	{#if isExpanded}
		<div class="mt-2 px-4 pb-2" transition:slide={{ duration: 150 }}>
			<form onsubmit={subscribe} class="space-y-3">
				<div class="relative flex items-center">
					<input
						id="subscriptionUrl"
						type="text"
						placeholder="https://example.com/rss"
						bind:value={subscriptionUrl}
						class="w-full rounded-lg border border-muted bg-background px-3 py-2.5 text-sm text-content placeholder:text-tertiary focus:ring-2 focus:ring-primary focus:outline-none"
					/>
				</div>
				<button
					type="submit"
					disabled={menuState.isSubscriptionLoading}
					class="flex min-h-10 w-full cursor-pointer items-center justify-center rounded-lg bg-accent-button py-2.5 text-sm font-medium text-surface transition hover:bg-content disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if menuState.isSubscriptionLoading}
						<LoaderCircle class="h-5 w-5 animate-spin" />
					{:else}
						Subscribe
					{/if}
				</button>
			</form>
		</div>
	{/if}
</div>
