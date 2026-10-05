import { Router } from "express";

import { UpdateDatasetRequest } from "../../shared/api/dataset";

import { DatasetService } from "../services/DatasetService";


export function createDatasetRoutes(datasetService: DatasetService): Router
{
	const router = Router();


	router.get("/project/:projectID", (request, response) =>
	{
		const datasets = datasetService.list(
			request.params.projectID
		);

		response.json(datasets);
	});


	router.get("/:id", (request, response) =>
	{
		const dataset = datasetService.get(
			request.params.id
		);

		if (!dataset)
		{
			response.status(404).json({
				error: "Dataset not found"
			});

			return;
		}

		response.json(dataset);
	});


	router.get("/:id/content", (request, response) =>
	{
		const cells = datasetService.getContent(
			request.params.id
		);

		if (cells === null)
		{
			response.status(404).json({
				error: "Dataset content not found"
			});

			return;
		}

		response.json(cells);
	});


	router.patch("/", (request, response) =>
	{
		try
		{
			const body = request.body as UpdateDatasetRequest;

			if (!body.id)
			{
				response.status(400).json({
					error: "Dataset ID is required"
				});

				return;
			}


			const dataset = datasetService.update(body);


			if (!dataset)
			{
				response.status(404).json({
					error: "Dataset not found"
				});

				return;
			}


			response.json(dataset);
		}
		catch (error)
		{
			response.status(400).json({
				error: error instanceof Error
					? error.message
					: "Failed to update dataset"
			});
		}
	});


	router.delete("/:id", (request, response) =>
	{
		const deleted = datasetService.delete(
			request.params.id
		);

		if (!deleted)
		{
			response.status(404).json({
				error: "Dataset not found"
			});

			return;
		}

		response.status(204).send();
	});


	return router;
}