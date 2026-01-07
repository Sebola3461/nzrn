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
						target.note.isBroken = false; // Garante que não está quebrada ao iniciar
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
		// Encontra a nota que está sendo segurada nesta coluna
		const note = notes.find((n) => n.holding && n.column === col);

		if (note) {
			note.holding = false;

			const releaseError = time - note.endTime;
			const judge = JudgementManager.getJudgement(Math.abs(releaseError));

			// Se soltou cedo demais (Miss no release)
			if (judge === "MISS") {
				note.isBroken = true;
				// Nota: não marcamos note.hit = true aqui para que checkMisses
				// ou a lógica de limpeza cuide dela, ou marcamos se quiser que suma.
				note.hit = true;
			} else {
				note.hit = true;
				note.isBroken = false;
			}

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

				if (n.hit && !n.holding) {
					this.nextNoteIndex[col] = ++idx;
					continue;
				}

				// 1. LÓGICA DE NOTA LONGA NÃO SOLTA (Passou do fim segurando)
				if (n.holding && time > n.endTime + CONSTANTS.JUDGEMENT_WINDOWS.MISS) {
					n.holding = false;
					n.hit = true;
					n.isBroken = false; // Se ele segurou até o fim, não quebrou
					onJudgement("GOOD", CONSTANTS.JUDGEMENT_WINDOWS.MISS);
					break;
				}

				// 2. LÓGICA DE MISS (NUNCA INTERAGIU)
				if (
					!n.wasInteracted &&
					time > n.time + CONSTANTS.JUDGEMENT_WINDOWS.MISS
				) {
					n.wasInteracted = true;
					if (n.type === "HOLD") {
						n.isBroken = true; // Quebrou o head
						n.hit = false; // hit=false para ela continuar caindo escura
					} else {
						n.hit = true;
					}
					onJudgement("MISS", 0);
				}

				// Limpeza de memória e avanço de índice
				const exitTime = n.type === "TAP" ? n.time : n.endTime;
				if (time > exitTime + 1000) {
					// Se passou muito tempo, garantimos que o índice avance
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
