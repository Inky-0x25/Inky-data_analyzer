import { Router } from "express";

import {
	DatafileParseRequest,
	UpdateDatafileContentRequest,
	UpdateDatafileRequest
} from "../../shared/api/datafile";

import { DatafileService } from "../services/DatafileService";


export function createDatafileRoutes(datafileService: DatafileService): Router
{
	const router = Router();


	router.get("/project/:projectID", (request, response) =>
	{
		const datafiles = datafileService.list(
			request.params.projectID
		);

		response.json(datafiles);
	});


	router.get("/:id/content", (request, response) =>
	{
		const content = datafileService.getContent(
			request.params.id
		);

		if (content === null)
		{
			response.status(404).json({
				error: "Datafile content not found"
			});

			return;
		}

		response.writeHead(
			200,
			{
				"Content-Type": "application/octet-stream"
			}
		);

		response.end(content);
	});


	router.post("/", (request, response) =>
	{
		try
		{
			if (!request.body.projectID || !request.body.name || request.body.content === undefined)
			{
				response.status(400).json({
					error: "Project ID, file name and content are required"
				});

				return;
			}


			const content = Buffer.from(
				request.body.content,
				"base64"
			);


			const datafile = datafileService.create(
				{
					projectID: request.body.projectID,
					name: request.body.name,
					content: request.body.content
				},
				content
			);

			response.status(201).json(datafile);
		}
		catch (error)
		{
			const message = error instanceof Error
				? error.message
				: "Failed to create datafile";

			const status = message.toLowerCase().includes("duplicate")
				? 409
				: 400;

			response.status(status).json({
				error: message
			});
		}
	});


	router.put("/content", async (request, response) =>
	{
		try
		{
			const body = request.body as UpdateDatafileContentRequest;

			if (!body.id || !body.name || body.content === undefined || !Array.isArray(body.datasets))
			{
				response.status(400).json({
					error: "Datafile ID, replacement file name, content and dataset parse options are required"
				});

				return;
			}


			const content = Buffer.from(
				body.content,
				"base64"
			);


			const datafile = await datafileService.replaceContent(
				body.id,
				body.name,
				content,
				{
					id: body.id,
					datasets: body.datasets
				}
			);


			if (!datafile)
			{
				response.status(404).json({
					error: "Datafile not found"
				});

				return;
			}


			response.json(datafile);
		}
		catch (error)
		{
			const message = error instanceof Error
				? error.message
				: "Failed to replace datafile content";

			const status = message.toLowerCase().includes("identical content")
				? 409
				: 400;

			response.status(status).json({
				error: message
			});
		}
	});


	router.post("/reparse", async (request, response) =>
	{
		try
		{
			const body = request.body as DatafileParseRequest;

			if (!body.id || !Array.isArray(body.datasets))
			{
				response.status(400).json({
					error: "Datafile ID and dataset parse options are required"
				});

				return;
			}


			const datafile = await datafileService.reparse(
				body.id,
				body
			);


			if (!datafile)
			{
				response.status(404).json({
					error: "Datafile not found"
				});

				return;
			}


			response.json(datafile);
		}
		catch (error)
		{
			response.status(400).json({
				error: error instanceof Error
					? error.message
					: "Failed to reparse datafile"
			});
		}
	});


	router.patch("/", (request, response) =>
	{
		try
		{
			const body = request.body as UpdateDatafileRequest;

			if (!body.id)
			{
				response.status(400).json({
					error: "Datafile ID is required"
				});

				return;
			}


			const datafile = datafileService.update(
				body.id,
				body
			);


			if (!datafile)
			{
				response.status(404).json({
					error: "Datafile not found"
				});

				return;
			}


			response.json(datafile);
		}
		catch (error)
		{
			response.status(400).json({
				error: error instanceof Error
					? error.message
					: "Failed to update datafile"
			});
		}
	});


	router.delete("/:id", (request, response) =>
	{
		const deleted = datafileService.delete(
			request.params.id
		);


		if (!deleted)
		{
			response.status(404).json({
				error: "Datafile not found"
			});

			return;
		}


		response.status(204).send();
	});


	return router;
}