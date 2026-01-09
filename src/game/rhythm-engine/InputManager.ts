import { EventEmitter } from "pixi.js";

export class InputManager {
	// Armazena se houve um novo clique (keydown) que ainda não foi processado
	private inputBuffer: boolean[];
	// Armazena o estado físico atual da tecla (pressionada ou não)
	private isKeyDown: boolean[];
	private keyMapping: Map<string, number> = new Map();
	public readonly events = new EventEmitter();

	constructor(totalColumns: number, initialKeys: string[]) {
		this.inputBuffer = new Array(totalColumns).fill(false);
		this.isKeyDown = new Array(totalColumns).fill(false);
		this.setupKeys(initialKeys);

		window.addEventListener("keydown", this.handleKeyDown);
		window.addEventListener("keyup", this.handleKeyUp);
	}

	/**
	 * Captura o pressionamento de teclas e gerencia atalhos e inputs de colunas.
	 */
	private handleKeyDown = (e: KeyboardEvent) => {
		const key = e.key.toLowerCase();
		const keycode = e.code.toLowerCase();

		// Atalhos de controle global
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

		// Ignora se a tecla não estiver mapeada ou se o SO estiver enviando repetição automática
		if (col === undefined || e.repeat) return;

		// Ativa o buffer de clique e o estado de "tecla segurada"
		this.inputBuffer[col] = true;
		this.isKeyDown[col] = true;
		this.events.emit("keyDown", col);
	};

	/**
	 * Captura quando o jogador solta a tecla.
	 */
	private handleKeyUp = (e: KeyboardEvent) => {
		const col = this.keyMapping.get(e.key.toLowerCase());
		if (col !== undefined) {
			this.isKeyDown[col] = false;
			// Ao soltar a tecla, qualquer clique pendente que não acertou nota é descartado
			this.inputBuffer[col] = false;
			this.events.emit("keyUp", col);
		}
	};

	/**
	 * Verifica se existe um clique de "tecla pressionada" aguardando processamento.
	 */
	public hasPendingHit(col: number): boolean {
		return this.inputBuffer[col];
	}

	/**
	 * Retorna se a tecla está sendo fisicamente segurada no momento (útil para Long Notes).
	 */
	public isPressing(col: number): boolean {
		return this.isKeyDown[col];
	}

	/**
	 * Reseta o buffer da coluna. Chamado após um acerto ser confirmado pela GameEngine.
	 */
	public consumeInput(col: number): void {
		this.inputBuffer[col] = false;
	}

	/**
	 * Configura o mapeamento entre teclas do teclado e índices das colunas.
	 */
	public setupKeys(keys: string[]) {
		this.keyMapping.clear();
		keys.forEach((k, i) => this.keyMapping.set(k.toLowerCase(), i));
	}

	/**
	 * Remove os listeners de eventos e limpa os emissores para evitar vazamento de memória.
	 */
	public destroy() {
		window.removeEventListener("keydown", this.handleKeyDown);
		window.removeEventListener("keyup", this.handleKeyUp);
		this.events.removeAllListeners();
	}
}
