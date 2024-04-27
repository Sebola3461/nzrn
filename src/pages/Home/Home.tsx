import { SocialCard } from "../../components/SocialCard/SocialCard";
import "./Home.scss";

// import { Navbar } from "../../components/Navbar/Navbar";

export function Home() {
	return (
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
			{/* <div className="dev_section">
				<h1 className="title" id="programming">
					Programming
				</h1>
				<div className="listing">
					<div className="dev_card">

					</div>
				</div>
			</div> */}
		</div>
	);
}
