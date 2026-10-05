import { Datafile } from "../../shared/models/Datafile";
import {
	Dataset,
	DatasetHeader,
	DatasetParseOptions
} from "../../shared/models/Dataset";
import { ProjectSettings } from "../../shared/models/Project";

export interface ParserDatasetOptions
{
	dataset: Dataset;
	parseOptions: DatasetParseOptions;
	contentOnly: boolean;
}

export interface ParserOptions
{
	datasets?: ParserDatasetOptions[];
}

export interface ParserDataset
{
	dataset: Dataset;
	cells: string[][];
}

export abstract class Parser
{
	protected datasets: ParserDataset[];
	protected datasetOptions: ParserDatasetOptions[];

	protected constructor()
	{
		this.datasets = [];
		this.datasetOptions = [];
	}


	async parse(
		file: Datafile,
		content: Buffer,
		settings: ProjectSettings,
		options: ParserOptions = {}
	): Promise<ParserDataset[]>
	{
		this.reset();

		this.datasetOptions = options.datasets ?? [];


		try
		{
			if (!file.isValid())
				throw new Error(file.error ?? "Invalid file.");

			await this.parseContent(
				file,
				content,
				settings,
				options
			);

			return this.datasets;
		}
		catch (error)
		{
			console.error("PARSER ERROR:", error);

			return this.datasets;
		}
	}


	protected abstract parseContent(
		file: Datafile,
		content: Buffer,
		settings: ProjectSettings,
		options?: ParserOptions
	): Promise<void>;


	protected createDataset(
		name: string,
		sourceFileId: string,
		headerRoot: DatasetHeader,
		cells: string[][],
		sourceKey: string | null = null
	): Dataset
	{
		const dataset = Dataset.createWith(
			name,
			sourceFileId,
			headerRoot,
			sourceKey,
			{
				headerDepth: 1,
				contentOnly: false
			}
		);

		this.datasets.push(
		{
			dataset,
			cells
		});

		return dataset;
	}


	protected createDatasetFromOptions(
		options: ParserDatasetOptions,
		name: string,
		sourceFileId: string,
		headerRoot: DatasetHeader,
		cells: string[][],
		sourceKey: string | null = null
	): Dataset
	{
		const dataset = options.dataset;

		dataset.name = name;
		dataset.sourceFileId = sourceFileId;
		dataset.sourceKey = sourceKey;
		dataset.parseOptions = options.parseOptions;
		dataset.error = null;

		if (!options.contentOnly)
		{
			dataset.headerRoot = headerRoot;
			dataset.fields = headerRoot.getChildFields();
		}

		this.datasets.push(
		{
			dataset,
			cells
		});

		return dataset;
	}


	protected reset(): void
	{
		this.datasets.length = 0;
		this.datasetOptions.length = 0;
	}
}
