import { motion } from "framer-motion";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function AnimatedScrollContainer({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<motion.div
			className={className}
			initial="hidden"
			whileInView="visible"
			viewport={{ once: true, amount: 0.8 }}
			variants={{
				hidden: {
					opacity: 0,
					y: 20,
					scale: 1,
					filter: "blur(6px)",
				},
				visible: {
					opacity: 1,
					y: 0,
					scale: 1,
					filter: "blur(0px)",
					transition: {
						duration: 0.9,
						ease: EASE_OUT_EXPO,
						when: "beforeChildren",
					},
				},
			}}
		>
			{children}
		</motion.div>
	);
}
