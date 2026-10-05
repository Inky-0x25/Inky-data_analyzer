import Database from "better-sqlite3";

import { CreateProjectRequest, ProjectListItem, ProjectResponse, UpdateProjectRequest } from "../../shared/api/project";
import { ProjectSettings } from "../../shared/models/Project";
import { FieldCategory, FieldType } from "../../shared/models/Dataset";


export class ProjectService
{
	constructor(private readonly database: Database.Database) {}


	list(): ProjectListItem[]
	{
		const rows = this.database.prepare(`
				SELECT id, name
				FROM projects
				ORDER BY name
			`).all() as Array<{id: string; name: string;}>;

		return rows;
	}


	get(id: string): ProjectResponse | null
	{
		const row = this.database.prepare(`
				SELECT id, name, settings
				FROM projects
				WHERE id = ?
			`).get(id) as {id: string; name: string; settings: string;} | undefined;

		if (!row)
			return null;

		return this.getResponse(row);
	}


	create(request: CreateProjectRequest): ProjectResponse
	{
		const requestedName = this.normalizeName(
			request.name ?? "New_project"
		);

		this.validateName(requestedName);


		const id = crypto.randomUUID();


		const settings: ProjectSettings =
		{
			fieldCategories: this.createDefaultFieldCategories()
		};


		const transaction = this.database.transaction(() =>
		{
			const name = this.getUniqueName(
				requestedName
			);


			this.database.prepare(`
					INSERT INTO projects(id, name, settings)
					VALUES(?, ?, ?)
				`).run(
					id,
					name,
					JSON.stringify(settings)
				);
		});

		transaction();


		return this.get(id)!;
	}


	update(request: UpdateProjectRequest): ProjectResponse | null
	{
		const existing = this.database.prepare(`
				SELECT id, name, settings
				FROM projects
				WHERE id = ?
			`).get(request.id) as {
				id: string;
				name: string;
				settings: string;
			} | undefined;

		if (!existing)
			return null;


		const name = request.name === undefined
			? existing.name
			: this.normalizeName(request.name);

		this.validateName(name);


		const settings = request.settings === undefined
			? JSON.parse(existing.settings) as ProjectSettings
			: this.normalizeSettings(request.settings);


		const transaction = this.database.transaction(() =>
		{
			const uniqueName = this.getUniqueName(
				name,
				request.id
			);


			this.database.prepare(`
					UPDATE projects
					SET
						name = ?,
						settings = ?
					WHERE id = ?
				`).run(
					uniqueName,
					JSON.stringify(settings),
					request.id
				);
		});

		transaction();


		return this.get(request.id)!;
	}


	delete(id: string): boolean
	{
		const result = this.database.prepare(`
				DELETE FROM projects
				WHERE id = ?
			`).run(id);

		return result.changes > 0;
	}


	private normalizeSettings(settings: ProjectSettings): ProjectSettings
	{
		if (!Array.isArray(settings.fieldCategories))
			throw new Error("Invalid project field categories");


		const fieldCategories: FieldCategory[] = [];


		for (const categoryData of settings.fieldCategories)
		{
			const category = FieldCategory.createFromObject(
				categoryData
			);


			const requestedName = this.normalizeCategoryName(
				category.name
			);

			this.validateCategoryName(
				requestedName
			);


			const name = this.getUniqueCategoryName(
				fieldCategories,
				requestedName
			);


			fieldCategories.push(
				FieldCategory.create(
					name,
					[...category.expressions],
					[...category.validValueTypes]
				)
			);
		}


		return {
			fieldCategories
		};
	}


