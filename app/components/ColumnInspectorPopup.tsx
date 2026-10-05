import { useEffect, useState } from "react";

import { UpdateDatasetRequest } from "../../shared/api/dataset";
import {
	Dataset,
	DatasetField,
	DatasetHeader,
	FieldType,
	isValidFieldType
} from "../../shared/models/Dataset";
import { Project } from "../../shared/models/Project";

import { t } from "../modules/i18n";
import { WavebinderRuntime } from "../wavebinder/WavebinderRuntime";


interface ColumnInspectorPopupProperties
{
	field: DatasetField | null;
	dataset: Dataset | null;
	project: Project;
	wavebinder: WavebinderRuntime;
	onClose: () => void;
}


export function ColumnInspectorPopup({
	field,
	dataset,
	project,
	wavebinder,
	onClose
}: ColumnInspectorPopupProperties)
{
	const [
		type,
		setType
	] =
		useState(
			field?.type ??
			FieldType.UNKNOWN
		);

	const [
		categories,
		setCategories
	] =
		useState<string[]>(
			field?.categories ?? []
		);

	const [
		,
		setLanguageVersion
	] =
		useState(0);


	useEffect(() =>
	{
		setType(
			field?.type ??
			FieldType.UNKNOWN
		);

		setCategories(
			field?.categories ??
			[]
		);
	}, [field]);


	useEffect(() =>
	{
		const updateLanguage = (): void =>
		{
			setLanguageVersion(
				value =>
					value + 1
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


	if (!field || !dataset)
		return null;


	const currentField =
		field;

	const currentDataset =
		dataset;


	function close(): void
	{
		const headerRoot =
			DatasetHeader.createFromObject(
				currentDataset.headerRoot.toJSON()
			);


		function updateField(
			children: (
				DatasetHeader |
				DatasetField
			)[]
		): boolean
		{
			for (const child of children)
			{
				if (
					child instanceof
					DatasetField
				)
				{
					if (
						child.name !==
						currentField.name
					)
					{
						continue;
					}

					if (
						isValidFieldType(
							type
						)
					)
					{
						child.changeType(
							type
						);
					}

					child.clearCategories();

					child.addCategories(
						categories
					);

					return true;
				}

				if (
					updateField(
						child.children
					)
				)
				{
					return true;
				}
			}

			return false;
		}


		updateField(
			headerRoot.children
		);


		const changes:
			UpdateDatasetRequest =
		{
			id:
				currentDataset.id,

			headerRoot:
				headerRoot.toJSON()
		};


		wavebinder.setNodeValue(
			"updateDatasetRequest",
			changes
		);

		onClose();
	}


	function toggleCategory(
		categoryName: string
	): void
	{
		setCategories(
			current =>
			{
				if (
					current.includes(
						categoryName
					)
				)
				{
					return current.filter(
						category =>
							category !==
							categoryName
					);
				}

				return [
					...current,
					categoryName
				];
			}
		);
	}


	return (
		<div className="popupBox vBox mdSpaceBox">
			<div className="popupPanel">
				<button
					className="popupCloseBtn"
					onClick={close}
				>
					X
				</button>

				<h1 id="columnInspectorName">
					{currentField.name}
				</h1>

				<div
					id="columnSettings"
					className="vBox mdSpaceBox"
				>
					<div className="hBox spaceBetweenBox">
						<label htmlFor="columnTypeSelect">
							{t("type")}
						</label>

						<select
							id="columnTypeSelect"
							value={type}
							onChange={event =>
								setType(
									event.target.value as typeof type
								)
							}
						>
							{Object.values(
								FieldType
							).map(
								value =>
									<option
										key={value}
										value={value}
									>
										{value}
									</option>
							)}
						</select>
					</div>

					<div className="hBox spaceBetweenBox">
						<label>
							{t("categories")}
						</label>

						<div
							id="columnCategoriesSelect"
							className="vBox smSpaceBox smPaddingBox scrollBox"
						>
							{project.settings.fieldCategories.map(
								category =>
									<label
										key={category.name}
										className="smSpaceBox"
									>
										<input
											type="checkbox"
											checked={
												categories.includes(
													category.name
												)
											}
											onChange={() =>
												toggleCategory(
													category.name
												)
											}
										/>

										{category.name}
									</label>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}