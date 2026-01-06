import { AudioClock } from "./AudioClock";
import { VisualManager } from "./Visuals";
import { MapParser, HitObject } from "./MapParser";
import { CONSTANTS, INITIAL_KEYS } from "./Constants";
import { Score } from "./Score";
import { EventEmitter } from "pixi.js";
import { VelocityManager } from "./VelocityManager";

export class GameEngine {
	private clock = new AudioClock();
	private visuals: VisualManager;
	private notes: HitObject[] = [];
	private velocityManager!: VelocityManager;
	private state: "IDLE" | "PLAYING" | "PAUSED" = "IDLE";
	private rawMapData: string = "";
	private currentScore = new Score();
	private currentSpeed: number = 0.8;
	private keyMapping: Map<string, number> = new Map();
	public readonly events = new EventEmitter();

	constructor(private app: any) {
		this.visuals = new VisualManager(app.stage, app);
		this.setupKeys(INITIAL_KEYS);
		this.app.ticker.add(this.update, this);
		window.addEventListener("keydown", this.handleKeyDown);
		window.addEventListener("keyup", this.handleKeyUp);

		const saved = localStorage.getItem("scrollSpeed");
		if (saved) {
			this.currentSpeed = parseFloat(saved);
			this.visuals.setScrollSpeed(this.currentSpeed);
		}
	}

	public getScore() {
		return this.currentScore;
	}

	public start() {
		if (this.state === "PAUSED") return this.resume();
		this.state = "PLAYING";
		this.clock.play();
		this.events.emit("started");
		this.events.emit("init");
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
		// 1. Para tudo imediatamente
		this.state = "IDLE";
		this.clock.fullStop();

		// 2. Limpa o estado visual e de pontuação
		this.visuals.clearAll();
		this.currentScore = new Score();

		// 3. Reparsar o mapa garante que as notas voltem ao estado original (hit = false, etc)
		this.notes = MapParser.parse(this.rawMapData);

		// 4. IMPORTANTE: Resetar o VelocityManager se ele guardar algum estado interno
		this.velocityManager = new VelocityManager(
			MapParser.parseTimingPoints(this.rawMapData),
		);

		// 7. Inicia o jogo novamente

		this.events.emit("restart");

		this.start();
	}

	public changeSpeed(delta: number) {
		this.currentSpeed = Math.max(0.1, Math.min(4, this.currentSpeed + delta));
		this.visuals.setScrollSpeed(this.currentSpeed);
		localStorage.setItem("scrollSpeed", this.currentSpeed.toString());
		this.visuals.showJudgement(
			`SPEED: ${this.currentSpeed.toFixed(2)}x`,
			0xffffff,
		);
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

	private update = () => {
		// 1. Verificação de segurança: Se o estado não for PLAYING, não faz nada
		if (this.state !== "PLAYING" || !this.velocityManager) return;

		// 2. Garante que o tempo é um número válido
		const time = this.clock.getTime();
		if (typeof time !== "number" || isNaN(time)) return;

		// 3. Renderização
		try {
			this.visuals.render(this.notes, time, this.velocityManager);
		} catch (e) {
			console.error("Erro na renderização:", e);
			this.state = "PAUSED"; // Pausa para não crashar o navegador
			return;
		}

		// 4. Lógica de notas (Loop otimizado)
		// Em vez de usar .find ou .filter todo frame, percorremos as notas
		for (let i = 0; i < this.notes.length; i++) {
			const n = this.notes[i];

			// Pula notas já processadas
			if (n.hit) continue;

			// MISS: Se o tempo atual passou da janela de acerto
			if (
				!n.wasInteracted &&
				time > n.time + CONSTANTS.JUDGEMENT_WINDOWS.MISS
			) {
				n.wasInteracted = true;
				this.applyJudgement("MISS");
			}

			// AUTO-CLEAN: Se a nota (tap ou hold) já saiu totalmente da tela há mais de 1s
			const exitTime = n.type === "TAP" ? n.time : n.endTime;
			if (time > exitTime + 1000) {
				n.hit = true;
			}
		}
	};

	private handleKeyDown = (e: KeyboardEvent) => {
		const key = e.key.toLowerCase();
		if (key === "dead") return this.restart();
		if (key === "p" || key === "escape")
			return this.state === "PLAYING" ? this.pause() : this.resume();
		if (key === "f3" || key === "-") {
			e.preventDefault();
			return this.changeSpeed(-0.05);
		}
		if (key === "f4" || key === "=") {
			e.preventDefault();
			return this.changeSpeed(0.05);
		}

		const col = this.keyMapping.get(key);
		if (col === undefined || this.state !== "PLAYING") return;
		this.visuals.setReceptorState(col, true);
		if (!e.repeat) this.visuals.showLightning(col);

		const time = this.clock.getTime();
		const note = this.notes.find(
			(n) =>
				!n.hit &&
				n.column === col &&
				Math.abs(n.time - time) < CONSTANTS.JUDGEMENT_WINDOWS.MISS,
		);
		if (note) {
			const judge = this.calcJudge(Math.abs(note.time - time));
			if (note.type === "TAP") note.hit = true;
			else {
				note.holding = true;
				note.wasInteracted = true;
			}
			this.applyJudgement(judge);
		}
	};

	private handleKeyUp = (e: KeyboardEvent) => {
		const col = this.keyMapping.get(e.key.toLowerCase());
		if (col === undefined) return;
		this.visuals.setReceptorState(col, false);
		const note = this.notes.find((n) => n.holding && n.column === col);
		if (note) {
			note.hit = true;
			note.holding = false;
			this.applyJudgement(
				this.calcJudge(Math.abs(note.endTime - this.clock.getTime())),
			);
		}
	};

	private calcJudge(d: number) {
		if (d < CONSTANTS.JUDGEMENT_WINDOWS.PERFECT) return "PERFECT";
		if (d < CONSTANTS.JUDGEMENT_WINDOWS.GREAT) return "GREAT";
		if (d < CONSTANTS.JUDGEMENT_WINDOWS.GOOD) return "GOOD";
		return "MISS";
	}

	private applyJudgement(type: string) {
		const colors: any = {
			PERFECT: 0xffff00,
			GREAT: 0x00ff00,
			GOOD: 0x0099ff,
			MISS: 0xff0000,
		};
		this.visuals.showJudgement(type, colors[type]);
		this.currentScore.addHit(type);
		this.events.emit("hit");
	}

	public setupKeys(keys: string[]) {
		this.keyMapping.clear();
		keys.forEach((k, i) => this.keyMapping.set(k.toLowerCase(), i));
	}

	public destroy() {
		this.clock.stop();
		window.removeEventListener("keydown", this.handleKeyDown);
		window.removeEventListener("keyup", this.handleKeyUp);
	}
}
