import React from "react";
import ReactDOM from "react-dom/client";
import "./main.scss";
import { Home } from "./pages/Home/Home";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<Home />
	</React.StrictMode>,
);
