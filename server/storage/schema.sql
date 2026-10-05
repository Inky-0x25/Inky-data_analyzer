CREATE TABLE IF NOT EXISTS projects
(
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	settings TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS datafile_contents
(
	hash TEXT PRIMARY KEY,
	content BLOB NOT NULL,
	ref_count INTEGER NOT NULL DEFAULT 0
);


CREATE TABLE IF NOT EXISTS datafiles
(
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,

	hash TEXT,
	name TEXT NOT NULL,
	size INTEGER NOT NULL,
	type TEXT,

	state TEXT NOT NULL,
	error TEXT,

	FOREIGN KEY (project_id)
		REFERENCES projects(id)
		ON DELETE CASCADE,

	FOREIGN KEY (hash)
		REFERENCES datafile_contents(hash)
		ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS datasets
(
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,

	name TEXT NOT NULL,
	source_file_id TEXT,
	source_key TEXT,

	parse_options TEXT NOT NULL,


	error TEXT,

	FOREIGN KEY (project_id)
		REFERENCES projects(id)
		ON DELETE CASCADE,

	FOREIGN KEY (source_file_id)
		REFERENCES datafiles(id)
		ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS dataset_cells
(
	dataset_id TEXT PRIMARY KEY,
	header_root TEXT NOT NULL,
	cells TEXT NOT NULL,

	FOREIGN KEY (dataset_id)
		REFERENCES datasets(id)
		ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS transformations
(
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,

	name TEXT NOT NULL,
	parent_id TEXT NOT NULL,

	operations TEXT NOT NULL,

	error TEXT,

	FOREIGN KEY (project_id)
		REFERENCES projects(id)
		ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS transformation_cells
(
	transformation_id TEXT PRIMARY KEY,
	header_root TEXT NOT NULL,
	cells TEXT NOT NULL,

	FOREIGN KEY (transformation_id)
		REFERENCES transformations(id)
		ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS dashboards
(
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,

	name TEXT NOT NULL,
	widgets TEXT NOT NULL,

	error TEXT,

	FOREIGN KEY (project_id)
		REFERENCES projects(id)
		ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS charts
(
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,

	name TEXT NOT NULL,
	type TEXT NOT NULL,
	source_id TEXT,

	settings TEXT NOT NULL,

	error TEXT,

	FOREIGN KEY (project_id)
		REFERENCES projects(id)
		ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS idx_datafiles_project_id
	ON datafiles(project_id);

CREATE INDEX IF NOT EXISTS idx_datafiles_hash
	ON datafiles(hash);

CREATE INDEX IF NOT EXISTS idx_datasets_project_id
	ON datasets(project_id);

CREATE INDEX IF NOT EXISTS idx_datasets_source_file_id
	ON datasets(source_file_id);

CREATE INDEX IF NOT EXISTS idx_datasets_source_file_key
	ON datasets(source_file_id, source_key);

CREATE INDEX IF NOT EXISTS idx_transformations_project_id
	ON transformations(project_id);

CREATE INDEX IF NOT EXISTS idx_transformations_parent_id
	ON transformations(parent_id);

CREATE INDEX IF NOT EXISTS idx_dashboards_project_id
	ON dashboards(project_id);

CREATE INDEX IF NOT EXISTS idx_charts_project_id
	ON charts(project_id);


CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_name
	ON projects(name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_datafiles_project_hash
	ON datafiles(project_id, hash)
	WHERE hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_datafiles_project_name
	ON datafiles(project_id, name);