<script lang="ts" module>
	export const DEFAULT_COLORS: ColorString[] = [
		'#3771c8',
		'#aa8800',
		'#338000',
		'#800066',
		'#008066',
		'#666666',
		'#800000'
	];
</script>

<script lang="ts">
	import { page } from '$app/state';
	import AddOverlay from '$lib/components/AddOverlay.svelte';
	import ScheduleItem from '$lib/components/ScheduleItem.svelte';
	import Week from '$lib/components/Week.svelte';
	import { CandleFetcher } from '$lib/fetcher';
	import { fromUrlHash, processTimetables, toUrlHash } from '$lib/processor';
	import type { CalculatedTimetable, CandleTimetable, ColorString, Timetable } from '$lib/types';
	import Icon from '@iconify/svelte';
	import { onMount, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	const fetcher = new CandleFetcher();

	let schedules = $state<Timetable[]>(fromUrlHash(page.url.hash.slice(1)));
	let addDialogOpen = $state(false);

	let mounted = $state(false);
	onMount(() => {
		mounted = true;
		return () => {
			mounted = false;
		};
	});

	$effect(() => {
		if (!mounted) return;

		const urlHash = toUrlHash(schedules);
		history.replaceState(null, '', `#${urlHash}`);
	});

	$effect(() => {
		if (!mounted) return;

		schedules = fromUrlHash(page.url.hash.slice(1));
	});

	const calcTimetablePromise = $derived(
		mounted
			? getCalculatedTimetable(schedules.filter((s) => s.options.active))
			: Promise.resolve(undefined)
	);

	function getCalculatedTimetable(schedules: Timetable[]): Promise<CalculatedTimetable> {
		const fetchPromises = new SvelteMap<Timetable, Promise<CandleTimetable>>();
		for (const schedule of schedules) {
			fetchPromises.set(schedule, fetcher.getTimetable(schedule.type, schedule.name));
		}
		return Promise.allSettled(fetchPromises.values()).then((timetables) => {
			const timetableMap = new SvelteMap<Timetable, CandleTimetable>();
			let i = 0;
			for (const schedule of schedules) {
				const promiseResult = timetables[i];

				let errorMessage = undefined;

				if (promiseResult.status === 'fulfilled') {
					timetableMap.set(schedule, promiseResult.value);
				} else if (promiseResult.status === 'rejected') {
					errorMessage = 'Nastala neznáma chyba';
					if (
						promiseResult.reason instanceof Error &&
						promiseResult.reason.message.includes('Not Found')
					) {
						errorMessage = 'Rozvrh neexistuje';
					}
				}
				untrack(() => {
					schedules.find((s) => s.name === schedule.name)!.options.error = errorMessage;
				});
				i++;
			}
			return processTimetables(timetableMap);
		});
	}
</script>

{#if addDialogOpen}
	<AddOverlay
		disabledValues={schedules.map((s) => `${s.type}/${s.name}`)}
		onclose={() => (addDialogOpen = false)}
		onsubmit={(type, name) => {
			const usedColors = new Set(schedules.map((s) => s.color));
			const color =
				DEFAULT_COLORS.find((c) => !usedColors.has(c)) ??
				`#${Math.floor(Math.random() * 16777215)
					.toString(16)
					.padStart(6, '0')}`;

			schedules = [...schedules, { type, name, color, options: { active: true } }];
			addDialogOpen = false;
		}}
	/>
{/if}

<div
	class="flex items-center justify-start gap-4 rounded-lg border-2 border-gray-700 bg-gray-900 p-4"
>
	<h1 class="text-xl font-bold text-white">Rozvrhy</h1>
	{#each schedules as schedule, i (schedule.name)}
		<ScheduleItem
			bind:schedule={schedules[i]}
			ondelete={() => {
				schedules = schedules.filter((s) => s.name !== schedule.name);
			}}
		/>
	{/each}

	<button
		class="cursor-pointer rounded border-2 border-gray-700 p-3 text-white transition-colors duration-200 hover:border-green-800 hover:bg-green-500/10 hover:text-green-500"
		onclick={() => {
			addDialogOpen = true;
		}}
	>
		<Icon icon="mdi:plus" class="size-5" />
	</button>
</div>

<div class="mt-4 grid grow gap-4 rounded-lg border-2 border-gray-700 bg-gray-900 p-4">
	{#await calcTimetablePromise}
		<Week />
	{:then calculatedTimetable}
		<Week {calculatedTimetable} {schedules} />
	{/await}
</div>
