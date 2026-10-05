export const TransformationType =
{
	FILTER: "filter",
	EXCLUDE: "exclude",
	CHANGE: "change",
} as const;

export type TransformationTypeValue = typeof TransformationType[keyof typeof TransformationType];
export function isValidTransformationType(value: string): value is TransformationTypeValue {return Object.values(TransformationType).includes(value as TransformationTypeValue);}


export interface DatatransOperation
{
	type: TransformationTypeValue;
	settings: Record<string, unknown>;
}


export interface DatatransProperties
{
	id: string;
	name: string;
	parentID: string;

	operations: DatatransOperation[];
	error: string | null;
}


export class Datatrans implements DatatransProperties
{
	id: string;
	name: string;
	parentID: string;

	operations: DatatransOperation[];
	error: string | null;


	private constructor()
	{
		this.id = crypto.randomUUID();
		this.name = "New_transformation";
		this.parentID = "";

		this.operations = [];
		this.error = null;
	}


	static create(parentID: string): Datatrans
	{
		const transformation = new Datatrans();
		transformation.parentID = parentID;

		return transformation;
	}


	static createFromObject(data: unknown): Datatrans
	{
		if (!data || typeof data !== "object") throw new Error("Invalid transformation data");

		const value = data as Record<string, unknown>;
		if (typeof value.parentID !== "string" || value.parentID === "") throw new Error("Invalid transformation parent");

		const transformation = new Datatrans();
		transformation.id = typeof value.id === "string" ? value.id : transformation.id;
		transformation.name = typeof value.name === "string" ? value.name : transformation.name;
		transformation.parentID = value.parentID;

		if (Array.isArray(value.operations))
		{
			transformation.operations = value.operations.map(
				operation =>
				{
					if (!operation || typeof operation !== "object") throw new Error("Invalid transformation operation");

					const operationValue = operation as Record<string, unknown>;
					if (typeof operationValue.type !== "string" || !isValidTransformationType(operationValue.type)) throw new Error("Invalid transformation operation type");

					const settings = operationValue.settings && typeof operationValue.settings === "object" && !Array.isArray(operationValue.settings) ? operationValue.settings as Record<string, unknown> : {};

					return {type: operationValue.type, settings};
				}
			);
		}

		transformation.error = typeof value.error === "string" ? value.error : null;

		return transformation;
	}


	toJSON(): DatatransProperties
	{
		return {
			id: this.id,
			name: this.name,
			parentID: this.parentID,
			operations: this.operations,
			error: this.error
		};
	}
}