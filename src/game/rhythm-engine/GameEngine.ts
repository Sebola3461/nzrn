import { AudioClock } from "./AudioClock";
import { VisualManager } from "./Visuals";
import { MapParser, HitObject } from "./MapParser";
import { CONSTANTS, INITIAL_KEYS } from "./Constants";
import { Score } from "./Score";
import { EventEmitter } from "pixi.js";
import { VelocityManager } from "./VelocityManager";

export class GameEngine {
	public readonly clock = new AudioClock();
	private visuals: VisualManager;
	private notes: HitObject[] = [];
	private velocityManager!: VelocityManager;
	private state: "IDLE" | "PLAYING" | "PAUSED" = "IDLE";
	private rawMapData: string = "";
	public currentScore = new Score();
	private currentSpeed: number = 0.8;
	public globalOffset: number = 0;
	private keyMapping: Map<string, number> = new Map();
	public readonly events = new EventEmitter();

	// --- OTIMIZAÇÕES DE PERFORMANCE ---
	// Buffer de input: registra a intenção de clique para processar no início do frame
	private inputBuffer: boolean[] = [];
	// Ponteiros: guarda o índice da última nota processada por coluna (evita loops gigantes)
	private nextNoteIndex: number[] = [];

	constructor(private app: any) {
		this.visuals = new VisualManager(app.stage, app);
		this.setupKeys(
			localStorage.getItem("keybinds")?.split(",") || INITIAL_KEYS,
		);

		// Inicializa arrays de suporte
		this.inputBuffer = new Array(CONSTANTS.TOTAL_COLUMNS).fill(false);
		this.nextNoteIndex = new Array(CONSTANTS.TOTAL_COLUMNS).fill(0);

		this.app.ticker.add(this.update, this);
		window.addEventListener("keydown", this.handleKeyDown);
		window.addEventListener("keyup", this.handleKeyUp);

		// Carregar persistência
		const savedSpeed = localStorage.getItem("scrollSpeed");
		if (savedSpeed) {
			this.currentSpeed = parseFloat(savedSpeed);
			this.visuals.setScrollSpeed(this.currentSpeed);
		}
		const savedOffset = localStorage.getItem("globalOffset");
		if (savedOffset) {
			this.globalOffset = parseInt(savedOffset);
		}
	}

	public getSv() {
		return this.currentSpeed;
	}

	public getOffset() {
		return this.globalOffset;
	}

	// --- TEMPO E OFFSET ---
	private getAdjustedTime(): number {
		// O tempo real do jogo é o áudio + correção manual do jogador
		return this.clock.getTime() + this.globalOffset;
	}

	public setOffset(ms: number) {
		this.globalOffset = ms;
		localStorage.setItem("globalOffset", ms.toString());
		this.visuals.showJudgement(`OFFSET: ${ms}ms`, 0xffffff, 50);
	}

	// --- CONTROLE DE ESTADO ---
	public start() {
		if (this.state === "PAUSED") return this.resume();
		this.state = "PLAYING";
		this.clock.play();
		this.events.emit("started");
	}

	public pause() {
		if (this.state === "PLAYING") {
			this.state = "PAUSED";
			this.clock.stop();
			this.events.emit("pause");
		}
	}

	public resume() {
		if (this.state === "PAUSED") {
			this.state = "PLAYING";
			this.clock.play();
			this.events.emit("resume");
		}
	}

	public async restart() {
		this.state = "IDLE";
		this.clock.fullStop();
		this.visuals.clearAll();
		this.currentScore = new Score();
		this.setupKeys(
			localStorage.getItem("keybinds")?.split(",") || INITIAL_KEYS,
		);

		// Reset de lógica e dados
		this.notes = MapParser.parse(this.rawMapData);
		this.velocityManager = new VelocityManager(
			MapParser.parseTimingPoints(this.rawMapData),
		);
		this.nextNoteIndex.fill(0);
		this.inputBuffer.fill(false);

		this.events.emit("restart");
		this.start();
	}

	// --- LOOP PRINCIPAL (TICKER) ---
	private update = () => {
		if (this.state !== "PLAYING" || !this.velocityManager) return;

		const time = this.getAdjustedTime();
		if (isNaN(time)) return;

		// 1. Processar inputs antes de renderizar (baixa latência)
		this.processBufferedInputs(time);

		// 2. Renderizar notas
		try {
			this.visuals.render(this.notes, time, this.velocityManager);
		} catch (e) {
			console.error("Erro na renderização:", e);
			this.state = "PAUSED";
			return;
		}

		// 3. Verificar Notas Perdidas (Miss) e Limpeza
		for (let col = 0; col < CONSTANTS.TOTAL_COLUMNS; col++) {
			let idx = this.nextNoteIndex[col];
			while (idx < this.notes.length) {
				const n = this.notes[idx];
				if (n.column !== col) {
					idx++;
					continue;
				}
				if (n.hit) {
					idx++;
					this.nextNoteIndex[col] = idx;
					continue;
				}

				// Se passou da janela de acerto
				if (
					!n.wasInteracted &&
					time > n.time + CONSTANTS.JUDGEMENT_WINDOWS.MISS
				) {
					n.wasInteracted = true;
					this.applyJudgement("MISS", 0);
				}

				// Remove nota da memória visual após 1s de passar do receptor
				const exitTime = n.type === "TAP" ? n.time : n.endTime;
				if (time > exitTime + 1000) {
					n.hit = true;
					this.nextNoteIndex[col] = idx + 1;
				}
				break; // Processamos apenas a nota mais antiga de cada coluna
			}
		}
	};

