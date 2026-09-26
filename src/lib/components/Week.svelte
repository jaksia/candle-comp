<script lang="ts">
	import {
		BlockStartTimes,
		WeekDay,
		type CalculatedTimetable,
		type CandleLessonType,
		type ColorString,
		type FullTimetableName,
		type Timetable
	} from '$lib/types';
	import { SvelteMap } from 'svelte/reactivity';

	const DAYS = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok'];

	let {
		calculatedTimetable,
		schedules = []
	}: {
		calculatedTimetable?: CalculatedTimetable;
		schedules?: Timetable[];
	} = $props();

	const lessonTypeColors: Record<CandleLessonType, string> = {
		Prednáška: '#3771c8',
		Cvičenie: '#800000',
		Kurz: '#aa8800',
		Laboratórium: '#338000',
		'Nezadaný typ': '#666666',
		Seminár: '#800066',
		Výskum: '#008066'
	};

	const scheduleColors = $derived.by(() => {
		const map = new SvelteMap<FullTimetableName, ColorString>();
		for (const schedule of schedules) {
			map.set(`${schedule.type}/${schedule.name}`, schedule.color);
		}
		return map;
	});
</script>

<div
	class="grid h-full min-h-0 w-full"
	style="grid-template-rows: auto repeat({Object.values(BlockStartTimes).length /
		2}, 1fr); grid-template-columns: auto repeat({DAYS.length}, 1fr)"
>
	<div class="border-b-2 border-gray-700 bg-gray-900 p-2 text-center text-white">Čas</div>
	{#each DAYS as day (day)}
		<div class="c-border-l border-b-2 border-gray-700 bg-gray-900 p-2 text-center text-white">
			{day}
		</div>
	{/each}

	{#each Object.values(BlockStartTimes).filter((x) => typeof x === 'string') as time, index (time)}
		<div
			class={[
				'bg-gray-900 p-2 pt-0 text-center font-medium text-gray-400',
				index != 0 && 'c-border-t'
			]}
			style="grid-row: {index + 2}; grid-column: 1"
		>
			{time}
		</div>
	{/each}

	{#each Array.from( { length: (DAYS.length * Object.values(BlockStartTimes).length) / 2 } ) as _, i (i)}
		{const day = (i % DAYS.length) as WeekDay,
			blockStr = Object.values(BlockStartTimes)[Math.floor(i / DAYS.length)],
			block = BlockStartTimes[blockStr as keyof typeof BlockStartTimes],
			row = Math.floor(i / DAYS.length) + 2}
		<div
			class={[
				'c-border-l relative bg-gray-900 p-2 text-center text-white',
				row != 2 && 'c-border-t'
			]}
		>
			{#each calculatedTimetable?.days[day].times[block] as subject (subject.id)}
				<div
					class="lesson rounded-lg text-xs text-white"
					style="--color: {scheduleColors.get(
						subject.timetableName
					)}; --width-fraction: {subject.widthFraction}; --row-offset: {subject.rowPosition}; --block-count: {subject.blockCount};"
				>
					<div class="absolute top-1 left-1 text-xs">
						{subject.room}
					</div>
					<div
						class="absolute top-1 right-1 px-1 text-xs"
						style="background-color: {lessonTypeColors[subject.type]};"
					>
						{subject.type[0]}
					</div>
					{subject.name}
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	:root {
		--x-border-width: 2px;
		--y-border-width: 2px;
	}

	.c-border-t {
		border-top: var(--x-border-width) solid var(--color-gray-700);
	}
	.c-border-l {
		border-left: var(--y-border-width) dotted var(--color-gray-700);
	}

	.lesson {
		--x-gap: 2%;
		--y-gap: 3%;

		--calculated-width: calc(
			(100% - var(--x-gap) * (var(--width-fraction) + 1)) / var(--width-fraction)
		);
		--raw-height: calc(100% * var(--block-count) + var(--x-gap) * (var(--block-count) - 1));

		display: flex;
		align-items: center;
		justify-content: center;

		position: absolute;
		top: var(--y-gap);
		width: var(--calculated-width);
		left: calc((var(--calculated-width) + var(--x-gap)) * var(--row-offset) + var(--x-gap));
		height: calc(var(--raw-height) - var(--y-gap) * 2);
		background-color: var(--color);
		z-index: 10;
	}
</style>
