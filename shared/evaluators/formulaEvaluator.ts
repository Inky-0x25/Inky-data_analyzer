import { DatasetField } from "../../shared/models/Dataset";


export interface FormulaEvaluationContext
{
	content: string[][];
	fields: DatasetField[];
	row: number;
	column: number;
}


interface ColumnReference
{
	type: "column";
	index: number;
}


interface RowReference
{
	type: "row";
	index: number;
}


interface CellReference
{
	type: "cell";
	row: number;
	column: number;
}


interface RangeValue
{
	type: "range";
	values: unknown[];
}


export type FormulaValue =
	| string
	| number
	| boolean
	| Date
	| null
	| undefined
	| ColumnReference
	| RowReference
	| CellReference
	| RangeValue;


interface Token
{
	type:
		| "number"
		| "string"
		| "identifier"
		| "operator"
		| "lparen"
		| "rparen"
		| "comma"
		| "colon";

	value: string;
}


class FormulaParser
{
	private readonly tokens: Token[];
	private index = 0;

	constructor(private readonly context: FormulaEvaluationContext) {this.tokens = [];}


	parse(formula: string): FormulaValue
	{
		this.tokens.push(...tokenize(formula));

		const result = this.parseLogicalOr();

		if (this.index < this.tokens.length)
			throw new Error(
				`Unexpected token: ${this.tokens[this.index].value}`
			);

		return result;
	}


	private parseLogicalOr(): FormulaValue
	{
		let value =
			this.parseLogicalAnd();

		while (this.matchOperator("||"))
		{
			const right =
				this.parseLogicalAnd();

			value =
				toBoolean(value) ||
				toBoolean(right);
		}

		return value;
	}


	private parseLogicalAnd(): FormulaValue
	{
		let value =
			this.parseBitwiseOr();

		while (this.matchOperator("&&"))
		{
			const right =
				this.parseBitwiseOr();

			value =
				toBoolean(value) &&
				toBoolean(right);
		}

		return value;
	}


	private parseBitwiseOr(): FormulaValue
	{
		let value =
			this.parseBitwiseXor();

		while (this.matchOperator("|"))
		{
			const right =
				this.parseBitwiseXor();

			value =
				toInteger(value) |
				toInteger(right);
		}

		return value;
	}


	private parseBitwiseXor(): FormulaValue
	{
		let value =
			this.parseBitwiseAnd();

		while (this.matchOperator("^"))
		{
			const right =
				this.parseBitwiseAnd();

			value =
				toInteger(value) ^
				toInteger(right);
		}

		return value;
	}


	private parseBitwiseAnd(): FormulaValue
	{
		let value =
			this.parseEquality();

		while (this.matchOperator("&"))
		{
			const right =
				this.parseEquality();

			value =
				toInteger(value) &
				toInteger(right);
		}

		return value;
	}


	private parseEquality(): FormulaValue
	{
		let value =
			this.parseRelational();

		while (true)
		{
			if (this.matchOperator("=="))
			{
				const right =
					this.parseRelational();

				value =
					compareEquals(
						value,
						right
					);

				continue;
			}

			if (this.matchOperator("!="))
			{
				const right =
					this.parseRelational();

				value =
					!compareEquals(
						value,
						right
					);

				continue;
			}

			break;
		}

		return value;
	}


	private parseRelational(): FormulaValue
	{
		let value =
			this.parseShift();

		while (true)
		{
			if (this.matchOperator("<"))
			{
				const right =
					this.parseShift();

				value =
					compareValues(
						value,
						right
					) < 0;

				continue;
			}

			if (this.matchOperator("<="))
			{
				const right =
					this.parseShift();

				value =
					compareValues(
						value,
						right
					) <= 0;

				continue;
			}

			if (this.matchOperator(">"))
			{
				const right =
					this.parseShift();

				value =
					compareValues(
						value,
						right
					) > 0;

				continue;
			}

			if (this.matchOperator(">="))
			{
				const right =
					this.parseShift();

				value =
					compareValues(
						value,
						right
					) >= 0;

				continue;
			}

			break;
		}

		return value;
	}


