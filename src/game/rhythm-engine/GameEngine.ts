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

	// --- Propriedades de Lógica de Alta Performance ---
	private targetLogicFPS: number = 1000;
	private isRunning: boolean = false;
	private logicChannel = new MessageChannel();
	private lastTickTime = performance.now();

	public static SHOULD_RENDER_TAIL = localStorage.getItem("renderTail") == "1";

	constructor(private app: PIXI.Application) {
		this.visuals = new VisualManager(app.stage, app, this.latencyMonitor);

		const savedKeys =
			localStorage.getItem("keybinds")?.split(",") || INITIAL_KEYS;
		const savedVolume = parseFloat(localStorage.getItem("volume") || "0.2");
		const savedOffset = localStorage.getItem("globalOffset");

		this.inputManager = new InputManager(CONSTANTS.TOTAL_COLUMNS, savedKeys);
		this.hitManager = new HitManager(CONSTANTS.TOTAL_COLUMNS);
		this.clock.setVolume(savedVolume);

		if (savedOffset) this.globalOffset = parseInt(savedOffset);
		this.hitBurst = new HitBurstRenderer(this.app.stage, this.app);

		this.setupInputListeners();

		// Configura o receptor do MessageChannel para o loop de lógica
		this.logicChannel.port1.onmessage = () => this.onLogicTick();

		// 1. Loop de Renderização (VSync / Monitor)
		this.app.ticker.add(this.renderUpdate, this);

		// 2. Inicia o loop de lógica ultra-rápido
		this.isRunning = true;
		this.scheduleLogicTick();
	}

	private setupInputListeners() {
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
				this.applyJudgement(
					releaseResult.judge,
					releaseResult.diff,
					releaseResult.note,
				);
			}
		});

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

	/**
	 * Gerencia o agendamento do próximo tick de lógica.
	 * MessageChannel não tem o delay de 4ms do setTimeout.
	 * Gambiarra de alto nivel pra dar bypass nos limites do navegador :fire:
	 */
	private scheduleLogicTick() {
		if (!this.isRunning) return;
		this.logicChannel.port2.postMessage(null);
	}

	private onLogicTick = () => {
		const now = performance.now();
		const delta = now - this.lastTickTime;

		// Limita o tick rate ao targetLogicFPS para não explodir o cpu
		if (delta >= 1000 / this.targetLogicFPS) {
			this.lastTickTime = now;
			if (this.state === "PLAYING") {
				this.logicStep();
			}
		}

		this.scheduleLogicTick();
	};

	private renderUpdate = () => {
		if (this.state !== "PLAYING" || !this.velocityManager) return;
		const time = this.getAdjustedTime();
		if (isNaN(time)) return;

		this.visuals.render(this.notes, time, this.velocityManager);
		this.hitBurst.update(this.notes);
		this.visuals.updateSubsystems();
	};

	private logicStep() {
		const time = this.getAdjustedTime();
		this.visuals.perf.recordLogicTick();

		const hitResults = this.hitManager.processInputHits(
			this.notes,
			time,
			(col) => this.inputManager.consumeInput(col),
		);

		hitResults.forEach((res) => {
			this.applyJudgement(res.judge, res.diff, res.note);
			if (res.type === "MISS") this.currentScore.comboBreak();
		});

		this.hitManager.update(this.notes, time, (res) => {
			this.applyJudgement(res.judge, res.diff, res.note);
			if (res.type === "MISS") this.currentScore.comboBreak();
		});
	}

	private applyJudgement(type: string, errorMs: number, note?: HitObject) {
		const color = JudgementManager.getJudgementColor(type);
		this.visuals.showJudgement(type);
		this.currentScore.addHit(type);

		if (type !== "MISS") {
			this.visuals.addURTick(errorMs, color);
			if (note) {
				this.hitBurst.trigger(note.column, note.type === "HOLD");
			}
		}
		this.events.emit("hit");
	}

	// --- Controles e Getters ---

	public setTargetFPS(fps: number) {
		this.targetLogicFPS = Math.max(60, Math.min(1000, fps));
	}

	public setOffset(ms: number) {
		this.globalOffset = ms;
		localStorage.setItem("globalOffset", ms.toString());
	}

	public changeScrollSpeed(delta: number) {
		const speed = Math.max(0.1, Math.min(4, this.visuals.scrollSpeed + delta));
		this.visuals.changeScrollSpeed(speed);
		localStorage.setItem("scrollSpeed", speed.toString());
	}

	public changeShouldRenderTail(should: boolean) {
		console.log(should);
		GameEngine.SHOULD_RENDER_TAIL = should;
		localStorage["renderTail"] = String(should ? "1" : "0");
	}

	public async init(map: string, audio: string) {
		await this.visuals.judge.loadAssets();
		this.rawMapData = map;
		this.notes = MapParser.parse(map, 4, this.globalOffset);
		this.velocityManager = new VelocityManager(
			MapParser.parseTimingPoints(map, this.globalOffset),
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
		this.inputManager.clearQueue();

		this.notes = MapParser.parse(this.rawMapData, 4, this.globalOffset);
		this.velocityManager = new VelocityManager(
			MapParser.parseTimingPoints(this.rawMapData, this.globalOffset),
		);

		this.events.emit("restart");
		this.start();
	}

	private getAdjustedTime(): number {
		return this.clock.getTime();
	}

	public destroy() {
		this.isRunning = false;
		this.state = "IDLE";
		this.clock.fullStop();
		this.inputManager.destroy();
		this.events.removeAllListeners();
		this.visuals.clearAll();
		this.logicChannel.port1.onmessage = null;
		this.resume();
	}
}
