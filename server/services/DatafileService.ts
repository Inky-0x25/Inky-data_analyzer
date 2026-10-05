import Database from "better-sqlite3";
import { createHash } from "crypto";

import {
	CreateDatafileRequest,
	DatafileDatasetParseOptions,
	DatafileParseAction,
	DatafileParseRequest,
	DatafileResponse,
	UpdateDatafileRequest
} from "../../shared/api/datafile";
import {
	Datafile,
	FileState,
	FileStateValue,
	FileTypeValue,
	detectFileType
} from "../../shared/models/Datafile";
import { Dataset } from "../../shared/models/Dataset";

import { ParserFactory } from "../parsers/parserFactory";
import { DatasetService } from "./DatasetService";
import { ProjectService } from "./ProjectService";


export class DatafileService
{
	constructor(
		private readonly database: Database.Database,
		private readonly datasetService: DatasetService,
		private readonly projectService: ProjectService
	) {}


	list(projectID: string): DatafileResponse[]
	{
		const rows = this.database.prepare(`
				SELECT id, hash, name, size, type, state, error
				FROM datafiles
				WHERE project_id = ?
				ORDER BY name
			`).all(projectID) as Array<{
				id: string;
				hash: string | null;
				name: string;
				size: number;
				type: FileTypeValue | null;
				state: FileStateValue;
				error: string | null;
			}>;

		return rows.map(row => this.getResponse(row));
	}


	get(id: string): DatafileResponse | null
	{
		const row = this.database.prepare(`
				SELECT id, hash, name, size, type, state, error
				FROM datafiles
				WHERE id = ?
			`).get(id) as {
				id: string;
				hash: string | null;
				name: string;
				size: number;
				type: FileTypeValue | null;
				state: FileStateValue;
				error: string | null;
			} | undefined;

		if (!row)
			return null;

		return this.getResponse(row);
	}


	getContent(id: string): Buffer | null
	{
		const row = this.database.prepare(`
				SELECT datafile_contents.content
				FROM datafiles
				INNER JOIN datafile_contents ON datafile_contents.hash = datafiles.hash
				WHERE datafiles.id = ?
			`).get(id) as {content: Buffer;} | undefined;

		if (!row)
			return null;

		return row.content;
	}


	create(request: CreateDatafileRequest, content: Buffer): DatafileResponse
	{
		const project = this.projectService.get(request.projectID);

		if (!project)
			throw new Error("Project not found");

		const requestedName = this.normalizeName(request.name);

		this.validateName(requestedName);

		const hash = createHash("sha256").update(content).digest("hex");
		const datafileID = crypto.randomUUID();
		const type = detectFileType(requestedName);

		let datafile: Datafile;

		const transaction = this.database.transaction(() =>
		{
			const name = this.getUniqueName(
				request.projectID,
				requestedName
			);

			datafile = Datafile.createFromObject(
			{
				id: datafileID,
				hash,
				name,
				size: content.length,
				type,
				state: FileState.PROCESSING,
				error: null
			});

			const existingContent = this.database.prepare(`
					SELECT hash
					FROM datafile_contents
					WHERE hash = ?
				`).get(hash);

			if (existingContent)
			{
				this.database.prepare(`
						UPDATE datafile_contents
						SET ref_count = ref_count + 1
						WHERE hash = ?
					`).run(hash);
			}
			else
			{
				this.database.prepare(`
						INSERT INTO datafile_contents(hash, content, ref_count)
						VALUES(?, ?, 1)
					`).run(hash, content);
			}

			this.database.prepare(`
					INSERT INTO datafiles(id, project_id, hash, name, size, type, state, error)
					VALUES(?, ?, ?, ?, ?, ?, ?, ?)
				`).run(
					datafile.id,
					request.projectID,
					datafile.hash,
					datafile.name,
					datafile.size,
					datafile.type,
					datafile.state,
					datafile.error
				);
		});

		transaction();

		void this.process(datafile!.id, request.projectID);

		return this.get(datafile!.id)!;
	}


	update(id: string, request: UpdateDatafileRequest): DatafileResponse | null
	{
		const existing = this.database.prepare(`
				SELECT id, project_id, name
				FROM datafiles
				WHERE id = ?
			`).get(id) as {
				id: string;
				project_id: string;
				name: string;
			} | undefined;

		if (!existing)
			return null;

		if (request.name === undefined)
			return this.get(id);

		const name = this.normalizeName(request.name);

		this.validateName(name);

		const uniqueName = this.getUniqueName(
			existing.project_id,
			name,
			id
		);

		this.database.prepare(`
				UPDATE datafiles
				SET name = ?
				WHERE id = ?
			`).run(uniqueName, id);

		return this.get(id)!;
	}


