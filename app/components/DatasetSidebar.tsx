import { ReactNode, useEffect, useState } from "react";

import { DatafileResponse } from "../../shared/api/datafile";
import { DatasetListItem } from "../../shared/api/dataset";

import { t } from "../modules/i18n";
import { WavebinderRuntime } from "../wavebinder/WavebinderRuntime";


interface DatasetSidebarProperties
{
	wavebinder: WavebinderRuntime;
	currentDatasetID: string | null;
	onDatasetSelected: (id: string) => void;
}


export function DatasetSidebar({wavebinder, currentDatasetID, onDatasetSelected}: DatasetSidebarProperties)
{
	const [files, setFiles] = useState<DatafileResponse[]>([]);
	const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
	const [search, setSearch] = useState("");
	const [sidebarOpen, setSidebarOpen] = useState(true);

	const [, setLanguageVersion] = useState(0);


	useEffect(() =>
	{
		const datafileList = wavebinder.getNode("datafileList");

		const updateFiles = () =>
		{
			const value = datafileList.getNodeValue();

			if (!Array.isArray(value))
				return;

			setFiles(value as DatafileResponse[]);
		};

		updateFiles();

		const subscription = datafileList.subscribe(updateFiles);

		return () => subscription.unsubscribe();
	}, [wavebinder]);


	useEffect(() =>
	{
		const datasetList = wavebinder.getNode("datasetList");

		const updateDatasets = () =>
		{
			const value = datasetList.getNodeValue();

			if (!Array.isArray(value))
				return;

			setDatasets(value as DatasetListItem[]);
		};

		updateDatasets();

		const subscription = datasetList.subscribe(updateDatasets);

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


	const searchValue = search.trim().toLowerCase();
	const searching = searchValue.length > 0;

	const currentDataset = datasets.find(
		dataset => dataset.id === currentDatasetID
	);

	const currentDatafileID = currentDataset?.sourceFileId ?? null;


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
			const matchIndex = lowerText.indexOf(searchValue, index);

			if (matchIndex === -1)
			{
				parts.push(text.slice(index));
				break;
			}

			if (matchIndex > index)
				parts.push(text.slice(index, matchIndex));

			parts.push(
				<span
					key={partIndex++}
					className="datasetSearchMatch"
				>
					{text.slice(matchIndex, matchIndex + searchValue.length)}
				</span>
			);

			index = matchIndex + searchValue.length;
		}

		return parts;
	}


	const filteredFiles = files.map(file =>
	{
		const fileDatasets = datasets.filter(
			dataset => dataset.sourceFileId === file.id
		);

		const fileMatches = file.name.toLowerCase().includes(searchValue);

		const filteredDatasets = fileMatches
			? fileDatasets
			: fileDatasets.filter(
				dataset => dataset.name.toLowerCase().includes(searchValue)
			);

		return {
			file,
			datasets: filteredDatasets
		};
	}).filter(group => group.datasets.length > 0);


	const hasDatasets = datasets.length > 0;
	const hasFilteredResults = filteredFiles.length > 0;


	function toggleSidebar(): void
	{
		setSidebarOpen(current => !current);
	}


	return (
		<>
			<div
				id="datasetSidebarDiv"
				className={`vBox ${sidebarOpen ? "" : "closed"}`}
			>
				<h1>{t("datasets")}</h1>

				<input
					id="datasetSearchInput"
					type="text"
					placeholder={t("search")}
					value={search}
					onChange={event => setSearch(event.target.value)}
					spellCheck={false}
					autoComplete="off"
				/>

				<ul id="datasetTree">
					{filteredFiles.map(({file, datasets: fileDatasets}) =>
					{
						const fileSelected = file.id === currentDatafileID;

						return (
							<li
								key={file.id}
								className={`datasetFile ${fileSelected ? "selected" : ""} ${searching ? "searching" : ""}`}
							>
								<span
									data-original={file.name}
									data-name={file.name.toLowerCase()}
								>
									{fileSelected
										? file.name
										: highlightText(file.name)}
								</span>

								<ul>
									{fileDatasets.map(dataset =>
									{
										const selected = dataset.id === currentDatasetID;

										return (
											<li
												key={dataset.id}
												className={`datasetItem ${selected ? "selected" : ""} ${searching ? "searching" : ""}`}
												data-original={dataset.name}
												data-name={dataset.name.toLowerCase()}
												onClick={() => onDatasetSelected(dataset.id)}
											>
												{selected
													? dataset.name
													: highlightText(dataset.name)}
											</li>
										);
									})}
								</ul>
							</li>
						);
					})}

					{!hasDatasets && (
						<li className="datasetFile selected">
							<span>{t("filesMissing")}</span>

							<ul>
								<li className="datasetItem selected">
									{t("datasetsMissing")}
								</li>
							</ul>
						</li>
					)}

					{hasDatasets && !hasFilteredResults && (
						<li className="datasetFile searching">
							<span className="datasetSearchText subdued">
								{t("noResults")}
							</span>
						</li>
					)}
				</ul>
			</div>

			<button
				id="datasetSidebarToggleBtn"
				onClick={toggleSidebar}
				aria-label={sidebarOpen ? t("closeDatasetSidebar") : t("openDatasetSidebar")}
			>
				{sidebarOpen ? "<" : ">"}
			</button>
		</>
	);
}