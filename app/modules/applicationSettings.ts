export interface CustomTheme
{
	bg: string;
	bgSubdued: string;
	bgHighlight: string;
	text: string;
	textSubdued: string;
	textHighlight: string;
}


export const themes =
[
	"Minimal",
	"Ice",
	"Ink",
	"Inky"
] as const;


export type ThemeValue = typeof themes[number] | "Custom";


export const languages =
[
	{value: "en", name: "English"},
	{value: "it", name: "Italian"},
	{value: "zh", name: "Chinese"},
] as const;


export const defaultCustomTheme: CustomTheme =
{
	bg: "#202020",
	bgSubdued: "#281d17",
	bgHighlight: "#341539",
	text: "#dfdfdf",
	textSubdued: "#bb8e51",
	textHighlight: "#d6b4fc"
};


export function getStoredTheme(): ThemeValue
{
	const value = localStorage.getItem("theme");

	if (
		value === "Minimal" ||
		value === "Ice" ||
		value === "Ink" ||
		value === "Inky" ||
		value === "Custom"
	)
		return value;

	return "Minimal";
}


export function getStoredCustomTheme(): CustomTheme
{
	const stored = localStorage.getItem("customTheme");

	if (!stored)
		return defaultCustomTheme;

	try
	{
		const value = JSON.parse(stored);

		if (
			typeof value?.bg !== "string" ||
			typeof value?.bgSubdued !== "string" ||
			typeof value?.bgHighlight !== "string" ||
			typeof value?.text !== "string" ||
			typeof value?.textSubdued !== "string" ||
			typeof value?.textHighlight !== "string"
		)
			return defaultCustomTheme;

		return value;
	}
	catch
	{
		return defaultCustomTheme;
	}
}


export function getStoredLanguage(): string
{
	return localStorage.getItem("language") || "en";
}


export function applyTheme(theme: ThemeValue, customTheme: CustomTheme): void
{
	const root = document.documentElement;

	if (theme === "Custom")
	{
		root.removeAttribute("data-theme");

		root.style.setProperty("--color-bg", customTheme.bg);
		root.style.setProperty("--color-bg-subdued", customTheme.bgSubdued);
		root.style.setProperty("--color-bg-highlight", customTheme.bgHighlight);
		root.style.setProperty("--color-text", customTheme.text);
		root.style.setProperty("--color-text-subdued", customTheme.textSubdued);
		root.style.setProperty("--color-text-highlight", customTheme.textHighlight);
	}
	else if (theme === "Minimal")
	{
		root.removeAttribute("data-theme");

		root.style.removeProperty("--color-bg");
		root.style.removeProperty("--color-bg-subdued");
		root.style.removeProperty("--color-bg-highlight");
		root.style.removeProperty("--color-text");
		root.style.removeProperty("--color-text-subdued");
		root.style.removeProperty("--color-text-highlight");
	}
	else
	{
		root.setAttribute("data-theme", theme);

		root.style.removeProperty("--color-bg");
		root.style.removeProperty("--color-bg-subdued");
		root.style.removeProperty("--color-bg-highlight");
		root.style.removeProperty("--color-text");
		root.style.removeProperty("--color-text-subdued");
		root.style.removeProperty("--color-text-highlight");
	}


	localStorage.setItem("theme", theme);

	if (theme === "Custom")
	{
		localStorage.setItem(
			"customTheme",
			JSON.stringify(customTheme)
		);
	}
}


export function applyLanguage(language: string): void
{
	document.documentElement.setAttribute(
		"data-language",
		language
	);

	localStorage.setItem(
		"language",
		language
	);
}