import { FileType, FileTypeValue } from "../../shared/models/Datafile";
import { Parser } from "./parser";
import { CsvParser } from "./csvParser";


export class ParserFactory
{
    static create(type: FileTypeValue): Parser
    {
        switch (type)
        {
            case FileType.CSV:
                return new CsvParser();
            default:
                throw new Error(`Unsupported file type: ${type}`);
        }
    }
}