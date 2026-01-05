export class AudioClock {
	private context: AudioContext;
	private source: AudioBufferSourceNode | null = null;
	private buffer: AudioBuffer | null = null;
	private startTime: number = 0;
	private pauseTime: number = 0; // Tempo em que o áudio foi pausado
	private isPlaying: boolean = false;
	public offset: number = 0;

	constructor() {
		this.context = new AudioContext();
	}

	async load(url: string) {
		const res = await fetch(url);
		const data = await res.arrayBuffer();
		this.buffer = await this.context.decodeAudioData(data);
	}

	play() {
		if (!this.buffer || this.isPlaying) return;

		this.source = this.context.createBufferSource();
		this.source.buffer = this.buffer;
		this.source.connect(this.context.destination);

		// Começa a partir do tempo pausado
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
		this.pauseTime = 0; // Zera o progresso da música
		this.startTime = 0; // Zera a referência de tempo do contexto
	}

	seek(timeSeconds: number) {
		const wasPlaying = this.isPlaying;
		if (wasPlaying) this.stop();
		this.pauseTime = timeSeconds;
		if (wasPlaying) this.play();
	}

	getTime() {
		if (!this.isPlaying) return this.pauseTime * 1000 + this.offset;
		return (this.context.currentTime - this.startTime) * 1000 + this.offset;
	}
}
