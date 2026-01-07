import * as PIXI from "pixi.js";

export class JudgementRenderer {
	private container = new PIXI.Container();
	private animations: { text: PIXI.Text; dt: number }[] = [];

	constructor(private stage: PIXI.Container, private app: PIXI.Application) {
		this.stage.addChild(this.container);
	}

	public show(txt: string, color: number, yOffset: number = 0) {
		const j = new PIXI.Text({
			text: txt,
			style: {
				fill: color,
				fontSize: 30,
				fontWeight: "900",
				fontFamily: "Arial Black",
				stroke: { color: 0x000000, width: 6 },
			},
		});

		j.anchor.set(0.5);
		j.position.set(
			this.app.screen.width / 2,
			this.app.screen.height * 0.45 + yOffset,
		);
		j.scale.set(1.5);

		this.container.addChild(j);
		this.animations.push({ text: j, dt: 0 });
	}

	public update() {
		const dt = this.app.ticker.deltaTime;
		for (let i = this.animations.length - 1; i >= 0; i--) {
			const anim = this.animations[i];
			anim.text.scale.x += (1 - anim.text.scale.x) * 0.2 * dt;
			anim.text.scale.y += (1 - anim.text.scale.y) * 0.2 * dt;
			anim.text.alpha -= 0.05 * dt;

			if (anim.text.alpha <= 0) {
				anim.text.destroy();
				this.animations.splice(i, 1);
			}
		}
	}

	public clear(): void {
		this.animations.forEach((anim) => anim.text.destroy());
		this.animations = [];
		this.container.removeChildren();
	}
}
