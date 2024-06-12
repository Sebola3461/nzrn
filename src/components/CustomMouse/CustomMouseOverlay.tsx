import { useState } from "react";
import { detectDevice } from "../../helpers/detectDevice";
import "./CustomMouseOverlay.scss";

export function CustomMouseOverlay() {
	if (detectDevice() != "Desktop") return <></>;

	const [mousePosition, setMousePosition] = useState([0, 0]);
	const [mouseHolding, setMouseHolding] = useState(false);
	const [showMouse, setShowMouse] = useState(true);

	const handleMouseVisibility = (shouldShowMouse: boolean) => {
		setShowMouse(shouldShowMouse);
	};

	const handleMouse = (mouse: MouseEvent) => {
		if (!mouse) return;

		if (mouse.buttons != 0 && mouseHolding == false) setMouseHolding(true);
		if (mouse.buttons == 0 && mouseHolding == true) setMouseHolding(false);

		if (showMouse == false) handleMouseVisibility(true);

		setMousePosition([mouse.x, mouse.y]);
	};

	const handleMouseHolding = (isHolding: boolean) => {
		setMouseHolding(isHolding);
	};

	window.onmouseenter = handleMouse;
	window.onmouseleave = () => handleMouseVisibility(false);
	window.onmousedown = () => handleMouseHolding(true);
	window.onmouseup = () => handleMouseHolding(false);
	window.onmousemove = handleMouse;

	return (
		<div
			className="mouse"
			data-holding={mouseHolding}
			data-visible={showMouse}
			style={{
				left: `${mousePosition[0]}px`,
				top: `${mousePosition[1]}px`,
			}}
		></div>
	);
}
