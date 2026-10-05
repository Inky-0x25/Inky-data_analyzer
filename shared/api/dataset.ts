import { DatasetHeader, DatasetParseOptions } from "../models/Dataset";


export interface DatasetResponse
{
	id: string;
	name: string;
	sourceFileId: string | null;
	sourceKey: string | null;
	parseOptions: DatasetParseOptions;

	headerRoot: DatasetHeaderResponse;
	error: string | null;
}


export interface DatasetListItem
{
	id: string;
	name: string;
	sourceFileId: string | null;
	sourceKey: string | null;
	parseOptions: DatasetParseOptions;

	error: string | null;
}


export interface DatasetHeaderResponse
{
	name: string;
	height: number;

	children: (DatasetHeaderResponse | DatasetFieldResponse)[];
}


export interface DatasetFieldResponse
{
	name: string;
	height: number;
	type: string;

	categories: string[];
	info: FieldInfoResponse[];
}


export interface FieldInfoResponse
{
	name: string;
	value: string;
}


export interface CreateDatasetRequest
{
	projectID: string;

	name: string;
	sourceFileId: string | null;
	sourceKey: string | null;
	parseOptions: DatasetParseOptions;

	headerRoot: DatasetHeaderResponse;
}


export interface UpdateDatasetRequest
{
	id: string;

	name?: string;
	sourceFileId?: string | null;
	sourceKey?: string | null;
	headerRoot?: DatasetHeaderResponse;
}