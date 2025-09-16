import { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { Grid, Typography, Select, MenuItem, CircularProgress } from "@mui/material";
import { shallow } from "zustand/shallow";
import { useNavigate, useLocation } from "react-router-dom";
import queryString from "query-string";

import SprintFlowDiagram from "../../components/SprintFlowDiagram.jsx";
import Tile from "../../components/Tile.jsx";
import OverallFlowDiagram from "../../components/OverallFlowDiagram.jsx";
import WorkTimeBreakDown from "../../components/WorkTimeBreakDown.jsx";
import Velocity from "../../components/Velocity.jsx";
import { useLocalStorage, useSnackbar, dayjs } from "../../utils/index.js";
import { loadProjectTaskMetrics, useProjectSprints } from "../../api/index.js";
import LabelFlowDiagram from "../../components/LabelFlowDiagram.jsx";

const ProjectWorkLoadAnalytics = (props) => {
	const { project } = props;
	const { pathname, search } = useLocation();
	const navigate = useNavigate();
	const { sprints = [], isLoading, isError } = useProjectSprints(project?._id, true);
	const { error } = useSnackbar();

	const { currentSprint, setCurrentSprint } = useLocalStorage(useCallback((e) => ({
		currentSprint: e?.currentSprint,
		setCurrentSprint: e?.setCurrentSprint,
	}), []), shallow);

	const [metrics, setMetrics] = useState({});

	useEffect(() => {
		const parsed = queryString.parse(search);

		const defaultSprint = { _id: null, title: "Default" };
		if (!isLoading) {
			if (parsed?.sprint) {
				if (parsed?.sprint !== currentSprint?._id) {
					const selectedSprint = sprints.find((s) => s._id === parsed?.sprint) ?? defaultSprint;
					setCurrentSprint(selectedSprint || defaultSprint);
				}
			} else if (currentSprint) {
				parsed.sprint = currentSprint?._id ?? undefined;
				navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
			} else {
				const selectedSprint = sprints.find((s) => dayjs().isBetween(dayjs(s?.startDate), dayjs(s?.endDate), "day")) ?? defaultSprint;
				setCurrentSprint(selectedSprint);

				parsed.sprint = selectedSprint?._id ?? undefined;
				navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
			}
		}
	}, [currentSprint, isLoading, navigate, pathname, search, setCurrentSprint, sprints]);

	useEffect(() => {
		(async () => {
			try {
				const taskMetrics = await loadProjectTaskMetrics(project._id);
				setMetrics({
					...taskMetrics,
					averageDaysToCloseTask: Number.parseFloat((taskMetrics.averageDaysToCloseTask || 0).toFixed(2), 10),
					collaborators: new Set(taskMetrics.collaborators).size,
				});
			} catch {
				error();
			}
		})();
	}, [error, project._id]);

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	const hasExternalTasks = useMemo(
		() => project?.integrations?.githubTasks?.enabled || project?.integrations?.azureTasks?.enabled,
		[project?.integrations],
	);

	return (
		<div>
			{isLoading ? <CircularProgress color="secondary" /> : (
				<>
					<Grid container spacing={2} m={-2} mb={3} xs={12} display="flex" flexDirection="row" justifyContent="center" alignItems="center">
						<Grid item container direction="row" justifyContent="center" spacing={3} m={-1.5} mb={1} sx={{ "> .MuiGrid-item": { p: 1.5 } }}>
							<Grid item xs><Tile row={2} number={metrics.collaborators} content="project collaborators" /></Grid>
							<Grid item xs><Tile row={2} number={metrics.totalOpenTasks} content="open tasks" /></Grid>
							<Grid item xs><Tile row={2} number={metrics.totalClosedTasks} content="tasks delivered" /></Grid>
							<Grid item xs hidden={hasExternalTasks}>
								<Tile row={2} number={metrics.remainingWorkload} content="remaining workload (points)" />
							</Grid>
							<Grid item xs><Tile row={2} number={metrics.averageDaysToCloseTask} content="mean time to close tasks (days)" /></Grid>
						</Grid>
						<Grid container item flexDirection="row" alignItems="center" justifyContent="center" spacing={1} m={-1}>
							<Grid item>
								<Typography variant="h6" fontWeight="bold" color="primary">{"Select Sprint: "}</Typography>
							</Grid>
							<Grid item>
								<Select
									size="small"
									value={JSON.stringify(currentSprint ?? {})}
									sx={{
										width: "20rem",
										"& .MuiTypography-root": { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
									}}
									renderValue={() => (<Typography>{currentSprint?.title ?? "Default"}</Typography>)}
									onChange={(e) => {
										const sprint = JSON.parse(e.target.value);
										const parsed = queryString.parse(search);
										parsed.sprint = sprint?._id ?? undefined;
										navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
										setCurrentSprint(sprint);
									}}
								>
									{(sprints || []).map((e) => (
										<MenuItem key={`sprint_${e._id}`} value={JSON.stringify(e)} sx={{ display: "block", mt: 0.5, mb: 0.5 }}>
											<Typography>
												{e.title}
											</Typography>
											{e?.startDate && e?.endDate && (
												<Typography variant="caption">
													{`${dayjs(e.startDate).format("DD/MM/YYYY")} - ${dayjs(e.endDate).format("DD/MM/YYYY")}`}
												</Typography>
											)}
										</MenuItem>
									))}
									<MenuItem value={JSON.stringify({ _id: null, title: "Default" })}>{"Default"}</MenuItem>
								</Select>
							</Grid>
						</Grid>
					</Grid>
					<Grid container direction="row" justifyContent="center" alignItems="stretch" textAlign="center" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
						<Grid item xs={12} md={6} hidden={hasExternalTasks}>
							<SprintFlowDiagram projectId={project._id} kanban={project.kanban.style} sprint={currentSprint ?? {}} />
						</Grid>
						<Grid item xs={12} md={6} hidden={!hasExternalTasks}>
							<LabelFlowDiagram projectId={project._id} />
						</Grid>
						<Grid item xs={12} md={6}>
							<OverallFlowDiagram projectId={project._id} sprint={currentSprint ?? {}} />
						</Grid>
						<Grid item xs={12} md={6}>
							<WorkTimeBreakDown
								projectId={project._id}
								sprint={currentSprint ?? {}}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<Velocity
								projectId={project._id}
								sprint={currentSprint ?? {}}
								kanban={project.kanban}
								hasExternalTasks={hasExternalTasks}
							/>
						</Grid>
					</Grid>
				</>
			)}
		</div>
	);
};

ProjectWorkLoadAnalytics.propTypes = { project: PropTypes.object.isRequired };

export default ProjectWorkLoadAnalytics;
