import * as PIXI from "pixi.js";
import { CONSTANTS } from "../Constants";

export class URBar {
	private container = new PIXI.Container();
	private ticks: { graphics: PIXI.Graphics; time: number }[] = [];
	private readonly WIDTH = 300;
	private readonly MAX_MS = 150;

	constructor(private app: PIXI.Application) {
		this.setupLayout();
	}

	private setupLayout() {
		const { width, height } = this.app.screen;
		const bg = new PIXI.Graphics();
		const msToPx = (ms: number) => (ms / this.MAX_MS) * (this.WIDTH / 2);

		// Desenhar zonas (Good, Great, Perfect)
		const windows = [
			{ ms: CONSTANTS.JUDGEMENT_WINDOWS.GOOD, color: 0x0099ff, alpha: 0.3 },
			{ ms: CONSTANTS.JUDGEMENT_WINDOWS.GREAT, color: 0x00ff00, alpha: 0.4 },
			{ ms: CONSTANTS.JUDGEMENT_WINDOWS.PERFECT, color: 0xffff00, alpha: 0.6 },
		];

		windows.forEach((w) => {
			const wPx = msToPx(w.ms) * 2;
			bg.rect(-wPx / 2, 0, wPx, 4).fill({ color: w.color, alpha: w.alpha });
		});

		const centerLine = new PIXI.Graphics().rect(-1, -5, 2, 14).fill(0xffffff);
		this.container.addChild(bg, centerLine);
		this.container.position.set(
			width / 2,
			height * CONSTANTS.HIT_POSITION_RATIO - 200,
		);
	}

	public addTick(errorMs: number, color: number) {
		const xPos = (errorMs / this.MAX_MS) * (this.WIDTH / 2);
		const clampedX = Math.max(-this.WIDTH / 2, Math.min(this.WIDTH / 2, xPos));

		const tick = new PIXI.Graphics()
			.rect(0, -10, 2, 20)
			.fill({ color, alpha: 0.8 });
		tick.x = clampedX;
		this.container.addChild(tick);
		this.ticks.push({ graphics: tick, time: Date.now() });
	}

	public update() {
		const now = Date.now();
		for (let i = this.ticks.length - 1; i >= 0; i--) {
			const tick = this.ticks[i];
			const elapsed = now - tick.time;
			if (elapsed > 1000) {
				tick.graphics.destroy();
				this.ticks.splice(i, 1);
			} else if (elapsed > 500) {
				tick.graphics.alpha = 1 - (elapsed - 500) / 500;
			}
		}
	}

	public getContainer() {
		return this.container;
	}

	public clear(): void {
		this.ticks.forEach((t) => t.graphics.destroy());
		this.ticks = [];
	}
}
