import { useEffect, useRef, useState } from "react";

import { DatafileResponse } from "../../shared/api/datafile";
import {
	DatasetResponse,
	UpdateDatasetRequest
} from "../../shared/api/dataset";
import {
	Dataset,
	DatasetField
} from "../../shared/models/Dataset";

import { t } from "../modules/i18n";
import { WavebinderRuntime } from "../wavebinder/WavebinderRuntime";

import { DatasetTable } from "./DatasetTable";


interface DatasetInspectorProperties
{
	wavebinder: WavebinderRuntime;
	onFieldInspected: (field: DatasetField) => void;
	onFieldInfo: (field: DatasetField) => void;
}


export function DatasetInspector({
	wavebinder,
	onFieldInspected,
	onFieldInfo
}: DatasetInspectorProperties)
{
	const [dataset, setDataset] =
		useState<Dataset | null>(null);

	const [content, setContent] =
		useState<string[][]>([]);

	const [files, setFiles] =
		useState<DatafileResponse[]>([]);

	const [editingDatasetName, setEditingDatasetName] =
		useState(false);

	const [datasetName, setDatasetName] =
		useState("");


	const nameInput =
		useRef<HTMLInputElement>(null);

	const [, setLanguageVersion] =
		useState(0);


	useEffect(() =>
	{
		const currentDatasetNode =
			wavebinder.getNode(
				"currentDataset"
			);

		const datasetContentNode =
			wavebinder.getNode(
				"datasetContent"
			);


		const updateCurrentDataset = () =>
		{
			const value =
				currentDatasetNode.getNodeValue();


			if (!value)
			{
				setDataset(null);
				return;
			}


			setDataset(
				Dataset.createFromObject(
					value as DatasetResponse
				)
			);
		};


		const updateDatasetContent = () =>
		{
			const value =
				datasetContentNode.getNodeValue();


			if (!Array.isArray(value))
			{
				setContent([]);
				return;
			}


			setContent(
				value as string[][]
			);
		};


		updateCurrentDataset();
		updateDatasetContent();


		const currentDatasetSubscription =
			currentDatasetNode.subscribe(
				updateCurrentDataset
			);

		const datasetContentSubscription =
			datasetContentNode.subscribe(
				updateDatasetContent
			);


		return () =>
		{
			currentDatasetSubscription.unsubscribe();
			datasetContentSubscription.unsubscribe();
		};
	}, [wavebinder]);


	useEffect(() =>
	{
		const datafileList =
			wavebinder.getNode(
				"datafileList"
			);


		const updateFiles = () =>
		{
			const value =
				datafileList.getNodeValue();


			if (!Array.isArray(value))
				return;


			setFiles(
				value as DatafileResponse[]
			);
		};


		updateFiles();


		const subscription =
			datafileList.subscribe(
				updateFiles
			);


		return () =>
			subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		setDatasetName(
			dataset?.name ?? ""
		);

		setEditingDatasetName(false);
	}, [dataset]);


	useEffect(() =>
	{
		if (!editingDatasetName)
			return;


		nameInput.current?.focus();
		nameInput.current?.select();
	}, [editingDatasetName]);


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


	function startEditingDatasetName(): void
	{
		if (!dataset)
			return;


		setDatasetName(
			dataset.name
		);

		setEditingDatasetName(true);
	}


	function cancelEditingDatasetName(): void
	{
		setDatasetName(
			dataset?.name ?? ""
		);

		setEditingDatasetName(false);
	}


	function saveDatasetName(): void
	{
		if (!dataset)
			return;


		const name =
			datasetName.trim();


		if (!name || name === dataset.name)
		{
			cancelEditingDatasetName();
			return;
		}


		const request: UpdateDatasetRequest =
		{
			id: dataset.id,
			name
		};


		wavebinder.setNodeValue(
			"updateDatasetRequest",
			request
		);


		setEditingDatasetName(false);
	}


	const sourceFile =
		dataset?.sourceFileId
			? files.find(
				file =>
					file.id === dataset.sourceFileId
			)
			: null;


	const fields =
		dataset?.fields ?? [];


	return (
		<div
			id="datasetInspectorDiv"
			className="vBox"
		>
			<div
				id="datasetHeaderDiv"
				className="hBox bottomBox spaceBetweenBox"
			>
				<div className="vBox">
					<h1>
						<input
							ref={nameInput}
							id="datasetName"
							className="nameEditInput"
							type="text"
							maxLength={50}
							placeholder={t("datasetNamePlaceholder")}
							value={datasetName}
							spellCheck={false}
							autoComplete="off"
							readOnly={!editingDatasetName}
							onDoubleClick={
								startEditingDatasetName
							}
							onChange={event =>
								setDatasetName(
									event.target.value
								)
							}
							onKeyDown={event =>
							{
								if (event.key === "Enter")
								{
									event.preventDefault();
									saveDatasetName();
								}
								else if (event.key === "Escape")
								{
									event.preventDefault();
									cancelEditingDatasetName();
								}
							}}
							onBlur={() =>
							{
								if (editingDatasetName)
									saveDatasetName();
							}}
						/>
					</h1>
				</div>


				<div
					id="datasetInfoBtn"
					className="dropdown"
				>
					ⓘ

					<div
						id="datasetInfoPopup"
						className="dropdown-menu"
					>
						<table>
							<tbody>
								<tr>
									<td>{t("rows")}</td>
									<td id="datasetRowsNumber">
										{content.length}
									</td>
								</tr>

								<tr>
									<td>{t("columns")}</td>
									<td id="datasetColumnsNumber">
										{fields.length}
									</td>
								</tr>

								<tr>
									<td>{t("headerDepth")}</td>
									<td id="datasetHeaderDepthNumber">
										{dataset?.headerRoot.getDepth() ?? 0}
									</td>
								</tr>

								<tr>
									<td>{t("sourceFile")}</td>
									<td id="datasetSourceFileName">
										{sourceFile?.name ?? "-"}
									</td>
								</tr>

								<tr>
									<td>{t("format")}</td>
									<td id="datasetFormat">
										{sourceFile?.type ?? "-"}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>


			<DatasetTable
				dataset={dataset}
				content={content}
				fields={fields}
				wavebinder={wavebinder}
				onFieldInspected={onFieldInspected}
				onFieldInfo={onFieldInfo}
			/>
		</div>
	);
}