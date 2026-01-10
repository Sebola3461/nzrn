export const CONSTANTS = {
	COLUMN_WIDTH: 70,
	// 0.8 = 80% da altura da tela de cima para baixo
	HIT_POSITION_RATIO: 0.89,
	TOTAL_COLUMNS: 4,

	NOTE_SPEED: 0.6,
	DEFAULT_NOTE_SPEED: 0.8,
	LEAD_IN_TIME: 2000,

	BURST_SCALE: 1,

	JUDGEMENT_WINDOWS: {
		MARAVELOUS: 16,
		PERFECT: 64 - 3 * 6,
		GREAT: 97 - 3 * 6,
		GOOD: 127 - 3 * 6,
		MISS: 151 - 3 * 6,
	},

	HIT_VALUE: {
		MARAVELOUS: 320,
		PERFECT: 300,
		GREAT: 200,
		GOOD: 100,
		MISS: 0,
	},
};

// Keybinds iniciais padrão
export const INITIAL_KEYS = ["d", "f", "j", "k"];
