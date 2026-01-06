import * as PIXI from "pixi.js";
import { CONSTANTS } from "./Constants";
import { HitObject } from "./MapParser";
import { VelocityManager } from "./VelocityManager";

export class VisualManager {
	private noteContainer = new PIXI.Container();
	private effectContainer = new PIXI.Container();
	private receptors: PIXI.Graphics[] = [];
	private sprites = new Map<HitObject, PIXI.Graphics>();
	private activeAnimations: { text: PIXI.Text }[] = [];
	private scrollSpeed: number = 0.8;
	private columnWidth: number = 0;
	private judgementGlow = new PIXI.Graphics();
	private hitLine = new PIXI.Graphics();

	constructor(private stage: PIXI.Container, private app: PIXI.Application) {
		this.stage.addChild(this.effectContainer, this.noteContainer);
		this.createReceptors();
		this.stage.addChild(this.judgementGlow);
		this.stage.addChild(this.hitLine);
		this.updateLayout();
	}

	private drawHitLine() {
		const { width, height } = this.app.screen;
		const hitY = height * CONSTANTS.HIT_POSITION_RATIO + 8;

		this.hitLine.clear();

		// Linha de base escura (estética)
		this.hitLine.rect(0, hitY, width, 2).fill({ color: 0x333344, alpha: 0.5 });
	}

	// Um brilhozinho que fica em cima da judgement line
	private drawJudgementGlow() {
		const { width, height } = this.app.screen;
		const hitY = height * CONSTANTS.HIT_POSITION_RATIO + 8;
		const gradientHeight = 240;

		this.judgementGlow.clear();

		const gradientTexture = new PIXI.FillGradient({
			type: "linear",
			colorStops: [
				{ offset: 0.5, color: "#ffffff00" },
				{ offset: 1, color: "#ffffff10" },
			],
		});

		// Linha de base escura (estética)
		this.judgementGlow
			.rect(0, hitY - gradientHeight, width, gradientHeight)
			.fill(gradientTexture);
	}

	public updateLayout() {
		const { width, height } = this.app.screen;
		const hitY = height * CONSTANTS.HIT_POSITION_RATIO;
		this.columnWidth = width / CONSTANTS.TOTAL_COLUMNS;

		this.drawHitLine();
		this.drawJudgementGlow();

		this.receptors.forEach((r, i) => {
			this.drawReceptor(r, i, false);
			r.y = hitY + 20; // Centraliza a altura do receptor
		});
	}

	private createReceptors() {
		for (let i = 0; i < CONSTANTS.TOTAL_COLUMNS; i++) {
			const r = new PIXI.Graphics();
			this.receptors.push(r);
			this.stage.addChild(r);
		}
	}

	private drawReceptor(g: PIXI.Graphics, col: number, active: boolean) {
		g.clear();
		const padding = this.columnWidth * 0.1;
		const w = this.columnWidth - padding * 2;

		// Cores: Cinza escuro para idle, Branco puro para ativo
		const idleColor = 0x333344;
		const activeColor = 0xc3c3c3; // Branco puro

		if (active) {
			// Efeito de brilho (glow) branco ao fundo
			g.rect(-2, -2, w + 4, 34).fill({ color: 0xc3c3c3, alpha: 0.15 });

			// Borda branca sólida
			g.rect(0, 0, w, 30).stroke({
				color: activeColor,
				width: 3, // Borda um pouco mais grossa para o brilho
				alpha: 1,
			});

			// Preenchimento interno branco sutil
			g.fill({ color: 0xc3c3c3, alpha: 0.3 });
		} else {
			// Estado normal: Borda cinza sutil
			g.rect(0, 0, w, 30).stroke({
				color: idleColor,
				width: 2,
				alpha: 0.5,
			});
		}

		g.x = col * this.columnWidth + padding;
	}