	async replaceContent(
		id: string,
		name: string,
		content: Buffer,
		request: DatafileParseRequest
	): Promise<DatafileResponse | null>
	{
		const existing = this.database.prepare(`
				SELECT hash, project_id, name
				FROM datafiles
				WHERE id = ?
			`).get(id) as {
				hash: string | null;
				project_id: string;
				name: string;
			} | undefined;

		if (!existing)
			return null;


		name = this.normalizeName(name);

		const type = detectFileType(name);

		if (!type)
			throw new Error("Unsupported file type");


		const hash = createHash("sha256").update(content).digest("hex");


		const duplicate = this.database.prepare(`
				SELECT id
				FROM datafiles
				WHERE project_id = ?
					AND hash = ?
					AND id != ?
			`).get(
				existing.project_id,
				hash,
				id
			) as {id: string;} | undefined;


		if (duplicate)
			throw new Error(
				"A datafile with identical content already exists in this project"
			);


		const datasetCount = this.database.prepare(`
				SELECT COUNT(*) AS count
				FROM datasets
				WHERE source_file_id = ?
			`).get(id) as {count: number};


		const transaction = this.database.transaction(() =>
		{
			if (existing.hash !== hash)
			{
				const existingContent = this.database.prepare(`
						SELECT hash
						FROM datafile_contents
						WHERE hash = ?
					`).get(hash);

				if (existingContent)
				{
					this.database.prepare(`
							UPDATE datafile_contents
							SET ref_count = ref_count + 1
							WHERE hash = ?
						`).run(hash);
				}
				else
				{
					this.database.prepare(`
							INSERT INTO datafile_contents(hash, content, ref_count)
							VALUES(?, ?, 1)
						`).run(hash, content);
				}

				if (existing.hash)
					this.releaseContent(existing.hash);
			}


			this.database.prepare(`
					UPDATE datafiles
					SET
						hash = ?,
						size = ?,
						type = ?,
						state = ?,
						error = NULL
					WHERE id = ?
				`).run(
					hash,
					content.length,
					type,
					FileState.PROCESSING,
					id
				);
		});

		transaction();


		try
		{
			if (datasetCount.count === 0)
			{
				await this.processNewDatasets(
					id,
					existing.project_id
				);
			}
			else
			{
				await this.processDatasets(
					id,
					existing.project_id,
					request.datasets
				);
			}


			this.database.prepare(`
					UPDATE datafiles
					SET
						state = ?,
						error = NULL
					WHERE id = ?
				`).run(
					FileState.READY,
					id
				);
		}
		catch (error)
		{
			this.database.prepare(`
					UPDATE datafiles
					SET
						state = ?,
						error = ?
					WHERE id = ?
				`).run(
					FileState.ERROR,
					error instanceof Error
						? error.message
						: "Failed to reimport datafile",
					id
				);

			throw error;
		}

		return this.get(id)!;
	}


	async reparse(
		id: string,
		request: DatafileParseRequest
	): Promise<DatafileResponse | null>
	{
		const existing = this.database.prepare(`
				SELECT project_id, type
				FROM datafiles
				WHERE id = ?
			`).get(id) as {
				project_id: string;
				type: string | null;
			} | undefined;

		if (!existing)
			return null;

		if (!existing.type)
			throw new Error("Unsupported file type");

		try
		{
			await this.processDatasets(
				id,
				existing.project_id,
				request.datasets
			);

			this.database.prepare(`
					UPDATE datafiles
					SET state = ?, error = NULL
					WHERE id = ?
				`).run(
				FileState.READY,
				id
			);
		}
		catch (error)
		{
			this.database.prepare(`
					UPDATE datafiles
					SET state = ?, error = ?
					WHERE id = ?
				`).run(
					FileState.ERROR,
					error instanceof Error
						? error.message
						: "Failed to reparse datafile",
					id
				);

			throw error;
		}

		return this.get(id)!;
	}


	delete(id: string): boolean
	{
		const existing = this.database.prepare(`
				SELECT hash
				FROM datafiles
				WHERE id = ?
			`).get(id) as {hash: string | null;} | undefined;

		if (!existing)
			return false;

		const transaction = this.database.transaction(() =>
		{
			const result = this.database.prepare(`
					DELETE FROM datafiles
					WHERE id = ?
				`).run(id);

			if (result.changes === 0)
				return false;

			if (existing.hash)
				this.releaseContent(existing.hash);

			return true;
		});

		return transaction();
	}


	private async process(id: string, projectID: string): Promise<void>
	{
		try
		{
			await this.processNewDatasets(
				id,
				projectID
			);

			this.database.prepare(`
					UPDATE datafiles
					SET
						state = ?,
						error = NULL
					WHERE id = ?
				`).run(
					FileState.READY,
					id
				);
		}
		catch (error)
		{
			console.error("DATAFILE PROCESSING ERROR:", error);

			this.database.prepare(`
					UPDATE datafiles
					SET
						state = ?,
						error = ?
					WHERE id = ?
				`).run(
					FileState.ERROR,
					error instanceof Error
						? error.message
						: "Failed to process datafile",
					id
				);
		}
	}