	private parseShift(): FormulaValue
	{
		let value =
			this.parseAdditive();

		while (true)
		{
			if (this.matchOperator("<<"))
			{
				const right =
					this.parseAdditive();

				value =
					toInteger(value) <<
					toInteger(right);

				continue;
			}

			if (this.matchOperator(">>"))
			{
				const right =
					this.parseAdditive();

				value =
					toInteger(value) >>
					toInteger(right);

				continue;
			}

			break;
		}

		return value;
	}


	private parseAdditive(): FormulaValue
	{
		let value =
			this.parseMultiplicative();

		while (true)
		{
			if (this.matchOperator("+"))
			{
				const right =
					this.parseMultiplicative();

				value =
					addValues(
						value,
						right
					);

				continue;
			}

			if (this.matchOperator("-"))
			{
				const right =
					this.parseMultiplicative();

				value =
					toNumber(value) -
					toNumber(right);

				continue;
			}

			break;
		}

		return value;
	}


	private parseMultiplicative(): FormulaValue
	{
		let value =
			this.parseUnary();

		while (true)
		{
			if (this.matchOperator("*"))
			{
				const right =
					this.parseUnary();

				value =
					toNumber(value) *
					toNumber(right);

				continue;
			}

			if (this.matchOperator("/"))
			{
				const right =
					this.parseUnary();

				const divisor =
					toNumber(right);

				if (divisor === 0)
					throw new Error(
						"Division by zero"
					);

				value =
					toNumber(value) /
					divisor;

				continue;
			}

			if (this.matchOperator("%"))
			{
				const right =
					this.parseUnary();

				const divisor =
					toNumber(right);

				if (divisor === 0)
					throw new Error(
						"Division by zero"
					);

				value =
					toNumber(value) %
					divisor;

				continue;
			}

			break;
		}

		return value;
	}


	private parseUnary(): FormulaValue
	{
		if (this.matchOperator("!"))
			return !toBoolean(
				this.parseUnary()
			);

		if (this.matchOperator("~"))
			return ~toInteger(
				this.parseUnary()
			);

		if (this.matchOperator("+"))
			return toNumber(
				this.parseUnary()
			);

		if (this.matchOperator("-"))
			return -toNumber(
				this.parseUnary()
			);

		return this.parsePrimary();
	}


	private parsePrimary(): FormulaValue
	{
		const token =
			this.peek();

		if (!token)
			throw new Error(
				"Unexpected end of formula"
			);


		if (token.type === "number")
		{
			this.index++;

			return Number(
				token.value
			);
		}


		if (token.type === "string")
		{
			this.index++;

			return token.value;
		}


		if (token.type === "lparen")
		{
			this.index++;

			const value =
				this.parseLogicalOr();

			this.expectType(
				"rparen"
			);

			return value;
		}


		if (token.type === "identifier")
		{
			this.index++;

			const identifier =
				token.value;

			if (this.matchType("lparen"))
				return this.parseFunction(
					identifier
				);


			if (
				identifier.toLowerCase() ===
				"true"
			)
				return true;

			if (
				identifier.toLowerCase() ===
				"false"
			)
				return false;

			if (
				identifier.toLowerCase() ===
				"null"
			)
				return null;


			const reference =
				parseReference(
					identifier,
					false,
					this.context
				);


			if (reference)
			{
				if (reference.type === "cell")
					return this.getCellValue(
						reference.row,
						reference.column
					);

				return reference;
			}


			throw new Error(
				`Unknown identifier: ${identifier}`
			);
		}


		throw new Error(
			`Unexpected token: ${token.value}`
		);
	}


