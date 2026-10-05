import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { applyLanguage, applyTheme, getStoredCustomTheme, getStoredLanguage, getStoredTheme } from "./modules/applicationSettings";


const root = document.getElementById("root");

if (!root)
	throw new Error("Root element not found.");


applyTheme(
	getStoredTheme(),
	getStoredCustomTheme()
);

applyLanguage(
	getStoredLanguage()
);


document.addEventListener(
	"wheel",
	event =>
	{
		const target = event.target;

		if (
			target instanceof HTMLInputElement &&
			target.type === "text"
		)
		{
			target.scrollTop = 0;
			event.preventDefault();
		}
	},
	{
		capture: true,
		passive: false
	}
);


createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>
);