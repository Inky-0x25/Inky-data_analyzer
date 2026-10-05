import { Router } from "express";

import { ProjectService } from "../services/ProjectService";


export function createProjectRoutes(projectService: ProjectService): Router
{
	const router = Router();


	router.get("/", (request, response) =>
	{
		const projects = projectService.list();
		response.json(projects);
	});


	router.get("/:id", (request, response) =>
	{
		const project = projectService.get(request.params.id);

		if (project)
			response.json(project);
		else
			response.status(404).json({error: "Project not found"});
	});


	router.post("/", (request, response) =>
	{
		try
		{
			const project = projectService.create(request.body);
			response.status(201).json(project);
		}
		catch (error)
		{
			response.status(400).json({error: error instanceof Error ? error.message : "Failed to create project"});
		}
	});


	router.patch("/", (request, response) =>
	{
		try
		{
			const project = projectService.update(request.body);

			if (project)
				response.json(project);
			else
				response.status(404).json({error: "Project not found"});
		}
		catch (error)
		{
			response.status(400).json({error: error instanceof Error ? error.message : "Failed to update project"});
		}
	});


	router.delete("/:id", (request, response) =>
	{
		const deleted = projectService.delete(request.params.id);

		if (deleted)
			response.status(204).send();
		else
			response.status(404).json({error: "Project not found"});
	});


	return router;
}