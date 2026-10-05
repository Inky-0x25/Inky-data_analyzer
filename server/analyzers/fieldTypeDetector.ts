import { FieldType, FieldTypeValue } from "../../shared/models/Dataset";


export class FieldTypeDetector
{
    static detect(values: string[]): FieldTypeValue
    {
        const types = values.map(value => this.detectValueType(value)).filter(type => type !== FieldType.NULL);
		
        if (types.length === 0)
            return FieldType.NULL;
		
		
        const unique = [...new Set(types)];

        if (unique.length === 1)
            return unique[0];
		
        return FieldType.MIXED;
    }


    static detectValueType(value: string): FieldTypeValue
    {
        const text = value.trim();

        if (!text)
            return FieldType.NULL;
        if (text.toLowerCase() === "true" || text.toLowerCase() === "false")
            return FieldType.BOOLEAN;
        if (Number.isFinite(Number(text)))
            return FieldType.NUMBER;
        if (this.isJSONArray(text))
            return FieldType.ARRAY;
        if (this.isJSONObject(text))
            return FieldType.OBJECT;
        if (this.isDateTime(text))
            return FieldType.DATETIME;
        if (this.isDate(text))
            return FieldType.DATE;
        if (this.isTime(text))
            return FieldType.TIME;

        return FieldType.STRING;
    }


    static isJSONArray(value: string): boolean
    {
        if (!value.startsWith("[") || !value.endsWith("]"))
            return false;

        try {return Array.isArray(JSON.parse(value));}
		catch {return false;}
    }


    static isJSONObject(value: string): boolean
    {
        if (!value.startsWith("{") || !value.endsWith("}"))
            return false;

        try
        {
            const parsed = JSON.parse(value);
            return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
        }
        catch {return false;}
    }


    static isDateTime(value: string): boolean
    {
        if (!value || !value.includes("T"))
            return false;

        const timestamp = Date.parse(value);
        return !Number.isNaN(timestamp);
    }


    static isDate(value: string): boolean
    {
        if (!value)
            return false;

        const timestamp = Date.parse(value);
        return !Number.isNaN(timestamp) && /^\d{4}-\d{2}-\d{2}$/.test(value);
    }


    static isTime(value: string): boolean
    {
        return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(value);
    }
}