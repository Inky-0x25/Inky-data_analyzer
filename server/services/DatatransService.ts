import Database from "better-sqlite3";

import {
	Datatrans,
	DatatransOperation,
	TransformationType
} from "../../shared/models/Datatrans";

import { DatasetHeader } from "../../shared/models/Dataset";

import {
	CreateDatatransRequest,
	DatatransListResponse,
	DatatransResponse,
	UpdateDatatransRequest
} from "../../shared/api/datatrans";

import { ConditionEvaluator } from "../../shared/evaluators/conditionEvaluator";
import { ModificationEvaluator } from "../../shared/evaluators/modificationEvaluator";


interface TransformationData
{
	content: string[][];
	headerRoot: DatasetHeader;
}


export class DatatransService
{
	constructor(
		private readonly database: Database.Database
	) {}


	list(projectID: string): DatatransListResponse
	{
		const rows = this.database.prepare(`
			SELECT
				id,
				name,
				parent_id,
				error
			FROM transformations
			WHERE project_id = ?
			ORDER BY name
		`).all(projectID) as Array<{
			id: string;
			name: string;
			parent_id: string;
			error: string | null;
		}>;

		return rows.map(row =>
		({
			id: row.id,
			name: row.name,
			parentID: row.parent_id,
			error: row.error
		}));
	}


	get(id: string): DatatransResponse | null
	{
		const row = this.database.prepare(`
			SELECT
				id,
				name,
				parent_id,
				operations,
				error
			FROM transformations
			WHERE id = ?
		`).get(id) as
			{
				id: string;
				name: string;
				parent_id: string;
				operations: string;
				error: string | null;
			}
			| undefined;

		if (!row)
			return null;

		return {
			id: row.id,
			name: row.name,
			parentID: row.parent_id,
			operations: JSON.parse(row.operations),
			error: row.error
		};
	}


	getContent(id: string): TransformationData | null
	{
		const row = this.database.prepare(`
			SELECT
				header_root,
				cells
			FROM transformation_cells
			WHERE transformation_id = ?
		`).get(id) as
			{
				header_root: string;
				cells: string;
			}
			| undefined;

		if (!row)
			return null;

		return {
			headerRoot: DatasetHeader.createFromObject(
				JSON.parse(row.header_root)
			),
			content: JSON.parse(row.cells)
		};
	}


	create(
		request: CreateDatatransRequest
	): DatatransResponse
	{
		const project = this.database.prepare(`
			SELECT id
			FROM projects
			WHERE id = ?
		`).get(request.projectID);

		if (!project)
			throw new Error("Project not found");

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

		const parentProjectID =
			this.getParentProjectID(
				request.parentID
			);

		if (!parentProjectID)
			throw new Error(
				"Transformation parent not found"
			);

		if (
			parentProjectID !==
			request.projectID
		)
		{
			throw new Error(
				"Transformation parent belongs to another project"
			);
		}

		this.validateParent(
			request.projectID,
			request.parentID
		);

		const parentData =
			this.getParentData(
				request.parentID
			);

		if (!parentData)
			throw new Error(
				"Transformation parent data not found"
			);

		const transformation =
			Datatrans.create(
				request.parentID
			);

		transformation.name =
			name;

		transformation.operations =
			[];

		this.database.transaction(() =>
		{
			this.database.prepare(`
				INSERT INTO transformations(
					id,
					project_id,
					name,
					parent_id,
					operations,
					error
				)
				VALUES(?, ?, ?, ?, ?, ?)
			`).run(
				transformation.id,
				request.projectID,
				transformation.name,
				transformation.parentID,
				JSON.stringify(
					transformation.operations
				),
				null
			);

			this.storeContent(
				transformation.id,
				parentData
			);
		})();

		return this.get(
			transformation.id
		)!;
	}


