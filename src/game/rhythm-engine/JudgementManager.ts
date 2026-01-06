import { CONSTANTS } from "./Constants";
import { HitObject } from "./MapParser";

export class JudgementManager {
	public static getJudgement(absDiff: number) {
		if (absDiff < CONSTANTS.JUDGEMENT_WINDOWS.PERFECT) return "PERFECT";
		if (absDiff < CONSTANTS.JUDGEMENT_WINDOWS.GREAT) return "GREAT";
		if (absDiff < CONSTANTS.JUDGEMENT_WINDOWS.GOOD) return "GOOD";
		return "MISS";
	}

	public static findNoteForHit(
		notes: HitObject[],
		col: number,
		time: number,
		startIndex: number,
	) {
		for (let i = startIndex; i < notes.length; i++) {
			const n = notes[i];
			if (n.column !== col || n.hit || n.holding) continue;

			const diff = time - n.time;
			if (Math.abs(diff) < CONSTANTS.JUDGEMENT_WINDOWS.MISS) {
				return { note: n, index: i, diff };
			}
			if (n.time > time + CONSTANTS.JUDGEMENT_WINDOWS.MISS) break;
		}
		return null;
	}

	public static getJudgementColor(type: string): number {
		const colors: any = {
			PERFECT: 0xffff00,
			GREAT: 0x4dff4d,
			GOOD: 0x1a75ff,
			MISS: 0xff0033,
		};
		return colors[type] || 0xffffff;
	}
}
