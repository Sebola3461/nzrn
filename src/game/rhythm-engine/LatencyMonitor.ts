export class LatencyMonitor {
	private processingLatency: number = 0;
	private history: number[] = [];
	private maxHistory: number = 60; // Fallback inicial

	constructor() {
		this.detectRefreshRate();
		this.setupEventListeners();
	}

	/**
	 * Detecta o Hz da tela para definir o tamanho do histórico
	 */
	private detectRefreshRate(): void {
		let frameCount = 0;
		let startTime = performance.now();

		const checkHz = () => {
			frameCount++;
			const elapsed = performance.now() - startTime;

			if (elapsed < 500) {
				// Amostragem de meio segundo
				requestAnimationFrame(checkHz);
			} else {
				const detectedHz = Math.round((frameCount * 1000) / elapsed);

				this.maxHistory = detectedHz > 0 ? detectedHz : 60;
			}
		};

		requestAnimationFrame(checkHz);
	}

	private setupEventListeners(): void {
		window.addEventListener(
			"keydown",
			(e) => {
				if (e.repeat) return;

				const now = performance.now();

				// e.timeStamp: registro do Hardware/OS
				this.processingLatency = now - e.timeStamp;

				this.addToHistory(this.processingLatency);
			},
			{ passive: true },
		);
	}

	private addToHistory(val: number): void {
		this.history.push(val);
		if (this.history.length > this.maxHistory) {
			this.history.shift();
		}
	}

	/**
	 * Retorna a latência média formatada
	 */
	public getAverageLatency(): string {
		if (this.history.length === 0) return "0.00ms";
		const sum = this.history.reduce((a, b) => a + b, 0);
		return (sum / this.history.length).toFixed(2);
	}

	/**
	 * Retorna o último valor bruto registrado
	 */
	public getLastLatency(): number {
		return this.processingLatency;
	}
}