	update(
		request: UpdateDatatransRequest
	): DatatransResponse
	{
		const current =
			this.get(
				request.id
			);

		if (!current)
			throw new Error(
				"Transformation not found"
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

		const parentID =
			request.parentID !== undefined
				? request.parentID
				: current.parentID;

		const operations =
			request.operations !== undefined
				? this.normalizeOperations(
					request.operations
				)
				: this.normalizeOperations(
					current.operations
				);

		const projectID =
			this.getTransformationProjectID(
				request.id
			);

		if (!projectID)
			throw new Error(
				"Transformation project not found"
			);

		const parentProjectID =
			this.getParentProjectID(
				parentID
			);

		if (!parentProjectID)
			throw new Error(
				"Transformation parent not found"
			);

		if (
			parentProjectID !==
			projectID
		)
		{
			throw new Error(
				"Transformation parent belongs to another project"
			);
		}

		this.validateParent(
			projectID,
			parentID,
			request.id
		);

		const name =
			this.getUniqueName(
				projectID,
				requestedName,
				request.id
			);

		const parentData =
			this.getParentData(
				parentID
			);

		if (!parentData)
			throw new Error(
				"Transformation parent data not found"
			);

		const data =
			this.applyOperations(
				parentData,
				operations
			);

		this.database.transaction(() =>
		{
			this.database.prepare(`
				UPDATE transformations
				SET
					name = ?,
					parent_id = ?,
					operations = ?,
					error = ?
				WHERE id = ?
			`).run(
				name,
				parentID,
				JSON.stringify(
					operations
				),
				null,
				request.id
			);

			this.storeContent(
				request.id,
				data
			);
		})();

		this.recalculateChildren(
			request.id
		);

		return this.get(
			request.id
		)!;
	}


	delete(id: string): void
	{
		const transformation = this.get(id);
		if (!transformation) return;

		const children = this.database.prepare(`
				SELECT id
				FROM transformations
				WHERE parent_id = ?
			`).all(id) as Array<{id: string;}>;

		for (const child of children)
			this.delete(child.id);

		this.database.prepare(`
			DELETE FROM charts
			WHERE source_id = ?
		`).run(id);

		this.database.prepare(`
			DELETE FROM transformations
			WHERE id = ?
		`).run(id);
	}


	public recalculateChildren(
		parentID: string
	): void
	{
		const children =
			this.database.prepare(`
				SELECT id
				FROM transformations
				WHERE parent_id = ?
				ORDER BY name
			`).all(parentID) as Array<{
				id: string;
			}>;

		for (const child of children)
			this.recalculateTransformation(
				child.id
			);
	}


	private recalculateTransformation(
		id: string
	): void
	{
		const transformation =
			this.get(id);

		if (!transformation)
			return;

		const parentData =
			this.getParentData(
				transformation.parentID
			);

		if (!parentData)
		{
			this.database.prepare(`
				UPDATE transformations
				SET error = ?
				WHERE id = ?
			`).run(
				"Transformation parent data not found",
				id
			);

			return;
		}

		try
		{
			const data =
				this.applyOperations(
					parentData,
					this.normalizeOperations(
						transformation.operations
					)
				);

			this.database.transaction(() =>
			{
				this.database.prepare(`
					UPDATE transformations
					SET error = ?
					WHERE id = ?
				`).run(
					null,
					id
				);

				this.storeContent(
					id,
					data
				);
			})();

			this.recalculateChildren(
				id
			);
		}
		catch (error)
		{
			this.database.prepare(`
				UPDATE transformations
				SET error = ?
				WHERE id = ?
			`).run(
				error instanceof Error
					? error.message
					: String(error),
				id
			);
		}
	}


	private getParentData(
		parentID: string
	): TransformationData | null
	{
		const transformation =
			this.database.prepare(`
				SELECT
					header_root,
					cells
				FROM transformation_cells
				WHERE transformation_id = ?
			`).get(parentID) as
				{
					header_root: string;
					cells: string;
				}
				| undefined;

		if (transformation)
		{
			return {
				headerRoot:
					DatasetHeader.createFromObject(
						JSON.parse(
							transformation.header_root
						)
					),
				content:
					JSON.parse(
						transformation.cells
					)
			};
		}

		const dataset =
			this.database.prepare(`
				SELECT
					header_root,
					cells
				FROM dataset_cells
				WHERE dataset_id = ?
			`).get(parentID) as
				{
					header_root: string;
					cells: string;
				}
				| undefined;

		if (!dataset)
			return null;

		return {
			headerRoot:
				DatasetHeader.createFromObject(
					JSON.parse(
						dataset.header_root
					)
				),
			content:
				JSON.parse(
					dataset.cells
				)
		};
	}


	private applyOperations(
		data: TransformationData,
		operations: DatatransOperation[]
	): TransformationData
	{
		let current: TransformationData = {
			content:
				data.content.map(
					row => [...row]
				),
			headerRoot:
				DatasetHeader.createFromObject(
					data.headerRoot.toJSON()
				)
		};

		for (const operation of operations)
		{
			switch (operation.type)
			{
				case TransformationType.FILTER:
					current =
						this.applyFilter(
							current,
							operation.settings
						);
					break;

				case TransformationType.EXCLUDE:
					current =
						this.applyExclude(
							current,
							operation.settings
						);
					break;

				case TransformationType.CHANGE:
					current =
						this.applyChange(
							current,
							operation.settings
						);
					break;
			}
		}

		return current;
	}


	private applyFilter(
		data: TransformationData,
		settings: Record<string, unknown>
	): TransformationData
	{
		const rowConditions =
			this.getStringArray(
				settings.rowConditions
			);

		const columnConditions =
			this.getStringArray(
				settings.columnConditions
			);

		const fields =
			data.headerRoot.getChildFields();

		const rowKeep =
			this.getRowSelection(
				data.content,
				fields,
				rowConditions,
				false
			);

		const columnKeep =
			this.getColumnSelection(
				data.content,
				fields,
				columnConditions,
				false
			);

		const content =
			data.content
				.filter(
					(_, rowIndex) =>
						rowKeep[rowIndex]
				)
				.map(row =>
					row.filter(
						(_, columnIndex) =>
							columnKeep[columnIndex]
					)
				);

		return {
			content,
			headerRoot:
				this.filterHeaderRoot(
					data.headerRoot,
					columnKeep
				)
		};
	}


	private applyExclude(
		data: TransformationData,
		settings: Record<string, unknown>
	): TransformationData
	{
		const rowConditions =
			this.getStringArray(
				settings.rowConditions
			);

		const columnConditions =
			this.getStringArray(
				settings.columnConditions
			);

		const fields =
			data.headerRoot.getChildFields();

		const rowKeep =
			this.getRowSelection(
				data.content,
				fields,
				rowConditions,
				true
			);

		const columnKeep =
			this.getColumnSelection(
				data.content,
				fields,
				columnConditions,
				true
			);

		const content =
			data.content
				.filter(
					(_, rowIndex) =>
						rowKeep[rowIndex]
				)
				.map(row =>
					row.filter(
						(_, columnIndex) =>
							columnKeep[columnIndex]
					)
				);

		return {
			content,
			headerRoot:
				this.filterHeaderRoot(
					data.headerRoot,
					columnKeep
				)
		};
	}


	private applyChange(
		data: TransformationData,
		settings: Record<string, unknown>
	): TransformationData
	{
		const modifications =
			settings.conditionalModifications;

		if (!Array.isArray(modifications))
		{
			throw new Error(
				"Invalid conditional modifications"
			);
		}

		const fields =
			data.headerRoot.getChildFields();

		let content =
			data.content.map(
				row => [...row]
			);

		for (const item of modifications)
		{
			if (
				!item ||
				typeof item !== "object"
			)
			{
				throw new Error(
					"Invalid conditional modification"
				);
			}

			const value =
				item as Record<string, unknown>;

			if (
				typeof value.modification !== "string" ||
				!ModificationEvaluator.isValidModification(
					value.modification
				)
			)
			{
				throw new Error(
					"Invalid modification"
				);
			}

			if (
				value.condition !== undefined &&
				typeof value.condition !== "string"
			)
			{
				throw new Error(
					"Invalid modification condition"
				);
			}

			content =
				ModificationEvaluator.evaluate(
					content,
					fields,
					value.modification,
					value.condition
				);
		}

		return {
			content,
			headerRoot:
				data.headerRoot
		};
	}


	private getRowSelection(
		content: string[][],
		fields: ReturnType<
			DatasetHeader["getChildFields"]
		>,
		conditions: string[],
		invert: boolean
	): boolean[]
	{
		if (content.length === 0)
			return [];

		if (conditions.length === 0)
		{
			return content.map(
				() => true
			);
		}

		const selection =
			content.map(
				() => true
			);

		for (const condition of conditions)
		{
			const mask =
				ConditionEvaluator.evaluate(
					content,
					fields,
					condition
				);

			for (
				let rowIndex = 0;
				rowIndex < content.length;
				rowIndex++
			)
			{
				const matches =
					mask[rowIndex]?.[
						content[rowIndex].length
					] ?? false;

				if (invert)
				{
					selection[rowIndex] =
						selection[rowIndex] &&
						!matches;
				}
				else
				{
					selection[rowIndex] =
						selection[rowIndex] &&
						matches;
				}
			}

			if (!selection.some(Boolean))
				break;
		}

		return selection;
	}


	private getColumnSelection(
		content: string[][],
		fields: ReturnType<
			DatasetHeader["getChildFields"]
		>,
		conditions: string[],
		invert: boolean
	): boolean[]
	{
		const columnCount =
			content.reduce(
				(max, row) =>
					Math.max(
						max,
						row.length
					),
				0
			);

		if (columnCount === 0)
			return [];

		if (conditions.length === 0)
		{
			return Array(
				columnCount
			).fill(true);
		}

		const selection =
			Array(columnCount).fill(true);

		for (const condition of conditions)
		{
			const mask =
				ConditionEvaluator.evaluate(
					content,
					fields,
					condition
				);

			for (
				let columnIndex = 0;
				columnIndex < columnCount;
				columnIndex++
			)
			{
				let matches = false;

				for (
					let rowIndex = 0;
					rowIndex < content.length;
					rowIndex++
				)
				{
					if (
						mask[rowIndex]?.[
							columnIndex
						]
					)
					{
						matches = true;
						break;
					}
				}

				if (invert)
				{
					selection[columnIndex] =
						selection[columnIndex] &&
						!matches;
				}
				else
				{
					selection[columnIndex] =
						selection[columnIndex] &&
						matches;
				}
			}

			if (!selection.some(Boolean))
				break;
		}

		return selection;
	}


	private filterHeaderRoot(
		headerRoot: DatasetHeader,
		keepColumns: boolean[]
	): DatasetHeader
	{
		const json =
			headerRoot.toJSON() as any;

		const filterNode = (
			node: any
		): any =>
		{
			if (
				!node ||
				typeof node !== "object"
			)
			{
				return node;
			}

			if (Array.isArray(node.children))
			{
				node.children =
					node.children
						.map(
							(child: any) =>
							{
								if (
									typeof child.index ===
										"number" &&
									!keepColumns[
										child.index
									]
								)
								{
									return null;
								}

								return filterNode(
									child
								);
							}
						)
						.filter(
							(child: any) =>
								child !== null
						);
			}

			if (Array.isArray(node.fields))
			{
				node.fields =
					node.fields
						.map(
							(
								field: any,
								index: number
							) =>
							{
								if (
									!keepColumns[
										index
									]
								)
								{
									return null;
								}

								return filterNode(
									field
								);
							}
						)
						.filter(
							(field: any) =>
								field !== null
						);
			}

			return node;
		};

		return DatasetHeader.createFromObject(
			filterNode(json)
		);
	}


	private storeContent(
		id: string,
		data: TransformationData
	): void
	{
		this.database.prepare(`
			INSERT INTO transformation_cells(
				transformation_id,
				header_root,
				cells
			)
			VALUES(?, ?, ?)
			ON CONFLICT(transformation_id)
			DO UPDATE SET
				header_root = excluded.header_root,
				cells = excluded.cells
		`).run(
			id,
			JSON.stringify(
				data.headerRoot.toJSON()
			),
			JSON.stringify(
				data.content
			)
		);
	}


	private normalizeOperations(
		operations: DatatransOperation[]
	): DatatransOperation[]
	{
		if (!Array.isArray(operations))
		{
			throw new Error(
				"Invalid transformation operations"
			);
		}

		return operations.map(
			operation =>
			{
				if (
					!operation ||
					typeof operation !== "object"
				)
				{
					throw new Error(
						"Invalid transformation operation"
					);
				}

				if (
					typeof operation.type !== "string" ||
					!Object.values(
						TransformationType
					).includes(
						operation.type as
							DatatransOperation["type"]
					)
				)
				{
					throw new Error(
						"Invalid transformation operation type"
					);
				}

				return {
					type: operation.type,
					settings:
						operation.settings &&
						typeof operation.settings ===
							"object" &&
						!Array.isArray(
							operation.settings
						)
							? operation.settings
							: {}
				};
			}
		);
	}


	private normalizeName(
		name: string
	): string
	{
		const normalized =
			name
				.trim()
				.replace(
					/\s+/g,
					"_"
				);

		return normalized === ""
			? "New_transformation"
			: normalized;
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
				"Invalid transformation name"
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
			const transformation =
				this.database.prepare(`
					SELECT id
					FROM transformations
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
				transformation !== undefined &&
				transformation.id !== excludeID
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


	private getTransformationProjectID(
		id: string
	): string | null
	{
		const row =
			this.database.prepare(`
				SELECT project_id
				FROM transformations
				WHERE id = ?
			`).get(id) as
				{
					project_id: string;
				}
				| undefined;

		return row?.project_id ?? null;
	}


	private getParentProjectID(
		parentID: string
	): string | null
	{
		const transformation =
			this.database.prepare(`
				SELECT project_id
				FROM transformations
				WHERE id = ?
			`).get(parentID) as
				{
					project_id: string;
				}
				| undefined;

		if (transformation)
			return transformation.project_id;


		const dataset =
			this.database.prepare(`
				SELECT project_id
				FROM datasets
				WHERE id = ?
			`).get(parentID) as
				{
					project_id: string;
				}
				| undefined;

		return dataset?.project_id ?? null;
	}


	private validateParent(
		projectID: string,
		parentID: string,
		selfID?: string
	): void
	{
		if (
			selfID &&
			parentID === selfID
		)
		{
			throw new Error(
				"Transformation cannot be its own parent"
			);
		}

		const parentProjectID =
			this.getParentProjectID(
				parentID
			);

		if (!parentProjectID)
		{
			throw new Error(
				"Transformation parent not found"
			);
		}

		if (
			parentProjectID !== projectID
		)
		{
			throw new Error(
				"Transformation parent belongs to another project"
			);
		}

		let currentID =
			parentID;

		while (true)
		{
			if (
				selfID &&
				currentID === selfID
			)
			{
				throw new Error(
					"Transformation cycle detected"
				);
			}

			const row =
				this.database.prepare(`
					SELECT parent_id
					FROM transformations
					WHERE id = ?
				`).get(currentID) as
					{
						parent_id: string;
					}
					| undefined;

			if (!row)
				return;

			currentID =
				row.parent_id;
		}
	}


	private getStringArray(
		value: unknown
	): string[]
	{
		if (value === undefined)
			return [];

		if (!Array.isArray(value))
		{
			throw new Error(
				"Invalid transformation condition list"
			);
		}

		if (
			!value.every(
				item =>
					typeof item === "string"
			)
		)
		{
			throw new Error(
				"Invalid transformation condition list"
			);
		}

		return value;
	}
}