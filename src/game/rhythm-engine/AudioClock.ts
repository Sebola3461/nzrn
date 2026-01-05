export class AudioClock {
	private context: AudioContext;
	private source: AudioBufferSourceNode | null = null;
	private buffer: AudioBuffer | null = null;
	private gainNode: GainNode; // Nó de controle de volume

	private startTime: number = 0;
	private pauseTime: number = 0;
	private isPlaying: boolean = false;
	private currentVolume: number = 0.6;

	public offset: number = 0;

	constructor() {
		this.context = new AudioContext();
		// Inicializa o GainNode e o conecta à saída principal (alto-falantes)
		this.gainNode = this.context.createGain();
		this.gainNode.connect(this.context.destination);
	}

	async load(url: string) {
		const res = await fetch(url);
		const data = await res.arrayBuffer();
		this.buffer = await this.context.decodeAudioData(data);
	}

	/**
	 * Define o volume (0.0 a 1.0 para normal, > 1.0 para ganho extra)
	 */
	public setVolume(value: number) {
		this.currentVolume = value;
		// Transição suave para evitar estalos (cliques) no áudio
		this.gainNode.gain.setTargetAtTime(value, this.context.currentTime, 0.01);
	}

	public getVolume(): number {
		return this.currentVolume;
	}

	play() {
		if (!this.buffer || this.isPlaying) return;

		// Se o contexto estiver suspenso (política de navegadores), retoma-o
		if (this.context.state === "suspended") {
			this.context.resume();
		}

		this.source = this.context.createBufferSource();
		this.source.buffer = this.buffer;

		// CONEXÃO: Fonte -> GainNode -> Saída Final
		this.source.connect(this.gainNode);

		this.startTime = this.context.currentTime - this.pauseTime;
		this.source.start(0, this.pauseTime);
		this.isPlaying = true;
	}

	stop() {
		if (!this.isPlaying) return;

		this.pauseTime = this.context.currentTime - this.startTime;
		this.source?.stop();
		this.source = null;
		this.isPlaying = false;
	}

	public fullStop() {
		this.source?.stop();
		this.source = null;
		this.isPlaying = false;
		this.pauseTime = 0;
		this.startTime = 0;
	}

	seek(timeSeconds: number) {
		const wasPlaying = this.isPlaying;
		if (wasPlaying) this.stop();

		this.pauseTime = Math.max(0, timeSeconds);

		if (wasPlaying) this.play();
	}

	getTime() {
		if (!this.isPlaying) {
			return this.pauseTime * 1000 + this.offset;
		}
		return (this.context.currentTime - this.startTime) * 1000 + this.offset;
	}

	getDuration() {
		return this.buffer ? this.buffer.duration * 1000 : 0;
	}
}
