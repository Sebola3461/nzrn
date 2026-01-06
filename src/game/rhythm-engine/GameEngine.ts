import * as PIXI from "pixi.js";
import { AudioClock } from "./AudioClock";
import { VisualManager } from "./Visuals";
import { MapParser, HitObject } from "./MapParser";
import { CONSTANTS, INITIAL_KEYS } from "./Constants";
import { Score } from "./Score";
import { VelocityManager } from "./VelocityManager";
import { InputManager } from "./InputManager";
import { JudgementManager } from "./JudgementManager";
import { HitManager } from "./HitManager";

export class GameEngine {
	public readonly clock = new AudioClock();
	private visuals: VisualManager;
	public readonly inputManager: InputManager;
	private hitManager: HitManager;
	private notes: HitObject[] = [];
	private velocityManager!: VelocityManager;
	private state: "IDLE" | "PLAYING" | "PAUSED" = "IDLE";
	private rawMapData: string = "";
	public currentScore = new Score();
	private currentSpeed: number = 0.8;
	public globalOffset: number = 0;
	public readonly events = new PIXI.EventEmitter();

	constructor(private app: PIXI.Application) {
		this.visuals = new VisualManager(app.stage, app);

		const savedKeys =
			localStorage.getItem("keybinds")?.split(",") || INITIAL_KEYS;
		this.inputManager = new InputManager(CONSTANTS.TOTAL_COLUMNS, savedKeys);

		// Inicializa o gerenciador de hits
		this.hitManager = new HitManager(CONSTANTS.TOTAL_COLUMNS);

		this.setupInputListeners();
		this.loadPersistence();

		this.app.ticker.add(this.update, this);
	}

	public getScore() {
		return this.currentScore;
	}

	private setupInputListeners() {
		this.inputManager.events.on("keyDown", (col: number) => {
			this.visuals.setReceptorState(col, true);
			this.visuals.showLightning(col);
		});

		this.inputManager.events.on("keyUp", (col: number) => {
			this.visuals.setReceptorState(col, false);
			this.visuals.stopLightning(col);

			// Delegamos o release para o HitManager
			const releaseResult = this.hitManager.processRelease(
				this.notes,
				col,
				this.getAdjustedTime(),
			);

			if (releaseResult) {
				this.applyJudgement(releaseResult.judge, releaseResult.diff);
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

	private loadPersistence() {
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

	private getAdjustedTime(): number {
		return this.clock.getTime() + this.globalOffset;
	}

	private update = () => {
		if (this.state !== "PLAYING" || !this.velocityManager) return;

		const time = this.getAdjustedTime();
		if (isNaN(time)) return;

		// 1. Delegar processamento de hits (KeyDown/Buffer)
		const hitResults = this.hitManager.processInputHits(
			this.notes,
			time,
			(col) => this.inputManager.consumeInput(col),
		);

		hitResults.forEach((res) => this.applyJudgement(res.judge, res.diff));

		// 2. Renderização
		this.visuals.render(this.notes, time, this.velocityManager);

		// 3. Delegar verificação de Misses e limpeza de memória
		this.hitManager.checkMisses(this.notes, time, (judge, diff) => {
			this.applyJudgement(judge, diff);
		});
	};

	private applyJudgement(type: string, errorMs: number) {
		const color = JudgementManager.getJudgementColor(type);
		this.visuals.showJudgement(type, color);
		this.currentScore.addHit(type);

		if (type !== "MISS") {
			this.visuals.addURTick(errorMs, color);
		}
		this.events.emit("hit");
	}

	// --- GETTERS E SETTERS ---
	public getOffset() {
		return this.globalOffset;
	}
	public setOffset(ms: number) {
		this.globalOffset = ms;
		localStorage.setItem("globalOffset", ms.toString());
		this.visuals.showJudgement(`OFFSET: ${ms}ms`, 0xffffff, 50);
	}

	public getScrollSpeed() {
		return this.currentSpeed;
	}
	public changeScrollSpeed(delta: number) {
		this.currentSpeed = Math.max(0.1, Math.min(4, this.currentSpeed + delta));
		this.visuals.setScrollSpeed(this.currentSpeed);
		localStorage.setItem("scrollSpeed", this.currentSpeed.toString());
		this.visuals.showJudgement(
			`SPEED: ${this.currentSpeed.toFixed(2)}x`,
			0xffffff,
			50,
		);
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
		this.hitManager.reset(); // Importante resetar os ponteiros

		this.notes = MapParser.parse(this.rawMapData);
		this.velocityManager = new VelocityManager(
			MapParser.parseTimingPoints(this.rawMapData),
		);

		this.events.emit("restart");
		this.start();
	}

	public async init(map: string, audio: string) {
		this.rawMapData = map;
		this.notes = MapParser.parse(map);
		this.velocityManager = new VelocityManager(
			MapParser.parseTimingPoints(map),
		);
		await this.clock.load(audio);
		this.events.emit("init");
	}

	public destroy() {
		this.state = "IDLE";
		this.clock.fullStop();
		this.inputManager.destroy();
		this.events.removeAllListeners();
		this.visuals.clearAll();
		this.notes = [];
	}
}
