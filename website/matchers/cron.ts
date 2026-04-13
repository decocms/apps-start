/**
 * @titleBy cron
 */
export interface CronProps {
	/**
	 * @format cron
	 * @example * 0-23 * * WED (At every minute past every hour from 0 through 23 on Wednesday.)
	 * @pattern ^(?:(?:(?:\*|(?:\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)|[A-Z]+)(?:\/\d+)?)(?:\s+|$)){5}$
	 */
	cron: string;
}

function nowWithMinutePrecision() {
	const date = new Date();
	date.setSeconds(0);
	date.setMilliseconds(0);
	date.setTime(Math.floor(date.getTime() / 1000) * 1000);
	return date;
}

/**
 * Minimal 5-field cron matcher (minute, hour, day-of-month, month, day-of-week).
 * Supports: wildcards (*), ranges (1-5), lists (1,3,5), steps (star/2), and
 * abbreviated weekday names (MON-SUN).
 */
function matchesCron(cronExpr: string, date: Date): boolean {
	const DAY_NAMES: Record<string, number> = {
		SUN: 0,
		MON: 1,
		TUE: 2,
		WED: 3,
		THU: 4,
		FRI: 5,
		SAT: 6,
	};

	const fields = cronExpr.trim().split(/\s+/);
	if (fields.length < 5) return false;

	const values = [
		date.getMinutes(),
		date.getHours(),
		date.getDate(),
		date.getMonth() + 1,
		date.getDay(),
	];

	for (let i = 0; i < 5; i++) {
		const field = fields[i];
		const value = values[i];

		if (!matchField(field, value, i === 4)) return false;
	}
	return true;

	function matchField(field: string, value: number, isDow: boolean): boolean {
		return field.split(",").some((part) => matchPart(part, value, isDow));
	}

	function matchPart(part: string, value: number, isDow: boolean): boolean {
		const [rangeStr, stepStr] = part.split("/");
		const step = stepStr ? Number.parseInt(stepStr, 10) : 1;

		if (rangeStr === "*") {
			return step === 1 || value % step === 0;
		}

		if (rangeStr.includes("-")) {
			const [startStr, endStr] = rangeStr.split("-");
			const start = parseVal(startStr, isDow);
			const end = parseVal(endStr, isDow);
			if (start <= end) {
				if (value < start || value > end) return false;
			} else {
				// wrap-around (e.g. FRI-MON)
				if (value < start && value > end) return false;
			}
			return step === 1 || (value - start + 100) % step === 0;
		}

		return parseVal(rangeStr, isDow) === value;
	}

	function parseVal(s: string, isDow: boolean): number {
		if (isDow) {
			const upper = s.toUpperCase();
			if (upper in DAY_NAMES) return DAY_NAMES[upper];
		}
		return Number.parseInt(s, 10);
	}
}

/**
 * @title Cron
 * @description Target users with precision using recurring schedules
 * @icon refresh
 */
const MatchCron = (props: CronProps) => {
	if (!props?.cron) {
		return false;
	}
	const minutePrecision = nowWithMinutePrecision();
	return matchesCron(props.cron, minutePrecision);
};

export default MatchCron;
