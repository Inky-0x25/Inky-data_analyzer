import { WavebinderRuntime } from "../wavebinder/WavebinderRuntime";
import { ProjectList } from "./ProjectList";


interface StartViewProperties
{
	wavebinder: WavebinderRuntime;
}


export function StartView({wavebinder}: StartViewProperties)
{
	return (
		<div id="startViewDiv" className="vBox lgSpaceBox">
			<h1 id="title">Inky Data Analyzer</h1>
			<ProjectList wavebinder={wavebinder}/>
		</div>
	);
}