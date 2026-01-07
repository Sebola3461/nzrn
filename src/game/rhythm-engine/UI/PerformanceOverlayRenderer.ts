import * as PIXI from "pixi.js";
import { LatencyMonitor } from "../LatencyMonitor";

export class PerformanceOverlayRenderer {
	private container = new PIXI.Container();
	private fpsText: PIXI.Text;
	private latencyText: PIXI.Text;
	private framesCount = 0;
	private smoothedFPS = 0;
	private readonly SMOOTHING_FACTOR = 0.5;

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
		this.latencyText = new PIXI.Text({ text: "", style });

		this.latencyText.y = 20;
		this.container.addChild(this.fpsText, this.latencyText);
		this.container.zIndex = 1000;
	}

	public getContainer() {
		return this.container;
	}

	public update() {
		const rawFPS = this.app.ticker.FPS;
		this.smoothedFPS =
			this.smoothedFPS * this.SMOOTHING_FACTOR +
			rawFPS * (1 - this.SMOOTHING_FACTOR);

		if (++this.framesCount >= 10) {
			this.fpsText.text = `FPS: ${Math.round(
				this.smoothedFPS,
			)} (${this.app.ticker.deltaMS.toFixed(2)}ms)`;

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
