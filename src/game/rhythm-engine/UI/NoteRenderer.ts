import * as PIXI from "pixi.js";
import { HitObject } from "../MapParser";
import { VelocityManager } from "../VelocityManager";
import { CONSTANTS } from "../Constants";
import { GameEngine } from "../GameEngine";

export class NoteRenderer {
	private container = new PIXI.Container();
	private sprites = new Map<HitObject, PIXI.Graphics>();
	private colors = [0x299ba5, 0xfd96e7, 0xfd96e7, 0x299ba5];

	private shineFilter = new PIXI.ColorMatrixFilter();
	private darkFilter = new PIXI.ColorMatrixFilter();
	public static readonly NOTE_HEIGHT = 40;

	constructor(private stage: PIXI.Container, private app: PIXI.Application) {
		this.stage.addChild(this.container);
		this.shineFilter.brightness(1.5, false);
		this.darkFilter.desaturate();
		this.darkFilter.brightness(0.3, false);
	}

	public render(
		notes: HitObject[],
		currentTime: number,
		ve: VelocityManager,
		scrollSpeed: number,
	) {
		const hitY = this.app.screen.height * CONSTANTS.HIT_POSITION_RATIO; // ISSO AQUI DEFINE ONDE VAI SER O JUDGEMENT
		const playerPos = ve.getPositionAtTime(currentTime);
		const colW = this.app.screen.width / CONSTANTS.TOTAL_COLUMNS;
		const screenHeight = this.app.screen.height;

		notes.forEach((note) => {
			if (note.type === "TAP" && note.hit) {
				return this.removeSprite(note);
			}

			const noteStartPos = ve.getPositionAtTime(note.time);
			const noteEndPos = ve.getPositionAtTime(note.endTime);

			const yPos = hitY - (noteStartPos - playerPos) * scrollSpeed;
			const yEnd = hitY - (noteEndPos - playerPos) * scrollSpeed;

			if (note.type === "HOLD") {
				if (yEnd > screenHeight + 200) return this.removeSprite(note);

				// Se a nota foi hitada com sucesso e a cauda passou do receptor, removemos.
				if (note.hit && !note.isBroken && yEnd >= hitY) {
					return this.removeSprite(note);
				}
			} else {
				if (yPos > screenHeight + 200) return this.removeSprite(note);
			}

			if (yPos > -200 && yEnd < screenHeight + 200) {
				let g = this.sprites.get(note);
				if (!g) {
					g = new PIXI.Graphics();
					this.sprites.set(note, g);
					this.container.addChild(g);
				}
				this.drawNote(g, note, yPos, yEnd, hitY, colW, currentTime);
			} else {
				this.removeSprite(note);
			}
		});
	}

	private drawNote(
		g: PIXI.Graphics,
		note: HitObject,
		y: number,
		yEnd: number,
		hitY: number,
		colW: number,
		currentTime: number,
	) {
		g.clear();
		const padding = colW * 0.1;
		const w = colW - padding * 2;
		const baseColor = this.colors[note.column];

		const isBroken = note.isBroken;

		g.alpha = 1.0;
		if (note.type === "HOLD") {
			if (note.holding) {
				g.filters = [this.shineFilter];
			} else if (isBroken) {
				g.filters = [this.darkFilter];
				g.alpha = 0.8;
			} else {
				g.filters = [];
			}
		} else {
			g.filters = [];
		}

		g.x = note.column * colW + padding;

		if (note.type === "TAP") {
			g.rect(
				0,
				-(NoteRenderer.NOTE_HEIGHT / 2),
				w,
				NoteRenderer.NOTE_HEIGHT,
			).fill(baseColor);
			g.y = y;
		} else {
			// === LÓGICA DE SNAP FIXO ===
			// A cabeça deve travar no receptor se:
			// 1. O jogador está segurando (holding)
			// 2. OU se o jogador JÁ soltou (hit=true) mas a nota NÃO deu sb (isBroken=false)
			const shouldSnap = (note.holding || (note.hit && !isBroken)) && !isBroken;

			const headY = shouldSnap ? hitY : y;
			const bodyH = Math.max(0, headY - yEnd);

			if (bodyH > 0) {
				const bodyAlpha = note.holding
					? 0.6 + Math.sin(currentTime * 0.02) * 0.2
					: 0.4;

				// Corpo
				g.rect(w * 0.1, 0, w * 0.8, bodyH).fill({
					color: baseColor,
					alpha: bodyAlpha,
				});

				// Cabeça (Só desenha se não estiver "dentro" do receptor ou se soltou)
				g.rect(
					0,
					bodyH - NoteRenderer.NOTE_HEIGHT / 2,
					w,
					NoteRenderer.NOTE_HEIGHT,
				).fill({
					color: baseColor,
					alpha: 1.0,
				});

				// Cauda
				if (GameEngine.SHOULD_RENDER_TAIL)
					g.rect(
						0,
						-(NoteRenderer.NOTE_HEIGHT / 2),
						w,
						NoteRenderer.NOTE_HEIGHT,
					).fill({ color: baseColor, alpha: 1.0 });

				g.y = yEnd;
			} else {
				// Se o corpo acabou de ser consumido, limpamos o sprite
				this.removeSprite(note);
			}
		}
	}

	public removeSprite(n: HitObject) {
		const g = this.sprites.get(n);
		if (g) {
			g.destroy();
			this.sprites.delete(n);
		}
	}

	public clear(): void {
		this.sprites.forEach((sprite) => sprite.destroy());
		this.sprites.clear();
		this.container.removeChildren();
	}
}
