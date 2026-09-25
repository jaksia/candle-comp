<script lang="ts">
	import type { Timetable } from '$lib/types';
	import Icon from '@iconify/svelte';
	import ToggleButton from './ToggleButton.svelte';

	let {
		schedule = $bindable(),
		ondelete = () => {}
	}: {
		schedule: Timetable;
		ondelete: () => void;
	} = $props();
</script>

<div class="rounded border-2 border-gray-700 p-3">
	<div class="mb-3 flex items-center gap-2">
		<div class="h-5 w-5 rounded-full" style="background-color: {schedule.color}"></div>
		<h3 class="font-bold text-white">{schedule.type}/{schedule.name}</h3>

		<button onclick={ondelete} class="ml-auto cursor-pointer text-white hover:text-red-500">
			<Icon icon="mdi:delete" class="size-5" />
		</button>
	</div>
	<div>
		<ToggleButton bind:checked={schedule.options.active} label="Zobraziť" />
	</div>
	{#if schedule.options.error}
		<div class="mt-2 text-sm font-medium text-red-500">
			<Icon icon="mdi:alert-circle" class="mr-1 inline-block size-4" />
			{schedule.options.error}
		</div>
	{/if}
</div>
