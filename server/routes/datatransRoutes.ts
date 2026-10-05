import { Router } from "express";

import { DatatransService } from "../services/DatatransService";
import {
	CreateDatatransRequest,
	UpdateDatatransRequest
} from "../../shared/api/datatrans";


export function createDatatransRouter(
	datatransService: DatatransService
): Router
{
	const router = Router();

	router.get("/project/:projectID", (req, res) =>
	{
		try
		{
			const transformations = datatransService.list(
				req.params.projectID
			);

			res.json(transformations);
		}
		catch (error)
		{
			res.status(500).json({
				error: error instanceof Error
					? error.message
					: String(error)
			});
		}
	});


	router.get("/:id", (req, res) =>
	{
		try
		{
			const transformation = datatransService.get(
				req.params.id
			);

			if (!transformation)
			{
				res.status(404).json({
					error: "Transformation not found"
				});

				return;
			}

			res.json(transformation);
		}
		catch (error)
		{
			res.status(500).json({
				error: error instanceof Error
					? error.message
					: String(error)
			});
		}
	});


	router.get("/:id/content", (req, res) =>
	{
		try
		{
			const content = datatransService.getContent(
				req.params.id
			);

			if (!content)
			{
				res.status(404).json({
					error: "Transformation content not found"
				});

				return;
			}

			res.json({
				headerRoot: content.headerRoot.toJSON(),
				content: content.content
			});
		}
		catch (error)
		{
			res.status(500).json({
				error: error instanceof Error
					? error.message
					: String(error)
			});
		}
	});


	router.post("/", (req, res) =>
	{
		try
		{
			const request = req.body as CreateDatatransRequest;

			const transformation = datatransService.create(
				request
			);

			res.status(201).json(transformation);
		}
		catch (error)
		{
			const message = error instanceof Error
				? error.message
				: String(error);

			const status =
				message.includes("not found")
					? 404
					: message.includes("already exists")
						? 409
						: 400;

			res.status(status).json({
				error: message
			});
		}
	});


	router.patch("/", (req, res) =>
	{
		try
		{
			const request = req.body as UpdateDatatransRequest;

			const transformation = datatransService.update(
				request
			);

			res.json(transformation);
		}
		catch (error)
		{
			const message = error instanceof Error
				? error.message
				: String(error);

			const status =
				message.includes("not found")
					? 404
					: message.includes("already exists")
						? 409
						: 400;

			res.status(status).json({
				error: message
			});
		}
	});


	router.delete("/:id", (req, res) =>
	{
		try
		{
			const transformation = datatransService.get(
				req.params.id
			);

			if (!transformation)
			{
				res.status(404).json({
					error: "Transformation not found"
				});

				return;
			}

			datatransService.delete(req.params.id);

			res.status(204).send();
		}
		catch (error)
		{
			res.status(500).json({
				error: error instanceof Error
					? error.message
					: String(error)
			});
		}
	});

	return router;
}