import { useEffect, useState } from "react";

interface Props {
	className?: string;
	content: string;
	speed?: number;
	shouldAnimate?: boolean;
}

export function AnimatedText({
	className,
	content,
	speed,
	shouldAnimate,
}: Props) {
	const [text, setText] = useState("");

	const classList = ["animated_text"];

	// maybe move to helpers?
	if (className && className.trim()) {
		const sanitizedCustomClass = className
			.split(" ")
			.map((property) => property.trim())
			.filter((property) => property.length > 0);

		classList.push(...sanitizedCustomClass);
	}

	useEffect(() => {
		if (shouldAnimate == true) {
			let characterIndex = -1;
			let intervalId: number | null = null;
			let textTemp = "";

			const handleNewCharacter = () => {
				characterIndex++;
				const characterToAppend = content[characterIndex];

				if (characterToAppend) {
					textTemp = textTemp.concat(characterToAppend);

					setText(textTemp);
				}

				if (text.length >= content.length && intervalId !== null)
					clearInterval(intervalId);
			};

			intervalId = setInterval(() => handleNewCharacter(), speed || 20);
		} else {
			setText("");
		}
	}, [shouldAnimate]);

	return <span className={classList.join(" ")}>{text}</span>;
}
