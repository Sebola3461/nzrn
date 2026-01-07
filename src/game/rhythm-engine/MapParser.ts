export interface HitObject {
	time: number;
	endTime: number;
	column: number;
	type: "TAP" | "HOLD";
	hit: boolean;
	holding: boolean;
	wasInteracted: boolean;
	isBroken: boolean; // sb
}

export interface TimingPoint {
	time: number;
	multiplier: number;
	cumulativePos: number; // Distância acumulada pré-calculada
}

export class MapParser {
	static parse(content: string, keyCount: number = 4): HitObject[] {
		const objects: HitObject[] = [];
		const lines = content.split("\n");
		let isSection = false;

		for (const line of lines) {
			if (line.includes("[HitObjects]")) {
				isSection = true;
				continue;
			}
			if (line.startsWith("[") && isSection) break;
			if (!isSection || line.trim() === "") continue;

			const [x, , time, type, , endParams] = line.split(",");
			const column = Math.floor((parseInt(x) * keyCount) / 512);
			const isHold = (parseInt(type) & 128) > 0;
			let endTime = parseInt(time);

			if (isHold && endParams) {
				endTime = parseInt(endParams.split(":")[0]);
			}

			objects.push({
				time: parseInt(time),
				endTime,
				column,
				type: isHold ? "HOLD" : "TAP",
				hit: false,
				holding: false,
				wasInteracted: false,
				isBroken: false,
			});
		}
		return objects.sort((a, b) => a.time - b.time);
	}

	static parseTimingPoints(content: string): TimingPoint[] {
		const points: TimingPoint[] = [];
		const lines = content.split("\n");
		let isSection = false;

		for (const line of lines) {
			if (line.includes("[TimingPoints]")) {
				isSection = true;
				continue;
			}
			if (line.startsWith("[") && isSection) break;
			if (!isSection || !line.trim()) continue;

			const [time, beatLength, , , , , uninherited] = line.split(",");
			let multiplier = 1.0;

			// No osu!, se uninherited for 0, beatLength é um valor negativo que define o SV
			// Exemplo: -100 significa 1.0x, -50 significa 2.0x
			if (uninherited === "0") {
				multiplier = Math.max(0.1, -100 / parseFloat(beatLength));
			}

			points.push({ time: parseFloat(time), multiplier, cumulativePos: 0 });
		}

		const sortedPoints = points.sort((a, b) => a.time - b.time);

		// --- PRE-CALCULATION ---
		let currentPos = 0;
		for (let i = 0; i < sortedPoints.length; i++) {
			const p = sortedPoints[i];
			const prev = sortedPoints[i - 1];
			if (prev) {
				currentPos += (p.time - prev.time) * prev.multiplier;
			}
			p.cumulativePos = currentPos;
		}

		return sortedPoints;
	}
}
