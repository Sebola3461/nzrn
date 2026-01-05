import { TimingPoint } from "./MapParser";

export class VelocityManager {
	constructor(private points: TimingPoint[]) {
		if (!this.points || this.points.length === 0) {
			this.points = [{ time: 0, multiplier: 1, cumulativePos: 0 }];
		}
		// IMPORTANTE: Garante que os pontos de tempo estejam ordenados
		this.points.sort((a, b) => a.time - b.time);
	}

	public getPositionAtTime(time: number): number {
		let left = 0;
		let right = this.points.length - 1;
		let lastPointIndex = 0;

		// Busca binária com limite de iterações para evitar congelamento
		let safetyCounter = 0;
		while (left <= right && safetyCounter < 100) {
			safetyCounter++;
			const mid = (left + right) >> 1;
			if (this.points[mid].time <= time) {
				lastPointIndex = mid;
				left = mid + 1;
			} else {
				right = mid - 1;
			}
		}

		const point = this.points[lastPointIndex];
		return point.cumulativePos + (time - point.time) * point.multiplier;
	}
}
