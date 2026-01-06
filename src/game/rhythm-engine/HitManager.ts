import { HitObject } from "./MapParser";
import { CONSTANTS } from "./Constants";
import { JudgementManager } from "./JudgementManager";

export interface HitResult {
	note: HitObject;
	judge: string;
	diff: number;
}

export class HitManager {
	private nextNoteIndex: number[];

	constructor(private totalColumns: number) {
		this.nextNoteIndex = new Array(totalColumns).fill(0);
	}

	public processInputHits(
		notes: HitObject[],
		time: number,
		consumeInput: (col: number) => boolean,
	): HitResult[] {
		const results: HitResult[] = [];

		for (let col = 0; col < this.totalColumns; col++) {
			if (consumeInput(col)) {
				const target = JudgementManager.findNoteForHit(
					notes,
					col,
					time,
					this.nextNoteIndex[col],
				);

				if (target) {
					const judge = JudgementManager.getJudgement(Math.abs(target.diff));

					if (target.note.type === "TAP") {
						target.note.hit = true;
					} else {
						// Início da nota longa (Head)
						target.note.holding = true;
						target.note.wasInteracted = true;
					}

					results.push({ note: target.note, judge, diff: target.diff });
				}
			}
		}
		return results;
	}

	public processRelease(
		notes: HitObject[],
		col: number,
		time: number,
	): HitResult | null {
		const note = notes.find((n) => n.holding && n.column === col);

		if (note) {
			note.holding = false;
			note.hit = true;

			const releaseError = time - note.endTime;
			const judge = JudgementManager.getJudgement(Math.abs(releaseError));

			return { note, judge, diff: releaseError };
		}
		return null;
	}

	public checkMisses(
		notes: HitObject[],
		time: number,
		onJudgement: (type: string, diff: number) => void,
	) {
		for (let col = 0; col < this.totalColumns; col++) {
			let idx = this.nextNoteIndex[col];

			while (idx < notes.length) {
				const n = notes[idx];
				if (n.column !== col) {
					idx++;
					continue;
				}

				if (n.hit) {
					this.nextNoteIndex[col] = ++idx;
					continue;
				}

				// LÓGICA DE NOTA LONGA NÃO SOLTA (HOLDING)
				// Se o tempo passou da janela de release e ele ainda está segurando
				if (n.holding && time > n.endTime + CONSTANTS.JUDGEMENT_WINDOWS.MISS) {
					n.holding = false;
					n.hit = true;
					// Comportamento solicitado: Acertou o head mas não soltou = GOOD
					onJudgement("GOOD", CONSTANTS.JUDGEMENT_WINDOWS.MISS);
					break;
				}

				// LÓGICA DE MISS (NUNCA INTERAGIU)
				if (
					!n.wasInteracted &&
					time > n.time + CONSTANTS.JUDGEMENT_WINDOWS.MISS
				) {
					n.wasInteracted = true;
					// Se for LN e ele perdeu o head, o corpo todo é MISS
					if (n.type === "HOLD") n.hit = true;
					onJudgement("MISS", 0);
				}

				// Limpeza de memória
				const exitTime = n.type === "TAP" ? n.time : n.endTime;
				if (time > exitTime + 1000) {
					n.hit = true;
					this.nextNoteIndex[col] = idx + 1;
				}
				break;
			}
		}
	}

	public reset() {
		this.nextNoteIndex.fill(0);
	}
}