	// --- LÓGICA DE HIT ---
	private processBufferedInputs(time: number) {
		for (let col = 0; col < this.inputBuffer.length; col++) {
			if (this.inputBuffer[col]) {
				this.inputBuffer[col] = false; // Consome o input do buffer

				for (let i = this.nextNoteIndex[col]; i < this.notes.length; i++) {
					const n = this.notes[i];
					if (n.column !== col || n.hit) continue;

					const diff = time - n.time;
					const absDiff = Math.abs(diff);

					if (absDiff < CONSTANTS.JUDGEMENT_WINDOWS.MISS) {
						const judge = this.calcJudge(absDiff);
						if (n.type === "TAP") {
							n.hit = true;
						} else {
							n.holding = true;
							n.wasInteracted = true;
						}
						this.applyJudgement(judge, diff, col);
						break;
					}
					if (n.time > time + CONSTANTS.JUDGEMENT_WINDOWS.MISS) break;
				}
			}
		}
	}

	private handleKeyDown = (e: KeyboardEvent) => {
		const key = e.key.toLowerCase();

		// Atalhos de UI
		if (key === "dead") return this.restart();
		if (key === "p" || key === "escape")
			return this.state === "PLAYING" ? this.pause() : this.resume();
		if (key === "[") return this.setOffset(this.globalOffset - 5);
		if (key === "]") return this.setOffset(this.globalOffset + 5);
		if (key === "f3" || key === "-") {
			e.preventDefault();
			return this.changeSpeed(-0.05);
		}
		if (key === "f4" || key === "=") {
			e.preventDefault();
			return this.changeSpeed(0.05);
		}

		const col = this.keyMapping.get(key);
		if (col === undefined || this.state !== "PLAYING" || e.repeat) return;

		// Feedback visual imediato
		this.visuals.setReceptorState(col, true);
		this.visuals.showLightning(col);

		// Registra o input para o Ticker
		this.inputBuffer[col] = true;
	};

	private handleKeyUp = (e: KeyboardEvent) => {
		const col = this.keyMapping.get(e.key.toLowerCase());
		if (col === undefined) return;

		this.visuals.setReceptorState(col, false);
		this.visuals.stopLightning(col);

		if (this.state !== "PLAYING") return;

		const time = this.getAdjustedTime();
		// Lógica de soltar Long Note
		const note = this.notes.find((n) => n.holding && n.column === col);
		if (note) {
			note.hit = true;
			note.holding = false;
			const errorMs = time - note.endTime;
			this.applyJudgement(this.calcJudge(Math.abs(errorMs)), errorMs, col);
		}
	};

	// --- UTILITÁRIOS ---
	private calcJudge(d: number) {
		if (d < CONSTANTS.JUDGEMENT_WINDOWS.PERFECT) return "PERFECT";
		if (d < CONSTANTS.JUDGEMENT_WINDOWS.GREAT) return "GREAT";
		if (d < CONSTANTS.JUDGEMENT_WINDOWS.GOOD) return "GOOD";
		return "MISS";
	}

	private applyJudgement(type: string, errorMs: number, _column?: number) {
		const colors: any = {
			PERFECT: "#FFFF00",
			GREAT: "#4DFF4D",
			GOOD: "#1A75FF",
			MISS: "#FF0033	",
		};
		this.visuals.showJudgement(type, colors[type]);
		this.currentScore.addHit(type);

		if (type !== "MISS") {
			this.visuals.addURTick(errorMs, colors[type]);
		}
		this.events.emit("hit");
	}

	public changeSpeed(delta: number) {
		this.currentSpeed = Math.max(0.1, Math.min(4, this.currentSpeed + delta));
		this.visuals.setScrollSpeed(this.currentSpeed);
		localStorage.setItem("scrollSpeed", this.currentSpeed.toString());
		this.visuals.showJudgement(
			`SPEED: ${this.currentSpeed.toFixed(2)}x`,
			0xffffff,
			50,
		);
	}

	public getScore() {
		return this.currentScore;
	}

	async init(map: string, audio: string) {
		this.rawMapData = map;
		this.notes = MapParser.parse(map);
		this.velocityManager = new VelocityManager(
			MapParser.parseTimingPoints(map),
		);
		await this.clock.load(audio);
		this.events.emit("init");
	}

	public setupKeys(keys: string[]) {
		this.keyMapping.clear();
		keys.forEach((k, i) => this.keyMapping.set(k.toLowerCase(), i));
	}

	public destroy() {
		// 1. Para o áudio e reseta o tempo
		this.state = "IDLE";
		this.clock.stop();
		this.clock.fullStop();

		// 2. Remove listeners de teclado para evitar duplicidade ao re-inicializar
		window.removeEventListener("keydown", this.handleKeyDown);
		window.removeEventListener("keyup", this.handleKeyUp);

		// 3. Limpa todos os eventos emitidos (importante para não vazar memória de UI)
		this.events.removeAllListeners();

		// 4. Limpa o VisualManager (remove notas da tela e containers de efeitos)
		// Você deve implementar esse método no VisualManager para dar .removeChildren()
		this.visuals.clearAll();

		// 5. Reseta o estado lógico da Engine
		this.notes = [];
		this.rawMapData = "";
		this.currentScore = new Score();

		// 6. Reseta os ponteiros de performance e buffers
		this.nextNoteIndex.fill(0);
		this.inputBuffer.fill(false);
		this.keyMapping.clear();
	}
}