	private parseFunction(
		name: string
	): FormulaValue
	{
		const argumentsList: FormulaValue[] = [];


		if (!this.matchType("rparen"))
		{
			while (true)
			{
				argumentsList.push(
					this.parseFunctionArgument()
				);

				if (this.matchType("rparen"))
					break;

				this.expectType(
					"comma"
				);
			}
		}


		switch (name.toUpperCase())
		{
			case "SUM":
				return sum(
					argumentsList
				);

			case "AVERAGE":
				return average(
					argumentsList
				);

			case "COUNT":
				return count(
					argumentsList
				);

			case "MAX":
				return max(
					argumentsList
				);

			case "MIN":
				return min(
					argumentsList
				);

			case "STRING":
				this.requireArgumentCount(
					name,
					argumentsList,
					1
				);

				return toStringValue(
					argumentsList[0]
				);

			case "NUMBER":
				this.requireArgumentCount(
					name,
					argumentsList,
					1
				);

				return toNumber(
					argumentsList[0]
				);

			case "BOOLEAN":
				this.requireArgumentCount(
					name,
					argumentsList,
					1
				);

				return toBoolean(
					argumentsList[0]
				);

			case "DATE":
				this.requireArgumentCount(
					name,
					argumentsList,
					1
				);

				return toDate(
					argumentsList[0]
				);

			case "TIME":
				this.requireArgumentCount(
					name,
					argumentsList,
					1
				);

				return toTime(
					argumentsList[0]
				);

			case "DATETIME":
				this.requireArgumentCount(
					name,
					argumentsList,
					1
				);

				return toDatetime(
					argumentsList[0]
				);

			default:
				throw new Error(
					`Unknown function: ${name}`
				);
		}
	}


	private parseFunctionArgument(): FormulaValue
	{
		const token =
			this.peek();

		if (
			token?.type === "identifier" ||
			token?.type === "number"
		)
		{
			const next =
				this.tokens[
					this.index + 1
				];

			if (next?.type === "colon")
			{
				const startToken =
					token;

				this.index += 2;

				const endToken =
					this.peek();

				if (
					!endToken ||
					(
						endToken.type !== "identifier" &&
						endToken.type !== "number"
					)
				)
					throw new Error(
						"Invalid range"
					);

				this.index++;

				return this.getRange(
					startToken.value,
					endToken.value
				);
			}
		}

		return this.parseLogicalOr();
	}


	private getRange(
		startValue: string,
		endValue: string
	): RangeValue
	{
		const start =
			parseReference(
				startValue,
				true,
				this.context
			);

		const end =
			parseReference(
				endValue,
				true,
				this.context
			);

		if (!start || !end)
			throw new Error(
				"Invalid range"
			);


		const values: unknown[] = [];


		if (
			start.type === "column" &&
			end.type === "column"
		)
		{
			const startColumn =
				Math.min(
					start.index,
					end.index
				);

			const endColumn =
				Math.max(
					start.index,
					end.index
				);


			for (
				let row = 1;
				row <= getRowCount(
					this.context
				);
				row++
			)
			{
				for (
					let column = startColumn;
					column <= endColumn;
					column++
				)
				{
					values.push(
						this.getCellValue(
							row,
							column
						)
					);
				}
			}


			return {
				type: "range",
				values
			};
		}


		if (
			start.type === "row" &&
			end.type === "row"
		)
		{
			const startRow =
				Math.min(
					start.index,
					end.index
				);

			const endRow =
				Math.max(
					start.index,
					end.index
				);


			for (
				let row = startRow;
				row <= endRow;
				row++
			)
			{
				for (
					let column = 1;
					column <= getColumnCount(
						this.context
					);
					column++
				)
				{
					values.push(
						this.getCellValue(
							row,
							column
						)
					);
				}
			}


			return {
				type: "range",
				values
			};
		}


		if (
			start.type === "cell" &&
			end.type === "cell"
		)
		{
			const startRow =
				Math.min(
					start.row,
					end.row
				);

			const endRow =
				Math.max(
					start.row,
					end.row
				);

			const startColumn =
				Math.min(
					start.column,
					end.column
				);

			const endColumn =
				Math.max(
					start.column,
					end.column
				);


			for (
				let row = startRow;
				row <= endRow;
				row++
			)
			{
				for (
					let column = startColumn;
					column <= endColumn;
					column++
				)
				{
					values.push(
						this.getCellValue(
							row,
							column
						)
					);
				}
			}


			return {
				type: "range",
				values
			};
		}


		throw new Error(
			"Invalid range"
		);
	}


