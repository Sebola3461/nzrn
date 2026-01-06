import * as PIXI from "pixi.js";
import { CONSTANTS } from "./Constants";
import { HitObject } from "./MapParser";
import { VelocityManager } from "./VelocityManager";

export class VisualManager {
	private noteContainer = new PIXI.Container();
	private effectContainer = new PIXI.Container();
	private receptors: PIXI.Graphics[] = [];
	private sprites = new Map<HitObject, PIXI.Graphics>();
	private activeAnimations: {
		text: PIXI.Text;
		targetScale: number;
		life: number;
	}[] = [];
	private scrollSpeed: number = 0.8;
	private columnWidth: number = 0;
	private judgementGlow = new PIXI.Graphics();
	private hitLine = new PIXI.Graphics();
	private activeLightnings: Map<number, PIXI.Graphics> = new Map();
	private urContainer = new PIXI.Container();
	private urTicks: { graphics: PIXI.Graphics; time: number }[] = [];
	private readonly UR_WIDTH = 300;
	private readonly UR_MAX_MS = 150;

	// fps counter
	private fpsText = new PIXI.Text();

	constructor(private stage: PIXI.Container, private app: PIXI.Application) {
		this.stage.addChild(this.noteContainer, this.effectContainer);
		this.createReceptors();
		this.stage.addChild(this.judgementGlow);
		this.stage.addChild(this.hitLine);
		this.updateLayout();

		this.stage.addChild(this.urContainer);
		this.setupURBar();
		this.setupFPSCounter();
	}

	private setupURBar() {
		this.urContainer.removeChildren();

		const { width, height } = this.app.screen;
		const centerX = width / 2;
		const bottomY = height - 50;

		const bg = new PIXI.Graphics();

		// Função auxiliar para converter MS em largura de pixels na barra
		const msToPx = (ms: number) => (ms / this.UR_MAX_MS) * (this.UR_WIDTH / 2);

		// 1. Zona de GOOD (Azul - a maior área externa)
		const goodWidth = msToPx(CONSTANTS.JUDGEMENT_WINDOWS.GOOD) * 2;
		bg.rect(-goodWidth / 2, 0, goodWidth, 4).fill({
			color: 0x0099ff,
			alpha: 0.3,
		});

		// 2. Zona de GREAT (Verde - intermediária)
		const greatWidth = msToPx(CONSTANTS.JUDGEMENT_WINDOWS.GREAT) * 2;
		bg.rect(-greatWidth / 2, 0, greatWidth, 4).fill({
			color: 0x00ff00,
			alpha: 0.4,
		});

		// 3. Zona de PERFECT (Amarela/Branca - central)
		const perfectWidth = msToPx(CONSTANTS.JUDGEMENT_WINDOWS.PERFECT) * 2;
		bg.rect(-perfectWidth / 2, 0, perfectWidth, 4).fill({
			color: 0xffff00,
			alpha: 0.6,
		});

		// Linha central de 0ms (Sempre branca e acima de tudo)
		const centerLine = new PIXI.Graphics().rect(-1, -5, 2, 14).fill(0xffffff);

		this.urContainer.addChild(bg, centerLine);
		this.urContainer.x = centerX;
		this.urContainer.y = bottomY;
	}

	public addURTick(errorMs: number, color: number) {
		// Calcula a posição X baseada no erro (ms)
		// Mapeia -150ms...150ms para -150px...150px
		const xPos = (errorMs / this.UR_MAX_MS) * (this.UR_WIDTH / 2);

		// Limita para não sair da barra
		const clampedX = Math.max(
			-this.UR_WIDTH / 2,
			Math.min(this.UR_WIDTH / 2, xPos),
		);

		const tick = new PIXI.Graphics()
			.rect(1, -10, 2, 20)
			.fill({ color: color, alpha: 0.8 });

		tick.x = clampedX;
		this.urContainer.addChild(tick);
		this.urTicks.push({ graphics: tick, time: Date.now() });
	}

	private animateUR() {
		const now = Date.now();
		for (let i = this.urTicks.length - 1; i >= 0; i--) {
			const tick = this.urTicks[i];
			const elapsed = now - tick.time;

			if (elapsed > 1000) {
				// Ticks somem após 1 segundos
				tick.graphics.destroy();
				this.urTicks.splice(i, 1);
			} else if (elapsed > 2000) {
				tick.graphics.alpha = 1 - (elapsed - 2000) / 1000;
			}
		}
	}

	private drawHitLine() {
		const { width, height } = this.app.screen;
		const hitY = height * CONSTANTS.HIT_POSITION_RATIO + 15;

		this.hitLine.clear();

		// Linha de base escura (estética)
		this.hitLine.rect(0, hitY, width, 2).fill({ color: 0xffffff, alpha: 0.8 });
	}

