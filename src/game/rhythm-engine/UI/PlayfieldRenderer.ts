import * as PIXI from "pixi.js";
import { CONSTANTS } from "../Constants";
import { NoteRenderer } from "./NoteRenderer";

export class PlayfieldRenderer {
	private container = new PIXI.Container();
	private receptors: PIXI.Graphics[] = [];
	private lightnings: Map<number, PIXI.Graphics> = new Map();
	private hitLine = new PIXI.Graphics();
	private columnWidth = 0;

	constructor(private stage: PIXI.Container, private app: PIXI.Application) {
		this.stage.addChild(this.container);
		this.columnWidth = this.app.screen.width / CONSTANTS.TOTAL_COLUMNS;
		this.createReceptors();
		this.drawHitLine();
	}

	private createReceptors() {
		for (let i = 0; i < CONSTANTS.TOTAL_COLUMNS; i++) {
			const r = new PIXI.Graphics();
			this.receptors.push(r);
			this.container.addChild(r);
		}
		this.updateLayout();
	}

	public updateLayout() {
		const hitY = this.app.screen.height * CONSTANTS.HIT_POSITION_RATIO;
		this.receptors.forEach((r, i) => {
			this.drawReceptor(r, i, false);
			r.y = hitY + 40;
		});
	}

	public drawReceptor(g: PIXI.Graphics, col: number, active: boolean) {
		g.clear();
		const padding = this.columnWidth * 0.1;
		const w = this.columnWidth - padding * 2;
		if (active) {
			g.rect(-2, -2, w + 4, NoteRenderer.NOTE_HEIGHT).fill({
				color: 0xc3c3c3,
				alpha: 0.15,
			});
			g.rect(0, 0, w, NoteRenderer.NOTE_HEIGHT)
				.stroke({ color: 0xc3c3c3, width: 3 })
				.fill({ color: 0xc3c3c3, alpha: 0.3 });
		} else {
			g.rect(0, 0, w, NoteRenderer.NOTE_HEIGHT).stroke({
				color: 0x333344,
				width: 2,
				alpha: 0.5,
			});
		}
		g.x = col * this.columnWidth + padding;
	}

	public setLightning(col: number, active: boolean) {
		if (active && !this.lightnings.has(col)) {
			const hitY =
				this.app.screen.height * CONSTANTS.HIT_POSITION_RATIO -
				NoteRenderer.NOTE_HEIGHT / 2;
			const color = ["#299ba5", "#fd96e7", "#fd96e7", "#299ba5"][col];
			const l = new PIXI.Graphics()
				.rect(col * this.columnWidth, 15, this.columnWidth, hitY)
				.fill(
					new PIXI.FillGradient({
						type: "linear",
						colorStops: [
							{ offset: 0, color: `${color}00` },
							{ offset: 1, color: `${color}22` },
						],
					}),
				);
			this.container.addChild(l);
			this.lightnings.set(col, l);
		} else if (!active && this.lightnings.has(col)) {
			this.lightnings.get(col)?.destroy();
			this.lightnings.delete(col);
		}
	}

	private drawHitLine() {
		const hitY = this.app.screen.height * CONSTANTS.HIT_POSITION_RATIO;
		this.hitLine
			.rect(0, hitY, this.app.screen.width, 2)
			.fill({ color: 0xffffff, alpha: 0.8 });
		this.container.addChild(this.hitLine);
	}

	public reset(): void {
		// Remove todos os efeitos de luz (lightning) ativos
		this.lightnings.forEach((l) => l.destroy());
		this.lightnings.clear();

		// Volta todos os receptores para o estado idle (cinza)
		this.receptors.forEach((r, i) => {
			this.drawReceptor(r, i, false);
		});
	}
}
