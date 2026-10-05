import { Router } from "express";

import {
	CreateChartRequest,
	UpdateChartRequest
} from "../../shared/api/chart";

import { ChartService } from "../services/ChartService";


export function createChartRouter(
	chartService: ChartService
): Router
{
	const router =
		Router();


	router.get(
		"/project/:projectID",
		(req, res) =>
		{
			try
			{
				const charts =
					chartService.list(
						req.params.projectID
					);

				res.json(
					charts
				);
			}
			catch (error)
			{
				res.status(500).json(
					{
						error:
							error instanceof Error
								? error.message
								: String(error)
					}
				);
			}
		}
	);


	router.get(
		"/:id",
		(req, res) =>
		{
			try
			{
				const chart =
					chartService.get(
						req.params.id
					);

				if (!chart)
				{
					res.status(404).json(
						{
							error:
								"Chart not found"
						}
					);

					return;
				}

				res.json(
					chart
				);
			}
			catch (error)
			{
				res.status(500).json(
					{
						error:
							error instanceof Error
								? error.message
								: String(error)
					}
				);
			}
		}
	);


	router.post(
		"/",
		(req, res) =>
		{
			try
			{
				const request =
					req.body as CreateChartRequest;

				const chart =
					chartService.create(
						request
					);

				res.status(201).json(
					chart
				);
			}
			catch (error)
			{
				const message =
					error instanceof Error
						? error.message
						: String(error);

				if (
					message ===
					"Project not found" ||
					message ===
					"Chart source not found"
				)
				{
					res.status(404).json(
						{
							error: message
						}
					);

					return;
				}

				res.status(400).json(
					{
						error: message
					}
				);
			}
		}
	);


	router.patch(
		"/",
		(req, res) =>
		{
			try
			{
				const request =
					req.body as UpdateChartRequest;

				const chart =
					chartService.update(
						request
					);

				res.json(
					chart
				);
			}
			catch (error)
			{
				const message =
					error instanceof Error
						? error.message
						: String(error);

				if (
					message ===
					"Chart not found" ||
					message ===
					"Chart source not found"
				)
				{
					res.status(404).json(
						{
							error: message
						}
					);

					return;
				}

				res.status(400).json(
					{
						error: message
					}
				);
			}
		}
	);


	router.delete(
		"/:id",
		(req, res) =>
		{
			try
			{
				const chart =
					chartService.get(
						req.params.id
					);

				if (!chart)
				{
					res.status(404).json(
						{
							error:
								"Chart not found"
						}
					);

					return;
				}

				chartService.delete(
					req.params.id
				);

				res.status(204).send();
			}
			catch (error)
			{
				res.status(500).json(
					{
						error:
							error instanceof Error
								? error.message
								: String(error)
					}
				);
			}
		}
	);


	return router;
}