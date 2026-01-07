import { EventEmitter } from "pixi.js";

export class InputManager {
	private inputBuffer: boolean[];
	private keyMapping: Map<string, number> = new Map();
	public readonly events = new EventEmitter();

	constructor(totalColumns: number, initialKeys: string[]) {
		this.inputBuffer = new Array(totalColumns).fill(false);
		this.setupKeys(initialKeys);
		window.addEventListener("keydown", this.handleKeyDown);
		window.addEventListener("keyup", this.handleKeyUp);
	}

	private handleKeyDown = (e: KeyboardEvent) => {
		const key = e.key.toLowerCase();
		const keycode = e.code.toLowerCase();
		// Atalhos de sistema que você definiu na Engine
		if (keycode === "backquote") return this.events.emit("restart");
		if (key === "escape") return this.events.emit("pauseToggle");
		if (key === "+") return this.events.emit("offsetChange", -5);
		if (key === "=") return this.events.emit("offsetChange", 5);
		if (key === "f3") {
			e.preventDefault();
			return this.events.emit("speedChange", -0.05);
		}
		if (key === "f4") {
			e.preventDefault();
			return this.events.emit("speedChange", 0.05);
		}

		const col = this.keyMapping.get(key);
		if (col === undefined || e.repeat) return;

		this.inputBuffer[col] = true;
		this.events.emit("keyDown", col);
	};

	private handleKeyUp = (e: KeyboardEvent) => {
		const col = this.keyMapping.get(e.key.toLowerCase());
		if (col !== undefined) this.events.emit("keyUp", col);
	};

	public consumeInput(col: number): boolean {
		const val = this.inputBuffer[col];
		this.inputBuffer[col] = false;
		return val;
	}

	public setupKeys(keys: string[]) {
		this.keyMapping.clear();
		keys.forEach((k, i) => this.keyMapping.set(k.toLowerCase(), i));
	}

	public destroy() {
		window.removeEventListener("keydown", this.handleKeyDown);
		window.removeEventListener("keyup", this.handleKeyUp);
		this.events.removeAllListeners();
	}
}
