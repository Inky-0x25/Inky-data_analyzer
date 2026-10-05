import { TransformationTypeValue } from "../models/Datatrans";


export interface DatatransOperationResponse
{
	type: TransformationTypeValue;
	settings: Record<string, unknown>;
}


export interface DatatransResponse
{
	id: string;
	name: string;
	parentID: string;

	operations: DatatransOperationResponse[];
	error: string | null;
}


export interface DatatransListItem
{
	id: string;
	name: string;
	parentID: string;

	error: string | null;
}


export type DatatransListResponse = DatatransListItem[];


export interface CreateDatatransRequest
{
	projectID: string;
	name: string;
	parentID: string;
}


export interface UpdateDatatransRequest
{
	id: string;
	name?: string;
	parentID?: string;
	operations?: DatatransOperationResponse[];
}


export type CreateDatatransResponse = DatatransResponse;
export type GetDatatransResponse = DatatransResponse;
export type UpdateDatatransResponse = DatatransResponse;