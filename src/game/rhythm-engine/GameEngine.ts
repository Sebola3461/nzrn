import * as PIXI from "pixi.js";
import { AudioClock } from "./AudioClock";
import { VisualManager } from "./Visuals";
import { MapParser, HitObject } from "./MapParser";
import { CONSTANTS, INITIAL_KEYS } from "./Constants";
import { Score } from "./Score";
import { VelocityManager } from "./VelocityManager";
import { InputManager } from "./InputManager";
import { HitManager } from "./HitManager";
import { LatencyMonitor } from "./LatencyMonitor";
import { JudgementManager } from "./JudgementManager";
import { HitBurstRenderer } from "./UI/HitBurstRenderer";

export class GameEngine {
	public readonly clock = new AudioClock();
	public readonly visuals: VisualManager;
	public readonly inputManager: InputManager;
	private hitManager: HitManager;
	private notes: HitObject[] = [];
	private velocityManager!: VelocityManager;
	private state: "IDLE" | "PLAYING" | "PAUSED" = "IDLE";
	private rawMapData: string = "";
	public currentScore = new Score();
	public globalOffset: number = 0;
	private latencyMonitor = new LatencyMonitor();
	public readonly events = new PIXI.EventEmitter();
	private hitBurst: HitBurstRenderer;

	constructor(private app: PIXI.Application) {
		// Inicializa o Hub Visual que agora contém os submódulos (NoteRenderer, URBar, etc)
		this.visuals = new VisualManager(app.stage, app, this.latencyMonitor);

		const savedKeys =
			localStorage.getItem("keybinds")?.split(",") || INITIAL_KEYS;
		this.inputManager = new InputManager(CONSTANTS.TOTAL_COLUMNS, savedKeys);
		this.hitManager = new HitManager(CONSTANTS.TOTAL_COLUMNS);

		this.setupInputListeners();

		this.app.ticker.add(this.update, this);

		const savedOffset = localStorage.getItem("globalOffset");
		if (savedOffset) {
			this.globalOffset = parseInt(savedOffset);
		}

		this.hitBurst = new HitBurstRenderer(this.app.stage, this.app);
	}

	private setupInputListeners() {
		// Encapsulamos as chamadas visuais no método unificado onKeyPress
		this.inputManager.events.on("keyDown", (col: number) => {
			this.visuals.onKeyPress(col, true);
		});

		this.inputManager.events.on("keyUp", (col: number) => {
			this.visuals.onKeyPress(col, false);

			const releaseResult = this.hitManager.processRelease(
				this.notes,
				col,
				this.getAdjustedTime(),
			);

			if (releaseResult) {
				this.applyJudgement(releaseResult.judge, releaseResult.diff);
			}
		});

		// Listeners de controle permanecem iguais
		this.inputManager.events.on("restart", () => this.restart());
		this.inputManager.events.on("pauseToggle", () =>
			this.state === "PLAYING" ? this.pause() : this.resume(),
		);
		this.inputManager.events.on("offsetChange", (delta: number) =>
			this.setOffset(this.globalOffset + delta),
		);
		this.inputManager.events.on("speedChange", (delta: number) =>
			this.changeScrollSpeed(delta),
		);
	}

	private update = () => {
		if (this.state !== "PLAYING" || !this.velocityManager) return;

		const time = this.getAdjustedTime();
		if (isNaN(time)) return;

		// 1. Processamento de Hits
		const hitResults = this.hitManager.processInputHits(
			this.notes,
			time,
			(col) => this.inputManager.consumeInput(col), // Função que consome buffer
		);

		hitResults.forEach((res) => {
			this.applyJudgement(res.judge, res.diff, res.note);
			if (res.type === "MISS") this.currentScore.comboBreak(); // Exemplo
		});
		// Passamos a nota para o applyJudgement
		hitResults.forEach((res) =>
			this.applyJudgement(res.judge, res.diff, res.note),
		);

		// 2. Renderização
		this.visuals.render(this.notes, time, this.velocityManager);

		// 2.1 Update do Burst (estilo Beatmania)
		this.hitBurst.update(this.notes);

		// 3. Verificação de Misses
		this.hitManager.update(this.notes, time, (res) => {
			this.applyJudgement(res.judge, res.diff, res.note);
		});
	};

	private applyJudgement(type: string, errorMs: number, note?: HitObject) {
		const color = JudgementManager.getJudgementColor(type);
		this.visuals.showJudgement(type, color);
		this.currentScore.addHit(type);

		if (type !== "MISS") {
			this.visuals.addURTick(errorMs, color);

			// DISPARO DO BURST
			if (note) {
				// Se for HOLD, trigger como LN (brilho contínuo), senão burst comum
				this.hitBurst.trigger(note.column, note.type === "HOLD");
			}
		}

		this.events.emit("hit");
	}

	public setOffset(ms: number) {
		this.globalOffset = ms;
		localStorage.setItem("globalOffset", ms.toString());
		this.visuals.showJudgement(`OFFSET: ${ms}ms`, 0xffffff, 50);
	}

	public changeScrollSpeed(delta: number) {
		const speed = Math.max(0.1, Math.min(4, this.visuals.scrollSpeed + delta));
		this.visuals.changeScrollSpeed(speed);
		localStorage.setItem("scrollSpeed", speed.toString());

		this.visuals.showJudgement(
			`SPEED: ${this.visuals.scrollSpeed.toFixed(2)}x`,
			0xffffff,
			50,
		);
	}

	// --- CONTROLE DE ESTADO ---

	public async init(map: string, audio: string) {
		this.rawMapData = map;
		this.notes = MapParser.parse(map);
		this.velocityManager = new VelocityManager(
			MapParser.parseTimingPoints(map),
		);
		await this.clock.load(audio);
		this.events.emit("init");
	}

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
		this.hitBurst.clear();
		this.clock.fullStop();
		this.visuals.clearAll();
		this.currentScore = new Score();
		this.hitManager.reset();

		this.notes = MapParser.parse(this.rawMapData);
		this.velocityManager = new VelocityManager(
			MapParser.parseTimingPoints(this.rawMapData),
		);

		this.events.emit("restart");
		this.start();
	}

	private getAdjustedTime(): number {
		return this.clock.getTime() + this.globalOffset;
	}

	public destroy() {
		this.state = "IDLE";
		this.clock.fullStop();
		this.inputManager.destroy();
		this.events.removeAllListeners();
		this.visuals.clearAll();
	}
}
