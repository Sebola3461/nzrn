import * as PIXI from "pixi.js";
import { LatencyMonitor } from "../LatencyMonitor";

export class PerformanceOverlayRenderer {
	private container = new PIXI.Container();
	private fpsText: PIXI.Text;
	private logicText: PIXI.Text; // Novo: Para os 1000 FPS de lógica
	private latencyText: PIXI.Text;

	private framesCount = 0;
	private smoothedFPS = 0;
	private readonly SMOOTHING_FACTOR = 0.5;

	// Variáveis para calcular o FPS de Lógica (TPS)
	private lastLogicTime = performance.now();
	private logicTickRate = 0;

	constructor(
		private app: PIXI.Application,
		private latencyMonitor: LatencyMonitor,
	) {
		const style = new PIXI.TextStyle({
			fill: "#00ffff",
			fontSize: 14,
			fontFamily: "monospace",
			fontWeight: "bold",
			stroke: { color: "#000000", width: 4 },
		});

		this.fpsText = new PIXI.Text({ text: "", style });
		this.logicText = new PIXI.Text({ text: "", style });
		this.latencyText = new PIXI.Text({ text: "", style });

		this.logicText.y = 20;
		this.latencyText.y = 40;

		this.container.addChild(this.fpsText, this.logicText, this.latencyText);
		this.container.zIndex = 1000;
	}

	/**
	 * Este método deve ser chamado dentro do seu loop de 1000 FPS na GameEngine
	 */
	public recordLogicTick() {
		const now = performance.now();
		const delta = now - this.lastLogicTime;
		this.lastLogicTime = now;

		// Calcula o rate atual (1000 / ms entre ticks)
		const currentRate = delta > 0 ? 1000 / delta : 0;

		// Suavização do Logic FPS
		this.logicTickRate = this.logicTickRate * 0.95 + currentRate * 0.05;
	}

	public getContainer() {
		return this.container;
	}

	public update() {
		// --- Render FPS (Pixi Ticker) ---
		const rawFPS = this.app.ticker.FPS;
		this.smoothedFPS =
			this.smoothedFPS * this.SMOOTHING_FACTOR +
			rawFPS * (1 - this.SMOOTHING_FACTOR);

		if (++this.framesCount >= 10) {
			// Texto do FPS Visual
			this.fpsText.text = `RND: ${Math.round(
				this.smoothedFPS,
			)} FPS (${this.app.ticker.deltaMS.toFixed(2)}ms)`;

			// Texto do FPS de Lógica
			this.logicText.text = `LGC: ${Math.round(this.logicTickRate)} TPS`;
			this.logicText.style.fill =
				this.logicTickRate < 500 ? "#ff4747" : "#00ffff";

			// Texto de Latência de Input
			const avgL = this.latencyMonitor.getAverageLatency();
			const lastL = this.latencyMonitor.getLastLatency().toFixed(2);
			this.latencyText.text = `INP: ${lastL}ms (AVG: ${avgL}ms)`;

			const avgNum = parseFloat(avgL);
			this.latencyText.style.fill =
				avgNum > 8 ? "#ff4747" : avgNum > 4 ? "#ffcc00" : "#00ff88";

			this.framesCount = 0;
		}
	}
}
