import { MouseEvent, ReactNode, useEffect, useRef, useState } from "react";

import {
	Dataset,
	DatasetField,
	DatasetHeader
} from "../../shared/models/Dataset";
import { DatafileParseAction } from "../../shared/api/datafile";
import { WavebinderRuntime } from "../wavebinder/WavebinderRuntime";


interface DatasetTableProperties
{
	dataset: Dataset | null;
	content: string[][];
	fields: DatasetField[];
	wavebinder: WavebinderRuntime;
	onFieldInspected: (field: DatasetField) => void;
	onFieldInfo: (field: DatasetField) => void;
}


interface FieldPath
{
	field: DatasetField;
	path: DatasetHeader[];
	columnIndex: number;
}


export function DatasetTable({
	dataset,
	content,
	fields,
	wavebinder,
	onFieldInspected,
	onFieldInfo
}: DatasetTableProperties)
{
	const tableWrapperRef =
		useRef<HTMLDivElement | null>(null);

	const tableHeadRef =
		useRef<HTMLTableSectionElement | null>(null);

	const tableBodyRef =
		useRef<HTMLTableSectionElement | null>(null);

	const [separatorTop, setSeparatorTop] =
		useState(0);

	const [isHeaderResizing, setIsHeaderResizing] =
		useState(false);


	useEffect(() =>
	{
		const wrapper =
			tableWrapperRef.current;

		const tableHead =
			tableHeadRef.current;

		if (!wrapper || !tableHead)
			return;

		const currentWrapper =
			wrapper;

		const currentTableHead =
			tableHead;


		function updateSeparatorPosition(): void
		{
			const wrapperRect =
				currentWrapper.getBoundingClientRect();

			const headRect =
				currentTableHead.getBoundingClientRect();

			setSeparatorTop(
				headRect.bottom -
				wrapperRect.top
			);
		}


		updateSeparatorPosition();


		const observer =
			new ResizeObserver(
				updateSeparatorPosition
			);

		observer.observe(
			currentTableHead
		);

		return () =>
			observer.disconnect();
	}, [
		dataset,
		fields,
		content
	]);


	function collectFieldPaths(
		header: DatasetHeader,
		path: DatasetHeader[] = [],
		columnIndex = 0
	): FieldPath[]
	{
		const result: FieldPath[] = [];

		let currentColumnIndex =
			columnIndex;


		for (const child of header.children)
		{
			if (child instanceof DatasetField)
			{
				result.push(
				{
					field:
						child,

					path:
						path,

					columnIndex:
						currentColumnIndex
				});

				currentColumnIndex++;
				continue;
			}


			const childFields =
				collectFieldPaths(
					child,
					[
						...path,
						child
					],
					currentColumnIndex
				);

			result.push(
				...childFields
			);

			currentColumnIndex +=
				childFields.length;
		}

		return result;
	}


	function getFieldCount(
		header: DatasetHeader
	): number
	{
		let count = 0;

		for (const child of header.children)
		{
			if (child instanceof DatasetField)
				count++;
			else
				count += getFieldCount(child);
		}

		return count;
	}


	function renderField(
		field: DatasetField,
		columnIndex: number,
		rowSpan: number
	): ReactNode
	{
		return (
			<th
				key={
					`field-header-${columnIndex}`
				}
				rowSpan={rowSpan}
			>
				<div className="datasetColumnHeader">
					<div className="datasetColumnTitle">
						<span>
							{field.name}
						</span>

						<div className="datasetColumnActions hBox smSpaceBox">
							<button
								className="columnEditBtn"
								onClick={() =>
									onFieldInspected(
										field
									)
								}
							>
								✎
							</button>

							<button
								className="columnInfoBtn"
								onClick={() =>
									onFieldInfo(
										field
									)
								}
							>
								ⓘ
							</button>
						</div>
					</div>

					<div className="datasetColumnTags hBox smSpaceBox">
						<span className="datasetColumnTag">
							{field.type}
						</span>

						{field.categories.map(
							category =>
								<span
									key={category}
									className="datasetColumnTag"
								>
									{category}
								</span>
						)}
					</div>
				</div>
			</th>
		);
	}


	function renderHeaderRows(): ReactNode[]
	{
		if (!dataset)
			return [];


		const depth =
			Math.max(
				1,
				dataset.parseOptions.headerDepth
			);


		const fieldPaths =
			collectFieldPaths(
				dataset.headerRoot
			);


		const rows: ReactNode[][] =
			Array.from(
				{length: depth},
				() => []
			);


		for (
			let level = 0;
			level < depth;
			level++
		)
		{
			let column = 0;

			while (
				column <
				fieldPaths.length
			)
			{
				const entry =
					fieldPaths[column];

				if (
					entry.path.length <=
					level
				)
				{
					if (
						entry.path.length ===
						level
					)
					{
						rows[level].push(
							renderField(
								entry.field,
								entry.columnIndex,
								depth -
									level
							)
						);
					}

					column++;
					continue;
				}


				const header =
					entry.path[level];

				let span = 1;

				while (
					column + span <
						fieldPaths.length &&
					fieldPaths[
						column + span
					].path.length >
						level &&
					fieldPaths[
						column + span
					].path[level] ===
						header
				)
				{
					span++;
				}


				rows[level].push(
					<th
						key={
							`header-${level}-${entry.columnIndex}-${header.name}`
						}
						colSpan={
							getFieldCount(
								header
							)
						}
					>
						{header.name}
					</th>
				);

				column += span;
			}
		}


		return rows.map(
			(cells, index) =>
				<tr
					key={
						`datasetHeaderRow-${index}`
					}
				>
					<th className="cornerCell"></th>

					{cells}
				</tr>
		);
	}


	function getCurrentDepth(): number
	{
		if (!dataset)
			return 1;

		return Math.max(
			1,
			dataset.parseOptions.headerDepth
		);
	}


	function getCurrentSeparatorPosition(): number
	{
		const wrapper =
			tableWrapperRef.current;

		const tableHead =
			tableHeadRef.current;

		if (!wrapper || !tableHead)
			return separatorTop;

		const wrapperRect =
			wrapper.getBoundingClientRect();

		const headRect =
			tableHead.getBoundingClientRect();

		return (
			headRect.bottom -
			wrapperRect.top
		);
	}


	function getSeparatorPositionForDepth(
		depth: number
	): number
	{
		const wrapper =
			tableWrapperRef.current;

		const tableHead =
			tableHeadRef.current;

		const tableBody =
			tableBodyRef.current;

		if (
			!wrapper ||
			!tableHead ||
			!tableBody ||
			!dataset
		)
		{
			return separatorTop;
		}


		const wrapperRect =
			wrapper.getBoundingClientRect();

		const currentDepth =
			getCurrentDepth();


		if (
			depth <=
			currentDepth
		)
		{
			const headerRow =
				tableHead.rows[depth];

			if (!headerRow)
				return getCurrentSeparatorPosition();

			return (
				headerRow.getBoundingClientRect().bottom -
				wrapperRect.top
			);
		}


		const bodyRowIndex =
			depth -
			currentDepth;

		const bodyRow =
			tableBody.rows[
				bodyRowIndex
			];

		if (!bodyRow)
			return getCurrentSeparatorPosition();

		return (
			bodyRow.getBoundingClientRect().top -
			wrapperRect.top
		);
	}


	function getMaximumHeaderDepth(): number
	{
		const tableBody =
			tableBodyRef.current;

		if (!dataset || !tableBody)
			return getCurrentDepth();

		return (
			getCurrentDepth() +
			tableBody.rows.length -
			1
		);
	}


	function getHeaderDepthFromPosition(
		clientY: number
	): number
	{
		if (
			!dataset ||
			!tableWrapperRef.current
		)
		{
			return getCurrentDepth();
		}


		const wrapperRect =
			tableWrapperRef.current
				.getBoundingClientRect();

		const position =
			clientY -
			wrapperRect.top;

		const currentDepth =
			getCurrentDepth();

		const maximumDepth =
			getMaximumHeaderDepth();

		let closestDepth =
			currentDepth;

		let closestDistance =
			Infinity;


		for (
			let depth = 1;
			depth <= maximumDepth;
			depth++
		)
		{
			const tickPosition =
				getSeparatorPositionForDepth(
					depth
				);

			const distance =
				Math.abs(
					position -
					tickPosition
				);

			if (
				distance <
				closestDistance
			)
			{
				closestDistance =
					distance;

				closestDepth =
					depth;
			}
		}


		return closestDepth;
	}


	function startHeaderResize(
		event: MouseEvent<HTMLDivElement>
	): void
	{
		if (!dataset)
			return;

		const currentDataset =
			dataset;


		event.preventDefault();

		setIsHeaderResizing(
			true
		);

		const startDepth =
			getCurrentDepth();

		let nextDepth =
			startDepth;


		function onMouseMove(
			moveEvent: globalThis.MouseEvent
		): void
		{
			nextDepth =
				getHeaderDepthFromPosition(
					moveEvent.clientY
				);

			setSeparatorTop(
				getSeparatorPositionForDepth(
					nextDepth
				)
			);
		}


		function onMouseUp(): void
		{
			document.removeEventListener(
				"mousemove",
				onMouseMove
			);

			document.removeEventListener(
				"mouseup",
				onMouseUp
			);

			setIsHeaderResizing(
				false
			);

			setSeparatorTop(
				getCurrentSeparatorPosition()
			);


			if (
				nextDepth ===
				startDepth
			)
			{
				return;
			}

			if (
				!currentDataset.sourceFileId
			)
			{
				return;
			}

			wavebinder.setNodeValue(
				"reparseDatafileRequest",
				{
					id:
						currentDataset.sourceFileId,

					datasets:
					[
						{
							datasetId:
								currentDataset.id,

							action:
								DatafileParseAction.REPARSE,

							parseOptions:
							{
								headerDepth:
									nextDepth
							}
						}
					]
				}
			);
		}


		document.addEventListener(
			"mousemove",
			onMouseMove
		);

		document.addEventListener(
			"mouseup",
			onMouseUp
		);
	}


	if (!dataset)
	{
		return (
			<div id="datasetTableDiv">
				<div
					id="datasetTableWrapper"
					ref={tableWrapperRef}
				>
					<table id="datasetTable">
						<thead
							id="datasetTableHead"
							ref={tableHeadRef}
						>
							<tr>
								<th className="cornerCell"></th>

								<th className="columnLetter">
									A
								</th>

								<th className="columnLetter">
									B
								</th>

								<th className="columnLetter">
									C
								</th>
							</tr>

							<tr>
								<th className="cornerCell"></th>

								<th>
									No data available
								</th>

								<th>
									No data available
								</th>

								<th>
									No data available
								</th>
							</tr>
						</thead>

						<tbody
							id="datasetTableBody"
							ref={tableBodyRef}
						>
							<tr>
								<th className="rowNumber">
									1
								</th>

								<td>
									No data available
								</td>

								<td>
									No data available
								</td>

								<td>
									No data available
								</td>
							</tr>
						</tbody>
					</table>

					<div
						id="datasetHeaderResizeDiv"
						style={{
							top:
								separatorTop,

							zIndex:
								isHeaderResizing
									? 30
									: 10
						}}
					>
						<div
							id="datasetHeaderSeparator"
							onMouseDown={
								startHeaderResize
							}
							style={{
								zIndex:
									isHeaderResizing
										? 30
										: 10
							}}
						/>
					</div>
				</div>
			</div>
		);
	}


	return (
		<div id="datasetTableDiv">
			<div
				id="datasetTableWrapper"
				ref={tableWrapperRef}
			>
				<table id="datasetTable">
					<thead
						id="datasetTableHead"
						ref={tableHeadRef}
					>
						<tr>
							<th className="cornerCell"></th>

							{fields.map(
								(field, index) =>
									<th
										key={
											`column-letter-${index}`
										}
										className="columnLetter"
									>
										{
											String.fromCharCode(
												65 +
												index
											)
										}
									</th>
							)}
						</tr>

						{renderHeaderRows()}
					</thead>

					<tbody
						id="datasetTableBody"
						ref={tableBodyRef}
					>
						{content.map(
							(row, rowIndex) =>
								<tr
									key={
										`row-${rowIndex}`
									}
								>
									<th className="rowNumber">
										{
											rowIndex +
											1
										}
									</th>

									{fields.map(
										(field, columnIndex) =>
											<td
												key={
													`cell-${rowIndex}-${columnIndex}`
												}
											>
												{
													row[
														columnIndex
													] ??
													""
												}
											</td>
									)}
								</tr>
						)}
					</tbody>
				</table>

				<div
					id="datasetHeaderResizeDiv"
					style={{
						top:
							separatorTop,

						zIndex:
							isHeaderResizing
								? 30
								: 10
					}}
				>
					<div
						id="datasetHeaderSeparator"
						onMouseDown={
							startHeaderResize
						}
						style={{
							zIndex:
								isHeaderResizing
									? 30
									: 10
						}}
					/>
				</div>
			</div>
		</div>
	);
}