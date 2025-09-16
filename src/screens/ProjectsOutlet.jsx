import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Typography } from "@mui/material";
import { useLocation, Outlet, matchPath, useParams } from "react-router-dom";
import { shallow } from "zustand/shallow";

import ToggleButtonTabs from "../components/ToggleButtonTabs.jsx";
import useGlobalState from "../use-global-state.js";

import { jwt, createNavigationTabsConfig } from "#utils";
import { useProject } from "#api";

const findTab = (pathname) => {
	for (const path of ["overview", "quality-gates", "quality-analytics", "settings"]) {
		if (pathname.includes(path)) return path;
	}

	return "overview";
};

const projectSubscription = true;
const qualitySubscription = true;

const ProjectsOutlet = () => {
	const { pathname } = useLocation();
	const { projectid } = useParams();

	const { id } = jwt.maybeDecode();
	const [value, setValue] = useState(() => findTab(pathname));
	const helperValue = useMemo(() => findTab(pathname), [pathname]);
	const { project = {}, isLoading, isError } = useProject(projectid, false, true);

	const { selectedOrganization, setSelectedOrganization } = useGlobalState(useCallback((e) => ({
		setSelectedOrganization: e.setSelectedOrganization,
		selectedOrganization: e.selectedOrganization,
	}), [], shallow));

	const syncedRef = useRef(false);
	useEffect(() => {
		if (isLoading || isError) return;

		const parent = project?.parentOrganization;
		if (!parent?._id) return;

		if (!syncedRef.current && selectedOrganization?._id !== parent._id) {
			syncedRef.current = true;
			setSelectedOrganization({ _id: parent._id, name: parent.name });
		}
	}, [
		isLoading,
		isError,
		project?.parentOrganization?._id,
		project?.parentOrganization,
		selectedOrganization?._id,
		setSelectedOrganization,
	]);

	const is404 = ![
		"/projects/:projectid",
		"/projects/:projectid/overview",
		"/projects/:projectid/settings",
		"/projects/:projectid/quality-analytics/:repoid/*",
		"/projects/:projectid/quality-analytics/*",
		"/projects/:projectid/quality-gates",
		"/projects/:projectid/quality-gates/add-quality-gate",
	].some((pattern) => matchPath(pattern, pathname));

	const showProjectAnalytics = projectSubscription && project?.analytics?.project;
	const showCycloptGuard = project.showCycloptGuard;
	// hide quality analytics only if it's a team project and no quality subscription is active
	const showQualityAnalytics = ((project?.type === "team" && qualitySubscription && project?.analytics?.quality)
		|| (project?.type === "personal" && project?.analytics?.quality && (qualitySubscription || project?.linkedRepositories?.some((r) => !r.isPrivate))));

	return (
		<div className="container">
			{!is404 && (
				<section style={{ marginTop: "1rem" }}>
					<Typography variant="h4" style={{ marginBottom: "1rem" }}>{project.name || "\u2800"}</Typography>
					{id && (
						<ToggleButtonTabs
							tabs={createNavigationTabsConfig(true, !showCycloptGuard, !showProjectAnalytics, !showQualityAnalytics)}
							defaultValue={helperValue || value}
							gap={1}
							onChange={(newVal) => setValue(newVal)}
						/>
					)}
				</section>
			)}
			<section>
				<Outlet project={project} isLoading={isLoading} isError={isError} />
			</section>
		</div>

	);
};

export default ProjectsOutlet;
