<script lang="ts">
	import { Settings, Moon, Sun, MoveVertical, Magnet, Hourglass, Shuffle } from 'lucide-svelte';
	import ToggleButton from './ToggleButton.svelte';
	import { initializeSettings, settings } from '$lib/stores/settings.svelte';
	let { isDark, isFontSerif, isSnapped } = $props();

	$effect(() => {});

	const settingsConfig = $derived([
		{
			id: 'theme',
			icon: isDark ? Moon : Sun,
			label: isDark ? 'Dark' : 'Light',
			isChecked: isDark,
			onToggle: () => settings.toggleDarkMode()
		},
		{
			id: 'font',
			icon: null, // Custom rendering
			label: isFontSerif ? 'Serif' : 'Sans serif',
			isChecked: isFontSerif,
			onToggle: () => settings.toggleFont(),
			customIcon: true
		},
		{
			id: 'scroll',
			icon: isSnapped ? Magnet : MoveVertical,
			label: isSnapped ? 'Snap scroll' : 'Free scroll',
			isChecked: isSnapped,
			onToggle: () => settings.toggleScrollSnap()
		},
		{
			id: 'shuffle',
			icon: settings.isShuffled ? Shuffle : Hourglass,
			label: settings.isShuffled ? 'Shuffle feed' : 'Chronological',
			isChecked: settings.isShuffled,
			onToggle: () => settings.toggleShuffle()
		}
	]);
</script>

<div class="space-y-2">
	<div class="flex items-center gap-2 text-base font-semibold text-content">
		<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-tertiary">
			<Settings size={20} class="text-primary" />
		</div>
		<span>Settings</span>
	</div>

	{#each settingsConfig as setting (setting.id)}
		<div
			class="flex w-full items-center justify-between rounded-lg px-3"
			class:mt-1={setting.id === 'font'}
		>
			<div class="flex items-center gap-2 text-sm text-content">
				{#if setting.customIcon}
					<span class="select-none {isFontSerif ? 'font-serif' : 'font-sans'} text-lg">A</span>
				{:else}
					<setting.icon size={16} />
				{/if}
				<span>{setting.label}</span>
			</div>

			<ToggleButton isChecked={setting.isChecked} onToggle={setting.onToggle}></ToggleButton>
		</div>
	{/each}
</div>
