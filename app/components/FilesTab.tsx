import { ChangeEvent, DragEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

import { DatafileParseAction, DatafileDatasetParseOptions, DatafileResponse, UpdateDatafileContentRequest } from "../../shared/api/datafile";
import { DatasetListItem } from "../../shared/api/dataset";
import { ProjectResponse } from "../../shared/api/project";

import { t } from "../modules/i18n";
import { WavebinderRuntime } from "../wavebinder/WavebinderRuntime";


interface FilesTabProperties
{
	project: ProjectResponse;
	wavebinder: WavebinderRuntime;
	active: boolean;
}


export function FilesTab({project, wavebinder, active}: FilesTabProperties)
{
	const fileInput = useRef<HTMLInputElement>(null);
	const reimportInput = useRef<HTMLInputElement>(null);
	const nameInputs = useRef<Record<string, HTMLInputElement | null>>({});

	const [files, setFiles] = useState<DatafileResponse[]>([]);
	const [datasets, setDatasets] = useState<DatasetListItem[]>([]);

	const [isDragging, setIsDragging] = useState(false);

	const [editingFileID, setEditingFileID] = useState<string | null>(null);
	const [editingFileName, setEditingFileName] = useState("");

	const [reimportFileID, setReimportFileID] = useState<string | null>(null);
	const [reimportPlan, setReimportPlan] = useState<Record<string, DatafileDatasetParseOptions>>({});

	const [deleteFileID, setDeleteFileID] = useState<string | null>(null);
	const [dontAskDelete, setDontAskDelete] = useState(false);

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
	}, [wavebinder, project.id]);


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
	}, [wavebinder, project.id]);


	useEffect(() =>
	{
		if (!editingFileID)
			return;

		const input = nameInputs.current[editingFileID];

		if (!input)
			return;

		input.focus();
		input.select();
	}, [editingFileID]);


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


	async function fileToBuffer(file: File): Promise<ArrayBuffer>
	{
		return file.arrayBuffer();
	}


	function bufferToBase64(buffer: ArrayBuffer): string
	{
		const bytes = new Uint8Array(buffer);

		let binary = "";

		for (const byte of bytes)
			binary += String.fromCharCode(byte);

		return btoa(binary);
	}


	async function bufferToHash(buffer: ArrayBuffer): Promise<string>
	{
		const digest = await crypto.subtle.digest(
			"SHA-256",
			buffer
		);

		return Array.from(
			new Uint8Array(digest)
		)
			.map(byte => byte.toString(16).padStart(2, "0"))
			.join("");
	}


	async function addFiles(uploadedFiles: File[]): Promise<void>
	{
		const existingHashes = new Set(
			files
				.map(file => file.hash)
				.filter((hash): hash is string => hash !== null)
		);

		const importedHashes = new Set<string>();

		for (const file of uploadedFiles)
		{
			const buffer = await fileToBuffer(file);
			const hash = await bufferToHash(buffer);

			if (existingHashes.has(hash))
			{
				console.warn(
					"Skipping duplicate file:",
					file.name
				);

				continue;
			}

			if (importedHashes.has(hash))
			{
				console.warn(
					"Skipping duplicate file in selection:",
					file.name
				);

				continue;
			}

			importedHashes.add(hash);

			wavebinder.setNodeValue(
				"createDatafileRequest",
				{
					projectID: project.id,
					name: file.name,
					content: bufferToBase64(buffer)
				}
			);
		}
	}


	function openDeleteConfirmation(fileID: string): void
	{
		const dontAsk = sessionStorage.getItem("dontAskDatafileDeleteConfirmation") === "true";

		if (dontAsk)
		{
			wavebinder.setNodeValue(
				"deleteDatafileRequest",
				fileID
			);

			return;
		}

		setDeleteFileID(fileID);
		setDontAskDelete(false);
	}


	function closeDeleteConfirmation(): void
	{
		setDeleteFileID(null);
		setDontAskDelete(false);
	}


	function confirmDeleteFile(): void
	{
		if (!deleteFileID)
			return;

		if (dontAskDelete)
			sessionStorage.setItem(
				"dontAskDatafileDeleteConfirmation",
				"true"
			);

		wavebinder.setNodeValue(
			"deleteDatafileRequest",
			deleteFileID
		);

		closeDeleteConfirmation();
	}


	function openFilePicker(): void
	{
		fileInput.current?.click();
	}


	function handleFileInput(event: ChangeEvent<HTMLInputElement>): void
	{
		const uploadedFiles = Array.from(
			event.target.files ?? []
		);

		if (uploadedFiles.length)
			void addFiles(uploadedFiles);

		event.target.value = "";
	}


	function handleDragEnter(event: DragEvent<HTMLDivElement>): void
	{
		event.preventDefault();
		setIsDragging(true);
	}


	function handleDragLeave(event: DragEvent<HTMLDivElement>): void
	{
		event.preventDefault();

		if (!event.currentTarget.contains(event.relatedTarget as Node))
			setIsDragging(false);
	}


	function handleDrop(event: DragEvent<HTMLDivElement>): void
	{
		event.preventDefault();
		setIsDragging(false);

		const uploadedFiles = Array.from(
			event.dataTransfer.files
		);

		if (uploadedFiles.length)
			void addFiles(uploadedFiles);
	}


	function openReimportPopup(fileID: string): void
	{
		const fileDatasets = datasets.filter(
			dataset => dataset.sourceFileId === fileID
		);

		const plan: Record<string, DatafileDatasetParseOptions> = {};

		for (const dataset of fileDatasets)
		{
			plan[dataset.id] =
			{
				datasetId: dataset.id,
				action: DatafileParseAction.UPDATE_CONTENT,
				parseOptions:
				{
					headerDepth: dataset.parseOptions.headerDepth,
					contentOnly: true
				}
			};
		}

		setReimportFileID(fileID);
		setReimportPlan(plan);
	}


	function closeReimportPopup(): void
	{
		setReimportFileID(null);
		setReimportPlan({});
	}


	function setReimportAction(datasetID: string, action: DatafileDatasetParseOptions["action"]): void
	{
		setReimportPlan(current =>
		({
			...current,
			[datasetID]:
			{
				...current[datasetID],
				action
			}
		}));
	}


	function setReimportHeaderDepth(datasetID: string, headerDepth: number): void
	{
		setReimportPlan(current =>
		({
			...current,
			[datasetID]:
			{
				...current[datasetID],
				parseOptions:
				{
					...current[datasetID].parseOptions,
					headerDepth: Math.max(1, headerDepth)
				}
			}
		}));
	}


	function openReplacementFilePicker(): void
	{
		reimportInput.current?.click();
	}


	async function handleReplacementFile(event: ChangeEvent<HTMLInputElement>): Promise<void>
	{
		const file = event.target.files?.[0];

		if (!file || !reimportFileID)
		{
			event.target.value = "";
			return;
		}

		const buffer = await fileToBuffer(file);
		const content = bufferToBase64(buffer);

		const request: UpdateDatafileContentRequest =
		{
			id: reimportFileID,
			name: file.name,
			content,
			datasets: Object.values(reimportPlan)
		};

		wavebinder.setNodeValue(
			"replaceDatafileContentRequest",
			request
		);

		event.target.value = "";
		closeReimportPopup();
	}


	function startEditingFile(file: DatafileResponse): void
	{
		setEditingFileID(file.id);
		setEditingFileName(file.name);
	}


	function cancelEditingFile(): void
	{
		setEditingFileID(null);
		setEditingFileName("");
	}


	function saveFileName(file: DatafileResponse): void
	{
		const name = editingFileName.trim();

		if (!name || name === file.name)
		{
			cancelEditingFile();
			return;
		}

		wavebinder.setNodeValue(
			"updateDatafileRequest",
			{
				id: file.id,
				name
			}
		);

		cancelEditingFile();
	}


	function handleFileNameChange(event: ChangeEvent<HTMLInputElement>): void
	{
		setEditingFileName(event.target.value);
	}


	function handleFileNameKeyDown(event: KeyboardEvent<HTMLInputElement>, file: DatafileResponse): void
	{
		if (editingFileID !== file.id)
			return;

		if (event.key === "Enter")
		{
			event.preventDefault();
			saveFileName(file);
		}
		else if (event.key === "Escape")
		{
			event.preventDefault();
			cancelEditingFile();
		}
	}


	function handleFileNameBlur(file: DatafileResponse): void
	{
		if (editingFileID !== file.id)
			return;

		saveFileName(file);
	}


	function clearInvalidFiles(): void
	{
		for (const file of files)
		{
			if (!file.error)
				continue;

			wavebinder.setNodeValue(
				"deleteDatafileRequest",
				file.id
			);
		}
	}


	function clearFiles(): void
	{
		for (const file of files)
		{
			wavebinder.setNodeValue(
				"deleteDatafileRequest",
				file.id
			);
		}
	}


	const errors = files.filter(file => file.error !== null).length;
	const reimportFile = files.find(file => file.id === reimportFileID);
	const reimportDatasets = datasets.filter(dataset => dataset.sourceFileId === reimportFileID);
	const hasReimportActions = reimportDatasets.length === 0 || Object.values(reimportPlan).some(operation => operation.action !== DatafileParseAction.NONE);


	return (
		<section id="filesTab" className={`tab vBox smSpaceBox ${active ? "active" : ""}`}>
			<h1>{t("importFiles")}</h1>

			<p>{t("importFilesDescription")}</p>

			<div
				id="dropZone"
				className={isDragging ? "dragging" : ""}
				onClick={openFilePicker}
				onDragEnter={handleDragEnter}
				onDragOver={event => event.preventDefault()}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				<p>{t("dragDropFiles")}</p>

				<p>{t("or")}</p>

				<input
					ref={fileInput}
					type="file"
					multiple
					accept=".json,.csv,.xlsx,.xls,.db,.sqlite,.sql"
					hidden
					onChange={handleFileInput}
				/>

				<button
					id="browseButton"
					onClick={event =>
					{
						event.stopPropagation();
						openFilePicker();
					}}
				>
					{t("browseFiles")}
				</button>
			</div>

			<div className="hBox bottomBox smSpaceBox">
				<h2>{t("fileList")}</h2>

				<p>{t("total")}</p>
				<p id="totalFileNumber">{files.length}</p>

				<p>{t("errors")}</p>
				<p id="errorsFileNumber">{errors}</p>
			</div>

			<ul id="fileList" className="borderlessBox">
				{files.length === 0 && (
					<li>{t("noFilesSelected")}</li>
				)}

				{files.map(file =>
					<li
						key={file.id}
						className="fileRow hBox spaceBetweenBox"
					>
						<input
							ref={input =>
							{
								nameInputs.current[file.id] = input;
							}}
							className="nameEditInput"
							type="text"
							maxLength={50}
							placeholder={t("datafileNamePlaceholder")}
							value={editingFileID === file.id ? editingFileName : file.name}
							readOnly={editingFileID !== file.id}
							spellCheck={false}
							autoComplete="off"
							onDoubleClick={() => startEditingFile(file)}
							onChange={handleFileNameChange}
							onKeyDown={event => handleFileNameKeyDown(event, file)}
							onBlur={() => handleFileNameBlur(file)}
						/>

						<div className="fileActions hBox smSpaceBox">
							{file.error !== null && (
								<p
									className="fileError"
									title={file.error}
								>
									!
								</p>
							)}

							<button
								title={t("reimport")}
								onClick={() => openReimportPopup(file.id)}
							>
								O
							</button>

							<button
								title={t("delete")}
								onClick={() => openDeleteConfirmation(file.id)}
							>
								X
							</button>
						</div>
					</li>
				)}
			</ul>

			<input
				ref={reimportInput}
				id="reimportInput"
				type="file"
				accept=".json,.csv,.xlsx,.xls,.db,.sqlite,.sql"
				hidden
				onChange={event => void handleReplacementFile(event)}
			/>

			<div id="fileListActions">
				<button onClick={clearInvalidFiles}>
					{t("clearInvalidFiles")}
				</button>

				<button onClick={clearFiles}>
					{t("clearAllFiles")}
				</button>
			</div>

			{reimportFile && (
				<div className="popupBox">
					<div className="popupPanel">
						<button
							className="popupCloseBtn"
							onClick={closeReimportPopup}
						>
							X
						</button>

						<h1>{t("reimport")} - {reimportFile.name}</h1>

						<div className="vBox mdSpaceBox">
							<div className="vBox mdSpaceBox">
								{reimportDatasets.length === 0 && (
									<p>{t("noDatasetsAssociated")}</p>
								)}

								{reimportDatasets.map(dataset =>
								{
									const operation = reimportPlan[dataset.id];

									if (!operation)
										return null;

									return (
										<div
											key={dataset.id}
											className="vBox smSpaceBox"
										>
											<div className="hBox spaceBetweenBox">
												<span>{dataset.name}</span>

												<select
													value={operation.action}
													onChange={event =>
														setReimportAction(
															dataset.id,
															event.target.value as DatafileDatasetParseOptions["action"]
														)
													}
												>
													<option value={DatafileParseAction.UPDATE_CONTENT}>
														{t("updateContent")}
													</option>

													<option value={DatafileParseAction.REPARSE}>
														{t("reparseEntirely")}
													</option>

													<option value={DatafileParseAction.NONE}>
														{t("doNothing")}
													</option>
												</select>
											</div>

											{operation.action === DatafileParseAction.REPARSE && (
												<div className="hBox spaceBetweenBox">
													<span>{t("headerDepth")}</span>

													<input
														type="number"
														min={1}
														value={operation.parseOptions.headerDepth}
														onChange={event =>
															setReimportHeaderDepth(
																dataset.id,
																Number(event.target.value)
															)
														}
													/>
												</div>
											)}
										</div>
									);
								})}
							</div>

							<div className="hBox spaceBetweenBox">
								<span>{t("replacementFile")}</span>

								<button
									disabled={!hasReimportActions}
									onClick={openReplacementFilePicker}
								>
									{t("reimport")}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{deleteFileID && (
				<div className="popupBox">
					<div className="popupPanel">
						<button
							className="popupCloseBtn"
							onClick={closeDeleteConfirmation}
						>
							X
						</button>

						<h1>{t("deleteFile")}</h1>

						<div className="vBox mdSpaceBox">
							<p>
								{t("deleteFileQuestion")}{" "}
								<strong>
									{files.find(file => file.id === deleteFileID)?.name ?? t("thisFile")}
								</strong>
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

							<button onClick={confirmDeleteFile}>
								{t("confirm")}
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}