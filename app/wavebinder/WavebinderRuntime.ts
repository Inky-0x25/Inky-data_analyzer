import { WaveBinder, MultiNode } from "wave-binder";

import LICENSE from "./license_CONTEST-0010.json";
import EXT_API_CONFIG from "./extapi.json";
import PROTO_NODES from "./protonodes.json";


const extApis =
	new Map(
		[
			[
				"API",
				{
					...EXT_API_CONFIG,
					authorization:
						EXT_API_CONFIG.authorization ?? ""
				}
			]
		]
	);


const protoNodes =
	PROTO_NODES as any[];


export class WavebinderRuntime
{
	wb: WaveBinder;


	constructor()
	{
		this.wb =
			new WaveBinder(
				LICENSE,
				protoNodes,
				extApis,
				[]
			);

		this.wb.tangleNodes();
	}


	static create(): WavebinderRuntime
	{
		return new WavebinderRuntime();
	}


	getNode(name: string)
	{
		return this.wb.getNodeByName(
			name
		);
	}


	setNodeValue(
		name: string,
		value: any
	): void
	{
		this.wb
			.getNodeByName(name)
			.next(value);
	}


	getNodeValue(name: string)
	{
		return this.getNode(
			name
		).getNodeValue();
	}


	getChoices(name: string)
	{
		return (
			this.getNode(name) as MultiNode
		).choices;
	}


	getNodes()
	{
		return this.wb.getNodes();
	}


	getDataPool()
	{
		return this.wb.getDataPool();
	}
}