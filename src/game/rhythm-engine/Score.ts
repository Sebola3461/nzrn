import { CONSTANTS } from "./Constants";

export class Score {
	private _currentScore = 0;
	private _currentCombo = 0;
	private _maxCombo = 0;
	private _hits = new Map<string, number>();

	// Propriedades para cálculo em tempo real
	private _totalNotesHit = 0;
	private _accumulatedWeight = 0;

	constructor() {
		this._hits.set("PERFECT", 0);
		this._hits.set("GREAT", 0);
		this._hits.set("GOOD", 0);
		this._hits.set("MISS", 0);
	}

	public addHit(type: string) {
		// 1. Atualiza o contador de hits específico
		this._hits.set(type, (this._hits.get(type) || 0) + 1);

		// 2. Incrementa o total de notas processadas
		this._totalNotesHit++;

		// 3. Adiciona o peso baseado no julgamento
		const weights: Record<string, number> = {
			PERFECT: 1.0,
			GREAT: 0.65,
			GOOD: 0.35,
			MISS: 0.0,
		};
		this._accumulatedWeight += weights[type] ?? 0;

		// 4. Lógica de Combo
		if (type !== "MISS") {
			this.addCombo();
			this._currentScore +=
				CONSTANTS.HIT_VALUE[type as keyof typeof CONSTANTS.HIT_VALUE];
		} else {
			this.comboBreak();
		}
	}

	public addCombo() {
		this._currentCombo++;
		if (this._currentCombo > this._maxCombo) {
			this._maxCombo = this._currentCombo;
		}
	}

	public comboBreak() {
		this._currentCombo = 0;
	}

	// Getter para Accuracy em tempo real
	public get accuracy(): number {
		if (this._totalNotesHit === 0) return 100;
		return (this._accumulatedWeight / this._totalNotesHit) * 100;
	}

	// Getter para Rank
	public get rank(): string {
		const acc = this.accuracy;
		if (acc === 100) return "SS";
		if (acc > 95) return "S";
		if (acc > 90) return "A";
		if (acc > 80) return "B";
		if (acc > 70) return "C";
		return "D";
	}

	public get score() {
		return this._currentScore;
	}
	public get combo() {
		return this._currentCombo;
	}
	public get maxCombo() {
		return this._maxCombo;
	}
	public get hits() {
		return {
			PERFECT: this._hits.get("PERFECT") || 0,
			GREAT: this._hits.get("GREAT") || 0,
			GOOD: this._hits.get("GOOD") || 0,
			MISS: this._hits.get("MISS") || 0,
		};
	}
}
