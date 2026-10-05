import { useEffect, useRef, useState } from "react";

import { CreateProjectRequest, ProjectResponse } from "../../shared/api/project";
import { FieldCategory, FieldType, FieldTypeValue } from "../../shared/models/Dataset";
import { Project, ProjectSettings } from "../../shared/models/Project";

import { t } from "../modules/i18n";
import { WavebinderRuntime } from "../wavebinder/WavebinderRuntime";


interface ProjectMenuProperties
{
	project: Project;
	wavebinder: WavebinderRuntime;
}


interface CategoryEditor
{
	name: string;
	expressions: string[];
	validValueTypes: FieldTypeValue[];
}


export function ProjectMenu({project, wavebinder}: ProjectMenuProperties)
{
	const [open, setOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsError, setSettingsError] = useState<string | null>(null);
	const [categories, setCategories] = useState<CategoryEditor[]>([]);

	const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
	const [valueTypesOpen, setValueTypesOpen] = useState<number[]>([]);

	const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
	const categoryNameInputs = useRef<Record<number, HTMLInputElement | null>>({});
	const categoryNameBeforeEdit = useRef<string>("");

	const [, setLanguageVersion] = useState(0);


	useEffect(() =>
	{
		if (!settingsOpen)
			return;


		const nextCategories = project.settings.fieldCategories.map(category =>
		({
			name: category.name,
			expressions: [...category.expressions],
			validValueTypes: [...category.validValueTypes]
		}));


		setCategories(nextCategories);

		setExpandedCategories([]);

		setValueTypesOpen(
			nextCategories
				.map((category, index) =>
					category.validValueTypes.length > 0
						? index
						: -1
				)
				.filter(index => index >= 0)
		);

		setEditingCategoryIndex(null);
		setSettingsError(null);
	}, [settingsOpen]);


	useEffect(() =>
	{
		if (editingCategoryIndex === null)
			return;

		const input = categoryNameInputs.current[editingCategoryIndex];

		input?.focus();
		input?.select();
	}, [editingCategoryIndex]);


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


	function createProject(): void
	{
		const createProjectNode = wavebinder.getNode("createProject");
		const previous = createProjectNode.getNodeValue() as ProjectResponse | null;

		const previousID = previous?.id ?? null;


		const subscription = createProjectNode.subscribe(() =>
		{
			const value = createProjectNode.getNodeValue();

			if (!value)
				return;

			const createdProject = value as ProjectResponse;

			if (createdProject.id === previousID)
				return;


			wavebinder.setNodeValue(
				"selectedProject",
				createdProject.id
			);

			subscription.unsubscribe();
		});


		const request: CreateProjectRequest =
		{
			name: "New_project"
		};

		wavebinder.setNodeValue(
			"createProjectRequest",
			request
		);

		setOpen(false);
	}


	function openSettings(): void
	{
		setSettingsOpen(true);
		setOpen(false);
	}


	function closeSettings(): void
	{
		if (!saveSettings())
			return;

		setSettingsOpen(false);
		setExpandedCategories([]);
		setValueTypesOpen([]);
		setEditingCategoryIndex(null);
	}


	function updateSettings(nextCategories: CategoryEditor[]): boolean
	{
		const fieldCategories: FieldCategory[] = [];


		for (const category of nextCategories)
		{
			const name = category.name.trim();

			if (!name)
			{
				setSettingsError(t("categoryNameEmpty"));
				return false;
			}


			const expressions = category.expressions
				.map(expression => expression.trim())
				.filter(expression => expression !== "");


			fieldCategories.push(
				FieldCategory.create(
					name,
					expressions,
					category.validValueTypes
				)
			);
		}


		setSettingsError(null);


		const settings: ProjectSettings =
		{
			fieldCategories
		};


		wavebinder.setNodeValue(
			"updateProjectRequest",
			{
				id: project.id,
				settings
			}
		);

		return true;
	}


	function saveSettings(): boolean
	{
		return updateSettings(categories);
	}


	function createCategory(): void
	{
		const nextCategories =
		[
			...categories,
			{
				name: "New_category",
				expressions: [],
				validValueTypes: []
			}
		];

		const categoryIndex = nextCategories.length - 1;


		setCategories(nextCategories);

		setExpandedCategories(current =>
			[
				...current,
				categoryIndex
			]
		);

		setSettingsError(null);
	}


	function deleteCategory(categoryIndex: number): void
	{
		const nextCategories = categories.filter(
			(_, index) => index !== categoryIndex
		);

		setCategories(nextCategories);
		setExpandedCategories([]);
		setValueTypesOpen([]);

		if (editingCategoryIndex === categoryIndex)
			setEditingCategoryIndex(null);
	}


	function toggleCategory(categoryIndex: number): void
	{
		setExpandedCategories(current =>
			current.includes(categoryIndex)
				? current.filter(index => index !== categoryIndex)
				: [...current, categoryIndex]
		);
	}


	function toggleValueTypeList(categoryIndex: number): void
	{
		setValueTypesOpen(current =>
			current.includes(categoryIndex)
				? current.filter(index => index !== categoryIndex)
				: [...current, categoryIndex]
		);
	}


	function startEditingCategoryName(categoryIndex: number): void
	{
		categoryNameBeforeEdit.current = categories[categoryIndex].name;
		setEditingCategoryIndex(categoryIndex);
		setSettingsError(null);
	}


	function cancelEditingCategoryName(categoryIndex: number): void
	{
		const previousName = categoryNameBeforeEdit.current;

		setCategories(current =>
			current.map(
				(category, index) =>
					index === categoryIndex
						? {
							...category,
							name: previousName
						}
						: category
			)
		);

		setEditingCategoryIndex(null);
	}


	function saveCategoryName(categoryIndex: number): void
	{
		const name = categories[categoryIndex].name.trim();

		if (!name)
		{
			cancelEditingCategoryName(categoryIndex);
			setSettingsError(t("categoryNameEmpty"));
			return;
		}


		setCategories(current =>
			current.map(
				(category, index) =>
					index === categoryIndex
						? {
							...category,
							name
						}
						: category
			)
		);

		setEditingCategoryIndex(null);
		setSettingsError(null);
	}


	function updateCategoryName(categoryIndex: number, name: string): void
	{
		const nextCategories = categories.map(
			(category, index) =>
				index === categoryIndex
					? {...category, name}
					: category
		);

		setCategories(nextCategories);
		setSettingsError(null);
	}


	function updateCategoryExpression(categoryIndex: number, expressionIndex: number, expression: string): void
	{
		const nextCategories = categories.map(
			(category, index) =>
			{
				if (index !== categoryIndex)
					return category;

				return {
					...category,
					expressions: category.expressions.map(
						(currentExpression, currentIndex) =>
							currentIndex === expressionIndex
								? expression
								: currentExpression
					)
				};
			}
		);

		setCategories(nextCategories);
	}


	function addExpression(categoryIndex: number): void
	{
		const nextCategories = categories.map(
			(category, index) =>
				index === categoryIndex
					? {
						...category,
						expressions:
						[
							...category.expressions,
							""
						]
					}
					: category
		);

		setCategories(nextCategories);
	}


	function deleteExpression(categoryIndex: number, expressionIndex: number): void
	{
		const nextCategories = categories.map(
			(category, index) =>
			{
				if (index !== categoryIndex)
					return category;

				return {
					...category,
					expressions: category.expressions.filter(
						(_, currentIndex) => currentIndex !== expressionIndex
					)
				};
			}
		);

		setCategories(nextCategories);
	}


	function toggleValueType(categoryIndex: number, type: FieldTypeValue): void
	{
		const nextCategories = categories.map(
			(category, index) =>
			{
				if (index !== categoryIndex)
					return category;


				const validValueTypes = category.validValueTypes.includes(type)
					? category.validValueTypes.filter(
						currentType => currentType !== type
					)
					: [
						...category.validValueTypes,
						type
					];


				return {
					...category,
					validValueTypes
				};
			}
		);

		setCategories(nextCategories);
	}


	function openProjectList(): void
	{
		wavebinder.setNodeValue(
			"selectedDataset",
			null
		);

		wavebinder.setNodeValue(
			"selectedDatafile",
			null
		);

		wavebinder.setNodeValue(
			"selectedProject",
			null
		);

		setOpen(false);
	}


	return (
		<>
			<li className={`dropdown ${open ? "open" : ""}`}>
				<p onClick={() => setOpen(current => !current)}>
					{t("project")}
				</p>

				<ul className="dropdown-menu">
					<li>
						<button onClick={createProject}>
							{t("new")}
						</button>
					</li>

					<li>
						<button onClick={openSettings}>
							{t("settings")}
						</button>
					</li>

					<li>
						<button onClick={openProjectList}>
							{t("list")}
						</button>
					</li>
				</ul>
			</li>

			{settingsOpen && (
				<div className="popupBox">
					<div className="popupPanel">
						<button
							className="popupCloseBtn"
							onClick={closeSettings}
						>
							X
						</button>

						<h1>{t("projectSettings")}</h1>

						<div className="vBox mdSpaceBox scrollBox">
							<h3>{t("availableCategories")}</h3>

							{categories.map((category, categoryIndex) =>
							{
								const expanded =
									expandedCategories.includes(categoryIndex);

								const showValueTypes =
									valueTypesOpen.includes(categoryIndex);

								const editing =
									editingCategoryIndex === categoryIndex;


								return (
									<div
										key={categoryIndex}
										className="vBox smSpaceBox"
									>
										<div className="hBox spaceBetweenBox">
											<input
												ref={input =>
												{
													categoryNameInputs.current[categoryIndex] = input;
												}}
												className="nameEditInput"
												type="text"
												maxLength={30}
												placeholder={t("categoryNamePlaceholder")}
												value={category.name}
												spellCheck={false}
												autoComplete="off"
												readOnly={!editing}
												onDoubleClick={() =>
													startEditingCategoryName(categoryIndex)
												}
												onChange={event =>
													updateCategoryName(
														categoryIndex,
														event.target.value
													)
												}
												onKeyDown={event =>
												{
													if (event.key === "Enter")
													{
														event.preventDefault();
														saveCategoryName(categoryIndex);
													}
													else if (event.key === "Escape")
													{
														event.preventDefault();
														cancelEditingCategoryName(categoryIndex);
													}
												}}
												onBlur={() =>
												{
													if (editing)
														saveCategoryName(categoryIndex);
												}}
											/>

											<div>
												<button
													onClick={() =>
														toggleCategory(categoryIndex)
													}
												>
													{expanded ? t("close") : t("edit")}
												</button>

												<button
													onClick={() =>
														deleteCategory(categoryIndex)
													}
												>
													X
												</button>
											</div>
										</div>

										{expanded && (
											<div className="vBox smSpaceBox mdPaddingBox">
												<div className="vBox smSpaceBox">
													<h2>{t("expressions")}</h2>

													{category.expressions.map((expression, expressionIndex) =>
														<div
															key={expressionIndex}
															className="hBox spaceBetweenBox"
														>
															<input
																type="text"
																value={expression}
																placeholder={t("expressions")}
																onChange={event =>
																	updateCategoryExpression(
																		categoryIndex,
																		expressionIndex,
																		event.target.value
																	)
																}
															/>

															<button
																onClick={() =>
																	deleteExpression(
																		categoryIndex,
																		expressionIndex
																	)
																}
															>
																X
															</button>
														</div>
													)}

													<button
														onClick={() =>
															addExpression(categoryIndex)
														}
													>
														{t("addExpression")}
													</button>
												</div>

												<label className="hBox smSpaceBox">
													<input
														type="checkbox"
														checked={showValueTypes}
														onChange={() =>
															toggleValueTypeList(
																categoryIndex
															)
														}
													/>

													<span>{t("validValueTypes")}</span>
												</label>

												{showValueTypes && (
													<div className="vBox smSpaceBox">
														{Object.values(FieldType).map(type =>
															<label key={type} className="hBox smSpaceBox">
																<input
																	type="checkbox"
																	checked={category.validValueTypes.includes(type)}
																	onChange={() =>
																		toggleValueType(
																			categoryIndex,
																			type
																		)
																	}
																/>

																<span>{type}</span>
															</label>
														)}
													</div>
												)}
											</div>
										)}
									</div>
								);
							})}

							{categories.length === 0 && (
								<p>{t("noCategoriesDefined")}</p>
							)}

							<button onClick={createCategory}>
								{t("createCategory")}
							</button>

							{settingsError && (
								<p>
									{settingsError}
								</p>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
}