import { CONSTANTS } from "./Constants";
import { HitObject } from "./MapParser";

export class JudgementManager {
	public static getJudgement(
		absDiff: number,
		note: HitObject,
		isTail?: boolean,
	) {
		console.log(absDiff, CONSTANTS.JUDGEMENT_WINDOWS.MARAVELOUS);

		if (absDiff <= CONSTANTS.JUDGEMENT_WINDOWS.MARAVELOUS) return "MARAVELOUS";
		if (absDiff <= CONSTANTS.JUDGEMENT_WINDOWS.PERFECT) return "PERFECT";
		if (absDiff <= CONSTANTS.JUDGEMENT_WINDOWS.GOOD) {
			if (note.type == "TAP" || !isTail) return "GOOD";

			if (note.type == "HOLD" && isTail) return "PERFECT"; // Não existe release 100x para LNs

			return "GOOD";
		}

		if (absDiff <= CONSTANTS.JUDGEMENT_WINDOWS.GREAT) return "GREAT";

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
			MARAVELOUS: 0xffff00,
			PERFECT: 0xffff00,
			GOOD: 0x4dff4d,
			GREAT: 0x1a75ff,
			MISS: 0xff0033,
		};
		return colors[type] || 0xffffff;
	}
}
