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
				<h1 className="title">Socials</h1>
				<div className="list">
					<div className="social_card twitter">
						<img src="twitterx.png" alt="X Logo" />
						<a href="https://twitter.com/sebola3461" target="_blank">
							@sebola3461
						</a>
					</div>
					<div className="social_card github">
						<img src="github-mark-white.png" alt="GitHub Logo" />
						<a href="https://github.com/sebola3461" target="_blank">
							@sebola3461
						</a>
					</div>
					<div className="social_card discord">
						<img src="discord.png" alt="Discord Logo" />
						<a
							href="https://discord.com/users/556639598172962818"
							target="_blank"
						>
							@sebola3461
						</a>
					</div>
					<div className="social_card mail">
						<img src="gmail.png" alt="GMail Logo" />
						<a href="mailto:nzrn.dev@gmail.com" target="_blank">
							nzrn.dev@gmail.com
						</a>
					</div>
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