	private getCellValue(
		row: number,
		column: number
	): string
	{
		if (row < 1 || column < 1)
			return "";

		return (
			this.context.content[row - 1]?.[
				column - 1
			] ?? ""
		);
	}


	private matchOperator(
		operator: string
	): boolean
	{
		const token =
			this.peek();

		if (
			token?.type !== "operator" ||
			token.value !== operator
		)
			return false;

		this.index++;

		return true;
	}


	private matchType(
		type: Token["type"]
	): boolean
	{
		const token =
			this.peek();

		if (
			!token ||
			token.type !== type
		)
			return false;

		this.index++;

		return true;
	}


	private expectType(
		type: Token["type"]
	): void
	{
		if (!this.matchType(type))
			throw new Error(
				`Expected ${type}`
			);
	}


	private peek(): Token | undefined
	{
		return this.tokens[
			this.index
		];
	}


	private requireArgumentCount(
		name: string,
		argumentsList: FormulaValue[],
		count: number
	): void
	{
		if (
			argumentsList.length !== count
		)
			throw new Error(
				`${name} expects ${count} argument(s)`
			);
	}
}


export class FormulaEvaluator
{
	static isValid(
		formula: string
	): boolean
	{
		try
		{
			const value =
				normalizeFormula(
					formula
				);

			if (!value)
				return false;

			new FormulaParser(
				{
					content: [],
					fields: [],
					row: 0,
					column: 0
				}
			).parse(value);

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
		row: number,
		column: number,
		formula: string
	): FormulaValue
	{
		const value =
			normalizeFormula(
				formula
			);

		if (!value)
			throw new Error(
				"Formula cannot be empty"
			);


		return new FormulaParser(
			{
				content,
				fields,
				row,
				column
			}
		).parse(value);
	}
}


function normalizeFormula(
	formula: string
): string
{
	let value =
		formula.trim();

	if (value.startsWith("="))
		value =
			value.slice(1).trim();

	return value;
}


function tokenize(
	formula: string
): Token[]
{
	const tokens: Token[] = [];
	let index = 0;


	while (index < formula.length)
	{
		const character =
			formula[index];


		if (/\s/.test(character))
		{
			index++;
			continue;
		}


		if (character === "(")
		{
			tokens.push(
				{
					type: "lparen",
					value: character
				}
			);

			index++;
			continue;
		}


		if (character === ")")
		{
			tokens.push(
				{
					type: "rparen",
					value: character
				}
			);

			index++;
			continue;
		}


		if (character === ",")
		{
			tokens.push(
				{
					type: "comma",
					value: character
				}
			);

			index++;
			continue;
		}


		if (character === ":")
		{
			tokens.push(
				{
					type: "colon",
					value: character
				}
			);

			index++;
			continue;
		}


		if (
			character === "\"" ||
			character === "'"
		)
		{
			const quote =
				character;

			let value = "";

			index++;


			while (index < formula.length)
			{
				const current =
					formula[index];


				if (current === "\\")
				{
					const next =
						formula[index + 1];

					if (next === undefined)
						throw new Error(
							"Invalid string escape"
						);

					value += next;
					index += 2;
					continue;
				}


				if (current === quote)
					break;


				value += current;
				index++;
			}


			if (formula[index] !== quote)
				throw new Error(
					"Unterminated string"
				);


			index++;


			tokens.push(
				{
					type: "string",
					value
				}
			);

			continue;
		}


		const numberMatch =
			formula
				.slice(index)
				.match(
					/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/
				);


		if (numberMatch)
		{
			tokens.push(
				{
					type: "number",
					value:
						numberMatch[0]
				}
			);

			index +=
				numberMatch[0].length;

			continue;
		}


		const identifierMatch =
			formula
				.slice(index)
				.match(
					/^(?:\$COLUMN\$ROW|\$COLUMN[1-9][0-9]*|\$ROW|\$COLUMN|[A-Z]{1,3}\$ROW|[A-Z]{1,3}[1-9][0-9]*|\$?[A-Za-z_][A-Za-z0-9_]*)/
				);


		if (identifierMatch)
		{
			tokens.push(
				{
					type: "identifier",
					value:
						identifierMatch[0]
							.toUpperCase()
				}
			);

			index +=
				identifierMatch[0].length;

			continue;
		}


		const operatorMatch =
			formula
				.slice(index)
				.match(
					/^(?:<<=|>>=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|&&|\|\||==|!=|<=|>=|<<|>>|[+\-*/%<>&|^!~])/
				);


		if (operatorMatch)
		{
			tokens.push(
				{
					type: "operator",
					value:
						operatorMatch[0]
				}
			);

			index +=
				operatorMatch[0].length;

			continue;
		}


		throw new Error(
			`Invalid character: ${character}`
		);
	}


	return tokens;
}


function parseReference(
	value: string,
	allowRangeEndpoint = false,
	context?: FormulaEvaluationContext
): CellReference | ColumnReference | RowReference | null
{
	if (context)
	{
		const mixedRowMatch =
			value.match(
				/^([A-Z]{1,3})\$ROW$/
			);


		if (mixedRowMatch)
		{
			return {
				type: "cell",
				row:
					context.row + 1,
				column:
					columnToIndex(
						mixedRowMatch[1]
					)
			};
		}


		const mixedColumnRowMatch =
			value.match(
				/^\$COLUMN\$ROW$/
			);


		if (mixedColumnRowMatch)
		{
			return {
				type: "cell",
				row:
					context.row + 1,
				column:
					context.column + 1
			};
		}


		const mixedColumnMatch =
			value.match(
				/^\$COLUMN([1-9][0-9]*)$/
			);


		if (mixedColumnMatch)
		{
			return {
				type: "cell",
				row:
					Number(
						mixedColumnMatch[1]
					),
				column:
					context.column + 1
			};
		}


		if (value === "$ROW")
		{
			return {
				type: "row",
				index:
					context.row + 1
			};
		}


		if (value === "$COLUMN")
		{
			return {
				type: "column",
				index:
					context.column + 1
			};
		}
	}


	const cellMatch =
		value.match(
			/^([A-Z]{1,3})([1-9][0-9]*)$/
		);


	if (cellMatch)
	{
		return {
			type: "cell",
			row:
				Number(
					cellMatch[2]
				),
			column:
				columnToIndex(
					cellMatch[1]
				)
		};
	}


	if (/^[A-Z]{1,3}$/.test(value))
	{
		return {
			type: "column",
			index:
				columnToIndex(value)
		};
	}


	if (
		allowRangeEndpoint &&
		/^[1-9][0-9]*$/.test(value)
	)
	{
		return {
			type: "row",
			index:
				Number(value)
		};
	}


	return null;
}


function columnToIndex(
	value: string
): number
{
	let result = 0;


	for (const character of value)
	{
		result =
			result * 26 +
			character.charCodeAt(0) -
			64;
	}


	return result;
}


function indexToColumn(
	index: number
): string
{
	if (index < 1)
		throw new Error(
			"Invalid column index"
		);


	let value = "";
	let current = index;


	while (current > 0)
	{
		const remainder =
			(current - 1) % 26;

		value =
			String.fromCharCode(
				65 + remainder
			) +
			value;

		current =
			Math.floor(
				(current - 1) / 26
			);
	}


	return value;
}


function getRowCount(
	context: FormulaEvaluationContext
): number
{
	return context.content.length;
}


function getColumnCount(
	context: FormulaEvaluationContext
): number
{
	return Math.max(
		context.fields.length,
		...context.content.map(
			row => row.length
		),
		0
	);
}


function flatten(
	values: FormulaValue[]
): unknown[]
{
	const result: unknown[] = [];


	for (const value of values)
	{
		if (
			value &&
			typeof value === "object" &&
			"type" in value &&
			(value as RangeValue).type ===
				"range"
		)
		{
			result.push(
				...(value as RangeValue).values
			);

			continue;
		}


		result.push(value);
	}


	return result;
}


function sum(
	values: FormulaValue[]
): number
{
	const flattened =
		flatten(values);

	return flattened.reduce<number>(
		(total, value) =>
			total +
			Number(
				toNumber(value)
			),
		0
	);
}


function average(
	values: FormulaValue[]
): number
{
	const numbers =
		flatten(values)
			.map(toNumber);


	if (numbers.length === 0)
		throw new Error(
			"AVERAGE requires at least one value"
		);


	return numbers.reduce(
		(total, value) =>
			total + value,
		0
	) / numbers.length;
}


function count(
	values: FormulaValue[]
): number
{
	return flatten(values)
		.filter(
			value =>
				toNumberOrNull(value) !== null
		)
		.length;
}


function max(
	values: FormulaValue[]
): number
{
	const numbers =
		flatten(values)
			.map(toNumber);


	if (numbers.length === 0)
		throw new Error(
			"MAX requires at least one value"
		);


	return Math.max(
		...numbers
	);
}


function min(
	values: FormulaValue[]
): number
{
	const numbers =
		flatten(values)
			.map(toNumber);


	if (numbers.length === 0)
		throw new Error(
			"MIN requires at least one value"
		);


	return Math.min(
		...numbers
	);
}


function addValues(
	left: FormulaValue,
	right: FormulaValue
): FormulaValue
{
	if (
		isColumnReference(left) &&
		isNumeric(right)
	)
	{
		return {
			type: "column",
			index:
				left.index +
				toNumber(right)
		};
	}


	if (
		isColumnReference(right) &&
		isNumeric(left)
	)
	{
		return {
			type: "column",
			index:
				right.index +
				toNumber(left)
		};
	}


	if (
		isRowReference(left) &&
		isNumeric(right)
	)
	{
		return {
			type: "row",
			index:
				left.index +
				toNumber(right)
		};
	}


	if (
		isRowReference(right) &&
		isNumeric(left)
	)
	{
		return {
			type: "row",
			index:
				right.index +
				toNumber(left)
		};
	}


	if (
		typeof left === "string" ||
		typeof right === "string"
	)
	{
		return (
			toStringValue(left) +
			toStringValue(right)
		);
	}


	return (
		toNumber(left) +
		toNumber(right)
	);
}


function compareEquals(
	left: FormulaValue,
	right: FormulaValue
): boolean
{
	if (
		left instanceof Date ||
		right instanceof Date
	)
		return (
			compareValues(
				left,
				right
			) === 0
		);


	const leftNumber =
		toNumberOrNull(left);

	const rightNumber =
		toNumberOrNull(right);


	if (
		leftNumber !== null &&
		rightNumber !== null
	)
		return leftNumber === rightNumber;


	return (
		toStringValue(left) ===
		toStringValue(right)
	);
}


function compareValues(
	left: FormulaValue,
	right: FormulaValue
): number
{
	if (
		left instanceof Date ||
		right instanceof Date
	)
	{
		const leftTime =
			toDatetime(left).getTime();

		const rightTime =
			toDatetime(right).getTime();

		return leftTime - rightTime;
	}


	const leftNumber =
		toNumberOrNull(left);

	const rightNumber =
		toNumberOrNull(right);


	if (
		leftNumber !== null &&
		rightNumber !== null
	)
		return leftNumber - rightNumber;


	return toStringValue(left)
		.localeCompare(
			toStringValue(right)
		);
}


function toNumber(
	value: unknown
): number
{
	const result =
		toNumberOrNull(value);


	if (result === null)
		throw new Error(
			`Cannot cast value to number: ${String(value)}`
		);


	return result;
}


function toNumberOrNull(
	value: unknown
): number | null
{
	if (
		typeof value === "number" &&
		Number.isFinite(value)
	)
		return value;


	if (typeof value === "boolean")
		return value
			? 1
			: 0;


	if (value instanceof Date)
		return value.getTime();


	if (isColumnReference(value))
		return value.index;


	if (isRowReference(value))
		return value.index;


	if (typeof value !== "string")
		return null;


	if (value.trim() === "")
		return null;


	const number =
		Number(value);


	return Number.isFinite(number)
		? number
		: null;
}


function toInteger(
	value: FormulaValue
): number
{
	return Math.trunc(
		toNumber(value)
	);
}


function toBoolean(
	value: unknown
): boolean
{
	if (
		value === null ||
		value === undefined
	)
		return false;


	if (typeof value === "boolean")
		return value;


	if (typeof value === "number")
		return value !== 0;


	if (typeof value === "string")
		return value.length > 0;


	if (value instanceof Date)
		return !Number.isNaN(
		value.getTime()
	);


	if (isColumnReference(value))
		return value.index > 0;


	if (isRowReference(value))
		return value.index > 0;


	if (isRangeValue(value))
		return value.values.length > 0;


	return Boolean(value);
}


function toStringValue(
	value: unknown
): string
{
	if (
		value === null ||
		value === undefined
	)
		return "";


	if (typeof value === "string")
		return value;


	if (typeof value === "boolean")
		return value
			? "true"
			: "false";


	if (value instanceof Date)
		return value.toISOString();


	if (isColumnReference(value))
		return indexToColumn(
			value.index
		);


	if (isRowReference(value))
		return String(
			value.index
		);


	if (isCellReference(value))
	{
		return (
			indexToColumn(
				value.column
			) +
			String(
				value.row
			)
		);
	}


	if (isRangeValue(value))
	{
		return value.values
			.map(toStringValue)
			.join(",");
	}


	return String(value);
}


function toDate(
	value: FormulaValue
): Date
{
	const string =
		toStringValue(value);


	const match =
		string.match(
			/^(\d{4})-(\d{1,2})-(\d{1,2})$/
		);


	if (match)
	{
		const date =
			new Date(
				Date.UTC(
					Number(match[1]),
					Number(match[2]) - 1,
					Number(match[3])
				)
			);


		if (!Number.isNaN(
			date.getTime()
		))
			return date;
	}


	const date =
		new Date(string);


	if (Number.isNaN(
		date.getTime()
	))
		throw new Error(
			`Cannot cast value to date: ${string}`
		);


	return date;
}


function toTime(
	value: FormulaValue
): number
{
	const string =
		toStringValue(value);


	const match =
		string.match(
			/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
		);


	if (!match)
		throw new Error(
			`Cannot cast value to time: ${string}`
		);


	const hours =
		Number(match[1]);

	const minutes =
		Number(match[2]);

	const seconds =
		Number(
			match[3] ?? "0"
		);


	if (
		hours > 23 ||
		minutes > 59 ||
		seconds > 59
	)
		throw new Error(
			`Invalid time value: ${string}`
		);


	return (
		((hours * 60) + minutes) * 60 +
		seconds
	) * 1000;
}


function toDatetime(
	value: FormulaValue
): Date
{
	if (value instanceof Date)
		return value;

	return toDate(value);
}


function isNumeric(
	value: FormulaValue
): boolean
{
	return (
		toNumberOrNull(value) !== null
	);
}


function isColumnReference(
	value: unknown
): value is ColumnReference
{
	return Boolean(
		value &&
		typeof value === "object" &&
		(value as ColumnReference).type ===
			"column" &&
		typeof (
			value as ColumnReference
		).index === "number"
	);
}


function isRowReference(
	value: unknown
): value is RowReference
{
	return Boolean(
		value &&
		typeof value === "object" &&
		(value as RowReference).type ===
			"row" &&
		typeof (
			value as RowReference
		).index === "number"
	);
}

function isCellReference(
	value: unknown
): value is CellReference
{
	return Boolean(
		value &&
		typeof value === "object" &&
		(value as CellReference).type ===
			"cell" &&
		typeof (
			value as CellReference
		).row === "number" &&
		typeof (
			value as CellReference
		).column === "number"
	);
}


function isRangeValue(
	value: unknown
): value is RangeValue
{
	return Boolean(
		value &&
		typeof value === "object" &&
		(value as RangeValue).type ===
			"range" &&
		Array.isArray(
			(value as RangeValue).values
		)
	);
}