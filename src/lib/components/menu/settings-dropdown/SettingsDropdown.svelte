<script lang="ts">
	import {
		Settings,
		Moon,
		Sun,
		MoveVertical,
		Magnet,
		Hourglass,
		Shuffle,
		MailCheck,
		MailOpen
	} from 'lucide-svelte';
	import ToggleButton from './ToggleButton.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	let { isDark, isFontSerif, isSnapped } = $props();

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
			icon: null,
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
		},
		{
			id: 'read',
			icon: settings.isReadHidden ? MailOpen : MailCheck,
			label: settings.isReadHidden ? 'Hide read' : 'Show read',
			isChecked: settings.isReadHidden,
			onToggle: () => settings.toggleHideRead()
		}
	]);
</script>

<div class="flex flex-col gap-3">
	<div
		class="flex items-center gap-2.5 px-4 py-1 text-sm font-medium tracking-widest text-content uppercase"
	>
		<Settings size={18} class="text-primary" />
		<span>Settings</span>
	</div>

	<div class="flex flex-col">
		{#each settingsConfig as setting (setting.id)}
			<div
				class="flex w-full items-center justify-between rounded-lg py-2.5 pr-2 pl-3 transition hover:bg-secondary/50"
			>
				<div class="flex items-center gap-2.5 text-sm text-content">
					{#if setting.customIcon}
						<span
							class="flex h-4 w-4 items-center justify-center select-none {isFontSerif
								? 'font-serif'
								: 'font-sans'} text-base"
						>
							A
						</span>
					{:else}
						<setting.icon size={16} class="text-content" />
					{/if}
					<span>{setting.label}</span>
				</div>
				<ToggleButton isChecked={setting.isChecked} onToggle={setting.onToggle} />
			</div>
		{/each}
	</div>
</div>
