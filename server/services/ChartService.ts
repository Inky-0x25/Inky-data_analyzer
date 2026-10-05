import Database from "better-sqlite3";

import {
	Chart,
	ChartTypeValue,
	isValidChartType
} from "../../shared/models/Chart";

import {
	ChartListResponse,
	ChartResponse,
	CreateChartRequest,
	UpdateChartRequest
} from "../../shared/api/chart";


export class ChartService
{
	constructor(
		private readonly database: Database.Database
	) {}


	list(
		projectID: string
	): ChartListResponse
	{
		const rows =
			this.database.prepare(`
				SELECT
					id,
					name,
					type,
					source_id,
					error
				FROM charts
				WHERE project_id = ?
				ORDER BY name
			`).all(
				projectID
			) as Array<{
				id: string;
				name: string;
				type: string;
				source_id: string | null;
				error: string | null;
			}>;


		return rows.map(
			row =>
			{
				if (!isValidChartType(row.type))
					throw new Error(
						`Invalid chart type: ${row.type}`
					);

				return {
					id: row.id,
					name: row.name,
					type: row.type,
					sourceID: row.source_id,
					error: row.error
				};
			}
		);
	}


	get(
		id: string
	): ChartResponse | null
	{
		const row =
			this.database.prepare(`
				SELECT
					id,
					name,
					type,
					source_id,
					settings,
					error
				FROM charts
				WHERE id = ?
			`).get(
				id
			) as
				{
					id: string;
					name: string;
					type: string;
					source_id: string | null;
					settings: string;
					error: string | null;
				}
				| undefined;


		if (!row)
			return null;


		if (!isValidChartType(row.type))
			throw new Error(
				`Invalid chart type: ${row.type}`
			);


		return {
			id: row.id,
			name: row.name,
			type: row.type,
			sourceID: row.source_id,
			settings:
				JSON.parse(
					row.settings
				),
			error: row.error
		};
	}


	create(
		request: CreateChartRequest
	): ChartResponse
	{
		const project =
			this.database.prepare(`
				SELECT id
				FROM projects
				WHERE id = ?
			`).get(
				request.projectID
			);


		if (!project)
			throw new Error(
				"Project not found"
			);


		if (!isValidChartType(request.type))
			throw new Error(
				"Invalid chart type"
			);


		const requestedName =
			this.normalizeName(
				request.name
			);

		this.validateName(
			requestedName
		);


		const name =
			this.getUniqueName(
				request.projectID,
				requestedName
			);


		const settings =
			this.normalizeSettings(
				request.settings
			);


		this.validateSource(
			request.projectID,
			request.sourceID
		);


		const chart =
			Chart.create(
				name,
				request.type,
				request.sourceID
			);

		chart.settings =
			settings;


		this.database.prepare(`
			INSERT INTO charts(
				id,
				project_id,
				name,
				type,
				source_id,
				settings,
				error
			)
			VALUES(?, ?, ?, ?, ?, ?, ?)
		`).run(
			chart.id,
			request.projectID,
			chart.name,
			chart.type,
			chart.sourceID,
			JSON.stringify(
				chart.settings
			),
			null
		);


		return this.get(
			chart.id
		)!;
	}


	update(
		request: UpdateChartRequest
	): ChartResponse
	{
		const current =
			this.get(
				request.id
			);


		if (!current)
			throw new Error(
				"Chart not found"
			);


		const projectID =
			this.getProjectID(
				request.id
			);


		if (!projectID)
			throw new Error(
				"Chart project not found"
			);


		const type =
			request.type !== undefined
				? request.type
				: current.type;


		if (!isValidChartType(type))
			throw new Error(
				"Invalid chart type"
			);


		const requestedName =
			request.name !== undefined
				? this.normalizeName(
					request.name
				)
				: current.name;

		this.validateName(
			requestedName
		);


		const name =
			this.getUniqueName(
				projectID,
				requestedName,
				request.id
			);


		const sourceID =
			request.sourceID !== undefined
				? request.sourceID
				: current.sourceID;


		const settings =
			request.settings !== undefined
				? this.normalizeSettings(
					request.settings
				)
				: current.settings;


		this.validateSource(
			projectID,
			sourceID
		);


		this.database.prepare(`
			UPDATE charts
			SET
				name = ?,
				type = ?,
				source_id = ?,
				settings = ?,
				error = ?
			WHERE id = ?
		`).run(
			name,
			type,
			sourceID,
			JSON.stringify(
				settings
			),
			null,
			request.id
		);


		return this.get(
			request.id
		)!;
	}


	delete(
		id: string
	): void
	{
		this.database.prepare(`
			DELETE FROM charts
			WHERE id = ?
		`).run(id);
	}


	private normalizeSettings(
		settings: Record<string, unknown>
	): Record<string, unknown>
	{
		if (
			!settings ||
			typeof settings !== "object" ||
			Array.isArray(settings)
		)
		{
			throw new Error(
				"Invalid chart settings"
			);
		}


		return {
			...settings
		};
	}


	private normalizeName(
		name: string
	): string
	{
		if (name === "")
			return "New_chart";

		return name
			.trim()
			.replace(
				/\s+/g,
				"_"
			);
	}


	private validateName(
		name: string
	): void
	{
		if (
			!/^[A-Za-z0-9_.-]{1,50}$/.test(
				name
			)
		)
		{
			throw new Error(
				"Invalid chart name"
			);
		}
	}


	private getUniqueName(
		projectID: string,
		name: string,
		excludeID?: string
	): string
	{
		const exists = (
			candidate: string
		): boolean =>
		{
			const chart =
				this.database.prepare(`
					SELECT id
					FROM charts
					WHERE project_id = ?
						AND name = ?
				`).get(
					projectID,
					candidate
				) as
					{
						id: string;
					}
					| undefined;


			return (
				chart !== undefined &&
				chart.id !== excludeID
			);
		};


		if (!exists(name))
			return name;


		let index = 1;

		while (
			exists(
				`${name}_${index}`
			)
		)
		{
			index++;
		}


		return `${name}_${index}`;
	}


	private getProjectID(
		id: string
	): string | null
	{
		const row =
			this.database.prepare(`
				SELECT project_id
				FROM charts
				WHERE id = ?
			`).get(
				id
			) as
				{
					project_id: string;
				}
				| undefined;


		return row?.project_id ?? null;
	}


	private validateSource(
		projectID: string,
		sourceID: string | null
	): void
	{
		if (sourceID === null)
			return;


		const dataset =
			this.database.prepare(`
				SELECT project_id
				FROM datasets
				WHERE id = ?
			`).get(
				sourceID
			) as
				{
					project_id: string;
				}
				| undefined;


		if (dataset)
		{
			if (
				dataset.project_id !==
				projectID
			)
			{
				throw new Error(
					"Chart source belongs to another project"
				);
			}

			return;
		}


		const transformation =
			this.database.prepare(`
				SELECT project_id
				FROM transformations
				WHERE id = ?
			`).get(
				sourceID
			) as
				{
					project_id: string;
				}
				| undefined;


		if (transformation)
		{
			if (
				transformation.project_id !==
				projectID
			)
			{
				throw new Error(
					"Chart source belongs to another project"
				);
			}

			return;
		}


		throw new Error(
			"Chart source not found"
		);
	}
}