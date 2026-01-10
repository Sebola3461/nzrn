import * as PIXI from "pixi.js";

export class JudgementRenderer {
	private container = new PIXI.Container();
	private activeSprite: PIXI.Sprite | null = null;

	// Armazena as texturas carregadas para não recarregar a cada hit
	private textures: Record<string, PIXI.Texture> = {};

	constructor(private stage: PIXI.Container, private app: PIXI.Application) {
		this.stage.addChild(this.container);

		// Posiciona o container no centro da tela (ajuste conforme necessário)
		this.container.position.set(
			this.app.screen.width / 2,
			this.app.screen.height * 0.45,
		);
	}

	public async loadAssets() {
		this.textures["MARAVELOUS"] = await PIXI.Assets.load("maravelous.png");
		this.textures["PERFECT"] = await PIXI.Assets.load("perfect.png");
		this.textures["GREAT"] = await PIXI.Assets.load("great.png");
		this.textures["GOOD"] = await PIXI.Assets.load("good.png");
		this.textures["MISS"] = await PIXI.Assets.load("miss.png");

		// Fallback para caso esqueça de carregar ou imagem não exista
		if (!this.textures["PERFECT"])
			console.warn("Texturas de Judgement não carregadas!");
	}

	public show(type: string) {
		const texture = this.textures[type];

		if (!texture) {
			console.error(`Textura não encontrada para o judgement: ${type}`);
			return;
		}

		// Se a sprite ainda não existe, cria ela
		if (!this.activeSprite) {
			this.activeSprite = new PIXI.Sprite(texture);
			this.activeSprite.anchor.set(0.5); // Centraliza o ponto de origem
			this.container.addChild(this.activeSprite);
		} else {
			// Se já existe, APENAS troca a imagem (substituição)
			this.activeSprite.texture = texture;
		}

		// --- RESET DA ANIMAÇÃO ---
		// Toda vez que chama show(), "reinicia" o estado da sprite atual

		// 1. Escala começa grande para fazer um efeito de "Pop" (diminuir)
		this.activeSprite.scale.set(1.4);

		// 2. Alpha total
		this.activeSprite.alpha = 1;

		// 3. Reseta rotação
		//this.activeSprite.rotation = (Math.random() - 0.5) * 0.1;
	}

	public update() {
		// Se não tem sprite ativa ou ela já sumiu, não faz nada
		if (!this.activeSprite || this.activeSprite.alpha <= 0) return;

		const dt = this.app.ticker.deltaTime;

		// 1. Efeito de "Pop": Interpola a escala de onde está (1.4) até 1.0
		// O valor 0.15 controla a velocidade do pop (quanto maior, mais rápido)
		const targetScale = 1.0;
		this.activeSprite.scale.x +=
			(targetScale - this.activeSprite.scale.x) * 0.15 * dt;
		this.activeSprite.scale.y +=
			(targetScale - this.activeSprite.scale.y) * 0.15 * dt;

		// 2. Fade Out: Começa a desaparecer.
		// Ajuste 0.02 para ser mais rápido ou mais lento.
		this.activeSprite.alpha -= 0.015 * dt;

		// Limpeza simples se ficar invisível
		if (this.activeSprite.alpha <= 0) {
			this.activeSprite.visible = false;
		} else {
			this.activeSprite.visible = true;
		}
	}

	public clear(): void {
		if (this.activeSprite) {
			this.activeSprite.destroy();
			this.activeSprite = null;
		}
		this.container.removeChildren();
	}
}
