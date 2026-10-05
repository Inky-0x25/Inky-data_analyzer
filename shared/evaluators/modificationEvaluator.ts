import { DatasetField } from "../../shared/models/Dataset";

import {
	ConditionEvaluator
} from "./conditionEvaluator";
import {
	FormulaEvaluator
} from "./formulaEvaluator";


interface ConditionalModification
{
	condition: string;
	modification: string;
}


export class ModificationEvaluator
{
	static isValidModification(
		modification: string
	): boolean
	{
		try
		{
			const {
				operator,
				formula
			} = splitAssignment(
				modification
			);


			if (
				operator !== null &&
				!isAssignmentOperator(operator)
			)
				return false;


			return FormulaEvaluator.isValid(
				formula
			);
		}
		catch
		{
			return false;
		}
	}


	static evaluate(
		content: string[][],
		fields: DatasetField[],
		modification: string,
		condition?: string
	): string[][]
	{
		return this.evaluateModification(
			content,
			fields,
			modification,
			condition
		);
	}


	static evaluateModification(
		content: string[][],
		fields: DatasetField[],
		modification: string,
		condition?: string
	): string[][]
	{
		if (!this.isValidModification(modification))
			throw new Error(
				"Invalid modification formula"
			);


		let conditionValues: boolean[][] | null = null;


		if (
			condition !== undefined &&
			condition.trim() !== ""
		)
		{
			conditionValues =
				ConditionEvaluator.evaluate(
					content,
					fields,
					condition
				);


			const markerRow =
				conditionValues.length - 1;

			const markerColumn =
				conditionValues[0].length - 1;


			if (
				!conditionValues[markerRow][markerColumn]
			)
				return content;
		}


		const {
			operator,
			formula
		} = splitAssignment(
			modification
		);


		const result = content.map(
			row => [...row]
		);


		const rowCount = result.length;

		const columnCount = Math.max(
			fields.length,
			...result.map(row => row.length),
			0
		);


		const markerRow =
			conditionValues
				? conditionValues.length - 1
				: -1;

		const markerColumn =
			conditionValues
				? conditionValues[0].length - 1
				: -1;


		for (
			let row = 0;
			row < rowCount;
			row++
		)
		{
			if (
				conditionValues &&
				!conditionValues[row][markerColumn]
			)
				continue;


			for (
				let column = 0;
				column < columnCount;
				column++
			)
			{
				if (
					conditionValues &&
					!conditionValues[markerRow][column]
				)
					continue;


				if (
					conditionValues &&
					!conditionValues[row][column]
				)
					continue;


				const currentValue =
					result[row][column] ?? "";


				const value =
					FormulaEvaluator.evaluate(
						result,
						fields,
						row,
						column,
						formula
					);


				result[row][column] =
					applyAssignment(
						operator,
						currentValue,
						value
					);
			}
		}


		return result;
	}


	static evaluateConditionalModifications(
		content: string[][],
		fields: DatasetField[],
		modifications: ConditionalModification[]
	): string[][]
	{
		let result = content;


		for (const modification of modifications)
		{
			result = this.evaluateModification(
				result,
				fields,
				modification.modification,
				modification.condition
			);
		}


		return result;
	}
}


function splitAssignment(
	modification: string
): {
	operator: string | null;
	formula: string;
}
{
	const value = modification.trim();


	const operators =
	[
		"<<=",
		">>=",
		"+=",
		"-=",
		"*=",
		"/=",
		"%=",
		"&=",
		"|=",
		"^=",
		"="
	];


	for (const operator of operators)
	{
		if (!value.startsWith(operator))
			continue;


		return {
			operator,
			formula: value.slice(
				operator.length
			).trim()
		};
	}


	return {
		operator: null,
		formula: value
	};
}


function isAssignmentOperator(
	operator: string
): boolean
{
	return [
		"=",
		"+=",
		"-=",
		"*=",
		"/=",
		"%=",
		"<<=",
		">>=",
		"&=",
		"|=",
		"^="
	].includes(operator);
}


function applyAssignment(
	operator: string | null,
	currentValue: string,
	value: unknown
): string
{
	switch (operator)
	{
		case null:
			return toCellString(value);

		case "=":
			return toCellString(value);

		case "+=":
			return toCellString(
				toNumber(currentValue) +
				toNumber(value)
			);

		case "-=":
			return toCellString(
				toNumber(currentValue) -
				toNumber(value)
			);

		case "*=":
			return toCellString(
				toNumber(currentValue) *
				toNumber(value)
			);

		case "/=":
		{
			const divisor = toNumber(value);

			if (divisor === 0)
				throw new Error(
					"Division by zero"
				);

			return toCellString(
				toNumber(currentValue) /
				divisor
			);
		}

		case "%=":
		{
			const divisor = toNumber(value);

			if (divisor === 0)
				throw new Error(
					"Division by zero"
				);

			return toCellString(
				toNumber(currentValue) %
				divisor
			);
		}

		case "<<=":
			return toCellString(
				Math.trunc(
					toNumber(currentValue)
				) <<
				Math.trunc(
					toNumber(value)
				)
			);

		case ">>=":
			return toCellString(
				Math.trunc(
					toNumber(currentValue)
				) >>
				Math.trunc(
					toNumber(value)
				)
			);

		case "&=":
			return toCellString(
				Math.trunc(
					toNumber(currentValue)
				) &
				Math.trunc(
					toNumber(value)
				)
			);

		case "|=":
			return toCellString(
				Math.trunc(
					toNumber(currentValue)
				) |
				Math.trunc(
					toNumber(value)
				)
			);

		case "^=":
			return toCellString(
				Math.trunc(
					toNumber(currentValue)
				) ^
				Math.trunc(
					toNumber(value)
				)
			);

		default:
			throw new Error(
				`Invalid assignment operator: ${operator}`
			);
	}
}


function toNumber(
	value: unknown
): number
{
	if (typeof value === "number")
		return value;

	if (typeof value === "boolean")
		return value ? 1 : 0;

	if (typeof value === "string")
	{
		const number = Number(value);

		if (Number.isFinite(number))
			return number;
	}


	throw new Error(
		`Cannot cast value to number: ${String(value)}`
	);
}


function toCellString(
	value: unknown
): string
{
	if (value === null || value === undefined)
		return "";

	if (typeof value === "string")
		return value;

	if (typeof value === "boolean")
		return value ? "true" : "false";

	if (value instanceof Date)
		return value.toISOString();

	return String(value);
}