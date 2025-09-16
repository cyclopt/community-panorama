import { useCallback, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
	LinearProgress,
	Grid,
} from "@mui/material";
import { stringAToZInsensitive } from "@iamnapo/sort";
import { shallow } from "zustand/shallow";

import useGlobalState from "../use-global-state.js";
import { useProject } from "../api/index.js";
import RepositoryQualityCard from "../components/RepositoryQualityCard.jsx";
import QualityTiles from "../components/QualityTiles.jsx";
import { jwt, useDocumentTitle } from "../utils/index.js";

const Qualities = () => {
	const { type = "github" } = jwt.decode();
	const { setName } = useGlobalState(useCallback((e) => ({
		setName: e.setName,
	}), []), shallow);
	const navigate = useNavigate();
	const { projectid } = useParams();
	const { project = {}, isLoading, isError } = useProject(projectid, false, true);
	useEffect(() => {
		if (isError) navigate("/projects");
	}, [navigate, isError]);

	useDocumentTitle(project?.name && `${project.name} · Cyclopt`);

	useEffect(() => { setName(project.name); }, [project.name, setName]);

	if (project._id && !project.analytics?.quality) return <Navigate replace to={`/projects/${project._id}`} />;

	return (
		<>
			{isLoading && (<LinearProgress color="primary" />)}
			<section style={{ paddingTop: "1rem" }}>
				<div className="container">
					<Grid item container justifyContent="center" spacing={2} sx={{ marginBottom: "6rem" }}>
						<QualityTiles project={project} />
					</Grid>
					<Grid item container direction="row" justifyContent="center" spacing={2}>
						{[...(project.linkedRepositories || [])].sort(stringAToZInsensitive((v) => `${v.owner}/${v.name}`)).map((repo, ind) => (
							<Grid key={`repo_card_${ind}_${repo._id}`} item xs={12} md={6} xl={4}>
								<RepositoryQualityCard
									pId={project._id}
									repo={repo}
									type={type}
								/>
							</Grid>
						))}
					</Grid>
				</div>
			</section>
		</>
	);
};

export default Qualities;
