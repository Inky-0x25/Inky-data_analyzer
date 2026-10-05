import Papa from "papaparse";

import { Parser, ParserDatasetOptions, ParserOptions } from "./parser";
import { DatasetHeader, DatasetField } from "../../shared/models/Dataset";
import { Datafile } from "../../shared/models/Datafile";
import { ProjectSettings } from "../../shared/models/Project";
import { FieldTypeDetector } from "../analyzers/fieldTypeDetector";
import { FieldCategoryDetector } from "../analyzers/fieldCategoryDetector";
import { FieldStatisticsCalculator } from "../analyzers/fieldStatisticsCalculator";


export class CsvParser extends Parser
{
	constructor() {super();}


	protected async parseContent(file: Datafile, content: Buffer, settings: ProjectSettings, options: ParserOptions = {}): Promise<void>
	{
		const result = Papa.parse<string[]>(
			content.toString("utf-8"),
			{skipEmptyLines: false}
		);

		if (result.errors.length)
			throw new Error(result.errors[0].message);

		const rows = result.data;

		if (!rows.length)
			throw new Error("CSV is empty.");

		const datasetOptions = options.datasets ?? [];


		if (datasetOptions.length > 1)
			throw new Error("CSV can only contain one dataset");


		const datasetOption = datasetOptions[0];

		const headerDepth = datasetOption
			? Math.max(1, datasetOption.parseOptions.headerDepth)
			: 1;

		const headerRows = rows.slice(0, headerDepth);
		const cells = rows.slice(headerDepth);


		if (datasetOption?.contentOnly)
		{
			this.updateContent(
				datasetOption,
				file,
				cells
			);

			return;
		}


		const headerRoot = this.buildHeaders(
			headerRows,
			cells,
			settings
		);


		if (datasetOption)
		{
			this.createDatasetFromOptions(
				datasetOption,
				file.name,
				file.id,
				headerRoot,
				cells,
				datasetOption.dataset.sourceKey
			);

			return;
		}


		this.createDataset(
			file.name,
			file.id,
			headerRoot,
			cells
		);
	}


	private updateContent(
		datasetOption: ParserDatasetOptions,
		file: Datafile,
		cells: string[][]
	): void
	{
		const dataset = datasetOption.dataset;

		for (let column = 0; column < dataset.fields.length; column++)
		{
			const field = dataset.fields[column];
			const values = cells.map(row => row[column] ?? "");

			field.clearInfo();
			field.addInfo(
				FieldStatisticsCalculator.calculate(
					field,
					values
				)
			);
		}

		this.createDatasetFromOptions(
			datasetOption,
			dataset.name,
			file.id,
			dataset.headerRoot,
			cells,
			dataset.sourceKey
		);
	}


	private buildHeaders(headerRows: string[][], cells: string[][], settings: ProjectSettings): DatasetHeader
	{
		const root = DatasetHeader.createRoot();
		const columnCount = Math.max(...headerRows.map(row => row.length));

		for (let column = 0; column < columnCount; column++)
		{
			const path: string[] = [];

			for (let level = 0; level < headerRows.length; level++)
			{
				let value = headerRows[level]?.[column];
				value = value == null ? "" : String(value).trim();

				if (!value)
					continue;

				path.push(value);
			}

			if (!path.length)
				path.push(`Column ${column + 1}`);

			let current = root;

			for (let level = 0; level < path.length - 1; level++)
			{
				const name = path[level];

				let child = current.children.find(
					child => child instanceof DatasetHeader && child.name === name
				) as DatasetHeader | undefined;

				if (!child)
					child = DatasetHeader.createAsChildOf(
						current,
						name
					);

				current = child;
			}

			const field = DatasetField.createAsChildOf(
				current,
				path[path.length - 1]
			);

			const values = cells.map(
				row => row[column] ?? ""
			);

			field.changeType(
				FieldTypeDetector.detect(values)
			);

			field.addCategories(
				FieldCategoryDetector.detect(
					field,
					path,
					settings.fieldCategories
				)
			);

			field.addInfo(
				FieldStatisticsCalculator.calculate(
					field,
					values
				)
			);
		}

		return root;
	}
}