import { useState, useCallback, useEffect, memo } from "react";
import { Routes, Route, Link, useParams, useLocation, useNavigate, Navigate, useMatch, useResolvedPath } from "react-router-dom";
import { Tabs, Tab, Typography, LinearProgress, Grid } from "@mui/material";

import useGlobalState from "../../use-global-state.js";
import { useProject } from "../../api/index.js";
import { useDocumentTitle } from "../../utils/index.js";

import ProjectTaskManagement from "./ProjectTaskManagement.jsx";
import ProjectTaskKanban from "./ProjectTaskKanban.jsx";
import ProjectSprints from "./ProjectSprints.jsx";
import ProjectSprintsManagement from "./ProjectSprintManagement.jsx";
import ProjectWorkLoadAnalytics from "./ProjectWorkLoadAnalytics.jsx";
import ProjectCollaborators from "./ProjectCollaborators.jsx";
import ProjectPlanner from "./ProjectPlanner.jsx";
import MemberProfile from "./MemberProfile.jsx";

const Project = () => {
	const { pathname } = useLocation();
	const { projectid } = useParams();
	const navigate = useNavigate();
	const [value, setValue] = useState(() => {
		for (const path of ["kanban", "workload-analytics", "sprint-management", "management", "collaborators", "planner", "sprints"]) {
			if (pathname.includes(path)) return path;
		}

		return "kanban";
	});
	const setName = useGlobalState(useCallback((e) => e.setName, []));
	const { project = {}, isError } = useProject(projectid);
	const { pathname: kanbanViewPath } = useResolvedPath("kanban");
	const { pathname: projectDefaultPath } = useResolvedPath("");
	const { pathname: sprintsViewPath } = useResolvedPath("sprints");
	const isInKanbanView = useMatch(kanbanViewPath);
	const isInProjectDefaultView = useMatch(projectDefaultPath);
	const isInSprintsView = useMatch(sprintsViewPath);

	useDocumentTitle(project?.name && `${project.name} · Cyclopt`);

	useEffect(() => {
		if (isError) navigate("/projects");
	}, [navigate, isError]);

	useEffect(() => { setName(project.name); }, [project.name, setName]);

	useEffect(() => {
		setValue(() => {
			for (const path of ["workload-analytics", "sprint-management", "management", "kanban", "collaborators", "planner", "sprints"]) {
				if (pathname.includes(path)) return path;
			}

			return "kanban";
		});
	}, [pathname]);

	if (!project._id) return (<LinearProgress color="primary" />);

	if (!project.analytics?.project) return <Navigate replace to={`/projects/${project._id}`} />;

	return (
		<>
			<section style={{ marginBottom: "1rem" }}>
				<Grid container className="container" direction="column">
					<Grid item mt={2} mb={2}>
						<Typography variant="h4">{`Project Analytics: ${project.name || ""}`}</Typography>
					</Grid>
					<Grid container item direction="row" justifyContent="space-between" alignItems="center">
						<Grid item xs={12} ml={-2}>
							<Tabs
								scrollButtons
								value={value}
								variant="scrollable"
								onChange={(_, newValue) => setValue(newValue)}
							>
								{!project?.integrations?.githubTasks?.enabled && (
									<Tab
										label="kanban"
										value="kanban"
										to="kanban"
										component={Link}
									/>
								)}
								<Tab
									label="task management"
									value="management"
									to="management"
									component={Link}
								/>
								<Tab
									label="sprints"
									value="sprints"
									to="sprints"
									component={Link}
								/>
								<Tab
									label="sprint management"
									value="sprint-management"
									to="sprint-management"
									component={Link}
								/>
								<Tab
									label="workload analytics"
									value="workload-analytics"
									to="workload-analytics"
									component={Link}
								/>
								<Tab
									label="collaborators"
									value="collaborators"
									to="collaborators"
									component={Link}
								/>
								<Tab
									label="planner"
									value="planner"
									to="planner"
									component={Link}
								/>
							</Tabs>
						</Grid>
					</Grid>
				</Grid>
			</section>
			<section
				style={{
					...((isInKanbanView || isInSprintsView || isInProjectDefaultView) ? {
						display: "flex",
						flexDirection: "column",
						flexGrow: 1,
						marginBottom: 0,
					} : {}),
				}}
			>
				<div className={(isInKanbanView || isInSprintsView || isInProjectDefaultView) ? null : "container"} style={{ ...(isInKanbanView || isInSprintsView || isInProjectDefaultView ? { display: "flex", flexDirection: "column", flexGrow: 1 } : {}) }}>
					<Routes>
						<Route index path="kanban?" element={<ProjectTaskKanban project={project} />} />
						<Route path="management" element={<ProjectTaskManagement project={project} />} />
						<Route path="sprints" element={<ProjectSprints project={project} />} />
						<Route path="sprint-management" element={<ProjectSprintsManagement project={project} />} />
						<Route path="workload-analytics" element={<ProjectWorkLoadAnalytics project={project} />} />
						<Route path="collaborators" element={<ProjectCollaborators projectId={project._id} />} />
						<Route path="collaborators/:collaboratorid" element={<MemberProfile />} />
						<Route path="planner" element={<ProjectPlanner project={project} />} />
					</Routes>
				</div>
			</section>
		</>
	);
};

export default memo(Project);
