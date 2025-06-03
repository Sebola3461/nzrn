import express, { Request, Response } from "express";
import path from "path";

const app = express();
const PORT = process.env.PORT || 31069;

const distPath = path.join(__dirname, "../../", "dist");
app.use(express.static(distPath));

app.get("/", (_req: Request, res: Response) => {
	res.sendFile(path.join(distPath, "index.html"));
});

app.get("/linkedin", (_req: Request, res: Response) => {
	res.redirect(
		"https://www.linkedin.com/in/paulo-ricardo-alves-campos-wysi727/",
	);
});

app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});
