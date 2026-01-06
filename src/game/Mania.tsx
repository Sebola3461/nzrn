import React, { useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { GameEngine } from "./rhythm-engine/GameEngine";
import "./Mania.scss";
import { Charts } from "./rhythm-engine/Charts";
import { INITIAL_KEYS } from "./rhythm-engine/Constants";

const defaultScoreData = {
	score: 0,
	combo: 0,
	maxCombo: 0,
	rank: "SS",
	acc: "100",
	hits: {
		PERFECT: 0,
		GREAT: 0,
		GOOD: 0,
		MISS: 0,
	},
};

if (
	!localStorage.getItem("keybinds") ||
	localStorage.getItem("keybinds")?.split(",").length != 4
) {
	localStorage.keybinds = "d,f,j,k";
}

export const Game: React.FC = () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const engineRef = useRef<GameEngine | null>(null);
	const [scoreData, setScoreData] = useState(defaultScoreData);
	const [selectedMap, setSelectedMap] = useState(-1);
	const [isGameRunning, setIsGameRunning] = useState(false);
	const [isPaused, setPaused] = useState(false);
	const [currentChangingBinds, setCurrentChangingBinds] = useState(-1);

	// Suas medidas exatas
	const GAME_WIDTH = 280 * 1.2; // 336px
	const GAME_HEIGHT = window.innerHeight * 0.9; // 840px

	const startGame = (mapa: (typeof Charts)[0]) => {
		if (engineRef.current) {
			engineRef.current.destroy();
		}

		fetch(`/beatmap_assets/${mapa.id}/map.txt`)
			.then((r) => r.text())
			.then((mapaData) => {
				const init = async () => {
					if (!containerRef.current) return;

					const app = new PIXI.Application();
					await app.init({
						width: GAME_WIDTH,
						height: GAME_HEIGHT,
						antialias: false,
						resolution: window.devicePixelRatio || 1,
						backgroundColor: 0x0a0a0c,
					});

					containerRef.current.appendChild(app.canvas);
					const engine = new GameEngine(app);
					await engine.init(mapaData, `/beatmap_assets/${mapa.id}/audio.mp3`);

					app.ticker.minFPS = 999;
					app.ticker.maxFPS = 999;

					engineRef.current = engine;

					engine.events.on("hit", () => {
						const s = engine.getScore();
						setScoreData({
							score: s.score,
							combo: s.combo,
							acc: s.accuracy.toFixed(1),
							rank: s.rank,
							hits: s.hits,
							maxCombo: s.maxCombo,
						});
					});

					engine.events.on("restart", () => {
						setScoreData(defaultScoreData);
						setPaused(false);
					});

					engine.events.on("pause", () => {
						setPaused(true);
					});

					engine.events.on("resume", () => {
						setPaused(false);
					});

					engine.events.on("started", () => {
						setIsGameRunning(true);
						setPaused(false);
					});
				};

				init();
			});
	};

	const requestChangeKey = (column: number) => {
		setCurrentChangingBinds(column);
		const keydownHandle = (ev: KeyboardEvent) => {
			const currentSettings =
				localStorage.getItem("keybinds")?.split(",") || INITIAL_KEYS;

			currentSettings[column] = ev.key;

			localStorage.keybinds = currentSettings.join(",");

			setCurrentChangingBinds(-1);

			engineRef.current?.inputManager.setupKeys(currentSettings);

			window.removeEventListener("keydown", keydownHandle);
		};

		window.addEventListener("keydown", keydownHandle);
	};

	if (selectedMap < 0)
		return (
			<div className="beatmania_game">
				<div className="song_listing">
					<span className="text big">Song Selection</span>
					{Charts.map((c, i) => (
						<div
							className="beatmap_selector container"
							onClick={() => {
								setSelectedMap(i);
								startGame(c);
							}}
						>
							<div
								className="image"
								style={{
									backgroundImage: `url(beatmap_assets/${Charts[i].id}/bg.jpg)`,
								}}
							></div>
							<div className="metadata">
								<span className="big text">{c.title}</span>
								<span className="artist text">{c.artist}</span>
							</div>
						</div>
					))}
				</div>
			</div>
		);

	const currentSettings =
		localStorage.getItem("keybinds")?.split(",") || INITIAL_KEYS;

	return (
		<div className="beatmania_game">
			<div className="column right">
				<div className="song_details container">
					<span className="big text">{Charts[selectedMap].title}</span>
					<span className="medium text">{Charts[selectedMap].artist}</span>
				</div>
				<div className="song_details container">
					<span className="text">
						Duration: {Charts[selectedMap].duration} / Notes:{" "}
						{Charts[selectedMap].notes} / LNs: {Charts[selectedMap].longs}
					</span>
				</div>
				<div className="song_details container">
					<div
						className="map_background"
						style={{
							backgroundImage: `url(beatmap_assets/${Charts[selectedMap].id}/bg.jpg)`,
						}}
					></div>
				</div>
			</div>
			<div ref={containerRef} className="pixi-container">
				<button
					onClick={() => engineRef.current?.start()}
					className="start_button"
					data-visible={!isGameRunning}
				>
					<span className="text">Start</span>
				</button>
				<div className="pause_overlay" data-visible={isPaused}>
					<span className="text big">Pause</span>
					<button
						onClick={() => engineRef.current?.resume()}
						className="pause_overlay_button"
					>
						<span className="text">Resume</span>
					</button>
					<button
						onClick={() => engineRef.current?.restart()}
						className="pause_overlay_button"
					>
						<span className="text">Restart</span>
					</button>
					<button
						onClick={() => {
							engineRef.current?.destroy();
							setSelectedMap(-1);
						}}
						className="pause_overlay_button"
					>
						<span className="text">Quit</span>
					</button>
				</div>
			</div>
			<div className="column left">
				<div className="song_details container">
					<span className="big text">
						{String(scoreData.score).padStart(9, "0")}
					</span>
				</div>
				<div className="song_details container">
					<span className="medium text">
						Acc: {scoreData.acc}% / Rank: {scoreData.rank}
					</span>
				</div>
				<div className="song_details container">
					<span className="text">
						Perfect: {scoreData.hits.PERFECT} / Great: {scoreData.hits.GREAT} /
						Good: {scoreData.hits.GOOD} / Miss: {scoreData.hits.MISS}
					</span>
				</div>
				<div className="song_details container">
					<span className="text">
						Combo: {scoreData.combo}x / Max Combo: {scoreData.maxCombo}x
					</span>
				</div>
				<div className="song_details container">
					<span className="text">
						Volume:{" "}
						<input
							type="range"
							min={0}
							max={1}
							step={0.01}
							defaultValue={0.01}
							onChange={(e) =>
								engineRef.current?.clock.setVolume(Number(e.target.value))
							}
						/>{" "}
						/ SV: {engineRef.current?.getScrollSpeed().toFixed(2) || "-"}x /
						Offset: {engineRef.current?.getOffset() || "-"}
					</span>
				</div>
				<div className="song_details container row">
					{currentSettings.map((key, i) => (
						<div
							className="song_details container"
							data-selected={currentChangingBinds == i}
							onClick={() => requestChangeKey(i)}
							key={i}
						>
							<span className="text big">{key}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
