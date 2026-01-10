import { CONSTANTS } from "./Constants";

export class Score {
	private _currentScore = 0;
	private _currentCombo = 0;
	private _maxCombo = 0;
	private _hits = new Map<string, number>();

	private _totalNotesHit = 0;
	private _accumulatedWeight = 0;

	constructor() {
		this.reset();
	}

	public addHit(type: string) {
		// 1. Atualiza o contador de hits
		this._hits.set(type, (this._hits.get(type) || 0) + 1);
		this._totalNotesHit++;

		// 2. Tabela de Pesos para Precisão (Accuracy)
		// No osu!mania, Marvelous e Perfect valem o mesmo (100%),
		// mas alguns sistemas dão 1.05 ou similar. O padrão competitivo é 1.0.
		const accuracyWeights: Record<string, number> = {
			MARAVELOUS: 1.0,
			PERFECT: 1.0,
			GREAT: 0.6666, // Aproximadamente 2/3
			GOOD: 0.3333, // Aproximadamente 1/3
			MISS: 0.0,
		};

		this._accumulatedWeight += accuracyWeights[type] ?? 0;

		// 3. Lógica de Combo e Pontuação
		if (type !== "MISS") {
			this.addCombo();

			// Busca o valor numérico no seu arquivo de constantes
			// Ex: CONSTANTS.HIT_VALUE.MARAVELOUS = 320
			const hitValue =
				CONSTANTS.HIT_VALUE[type as keyof typeof CONSTANTS.HIT_VALUE] || 0;
			this._currentScore += hitValue;
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

	public get accuracy(): number {
		if (this._totalNotesHit === 0) return 100;
		// Limita a 100% caso use pesos maiores que 1.0
		const rawAcc = (this._accumulatedWeight / this._totalNotesHit) * 100;
		return Math.min(100, rawAcc);
	}

	// --- Getters ---

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
			MARAVELOUS: this._hits.get("MARAVELOUS") || 0,
			PERFECT: this._hits.get("PERFECT") || 0,
			GREAT: this._hits.get("GREAT") || 0,
			GOOD: this._hits.get("GOOD") || 0,
			MISS: this._hits.get("MISS") || 0,
		};
	}

	private reset() {
		this._hits.set("MARAVELOUS", 0);
		this._hits.set("PERFECT", 0);
		this._hits.set("GREAT", 0);
		this._hits.set("GOOD", 0);
		this._hits.set("MISS", 0);
	}
}
