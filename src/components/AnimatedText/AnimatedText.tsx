import { motion } from "framer-motion";
import "./AnimatedText.scss";

interface Props {
	className?: string;
	content: string;
	speed?: number;
}

export function AnimatedText({ className, content, speed = 30 }: Props) {
	const classList = ["animated_text"];

	if (className?.trim()) {
		classList.push(
			...className
				.split(" ")
				.map((c) => c.trim())
				.filter(Boolean),
		);
	}

	return (
		<motion.span
			className={classList.join(" ")}
			variants={{
				hidden: {},
				visible: {
					transition: {
						staggerChildren: speed / 1000,
					},
				},
			}}
			style={{ display: "inline-block", whiteSpace: "pre-wrap" }}
		>
			{content.split("").map((char, i) => (
				<motion.span
					key={i}
					variants={{
						hidden: { opacity: 0 },
						visible: { opacity: 1 },
					}}
				>
					{char}
				</motion.span>
			))}
		</motion.span>
	);
}
