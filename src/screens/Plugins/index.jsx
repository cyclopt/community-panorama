import { memo } from "react";
import { Routes, Route, useParams, useLocation, Navigate } from "react-router-dom";
import { LinearProgress } from "@mui/material";

import { useProject } from "../../api/index.js";
import useDocumentTitle from "../../utils/use-document-title.js";

import AzurePullRequests from "./AzurePullRequests.jsx";

const Project = () => {
	const { pathname } = useLocation();
	const { projectid } = useParams();

	const { project = {} } = useProject(projectid);

	useDocumentTitle(project?.name && `${project.name} · Cyclopt`);

	if (!project._id) return (<LinearProgress color="primary" />);

	if (!project.analytics?.project) return <Navigate replace to={`/projects/${project._id}`} />;

	return (
		<section style={{ paddingTop: "1rem", ...(pathname.includes("kanban") && { marginBottom: 0 }) }}>
			<div className="container">
				<Routes>
					<Route path="azure-pull-requests" element={<AzurePullRequests />} />
				</Routes>
			</div>
		</section>
	);
};

export default memo(Project);
