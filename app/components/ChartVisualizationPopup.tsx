import {
	ReactNode,
	useMemo,
	useRef,
	useState
} from "react";

import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ComposedChart,
	Customized,
	ErrorBar,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	PieSectorShapeProps,
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
	RadialBar,
	RadialBarChart,
	ResponsiveContainer,
	Scatter,
	ScatterChart,
	Sector,
	Tooltip,
	Treemap,
	XAxis,
	YAxis,
	ZAxis
} from "recharts";

import { ChartResponse } from "../../shared/api/chart";

import { DatasetField } from "../../shared/models/Dataset";

import { ChartType } from "../../shared/models/Chart";

import { FormulaEvaluator } from "../../shared/evaluators/formulaEvaluator";

import { t } from "../modules/i18n";


interface ChartVisualizationPopupProperties
{
	chart: ChartResponse | null;
	content: string[][];
	fields: DatasetField[];
	open: boolean;
	onClose: () => void;
}


interface ChartRecord
{
	[key: string]: unknown;
}


type ChartAggregation =
	| "sum"
	| "average"
	| "count"
	| "min"
	| "max";


const chartColors =
{
	background:
		"var(--color-bg)",

	backgroundSubdued:
		"var(--color-bg-subdued)",

	text:
		"var(--color-text)",

	textSubdued:
		"var(--color-text-subdued)",

	highlight:
		"var(--color-text-highlight)"
};

function hashString(value: string): number
{
	let hash = 0;

	for (let index = 0; index < value.length; index++)
	{
		hash =
			(
				(hash << 5) -
				hash +
				value.charCodeAt(index)
			) | 0;
	}

	return Math.abs(hash);
}


function getThemeBackground(): string
{
	const bodyBackground =
		getComputedStyle(
			document.body
		)
			.getPropertyValue(
				"--color-bg"
			)
			.trim();

	if (bodyBackground)
		return bodyBackground;


	return getComputedStyle(
		document.documentElement
	)
		.getPropertyValue(
			"--color-bg"
		)
		.trim();
}


function parseColor(
	value: string
): {r: number; g: number; b: number;} | null
{
	const hex = value.match(
		/^#([0-9a-f]{3}|[0-9a-f]{6})$/i
	);

	if (hex)
	{
		const hexValue = hex[1];

		if (hexValue.length === 3)
		{
			return {
				r: parseInt(
					hexValue[0] + hexValue[0],
					16
				),
				g: parseInt(
					hexValue[1] + hexValue[1],
					16
				),
				b: parseInt(
					hexValue[2] + hexValue[2],
					16
				)
			};
		}

		return {
			r: parseInt(
				hexValue.slice(0, 2),
				16
			),
			g: parseInt(
				hexValue.slice(2, 4),
				16
			),
			b: parseInt(
				hexValue.slice(4, 6),
				16
			)
		};
	}


	const rgb =
		value.match(
			/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/
		);

	if (!rgb)
		return null;


	return {
		r: Number(rgb[1]),
		g: Number(rgb[2]),
		b: Number(rgb[3])
	};
}


function isDarkTheme(): boolean
{
	const color =
		parseColor(
			getThemeBackground()
		);

	if (!color)
		return false;


	const luminance =
		(
			0.2126 * color.r +
			0.7152 * color.g +
			0.0722 * color.b
		) / 255;


	return luminance < 0.5;
}


function getChartPalette(
	chart: ChartResponse,
	count: number = 12
): string[]
{
	const seed =
		hashString(
			chart.name +
			":" +
			chart.type
		);

	const dark =
		isDarkTheme();


	return Array.from(
		{length: count},
		(_, index) =>
		{
			/*
			 * Golden-angle spacing gives well-separated hues.
			 */
			const hue =
				(
					seed +
					index * 137.508
				) % 360;


			const saturation =
				68 +
				(
					(
						seed +
						index * 31
					) % 18
				);


			const lightness =
				dark
					? 64 +
						(
							(
								seed +
								index * 17
							) % 14
						)
					: 34 +
						(
							(
								seed +
								index * 17
							) % 14
						);


			return (
				"hsl(" +
				hue +
				" " +
				saturation +
				"% " +
				lightness +
				"%)"
			);
		}
	);
}


function getChartColor(
	chart: ChartResponse,
	index: number = 0
): string
{
	const palette =
		getChartPalette(chart);

	return palette[
		index % palette.length
	];
}


const chartLegendStyle =
{
	color:
		chartColors.text
};