	private createDefaultFieldCategories(): FieldCategory[]
	{
		return [
			FieldCategory.create(
				"Identifier",
				[
					"(^|[\\s_])ids?($|[\\s_])",
					"(^|[\\s_])index(es)?($|[\\s_])",
					"(^|[\\s_])uuids?($|[\\s_])",
					"(^|[\\s_])keys?($|[\\s_])",
					"(^|[\\s_])identifiers?($|[\\s_])",
					"(^|[\\s_])codes?($|[\\s_])"
				],
				[
					FieldType.STRING,
					FieldType.NUMBER
				]
			),

			FieldCategory.create(
				"Title",
				[
					"(^|[\\s_])titles?($|[\\s_])",
					"(^|[\\s_])headlines?($|[\\s_])",
					"(^|[\\s_])subjects?($|[\\s_])"
				],
				[
					FieldType.STRING
				]
			),

			FieldCategory.create(
				"Description",
				[
					"(^|[\\s_])descriptions?($|[\\s_])",
					"(^|[\\s_])summaries?($|[\\s_])",
					"(^|[\\s_])contents?($|[\\s_])",
					"(^|[\\s_])details?($|[\\s_])",
					"(^|[\\s_])remarks?($|[\\s_])"
				],
				[
					FieldType.STRING
				]
			),

			FieldCategory.create(
				"Name",
				[
					"(^|[\\s_])names?($|[\\s_])",
					"(^|[\\s_])authors?($|[\\s_])",
					"(^|[\\s_])owners?($|[\\s_])",
					"(^|[\\s_])creators?($|[\\s_])"
				],
				[
					FieldType.STRING
				]
			),

			FieldCategory.create(
				"Category",
				[
					"(^|[\\s_])categor(y|ies)($|[\\s_])",
					"(^|[\\s_])types?($|[\\s_])",
					"(^|[\\s_])classes?($|[\\s_])",
					"(^|[\\s_])groups?($|[\\s_])"
				],
				[
					FieldType.STRING
				]
			),

			FieldCategory.create(
				"Tag",
				[
					"(^|[\\s_])tags?($|[\\s_])",
					"(^|[\\s_])labels?($|[\\s_])",
					"(^|[\\s_])keywords?($|[\\s_])"
				],
				[
					FieldType.STRING
				]
			),

			FieldCategory.create(
				"Statistic",
				[
					"(^|[\\s_])views?($|[\\s_])",
					"(^|[\\s_])playbacks?($|[\\s_])",
					"(^|[\\s_])likes?($|[\\s_])",
					"(^|[\\s_])comments?($|[\\s_])",
					"(^|[\\s_])shares?($|[\\s_])",
					"(^|[\\s_])followers?($|[\\s_])",
					"(^|[\\s_])fans?($|[\\s_])",
					"(^|[\\s_])coins?($|[\\s_])",
					"(^|[\\s_])scores?($|[\\s_])"
				],
				[
					FieldType.NUMBER
				]
			),

			FieldCategory.create(
				"Percentage",
				[
					"(^|[\\s_])percentages?($|[\\s_])",
					"(^|[\\s_])%($|[\\s_])",
					"(^|[\\s_])rates?($|[\\s_])",
					"(^|[\\s_])ratios?($|[\\s_])",
					"(^|[\\s_])ctrs?($|[\\s_])",
					"(^|[\\s_])percents?($|[\\s_])"
				],
				[
					FieldType.NUMBER
				]
			),

			FieldCategory.create(
				"Score",
				[
					"(^|[\\s_])scores?($|[\\s_])",
					"(^|[\\s_])ranks?($|[\\s_])",
					"(^|[\\s_])ratings?($|[\\s_])",
					"(^|[\\s_])levels?($|[\\s_])"
				],
				[
					FieldType.NUMBER
				]
			),

			FieldCategory.create(
				"Date",
				[],
				[
					FieldType.DATE,
					FieldType.DATETIME
				]
			),

			FieldCategory.create(
				"Location",
				[
					"(^|[\\s_])countr(y|ies)($|[\\s_])",
					"(^|[\\s_])cit(y|ies)($|[\\s_])",
					"(^|[\\s_])addresses?($|[\\s_])",
					"(^|[\\s_])locations?($|[\\s_])",
					"(^|[\\s_])places?($|[\\s_])"
				],
				[
					FieldType.STRING
				]
			),

			FieldCategory.create(
				"Image",
				[
					"(^|[\\s_])images?($|[\\s_])",
					"(^|[\\s_])thumbnails?($|[\\s_])",
					"(^|[\\s_])avatars?($|[\\s_])",
					"(^|[\\s_])pictures?($|[\\s_])"
				],
				[
					FieldType.STRING
				]
			),

			FieldCategory.create(
				"URL",
				[
					"(^|[\\s_])urls?($|[\\s_])",
					"(^|[\\s_])links?($|[\\s_])",
					"(^|[\\s_])websites?($|[\\s_])"
				],
				[
					FieldType.STRING
				]
			),

			FieldCategory.create(
				"Email",
				[
					"(^|[\\s_])emails?($|[\\s_])",
					"(^|[\\s_])mails?($|[\\s_])"
				],
				[
					FieldType.STRING
				]
			),

			FieldCategory.create(
				"Phone",
				[
					"(^|[\\s_])phones?($|[\\s_])",
					"(^|[\\s_])mobiles?($|[\\s_])",
					"(^|[\\s_])telephones?($|[\\s_])"
				],
				[
					FieldType.STRING
				]
			)
		];
	}


	private normalizeName(name: string): string
	{
		if (name == "")
			return "New_project";

		return name
			.trim()
			.replace(/\s+/g, "_");
	}


	private validateName(name: string): void
	{
		if (!/^[A-Za-z0-9_.-]{1,50}$/.test(name))
			throw new Error("Invalid project name");
	}


	private getUniqueName(name: string, excludeID?: string): string
	{
		const exists = (candidate: string): boolean =>
		{
			const project = this.database.prepare(`
					SELECT id
					FROM projects
					WHERE name = ?
				`).get(candidate) as {id: string;} | undefined;

			return project !== undefined && project.id !== excludeID;
		};


		if (!exists(name))
			return name;


		let index = 1;

		while (exists(`${name}_${index}`))
			index++;


		return `${name}_${index}`;
	}


	private normalizeCategoryName(name: string): string
	{
		if (name.trim() == "")
			return "New_category";

		return name.trim();
	}


	private validateCategoryName(name: string): void
	{
		if (!/^[A-Za-z0-9_.\- ]{1,30}$/.test(name))
			throw new Error("Invalid category name");
	}


	private getUniqueCategoryName(categories: FieldCategory[], name: string): string
	{
		const exists = (candidate: string): boolean =>
		{
			return categories.some(
				category => category.name === candidate
			);
		};


		if (!exists(name))
			return name;


		let index = 1;

		while (exists(`${name} ${index}`))
			index++;


		return `${name} ${index}`;
	}


	private getResponse(row: {id: string; name: string; settings: string;}): ProjectResponse
	{
		return {
			id: row.id,
			name: row.name,
			settings: JSON.parse(row.settings)
		};
	}
}