	public updateFPS() {
		const fps = Math.round(this.app.ticker.FPS);
		this.fpsText.text = `FPS: ${fps}`;

		if (fps < 55) {
			this.fpsText.style.fill = "#ff4747"; // Vermelho se houver queda
		} else {
			this.fpsText.style.fill = "#00ffff"; // Ciano se estiver estável
		}
	}

	// Um brilhozinho que fica em cima da judgement line
	private drawJudgementGlow() {
		const { width, height } = this.app.screen;
		const hitY = height * CONSTANTS.HIT_POSITION_RATIO + 15;
		const gradientHeight = 240;

		this.judgementGlow.clear();

		const gradientTexture = new PIXI.FillGradient({
			type: "linear",
			colorStops: [
				{ offset: 0.5, color: "#ffffff00" },
				{ offset: 1, color: "#ffffff10" },
			],
		});

		// Linha de base escura
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
			r.y = hitY + 40; // Centraliza a altura do receptor
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

		// azul rosa rosa azul
		const colors = [0x299ba5, 0xfd96e7, 0xfd96e7, 0x299ba5];

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
					g.rect(0, -15, w, 30).fill(colors[note.column]);
					g.y = yPos;
				} else {
					const headY = note.holding ? hitY : yPos;
					const bodyH = Math.max(0, headY - yEnd);

					// Corpo da LN com alpha para transparência neon
					g.rect(w * 0.1, 0, w * 0.8, bodyH).fill({
						color: colors[note.column],
						alpha: 0.4,
					});

					// Extremidades sólidas
					g.rect(0, -15, w, 30).fill(colors[note.column]);
					g.rect(0, bodyH - 15, w, 30).fill(colors[note.column]);
					g.y = yEnd;
				}
				g.x = note.column * this.columnWidth + padding;
			} else {
				this.removeSprite(note);
			}
		});

		this.animateText();
		this.animateUR();
		this.updateFPS();
	}

	private animateText() {
		for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
			const anim = this.activeAnimations[i] as any;
			const txt = anim.text;

			// 1. Interpolação da Escala
			// O texto "esmaga" até o tamanho alvo
			txt.scale.x += (1 - txt.scale.x) * 0.2;
			txt.scale.y += (1 - txt.scale.y) * 0.2;

			// 2. Movimento e Alpha
			txt.alpha -= 0.025;

			// 3. Destruição
			if (txt.alpha <= 0) {
				txt.destroy();
				this.activeAnimations.splice(i, 1);
			}
		}
	}

	private setupFPSCounter() {
		this.fpsText.style = {
			fill: "#00ffff",
			fontSize: 16,
			fontFamily: "monospace",
			fontWeight: "bold",
		};

		this.fpsText.x = 10;
		this.fpsText.y = 10;

		this.stage.addChild(this.fpsText);
	}

	public showJudgement(txt: string, color: number, yOffset?: number) {
		// 1. Criar o texto com um estilo muito mais agressivo
		const j = new PIXI.Text({
			text: txt,
			style: {
				fill: color,
				fontSize: 30,
				fontWeight: "900",
				fontFamily: "Arial Black",
				stroke: { color: 0x000000, width: 6 },
				dropShadow: {
					alpha: 0.5,
					angle: Math.PI / 6,
					blur: 4,
					color: color,
					distance: 0,
				},
			},
		});

		j.anchor.set(0.5);
		j.x = this.app.screen.width / 2;
		j.y = this.app.screen.height * 0.45 + (yOffset || 0); // Um pouco acima do centro

		// 2. Efeito de Escala (Pop-in)
		// Começa grande e diminui rapidamente para o tamanho normal
		j.scale.set(1.5);

		this.effectContainer.addChild(j);

		this.activeAnimations.push({
			text: j,
			targetScale: 1.0,
			life: 1.0, // Tempo de vida de 0 a 1
		});
	}

	public showLightning(col: number) {
		// Se já houver um efeito nessa coluna, não cria outro
		if (this.activeLightnings.has(col)) return;

		const { height } = this.app.screen;
		const hitY = height * CONSTANTS.HIT_POSITION_RATIO;
		const colors = ["#299ba5", "#fd96e7", "#fd96e7", "#299ba5"];

		const gradientTexture = new PIXI.FillGradient({
			type: "linear",
			colorStops: [
				{ offset: 0, color: `${colors[col]}00` },
				{ offset: 1, color: `${colors[col]}22` },
			],
		});

		const l = new PIXI.Graphics()
			.rect(col * this.columnWidth, 15, this.columnWidth, hitY)
			.fill(gradientTexture);

		this.effectContainer.addChild(l);

		// Armazena a referência usando a coluna como chave
		this.activeLightnings.set(col, l);
	}

	public stopLightning(col: number) {
		const l = this.activeLightnings.get(col);
		if (l) {
			if (!l.destroyed) l.destroy();
			this.activeLightnings.delete(col);
		}
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
