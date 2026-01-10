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

	private _scrollSpeed = 1;

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

	/**
	 * Renderização principal das notas (Loop de Vídeo)
	 */
	public render(hitObjects: HitObject[], time: number, ve: VelocityManager) {
		this.notes.render(hitObjects, time, ve, this._scrollSpeed);
	}

	/**
	 * Atualiza os elementos de interface e animações (Loop de Vídeo)
	 * Chamado pela GameEngine para atualizar URBar, Performance e Judgements
	 */
	public updateSubsystems() {
		this.judge.update(); // Fade out do texto de Perfect/Great
		this.ur.update(); // Fade out dos tracinhos e movimento da média
		this.perf.update(); // Atualiza FPS e Latência na tela
	}

	public showJudgement(txt: string) {
		this.judge.show(txt);
	}

	public addURTick(ms: number, col: number) {
		this.ur.addTick(ms, col);
	}

	public onKeyPress(col: number, down: boolean) {
		this.playfield.setLightning(col, down);
		this.playfield.drawReceptor(this.playfield["receptors"][col], col, down);
	}

	public clearAll(): void {
		this.notes.clear();
		this.judge.clear();
		this.playfield.reset();
		this.ur.clear();
	}
}
