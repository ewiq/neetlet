<script lang="ts">
	import { X, CircleCheck, CircleX } from 'lucide-svelte';
	import { cubicInOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';

	let { message, type } = $props();

	let visible = $state(false);
	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (message) {
			visible = true;
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				close();
			}, 3000);
		}

		return () => {
			clearTimeout(timeoutId);
		};
	});

	function close() {
		visible = false;
		setTimeout(() => {
			message = '';
		}, 300);
	}
</script>

{#if visible && message}
	<div
		data-toast
		transition:fly={{ duration: 400, y: 150, easing: cubicInOut }}
		class="fixed right-4 bottom-4 z-1000 flex h-16 max-w-md min-w-[300px] items-center gap-3 rounded-lg border bg-background p-4 shadow-lg select-none"
		class:border-green-800={type === 'success'}
		class:border-red-800={type === 'error'}
		class:border-primary={type === 'info'}
	>
		{#if type === 'success'}
			<CircleCheck class="h-5 w-5 shrink-0 text-green-800" />
		{:else if type === 'info'}
			<CircleCheck class="h-5 w-5 shrink-0 text-primary" />
		{:else}
			<CircleX class="h-5 w-5 shrink-0 text-red-800" />
		{/if}

		<p class="flex-1 text-sm text-content">{message}</p>

		<button
			onclick={close}
			class="shrink-0 cursor-pointer rounded-sm opacity-70 transition-opacity hover:opacity-100"
		>
			<X class="h-4 w-4 text-content" />
		</button>
	</div>
{/if}
