import { DatasetResponse } from "../api/dataset"; 

export const FieldType =
{
    UNKNOWN: "unknown",

    STRING: "string",
    NUMBER: "number",
    BOOLEAN: "boolean",

    DATE: "date",
    TIME: "time",
    DATETIME: "datetime",

    ARRAY: "array",
    OBJECT: "object",

    NULL: "null",
    MIXED: "mixed",
} as const;

export type FieldTypeValue = typeof FieldType[keyof typeof FieldType];
export function isValidFieldType(value: string): value is FieldTypeValue {return Object.values(FieldType).includes(value as FieldTypeValue);}

export interface FieldCategoryProperties
{
	name: string;
	expressions: string[];
	validValueTypes: FieldTypeValue[];
}

export class FieldCategory implements FieldCategoryProperties
{
	name: string;
	expressions: string[];
	validValueTypes: FieldTypeValue[];


	private constructor()
	{
		this.name = "";
		this.expressions = [];
		this.validValueTypes = [];
	}


	static create(name: string, expressions: string[] = [], validValueTypes: FieldTypeValue[] = []): FieldCategory
	{
		const category = new FieldCategory();

		category.name = name;
		category.expressions = expressions;
		category.validValueTypes = validValueTypes;

		return category;
	}


	static createFromObject(data: any): FieldCategory
	{
		const category = new FieldCategory();

		category.name = data.name;
		category.expressions = data.expressions ?? [];
		category.validValueTypes = data.validValueTypes ?? [];

		return category;
	}


	toJSON(): any
	{
		return {
			name: this.name,
			expressions: this.expressions,
			validValueTypes: this.validValueTypes
		};
	}
}


export class FieldInfo
{
    name: string;
    value: string;

    private constructor()
    {
        this.name = "";
        this.value = "";
    }


    static create(name: string, value: string): FieldInfo
    {
        const info = new FieldInfo();
        info.name = name;
        info.value = value;

        return info;
    }


    static createFromObject(data: any): FieldInfo
    {
        const info = new FieldInfo();
        info.name = data.name;
        info.value = data.value;

        return info;
    }


    toJSON(): any {return {name: this.name, value: this.value};}
}


export class DatasetField
{
    name: string;
    height: number;
    type: FieldTypeValue;
    categories: string[];
    info: FieldInfo[];


    private constructor()
    {
        this.name = "";
		this.height = 1;
        this.type = FieldType.UNKNOWN;
        this.categories = [];
        this.info = [];
    }


    static createAsChildOf(header: DatasetHeader, name: string, height: number = 1, type: FieldTypeValue = FieldType.UNKNOWN): DatasetField
    {
        const field = new DatasetField();
        field.name = name;
		field.height = height;
		field.type = type;
        header.addChild(field);

        return field;
    }


    static createFromObject(data: any): DatasetField
    {
        const field = new DatasetField();
        field.name = data.name;
		field.height = data.height;
        field.type = data.type ?? FieldType.UNKNOWN;
        field.categories = data.categories ?? [];
        field.info = (data.info ?? []).map((info: any) => FieldInfo.createFromObject(info));

        return field;
    }
	
	changeHeight(height: number): void {if (height > 0) this.height = height;}
	
	
    changeType(type: FieldTypeValue): void {if (isValidFieldType(type)) this.type = type;}


    addCategories(categoryIds: string[]): void {for(let i=0; i<categoryIds.length; i++) {if (!this.categories.includes(categoryIds[i])) this.categories.push(categoryIds[i]);}}
    removeCategory(categoryId: string): void {this.categories = this.categories.filter(current => current !== categoryId);}
    clearCategories(): void {this.categories = [];}


    addInfo(info: FieldInfo[]): void {for(let i=0; i<info.length; i++) {this.info.push(info[i]);}}
	clearInfo(): void {this.info = [];}


    toJSON(): any
    {
        return {
            name: this.name,
			height: this.height,
            type: this.type,
            categories: this.categories,
            info: this.info.map(info => info.toJSON())
        };
    }
}


export class DatasetHeader
{
    name: string;
    height: number;
    parent: DatasetHeader | null;
    children: (DatasetHeader | DatasetField)[];


    private constructor()
    {
        this.name = "";
        this.height = 1;
        this.parent = null;
        this.children = [];
    }


