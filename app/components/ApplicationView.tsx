import { useState } from "react";

import { Project } from "../../shared/models/Project";

import { WavebinderRuntime } from "../wavebinder/WavebinderRuntime";

import { ChartsTab } from "./ChartsTab";
import { DataTab } from "./DataTab";
import { FilesTab } from "./FilesTab";
import { Header } from "./Header";
import { TransformationsTab } from "./TransformationsTab";


export const Tab =
{
	FILES: "files",
	DATA: "data",
	TRANSFORMATIONS: "transformations",
	CHARTS: "charts",
	DASHBOARDS: "dashboards"
} as const;

export type TabValue = typeof Tab[keyof typeof Tab];


interface ApplicationViewProperties
{
	project: Project;
	wavebinder: WavebinderRuntime;
}


export function ApplicationView({project, wavebinder}: ApplicationViewProperties)
{
	const [currentTab, setCurrentTab] = useState<TabValue>(Tab.FILES);
	const [currentDatatransID, setCurrentDatatransID] = useState<string | null>(null);
	const [currentChartID, setCurrentChartID] = useState<string | null>(null);


	return (
		<div id="applicationDiv" className="fillBox">
			<Header
				project={project}
				wavebinder={wavebinder}
				currentTab={currentTab}
				onTabSelected={setCurrentTab}
			/>

			<div id="contentDiv">
				<div className="fillBox">
					<FilesTab
						project={project}
						wavebinder={wavebinder}
						active={currentTab === Tab.FILES}
					/>

					<DataTab
						project={project}
						wavebinder={wavebinder}
						active={currentTab === Tab.DATA}
					/>

					<TransformationsTab
						wavebinder={wavebinder}
						currentDatatransID={currentDatatransID}
						onDatatransSelected={setCurrentDatatransID}
						active={currentTab === Tab.TRANSFORMATIONS}
					/>

					<ChartsTab
						wavebinder={wavebinder}
						currentChartID={currentChartID}
						onChartSelected={setCurrentChartID}
						active={currentTab === Tab.CHARTS}
					/>

					<section
						id="dashboardsTab"
						className={`tab ${currentTab === Tab.DASHBOARDS ? "active" : ""}`}
					>
					</section>
				</div>
			</div>
		</div>
	);
}