	private async processNewDatasets(
		id: string,
		projectID: string
	): Promise<void>
	{
		const datafileResponse = this.get(id);

		if (!datafileResponse)
			throw new Error("Datafile not found");

		if (!datafileResponse.type)
			throw new Error("Unsupported file type");

		const content = this.getContent(id);

		if (content === null)
			throw new Error("Datafile content not found");

		const project = this.projectService.get(projectID);

		if (!project)
			throw new Error("Project not found");


		const datafile = Datafile.createFromObject(datafileResponse);

		if (!datafile.type)
			throw new Error("Unsupported file type");

		const parser = ParserFactory.create(datafile.type);

		const results = await parser.parse(
			datafile,
			content,
			project.settings
		);


		for (const result of results)
		{
			this.datasetService.create(
				{
					projectID,
					name: result.dataset.name,
					sourceFileId: id,
					sourceKey: result.dataset.sourceKey,
					parseOptions: result.dataset.parseOptions,
					headerRoot: result.dataset.headerRoot.toJSON()
				},
				result.cells
			);
		}
	}


	private async processDatasets(
		id: string,
		projectID: string,
		operations: DatafileDatasetParseOptions[]
	): Promise<void>
	{
		const datafileResponse = this.get(id);

		if (!datafileResponse)
			throw new Error("Datafile not found");

		if (!datafileResponse.type)
			throw new Error("Unsupported file type");

		const content = this.getContent(id);

		if (content === null)
			throw new Error("Datafile content not found");

		const project = this.projectService.get(projectID);

		if (!project)
			throw new Error("Project not found");


		const selectedOperations = operations.filter(
			operation => operation.action !== DatafileParseAction.NONE
		);

		if (!selectedOperations.length)
			return;


		const parserDatasets = selectedOperations.map(operation =>
		{
			const datasetResponse = this.datasetService.get(
				operation.datasetId
			);

			if (!datasetResponse)
				throw new Error(`Dataset not found: ${operation.datasetId}`);

			if (datasetResponse.sourceFileId !== id)
				throw new Error(
					`Dataset ${operation.datasetId} does not belong to this datafile`
				);

			const dataset = Dataset.createFromObject(datasetResponse);

			return {
				dataset,
				parseOptions: operation.parseOptions,
				contentOnly:
					operation.action === DatafileParseAction.UPDATE_CONTENT
			};
		});


		const datafile = Datafile.createFromObject(datafileResponse);

		if (!datafile.type)
			throw new Error("Unsupported file type");

		const parser = ParserFactory.create(datafile.type);

		const results = await parser.parse(
			datafile,
			content,
			project.settings,
			{
				datasets: parserDatasets
			}
		);


		if (results.length !== parserDatasets.length)
			throw new Error("Parser did not return all requested datasets");


		const resultsByDatasetID = new Map(
			results.map(result => [result.dataset.id, result])
		);


		const transaction = this.database.transaction(() =>
		{
			for (const parserDataset of parserDatasets)
			{
				const result = resultsByDatasetID.get(
					parserDataset.dataset.id
				);

				if (!result)
					throw new Error(
						`Parser did not return dataset ${parserDataset.dataset.id}`
					);


				this.database.prepare(`
						UPDATE datasets
						SET
							name = ?,
							source_file_id = ?,
							source_key = ?,
							parse_options = ?,
							header_root = ?,
							error = ?
						WHERE id = ?
					`).run(
						result.dataset.name,
						result.dataset.sourceFileId,
						result.dataset.sourceKey,
						JSON.stringify(result.dataset.parseOptions),
						JSON.stringify(result.dataset.headerRoot.toJSON()),
						result.dataset.error,
						result.dataset.id
					);


				this.database.prepare(`
						UPDATE dataset_cells
						SET cells = ?
						WHERE dataset_id = ?
					`).run(
						JSON.stringify(result.cells),
						result.dataset.id
					);
			}
		});

		transaction();
	}


	private normalizeName(name: string): string
	{
		if (name == "")
			return "New_datafile";

		return name.trim().replace(/\s+/g, "_");
	}


	private validateName(name: string): void
	{
		if (!/^[A-Za-z0-9_.-]{1,50}$/.test(name))
			throw new Error("Invalid datafile name");
	}


	private getUniqueName(
		projectID: string,
		name: string,
		excludeID?: string
	): string
	{
		const exists = (candidate: string): boolean =>
		{
			const datafile = this.database.prepare(`
					SELECT id
					FROM datafiles
					WHERE project_id = ? AND name = ?
				`).get(projectID, candidate) as {id: string;} | undefined;

			return datafile !== undefined && datafile.id !== excludeID;
		};

		if (!exists(name))
			return name;

		let index = 1;

		while (exists(`${name}_${index}`))
			index++;

		return `${name}_${index}`;
	}


	private releaseContent(hash: string): void
	{
		this.database.prepare(`
				UPDATE datafile_contents
				SET ref_count = ref_count - 1
				WHERE hash = ?
			`).run(hash);

		this.database.prepare(`
				DELETE FROM datafile_contents
				WHERE hash = ? AND ref_count <= 0
			`).run(hash);
	}


	private getResponse(
		row: {
			id: string;
			hash: string | null;
			name: string;
			size: number;
			type: FileTypeValue | null;
			state: FileStateValue;
			error: string | null;
		}
	): DatafileResponse
	{
		const datafile = Datafile.createFromObject(row);
		return JSON.parse(datafile.toJSON());
	}
}