import { useEffect, useRef, useState } from "react";

import {
	DatasetListItem,
	DatasetResponse
} from "../../shared/api/dataset";
import { Project } from "../../shared/models/Project";
import {
	Dataset,
	DatasetField
} from "../../shared/models/Dataset";

import { WavebinderRuntime } from "../wavebinder/WavebinderRuntime";

import { ColumnInfoPopup } from "./ColumnInfoPopup";
import { ColumnInspectorPopup } from "./ColumnInspectorPopup";
import { DatasetInspector } from "./DatasetInspector";
import { DatasetSidebar } from "./DatasetSidebar";


interface DataTabProperties
{
	project: Project;
	wavebinder: WavebinderRuntime;
	active: boolean;
}


export function DataTab({project, wavebinder, active}: DataTabProperties)
{
	const [datasets, setDatasets] =
		useState<DatasetListItem[]>([]);

	const [selectedDatasetID, setSelectedDatasetID] =
		useState<string | null>(null);

	const [currentDataset, setCurrentDataset] =
		useState<Dataset | null>(null);

	const [datasetContent, setDatasetContent] =
		useState<string[][]>([]);

	const [inspectedField, setInspectedField] =
		useState<DatasetField | null>(null);

	const [infoField, setInfoField] =
		useState<DatasetField | null>(null);

	const datasetsRef =
		useRef<DatasetListItem[]>([]);

	const previousDatasetCountRef =
		useRef(0);


	useEffect(() =>
	{
		const selectedDatasetNode =
			wavebinder.getNode("selectedDataset");


		const updateSelectedDataset = () =>
		{
			const value =
				selectedDatasetNode.getNodeValue();


			setSelectedDatasetID(
				typeof value === "string"
					? value
					: null
			);
		};


		updateSelectedDataset();


		const subscription =
			selectedDatasetNode.subscribe(
				updateSelectedDataset
			);


		return () =>
			subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		const datasetList =
			wavebinder.getNode("datasetList");


		const updateDatasets = () =>
		{
			const value =
				datasetList.getNodeValue();


			if (!Array.isArray(value))
				return;


			const nextDatasets =
				value as DatasetListItem[];

			const previousCount =
				previousDatasetCountRef.current;


			datasetsRef.current =
				nextDatasets;

			setDatasets(
				nextDatasets
			);


			if (
				previousCount === 0 &&
				nextDatasets.length > 0
			)
			{
				wavebinder.setNodeValue(
					"selectedDataset",
					nextDatasets[0].id
				);
			}


			previousDatasetCountRef.current =
				nextDatasets.length;
		};


		updateDatasets();


		const subscription =
			datasetList.subscribe(
				updateDatasets
			);


		return () =>
			subscription.unsubscribe();
	}, [wavebinder, project.id]);


	useEffect(() =>
	{
		if (!selectedDatasetID)
		{
			wavebinder.setNodeValue(
				"selectedDatafile",
				null
			);

			setCurrentDataset(null);
			setDatasetContent([]);

			return;
		}


		const selectedDataset =
			datasetsRef.current.find(
				dataset =>
					dataset.id === selectedDatasetID
			);


		if (!selectedDataset)
			return;


		wavebinder.setNodeValue(
			"selectedDatafile",
			selectedDataset.sourceFileId
		);


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
				setCurrentDataset(null);
				return;
			}


			setCurrentDataset(
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
				setDatasetContent([]);
				return;
			}


			setDatasetContent(
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
	}, [wavebinder, selectedDatasetID]);


	function selectDataset(id: string): void
	{
		wavebinder.setNodeValue(
			"selectedDataset",
			id
		);
	}


	return (
		<section
			id="dataTab"
			className={`tab borderlessBox ${active ? "active" : ""}`}
		>
			<div
				id="datasetWorkspaceDiv"
				className="hBox"
			>
				<DatasetSidebar
					wavebinder={wavebinder}
					currentDatasetID={selectedDatasetID}
					onDatasetSelected={selectDataset}
				/>

				<DatasetInspector
					wavebinder={wavebinder}
					onFieldInspected={setInspectedField}
					onFieldInfo={setInfoField}
				/>
			</div>


			<ColumnInspectorPopup
				field={inspectedField}
				dataset={currentDataset}
				project={project}
				wavebinder={wavebinder}
				onClose={() =>
					setInspectedField(null)
				}
			/>


			<ColumnInfoPopup
				field={infoField}
				onClose={() =>
					setInfoField(null)
				}
			/>
		</section>
	);
}