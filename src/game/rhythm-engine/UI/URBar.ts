import * as PIXI from "pixi.js";
import { CONSTANTS } from "../Constants";

export class URBar {
	private container = new PIXI.Container();
	private ticks: { graphics: PIXI.Graphics; time: number }[] = [];

	// --- Configurações da Barra ---
	private readonly WIDTH = 300;
	private readonly MAX_MS = 150;

	// --- Configurações da Média (indicator) ---
	private averageMarker: PIXI.Graphics = new PIXI.Graphics();
	private recentErrors: number[] = []; // Buffer para guardar os últimos hits
	private readonly HISTORY_SIZE = 20; // Quantos hits considerar na média (quanto maior, mais lento o triângulo)
	private targetAvgX: number = 0; // Onde o triângulo QUER chegar
	private currentAvgX: number = 0; // Onde o triângulo ESTÁ agora

	constructor(private app: PIXI.Application) {
		this.setupLayout();
	}

	private setupLayout() {
		const { width, height } = this.app.screen;
		const bg = new PIXI.Graphics();

		// Desenhar zonas (Good, Great, Perfect)
		const windows = [
			{ ms: CONSTANTS.JUDGEMENT_WINDOWS.GOOD, color: 0x0099ff, alpha: 0.3 },
			{ ms: CONSTANTS.JUDGEMENT_WINDOWS.GREAT, color: 0x00ff00, alpha: 0.4 },
			{ ms: CONSTANTS.JUDGEMENT_WINDOWS.PERFECT, color: 0xffff00, alpha: 0.6 },
		];

		// Desenha do fundo para frente
		windows.forEach((w) => {
			const wPx = this.getXFromMs(w.ms) * 2; // *2 porque getX retorna metade da largura relativa
			bg.rect(-wPx / 2, 0, wPx, 4).fill({ color: w.color, alpha: w.alpha });
		});

		// Linha central
		const centerLine = new PIXI.Graphics().rect(-1, -5, 2, 14).fill(0xffffff);

		// --- Criar o Triângulo da Média ---
		this.averageMarker = new PIXI.Graphics();
		this.averageMarker
			.moveTo(0, 0) // Ponta de baixo (tocando a barra)
			.lineTo(-6, -8) // Canto superior esquerdo
			.lineTo(6, -8) // Canto superior direito
			.closePath()
			.fill(0xffffff); // Branco

		// Posiciona levemente acima da barra
		this.averageMarker.y = -2;

		// Adiciona tudo ao container
		// Fundo -> Linha Centro -> Ticks -> Triângulo (por cima de tudo)
		this.container.addChild(bg, centerLine, this.averageMarker);

		this.container.position.set(
			width / 2,
			height * CONSTANTS.HIT_POSITION_RATIO - 200,
		);
	}

	/**
	 * Converte milissegundos em pixels relativos ao centro da barra
	 */
	private getXFromMs(ms: number): number {
		return (ms / this.MAX_MS) * (this.WIDTH / 2);
	}

	public addTick(errorMs: number, color: number) {
		const xPos = this.getXFromMs(errorMs);
		const clampedX = Math.max(-this.WIDTH / 2, Math.min(this.WIDTH / 2, xPos));

		// 1. Cria o Tick Visual
		const tick = new PIXI.Graphics()
			.rect(0, -10, 2, 20)
			.fill({ color, alpha: 0.8 });
		tick.x = clampedX;

		// Adiciona o tick ATRÁS do triângulo de média para ficar bonito
		const index = this.container.getChildIndex(this.averageMarker);
		this.container.addChildAt(tick, index);

		this.ticks.push({ graphics: tick, time: Date.now() });

		// 2. Cálculo da Média Móvel
		this.recentErrors.push(errorMs);
		if (this.recentErrors.length > this.HISTORY_SIZE) {
			this.recentErrors.shift(); // Remove o mais antigo
		}

		// Calcula a média simples dos últimos N hits
		const sum = this.recentErrors.reduce((a, b) => a + b, 0);
		const avg = sum / this.recentErrors.length;

		// Define a nova posição ALVO para o triângulo
		this.targetAvgX = Math.max(
			-this.WIDTH / 2,
			Math.min(this.WIDTH / 2, this.getXFromMs(avg)),
		);
	}

	public update() {
		const now = Date.now();
		const dt = this.app.ticker.deltaTime;

		// 1. Atualizar Ticks (Fade out)
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

		// 2. Animar o Triângulo (Interpolação Linear / Lerp)
		// Isso faz ele deslizar suavemente até a média em vez de teletransportar
		const speed = 0.1;
		this.currentAvgX += (this.targetAvgX - this.currentAvgX) * speed * dt;

		this.averageMarker.x = this.currentAvgX;
	}

	public getContainer() {
		return this.container;
	}

	public clear(): void {
		this.ticks.forEach((t) => t.graphics.destroy());
		this.ticks = [];

		// Reseta a média
		this.recentErrors = [];
		this.targetAvgX = 0;
		this.currentAvgX = 0;
		this.averageMarker.x = 0;
	}
}
