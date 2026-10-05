import { useEffect, useRef, useState } from "react";

import { Project } from "../../shared/models/Project";

import { t } from "../modules/i18n";
import { WavebinderRuntime } from "../wavebinder/WavebinderRuntime";

import { Tab, TabValue } from "./ApplicationView";
import { ProjectMenu } from "./ProjectMenu";
import { SettingsMenu } from "./SettingsMenu";


interface HeaderProperties
{
	project: Project;
	wavebinder: WavebinderRuntime;
	currentTab: TabValue;
	onTabSelected: (tab: TabValue) => void;
}


export function Header({project, wavebinder, currentTab, onTabSelected}: HeaderProperties)
{
	const nameInput = useRef<HTMLInputElement>(null);

	const [editingProjectName, setEditingProjectName] = useState(false);
	const [projectName, setProjectName] = useState(project.name);
	const [, setLanguageVersion] = useState(0);


	useEffect(() =>
	{
		setProjectName(project.name);
	}, [project.name]);


	useEffect(() =>
	{
		if (!editingProjectName)
			return;

		nameInput.current?.focus();
		nameInput.current?.select();
	}, [editingProjectName]);


	useEffect(() =>
	{
		const updateLanguage = (): void =>
		{
			setLanguageVersion(value => value + 1);
		};

		window.addEventListener("languagechange", updateLanguage);

		return () =>
		{
			window.removeEventListener("languagechange", updateLanguage);
		};
	}, []);


	function startEditingProjectName(): void
	{
		setProjectName(project.name);
		setEditingProjectName(true);
	}


	function cancelEditingProjectName(): void
	{
		setProjectName(project.name);
		setEditingProjectName(false);
	}


	function saveProjectName(): void
	{
		const name = projectName.trim();

		if (!name || name === project.name)
		{
			cancelEditingProjectName();
			return;
		}


		wavebinder.setNodeValue(
			"updateProjectRequest",
			{
				id: project.id,
				name
			}
		);

		setEditingProjectName(false);
	}


	return (
		<div id="headerDiv" className="hBox borderlessBox">
			<div id="menuDiv">
				<ul id="menu" className="hBox">
					<li>
						<input
							ref={nameInput}
							className="nameEditInput"
							type="text"
							maxLength={50}
							placeholder={t("projectNamePlaceholder")}
							value={projectName}
							spellCheck={false}
							autoComplete="off"
							readOnly={!editingProjectName}
							onDoubleClick={startEditingProjectName}
							onChange={event => setProjectName(event.target.value)}
							onKeyDown={event =>
							{
								if (event.key === "Enter")
								{
									event.preventDefault();
									saveProjectName();
								}
								else if (event.key === "Escape")
								{
									event.preventDefault();
									cancelEditingProjectName();
								}
							}}
							onBlur={() =>
							{
								if (editingProjectName)
									saveProjectName();
							}}
						/>
					</li>

					<ProjectMenu project={project} wavebinder={wavebinder}/>
					<SettingsMenu project={project} />
				</ul>
			</div>

			<div id="tabsDiv">
				<ul id="tabs" className="hBox">
					<li>
						<button
							id="tabsFilesBtn"
							className={currentTab === Tab.FILES ? "selected" : ""}
							onClick={() => onTabSelected(Tab.FILES)}
						>
							{t("files")}
						</button>
					</li>

					<li>
						<button
							id="tabsDataBtn"
							className={currentTab === Tab.DATA ? "selected" : ""}
							onClick={() => onTabSelected(Tab.DATA)}
						>
							{t("data")}
						</button>
					</li>

					<li>
						<button
							id="tabsTransformationsBtn"
							className={currentTab === Tab.TRANSFORMATIONS ? "selected" : ""}
							onClick={() => onTabSelected(Tab.TRANSFORMATIONS)}
						>
							{t("transformations")}
						</button>
					</li>

					<li>
						<button
							id="tabsChartsBtn"
							className={currentTab === Tab.CHARTS ? "selected" : ""}
							onClick={() => onTabSelected(Tab.CHARTS)}
						>
							{t("charts")}
						</button>
					</li>
				</ul>
			</div>
		</div>
	);
}