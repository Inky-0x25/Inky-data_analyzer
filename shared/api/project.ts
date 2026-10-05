import { ProjectSettings } from "../models/Project";


export interface ProjectListItem
{
	id: string;
	name: string;
}


export interface ProjectResponse
{
	id: string;
	name: string;
	settings: ProjectSettings;
}


export interface CreateProjectRequest
{
	name?: string;
}


export interface UpdateProjectRequest
{
	id: string;
	name?: string;
	settings?: ProjectSettings;
}


export interface DeleteProjectRequest
{
	id: string;
}


export interface ProjectApiError
{
	error: string;
}