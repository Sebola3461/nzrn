import * as PIXI from "pixi.js";
import { HitObject } from "../MapParser";
import { CONSTANTS } from "../Constants";

interface ActiveBurst {
	sprite: PIXI.AnimatedSprite;
	column: number;
	isLN: boolean;
	createdAt: number;
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
			this.app.screen.height * CONSTANTS.HIT_POSITION_RATIO - 240 / 2 + 20; // math :fire:

		const animatedSprite = new PIXI.AnimatedSprite(this.textures);

		// --- FEELING DO OSU: SCALE & POP ---
		// Começamos com uma escala levemente maior para o impacto inicial
		const baseScale = CONSTANTS.BURST_SCALE;
		animatedSprite.scale.set(baseScale * 1.1);

		// Posicionamento exato (removido o offset fixo que matava a renderização)
		animatedSprite.anchor.set(0.5, 0);
		animatedSprite.x = col * colW + colW / 2;
		animatedSprite.y = hitY;

		// Visual "Glow" do osu!
		animatedSprite.blendMode = "add";

		// No osu! mania, o burst é rápido. 1.0 ou mais é ideal.
		animatedSprite.animationSpeed = 1.2;
		animatedSprite.loop = isLN;

		const burst: ActiveBurst = {
			sprite: animatedSprite,
			column: col,
			isLN: isLN,
			createdAt: performance.now(),
		};

		animatedSprite.onComplete = () => {
			if (!burst.isLN) this.removeBurst(burst);
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
			if (burst.isLN) {
				if (!holdingCols.has(burst.column)) {
					burst.isLN = false;
					burst.sprite.loop = false;
				} else {
					// Efeito de vibração contínua enquanto segura (LN do osu!)
					const pulse =
						CONSTANTS.BURST_SCALE * (1 + Math.sin(now * 0.4) * 0.05);
					burst.sprite.scale.set(pulse);
				}
			} else {
				// Suaviza a escala de volta ao normal após o impacto inicial
				if (burst.sprite.scale.x > CONSTANTS.BURST_SCALE) {
					burst.sprite.scale.x -= 0.01;
					burst.sprite.scale.y -= 0.01;
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
		this.activeBursts.forEach((burst) => burst.sprite.destroy());
		this.activeBursts.clear();
		this.container.removeChildren();
	}
}
