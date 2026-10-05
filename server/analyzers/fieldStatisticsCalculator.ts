import { Dataset, DatasetField, FieldType, FieldInfo } from "../../shared/models/Dataset";


export class FieldStatisticsCalculator
{
    static calculate(field: DatasetField, values: string[]): FieldInfo[]
    {
        const validValues = values.filter(value => value !== null && value !== undefined && value !== "");
		let info: FieldInfo[] = [];

        info.push(FieldInfo.create("example", this.findExample(values)));
        info.push(FieldInfo.create("nullCount", String(values.length - validValues.length)));
        info.push(FieldInfo.create("uniqueCount", String(new Set(validValues).size)));

        if (validValues.length)
		{
			switch (field.type)
			{
				case FieldType.NUMBER:
				{
					const numbers = validValues.map(Number).filter(Number.isFinite).sort((a, b) => a - b);

					if (numbers.length)
					{
						info.push(FieldInfo.create("min", String(numbers[0])));
						info.push(FieldInfo.create("max", String(numbers[numbers.length - 1])));
						info.push(FieldInfo.create("mean", String(numbers.reduce((sum, value) => sum + value, 0) / numbers.length)));

						const middle = Math.floor(numbers.length / 2);
						info.push(FieldInfo.create("median", String(numbers.length % 2 ? numbers[middle] : (numbers[middle - 1] + numbers[middle]) / 2)));

						const counts = new Map<number, number>();
						let maxCount = 0;

						for (const value of numbers)
						{
							const count = (counts.get(value) ?? 0) + 1;
							counts.set(value, count);

							if (count > maxCount)
								maxCount = count;
						}
					}
					break;
				}

				case FieldType.STRING:
				{
					const sorted = [...validValues].sort((a, b) => a.localeCompare(b));
					info.push(FieldInfo.create("Lexicographically smallest", sorted[0]));
					info.push(FieldInfo.create("Lexicographically largest", sorted[sorted.length - 1]));
					break;
				}

				case FieldType.DATE:
				case FieldType.DATETIME:
				{
					const sorted = [...validValues].sort((a, b) => Date.parse(a) - Date.parse(b));
					info.push(FieldInfo.create("Earliest", sorted[0]));
					info.push(FieldInfo.create("Latest", sorted[sorted.length - 1]));
					break;
				}

				case FieldType.TIME:
				{
					const sorted = [...validValues].sort((a, b) => this.timeToSeconds(a) - this.timeToSeconds(b));
					info.push(FieldInfo.create("Earliest", sorted[0]));
					info.push(FieldInfo.create("Latest", sorted[sorted.length - 1]));
					break;
				}
			}
		}
		return info;
    }


    static timeToSeconds(value: string): number
    {
        const parts = value.split(":");
        return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2] ?? 0);
    }


    static findExample(values: string[]): string
    {
        return values.find(value => value !== null && value !== undefined && value !== "") ?? "";
    }
}