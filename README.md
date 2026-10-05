# Inky Data Analyzer

Inky Data Analyzer is a local browser-based data analysis application built with TypeScript and React. It allows users to import local data files, inspect datasets, apply transformations, and create visualizations entirely through a local application.

## Features

### Data analysis

* Import local data files into projects.
* Parse imported files into datasets.
* Inspect rows, columns, hierarchical headers, field types, categories, and statistics.
* Rename and manage datasets.
* Store project data locally in SQLite.

### Dataset transformations

Datasets can be processed through transformation operations and linked into transformation chains. Child datasets can be recalculated when their source data changes.

### Charts

The application provides multiple chart types, including:

* Value
* Bar
* Line
* Area
* Pie
* Donut
* Scatter
* Bubble
* Box Plot
* Heatmap
* Treemap
* Radar
* Gauge

Charts can be configured using dataset fields and formulas and exported as PNG, SVG, or HTML.

### Formula evaluation

The application includes a custom formula evaluator supporting:

* Arithmetic expressions
* Logical and bitwise expressions
* Cell, row, and column references
* Ranges
* Aggregation functions
* Type conversion functions
* Date and time values

## Technology stack

### Frontend

* React 19
* React DOM 19
* TypeScript 6
* Vite 8
* Recharts 3
* WaveBinder

### Backend

* Node.js
* Express 5
* TypeScript
* SQLite through `better-sqlite3`
* `tsx` for development and execution
* CORS
* Multer for file uploads

### Data processing

* Papa Parse for CSV parsing

## Project structure

```text
Inky_Data_Analyzer/
├── app/                  # React frontend
├── server/               # Local Node.js backend
├── shared/               # Shared models, API types, and logic
├── index.html            # Vite application entry point
├── package.json
├── tsconfig.json
├── tsconfig.app.json
└── tsconfig.server.json
```

## Installation

Clone the repository and install the dependencies:

```bash
npm install
```

## Development

Start the Vite development server:

```bash
npm run dev
```

Start the local backend:

```bash
npm run server
```

The frontend and backend are separate processes during development.

## Type checking

The frontend and backend use separate TypeScript configurations.

Run type checking for both:

```bash
npm run typecheck
```

This runs:

```bash
tsc -p tsconfig.app.json --noEmit
tsc -p tsconfig.server.json --noEmit
```

## Production builds

Build the frontend:

```bash
npm run build-app
```

Build the backend:

```bash
npm run build-server
```

Build both:

```bash
npm run build
```

The combined build runs:

```bash
vite build
tsc -p tsconfig.server.json
```

## Application architecture

The application separates the frontend, backend, and shared code.

### Frontend

React components provide the user interface for projects, datafiles, datasets, transformations, and charts.

WaveBinder is used as the reactive data layer. Important nodes include:

```text
datafileList
selectedDatafile
datasetList
selectedDataset
currentDataset
datasetContent
```

Dataset selection follows the WaveBinder state rather than maintaining a second independent data source.

A typical flow is:

```text
datasetList
    ↓
selectedDataset
    ↓
currentDataset
    ↓
datasetContent
    ↓
React UI
```

### Backend

The backend provides local persistence and data processing services.

Major services include:

* Project service
* Datafile service
* Dataset service
* Transformation service
* Chart service

SQLite is used for persistent application data.

Datafile contents are stored separately from their metadata and identified using SHA-256 hashes. This allows identical file contents to be shared between datafile records.

### Shared code

The `shared` directory contains types and models used by both the frontend and backend, including:

* Dataset models
* Datafile models
* Chart models
* Transformation models
* Project models
* API request/response types
* Formula evaluation logic

## Data import

Imported files are processed by a parser factory that selects the appropriate parser according to the detected file type.

CSV files are parsed with Papa Parse.

During parsing, datasets can be created with:

* Dataset names
* Hierarchical headers
* Field type detection
* Field category detection
* Field statistics
* Parsing options

## Local storage

The application is designed to run locally.

Project information and dataset metadata are stored in SQLite, while file contents are stored using content hashes. The database is initialized from the server's SQL schema.

## License

MIT
