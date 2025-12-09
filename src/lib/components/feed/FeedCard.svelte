<script lang="ts">
	import type { UIItem } from '$lib/types/rss';
	import { Bookmark, X } from 'lucide-svelte';
	import { timeAgo } from '$lib/utils/dateUtils';
	import { extractDomain } from '$lib/utils/uiUtils';
	import { menuState } from '$lib/stores/menu.svelte';

	let { item }: { item: UIItem } = $props();

	let cleanDescription = $derived.by(() => {
		const doc = new DOMParser().parseFromString(item.description, 'text/html');
		return doc.body.textContent || '';
	});

	let domainName = $derived(extractDomain(item.link));
</script>

<article
	class="flex max-h-[85vh] snap-start flex-col overflow-hidden rounded-xl border border-muted bg-surface shadow-sm transition lg:max-h-[70vh] {menuState.isMenuHidden
		? 'scroll-mt-2'
		: 'scroll-mt-20'}"
>
	<div class="shrink-0 px-5 py-3">
		<div class="flex items-center gap-3">
			{#if item.channelImage}
				<img src={item.channelImage} alt="" class="h-9 w-9 rounded-full object-cover" />
			{/if}
			<div class="flex flex-col leading-tight">
				<span class="line-clamp-1 text-base font-semibold text-content">
					{item.channelTitle}
				</span>
				<div class="flex items-center gap-1 text-sm text-tertiary">
					{#if item.author}
						<span class="line-clamp-1">{item.author}</span>
						<span>·</span>
					{/if}
					<span>{timeAgo(item.pubDate)}</span>
				</div>
			</div>
		</div>
	</div>
	{#if item.image}
		<div class="flex h-full w-full flex-1 items-center justify-center overflow-hidden bg-muted/40">
			<img src={item.image} alt={item.title} class="h-full w-full object-cover" loading="lazy" />
		</div>
	{/if}
	<div class="shrink-0 px-5 py-2">
		<a href={item.link} target="_blank" rel="noopener noreferrer" class="group block">
			{#if domainName}
				<div class="tracking-wifade mb-1 text-xs text-tertiary uppercase">
					{domainName}
				</div>
			{/if}
			<h2
				class="mb-1 line-clamp-2 text-base font-semibold text-content transition-colors group-hover:text-primary"
			>
				{item.title}
			</h2>
		</a>
		<p class="mb-3 line-clamp-3 text-[0.90rem] leading-relaxed text-content/80">
			{cleanDescription}
		</p>
		<div class="mt-2 flex items-center justify-between border-t border-muted pt-2">
			<button
				class="cursor-pointer rounded-full p-2 text-tertiary transition hover:bg-muted hover:text-primary"
				title="Save to Favourites"
			>
				<Bookmark class="h-6 w-6" />
			</button>
			<button
				class="flex cursor-pointer items-center rounded-full bg-secondary/50 p-3 text-sm font-medium text-content transition hover:bg-secondary"
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	</div>
</article>
