import { ReactNode, useEffect, useRef, useState } from "react";
import "./AnimatedScrollContainer.scss";

interface Props {
	children?: ReactNode[] | ReactNode;
	className?: string;
	animationDuration?: `${string}${"ms" | "s"}`;
	onAnimate?: () => void;
}

export function AnimatedScrollContainer({
	animationDuration,
	children,
	className,
	onAnimate,
}: Props) {
	const [isVisible, setVisibility] = useState(false);
	const container = useRef<HTMLDivElement>(null);

	const classList = ["animated_scroll_container"];

	// maybe move to helpers?
	if (className && className.trim()) {
		const sanitizedCustomClass = className
			.split(" ")
			.map((property) => property.trim())
			.filter((property) => property.length > 0);

		classList.push(...sanitizedCustomClass);
	}

	useEffect(() => {
		const handleScroll = () => {
			if (container.current) {
				const elementTop = Math.abs(
					container.current.getBoundingClientRect().top -
						container.current.getBoundingClientRect().bottom,
				); // A lot of calculations to get scroll position of the element relative to <html> scrollTop

				const html = document.querySelector("html");
				const currentPosition =
					(html?.getBoundingClientRect().height || 0) -
					(html?.getBoundingClientRect().bottom || 0);
				const triggerPoint = elementTop - 10;

				console.log(elementTop, triggerPoint, currentPosition);

				const newState = currentPosition >= triggerPoint;

				if (!isVisible && newState) {
					setVisibility(newState);

					if (onAnimate) onAnimate();
				}
			}
		};

		handleScroll();

		window.onscroll = handleScroll;
	}, []);

	return (
		<div
			className={classList.join(" ")}
			ref={container}
			data-visible={isVisible}
			style={{
				animationDuration: animationDuration,
			}}
		>
			{children}
		</div>
	);
}
