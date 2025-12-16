<script lang="ts">
	import SubscriptionList from './SubscriptionList.svelte';
	import AddNewSub from './AddNewSub.svelte';
	import Collections from './Collections.svelte';

	let { onSubscribe, data } = $props();

	type Section = 'add' | 'subs' | 'collections';
	let expandedSection = $state<Section | null>('subs');

	function toggleSection(section: Section) {
		expandedSection = expandedSection === section ? null : section;
	}
</script>

<div class="flex h-full flex-col">
	<AddNewSub
		{onSubscribe}
		isExpanded={expandedSection === 'add'}
		onToggle={() => toggleSection('add')}
	/>

	<div class="min-h-0 grow overflow-auto">
		<SubscriptionList
			isExpanded={expandedSection === 'subs'}
			onToggle={() => toggleSection('subs')}
		/>
	</div>

	<Collections
		collections={data.collections}
		isExpanded={expandedSection === 'collections'}
		onToggle={() => toggleSection('collections')}
	/>
</div>
