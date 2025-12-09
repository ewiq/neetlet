<script lang="ts">
	import { LoaderCircle, Plus } from 'lucide-svelte';
	import { tick } from 'svelte';
	import { toastData } from '$lib/stores/toast.svelte';
	import type { RSSFeedResponse } from '$lib/types/rss';
	import { getAllChannels, saveFeedToDB } from '$lib/db/db';
	import { menuState } from '$lib/stores/menu.svelte';
	import SubscriptionList from './SubscriptionList.svelte';

	let { onSubscribe } = $props();

	let subscriptionUrl = $state('');

	async function subscribe() {
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
					await saveFeedToDB(result.data);
					console.log('Feed saved to IDB');
				} catch (dbError) {
					((toastData.message = 'Failed to save to DB:'), dbError);
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

<div class="flex h-full flex-col">
	<div class="h-full grow">
		<SubscriptionList></SubscriptionList>
	</div>

	<div class="flex grow-0 flex-col space-y-2">
		<div class="border-t border-muted"></div>
		<div class="mb-1 flex items-center gap-2 text-base font-semibold text-content">
			<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-tertiary">
				<Plus size={20} class="text-primary" />
			</div>
			<span>Add new channel</span>
		</div>
		<form onsubmit={subscribe}>
			<div class="relative flex items-center">
				<input
					id="subscriptionUrl"
					type="text"
					placeholder="https://example.com/rss"
					bind:value={subscriptionUrl}
					class="w-full rounded-lg border border-muted bg-background px-3 py-2 text-sm text-content placeholder:text-tertiary focus:ring-2 focus:ring-primary focus:outline-none"
				/>
			</div>
			<button
				onclick={subscribe}
				disabled={menuState.isSubscriptionLoading}
				class="mt-2 flex min-h-10 w-full cursor-pointer items-center justify-center rounded-lg bg-accent py-2 text-sm font-medium text-surface transition hover:bg-content disabled:opacity-50"
			>
				{#if menuState.isSubscriptionLoading}
					<LoaderCircle class="h-5 w-5 animate-spin" />
				{:else}
					Subscribe
				{/if}
			</button>
		</form>
	</div>
</div>
