import { useEffect, useState } from "react";

import { CreateProjectRequest, ProjectListItem } from "../../shared/api/project";

import { t } from "../modules/i18n";
import { WavebinderRuntime } from "../wavebinder/WavebinderRuntime";


interface ProjectListProperties
{
	wavebinder: WavebinderRuntime;
}


export function ProjectList({wavebinder}: ProjectListProperties)
{
	const [projects, setProjects] = useState<ProjectListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [newProjectName, setNewProjectName] = useState("");

	const [deleteProjectID, setDeleteProjectID] = useState<string | null>(null);
	const [dontAskDelete, setDontAskDelete] = useState(false);

	const [, setLanguageVersion] = useState(0);


	useEffect(() =>
	{
		const projectList = wavebinder.getNode("projectList");

		const updateProjects = () =>
		{
			const values = projectList.getNodeValue();

			if (!Array.isArray(values))
				return;

			setProjects(values as ProjectListItem[]);
			setLoading(false);
		};

		updateProjects();

		const subscription = projectList.subscribe(updateProjects);

		return () => subscription.unsubscribe();
	}, [wavebinder]);


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


	function selectProject(projectID: string): void
	{
		wavebinder.setNodeValue("selectedProject", projectID);
	}


	function openDeleteConfirmation(projectID: string): void
	{
		const dontAsk = sessionStorage.getItem("dontAskProjectDeleteConfirmation") === "true";

		if (dontAsk)
		{
			wavebinder.setNodeValue(
				"deleteProjectRequest",
				projectID
			);

			return;
		}

		setDeleteProjectID(projectID);
		setDontAskDelete(false);
	}


	function closeDeleteConfirmation(): void
	{
		setDeleteProjectID(null);
		setDontAskDelete(false);
	}


	function confirmDeleteProject(): void
	{
		if (!deleteProjectID)
			return;

		if (dontAskDelete)
		{
			sessionStorage.setItem(
				"dontAskProjectDeleteConfirmation",
				"true"
			);
		}

		wavebinder.setNodeValue(
			"deleteProjectRequest",
			deleteProjectID
		);

		closeDeleteConfirmation();
	}


	function startCreating(): void
	{
		setNewProjectName("");
		setCreating(true);
	}


	function cancelCreating(): void
	{
		setNewProjectName("");
		setCreating(false);
	}


	function confirmCreating(): void
	{
		const name = newProjectName.trim();

		const request: CreateProjectRequest =
		{
			name
		};

		wavebinder.setNodeValue("createProjectRequest", request);

		setNewProjectName("");
		setCreating(false);
	}


	if (loading)
	{
		return (
			<div id="projectListDiv" className="vBox">
				<h2>{t("project")}</h2>
				<p>{t("loading")}</p>
			</div>
		);
	}


	const deleteProject = projects.find(
		project => project.id === deleteProjectID
	);


	return (
		<>
			<div id="projectListDiv" className="vBox mdSpaceBox">
				<h1>{t("projectList")}</h1>

				<ul id="projectList" className="vBox smSpaceBox">
					{projects.map(project =>
						<li
							key={project.id}
							className="projectListItem hBox spaceBetweenBox borderlessBox"
						>
							<button
								className="projectButton"
								onClick={() => selectProject(project.id)}
							>
								{project.name}
							</button>

							<button
								className="deleteProjectButton"
								onClick={() => openDeleteConfirmation(project.id)}
							>
								×
							</button>
						</li>
					)}

					{creating ? (
						<li
							key="newProjectListItem"
							id="newProjectListItem"
							className="projectListItem"
						>
							<input
								id="newProjectInput"
								autoFocus
								type="text"
								value={newProjectName}
								onChange={event => setNewProjectName(event.target.value)}
								onKeyDown={event =>
								{
									if (event.key === "Enter")
										confirmCreating();
									else if (event.key === "Escape")
										cancelCreating();
								}}
							/>

							<button
								id="confirmProjectButton"
								onClick={confirmCreating}
							>
								{t("confirm")}
							</button>

							<button
								id="cancelProjectButton"
								onClick={cancelCreating}
							>
								{t("close")}
							</button>
						</li>
					) : (
						<li
							key="newProjectListItem"
							id="newProjectListItem"
						>
							<button
								id="newProjectButton"
								onClick={startCreating}
							>
								+
							</button>
						</li>
					)}
				</ul>
			</div>

			{deleteProject && (
				<div className="popupBox">
					<div className="popupPanel">
						<button
							className="popupCloseBtn"
							onClick={closeDeleteConfirmation}
						>
							X
						</button>

						<h1>{t("deleteProject")}</h1>

						<div className="vBox mdSpaceBox">
							<p>
								{t("deleteProjectQuestion")}{" "}
								<strong>{deleteProject.name}</strong>
								?
							</p>

							<label className="hBox smSpaceBox">
								<input
									type="checkbox"
									checked={dontAskDelete}
									onChange={event => setDontAskDelete(event.target.checked)}
								/>

								<span>{t("dontAskAgain")}</span>
							</label>

							<button onClick={confirmDeleteProject}>
								{t("confirm")}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}