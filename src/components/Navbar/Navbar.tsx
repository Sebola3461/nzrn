import "./Navbar.scss";

export function Navbar() {
	return (
		<nav className="navbar">
			<a href="#" aria-label="Home">
				Home
			</a>
			<a href="#social" aria-label="Social">
				Social
			</a>
			<a href="#programming" aria-label="Programming">
				Programming
			</a>
			<a href="#games" aria-label="Games">
				Games
			</a>
		</nav>
	);
}
