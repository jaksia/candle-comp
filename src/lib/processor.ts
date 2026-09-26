import {
	BlockStartTimes,
	type CalculatedDay,
	type CalculatedTimetable,
	type CandleLesson,
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

function hashString(str: string, seed = 0) {
	let h1 = 0xdeadbeef ^ seed,
		h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function getBlockId(timetableName: string, lesson: CandleLesson): string {
	return hashString(
		`${timetableName}-${lesson.subject}-${lesson.room}-${lesson.start}-${lesson.end}`
	).toString();
}

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
				id: getBlockId(`${metadata.type}/${metadata.name}`, lesson),
				timetableName: `${metadata.type}/${metadata.name}`,
				name: lesson.subject,
				room: lesson.room,
				type: lesson.type,
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
		const activeHash = timetable.options.active ? '1' : '0';
		return `${typeHash}:${nameHash}:${colorHash}:${activeHash}`;
	});
	return hashParts.join(',');
}

export function fromUrlHash(hash: string): Timetable[] {
	if (!hash) return [];
	const hashParts = hash.split(',');
	const timetables: Timetable[] = [];

	for (const part of hashParts) {
		const [typeHash, nameHash, colorHash, activeHash] = part.split(':');
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
			options: { active: activeHash === '1' || activeHash === undefined }
		});
	}

	return timetables;
}
