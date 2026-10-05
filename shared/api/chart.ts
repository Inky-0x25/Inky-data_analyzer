import { ChartTypeValue } from "../models/Chart";


export interface ChartResponse
{
	id: string;
	name: string;
	type: ChartTypeValue;
	sourceID: string | null;
	settings: Record<string, unknown>;
	error: string | null;
}


export interface ChartListItem
{
	id: string;
	name: string;
	type: ChartTypeValue;
	sourceID: string | null;
	error: string | null;
}

export type ChartListResponse = ChartListItem[];


export interface CreateChartRequest
{
	projectID: string;
	name: string;
	type: ChartTypeValue;
	sourceID: string | null;
	settings: Record<string, unknown>;
}


export interface UpdateChartRequest
{
	id: string;
	name?: string;
	type?: ChartTypeValue;
	sourceID?: string | null;
	settings?: Record<string, unknown>;
}


export type CreateChartResponse = ChartResponse;
export type GetChartResponse = ChartResponse;
export type UpdateChartResponse = ChartResponse;