	public render(notes: HitObject[], currentTime: number, ve: VelocityManager) {
		const { height } = this.app.screen;
		const hitY = height * CONSTANTS.HIT_POSITION_RATIO;
		const playerPos = ve.getPositionAtTime(currentTime);
		const padding = this.columnWidth * 0.1;

		// Suas cores específicas
		const COLOR_TAP = 0x299ba5; // Azul
		const COLOR_LN = 0xfd96e7; // Rosa

		notes.forEach((note) => {
			if (note.hit) {
				this.removeSprite(note);
				return;
			}

			// Cache das posições para evitar reprocessamento do SV e prevenir congelamentos
			const noteStartPos = ve.getPositionAtTime(note.time);
			const noteEndPos = ve.getPositionAtTime(note.endTime);

			const yPos = hitY - (noteStartPos - playerPos) * this.scrollSpeed;
			const yEnd = hitY - (noteEndPos - playerPos) * this.scrollSpeed;

			if (yPos > -200 && yEnd < height + 200) {
				let g = this.sprites.get(note);
				if (!g) {
					g = new PIXI.Graphics();
					this.sprites.set(note, g);
					this.noteContainer.addChild(g);
				}

				g.clear();
				const w = this.columnWidth - padding * 2;

				if (note.type === "TAP") {
					g.rect(0, -15, w, 30).fill(COLOR_TAP);
					g.y = yPos;
				} else {
					const headY = note.holding ? hitY : yPos;
					const bodyH = Math.max(0, headY - yEnd);

					// Corpo da LN com alpha para transparência neon
					g.rect(w * 0.1, 0, w * 0.8, bodyH).fill({
						color: COLOR_LN,
						alpha: 0.4,
					});

					// Extremidades sólidas
					g.rect(0, -15, w, 30).fill(COLOR_LN);
					g.rect(0, bodyH - 15, w, 30).fill(COLOR_LN);
					g.y = yEnd;
				}
				g.x = note.column * this.columnWidth + padding;
			} else {
				this.removeSprite(note);
			}
		});

		this.animateText();
	}

	private animateText() {
		for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
			const anim = this.activeAnimations[i];
			anim.text.y -= 0.5;
			anim.text.alpha -= 0.02;
			if (anim.text.alpha <= 0) {
				anim.text.destroy();
				this.activeAnimations.splice(i, 1);
			}
		}
	}

	public showJudgement(txt: string, color: number, column?: number) {
		const j = new PIXI.Text({
			text: txt,
			style: { fill: color, fontSize: 40, fontWeight: "900" },
		});
		j.anchor.set(0.5);
		j.x = this.app.screen.width / 2;
		j.y = this.app.screen.height * 0.5;
		this.effectContainer.addChild(j);
		this.activeAnimations.push({ text: j });
	}

	public showLightning(col: number) {
		const { height } = this.app.screen;
		const hitY = height * CONSTANTS.HIT_POSITION_RATIO;

		const gradientTexture = new PIXI.FillGradient({
			type: "linear",
			colorStops: [
				{ offset: 0, color: "#ffffff00" },
				{ offset: 1, color: "#ffffff22" },
			],
		});

		const l = new PIXI.Graphics()
			.rect(col * this.columnWidth, 8, this.columnWidth, hitY)
			.fill(gradientTexture);
		this.effectContainer.addChild(l);

		setTimeout(() => {
			if (!l.destroyed) l.destroy();
		}, 80);
	}

	public setReceptorState(c: number, a: boolean) {
		if (this.receptors[c]) this.drawReceptor(this.receptors[c], c, a);
	}
	public setScrollSpeed(s: number) {
		this.scrollSpeed = s;
	}
	public clearAll() {
		this.sprites.forEach((s) => s.destroy());
		this.sprites.clear();
		this.noteContainer.removeChildren();
	}
	private removeSprite(n: HitObject) {
		const s = this.sprites.get(n);
		if (s) {
			s.destroy();
			this.sprites.delete(n);
		}
	}
}
