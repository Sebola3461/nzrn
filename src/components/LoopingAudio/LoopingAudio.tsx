import { useEffect, useRef } from "react";

interface PerfectLoopAudioProps {
	src: string;
	volume?: number; // 0 → 1
}

export function LoopingAudio({ src, volume = 1 }: PerfectLoopAudioProps) {
	const audioCtxRef = useRef<AudioContext | null>(null);
	const sourceRef = useRef<AudioBufferSourceNode | null>(null);
	const gainRef = useRef<GainNode | null>(null);

	useEffect(() => {
		const unlockAndPlay = async () => {
			if (audioCtxRef.current) return;

			const audioCtx = new AudioContext();
			audioCtxRef.current = audioCtx;

			// iOS / Safari
			if (audioCtx.state === "suspended") {
				await audioCtx.resume();
			}

			const response = await fetch(src);
			const arrayBuffer = await response.arrayBuffer();
			const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

			const source = audioCtx.createBufferSource();
			source.buffer = audioBuffer;
			source.loop = true;

			const gain = audioCtx.createGain();
			gain.gain.setValueAtTime(0, audioCtx.currentTime);
			gain.gain.linearRampToValueAtTime(
				volume,
				audioCtx.currentTime + 0.05, // fade-in suave
			);

			source.connect(gain).connect(audioCtx.destination);
			source.start();

			sourceRef.current = source;
			gainRef.current = gain;

			window.removeEventListener("click", unlockAndPlay);
			window.removeEventListener("touchstart", unlockAndPlay);
			window.removeEventListener("keydown", unlockAndPlay);
		};

		window.addEventListener("click", unlockAndPlay, { once: true });
		window.addEventListener("touchstart", unlockAndPlay, { once: true });
		window.addEventListener("keydown", unlockAndPlay, { once: true });

		return () => {
			window.removeEventListener("click", unlockAndPlay);
			window.removeEventListener("touchstart", unlockAndPlay);
			window.removeEventListener("keydown", unlockAndPlay);

			sourceRef.current?.stop();
			audioCtxRef.current?.close();
		};
	}, [src, volume]);

	return null; // áudio invisível
}
