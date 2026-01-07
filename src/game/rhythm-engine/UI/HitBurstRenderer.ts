import * as PIXI from "pixi.js";
import { HitObject } from "../MapParser";
import { CONSTANTS } from "../Constants";

interface ActiveBurst {
	sprite: PIXI.AnimatedSprite;
	column: number;
	isLN: boolean;
	life: number; // 1.0 (vivo) até 0.0 (morto)
	isDying: boolean;
}

export class HitBurstRenderer {
	private container: PIXI.Container = new PIXI.Container();
	private activeBursts: Set<ActiveBurst> = new Set();
	private textures: PIXI.Texture[] = [];
	private isReady: boolean = false;

	constructor(private stage: PIXI.Container, private app: PIXI.Application) {
		this.stage.addChild(this.container);
		this.container.sortableChildren = true;
		this.loadTextures();
	}

	private async loadTextures(): Promise<void> {
		const promises: Promise<PIXI.Texture>[] = [];
		for (let i = 0; i <= 10; i++) {
			const url = `/sprites/lightingL-${i}.png`;
			promises.push(PIXI.Assets.load(url));
		}

		try {
			this.textures = await Promise.all(promises);
			this.isReady = true;
		} catch (error) {
			console.error("Erro ao carregar sprites de iluminação:", error);
		}
	}

	public trigger(col: number, isLN: boolean = false): void {
		if (!this.isReady) return;

		const colW = this.app.screen.width / CONSTANTS.TOTAL_COLUMNS;
		const hitY =
			this.app.screen.height * CONSTANTS.HIT_POSITION_RATIO - 240 / 2 + 30;

		const animatedSprite = new PIXI.AnimatedSprite(this.textures);

		const baseScale = CONSTANTS.BURST_SCALE;
		animatedSprite.scale.set(baseScale * 1.2); // Pop inicial forte
		animatedSprite.anchor.set(0.5, 0);
		animatedSprite.x = col * colW + colW / 2;
		animatedSprite.y = hitY;
		animatedSprite.blendMode = "add";
		animatedSprite.animationSpeed = 1.5;
		animatedSprite.loop = isLN;
		animatedSprite.alpha = 1.0;

		const burst: ActiveBurst = {
			sprite: animatedSprite,
			column: col,
			isLN: isLN,
			life: 1.0,
			isDying: false,
		};

		// Se for TAP, a animação broxa
		animatedSprite.onComplete = () => {
			if (!burst.isLN) {
				burst.isDying = true;
			}
		};

		this.container.addChild(animatedSprite);
		this.activeBursts.add(burst);
		animatedSprite.gotoAndPlay(0);
	}

	public update(notes: HitObject[]): void {
		if (!this.isReady) return;

		const now = performance.now();
		const holdingCols = new Set(
			notes.filter((n) => n.holding && !n.isBroken).map((n) => n.column),
		);

		this.activeBursts.forEach((burst) => {
			// 1. Lógica de Long Notes (LN)
			if (burst.isLN) {
				if (!holdingCols.has(burst.column)) {
					// Soltou a LN: vira uma nota normal que vai morrer ao fim da animação
					burst.isLN = false;
					burst.sprite.loop = false;
				} else {
					// Feedback visual de "holding"
					const pulse =
						CONSTANTS.BURST_SCALE * (1 + Math.sin(now * 0.4) * 0.05);
					burst.sprite.scale.set(pulse);
					burst.sprite.alpha = 0.9 + Math.sin(now * 0.3) * 0.1;
				}
			}

			// 2. Lógica de Fade-Out
			// Se a animação acabou ou se a nota foi solta
			if (
				burst.isDying ||
				(!burst.isLN && burst.sprite.currentFrame >= this.textures.length - 1)
			) {
				burst.isDying = true;

				// Reduz o alpha e expande a escala simultaneamente
				burst.life -= 0.12; // Velocidade do fade (ajuste entre 0.05 e 0.2)
				burst.sprite.alpha = burst.life;

				// Expansão sutil durante o desaparecimento
				const expand = 1 + (1 - burst.life) * 0.2;
				burst.sprite.scale.set(CONSTANTS.BURST_SCALE * expand);

				if (burst.life <= 0) {
					this.removeBurst(burst);
				}
			} else if (!burst.isLN) {
				// Suaviza o impacto inicial enquanto a animação roda
				if (burst.sprite.scale.x > CONSTANTS.BURST_SCALE) {
					burst.sprite.scale.x -= 0.02;
					burst.sprite.scale.y -= 0.02;
				}
			}
		});
	}

	private removeBurst(burst: ActiveBurst): void {
		burst.sprite.stop();
		if (burst.sprite.parent) this.container.removeChild(burst.sprite);
		burst.sprite.destroy();
		this.activeBursts.delete(burst);
	}

	public clear(): void {
		this.activeBursts.forEach((burst) => {
			if (burst.sprite) burst.sprite.destroy();
		});
		this.activeBursts.clear();
		this.container.removeChildren();
	}
}
