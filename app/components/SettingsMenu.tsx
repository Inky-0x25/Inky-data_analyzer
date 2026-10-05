import { useEffect, useState } from "react";

import { Project } from "../../shared/models/Project";

import {
	applyTheme,
	CustomTheme,
	getStoredCustomTheme,
	getStoredLanguage,
	getStoredTheme,
	languages,
	themes,
	ThemeValue
} from "../modules/applicationSettings";
import { setLanguage as changeLanguage, t } from "../modules/i18n";


interface SettingsMenuProperties
{
	project: Project;
}


export function SettingsMenu({project}: SettingsMenuProperties)
{
	void project;

	const [styleOpen, setStyleOpen] = useState(false);
	const [languageOpen, setLanguageOpen] = useState(false);

	const [theme, setTheme] = useState<ThemeValue>(
		getStoredTheme()
	);

	const [customTheme, setCustomTheme] = useState<CustomTheme>(
		getStoredCustomTheme()
	);

	const [language, setLanguage] = useState(
		getStoredLanguage()
	);


	useEffect(() =>
	{
		const updateLanguage = (): void =>
		{
			setLanguage(getStoredLanguage());
		};

		window.addEventListener("languagechange", updateLanguage);

		return () =>
		{
			window.removeEventListener("languagechange", updateLanguage);
		};
	}, []);


	function updateCustomTheme(key: keyof CustomTheme, value: string): void
	{
		const nextTheme =
		{
			...customTheme,
			[key]: value
		};

		setCustomTheme(nextTheme);

		if (theme === "Custom")
		{
			applyTheme(
				"Custom",
				nextTheme
			);
		}
		else
		{
			localStorage.setItem(
				"customTheme",
				JSON.stringify(nextTheme)
			);
		}
	}


	function selectTheme(value: ThemeValue): void
	{
		setTheme(value);

		applyTheme(
			value,
			customTheme
		);
	}


	function selectLanguage(value: string): void
	{
		changeLanguage(value);
	}


	function openStyle(): void
	{
		setStyleOpen(true);
		setLanguageOpen(false);
	}


	function openLanguage(): void
	{
		setLanguageOpen(true);
		setStyleOpen(false);
	}


	function closeStyle(): void
	{
		setStyleOpen(false);
	}


	function closeLanguage(): void
	{
		setLanguageOpen(false);
	}


	function getLanguageName(value: string): string
	{
		if (value === "en")
			return t("english");

		if (value === "it")
			return t("italian");

		if (value === "zh")
			return t("chinese");

		return value;
	}


	return (
		<li className="dropdown">
			<p>
				{t("settings")}
			</p>

			<ul className="dropdown-menu">
				<li>
					<button onClick={openStyle}>
						{t("style")}
					</button>
				</li>

				<li>
					<button onClick={openLanguage}>
						{t("language")}
					</button>
				</li>
			</ul>


			{styleOpen && (
				<div className="popupBox">
					<div className="popupPanel">
						<button
							className="popupCloseBtn"
							onClick={closeStyle}
						>
							X
						</button>

						<h1>{t("style")}</h1>

						<div className="vBox mdSpaceBox">
							<h3>{t("theme")}</h3>

							<div className="vBox smSpaceBox">
								{themes.map(themeName => (
									<label
										key={themeName}
										className="hBox smSpaceBox"
									>
										<input
											type="radio"
											name="theme"
											checked={theme === themeName}
											onChange={() =>
												selectTheme(themeName)
											}
										/>

										<span>{themeName}</span>
									</label>
								))}

								<label className="hBox smSpaceBox">
									<input
										type="radio"
										name="theme"
										checked={theme === "Custom"}
										onChange={() =>
											selectTheme("Custom")
										}
									/>

									<span>{t("custom")}</span>
								</label>
							</div>


							<div
								className={`hBox xxxlSpaceBox ${theme !== "Custom" ? "disabled" : ""}`}
							>
								<div className="vBox smSpaceBox">
									<h3>{t("backgroundColors")}</h3>

									<label className="spaceBetweenBox">
										<span>{t("background")}</span>

										<input
											type="color"
											value={customTheme.bg}
											disabled={theme !== "Custom"}
											onChange={event =>
												updateCustomTheme(
													"bg",
													event.target.value
												)
											}
										/>
									</label>

									<label className="spaceBetweenBox">
										<span>{t("subduedBackground")}</span>

										<input
											type="color"
											value={customTheme.bgSubdued}
											disabled={theme !== "Custom"}
											onChange={event =>
												updateCustomTheme(
													"bgSubdued",
													event.target.value
												)
											}
										/>
									</label>

									<label className="spaceBetweenBox">
										<span>{t("highlightBackground")}</span>

										<input
											type="color"
											value={customTheme.bgHighlight}
											disabled={theme !== "Custom"}
											onChange={event =>
												updateCustomTheme(
													"bgHighlight",
													event.target.value
												)
											}
										/>
									</label>
								</div>


								<div className="vBox smSpaceBox">
									<h3>{t("textColors")}</h3>

									<label className="spaceBetweenBox">
										<span>{t("text")}</span>

										<input
											type="color"
											value={customTheme.text}
											disabled={theme !== "Custom"}
											onChange={event =>
												updateCustomTheme(
													"text",
													event.target.value
												)
											}
										/>
									</label>

									<label className="spaceBetweenBox">
										<span>{t("subduedText")}</span>

										<input
											type="color"
											value={customTheme.textSubdued}
											disabled={theme !== "Custom"}
											onChange={event =>
												updateCustomTheme(
													"textSubdued",
													event.target.value
												)
											}
										/>
									</label>

									<label className="spaceBetweenBox">
										<span>{t("highlightText")}</span>

										<input
											type="color"
											value={customTheme.textHighlight}
											disabled={theme !== "Custom"}
											onChange={event =>
												updateCustomTheme(
													"textHighlight",
													event.target.value
												)
											}
										/>
									</label>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}


			{languageOpen && (
				<div className="popupBox">
					<div className="popupPanel">
						<button
							className="popupCloseBtn"
							onClick={closeLanguage}
						>
							X
						</button>

						<h1>{t("language")}</h1>

						<div className="vBox mdSpaceBox">
							{languages.map(item => (
								<label
									key={item.value}
									className="hBox smSpaceBox"
								>
									<input
										type="radio"
										name="language"
										value={item.value}
										checked={language === item.value}
										onChange={() =>
											selectLanguage(item.value)
										}
									/>

									<span>{getLanguageName(item.value)}</span>
								</label>
							))}
						</div>
					</div>
				</div>
			)}
		</li>
	);
}