    static createRoot(): DatasetHeader
    {
        const header = new DatasetHeader();
        header.name = "ROOT";
        header.height = 0;

        return header;
    }


    static createAsChildOf(parent: DatasetHeader, name: string, height: number = 1): DatasetHeader
    {
        const header = new DatasetHeader();
        header.name = name;
		header.height = height;
		header.parent = parent;
        parent.addChild(header);

        return header;
    }


    static createFromObject(data: any): DatasetHeader
    {
        const header = new DatasetHeader();
        header.name = data.name;
        header.height = data.height ?? 1;
        header.children = (data.children ?? []).map((child: any) =>{if ("type" in child) return DatasetField.createFromObject(child); else return DatasetHeader.createFromObject(child);});

        for (const child of header.children)
            if (child instanceof DatasetHeader)
                child.parent = header;

        return header;
    }
	
	
    changeHeight(height: number): void {if (height > 0) this.height = height;}
	
	getDepth(): number
	{
		const childHeaders = this.children.filter(child => child instanceof DatasetHeader);
		if (childHeaders.length === 0) return 1;
		return 1 + Math.max(...childHeaders.map(child => child.getDepth()));
	}
	
	
    addChild(child: DatasetHeader | DatasetField): void {this.children.push(child);}
    clearChildren(): void {this.children = [];}
	
	
	getChildFields() : DatasetField []
	{
		const fields: DatasetField[] = [];

		for (const child of this.children)
		{
			if (child instanceof DatasetField)
				fields.push(child);
			else
				fields.push(...child.getChildFields());
		}

		return fields;
	}
	
	
    toJSON(): any
    {
        return {
            name: this.name,
            height: this.height,
            children: this.children.map(child => child.toJSON())
		};
    }
}


export interface DatasetParseOptions
{
	headerDepth: number;
	contentOnly: boolean;
}


export interface DatasetProperties
{
	id: string;
	name: string;
	sourceFileId: string | null;
	sourceKey: string | null;
	parseOptions: DatasetParseOptions;

	headerRoot: DatasetHeader;
	fields: DatasetField[];
	error: string | null;
}


export class Dataset implements DatasetProperties
{
	id: string;
	name: string;
	sourceFileId: string | null;
	sourceKey: string | null;
	parseOptions: DatasetParseOptions;

	headerRoot: DatasetHeader;
	fields: DatasetField[];
	error: string | null;


	private constructor()
	{
		this.id = crypto.randomUUID();
		this.name = "";
		this.sourceFileId = null;
		this.sourceKey = null;

		this.parseOptions =
		{
			headerDepth: 1,
			contentOnly: false
		};

		this.headerRoot = DatasetHeader.createRoot();
		this.fields = [];
		this.error = null;
	}


	static createWith(name: string, sourceFileId: string, headerRoot: DatasetHeader, sourceKey: string | null = null, parseOptions: DatasetParseOptions = {headerDepth: 1, contentOnly: false}): Dataset
	{
		const dataset = new Dataset();

		dataset.name = name;
		dataset.sourceFileId = sourceFileId || null;
		dataset.sourceKey = sourceKey;
		dataset.parseOptions = parseOptions;

		dataset.headerRoot = headerRoot;
		dataset.fields = headerRoot.getChildFields();

		return dataset;
	}


	static createFromObject(data: DatasetResponse): Dataset
	{
		const dataset = new Dataset();

		dataset.id = data.id;
		dataset.name = data.name;
		dataset.sourceFileId = data.sourceFileId ?? null;
		dataset.sourceKey = data.sourceKey ?? null;

		dataset.parseOptions =
		{
			...dataset.parseOptions,
			...(data.parseOptions ?? {})
		};

		dataset.headerRoot = DatasetHeader.createFromObject(data.headerRoot);
		dataset.fields = dataset.headerRoot.getChildFields();
		dataset.error = data.error ?? null;

		return dataset;
	}


	toJSON(): string
	{
		return JSON.stringify(
		{
			id: this.id,
			name: this.name,
			sourceFileId: this.sourceFileId,
			sourceKey: this.sourceKey,
			parseOptions: this.parseOptions,

			headerRoot: this.headerRoot.toJSON(),
			error: this.error
		});
	}
}