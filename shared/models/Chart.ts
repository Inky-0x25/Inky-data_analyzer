export const ChartType =
{
	VALUE: "value",
	
	BAR: "bar",
	LINE: "line",
	AREA: "area",
	PIE: "pie",
	DONUT: "donut",

	SCATTER: "scatter",
	BUBBLE: "bubble",

	BOX_PLOT: "box_plot",
	HEATMAP: "heatmap",
	TREEMAP: "treemap",

	RADAR: "radar",
	GAUGE: "gauge"
} as const;

export type ChartTypeValue = typeof ChartType[keyof typeof ChartType];
export function isValidChartType(value: string): value is ChartTypeValue {return Object.values(ChartType).includes(value as ChartTypeValue);}


export interface ChartProperties
{
	id: string;
	name: string;
	sourceID: string | null;

	type: ChartTypeValue;
	settings: Record<string, unknown>;
	error: string | null;
}


export class Chart implements ChartProperties
{
	id: string;
	name: string;
	sourceID: string | null;

	type: ChartTypeValue;
	settings: Record<string, unknown>;
	error: string | null;


	private constructor()
	{
		this.id = crypto.randomUUID();
		this.name = "New_chart";
		this.sourceID = null;

		this.type = ChartType.BAR;
		this.settings = {};
		this.error = null;
	}


	static create(name: string, type: ChartTypeValue, sourceID: string | null = null): Chart
	{
		const chart = new Chart();
	
		chart.name = name;
		chart.type = type;
		chart.sourceID = sourceID;
		return chart;
	}


	static createFromObject(data: unknown): Chart
	{
		if (!data || typeof data !== "object")
			throw new Error("Invalid chart data");

		const value = data as Record<string, unknown>;
		const chart = new Chart();

		chart.id = typeof value.id === "string" ? value.id : crypto.randomUUID();
		chart.name = typeof value.name === "string" ? value.name : "New_chart";
		chart.sourceID =typeof value.sourceID === "string" ? value.sourceID : null;

		if (typeof value.type !== "string" || !isValidChartType(value.type))
			throw new Error("Invalid chart type");

		chart.type = value.type;
		chart.settings = value.settings && typeof value.settings === "object" && !Array.isArray(value.settings) ? value.settings as Record<string, unknown> : {};
		chart.error = typeof value.error === "string" ? value.error : null;

		return chart;
	}


	toJSON()
	{
		return {
			id: this.id,
			name: this.name,
			sourceID: this.sourceID,

			type: this.type,
			settings: this.settings,
			error: this.error
		};
	}
}