import { EventEmitter } from "pixi.js";

// Estrutura para armazenar o momento exato do input
interface QueuedInput {
	time: number;
	processed: boolean;
}

export class InputManager {
	// Array de filas: cada coluna tem sua lista de inputs pendentes
	// Ex: Coluna 0: [{ time: 10050 }, { time: 10150 }]
	private inputQueue: QueuedInput[][];

	// Estado físico atual (para Long Notes e visual feedback)
	private isKeyDown: boolean[];

	private keyMapping: Map<string, number> = new Map();
	public readonly events = new EventEmitter();

	constructor(private totalColumns: number, initialKeys: string[]) {
		// Inicializa as filas para cada coluna
		this.inputQueue = Array.from({ length: totalColumns }, () => []);
		this.isKeyDown = new Array(totalColumns).fill(false);

		this.setupKeys(initialKeys);

		// Bindings com { passive: false } para garantir que preventDefault funcione se necessário
		window.addEventListener("keydown", this.handleKeyDown, { passive: false });
		window.addEventListener("keyup", this.handleKeyUp, { passive: false });
	}

	private handleKeyDown = (e: KeyboardEvent) => {
		// Ignora repetição automática do SO (segurar a tecla)
		if (e.repeat) return;

		const key = e.key.toLowerCase();
		const code = e.code.toLowerCase();

		// --- Atalhos Globais ---
		if (code === "backquote") return this.events.emit("restart");
		if (key === "escape") return this.events.emit("pauseToggle");

		// Offset e Speed (prevent default para não scrollar/fazer ação do navegador)
		if (["-", "=", "f3", "f4"].includes(key)) {
			e.preventDefault();
			if (key === "-") return this.events.emit("offsetChange", -5);
			if (key === "=") return this.events.emit("offsetChange", 5);
			if (key === "f3") return this.events.emit("speedChange", -0.05);
			if (key === "f4") return this.events.emit("speedChange", 0.05);
		}

		const col = this.keyMapping.get(key);
		if (col === undefined) return;

		// --- Lógica de Input Preciso ---

		this.isKeyDown[col] = true;

		// Adiciona à fila com o timestamp exato do evento
		// e.timeStamp é mais preciso que Date.now() e sincronizado com performance.now()
		this.inputQueue[col].push({
			time: e.timeStamp,
			processed: false,
		});

		this.events.emit("keyDown", col);
	};

	private handleKeyUp = (e: KeyboardEvent) => {
		const col = this.keyMapping.get(e.key.toLowerCase());
		if (col !== undefined) {
			this.isKeyDown[col] = false;
			this.events.emit("keyUp", col);
		}
	};

	/**
	 * Tenta consumir o input mais antigo da fila desta coluna.
	 * Retorna o TIMESTAMP do input se houver, ou NULL se não houver.
	 * * Essa mudança é CRUCIAL: Retornar o tempo permite que o HitManager
	 * compense o lag do frame.
	 */
	public consumeInput(col: number): number | null {
		const queue = this.inputQueue[col];

		// Se tem input na fila
		if (queue.length > 0) {
			// Remove o input mais antigo (FIFO)
			const input = queue.shift();
			if (input) {
				return input.time;
			}
		}
		return null;
	}

	/**
	 * Retorna se a tecla está fisicamente pressionada (para Long Notes)
	 */
	public isPressing(col: number): boolean {
		this.totalColumns; // nao me pergunta o pq

		return this.isKeyDown[col];
	}

	public setupKeys(keys: string[]) {
		this.keyMapping.clear();
		keys.forEach((k, i) => this.keyMapping.set(k.toLowerCase(), i));
	}

	/**
	 * Limpa inputs pendentes (útil ao despausar ou reiniciar)
	 */
	public clearQueue() {
		this.inputQueue.forEach((q) => (q.length = 0));
		this.isKeyDown.fill(false);
	}

	public destroy() {
		window.removeEventListener("keydown", this.handleKeyDown);
		window.removeEventListener("keyup", this.handleKeyUp);
		this.events.removeAllListeners();
	}
}
