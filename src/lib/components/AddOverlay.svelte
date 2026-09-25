<script lang="ts">
	import { timetableTypes, type TimetableType } from '$lib/types';
	import Icon from '@iconify/svelte';

	let {
		inputType = $bindable('rozvrh'),
		inputValue = $bindable(''),
		disabledValues = [],
		onclose = () => {},
		onsubmit = () => {}
	}: {
		inputType?: TimetableType;
		inputValue?: string;
		disabledValues?: string[];
		onclose?: () => void;
		onsubmit?: (type: TimetableType, name: string) => void;
	} = $props();

	const fullInputValue = $derived(`${inputType}/${inputValue.trim()}`);

	const inputError = $derived.by(() => {
		if (inputValue.trim() === '') return '';

		if (disabledValues.includes(fullInputValue)) return 'Tento rozvrh už bol pridaný';

		return null;
	});
</script>

<div class="fixed inset-0 z-30 bg-black/30">
	<div class="absolute inset-0 flex items-center justify-center">
		<div class="relative rounded-lg bg-gray-900 p-4 text-white">
			<button
				class="float-right cursor-pointer rounded-full p-0.5 text-white hover:bg-gray-700"
				onclick={() => onclose()}
			>
				<Icon icon="mdi:close" class="size-6" />
			</button>
			<h2 class="mb-4 text-lg font-bold">Pridať rozvrh</h2>

			<div class="mb-4 flex items-center gap-1">
				<select
					bind:value={inputType}
					class="rounded border-2 border-gray-700 bg-gray-800 p-2 text-white focus:border-blue-500 focus:outline-none"
				>
					{#each timetableTypes as type (type)}
						<option value={type}>{type}</option>
					{/each}
				</select>
				<Icon icon="mdi:slash-forward" class="size-6 text-gray-400" />
				<input
					type="text"
					bind:value={inputValue}
					onkeydown={(e) => {
						if (e.key === 'Enter' && inputError === null) {
							onsubmit(inputType, inputValue.trim());
						}
					}}
					class="w-full rounded border-2 border-gray-700 bg-gray-800 p-2 text-white focus:border-blue-500 focus:outline-none"
					placeholder={inputType === 'rozvrh'
						? 'Názov rozvrhu'
						: inputType === 'kruzky'
							? 'Názov krúžku'
							: ''}
				/>
			</div>
			<div class="mb-4 text-sm font-medium text-red-500">
				{#if inputError !== null && inputError !== ''}
					<Icon icon="mdi:alert-circle" class="mr-1 inline-block size-4" />
					{inputError}
				{/if}
			</div>
			<button
				class="flex w-full cursor-pointer items-center justify-center rounded border-2 border-gray-700 p-2 font-bold transition-all duration-200 not-disabled:hover:border-green-800 not-disabled:hover:bg-green-500/10 not-disabled:hover:text-green-500 disabled:cursor-not-allowed disabled:opacity-50"
				onclick={() => onsubmit(inputType, inputValue.trim())}
				disabled={inputError !== null}
			>
				<Icon icon="mdi:plus" class="mr-1 size-5" />
				Pridať
			</button>
		</div>
	</div>
</div>
