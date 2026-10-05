import { DatasetField } from "../../shared/models/Dataset";

import { FormulaEvaluator } from "./formulaEvaluator";


export class ConditionEvaluator
{
	static isValidCondition(
		condition: string,
		content: string[][] = [],
		fields: DatasetField[] = [],
		row = 0,
		column = 0
	): boolean
	{
		try
		{
			FormulaEvaluator.evaluate(
				content,
				fields,
				row,
				column,
				condition
			);

			return true;
		}
		catch
		{
			return false;
		}
	}


	static evaluate(
		content: string[][],
		fields: DatasetField[],
		condition: string
	): boolean[][]
	{
		return this.evaluateCondition(
			content,
			fields,
			condition
		);
	}


	static evaluateCondition(
		content: string[][],
		fields: DatasetField[],
		condition: string
	): boolean[][]
	{
		if (!condition.trim())
			throw new Error(
				"Condition formula cannot be empty"
			);


		const rowCount =
			content.length;

		const columnCount =
			Math.max(
				fields.length,
				...content.map(
					row => row.length
				),
				0
			);


		const result =
			Array.from(
				{length: rowCount + 1},
				() =>
					Array<boolean>(
						columnCount + 1
					).fill(false)
			);


		for (
			let row = 0;
			row < rowCount;
			row++
		)
		{
			for (
				let column = 0;
				column < columnCount;
				column++
			)
			{
				result[row][column] =
					Boolean(
						FormulaEvaluator.evaluate(
							content,
							fields,
							row,
							column,
							condition
						)
					);
			}
		}


		const markerRow =
			rowCount;

		const markerColumn =
			columnCount;


		for (
			let row = 0;
			row < rowCount;
			row++
		)
		{
			result[row][markerColumn] =
				result[row]
					.slice(
						0,
						columnCount
					)
					.some(Boolean);
		}


		for (
			let column = 0;
			column < columnCount;
			column++
		)
		{
			result[markerRow][column] =
				result
					.slice(
						0,
						rowCount
					)
					.some(
						row =>
							row[column]
					);
		}


		result[markerRow][markerColumn] =
			result
				.slice(
					0,
					rowCount
				)
				.some(
					row =>
						row
							.slice(
								0,
								columnCount
							)
							.some(Boolean)
				);


		return result;
	}
}