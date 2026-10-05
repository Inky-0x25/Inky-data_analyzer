import { ProjectResponse } from "../api/project";
import { FieldCategoryProperties } from "./Dataset";


export interface ProjectSettings
{
	fieldCategories: FieldCategoryProperties[];
}


export class Project
{
	id: string;
	name: string;
	
	settings: ProjectSettings;
	
	private constructor()
	{
		this.id = crypto.randomUUID();
		this.name = "New_project";

		this.settings =
		{
			fieldCategories: []
		};
	}
	
	
	static createFromObject(data: ProjectResponse): Project
	{
		const project = new Project();

		project.id = data.id;
		project.name = data.name;
		
		project.settings =
		{
			...project.settings,
			...data.settings,
			fieldCategories: [...(data.settings?.fieldCategories ?? [])]
		};

		return project;
	}


	toJSON(): string
	{
		return JSON.stringify(
		{
			id: this.id,
			name: this.name,
			settings: this.settings
		});
	}
}