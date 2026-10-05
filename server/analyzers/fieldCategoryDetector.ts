import { FieldCategoryProperties, FieldType, DatasetField } from "../../shared/models/Dataset";


export class FieldCategoryDetector
{
	static detect(field: DatasetField, path: string[], categories: FieldCategoryProperties[]): string[]
	{
		const text = path.join(" ");
		return categories.filter(category => this.matches(category, field, text)).map(category => category.name);
	}


	static matches(category: FieldCategoryProperties, field: DatasetField, text: string): boolean
	{
		if (category.validValueTypes.length && !category.validValueTypes.includes(field.type))
			return false;

		return category.expressions.some(expression =>
		{
			try {return new RegExp(expression, "i").test(text);}
			catch {return false;}
		});
	}
}