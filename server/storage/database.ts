import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";


export class DatabaseStorage
{
	private readonly database: Database.Database;


	constructor()
	{
		const dataDirectory = join(__dirname, "data");

		if (!existsSync(dataDirectory))
			mkdirSync(dataDirectory, {recursive: true});

		const databasePath = join(dataDirectory, "inky.db");
		this.database = new Database(databasePath);
		this.database.pragma("foreign_keys = ON");

		this.initialize();
	}


	private initialize(): void
	{
		const schema = readFileSync(
			join(__dirname, "schema.sql"),
			"utf-8"
		);

		this.database.exec(schema);
	}


	getDatabase(): Database.Database
	{
		return this.database;
	}


	close(): void
	{
		this.database.close();
	}
}