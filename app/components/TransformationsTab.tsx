import { ReactNode, useEffect, useMemo, useState } from "react";

import { DatafileResponse } from "../../shared/api/datafile";
import { DatasetListItem } from "../../shared/api/dataset";
import {
	DatatransListItem,
	DatatransOperationResponse,
	DatatransResponse
} from "../../shared/api/datatrans";

import {
	DatatransOperation,
	TransformationType,
	TransformationTypeValue
} from "../../shared/models/Datatrans";

import { t } from "../modules/i18n";
import { WavebinderRuntime } from "../wavebinder/WavebinderRuntime";


interface TransformationsTabProperties
{
	wavebinder: WavebinderRuntime;
	currentDatatransID: string | null;
	onDatatransSelected: (id: string | null) => void;
	active: boolean;
}


interface TransformationNode
{
	transformation: DatatransListItem;
	children: TransformationNode[];
}


interface DatasetNode
{
	dataset: DatasetListItem;
	transformations: TransformationNode[];
}


interface FileNode
{
	file: DatafileResponse;
	datasets: DatasetNode[];
}


interface ConditionalModification
{
	condition: string;
	modification: string;
}


export function TransformationsTab({
	wavebinder,
	currentDatatransID,
	onDatatransSelected,
	active
}: TransformationsTabProperties)
{
	const [files, setFiles] = useState<DatafileResponse[]>([]);
	const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
	const [transformations, setTransformations] = useState<DatatransListItem[]>([]);

	const [currentTransformation, setCurrentTransformation] =
		useState<DatatransResponse | null>(null);

	const [operations, setOperations] =
		useState<DatatransOperation[]>([]);

	const [transformationName, setTransformationName] =
		useState("");

	const [search, setSearch] = useState("");

	const [createParentID, setCreateParentID] =
		useState<string | null>(null);

	const [createName, setCreateName] =
		useState("");

	const [renameID, setRenameID] =
		useState<string | null>(null);

	const [renameName, setRenameName] =
		useState("");

	const [, setLanguageVersion] = useState(0);


	useEffect(() =>
	{
		const node = wavebinder.getNode("datafileList");

		const update = (): void =>
		{
			const value = node.getNodeValue();

			if (!Array.isArray(value))
				return;

			setFiles(value as DatafileResponse[]);
		};

		update();

		const subscription = node.subscribe(update);

		return () => subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		const node = wavebinder.getNode("datasetList");

		const update = (): void =>
		{
			const value = node.getNodeValue();

			if (!Array.isArray(value))
				return;

			setDatasets(value as DatasetListItem[]);
		};

		update();

		const subscription = node.subscribe(update);

		return () => subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		const node = wavebinder.getNode("datatransList");

		const update = (): void =>
		{
			const value = node.getNodeValue();

			if (!Array.isArray(value))
				return;

			setTransformations(
				value as DatatransListItem[]
			);
		};

		update();

		const subscription = node.subscribe(update);

		return () => subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		const node = wavebinder.getNode("currentDatatrans");

		const update = (): void =>
		{
			const value = node.getNodeValue();

			if (!value || typeof value !== "object")
			{
				setCurrentTransformation(null);
				return;
			}

			setCurrentTransformation(
				value as DatatransResponse
			);
		};

		update();

		const subscription = node.subscribe(update);

		return () => subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		if (!currentTransformation)
		{
			setOperations([]);
			setTransformationName("");
			return;
		}

		setTransformationName(
			currentTransformation.name
		);

		setOperations(
			currentTransformation.operations.map(
				operation => ({
					type: operation.type,
					settings:
					{
						...operation.settings
					}
				})
			)
		);
	}, [currentTransformation]);


	useEffect(() =>
	{
		const updateLanguage = (): void =>
		{
			setLanguageVersion(
				value => value + 1
			);
		};

		window.addEventListener(
			"languagechange",
			updateLanguage
		);

		return () =>
		{
			window.removeEventListener(
				"languagechange",
				updateLanguage
			);
		};
	}, []);


	const searchValue = search.trim().toLowerCase();
	const searching = searchValue.length > 0;


	function highlightText(text: string): ReactNode
	{
		if (!searchValue)
			return text;

		const lowerText = text.toLowerCase();
		const parts: ReactNode[] = [];

		let index = 0;
		let partIndex = 0;

		while (index < text.length)
		{
			const matchIndex = lowerText.indexOf(
				searchValue,
				index
			);

			if (matchIndex === -1)
			{
				parts.push(
					text.slice(index)
				);

				break;
			}

			if (matchIndex > index)
			{
				parts.push(
					text.slice(
						index,
						matchIndex
					)
				);
			}

			parts.push(
				<span
					key={partIndex++}
					className="transformationSearchMatch"
				>
					{text.slice(
						matchIndex,
						matchIndex + searchValue.length
					)}
				</span>
			);

			index =
				matchIndex +
				searchValue.length;
		}

		return parts;
	}


	const transformationMap = useMemo(() =>
	{
		const map =
			new Map<string, DatatransListItem>();

		for (const transformation of transformations)
		{
			map.set(
				transformation.id,
				transformation
			);
		}

		return map;
	}, [transformations]);


	function hasTransformationMatch(
		id: string
	): boolean
	{
		const transformation =
			transformationMap.get(id);

		if (!transformation)
			return false;

		return transformation.name
			.toLowerCase()
			.includes(searchValue);
	}


	function hasTransformationDescendantMatch(
		id: string
	): boolean
	{
		return transformations.some(
			transformation =>
				transformation.parentID === id &&
				(
					hasTransformationMatch(
						transformation.id
					) ||
					hasTransformationDescendantMatch(
						transformation.id
					)
				)
		);
	}


	function buildTransformationTree(
		parentID: string,
		includeAll: boolean
	): TransformationNode[]
	{
		const children =
			transformations.filter(
				transformation =>
					transformation.parentID === parentID
			);

		const result: TransformationNode[] = [];

		for (const transformation of children)
		{
			const matches =
				!searching ||
				hasTransformationMatch(
					transformation.id
				);

			const hasMatchingChildren =
				searching &&
				hasTransformationDescendantMatch(
					transformation.id
				);

			if (
				!includeAll &&
				!matches &&
				!hasMatchingChildren
			)
			{
				continue;
			}

			result.push({
				transformation,
				children: buildTransformationTree(
					transformation.id,
					includeAll || matches
				)
			});
		}

		return result;
	}


	const tree = useMemo<FileNode[]>(() =>
	{
		return files
			.map(file =>
			{
				const fileDatasets =
					datasets.filter(
						dataset =>
							dataset.sourceFileId === file.id
					);

				const fileMatches =
					!searching ||
					file.name
						.toLowerCase()
						.includes(searchValue);

				const datasetNodes: DatasetNode[] = [];

				for (const dataset of fileDatasets)
				{
					const datasetMatches =
						!searching ||
						dataset.name
							.toLowerCase()
							.includes(searchValue);

					const datasetTransformations =
						buildTransformationTree(
							dataset.id,
							fileMatches ||
								datasetMatches
						);

					if (
						!searching ||
						fileMatches ||
						datasetMatches ||
						datasetTransformations.length > 0
					)
					{
						datasetNodes.push({
							dataset,
							transformations:
								datasetTransformations
						});
					}
				}

				if (
					!searching ||
					fileMatches ||
					datasetNodes.length > 0
				)
				{
					return {
						file,
						datasets: datasetNodes
					};
				}

				return null;
			})
			.filter(
				(group): group is FileNode =>
					group !== null
			);
	}, [
		files,
		datasets,
		transformations,
		searchValue,
		searching
	]);


	function selectTransformation(
		id: string
	): void
	{
		wavebinder.setNodeValue(
			"selectedDatatrans",
			id
		);

		onDatatransSelected(id);
	}


	function closeTransformation(): void
	{
		cancelRenaming();

		wavebinder.setNodeValue(
			"selectedDatatrans",
			null
		);

		onDatatransSelected(null);
	}


	function deleteTransformation(
		id: string
	): void
	{
		wavebinder.setNodeValue(
			"deleteDatatransRequest",
			id
		);

		if (id === currentDatatransID)
			closeTransformation();
	}


	function getProjectID(): string | null
	{
		const value =
			wavebinder.getNodeValue(
				"selectedProject"
			);

		if (typeof value === "string")
			return value;

		if (
			value &&
			typeof value === "object" &&
			"id" in value &&
			typeof value.id === "string"
		)
		{
			return value.id;
		}

		return null;
	}


	function startCreating(
		parentID: string
	): void
	{
		setCreateParentID(parentID);
		setCreateName("");
	}


	function cancelCreating(): void
	{
		setCreateParentID(null);
		setCreateName("");
	}


	function confirmCreating(): void
	{
		if (!createParentID)
			return;

		const projectID =
			getProjectID();

		if (!projectID)
			return;

		const name =
			createName.trim();

		const previousValue =
			wavebinder.getNodeValue(
				"createDatatrans"
			);

		const previousID =
			previousValue &&
			typeof previousValue === "object" &&
			"id" in previousValue &&
			typeof previousValue.id === "string"
				? previousValue.id
				: null;

		const createNode =
			wavebinder.getNode(
				"createDatatrans"
			);

		const subscription =
			createNode.subscribe(() =>
			{
				const value =
					wavebinder.getNodeValue(
						"createDatatrans"
					);

				if (
					!value ||
					typeof value !== "object" ||
					!("id" in value) ||
					typeof value.id !== "string" ||
					value.id === previousID
				)
				{
					return;
				}

				subscription.unsubscribe();

				cancelCreating();

				selectTransformation(
					value.id
				);
			});

		wavebinder.setNodeValue(
			"createDatatransRequest",
			{
				projectID,
				name,
				parentID: createParentID
			}
		);
	}


	function renderCreateRow(
		parentID: string
	): ReactNode
	{
		if (createParentID !== parentID)
			return null;

		return (
			<li className="transformationItem">
				<div className="hBox spaceBetweenBox">
					<input
						autoFocus
						type="text"
						value={createName}
						maxLength={50}
						className="nameEditInput"
						placeholder={t("transformationNamePlaceholder")}
						spellCheck={false}
						autoComplete="off"
						onChange={event =>
							setCreateName(
								event.target.value
							)
						}
						onKeyDown={event =>
						{
							if (event.key === "Enter")
								confirmCreating();
							else if (event.key === "Escape")
								cancelCreating();
						}}
					/>

					<div className="hBox">
						<button
							type="button"
							onClick={confirmCreating}
						>
							{t("confirm")}
						</button>

						<button
							type="button"
							onClick={cancelCreating}
						>
							{t("close")}
						</button>
					</div>
				</div>
			</li>
		);
	}


	function startRenaming(
		transformation: DatatransListItem
	): void
	{
		setRenameID(
			transformation.id
		);

		setRenameName(
			transformation.name
		);
	}


	function cancelRenaming(): void
	{
		setRenameID(null);
		setRenameName("");
	}


	function confirmRenaming(): void
	{
		if (!renameID)
			return;

		const name =
			renameName.trim();

		if (!name)
		{
			cancelRenaming();
			return;
		}

		wavebinder.setNodeValue(
			"updateDatatransRequest",
			{
				id: renameID,
				name
			}
		);

		cancelRenaming();
	}


	function updateOperationType(
		index: number,
		type: TransformationTypeValue
	): void
	{
		setOperations(current =>
			current.map(
				(operation, operationIndex) =>
					operationIndex !== index
						? operation
						: {
							type,
							settings:
								getDefaultSettings(type)
						}
			)
		);
	}


	function updateOperationSettings(
		index: number,
		settings: Record<string, unknown>
	): void
	{
		setOperations(current =>
			current.map(
				(operation, operationIndex) =>
					operationIndex !== index
						? operation
						: {
							...operation,
							settings
						}
			)
		);
	}


	function addOperation(): void
	{
		setOperations(current => [
			...current,
			{
				type: TransformationType.FILTER,
				settings:
					getDefaultSettings(
						TransformationType.FILTER
					)
			}
		]);
	}


	function removeOperation(
		index: number
	): void
	{
		setOperations(current =>
			current.filter(
				(_, operationIndex) =>
					operationIndex !== index
			)
		);
	}


	function submitChanges(): void
	{
		if (!currentTransformation)
			return;

		const name =
			transformationName.trim();

		if (!name)
			return;

		wavebinder.setNodeValue(
			"updateDatatransRequest",
			{
				id: currentTransformation.id,
				name,
				operations:
					operations as DatatransOperationResponse[]
			}
		);

		closeTransformation();
	}


	function getDefaultSettings(
		type: TransformationTypeValue
	): Record<string, unknown>
	{
		switch (type)
		{
			case TransformationType.FILTER:
			case TransformationType.EXCLUDE:
				return {
					rowConditions: [],
					columnConditions: []
				};

			case TransformationType.CHANGE:
				return {
					conditionalModifications: []
				};

			case TransformationType.COMPUTE:
			case TransformationType.GROUP:
			case TransformationType.JOIN:
			case TransformationType.PIVOT:
				return {};
		}
	}


	function getStringArray(
		settings: Record<string, unknown>,
		key: string
	): string[]
	{
		const value = settings[key];

		if (!Array.isArray(value))
			return [];

		return value.filter(
			(item): item is string =>
				typeof item === "string"
		);
	}


	function updateStringArraySetting(
		operationIndex: number,
		key: string,
		value: string
	): void
	{
		const operation =
			operations[operationIndex];

		if (!operation)
			return;

		updateOperationSettings(
			operationIndex,
			{
				...operation.settings,
				[key]: value
					.split("\n")
					.map(item => item.trim())
					.filter(Boolean)
			}
		);
	}
	
	function updateStringArrayItem(
		operationIndex: number,
		key: string,
		itemIndex: number,
		value: string
	): void
	{
		const operation =
			operations[operationIndex];

		if (!operation)
			return;

		const values =
			getStringArray(
				operation.settings,
				key
			);

		updateOperationSettings(
			operationIndex,
			{
				...operation.settings,
				[key]: values.map(
					(item, index) =>
						index === itemIndex
							? value
							: item
				)
			}
		);
	}


	function addStringArrayItem(
		operationIndex: number,
		key: string
	): void
	{
		const operation =
			operations[operationIndex];

		if (!operation)
			return;

		const values =
			getStringArray(
				operation.settings,
				key
			);

		updateOperationSettings(
			operationIndex,
			{
				...operation.settings,
				[key]: [
					...values,
					""
				]
			}
		);
	}


	function removeStringArrayItem(
		operationIndex: number,
		key: string,
		itemIndex: number
	): void
	{
		const operation =
			operations[operationIndex];

		if (!operation)
			return;

		const values =
			getStringArray(
				operation.settings,
				key
			);

		updateOperationSettings(
			operationIndex,
			{
				...operation.settings,
				[key]: values.filter(
					(_, index) =>
						index !== itemIndex
				)
			}
		);
	}


	function getConditionalModifications(
		settings: Record<string, unknown>
	): ConditionalModification[]
	{
		const value =
			settings.conditionalModifications;

		if (!Array.isArray(value))
			return [];

		return value.map(item =>
		{
			if (
				!item ||
				typeof item !== "object"
			)
			{
				return {
					condition: "",
					modification: ""
				};
			}

			const object =
				item as Record<string, unknown>;

			return {
				condition:
					typeof object.condition === "string"
						? object.condition
						: "",
				modification:
					typeof object.modification === "string"
						? object.modification
						: ""
			};
		});
	}


	function updateConditionalModifications(
		operationIndex: number,
		modifications: ConditionalModification[]
	): void
	{
		const operation =
			operations[operationIndex];

		if (!operation)
			return;

		updateOperationSettings(
			operationIndex,
			{
				...operation.settings,
				conditionalModifications:
					modifications
			}
		);
	}


	function renderFilterSettings(
		operationIndex: number,
		operation: DatatransOperation
	): ReactNode
	{
		const rowConditions =
			getStringArray(
				operation.settings,
				"rowConditions"
			);

		const columnConditions =
			getStringArray(
				operation.settings,
				"columnConditions"
			);


		function renderConditionList(
			key: string,
			label: string,
			values: string[],
			placeholder: string
		): ReactNode
		{
			return (
				<div className="transformationConditionList vBox smSpaceBox">
					<span>
						{label}
					</span>

					<div className="vBox mdSpaceBox">
						<div>
							{values.map(
								(value, index) =>
									<div
										key={index}
										className="transformationModification hBox"
									>
										<input
											type="text"
											value={value}
											placeholder={placeholder}
											spellCheck={false}
											className="fillBox"
											onChange={event =>
												updateStringArrayItem(
													operationIndex,
													key,
													index,
													event.target.value
												)
											}
										/>

										<button
											type="button"
											onClick={() =>
												removeStringArrayItem(
													operationIndex,
													key,
													index
												)
											}
											aria-label={t("removeModification")}
										>
											−
										</button>
									</div>
							)}
						</div>

						<button
							type="button"
							onClick={() =>
								addStringArrayItem(
									operationIndex,
									key
								)
							}
							aria-label={t("addModification")}
						>
							+
						</button>
					</div>
				</div>
			);
		}


		return (
			<div className="transformationSettings vBox lgSpaceBox">
				{renderConditionList(
					"rowConditions",
					t("rowConditions"),
					rowConditions,
					'A1 != ""'
				)}

				{renderConditionList(
					"columnConditions",
					t("columnConditions"),
					columnConditions,
					'A:A != ""'
				)}
			</div>
		);
	}


	function renderChangeSettings(
		operationIndex: number,
		operation: DatatransOperation
	): ReactNode
	{
		const modifications =
			getConditionalModifications(
				operation.settings
			);


		function addModification(): void
		{
			updateConditionalModifications(
				operationIndex,
				[
					...modifications,
					{
						condition: "",
						modification: ""
					}
				]
			);
		}


		function removeModification(
			index: number
		): void
		{
			updateConditionalModifications(
				operationIndex,
				modifications.filter(
					(_, modificationIndex) =>
						modificationIndex !== index
				)
			);
		}


		function updateModification(
			index: number,
			key: keyof ConditionalModification,
			value: string
		): void
		{
			updateConditionalModifications(
				operationIndex,
				modifications.map(
					(
						modification,
						modificationIndex
					) =>
						modificationIndex !== index
							? modification
							: {
								...modification,
								[key]: value
							}
				)
			);
		}


		return (
			<div className="transformationSettings">
				{modifications.map(
					(modification, index) =>
						<div
							key={index}
							className="transformationModification hBox"
						>
							<input
								type="text"
								value={
									modification.condition
								}
								placeholder={t("condition")}
								spellCheck={false}
								onChange={event =>
									updateModification(
										index,
										"condition",
										event.target.value
									)
								}
								className="fillBox"
							/>

							<input
								type="text"
								value={
									modification.modification
								}
								placeholder={t("modification")}
								spellCheck={false}
								onChange={event =>
									updateModification(
										index,
										"modification",
										event.target.value
									)
								}
								className="fillBox"
							/>
							
							<button
								type="button"
								onClick={() =>
									removeModification(
										index
									)
								}
							>
								−
							</button>
						</div>
				)}

				<button
					type="button"
					onClick={addModification}
					className="fillBox"
				>
					+
				</button>
			</div>
		);
	}


	function renderGenericSettings(
		operationIndex: number,
		operation: DatatransOperation
	): ReactNode
	{
		return (
			<div className="transformationSettings">
				<label>
					<span>
						{t("operationSettings")}
					</span>

					<textarea
						value={JSON.stringify(
							operation.settings,
							null,
							2
						)}
						spellCheck={false}
						onChange={event =>
						{
							try
							{
								const value =
									JSON.parse(
										event.target.value
									);

								if (
									value &&
									typeof value === "object" &&
									!Array.isArray(value)
								)
								{
									updateOperationSettings(
										operationIndex,
										value
									);
								}
							}
							catch
							{
							}
						}}
					/>
				</label>
			</div>
		);
	}


	function renderOperationSettings(
		operationIndex: number,
		operation: DatatransOperation
	): ReactNode
	{
		switch (operation.type)
		{
			case TransformationType.FILTER:
			case TransformationType.EXCLUDE:
				return renderFilterSettings(
					operationIndex,
					operation
				);

			case TransformationType.CHANGE:
				return renderChangeSettings(
					operationIndex,
					operation
				);

			case TransformationType.COMPUTE:
			case TransformationType.GROUP:
			case TransformationType.JOIN:
			case TransformationType.PIVOT:
				return renderGenericSettings(
					operationIndex,
					operation
				);
		}
	}


	function renderTransformationPanel(): ReactNode
	{
		if (!currentTransformation)
			return null;

		return (
			<div className="transformationPanel vBox mdSpaceBox mdPaddingBox scrollBox">
				<h2>{t("operationsList")}</h2>
				<div className="transformationOperations vBox lgSpaceBox mdPaddingBox">
					{operations.map(
						(operation, index) =>
							<div
								key={index}
								className="transformationOperation"
							>
								<div className="transformationOperationHeader hBox spaceBetweenBox">
									<select
										value={operation.type}
										onChange={event =>
											updateOperationType(
												index,
												event.target.value as TransformationTypeValue
											)
										}
									>
										{Object.values(
											TransformationType
										).map(type =>
											<option
												key={type}
												value={type}
											>
												{t(type)}
											</option>
										)}
									</select>
									
									<div>
										<button
											type="button"
											onClick={() =>
												removeOperation(
													index
												)
											}
											aria-label={t("removeOperation")}
										>
											−
										</button>
									</div>
								</div>

								{renderOperationSettings(
									index,
									operation
								)}
							</div>
					)}
				</div>

				<div className="transformationPanelActions hBox">
					<button
						type="button"
						onClick={addOperation}
						aria-label={t("addOperation")}
						className="fillBox"
					>
						+
					</button>
					<button
						type="button"
						onClick={submitChanges}
						className="fillBox"
					>
						{t("save")}
					</button>
				</div>
			</div>
		);
	}


	function renderTransformations(
		nodes: TransformationNode[]
	): ReactNode
	{
		return nodes.map(
			({transformation, children}) =>
			{
				const selected =
					transformation.id ===
					currentDatatransID;

				const renaming =
					renameID === transformation.id;

				return (
					<li
						key={transformation.id}
						className={`transformationItem smPaddingBox ${selected ? "selected" : ""} ${searching ? "searching" : ""}`}
						data-original={
							transformation.name
						}
						data-name={
							transformation.name.toLowerCase()
						}
					>
						<div
							className="hBox spaceBetweenBox transformationTreeRow"
							onClick={() =>
							{
								if (!renaming)
									selectTransformation(
										transformation.id
									);
							}}
						>
							{selected ? (
								<input
									autoFocus={renaming}
									type="text"
									value={
										renaming
											? renameName
											: transformation.name
									}
									maxLength={50}
									className="nameEditInput"
									placeholder={t("transformationNamePlaceholder")}
									readOnly={!renaming}
									spellCheck={false}
									autoComplete="off"
									onClick={event =>
										event.stopPropagation()
									}
									onDoubleClick={event =>
									{
										event.stopPropagation();

										if (!renaming)
											startRenaming(
												transformation
											);
									}}
									onChange={event =>
									{
										if (renaming)
											setRenameName(
												event.target.value
											);
									}}
									onKeyDown={event =>
									{
										if (event.key === "Enter")
											confirmRenaming();
										else if (
											event.key === "Escape"
										)
											cancelRenaming();
									}}
									onBlur={() =>
									{
										if (renaming)
										{
											if (renameName.trim())
												confirmRenaming();
											else
												cancelRenaming();
										}
									}}
								/>
							) : (
								<span>
									{highlightText(
										transformation.name
									)}
								</span>
							)}

							<div className="hBox">
								<button
									type="button"
									className="transformationAddBtn"
									onClick={event =>
									{
										event.stopPropagation();

										startCreating(
											transformation.id
										);
									}}
									aria-label={t("addOperation")}
								>
									+
								</button>

								<button
									type="button"
									className="transformationDeleteBtn"
									onClick={event =>
									{
										event.stopPropagation();

										deleteTransformation(
											transformation.id
										);
									}}
									aria-label={t("delete")}
								>
									×
								</button>
							</div>
						</div>

						{selected &&
							renderTransformationPanel()}

						{(children.length > 0 ||
							createParentID === transformation.id) && (
							<ul>
								{children.length > 0 &&
									renderTransformations(
										children
									)}

								{renderCreateRow(
									transformation.id
								)}
							</ul>
						)}
					</li>
				);
			}
		);
	}


	const hasTransformations = transformations.length > 0;
	const hasFilteredResults = tree.length > 0;


	return (
		<section
			id="transformationsTab"
			className={`tab vBox smSpaceBox ${active ? "active" : ""}`}
		>
			<h1>{t("transformations")}</h1>

			<input
				id="transformationSearchInput"
				type="text"
				placeholder={t("search")}
				value={search}
				onChange={event =>
					setSearch(event.target.value)
				}
				spellCheck={false}
				autoComplete="off"
			/>

			<ul id="transformationTree" className="scrollBox">
				{tree.map(
					({file, datasets: datasetNodes}) =>
					(
						<li
							key={file.id}
							className={`transformationFile ${searching ? "searching" : ""}`}
						>
							<div className="spaceBetweenBox transformationTreeRow">
								<span
									data-original={
										file.name
									}
									data-name={
										file.name.toLowerCase()
									}
								>
									{highlightText(
										file.name
									)}
								</span>
							</div>

							<ul>
								{datasetNodes.map(
									({
										dataset,
										transformations:
											datasetTransformations
									}) =>
									(
										<li
											key={dataset.id}
											className={`transformationDataset ${searching ? "searching" : ""}`}
										>
											<div className="transformationTreeRow hBox spaceBetweenBox">
												<span
													data-original={
														dataset.name
													}
													data-name={
														dataset.name.toLowerCase()
													}
												>
													{highlightText(
														dataset.name
													)}
												</span>
												
												<div>
													<button
														type="button"
														className="transformationAddBtn"
														onClick={event =>
														{
															event.stopPropagation();

															startCreating(
																dataset.id
															);
														}}
														aria-label={t("addOperation")}
													>
														+
													</button>
												</div>
											</div>

											{(datasetTransformations.length > 0 ||
												createParentID === dataset.id) && (
												<ul>
													{datasetTransformations.length > 0 &&
														renderTransformations(
															datasetTransformations
														)}

													{renderCreateRow(
														dataset.id
													)}
												</ul>
											)}
										</li>
									)
								)}
							</ul>
						</li>
					)
				)}

				{hasTransformations &&
					!hasFilteredResults && (
						<li className="transformationFile searching">
							<span className="transformationSearchText subdued">
								{t("noResults")}
							</span>
						</li>
					)}
			</ul>
		</section>
	);
}