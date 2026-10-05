import express from "express";
import cors from "cors";

import { DatabaseStorage } from "./storage/database";
import { ProjectService } from "./services/ProjectService";
import { DatafileService } from "./services/DatafileService";
import { DatasetService } from "./services/DatasetService";
import { DatatransService } from "./services/DatatransService";
import { ChartService } from "./services/ChartService";

import { createProjectRoutes } from "./routes/projectRoutes";
import { createDatafileRoutes } from "./routes/datafileRoutes";
import { createDatasetRoutes } from "./routes/datasetRoutes";
import { createDatatransRouter } from "./routes/datatransRoutes";
import { createChartRouter } from "./routes/chartRoutes";


const PORT = 3000;


const app = express();

const databaseStorage = new DatabaseStorage();
const database = databaseStorage.getDatabase();

const projectService = new ProjectService(database);
const datatransService = new DatatransService(database);
const datasetService = new DatasetService(database, datatransService);
const datafileService = new DatafileService(database, datasetService, projectService);
const chartService = new ChartService(database);


app.use(express.json({limit: "100mb"}));
app.use(cors());

app.use("/api/projects", createProjectRoutes(projectService));
app.use("/api/datafiles", createDatafileRoutes(datafileService));
app.use("/api/datasets", createDatasetRoutes(datasetService));
app.use("/api/transformations", createDatatransRouter(datatransService));
app.use("/api/charts", createChartRouter(chartService));


app.listen(PORT, "localhost", () =>
{
	console.log(`Inky Data Analyzer backend running at:`);
	console.log(`http://localhost:${PORT}`);
	console.log("");
	console.log("Available endpoints:");
	console.log(`  GET    http://localhost:${PORT}/api/projects`);
	console.log(`  GET    http://localhost:${PORT}/api/projects/:id`);
	console.log(`  POST   http://localhost:${PORT}/api/projects`);
	console.log(`  PATCH  http://localhost:${PORT}/api/projects`);
	console.log(`  DELETE http://localhost:${PORT}/api/projects/:id`);
	console.log(`  ----------------------------------------------------------------------------------------------------`);
	console.log(`  GET    http://localhost:${PORT}/api/datafiles/project/:projectID`);
	console.log(`  GET    http://localhost:${PORT}/api/datafiles/:id/content`);
	console.log(`  POST   http://localhost:${PORT}/api/datafiles`);
	console.log(`  PUT    http://localhost:${PORT}/api/datafiles/content`);
	console.log(`  POST   http://localhost:${PORT}/api/datafiles/reparse`);
	console.log(`  PATCH  http://localhost:${PORT}/api/datafiles`);
	console.log(`  DELETE http://localhost:${PORT}/api/datafiles/:id`);
	console.log(`  ----------------------------------------------------------------------------------------------------`);
	console.log(`  GET    http://localhost:${PORT}/api/datasets/project/:projectID`);
	console.log(`  GET    http://localhost:${PORT}/api/datasets/:id`);
	console.log(`  GET    http://localhost:${PORT}/api/datasets/:id/content`);
	console.log(`  PATCH  http://localhost:${PORT}/api/datasets`);
	console.log(`  DELETE http://localhost:${PORT}/api/datasets/:id`);
	console.log(`  ----------------------------------------------------------------------------------------------------`);
	console.log(`  GET    http://localhost:${PORT}/api/transformations/project/:projectID`);
	console.log(`  GET    http://localhost:${PORT}/api/transformations/:id`);
	console.log(`  GET    http://localhost:${PORT}/api/transformations/:id/content`);
	console.log(`  POST   http://localhost:${PORT}/api/transformations`);
	console.log(`  PATCH  http://localhost:${PORT}/api/transformations`);
	console.log(`  DELETE http://localhost:${PORT}/api/transformations/:id`);
	console.log(`  ----------------------------------------------------------------------------------------------------`);
	console.log(`  GET    http://localhost:${PORT}/api/charts/project/:projectID`);
	console.log(`  GET    http://localhost:${PORT}/api/charts/:id`);
	console.log(`  POST   http://localhost:${PORT}/api/charts`);
	console.log(`  PATCH  http://localhost:${PORT}/api/charts`);
	console.log(`  DELETE http://localhost:${PORT}/api/charts/:id`);
});