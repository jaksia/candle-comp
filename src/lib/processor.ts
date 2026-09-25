import {
	BlockStartTimes,
	type CalculatedDay,
	type CalculatedTimetable,
	type CandleTimetable,
	type Timetable,
	type TimetableType
} from './types';

function blankTimetable(): CalculatedTimetable {
	function blankTimes(): CalculatedDay['times'] {
		const times = {} as CalculatedDay['times'];
		for (const time in BlockStartTimes) {
			if (isNaN(Number(time))) {
				continue; // Skip non-numeric keys
			}
			times[time as never as BlockStartTimes] = [];
		}
		return times;
	}

	return {
		days: {
			0: { times: blankTimes() },
			1: { times: blankTimes() },
			2: { times: blankTimes() },
			3: { times: blankTimes() },
			4: { times: blankTimes() }
		}
	};
}

blankTimetable();

export function processTimetables(
	timetables: Map<Timetable, CandleTimetable>
): CalculatedTimetable {
	const calculatedTimetable = blankTimetable();

	for (const [metadata, timetable] of timetables.entries()) {
		for (const lesson of timetable.lessons) {
			const day = calculatedTimetable.days[lesson.day];
			if (!day) {
				throw new Error(`Invalid day: ${lesson.day}`);
			}

			const blockStartTime = lesson.start as BlockStartTimes;
			if (!day.times[blockStartTime]) {
				throw new Error(`Invalid block start time: ${blockStartTime}`);
			}

			const blockCount = (lesson.end - lesson.start) / 45;

			if (blockCount <= 0) {
				throw new Error(`Invalid lesson duration: start ${lesson.start}, end ${lesson.end}`);
			}

			day.times[blockStartTime].push({
				id: Math.random().toString(36).substring(2, 15),
				name: lesson.subject,
				room: lesson.room,
				type: lesson.type,
				color: metadata.color,
				start: lesson.start,
				blockCount,
				widthFraction: -1,
				rowPosition: -1
			});
		}
	}

	// calculate widthFraction and rowPosition for each lesson
	for (const day of Object.values(calculatedTimetable.days)) {
		const lessons = Object.values(day.times).flat();
		lessons.sort((a, b) => a.start - b.start);

		for (let i = 0; i < lessons.length;) {
			const lesson = lessons[i];
			const start = lesson.start;
			let maxEnd = lesson.start + lesson.blockCount * 50;
			const overlappingLessons = [lesson];

			let j = i + 1;
			for (; j < lessons.length; j++) {
				const nextLesson = lessons[j];
				if (nextLesson.start < maxEnd) {
					overlappingLessons.push(nextLesson);
					maxEnd = Math.max(maxEnd, nextLesson.start + nextLesson.blockCount * 50);
				} else {
					break;
				}
			}

			let maxLessonsAtTime = 0;
			for (let k = start; k < maxEnd; k += 50) {
				const lessonsAtTime = overlappingLessons.filter(
					(l) => l.start <= k && l.start + l.blockCount * 50 > k
				);
				maxLessonsAtTime = Math.max(maxLessonsAtTime, lessonsAtTime.length);
			}

			const widthFraction = maxLessonsAtTime;

			for (let k = start; k < maxEnd; k += 50) {
				const lessonsAtTime = overlappingLessons.filter(
					(l) => l.start <= k && l.start + l.blockCount * 50 > k
				);
				for (const l of lessonsAtTime) {
					if (l.widthFraction !== -1) continue;

					const usedPositions = new Set(lessonsAtTime.map((ll) => ll.rowPosition));
					let rowPosition = 0;
					while (usedPositions.has(rowPosition)) {
						rowPosition++;
					}
					l.rowPosition = rowPosition;
					l.widthFraction = widthFraction;
				}
			}

			i = j;
		}
	}

	return calculatedTimetable;
}

const typeHashNames: Record<TimetableType, string> = {
	rozvrh: 'r',
	kruzky: 'k'
};

export function toUrlHash(timetables: Timetable[]): string {
	const hashParts = timetables.map((timetable) => {
		const typeHash = typeHashNames[timetable.type];
		const nameHash = encodeURIComponent(timetable.name);
		const colorHash = encodeURIComponent(timetable.color.replace('#', ''));
		return `${typeHash}:${nameHash}:${colorHash}`;
	});
	return hashParts.join(',');
}

export function fromUrlHash(hash: string): Timetable[] {
	if (!hash) return [];
	const hashParts = hash.split(',');
	const timetables: Timetable[] = [];

	for (const part of hashParts) {
		const [typeHash, nameHash, colorHash] = part.split(':');
		const type = Object.entries(typeHashNames).find(([, v]) => v === typeHash)?.[0] as
			TimetableType | undefined;
		if (!type) {
			console.warn(`Unknown timetable type hash: ${typeHash}`);
			continue;
		}
		const name = decodeURIComponent(nameHash);
		timetables.push({
			type,
			name,
			color: `#${decodeURIComponent(colorHash)}`,
			options: { active: true }
		});
	}

	return timetables;
}
