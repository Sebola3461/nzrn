import React, { useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { GameEngine } from "./rhythm-engine/GameEngine";
import "./Mania.scss";
import { Charts } from "./rhythm-engine/Charts";

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

export const Game: React.FC = () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const engineRef = useRef<GameEngine | null>(null);
	const [scoreData, setScoreData] = useState(defaultScoreData);
	const [selectedMap, setSelectedMap] = useState(-1);
	const [isGameRunning, setIsGameRunning] = useState(false);
	const [isPaused, setPaused] = useState(false);

	// Suas medidas exatas
	const GAME_WIDTH = 280 * 1.2; // 336px
	const GAME_HEIGHT = window.innerHeight * 0.9; // 840px

	const startGame = (mapa: (typeof Charts)[0]) => {
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

					app.ticker.maxFPS = 240;

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

					engine.events.on("init", () => {
						setIsGameRunning(true);
						setPaused(false);
					});
				};

				init();
			});
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
			</div>
		</div>
	);
};
