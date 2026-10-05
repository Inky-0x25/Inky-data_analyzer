import { ReactNode, useEffect, useMemo, useState } from "react";

import {
	DatasetField,
	DatasetHeader
} from "../../shared/models/Dataset";

import { DatasetListItem } from "../../shared/api/dataset";
import {
	ChartListItem,
	ChartResponse
} from "../../shared/api/chart";
import { DatatransListItem } from "../../shared/api/datatrans";

import {
	ChartType,
	ChartTypeValue
} from "../../shared/models/Chart";

import { t } from "../modules/i18n";
import { WavebinderRuntime } from "../wavebinder/WavebinderRuntime";

import {
	ChartVisualizationPopup
} from "./ChartVisualizationPopup";


interface ChartsTabProperties
{
	wavebinder: WavebinderRuntime;
	currentChartID: string | null;
	onChartSelected: (id: string | null) => void;
	active: boolean;
}


interface ChartSource
{
	id: string;
	name: string;
	type: "dataset" | "transformation";
}


interface DatatransContent
{
	headerRoot: unknown;
	content: unknown;
}


type ChartAggregation =
	| "sum"
	| "average"
	| "count"
	| "min"
	| "max";


function extractRows(
	value: unknown
): string[][]
{
	if (Array.isArray(value))
	{
		return value.map(
			row =>
				Array.isArray(row)
					? row.map(
						cell =>
							String(
								cell ?? ""
							)
					)
					: [
						String(
							row ?? ""
						)
					]
		);
	}

	return [];
}


function extractContent(
	value: unknown
): string[][]
{
	if (Array.isArray(value))
		return extractRows(value);

	if (
		!value ||
		typeof value !== "object"
	)
		return [];

	const object =
		value as Record<string, unknown>;

	if (Array.isArray(object.content))
		return extractRows(
			object.content
		);

	if (Array.isArray(object.cells))
		return extractRows(
			object.cells
		);

	return [];
}


function extractFieldsFromHeader(
	value: unknown
): DatasetField[]
{
	if (
		!value ||
		typeof value !== "object"
	)
		return [];

	try
	{
		const headerRoot =
			"headerRoot" in value
				? (value as Record<string, unknown>).headerRoot
				: value;

		if (
			Array.isArray(headerRoot)
		)
		{
			return headerRoot as DatasetField[];
		}

		if (
			!headerRoot ||
			typeof headerRoot !== "object"
		)
		{
			return [];
		}

		const header =
			DatasetHeader.createFromObject(
				headerRoot as Parameters<
					typeof DatasetHeader.createFromObject
				>[0]
			);

		return header.getChildFields();
	}
	catch
	{
		return [];
	}
}


