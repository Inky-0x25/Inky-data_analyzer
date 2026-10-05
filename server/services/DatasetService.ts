import Database from "better-sqlite3";

import {
	CreateDatasetRequest,
	DatasetListItem,
	DatasetResponse,
	UpdateDatasetRequest
} from "../../shared/api/dataset";

import {
	Dataset,
	DatasetHeader,
	DatasetParseOptions
} from "../../shared/models/Dataset";

import { DatatransService } from "./DatatransService";


export class DatasetService
{
	constructor(
		private readonly database: Database.Database,
		private readonly datatransService: DatatransService
	) {}


	list(projectID: string): DatasetListItem[]
	{
		const rows = this.database.prepare(`
			SELECT
				id,
				name,
				source_file_id,
				source_key,
				parse_options,
				error
			FROM datasets
			WHERE project_id = ?
			ORDER BY name
		`).all(projectID) as Array<{
			id: string;
			name: string;
			source_file_id: string | null;
			source_key: string | null;
			parse_options: string;
			error: string | null;
		}>;

		return rows.map(row =>
		{
			const storedOptions =
				JSON.parse(row.parse_options);

			const parseOptions: DatasetParseOptions =
			{
				headerDepth:
					storedOptions.headerDepth ?? 1,
				contentOnly:
					storedOptions.contentOnly ?? false
			};

			return {
				id: row.id,
				name: row.name,
				sourceFileId: row.source_file_id,
				sourceKey: row.source_key,
				parseOptions,
				error: row.error
			};
		});
	}


	get(id: string): DatasetResponse | null
	{
		const row = this.database.prepare(`
			SELECT
				d.id,
				d.name,
				d.source_file_id,
				d.source_key,
				d.parse_options,
				d.error,
				c.header_root
			FROM datasets d
			INNER JOIN dataset_cells c
				ON c.dataset_id = d.id
			WHERE d.id = ?
		`).get(id) as
			{
				id: string;
				name: string;
				source_file_id: string | null;
				source_key: string | null;
				parse_options: string;
				error: string | null;
				header_root: string;
			}
			| undefined;

		if (!row)
			return null;

		return this.getResponse(row);
	}


	getContent(id: string): string[][] | null
	{
		const row = this.database.prepare(`
			SELECT cells
			FROM dataset_cells
			WHERE dataset_id = ?
		`).get(id) as
			{
				cells: string;
			}
			| undefined;

		if (!row)
			return null;

		return JSON.parse(row.cells);
	}


	updateContent(
		id: string,
		cells: string[][]
	): DatasetResponse | null
	{
		const dataset = this.get(id);

		if (!dataset)
			return null;

		this.database.prepare(`
			UPDATE dataset_cells
			SET cells = ?
			WHERE dataset_id = ?
		`).run(
			JSON.stringify(cells),
			id
		);

		this.datatransService.recalculateChildren(id);

		return this.get(id);
	}


	create(
		request: CreateDatasetRequest,
		cells: string[][]
	): DatasetResponse
	{
		const headerRoot =
			DatasetHeader.createFromObject(
				request.headerRoot
			);

		const requestedName =
			this.normalizeName(request.name);

		this.validateName(requestedName);

		const name = this.getUniqueName(
			request.sourceFileId ?? null,
			requestedName
		);

		const dataset = Dataset.createWith(
			name,
			request.sourceFileId ?? "",
			headerRoot,
			request.sourceKey ?? null,
			request.parseOptions
		);

		this.database.transaction(() =>
		{
			this.database.prepare(`
				INSERT INTO datasets(
					id,
					project_id,
					name,
					source_file_id,
					source_key,
					parse_options,
					error
				)
				VALUES(?, ?, ?, ?, ?, ?, ?)
			`).run(
				dataset.id,
				request.projectID,
				dataset.name,
				dataset.sourceFileId,
				dataset.sourceKey,
				JSON.stringify(dataset.parseOptions),
				dataset.error
			);

			this.database.prepare(`
				INSERT INTO dataset_cells(
					dataset_id,
					header_root,
					cells
				)
				VALUES(?, ?, ?)
			`).run(
				dataset.id,
				JSON.stringify(dataset.headerRoot.toJSON()),
				JSON.stringify(cells)
			);
		})();

		return this.get(dataset.id)!;
	}


