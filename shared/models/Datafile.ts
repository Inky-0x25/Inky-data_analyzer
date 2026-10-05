import { DatafileResponse } from "../api/datafile";


export const FileState = 
{
	IDLE: "idle",
	PROCESSING: "processing",
	READY: "ready",
	ERROR: "error",
} as const;

export type FileStateValue = typeof FileState[keyof typeof FileState];


export const FileType = 
{
	JSON: "json",
	CSV: "csv",
	EXCEL: "excel",
	SQL: "sql"
} as const;

export type FileTypeValue = typeof FileType[keyof typeof FileType];


export function detectFileType(name: string): FileTypeValue | null
{
	const lowerName = name.toLowerCase();

	if (lowerName.endsWith(".json"))
		return FileType.JSON;
	else if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls"))
		return FileType.EXCEL;
	else if (lowerName.endsWith(".csv"))
		return FileType.CSV;
	else if (lowerName.endsWith(".sql") || lowerName.endsWith(".sqlite") || lowerName.endsWith(".db"))
		return FileType.SQL;

	return null;
}


export interface DatafileProperties
{
	id: string;
	hash: string | null;
	name: string;
	size: number;
	type: FileTypeValue | null;

	state: FileStateValue;
	error: string | null;
}


export class Datafile implements DatafileProperties
{
	id: string;
	hash: string | null;
	name: string;
	size: number;
	type: FileTypeValue | null;

	state: FileStateValue;
	error: string | null;


	private constructor()
	{
		this.id = "";
		this.hash = "";
		this.name = "";
		this.size = 0;
		this.type = null;

		this.state = FileState.IDLE;
		this.error = null;
	}


	static createFromFile(browserFile: File): Datafile
	{
		const datafile = new Datafile();

		datafile.name = browserFile.name;
		datafile.size = browserFile.size;
		datafile.type = detectFileType(browserFile.name);

		if (datafile.type === null)
		{
			datafile.state = FileState.ERROR;
			datafile.error = "Unsupported file extension";
		}
		return datafile;
	}


	static createFromObject(data: DatafileResponse): Datafile
	{
		const datafile = new Datafile();

		datafile.id = data.id;
		datafile.hash = data.hash;
		datafile.name = data.name;
		datafile.size = data.size;
		datafile.type = data.type;
		datafile.state = data.state;
		datafile.error = data.error;

		return datafile;
	}


	isValid(): boolean {return (this.state === FileState.IDLE || this.state === FileState.PROCESSING || this.state === FileState.READY);}
	isReady(): boolean {return this.state === FileState.READY;}


	toJSON(): string
	{
		return JSON.stringify(
		{
			id: this.id,
			hash: this.hash,
			name: this.name,
			size: this.size,
			type: this.type,

			state: this.state,
			error: this.error,
		});
	}
}