export function ChartsTab({
	wavebinder,
	currentChartID,
	onChartSelected,
	active
}: ChartsTabProperties)
{
	const [charts, setCharts] =
		useState<ChartListItem[]>([]);

	const [datasets, setDatasets] =
		useState<DatasetListItem[]>([]);

	const [transformations, setTransformations] =
		useState<DatatransListItem[]>([]);

	const [currentChart, setCurrentChart] =
		useState<ChartResponse | null>(null);

	const [chartType, setChartType] =
		useState<ChartTypeValue>(
			ChartType.BAR
		);

	const [sourceID, setSourceID] =
		useState<string | null>(null);

	const [settings, setSettings] =
		useState<Record<string, unknown>>({});

	const [search, setSearch] =
		useState("");

	const [createName, setCreateName] =
		useState("");

	const [creating, setCreating] =
		useState(false);

	const [renameID, setRenameID] =
		useState<string | null>(null);

	const [renameName, setRenameName] =
		useState("");

	const [visualizing, setVisualizing] =
		useState(false);

	const [datasetContent, setDatasetContent] =
		useState<string[][]>([]);

	const [currentDataset, setCurrentDataset] =
		useState<unknown>(null);

	const [datatransContent, setDatatransContent] =
		useState<DatatransContent | null>(null);

	const [, setLanguageVersion] =
		useState(0);


	useEffect(() =>
	{
		const node =
			wavebinder.getNode(
				"chartList"
			);

		const update = (): void =>
		{
			const value =
				node.getNodeValue();

			if (!Array.isArray(value))
				return;

			setCharts(
				value as ChartListItem[]
			);
		};

		update();

		const subscription =
			node.subscribe(update);

		return () =>
			subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		const node =
			wavebinder.getNode(
				"datasetList"
			);

		const update = (): void =>
		{
			const value =
				node.getNodeValue();

			if (!Array.isArray(value))
				return;

			setDatasets(
				value as DatasetListItem[]
			);
		};

		update();

		const subscription =
			node.subscribe(update);

		return () =>
			subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		const node =
			wavebinder.getNode(
				"datatransList"
			);

		const update = (): void =>
		{
			const value =
				node.getNodeValue();

			if (!Array.isArray(value))
				return;

			setTransformations(
				value as DatatransListItem[]
			);
		};

		update();

		const subscription =
			node.subscribe(update);

		return () =>
			subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		const node =
			wavebinder.getNode(
				"currentChart"
			);

		const update = (): void =>
		{
			const value =
				node.getNodeValue();

			if (
				!value ||
				typeof value !== "object"
			)
			{
				setCurrentChart(null);
				return;
			}

			setCurrentChart(
				value as ChartResponse
			);
		};

		update();

		const subscription =
			node.subscribe(update);

		return () =>
			subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		const node =
			wavebinder.getNode(
				"datasetContent"
			);

		const update = (): void =>
		{
			const value =
				node.getNodeValue();

			setDatasetContent(
				extractContent(value)
			);
		};

		update();

		const subscription =
			node.subscribe(update);

		return () =>
			subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		const node =
			wavebinder.getNode(
				"currentDataset"
			);

		const update = (): void =>
		{
			setCurrentDataset(
				node.getNodeValue()
			);
		};

		update();

		const subscription =
			node.subscribe(update);

		return () =>
			subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		const node =
			wavebinder.getNode(
				"datatransContent"
			);

		const update = (): void =>
		{
			const value =
				node.getNodeValue();

			if (
				!value ||
				typeof value !== "object"
			)
			{
				setDatatransContent(null);
				return;
			}

			setDatatransContent(
				value as DatatransContent
			);
		};

		update();

		const subscription =
			node.subscribe(update);

		return () =>
			subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		if (!currentChart)
		{
			setChartType(
				ChartType.BAR
			);

			setSourceID(null);

			setSettings({});

			return;
		}

		setChartType(
			currentChart.type
		);

		setSourceID(
			currentChart.sourceID
		);

		setSettings(
			{
				...currentChart.settings
			}
		);
	}, [currentChart]);


	useEffect(() =>
	{
		if (!sourceID)
		{
			wavebinder.setNodeValue(
				"selectedDataset",
				null
			);

			wavebinder.setNodeValue(
				"selectedDatatrans",
				null
			);

			return;
		}

		const source =
			datasets.find(
				dataset =>
					dataset.id === sourceID
			);

		if (source)
		{
			wavebinder.setNodeValue(
				"selectedDataset",
				sourceID
			);

			wavebinder.setNodeValue(
				"selectedDatatrans",
				null
			);

			return;
		}

		const transformation =
			transformations.find(
				item =>
					item.id === sourceID
			);

		if (transformation)
		{
			wavebinder.setNodeValue(
				"selectedDatatrans",
				sourceID
			);

			wavebinder.setNodeValue(
				"selectedDataset",
				null
			);
		}
	}, [
		sourceID,
		datasets,
		transformations,
		wavebinder
	]);


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


	const searchValue =
		search.trim().toLowerCase();


	const filteredCharts =
		useMemo(
			() =>
				charts.filter(
					chart =>
						!searchValue ||
						chart.name
							.toLowerCase()
							.includes(
								searchValue
							)
				),
			[
				charts,
				searchValue
			]
		);


	const chartSources =
		useMemo<ChartSource[]>(() =>
		{
			const datasetSources =
				datasets.map(
					(dataset): ChartSource =>
					({
						id: dataset.id,
						name: dataset.name,
						type: "dataset"
					})
				);

			const transformationSources =
				transformations.map(
					(transformation): ChartSource =>
					({
						id: transformation.id,
						name: transformation.name,
						type: "transformation"
					})
				);

			return [
				...datasetSources,
				...transformationSources
			];
		}, [
			datasets,
			transformations
		]);


	const currentSourceType =
		useMemo<
			"dataset" |
			"transformation" |
			null
		>(
			() =>
			{
				if (!sourceID)
					return null;

				const source =
					chartSources.find(
						item =>
							item.id ===
							sourceID
					);

				return source?.type ?? null;
			},
			[
				sourceID,
				chartSources
			]
		);


	const currentSourceContent =
		useMemo<string[][]>(
			() =>
			{
				if (
					currentSourceType ===
					"dataset"
				)
				{
					return datasetContent;
				}

				if (
					currentSourceType ===
					"transformation"
				)
				{
					return extractContent(
						datatransContent
					);
				}

				return [];
			},
			[
				currentSourceType,
				datasetContent,
				datatransContent
			]
		);


	const currentSourceFields =
		useMemo<DatasetField[]>(
			() =>
			{
				if (
					currentSourceType ===
					"dataset"
				)
				{
					return extractFieldsFromHeader(
						currentDataset
					);
				}

				if (
					currentSourceType ===
					"transformation"
				)
				{
					return extractFieldsFromHeader(
						datatransContent?.headerRoot
					);
				}

				return [];
			},
			[
				currentSourceType,
				currentDataset,
				datatransContent
			]
		);


	function highlightText(
		text: string
	): ReactNode
	{
		if (!searchValue)
			return text;

		const lowerText =
			text.toLowerCase();

		const parts: ReactNode[] = [];

		let index = 0;
		let partIndex = 0;

		while (index < text.length)
		{
			const matchIndex =
				lowerText.indexOf(
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
					className="chartSearchMatch"
				>
					{text.slice(
						matchIndex,
						matchIndex +
							searchValue.length
					)}
				</span>
			);

			index =
				matchIndex +
				searchValue.length;
		}

		return parts;
	}


	function selectChart(
		id: string
	): void
	{
		cancelRenaming();

		wavebinder.setNodeValue(
			"selectedChart",
			id
		);

		onChartSelected(id);
	}


	function closeChart(): void
	{
		cancelRenaming();

		setVisualizing(
			false
		);

		wavebinder.setNodeValue(
			"selectedChart",
			null
		);

		onChartSelected(null);
	}


	function deleteChart(
		id: string
	): void
	{
		wavebinder.setNodeValue(
			"deleteChartRequest",
			id
		);

		if (id === currentChartID)
			closeChart();
	}


	function startCreating(): void
	{
		setCreateName("");
		setCreating(true);
		closeChart();
	}


	function cancelCreating(): void
	{
		setCreateName("");
		setCreating(false);
	}


	function getProjectID(): string | null
	{
		const project =
			wavebinder.getNodeValue(
				"selectedProject"
			);

		if (typeof project === "string")
			return project;

		if (
			project &&
			typeof project === "object" &&
			"id" in project &&
			typeof project.id === "string"
		)
		{
			return project.id;
		}

		return null;
	}


	function getDefaultSettings(
		type: ChartTypeValue
	): Record<string, unknown>
	{
		switch (type)
		{
			case ChartType.VALUE:
				return {
					formula: ""
				};

			case ChartType.BAR:
			case ChartType.LINE:
			case ChartType.AREA:
				return {
					category: "",
					value: "",
					aggregation: "sum"
				};

			case ChartType.PIE:
			case ChartType.DONUT:
				return {
					label: "",
					value: "",
					aggregation: "sum"
				};

			case ChartType.SCATTER:
				return {
					x: "",
					y: ""
				};

			case ChartType.BUBBLE:
				return {
					x: "",
					y: "",
					size: ""
				};

			case ChartType.BOX_PLOT:
				return {
					category: "",
					value: ""
				};

			case ChartType.HEATMAP:
				return {
					x: "",
					y: "",
					value: ""
				};

			case ChartType.TREEMAP:
				return {
					label: "",
					value: "",
					aggregation: "sum"
				};

			case ChartType.RADAR:
				return {
					category: "",
					value: "",
					aggregation: "sum"
				};

			case ChartType.GAUGE:
				return {
					value: "",
					min: 0,
					max: 100
				};
		}
	}


	function confirmCreating(): void
	{
		const projectID =
			getProjectID();

		if (!projectID)
			return;

		const name =
			createName.trim();

		const previousValue =
			wavebinder.getNodeValue(
				"createChart"
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
				"createChart"
			);

		const subscription =
			createNode.subscribe(() =>
			{
				const value =
					wavebinder.getNodeValue(
						"createChart"
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

				selectChart(
					value.id
				);
			});


		wavebinder.setNodeValue(
			"createChartRequest",
			{
				projectID,
				name,
				type: ChartType.BAR,
				sourceID: null,
				settings:
					getDefaultSettings(
						ChartType.BAR
					)
			}
		);
	}


	function startRenaming(
		chart: ChartListItem
	): void
	{
		setRenameID(
			chart.id
		);

		setRenameName(
			chart.name
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
			"updateChartRequest",
			{
				id: renameID,
				name
			}
		);

		cancelRenaming();
	}


	function updateChartSetting(
		key: string,
		value: unknown
	): void
	{
		setSettings(
			current =>
			({
				...current,
				[key]: value
			})
		);
	}


	function getStringSetting(
		key: string
	): string
	{
		const value =
			settings[key];

		return typeof value === "string"
			? value
			: "";
	}


	function getNumberSetting(
		key: string,
		defaultValue: number
	): number
	{
		const value =
			settings[key];

		return typeof value === "number" &&
			Number.isFinite(value)
			? value
			: defaultValue;
	}


	function getAggregationSetting(): ChartAggregation
	{
		const value =
			settings.aggregation;

		if (
			value === "average" ||
			value === "count" ||
			value === "min" ||
			value === "max"
		)
			return value;

		return "sum";
	}


	function renderTextSetting(
		key: string,
		label: string,
		placeholder?: string
	): ReactNode
	{
		return (
			<label className="hBox spaceBetweenBox">
				<span>
					{label}
				</span>

				<input
					type="text"
					value={
						getStringSetting(key)
					}
					placeholder={
						placeholder
					}
					spellCheck={false}
					autoComplete="off"
					onChange={event =>
						updateChartSetting(
							key,
							event.target.value
						)
					}
				/>
			</label>
		);
	}


	function renderAggregationSetting(): ReactNode
	{
		return (
			<label className="smSpaceBox">
				<span>
					{t("aggregation")}
				</span>

				<select
					value={
						getAggregationSetting()
					}
					onChange={event =>
						updateChartSetting(
							"aggregation",
							event.target.value
						)
					}
				>
					<option value="sum">
						{t("sum")}
					</option>

					<option value="average">
						{t("average")}
					</option>

					<option value="count">
						{t("count")}
					</option>

					<option value="min">
						{t("minimum")}
					</option>

					<option value="max">
						{t("maximum")}
					</option>
				</select>
			</label>
		);
	}


	function renderNumberSetting(
		key: string,
		label: string,
		defaultValue: number
	): ReactNode
	{
		return (
			<label className="hBox spaceBetweenBox">
				<span>
					{label}
				</span>

				<input
					type="number"
					value={
						getNumberSetting(
							key,
							defaultValue
						)
					}
					onChange={event =>
						updateChartSetting(
							key,
							event.target.value === ""
								? defaultValue
								: Number(
									event.target.value
								)
						)
					}
				/>
			</label>
		);
	}


	function renderChartSettings(): ReactNode
	{
		switch (chartType)
		{
			case ChartType.VALUE:
				return (
					<div className="chartSettings vBox mdSpaceBox">
						{renderTextSetting(
							"formula",
							t("formula"),
							"SUM(A:A)"
						)}
					</div>
				);

			case ChartType.BAR:
			case ChartType.LINE:
			case ChartType.AREA:
				return (
					<div className="chartSettings vBox mdSpaceBox">
						{renderTextSetting(
							"category",
							t("category"),
							"A"
						)}

						{renderTextSetting(
							"value",
							t("valueField"),
							"B"
						)}

						{renderAggregationSetting()}
					</div>
				);

			case ChartType.PIE:
			case ChartType.DONUT:
				return (
					<div className="chartSettings vBox mdSpaceBox">
						{renderTextSetting(
							"label",
							t("labelField"),
							"A"
						)}

						{renderTextSetting(
							"value",
							t("valueField"),
							"B"
						)}

						{renderAggregationSetting()}
					</div>
				);

			case ChartType.SCATTER:
				return (
					<div className="chartSettings vBox mdSpaceBox">
						{renderTextSetting(
							"x",
							t("xAxis"),
							"A"
						)}

						{renderTextSetting(
							"y",
							t("yAxis"),
							"B"
						)}
					</div>
				);

			case ChartType.BUBBLE:
				return (
					<div className="chartSettings vBox mdSpaceBox">
						{renderTextSetting(
							"x",
							t("xAxis"),
							"A"
						)}

						{renderTextSetting(
							"y",
							t("yAxis"),
							"B"
						)}

						{renderTextSetting(
							"size",
							t("sizeField"),
							"C"
						)}
					</div>
				);

			case ChartType.BOX_PLOT:
				return (
					<div className="chartSettings vBox mdSpaceBox">
						{renderTextSetting(
							"category",
							t("category"),
							"A"
						)}

						{renderTextSetting(
							"value",
							t("valueField"),
							"B"
						)}
					</div>
				);

			case ChartType.HEATMAP:
				return (
					<div className="chartSettings vBox mdSpaceBox">
						{renderTextSetting(
							"x",
							t("xAxis"),
							"A"
						)}

						{renderTextSetting(
							"y",
							t("yAxis"),
							"B"
						)}

						{renderTextSetting(
							"value",
							t("valueField"),
							"C"
						)}
					</div>
				);

			case ChartType.TREEMAP:
				return (
					<div className="chartSettings vBox mdSpaceBox">
						{renderTextSetting(
							"label",
							t("labelField"),
							"A"
						)}

						{renderTextSetting(
							"value",
							t("valueField"),
							"B"
						)}

						{renderAggregationSetting()}
					</div>
				);

			case ChartType.RADAR:
				return (
					<div className="chartSettings vBox mdSpaceBox">
						{renderTextSetting(
							"category",
							t("category"),
							"A"
						)}

						{renderTextSetting(
							"value",
							t("valueField"),
							"B"
						)}

						{renderAggregationSetting()}
					</div>
				);

			case ChartType.GAUGE:
				return (
					<div className="chartSettings vBox mdSpaceBox">
						{renderTextSetting(
							"value",
							t("valueField"),
							"A"
						)}

						{renderNumberSetting(
							"min",
							t("minValue"),
							0
						)}

						{renderNumberSetting(
							"max",
							t("maxValue"),
							100
						)}
					</div>
				);
		}
	}


	function saveChart(): void
	{
		if (!currentChart)
			return;

		wavebinder.setNodeValue(
			"updateChartRequest",
			{
				id: currentChart.id,
				type: chartType,
				sourceID,
				settings
			}
		);
	}


	function changeChartType(
		type: ChartTypeValue
	): void
	{
		setChartType(
			type
		);

		setSettings(
			getDefaultSettings(
				type
			)
		);
	}


	function renderChartPanel(): ReactNode
	{
		if (!currentChart)
			return null;

		return (
			<div className="chartPanel vBox spaceBetweenBox mdPaddingBox scrollBox">
				<div className="chartSettings vBox mdSpaceBox">
					<div className="hBox spaceBetweenBox">
						<label className="smSpaceBox">
							<span>
								{t("chartType")}
							</span>

							<select
								value={chartType}
								onChange={event =>
									changeChartType(
										event.target.value as ChartTypeValue
									)
								}
							>
								{Object.values(
									ChartType
								).map(
									type =>
										<option
											key={type}
											value={type}
										>
											{t(type)}
										</option>
								)}
							</select>
						</label>

						<label className="smSpaceBox">
							<span>
								{t("source")}
							</span>

							<select
								value={
									sourceID ?? ""
								}
								onChange={event =>
									setSourceID(
										event.target.value ||
										null
									)
								}
							>
								<option value="">
									{t("none")}
								</option>

								{chartSources.map(
									source =>
										<option
											key={source.id}
											value={source.id}
										>
											{source.name}
											{" "}
											(
											{source.type ===
												"dataset"
													? t("datasets")
													: t("transformations")}
											)
										</option>
								)}
							</select>
						</label>
					</div>

					{renderChartSettings()}
				</div>

				<div className="chartPanelActions hBox">
					<button
						type="button"
						onClick={() =>
						{
							saveChart();
							setVisualizing(true);
						}}
						className="fillBox"
					>
						{t("visualize")}
					</button>

					<button
						type="button"
						onClick={saveChart}
						className="fillBox"
					>
						{t("save")}
					</button>
				</div>
			</div>
		);
	}


	return (
		<section
			id="chartsTab"
			className={`tab vBox smSpaceBox ${active ? "active" : ""}`}
		>
			<div className="hBox spaceBetweenBox">
				<h1>
					{t("charts")}
				</h1>
			</div>

			<input
				id="chartSearchInput"
				type="text"
				placeholder={t("search")}
				value={search}
				onChange={event =>
					setSearch(
						event.target.value
					)
				}
				spellCheck={false}
				autoComplete="off"
			/>

			<ul
				id="chartList"
				className="scrollBox"
			>
				{filteredCharts.map(
					chart =>
					{
						const selected =
							chart.id ===
							currentChartID;

						const renaming =
							renameID ===
							chart.id;

						return (
							<li
								key={chart.id}
								className={`chartItem ${selected ? "selected" : ""}`}
								data-original={
									chart.name
								}
								data-name={
									chart.name.toLowerCase()
								}
							>
								<div
									className="hBox spaceBetweenBox"
									onClick={() =>
									{
										if (!renaming)
											selectChart(
												chart.id
											);
									}}
								>
									{selected ? (
										<input
											autoFocus={
												renaming
											}
											type="text"
											value={
												renaming
													? renameName
													: chart.name
											}
											maxLength={50}
											className="nameEditInput"
											readOnly={
												!renaming
											}
											spellCheck={
												false
											}
											autoComplete="off"
											onClick={event =>
												event.stopPropagation()
											}
											onDoubleClick={
												event =>
												{
													event.stopPropagation();

													if (!renaming)
													{
														startRenaming(
															chart
														);
													}
												}
											}
											onChange={event =>
											{
												if (renaming)
												{
													setRenameName(
														event.target.value
													);
												}
											}}
											onKeyDown={event =>
											{
												if (
													event.key ===
													"Enter"
												)
												{
													confirmRenaming();
												}
												else if (
													event.key ===
													"Escape"
												)
												{
													cancelRenaming();
												}
											}}
											onBlur={() =>
											{
												if (!renaming)
													return;

												if (
													renameName.trim()
												)
												{
													confirmRenaming();
												}
												else
												{
													cancelRenaming();
												}
											}}
										/>
									) : (
										<span>
											{highlightText(
												chart.name
											)}
										</span>
									)}

									<div className="hBox">
										<button
											type="button"
											onClick={event =>
											{
												event.stopPropagation();

												deleteChart(
													chart.id
												);
											}}
											aria-label={t("delete")}
										>
											×
										</button>
									</div>
								</div>

								{selected &&
									renderChartPanel()}
							</li>
						);
					}
				)}

				{charts.length > 0 &&
					filteredCharts.length === 0 && (
						<li className="chartItem searching">
							<span className="subdued">
								{t("noResults")}
							</span>
						</li>
					)}

				{creating ? (
					<li className="chartItem">
						<div className="hBox spaceBetweenBox">
							<input
								autoFocus
								type="text"
								value={createName}
								maxLength={50}
								className="nameEditInput"
								placeholder={
									t("chartNamePlaceholder")
								}
								spellCheck={false}
								autoComplete="off"
								onChange={event =>
									setCreateName(
										event.target.value
									)
								}
								onKeyDown={event =>
								{
									if (
										event.key ===
										"Enter"
									)
									{
										confirmCreating();
									}
									else if (
										event.key ===
										"Escape"
									)
									{
										cancelCreating();
									}
								}}
							/>

							<div className="hBox">
								<button
									type="button"
									onClick={
										confirmCreating
									}
								>
									{t("confirm")}
								</button>

								<button
									type="button"
									onClick={
										cancelCreating
									}
								>
									{t("close")}
								</button>
							</div>
						</div>
					</li>
				) : (
					<li className="chartItem chartAddItem">
						<button
							type="button"
							onClick={startCreating}
							aria-label={t("new")}
							className="fillBox"
						>
							+
						</button>
					</li>
				)}
			</ul>

			<ChartVisualizationPopup
				chart={currentChart}
				content={currentSourceContent}
				fields={currentSourceFields}
				open={visualizing}
				onClose={() =>
					setVisualizing(false)
				}
			/>
		</section>
	);
}