	update(
		request: UpdateDatasetRequest
	): DatasetResponse | null
	{
		const existing = this.database.prepare(`
			SELECT
				d.id,
				d.project_id,
				d.name,
				d.source_file_id,
				d.source_key,
				d.parse_options,
				c.header_root
			FROM datasets d
			INNER JOIN dataset_cells c
				ON c.dataset_id = d.id
			WHERE d.id = ?
		`).get(request.id) as
			{
				id: string;
				project_id: string;
				name: string;
				source_file_id: string | null;
				source_key: string | null;
				parse_options: string;
				header_root: string;
			}
			| undefined;

		if (!existing)
			return null;


		const sourceFileId =
			request.sourceFileId !== undefined
				? request.sourceFileId
				: existing.source_file_id;

		const sourceKey =
			request.sourceKey !== undefined
				? request.sourceKey
				: existing.source_key;

		let name = existing.name;

		if (request.name !== undefined)
		{
			const normalizedName =
				this.normalizeName(request.name);

			this.validateName(normalizedName);

			name = this.getUniqueName(
				sourceFileId,
				normalizedName,
				request.id
			);
		}


		const headerRoot =
			request.headerRoot !== undefined
				? DatasetHeader.createFromObject(
					request.headerRoot
				)
				: DatasetHeader.createFromObject(
					JSON.parse(existing.header_root)
				);


		this.database.transaction(() =>
		{
			this.database.prepare(`
				UPDATE datasets
				SET
					name = ?,
					source_file_id = ?,
					source_key = ?
				WHERE id = ?
			`).run(
				name,
				sourceFileId,
				sourceKey,
				request.id
			);

			if (request.headerRoot !== undefined)
			{
				this.database.prepare(`
					UPDATE dataset_cells
					SET header_root = ?
					WHERE dataset_id = ?
				`).run(
					JSON.stringify(
						headerRoot.toJSON()
					),
					request.id
				);
			}
		})();

		return this.get(request.id)!;
	}


	delete(id: string): boolean
	{
		const transformationChildren = this.database.prepare(`
				SELECT id
				FROM transformations
				WHERE parent_id = ?
			`).all(id) as Array<{id: string;}>;


		for (const transformation of transformationChildren)
			this.datatransService.delete(transformation.id);


		this.database.prepare(`
			DELETE FROM charts
			WHERE source_id = ?
		`).run(id);


		const result =
			this.database.prepare(`
				DELETE FROM datasets
				WHERE id = ?
			`).run(id);


		return result.changes > 0;
	}


	private normalizeName(name: string): string
	{
		if (name === "")
			return "New_dataset";

		return name
			.trim()
			.replace(/\s+/g, "_");
	}


	private validateName(name: string): void
	{
		if (!/^[A-Za-z0-9_.-]{1,50}$/.test(name))
			throw new Error("Invalid dataset name");
	}


	private getUniqueName(
		sourceFileId: string | null,
		name: string,
		excludeID?: string
	): string
	{
		const exists = (
			candidate: string
		): boolean =>
		{
			const dataset = this.database.prepare(`
				SELECT id
				FROM datasets
				WHERE (
					source_file_id = ?
					OR (
						source_file_id IS NULL
						AND ? IS NULL
					)
				)
				AND name = ?
			`).get(
				sourceFileId,
				sourceFileId,
				candidate
			) as
				{
					id: string;
				}
				| undefined;

			return (
				dataset !== undefined &&
				dataset.id !== excludeID
			);
		};


		if (!exists(name))
			return name;


		let index = 1;

		while (exists(`${name}_${index}`))
			index++;


		return `${name}_${index}`;
	}


	private getResponse(row: {
		id: string;
		name: string;
		source_file_id: string | null;
		source_key: string | null;
		parse_options: string;
		header_root: string;
		error: string | null;
	}): DatasetResponse
	{
		const headerRoot =
			DatasetHeader.createFromObject(
				JSON.parse(row.header_root)
			);

		const storedOptions =
			JSON.parse(row.parse_options);

		const parseOptions: DatasetParseOptions =
		{
			headerDepth:
				storedOptions.headerDepth ?? 1,
			contentOnly:
				storedOptions.contentOnly ?? false
		};

		return {
			id: row.id,
			name: row.name,
			sourceFileId: row.source_file_id,
			sourceKey: row.source_key,
			parseOptions,
			headerRoot: headerRoot.toJSON(),
			error: row.error
		};
	}
}