function sanitizeFilename(
	value: string
): string
{
	return value
		.trim()
		.replace(
			/[<>:"/\\|?*\x00-\x1F]/g,
			"_"
		)
		.replace(
			/\s+/g,
			"_"
		)
		|| "chart";
}


function downloadBlob(
	content: BlobPart,
	filename: string,
	type: string
): void
{
	const blob =
		new Blob(
			[
				content
			],
			{
				type
			}
		);

	const url =
		URL.createObjectURL(
			blob
		);

	const link =
		document.createElement(
			"a"
		);

	link.href =
		url;

	link.download =
		filename;

	document.body.appendChild(
		link
	);

	link.click();

	link.remove();

	setTimeout(
		() =>
		{
			URL.revokeObjectURL(
				url
			);
		},
		0
	);
}


function getChartSvg(
	container: HTMLDivElement | null
): SVGSVGElement
{
	if (!container)
		throw new Error(
			"Chart container not found"
		);

	const svg =
		container.querySelector(
			".recharts-wrapper > svg.recharts-surface"
		);

	if (!(svg instanceof SVGSVGElement))
		throw new Error(
			"Chart SVG not found"
		);

	return svg;
}


function serializeChartSvg(
	svg: SVGSVGElement
): string
{
	const clone =
		svg.cloneNode(
			true
		) as SVGSVGElement;

	const chartContainer =
		svg.closest(
			".chartVisualization"
		) as HTMLElement | null;

	const styleSource =
		chartContainer ?? svg;

	const computedStyle =
		getComputedStyle(
			styleSource
		);

	const themeVariables =
		[
			"--color-bg",
			"--color-bg-subdued",
			"--color-text",
			"--color-text-subdued",
			"--color-text-highlight"
		];

	for (const variable of themeVariables)
	{
		const value =
			computedStyle
				.getPropertyValue(
					variable
				)
				.trim();

		if (value)
		{
			clone.style.setProperty(
				variable,
				value
			);
		}
	}

	const viewBox =
		clone.getAttribute(
			"viewBox"
		);

	let width = 0;
	let height = 0;

	if (viewBox)
	{
		const values =
			viewBox
				.trim()
				.split(
					/[\s,]+/
				)
				.map(
					value =>
						Number(value)
				);

		if (values.length >= 4)
		{
			width =
				values[2];

			height =
				values[3];
		}
	}

	if (
		!Number.isFinite(width) ||
		width <= 0 ||
		!Number.isFinite(height) ||
		height <= 0
	)
	{
		const rect =
			svg.getBoundingClientRect();

		width =
			Math.max(
				1,
				Math.round(
					rect.width
				)
			);

		height =
			Math.max(
				1,
				Math.round(
					rect.height
				)
			);

		clone.setAttribute(
			"width",
			String(width)
		);

		clone.setAttribute(
			"height",
			String(height)
		);
	}

	const background =
		computedStyle
			.getPropertyValue(
				"--color-bg"
			)
			.trim();

	if (background)
	{
		const backgroundRect =
			document.createElementNS(
				"http://www.w3.org/2000/svg",
				"rect"
			);

		backgroundRect.setAttribute(
			"x",
			"0"
		);

		backgroundRect.setAttribute(
			"y",
			"0"
		);

		backgroundRect.setAttribute(
			"width",
			String(width)
		);

		backgroundRect.setAttribute(
			"height",
			String(height)
		);

		backgroundRect.setAttribute(
			"fill",
			background
		);

		clone.insertBefore(
			backgroundRect,
			clone.firstChild
		);
	}

	clone.style.backgroundColor =
		"transparent";

	clone.setAttribute(
		"xmlns",
		"http://www.w3.org/2000/svg"
	);

	clone.setAttribute(
		"xmlns:xlink",
		"http://www.w3.org/1999/xlink"
	);

	return new XMLSerializer()
		.serializeToString(
			clone
		);
}



function downloadChartSvg(
	container: HTMLDivElement | null,
	name: string
): void
{
	const svg =
		getChartSvg(
			container
		);

	const content =
		serializeChartSvg(
			svg
		);

	downloadBlob(
		content,
		sanitizeFilename(name) +
			".svg",
		"image/svg+xml;charset=utf-8"
	);
}


function downloadChartPng(
	container: HTMLDivElement | null,
	name: string
): void
{
	const svg =
		getChartSvg(
			container
		);

	const content =
		serializeChartSvg(
			svg
		);

	const blob =
		new Blob(
			[
				content
			],
			{
				type:
					"image/svg+xml;charset=utf-8"
			}
		);

	const url =
		URL.createObjectURL(
			blob
		);

	const image =
		new Image();

	image.onload = () =>
	{
		try
		{
			const rect =
				svg.getBoundingClientRect();

			const scale =
				2;

			const width =
				Math.max(
					1,
					Math.round(
						rect.width *
						scale
					)
				);

			const height =
				Math.max(
					1,
					Math.round(
						rect.height *
						scale
					)
				);

			const canvas =
				document.createElement(
					"canvas"
				);

			canvas.width =
				width;

			canvas.height =
				height;

			const context =
				canvas.getContext(
					"2d"
				);

			if (!context)
				throw new Error(
					"Failed to create image canvas"
				);

			const computedStyle =
				getComputedStyle(
					container as HTMLDivElement
				);

			context.fillStyle =
				computedStyle.backgroundColor ||
				"transparent";

			context.fillRect(
				0,
				0,
				width,
				height
			);

			context.drawImage(
				image,
				0,
				0,
				width,
				height
			);

			canvas.toBlob(
				pngBlob =>
				{
					if (!pngBlob)
					{
						URL.revokeObjectURL(
							url
						);

						return;
					}

					const pngUrl =
						URL.createObjectURL(
							pngBlob
						);

					const link =
						document.createElement(
							"a"
						);

					link.href =
						pngUrl;

					link.download =
						sanitizeFilename(name) +
						".png";

					document.body.appendChild(
						link
					);

					link.click();

					link.remove();

					setTimeout(
						() =>
						{
							URL.revokeObjectURL(
								pngUrl
							);
						},
						0
					);

					URL.revokeObjectURL(
						url
					);
				},
				"image/png"
			);
		}
		catch
		{
			URL.revokeObjectURL(
				url
			);
		}
	};

	image.onerror = () =>
	{
		URL.revokeObjectURL(
			url
		);
	};

	image.src =
		url;
}


function getCssVariable(
	element: HTMLElement | null,
	variable: string
): string
{
	if (!element)
		return "";

	return getComputedStyle(
		element
	)
		.getPropertyValue(
			variable
		)
		.trim();
}


function escapeHtml(
	value: string
): string
{
	return value
		.replace(
			/&/g,
			"&amp;"
		)
		.replace(
			/</g,
			"&lt;"
		)
		.replace(
			/>/g,
			"&gt;"
		)
		.replace(
			/"/g,
			"&quot;"
		)
		.replace(
			/'/g,
			"&#39;"
		);
}


function downloadChartHtml(
	container: HTMLDivElement | null,
	name: string
): void
{
	const svg =
		getChartSvg(
			container
		);

	const svgContent =
		serializeChartSvg(
			svg
		);

	const documentContent =
		"<!DOCTYPE html>" +
		"<html lang=\"en\">" +
		"<head>" +
			"<meta charset=\"UTF-8\">" +
			"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +

			"<title>" +
				escapeHtml(name) +
			"</title>" +

			"<style>" +
				":root {" +
					"--color-bg: " +
					getCssVariable(
						container,
						"--color-bg"
					) +
					";" +

					"--color-bg-subdued: " +
					getCssVariable(
						container,
						"--color-bg-subdued"
					) +
					";" +

					"--color-text: " +
					getCssVariable(
						container,
						"--color-text"
					) +
					";" +

					"--color-text-subdued: " +
					getCssVariable(
						container,
						"--color-text-subdued"
					) +
					";" +

					"--color-text-highlight: " +
					getCssVariable(
						container,
						"--color-text-highlight"
					) +
					";" +
				"}" +

				"*" +
				"{" +
					"box-sizing:border-box;" +
				"}" +

				"html,body" +
				"{" +
					"margin:0;" +
					"width:100%;" +
					"min-height:100%;" +
				"}" +

				"body" +
				"{" +
					"padding:2rem;" +
					"font-family:sans-serif;" +
					"color:var(--color-text);" +
					"background:var(--color-bg);" +
				"}" +

				"h1" +
				"{" +
					"margin-top:0;" +
					"color:var(--color-text-highlight);" +
				"}" +

				".chart" +
				"{" +
					"width:100%;" +
					"min-height:600px;" +
					"padding:1rem;" +
					"background:var(--color-bg);" +
				"}" +

				".chart svg" +
				"{" +
					"display:block;" +
					"width:100%;" +
					"height:auto;" +
				"}" +
			"</style>" +
		"</head>" +

		"<body>" +
			"<h1>" +
				escapeHtml(name) +
			"</h1>" +

			"<div class=\"chart\">" +
				svgContent +
			"</div>" +
		"</body>" +
		"</html>";

	downloadBlob(
		documentContent,
		sanitizeFilename(name) +
			".html",
		"text/html;charset=utf-8"
	);
}


export function ChartVisualizationPopup({
	chart,
	content,
	fields,
	open,
	onClose
}: ChartVisualizationPopupProperties)
{
	const [
		exportError,
		setExportError
	] =
		useState<string | null>(null);

	const chartVisualizationRef =
		useRef<HTMLDivElement | null>(null);


	const handleChartExport =
		(
			exportFunction: (
				container: HTMLDivElement | null,
				name: string
			) => void
		): void =>
		{
			try
			{
				if (!chart)
					throw new Error(
						"Chart not available"
					);

				setExportError(null);

				exportFunction(
					chartVisualizationRef.current,
					chart.name
				);
			}
			catch (value)
			{
				const message =
					value instanceof Error
						? value.message
						: String(value);

				setExportError(
					message
				);

				console.error(
					message
				);
			}
		};


	const visualization =
		useMemo(
			() =>
			{
				if (!chart)
					return null;

				try
				{
					return renderChart(
						chart,
						content,
						fields
					);
				}
				catch (value)
				{
					return (
						<div className="chartVisualizationError">
							{value instanceof Error
								? value.message
								: String(value)}
						</div>
					);
				}
			},
			[
				chart,
				content,
				fields
			]
		);


	if (!open || !chart)
		return null;


	return (
		<div id="chartVisualizationPopup">
			<div id="chartVisualizationPopupContent">
				<div className="hBox spaceBetweenBox chartVisualizationHeader">
					<h2>
						{chart.name}
					</h2>

					<div className="chartVisualizationActions">
						<button
							type="button"
							onClick={() =>
								handleChartExport(
									downloadChartPng
								)
							}
						>
							PNG
						</button>

						<button
							type="button"
							onClick={() =>
								handleChartExport(
									downloadChartSvg
								)
							}
						>
							SVG
						</button>

						<button
							type="button"
							onClick={() =>
								handleChartExport(
									downloadChartHtml
								)
							}
						>
							HTML
						</button>

						<button
							type="button"
							onClick={onClose}
							aria-label={t("close")}
						>
							×
						</button>
					</div>
				</div>

				{exportError && (
					<div className="chartVisualizationError">
						{exportError}
					</div>
				)}

				<div
					ref={
						chartVisualizationRef
					}
					className="chartVisualization fillBox"
				>
					{visualization}
				</div>
			</div>
		</div>
	);
}


function renderChartTooltip(): ReactNode
{
	return (
		<Tooltip
			wrapperStyle={{
				zIndex:
					100005,
				pointerEvents:
					"none"
			}}

			contentStyle={{
				backgroundColor:
					chartColors.background,

				border:
					"1px solid " +
					chartColors.textSubdued,

				color:
					chartColors.text
			}}

			labelStyle={{
				color:
					chartColors.text
			}}

			itemStyle={{
				color:
					chartColors.text
			}}

			cursor={{
				fill:
					chartColors.backgroundSubdued
			}}
		/>
	);
}


function renderChart(
	chart: ChartResponse,
	content: string[][],
	fields: DatasetField[]
): ReactNode
{
	switch (chart.type)
	{
		case ChartType.VALUE:
			return renderValueChart(
				chart,
				content,
				fields
			);

		case ChartType.BAR:
			return renderBarChart(
				chart,
				content,
				fields
			);

		case ChartType.LINE:
			return renderLineChart(
				chart,
				content,
				fields
			);

		case ChartType.AREA:
			return renderAreaChart(
				chart,
				content,
				fields
			);

		case ChartType.PIE:
			return renderPieChart(
				chart,
				content,
				fields,
				false
			);

		case ChartType.DONUT:
			return renderPieChart(
				chart,
				content,
				fields,
				true
			);

		case ChartType.SCATTER:
			return renderScatterChart(
				chart,
				content,
				fields
			);

		case ChartType.BUBBLE:
			return renderBubbleChart(
				chart,
				content,
				fields
			);

		case ChartType.BOX_PLOT:
			return renderBoxPlot(
				chart,
				content,
				fields
			);

		case ChartType.HEATMAP:
			return renderHeatmap(
				chart,
				content,
				fields
			);

		case ChartType.TREEMAP:
			return renderTreemap(
				chart,
				content,
				fields
			);

		case ChartType.RADAR:
			return renderRadarChart(
				chart,
				content,
				fields
			);

		case ChartType.GAUGE:
			return renderGauge(
				chart,
				content,
				fields
			);
	}

	return null;
}


function evaluateExpression(
	expression: unknown,
	content: string[][],
	fields: DatasetField[],
	row: number
): unknown
{
	if (typeof expression !== "string")
		return null;

	const value =
		expression.trim();

	if (!value)
		return null;

	try
	{
		const result =
			FormulaEvaluator.evaluate(
				content,
				fields,
				row,
				0,
				value
			);

		if (
			result &&
			typeof result === "object" &&
			"type" in result
		)
		{
			const reference =
				result as {
					type: string;
					index?: number;
				};

			if (
				reference.type === "column" &&
				typeof reference.index === "number"
			)
			{
				return (
					content[row]?.[
						reference.index - 1
					] ?? ""
				);
			}
		}

		return result;
	}
	catch (error)
	{
		throw new Error(
			"Failed to evaluate \"" +
			value +
			"\": " +
			(
				error instanceof Error
					? error.message
					: String(error)
			)
		);
	}
}


function scalarValue(
	value: unknown
): unknown
{
	if (
		value === null ||
		value === undefined
	)
		return null;

	if (Array.isArray(value))
	{
		if (value.length === 0)
			return null;

		return scalarValue(
			value[0]
		);
	}

	if (typeof value !== "object")
		return value;

	const object =
		value as Record<string, unknown>;

	if ("value" in object)
	{
		return scalarValue(
			object.value
		);
	}

	if ("values" in object)
	{
		if (Array.isArray(object.values))
		{
			if (object.values.length === 0)
				return null;

			return scalarValue(
				object.values[0]
			);
		}
	}

	return value;
}


function numberValue(
	value: unknown
): number | null
{
	const scalar =
		scalarValue(
			value
		);

	if (typeof scalar === "number")
	{
		return Number.isFinite(scalar)
			? scalar
			: null;
	}

	if (typeof scalar === "string")
	{
		const number =
			Number(
				scalar
			);

		return Number.isFinite(number)
			? number
			: null;
	}

	return null;
}


function stringValue(
	value: unknown
): string
{
	const scalar =
		scalarValue(
			value
		);

	if (
		scalar === null ||
		scalar === undefined
	)
		return "";

	return String(
		scalar
	);
}


function getSetting(
	chart: ChartResponse,
	key: string
): string
{
	const value =
		chart.settings[key];

	if (typeof value !== "string")
		return "";

	return value.trim();
}


function getAggregation(
	chart: ChartResponse
): ChartAggregation
{
	const value =
		chart.settings.aggregation;

	if (
		value === "average" ||
		value === "count" ||
		value === "min" ||
		value === "max"
	)
		return value;

	return "sum";
}


function aggregate(
	values: number[],
	aggregation: ChartAggregation
): number
{
	if (aggregation === "count")
		return values.length;

	if (values.length === 0)
		return 0;

	switch (aggregation)
	{
		case "sum":
			return values.reduce(
				(total, value) =>
					total + value,
				0
			);

		case "average":
			return values.reduce(
				(total, value) =>
					total + value,
				0
			) / values.length;

		case "min":
			return Math.min(
				...values
			);

		case "max":
			return Math.max(
				...values
			);
	}
}


function buildGroupedData(
	content: string[][],
	fields: DatasetField[],
	categoryExpression: unknown,
	valueExpression: unknown,
	aggregation: ChartAggregation
): ChartRecord[]
{
	const groups =
		new Map<
			string,
			number[]
		>();

	for (
		let row = 0;
		row < content.length;
		row++
	)
	{
		const category =
			stringValue(
				evaluateExpression(
					categoryExpression,
					content,
					fields,
					row
				)
			);

		const value =
			numberValue(
				evaluateExpression(
					valueExpression,
					content,
					fields,
					row
				)
			);

		if (
			!category ||
			value === null
		)
			continue;

		const values =
			groups.get(
				category
			) ?? [];

		values.push(
			value
		);

		groups.set(
			category,
			values
		);
	}

	return Array.from(
		groups.entries()
	).map(
		([
			category,
			values
		]) =>
		({
			category,
			value:
				aggregate(
					values,
					aggregation
				)
		})
	);
}


function renderValueChart(
	chart: ChartResponse,
	content: string[][],
	fields: DatasetField[]
): ReactNode
{
	const formula =
		getSetting(
			chart,
			"formula"
		);

	if (!formula)
		throw new Error(
			"Chart formula is empty"
		);

	const value =
		evaluateExpression(
			formula,
			content,
			fields,
			0
		);

	if (
		value === null ||
		value === undefined
	)
	{
		throw new Error(
			"Chart formula returned no value"
		);
	}

	return (
		<div
			className="chartValue"
			style={{
				color:
					chartColors.highlight
			}}
		>
			{stringValue(value)}
		</div>
	);
}


function renderBarChart(
	chart: ChartResponse,
	content: string[][],
	fields: DatasetField[]
): ReactNode
{
	const data =
		buildGroupedData(
			content,
			fields,
			getSetting(
				chart,
				"category"
			),
			getSetting(
				chart,
				"value"
			),
			getAggregation(
				chart
			)
		);

	return (
		<ResponsiveContainer
			width="100%"
			height="100%"
		>
			<BarChart data={data}>
				<CartesianGrid
					stroke={
						chartColors.textSubdued
					}
					strokeDasharray="3 3"
					strokeOpacity={0.25}
				/>

				<XAxis
					dataKey="category"
					tick={{
						fill:
							chartColors.text
					}}
					axisLine={{
						stroke:
							chartColors.textSubdued
					}}
					tickLine={{
						stroke:
							chartColors.textSubdued
					}}
				/>

				<YAxis
					tick={{
						fill:
							chartColors.text
					}}
					axisLine={{
						stroke:
							chartColors.textSubdued
					}}
					tickLine={{
						stroke:
							chartColors.textSubdued
					}}
				/>

				{renderChartTooltip()}

				<Legend
					wrapperStyle={
						chartLegendStyle
					}
				/>

				<Bar
					dataKey="value"
					name={t("value")}
					fill={
						getChartColor(chart)
					}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}


function renderLineChart(
	chart: ChartResponse,
	content: string[][],
	fields: DatasetField[]
): ReactNode
{
	const data =
		buildGroupedData(
			content,
			fields,
			getSetting(
				chart,
				"category"
			),
			getSetting(
				chart,
				"value"
			),
			getAggregation(
				chart
			)
		);

	return (
		<ResponsiveContainer
			width="100%"
			height="100%"
		>
			<LineChart data={data}>
				<CartesianGrid
					stroke={
						chartColors.textSubdued
					}
					strokeDasharray="3 3"
					strokeOpacity={0.25}
				/>

				<XAxis
					dataKey="category"
					tick={{
						fill:
							chartColors.text
					}}
					axisLine={{
						stroke:
							chartColors.textSubdued
					}}
					tickLine={{
						stroke:
							chartColors.textSubdued
					}}
				/>

				<YAxis
					tick={{
						fill:
							chartColors.text
					}}
					axisLine={{
						stroke:
							chartColors.textSubdued
					}}
					tickLine={{
						stroke:
							chartColors.textSubdued
					}}
				/>

				{renderChartTooltip()}

				<Legend
					wrapperStyle={
						chartLegendStyle
					}
				/>

				<Line
					type="monotone"
					dataKey="value"
					name={t("value")}
					stroke={
						chartColors.highlight
					}
					dot={{
						fill:
							chartColors.highlight,
						stroke:
							chartColors.highlight
					}}
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}


function renderAreaChart(
	chart: ChartResponse,
	content: string[][],
	fields: DatasetField[]
): ReactNode
{
	const data =
		buildGroupedData(
			content,
			fields,
			getSetting(
				chart,
				"category"
			),
			getSetting(
				chart,
				"value"
			),
			getAggregation(
				chart
			)
		);

	return (
		<ResponsiveContainer
			width="100%"
			height="100%"
		>
			<AreaChart data={data}>
				<CartesianGrid
					stroke={
						chartColors.textSubdued
					}
					strokeDasharray="3 3"
					strokeOpacity={0.25}
				/>

				<XAxis
					dataKey="category"
					tick={{
						fill:
							chartColors.text
					}}
					axisLine={{
						stroke:
							chartColors.textSubdued
					}}
					tickLine={{
						stroke:
							chartColors.textSubdued
					}}
				/>

				<YAxis
					tick={{
						fill:
							chartColors.text
					}}
					axisLine={{
						stroke:
							chartColors.textSubdued
					}}
					tickLine={{
						stroke:
							chartColors.textSubdued
					}}
				/>

				{renderChartTooltip()}

				<Legend
					wrapperStyle={
						chartLegendStyle
					}
				/>

				<Area
					type="monotone"
					dataKey="value"
					name={t("value")}
					stroke={
						chartColors.highlight
					}
					fill={
						getChartColor(chart)
					}
					fillOpacity={0.25}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}


function renderPieChart(
	chart: ChartResponse,
	content: string[][],
	fields: DatasetField[],
	donut: boolean
): ReactNode
{
	const data =
		buildGroupedData(
			content,
			fields,
			getSetting(
				chart,
				"label"
			),
			getSetting(
				chart,
				"value"
			),
			getAggregation(
				chart
			)
		);

	const palette =
		getChartPalette(
			chart,
			Math.max(
				data.length,
				1
			)
		);

	const pieData =
		data.map(
			(item, index) =>
			({
				name:
					item.category,

				value:
					item.value,

				fill:
					palette[
						index %
						palette.length
					]
			})
		);


	const renderPieShape = (
		props: PieSectorShapeProps
	): ReactNode =>
	{
		return (
			<Sector
				{...props}
				fill={
					palette[
						(props.index ?? 0) %
						palette.length
					]
				}
			/>
		);
	};


	return (
		<ResponsiveContainer
			width="100%"
			height="100%"
		>
			<PieChart>
				{renderChartTooltip()}

				<Legend
					wrapperStyle={
						chartLegendStyle
					}
				/>

				<Pie
					data={pieData}
					dataKey="value"
					nameKey="name"
					cx="50%"
					cy="50%"
					innerRadius={
						donut
							? "55%"
							: 0
					}
					outerRadius="75%"
					shape={
						renderPieShape
					}
					label={{
						fill:
							chartColors.text
					}}
				/>
			</PieChart>
		</ResponsiveContainer>
	);
}


function renderScatterChart(
	chart: ChartResponse,
	content: string[][],
	fields: DatasetField[]
): ReactNode
{
	const data: ChartRecord[] = [];

	for (
		let row = 0;
		row < content.length;
		row++
	)
	{
		const x =
			numberValue(
				evaluateExpression(
					getSetting(
						chart,
						"x"
					),
					content,
					fields,
					row
				)
			);

		const y =
			numberValue(
				evaluateExpression(
					getSetting(
						chart,
						"y"
					),
					content,
					fields,
					row
				)
			);

		if (
			x === null ||
			y === null
		)
			continue;

		data.push({
			x,
			y
		});
	}

	return (
		<ResponsiveContainer
			width="100%"
			height="100%"
		>
			<ScatterChart>
				<CartesianGrid
					stroke={
						chartColors.textSubdued
					}
					strokeOpacity={0.25}
				/>

				<XAxis
					type="number"
					dataKey="x"
					name={t("xAxis")}
					tick={{
						fill:
							chartColors.text
					}}
					axisLine={{
						stroke:
							chartColors.textSubdued
					}}
					tickLine={{
						stroke:
							chartColors.textSubdued
					}}
				/>

				<YAxis
					type="number"
					dataKey="y"
					name={t("yAxis")}
					tick={{
						fill:
							chartColors.text
					}}
					axisLine={{
						stroke:
							chartColors.textSubdued
					}}
					tickLine={{
						stroke:
							chartColors.textSubdued
					}}
				/>

				{renderChartTooltip()}

				<Scatter
					name={t("scatter")}
					data={data}
					fill={
						getChartColor(chart)
					}
				/>
			</ScatterChart>
		</ResponsiveContainer>
	);
}


function renderBubbleChart(
	chart: ChartResponse,
	content: string[][],
	fields: DatasetField[]
): ReactNode
{
	const data: ChartRecord[] = [];

	for (
		let row = 0;
		row < content.length;
		row++
	)
	{
		const x =
			numberValue(
				evaluateExpression(
					getSetting(
						chart,
						"x"
					),
					content,
					fields,
					row
				)
			);

		const y =
			numberValue(
				evaluateExpression(
					getSetting(
						chart,
						"y"
					),
					content,
					fields,
					row
				)
			);

		const size =
			numberValue(
				evaluateExpression(
					getSetting(
						chart,
						"size"
					),
					content,
					fields,
					row
				)
			);

		if (
			x === null ||
			y === null ||
			size === null
		)
			continue;

		data.push({
			x,
			y,
			size:
				Math.max(
					0,
					size
				)
		});
	}

	return (
		<ResponsiveContainer
			width="100%"
			height="100%"
		>
			<ScatterChart>
				<CartesianGrid
					stroke={
						chartColors.textSubdued
					}
					strokeOpacity={0.25}
				/>

				<XAxis
					type="number"
					dataKey="x"
					name={t("xAxis")}
					tick={{
						fill:
							chartColors.text
					}}
					axisLine={{
						stroke:
							chartColors.textSubdued
					}}
					tickLine={{
						stroke:
							chartColors.textSubdued
					}}
				/>

				<YAxis
					type="number"
					dataKey="y"
					name={t("yAxis")}
					tick={{
						fill:
							chartColors.text
					}}
					axisLine={{
						stroke:
							chartColors.textSubdued
					}}
					tickLine={{
						stroke:
							chartColors.textSubdued
					}}
				/>

				<ZAxis
					type="number"
					dataKey="size"
					range={[
						50,
						500
					]}
				/>

				{renderChartTooltip()}

				<Scatter
					name={t("bubble")}
					data={data}
					fill={
						getChartColor(chart)
					}
				/>
			</ScatterChart>
		</ResponsiveContainer>
	);
}


function renderBoxPlot(
	chart: ChartResponse,
	content: string[][],
	fields: DatasetField[]
): ReactNode
{
	const groups =
		new Map<
			string,
			number[]
		>();


	for (
		let row = 0;
		row < content.length;
		row++
	)
	{
		const category =
			stringValue(
				evaluateExpression(
					getSetting(
						chart,
						"category"
					),
					content,
					fields,
					row
				)
			);


		const value =
			numberValue(
				evaluateExpression(
					getSetting(
						chart,
						"value"
					),
					content,
					fields,
					row
				)
			);


		if (
			!category ||
			value === null
		)
			continue;


		const values =
			groups.get(
				category
			) ?? [];


		values.push(
			value
		);


		groups.set(
			category,
			values
		);
	}


	const data =
		Array.from(
			groups.entries()
		).map(
			([
				category,
				values
			]) =>
			{
				const sorted =
					[
						...values
					].sort(
						(a, b) =>
							a - b
					);


				const median =
					getMedian(
						sorted
					);


				const lowerHalf =
					sorted.slice(
						0,
						Math.floor(
							sorted.length / 2
						)
					);


				const upperHalf =
					sorted.slice(
						Math.ceil(
							sorted.length / 2
						)
					);


				const q1 =
					getMedian(
						lowerHalf
					);


				const q3 =
					getMedian(
						upperHalf
					);


				const low =
					sorted[0];


				const high =
					sorted[
						sorted.length - 1
					];


				return {
					category,
					base: q1,
					box:
						q3 - q1,
					median,
					error: [
						median - low,
						high - median
					]
				};
			}
		);


	const color =
		getChartColor(
			chart
		);


	return (
		<ResponsiveContainer
			width="100%"
			height="100%"
		>
			<ComposedChart
				data={data}
			>
				<CartesianGrid
					stroke={
						chartColors.textSubdued
					}
					strokeDasharray="3 3"
					strokeOpacity={0.25}
				/>

				<XAxis
					dataKey="category"
					tick={{
						fill:
							chartColors.text
					}}
					axisLine={{
						stroke:
							chartColors.textSubdued
					}}
					tickLine={{
						stroke:
							chartColors.textSubdued
					}}
				/>

				<YAxis
					tick={{
						fill:
							chartColors.text
					}}
					axisLine={{
						stroke:
							chartColors.textSubdued
					}}
					tickLine={{
						stroke:
							chartColors.textSubdued
					}}
				/>

				{renderChartTooltip()}

				<Bar
					dataKey="base"
					stackId="box"
					fill="transparent"
				/>

				<Bar
					dataKey="box"
					stackId="box"
					name={t("value")}
					fill={color}
				>
					<ErrorBar
						dataKey="error"
						direction="y"
						stroke={color}
					/>
				</Bar>

				<Line
					type="monotone"
					dataKey="median"
					name={t("value")}
					stroke={
						chartColors.text
					}
					dot={{
						fill:
							chartColors.text,
						stroke:
							chartColors.text
					}}
				/>
			</ComposedChart>
		</ResponsiveContainer>
	);
}


function getHeatmapColor(value: number, min: number, max: number): string {
	if (min >= max) return 'rgb(0, 255, 0)';

	const ratio = (value - min) / (max - min);
	const r = ratio < 0.5 ? Math.round(255 * (ratio * 2)) : 255;
	const g = ratio > 0.5 ? Math.round(255 * ((1 - ratio) * 2)) : 255;

	return `rgb(${r}, ${g}, 0)`;
}

const CustomizedContent = (props: any) => {
	const { x, y, width, height, cellValue, cellColor, stroke } = props;
	if (cellValue === undefined) return null;

	return (
		<g>
			<rect
				x={x}
				y={y}
				width={width}
				height={height}
				fill={cellColor}
				stroke={stroke}
			/>
			{width > 20 && height > 15 && (
				<text
					x={x + width / 2}
					y={y + height / 2}
					textAnchor="middle"
					dominantBaseline="central"
					fill="#000000"
					fontSize={12}
					pointerEvents="none"
				>
					{cellValue}
				</text>
			)}
		</g>
	);
};

function renderHeatmap(
	chart: ChartResponse,
	content: string[][],
	fields: DatasetField[]
): ReactNode {
	const groups = new Map<string, number[]>();

	for (let row = 0; row < content.length; row++) {
		const x = stringValue(evaluateExpression(getSetting(chart, 'x'), content, fields, row));
		const y = stringValue(evaluateExpression(getSetting(chart, 'y'), content, fields, row));
		const value = numberValue(evaluateExpression(getSetting(chart, 'value'), content, fields, row));

		if (!x || !y || value === null) continue;

		const key = x + '\u0000' + y;
		const values = groups.get(key) ?? [];

		values.push(value);
		groups.set(key, values);
	}

	const groupedData = Array.from(groups.entries()).map(([key, values]) => {
		const separator = key.indexOf('\u0000');
		return {
			x: key.slice(0, separator),
			y: key.slice(separator + 1),
			value: aggregate(values, 'average'),
		};
	});

	const minVal = groupedData.length > 0 ? Math.min(...groupedData.map((d) => d.value)) : 0;
	const maxVal = groupedData.length > 0 ? Math.max(...groupedData.map((d) => d.value)) : 0;

	const xGroups = new Map<
		string,
		Array<{
			name: string;
			size: number;
			x: string;
			y: string;
			cellValue: number;
			cellColor: string;
		}>
	>();

	for (const item of groupedData) {
		const children = xGroups.get(item.x) ?? [];

		children.push({
			name: item.y,
			size: 1,
			x: item.x,
			y: item.y,
			cellValue: item.value,
			cellColor: getHeatmapColor(item.value, minVal, maxVal),
		});

		xGroups.set(item.x, children);
	}

	const data = Array.from(xGroups.entries()).map(([x, children]) => ({
		name: x,
		children,
	}));

	return (
		<ResponsiveContainer width="100%" height="100%">
			<Treemap
				data={data}
				dataKey="size"
				nameKey="name"
				stroke={chartColors.background}
				animationDuration={300}
				content={(props) => (
					<CustomizedContent
						{...props}
						stroke={chartColors.background}
					/>
				)}
			/>
		</ResponsiveContainer>
	);
}


function renderTreemap(
	chart: ChartResponse,
	content: string[][],
	fields: DatasetField[]
): ReactNode
{
	const data =
		buildGroupedData(
			content,
			fields,
			getSetting(
				chart,
				"label"
			),
			getSetting(
				chart,
				"value"
			),
			getAggregation(
				chart
			)
		).map(
			item =>
			({
				name:
					item.category,
				size:
					item.value
			})
		);


	const palette =
		getChartPalette(
			chart,
			Math.max(
				data.length,
				1
			)
		);


	return (
		<ResponsiveContainer
			width="100%"
			height="100%"
		>
			<Treemap
				data={data}
				dataKey="size"
				nameKey="name"
				colorPanel={palette}
			/>
		</ResponsiveContainer>
	);
}


function renderRadarChart(
	chart: ChartResponse,
	content: string[][],
	fields: DatasetField[]
): ReactNode
{
	const data =
		buildGroupedData(
			content,
			fields,
			getSetting(
				chart,
				"category"
			),
			getSetting(
				chart,
				"value"
			),
			getAggregation(
				chart
			)
		);

	return (
		<ResponsiveContainer
			width="100%"
			height="100%"
		>
			<RadarChart data={data}>
				<PolarGrid
					stroke={
						chartColors.textSubdued
					}
					strokeOpacity={0.25}
				/>

				<PolarAngleAxis
					dataKey="category"
					tick={{
						fill:
							chartColors.text
					}}
				/>

				<PolarRadiusAxis
					tick={{
						fill:
							chartColors.text
					}}
					axisLine={{
						stroke:
							chartColors.textSubdued
					}}
				/>

				{renderChartTooltip()}

				<Legend
					wrapperStyle={
						chartLegendStyle
					}
				/>

				<Radar
					name={t("value")}
					dataKey="value"
					fill={getChartColor(chart)}
					stroke={getChartColor(chart)}
					fillOpacity={0.6}
				/>
			</RadarChart>
		</ResponsiveContainer>
	);
}


function renderGauge(
	chart: ChartResponse,
	content: string[][],
	fields: DatasetField[]
): ReactNode {
	const value = numberValue(evaluateExpression(getSetting(chart, 'value'), content, fields, 0));

	if (value === null) {
		throw new Error('Gauge value is not numeric');
	}

	const min = typeof chart.settings.min === 'number' ? chart.settings.min : 0;
	const max = typeof chart.settings.max === 'number' ? chart.settings.max : 100;

	if (max <= min) {
		throw new Error('Gauge maximum must be greater than minimum');
	}

	const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

	const data = [
		{ name: t('value'), value: percentage },
		{ name: 'empty', value: 100 - percentage },
	];

	return (
		<div className="chartGauge vBox fillBox">
			<ResponsiveContainer className="vBox fillBox" width="100%" height="100%" aspect={2}>
				<PieChart>
					<Pie
						data={data}
						cx="50%"
						cy="70%"
						startAngle={180}
						endAngle={0}
						innerRadius="60%"
						outerRadius="80%"
						dataKey="value"
						stroke="none"
					>
						<Cell key="cell-0" fill={getChartColor(chart)} />
						<Cell key="cell-1" fill={chartColors.backgroundSubdued} />
					</Pie>
				</PieChart>
			</ResponsiveContainer>
			<div
				className="chartGaugeValue"
				style={{ color: chartColors.highlight }}
			>
				<center><h1>{stringValue(value)}</h1></center>
			</div>
		</div>
	);
}


function getMedian(
	values: number[]
): number
{
	if (values.length === 0)
		return 0;

	const middle =
		Math.floor(
			values.length / 2
		);

	if (values.length % 2 !== 0)
		return values[middle];

	return (
		values[middle - 1] +
		values[middle]
	) / 2;
}