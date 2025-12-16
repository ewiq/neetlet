<script lang="ts">
	let { isChecked = false, onToggle } = $props();
</script>

<button
	onclick={onToggle}
	type="button"
	aria-label="toggle"
	class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors
		{isChecked ? 'bg-primary' : 'bg-muted'}"
>
	<span
		class="inline-block h-4 w-4 transform rounded-full bg-surface shadow-md transition-transform
		{isChecked ? 'translate-x-5' : 'translate-x-0.5'}"
	>
	</span>
</button>
