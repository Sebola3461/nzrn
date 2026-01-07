import { HitObject } from "./MapParser";
import { CONSTANTS } from "./Constants";
import { JudgementManager } from "./JudgementManager";

export interface HitResult {
	note: HitObject;
	judge: string;
	diff: number;
	type: "HIT" | "RELEASE" | "MISS" | "HOLD_BREAK";
}

export class HitManager {
	private nextNoteIndex: number[];

	constructor(private totalColumns: number) {
		this.nextNoteIndex = new Array(totalColumns).fill(0);
	}

	/**
	 * Processa o input de PRESSIONAR tecla (Down).
	 */
	public processInputHits(
		notes: HitObject[],
		time: number,
		consumeInput: (col: number) => boolean,
	): HitResult[] {
		const results: HitResult[] = [];

		for (let col = 0; col < this.totalColumns; col++) {
			if (!consumeInput(col)) continue;

			const startIndex = this.nextNoteIndex[col];
			let targetNote: HitObject | null = null;

			// Otimização: check nas próximas 10 notas
			for (
				let i = startIndex;
				i < Math.min(startIndex + 10, notes.length);
				i++
			) {
				const n = notes[i];
				if (n.column !== col) continue;

				// CRUCIAL: Pula se já foi hitada OU se já foi processada como Miss
				if (n.hit || n.wasInteracted) continue;

				// Stop condition: Nota muito no futuro
				if (n.time > time + CONSTANTS.JUDGEMENT_WINDOWS.MISS) break;

				const diff = n.time - time;
				if (Math.abs(diff) <= CONSTANTS.JUDGEMENT_WINDOWS.MISS) {
					targetNote = n;
					break;
				}
			}

			if (targetNote) {
				const diff = time - targetNote.time;
				const judge = JudgementManager.getJudgement(Math.abs(diff));

				targetNote.wasInteracted = true; // Marcamos que interagimos

				if (targetNote.type === "TAP") {
					// AQUI SIM: O jogador acertou
					targetNote.hit = true;
				} else {
					// Lógica de LN Head
					if (judge !== "MISS") {
						targetNote.holding = true;
						targetNote.isBroken = false;
						targetNote.hit = true; // Head acertada
					} else {
						// Miss no head = LN quebrada
						targetNote.isBroken = true;
						targetNote.hit = false; // NÃO foi hitada, foi um erro
						targetNote.holding = false;
					}
				}

				results.push({ note: targetNote, judge, diff, type: "HIT" });
			}
		}

		return results;
	}

	/**
	 * Processa o input de SOLTAR tecla (Up).
	 */
	public processRelease(
		notes: HitObject[],
		col: number,
		time: number,
	): HitResult | null {
		const note = notes.find((n) => n.column === col && n.holding); // Removemos !n.hit pois a head já foi hitada

		if (note) {
			note.holding = false;
			const releaseDiff = time - note.endTime;
			const absDiff = Math.abs(releaseDiff);

			// Lógica Osu/Etterna: Soltar muito cedo é erro
			if (absDiff > CONSTANTS.JUDGEMENT_WINDOWS.MISS && time < note.endTime) {
				note.isBroken = true;
				// Note que aqui NÃO mudamos note.hit para false, pois a "head" já foi hitada anteriormente.
				// A penalidade vem no judgement "MISS" ou "BREAK" que reseta o combo.
				return { note, judge: "MISS", diff: releaseDiff, type: "HOLD_BREAK" };
			}

			// Release válido (mesmo que seja Poor/Good)
			return {
				note,
				judge: JudgementManager.getJudgement(absDiff),
				diff: releaseDiff,
				type: "RELEASE",
			};
		}
		return null;
	}

	/**
	 * Loop de manutenção (Miss Check & Garbage Collection)
	 */
	public update(
		notes: HitObject[],
		time: number,
		onJudgement: (res: HitResult) => void,
	) {
		for (let col = 0; col < this.totalColumns; col++) {
			let idx = this.nextNoteIndex[col];
			let checks = 0;

			while (idx < notes.length && checks < 50) {
				checks++;
				const n = notes[idx];

				if (n.column !== col) {
					idx++;
					continue;
				}

				// -------------------------------------------------------------
				// 1. PULAR PROCESSADOS
				// -------------------------------------------------------------
				// Se já foi acertada e não estamos segurando (release feito ou tap)
				// OU se já foi julgada como Miss (wasInteracted = true e hit = false)
				if ((n.hit || n.wasInteracted) && !n.holding) {
					this.nextNoteIndex[col] = idx + 1;
					idx++;
					continue;
				}

				// -------------------------------------------------------------
				// 2. AUTO-RELEASE (Segurou até o fim)
				// -------------------------------------------------------------
				if (n.holding) {
					if (time > n.endTime + CONSTANTS.JUDGEMENT_WINDOWS.GOOD) {
						n.holding = false;
						// Não mudamos n.hit aqui, pois a head já foi true.
						// Apenas emitimos o evento de sucesso no release.
						onJudgement({
							note: n,
							judge: "PERFECT",
							diff: 0,
							type: "RELEASE",
						});
					}
					break;
				}

				// -------------------------------------------------------------
				// 3. DETECÇÃO DE MISS (Timeout)
				// -------------------------------------------------------------
				if (!n.wasInteracted) {
					// Se ainda não tocamos nela
					if (time > n.time + CONSTANTS.JUDGEMENT_WINDOWS.MISS) {
						n.wasInteracted = true; // Marcamos como processada
						n.hit = false; // GARANTE que é false (Miss)

						if (n.type === "HOLD") {
							n.isBroken = true;
						}

						onJudgement({ note: n, judge: "MISS", diff: 0, type: "MISS" });

						// Avança índice pois essa nota já era
						this.nextNoteIndex[col] = idx + 1;
					} else {
						// Nota válida ainda, para loop
						break;
					}
				}

				// -------------------------------------------------------------
				// 4. GARBAGE COLLECTION DE SEGURANÇA
				// -------------------------------------------------------------
				const exitTime = n.type === "TAP" ? n.time : n.endTime;
				if (time > exitTime + 2000) {
					// Apenas avança o índice, sem alterar status de hit/score
					this.nextNoteIndex[col] = idx + 1;
				}

				idx++;
			}
		}
	}

	public reset() {
		this.nextNoteIndex.fill(0);
	}
}
