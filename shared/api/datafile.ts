import { DatasetParseOptions } from "../models/Dataset";
import { FileStateValue, FileTypeValue } from "../models/Datafile";


export interface DatafileResponse
{
	id: string;
	hash: string | null;
	name: string;
	size: number;
	type: FileTypeValue | null;
	state: FileStateValue;
	error: string | null;
}


export interface CreateDatafileRequest
{
	projectID: string;
	name: string;
	content: string;
}


export interface UpdateDatafileRequest
{
	id: string;
	name?: string;
}


export const DatafileParseAction =
{
	UPDATE_CONTENT: "update-content",
	REPARSE: "reparse",
	NONE: "none"
} as const;

export type DatafileParseActionValue = typeof DatafileParseAction[keyof typeof DatafileParseAction];


export interface DatafileDatasetParseOptions
{
	datasetId: string;
	action: DatafileParseActionValue;
	parseOptions: DatasetParseOptions;
}


export interface DatafileParseRequest
{
	id: string;
	datasets: DatafileDatasetParseOptions[];
}


export interface UpdateDatafileContentRequest extends DatafileParseRequest
{
	name: string;
	content: string;
}