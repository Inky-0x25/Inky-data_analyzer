import { useEffect, useState } from "react";

import { Project } from "../shared/models/Project";

import { ApplicationView } from "./components/ApplicationView";
import { StartView } from "./components/StartView";
import { WavebinderRuntime } from "./wavebinder/WavebinderRuntime";


export default function App()
{
	const [currentProject, setCurrentProject] = useState<Project | null>(null);
	const [wavebinder] = useState(() => WavebinderRuntime.create());


	useEffect(() =>
	{
		const currentProjectNode = wavebinder.getNode("currentProject");

		const updateCurrentProject = () =>
		{
			const value = currentProjectNode.getNodeValue();

			if (!value)
			{
				setCurrentProject(null);
				return;
			}

			setCurrentProject(Project.createFromObject(value));
		};

		updateCurrentProject();

		const subscription = currentProjectNode.subscribe(updateCurrentProject);

		return () => subscription.unsubscribe();
	}, [wavebinder]);


	if (!currentProject)
	{
		return (
			<StartView
				wavebinder={wavebinder}
			/>
		);
	}


	return (
		<ApplicationView
			project={currentProject}
			wavebinder={wavebinder}
		/>
	);
}