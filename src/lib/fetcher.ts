import { type CandleLesson, type CandleTimetable, type TimetableType, WeekDay } from './types';
import * as v from 'valibot';
import { dev } from '$app/env';

const candleWeekDayMap = {
	Po: WeekDay.Po,
	Ut: WeekDay.Ut,
	St: WeekDay.St,
	Št: WeekDay.Št,
	Pi: WeekDay.Pi
};

const lessonValidationSchema = v.object({
	type: v.string(),
	room: v.string(),
	subject: v.string(),
	subjectCode: v.string(),
	day: v.pipe(
		v.string(),
		v.transform((s) => {
			const day = candleWeekDayMap[s as keyof typeof candleWeekDayMap];
			if (day === undefined) {
				throw new Error(`Invalid day: ${s}`);
			}
			return day;
		})
	),
	start: v.pipe(
		v.string(),
		v.regex(/^\d{1,2}:\d{2}$/),
		v.transform((s) => {
			const [hours, minutes] = s.split(':').map(Number);
			return hours * 60 + minutes;
		})
	),
	end: v.pipe(
		v.string(),
		v.regex(/^\d{1,2}:\d{2}$/),
		v.transform((s) => {
			const [hours, minutes] = s.split(':').map(Number);
			return hours * 60 + minutes;
		})
	),
	teacher: v.array(v.string())
});

export class CandleFetcher {
	private timetableCache: Map<string, CandleTimetable> = new Map();
	private pendingFetches: Map<string, Promise<CandleTimetable>> = new Map();

	private getTimetableXMLUrl(type: TimetableType, name: string) {
		if (dev) return `/candle-api/${type}/${name}.xml`;
		return `https://cors.jaksia.xyz/?https://candle.fmph.uniba.sk/${type}/${name}.xml`;
	}

	private parseTimetableXML(name: string, xml: string) {
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xml, 'text/xml');
		const xmlTimetable = xmlDoc.getElementsByTagName('timetable')[0];
		if (!xmlTimetable) {
			throw new Error(`Invalid XML format: missing <timetable> element for ${name}`);
		}

		const timetable: CandleTimetable = {
			lessons: []
		};

		const xmlLessons = xmlDoc.getElementsByTagName('lesson');
		for (let i = 0; i < xmlLessons.length; i++) {
			const xmlLesson = xmlLessons[i];
			const rawLesson = {
				type: xmlLesson.getElementsByTagName('type')[0]?.textContent || '',
				room: xmlLesson.getElementsByTagName('room')[0]?.textContent || '',
				subject: xmlLesson.getElementsByTagName('subject')[0]?.textContent || '',
				subjectCode: xmlLesson.getElementsByTagName('subjectCode')[0]?.textContent || '',
				day: xmlLesson.getElementsByTagName('day')[0]?.textContent || '',
				start: xmlLesson.getElementsByTagName('start')[0]?.textContent || '',
				end: xmlLesson.getElementsByTagName('end')[0]?.textContent || '',
				teacher: Array.from(xmlLesson.getElementsByTagName('teacher')).map(
					(t) => t.textContent || ''
				)
			};
			try {
				const lesson = v.parse(lessonValidationSchema, rawLesson);
				timetable.lessons.push(lesson as CandleLesson);
			} catch (error) {
				console.error(`Error parsing lesson:`, error);
			}
		}
		return timetable;
	}

	private async fetchTimetable(type: TimetableType, name: string): Promise<CandleTimetable> {
		const url = this.getTimetableXMLUrl(type, name);
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch timetable for ${name}: ${response.statusText}`);
		}
		const xml = await response.text();
		return this.parseTimetableXML(name, xml);
	}

	public async getTimetable(type: TimetableType, name: string): Promise<CandleTimetable> {
		const fullName = `${type}/${name}`;
		if (this.timetableCache.has(fullName)) {
			return this.timetableCache.get(fullName)!;
		}

		if (this.pendingFetches.has(fullName)) {
			return this.pendingFetches.get(fullName)!;
		}
		const fetchPromise = this.fetchTimetable(type, name)
			.then((timetable) => {
				this.timetableCache.set(fullName, timetable);
				this.pendingFetches.delete(fullName);
				return timetable;
			})
			.catch((error) => {
				this.pendingFetches.delete(fullName);
				throw error;
			});
		this.pendingFetches.set(fullName, fetchPromise);
		return fetchPromise;
	}
}
