import { useEffect, useState } from "react";
import { AnimatedText } from "../../components/AnimatedText/AnimatedText";
import { SocialCard } from "../../components/SocialCard/SocialCard";
import "./Home.scss";
import { AnimatedScrollContainer } from "../../components/AnimatedScrollContainer/AnimatedScrollContainer";
import { getAge } from "../../helpers/getAge";
import { CustomMouseOverlay } from "../../components/CustomMouse/CustomMouseOverlay";

// import { Navbar } from "../../components/Navbar/Navbar";

export function Home() {
	const [aboutSectionTitleOffset, setAboutSectionTitleOffset] = useState(0);
	const [shouldAnimateDevTitle, setShouldAnimateDevTitle] = useState(false);

	useEffect(() => {
		setAboutSectionTitleOffset(
			document.querySelector("div.dev_section")?.getBoundingClientRect().top ||
				0,
		);

		const searchParams = new URLSearchParams(window.location.search);

		if (searchParams.get("redirect") == "linkedin") {
			return window.location.replace(
				"https://www.linkedin.com/in/paulo-ricardo-alves-campos-wysi727/",
			);
		}
	}, []);

	const handleDevSectionAnimationProgress = () => {
		setShouldAnimateDevTitle(true);
	};

	return (
		<>
			<CustomMouseOverlay />
			<div className="home_layout">
				{/* <Navbar /> */}
				<div className="header_section">
					<img src="miku.png" className="miku" />
					<div className="texts">
						<h1 className="title">nzrn</h1>
						<div className="hobbies">
							<span>dev</span>
							<span>gaming</span>
							<span>music</span>
						</div>
						<div className="about">
							Very chill guy who likes vocaloid songs and programming
						</div>
					</div>
				</div>
				<div className="social_section">
					{/* <h1 className="title">Socials</h1> */}
					<div className="list">
						<SocialCard
							imageURL="twitterx.png"
							url="https://twitter.com/sebola3461"
							text="@sebola3461"
						/>
						<SocialCard
							imageURL="github-mark-white.png"
							url="https://github.com/sebola3461"
							text="@sebola3461"
						/>
						<SocialCard
							imageURL="discord.png"
							url="https://discord.com/users/556639598172962818"
							text="@sebola3461"
						/>
						<SocialCard
							imageURL="gmail.png"
							url="mailto:nzrn.dev@gmail.com"
							text="nzrn.dev@gmail.com"
						/>
					</div>
				</div>
				<div className="see_more">
					<div className="bar" />
					<span>More about me</span>
					<div className="bar" />
				</div>
				<AnimatedScrollContainer
					animationDuration="1000ms"
					className="about_section"
					onAnimate={() => handleDevSectionAnimationProgress()}
					data-scrollPosition={`${aboutSectionTitleOffset}px`}
				>
					<h1 className="title" id="programming">
						<AnimatedText
							content="Lemme talk about me..."
							shouldAnimate={shouldAnimateDevTitle}
							speed={80}
						/>
					</h1>
					<div className="horizontal_split">
						<div className="text">
							My name is <span className="name">Paulo</span>. Nice to meet you!
							I'm a {getAge()} years old person that loves{" "}
							<a href="https://wikipedia.org/wiki/Vocaloid" target="_blank">
								Vocaloid
								<span className="background" />
							</a>{" "}
							songs, gaming, and programming. I made this website to be a thing
							that I can show to any person who wants to know a bit more about
							me.
						</div>

						<img src="mikuya.png" width="30%" className="miku" />
					</div>
				</AnimatedScrollContainer>
			</div>
		</>
	);
}
