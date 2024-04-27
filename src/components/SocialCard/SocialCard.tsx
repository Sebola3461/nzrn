import { useState } from "react";
import "./SocialCard.scss";

export function SocialCard({
	url,
	imageURL,
	text,
}: {
	url: string;
	imageURL: string;
	text: string;
}) {
	const [opacity, setOpacity] = useState(0);
	const [glow, setGlow] = useState("");

	const handleLink = () => {
		window.open(url);
	};

	const handleMouse = (mouse: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		const bounds = mouse.currentTarget.getBoundingClientRect();

		const mouseX = mouse.clientX;
		const mouseY = mouse.clientY;
		const leftX = mouseX - bounds.x;
		const topY = mouseY - bounds.y;
		const center = {
			x: leftX - bounds.width / 2,
			y: topY - bounds.height / 2,
		};

		setOpacity(1);

		setGlow(`radial-gradient(
      circle at
      ${center.x * 2 + bounds.width / 2}px
      ${center.y * 2 + bounds.height / 2}px,
      #4dbbc538,
      #0000000f
    )`);
	};

	const handleMouseLeave = () => {
		setOpacity(0);
	};

	return (
		<div
			className="social_card discord"
			onClick={() => handleLink()}
			onMouseMove={(mouse) => handleMouse(mouse)}
			onMouseLeave={() => handleMouseLeave()}
			style={
				{
					"--opacity": opacity,
					"--glow": glow,
				} as any
			}
		>
			<img src={imageURL} alt="Imagem de rede social" />
			<a href={url} target="_blank">
				{text}
			</a>
		</div>
	);
}
