import * as PIXI from "pixi.js";
import { PerformanceOverlayRenderer } from "./UI/PerformanceOverlayRenderer";
import { URBar } from "./UI/URBar";
import { JudgementRenderer } from "./UI/JudgementRenderer";
import { PlayfieldRenderer } from "./UI/PlayfieldRenderer";
import { NoteRenderer } from "./UI/NoteRenderer";
import { LatencyMonitor } from "./LatencyMonitor";
import { VelocityManager } from "./VelocityManager";
import { HitObject } from "./MapParser";

export class VisualManager {
	public readonly perf: PerformanceOverlayRenderer;
	public readonly ur: URBar;
	public readonly judge: JudgementRenderer;
	public readonly playfield: PlayfieldRenderer;
	public readonly notes: NoteRenderer;

	private _scrollSpeed = 0.8;

	public get scrollSpeed() {
		return this._scrollSpeed;
	}

	constructor(
		stage: PIXI.Container,
		app: PIXI.Application,
		latency: LatencyMonitor,
	) {
		this.perf = new PerformanceOverlayRenderer(app, latency);
		this.ur = new URBar(app);
		this.playfield = new PlayfieldRenderer(stage, app);
		this.notes = new NoteRenderer(stage, app);
		this.judge = new JudgementRenderer(stage, app);

		stage.addChild(this.ur.getContainer(), this.perf.getContainer());

		const savedSpeed = localStorage.getItem("scrollSpeed");
		if (savedSpeed) {
			this._scrollSpeed = parseFloat(savedSpeed);
		}
	}

	public changeScrollSpeed(speed: number) {
		this._scrollSpeed = speed;
	}

	public render(hitObjects: HitObject[], time: number, ve: VelocityManager) {
		this.notes.render(hitObjects, time, ve, this._scrollSpeed);
		this.judge.update();
		this.ur.update();
		this.perf.update();
	}

	public showJudgement(txt: string, col: number, offsetY?: number) {
		this.judge.show(txt, col, offsetY);
	}
	public addURTick(ms: number, col: number) {
		this.ur.addTick(ms, col);
	}
	public onKeyPress(col: number, down: boolean) {
		this.playfield.setLightning(col, down);
		this.playfield.drawReceptor(this.playfield["receptors"][col], col, down);
	}
	public clearAll(): void {
		// Limpa as notas e sprites em cache
		this.notes.clear();

		// Limpa os textos de julgamento (PERFECT, GREAT) que ainda estão na tela
		this.judge.clear();

		// Reseta os efeitos de luz e estado dos receptores
		this.playfield.reset();

		// Opcional: Limpa a barra de UR se quiser que ela comece do zero no restart
		this.ur.clear();
	}
}
