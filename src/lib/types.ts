export type ColorString = `#${string}`;

export type TimetableOptions = {
	active: boolean;
	error?: string;
};

export const timetableTypes = ['rozvrh', 'kruzky'] as const;
export type TimetableType = (typeof timetableTypes)[number];

export type Timetable = {
	type: TimetableType;
	name: string;
	color: ColorString;
	options: TimetableOptions;
};

export type CandleLessonType = string;
/** Minutes since midnight, e.g. 8:10 = 490, 9:00 = 540, ... */
export type CandleLessonTime = number;

export type CandleLesson = {
	type: CandleLessonType;
	room: string;
	subject: string;
	subjectCode: string;
	day: WeekDay;
	start: CandleLessonTime;
	end: CandleLessonTime;
	teacher: string[];
};

export type CandleTimetable = {
	lessons: CandleLesson[];
};

export enum WeekDay {
	Po = 0,
	Ut = 1,
	St = 2,
	Št = 3,
	Pi = 4
}

export enum BlockStartTimes {
	'8:10' = 490,
	'9:00' = 540,
	'9:50' = 590,
	'10:40' = 640,
	'11:30' = 690,
	'12:20' = 740,
	'13:10' = 790,
	'14:00' = 840,
	'14:50' = 890,
	'15:40' = 940,
	'16:30' = 990,
	'17:20' = 1040,
	'18:10' = 1090,
	'19:00' = 1140
}

export type CalculatedBlock = {
	id: string;
	name: string;
	room: string;
	type: CandleLessonType;
	color: ColorString;

	start: CandleLessonTime;
	blockCount: number;

	widthFraction: number;
	rowPosition: number;
};

export type CalculatedDay = {
	times: {
		[key in BlockStartTimes]: CalculatedBlock[];
	};
};

export type CalculatedTimetable = {
	days: {
		[key in WeekDay]: CalculatedDay;
	};
};
