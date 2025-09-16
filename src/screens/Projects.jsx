import { useCallback, useEffect, memo, useMemo, useState } from "react";
import { Typography, Grid, IconButton, Link as MaterialLink } from "@mui/material";
import { TrendingUp, TrendingDown, TrendingFlat, Visibility, VisibilityOff, Remove, Error, AllInclusive } from "@mui/icons-material";
import { dateOldToNew, numberSmallToLarge, stringAToZInsensitive } from "@iamnapo/sort";
import { shallow } from "zustand/shallow";

import { jwt, useSnackbar, dayjs, qualityCell, isFuzzyMatch, ProjectQualityGatesCell } from "../utils/index.js";
import ProjectsTiles from "../components/ProjectsTiles.jsx";
import DataTable from "../components/DataTable.jsx";
import Tooltip from "../components/Tooltip.jsx";
import useGlobalState from "../use-global-state.js";
import { updateProjectVisibility, useProjects, useProjectsAnalytics, useUserFailedQualityGates } from "../api/index.js";

const Projects = () => {
	const { type = "github" } = jwt.decode();
	const { setName } = useGlobalState(useCallback((e) => ({
		setName: e.setName,
		setShowNotificationBadge: e.setShowNotificationBadge,
	}), []), shallow);
	const { username } = jwt.decode();
	const { error } = useSnackbar();
	const { projects = [], isLoading, isError: isErrorProjects, mutate } = useProjects(true, true, false);
	const {
		projectsAnalytics = {},
		isError: isErrorProjectAnalytics,
		mutate: mutateProjectAnalytics,
	} = useProjectsAnalytics();

	const { data: failedQualityGates = {},
		isLoading: isLoadingFailedQualityGates,
		isError: isErrorFailedQualityGates } = useUserFailedQualityGates();

	const [sortModel, setSortModel] = useState([{ field: "Last Commit", sort: "desc" }]);

	useEffect(() => {
		if (isErrorProjects || isErrorProjectAnalytics || isErrorFailedQualityGates) error();
	}, [error, isErrorProjects, isErrorFailedQualityGates, isErrorProjectAnalytics]);

	// calculate the number of quality gates failed
	// each quality gate can fail in multiple repositories but will be counted once
	const uniqueFailedQualityGates = useMemo(() => {
		// If failed quality gates have not finished loading we use null as a result
		// thus the Tile shows "-"
		if (isLoadingFailedQualityGates) return null;

		return new Set(
			Object.values(failedQualityGates)
				.flat()
				.map((qG) => qG.qualityGate._id),
		).size;
	}, [failedQualityGates, isLoadingFailedQualityGates]);

	const velocityCell = useCallback((value, variant = "body1") => {
		if (value === undefined) return (<Typography variant={variant}>{"Calculating..."}</Typography>);
		if (!value) return (<Typography variant={variant}>{"Not available"}</Typography>);
		let tooltip = (value[0] === "infinity")
			? `+${value[1]} commits this week compared to last week. Nice!`
			: `${value[0]} times more commits this week compared to last week. Nice!`;
		let color = "green.500";
		let iconType = "up";
		if (value[1] < 0) {
			tooltip = (value[0] === "-infinity")
				? `${value[1]} commits this week compared to last week. :(`
				: `${value[0]} times less commits this week compared to last week. :(`;
			color = "red.500";
			iconType = "down";
		} else if (value[1] === 0) {
			tooltip = "Same number of commits this week compared to last week.";
			color = "grey.500";
			iconType = "flat";
		}

		return (
			<Tooltip title={tooltip}>
				<Grid container justifyContent="center" alignItems="center">
					<Grid item xs={7}><Typography variant={variant} sx={{ textAlign: "center" }}>{`${value[1]} commits/week`}</Typography></Grid>
					<Grid item xs={3} display="flex" justifyContent="center" alignItems="center">
						{(value[0] === "infinity")
							? <AllInclusive sx={{ color }} />
							: (value[0] === "-infinity")
								? <AllInclusive sx={{ color }} />
								: <Typography variant={variant} sx={{ color }}>{`${value[0]}x`}</Typography>}
					</Grid>
					<Grid item xs={1}>
						<Typography variant={variant} sx={{ color, textAlign: "center" }}>
							{iconType === "up" && (<TrendingUp fontSize="inherit" />)}
							{iconType === "down" && (<TrendingDown fontSize="inherit" />)}
							{iconType === "flat" && (<TrendingFlat fontSize="inherit" />)}
						</Typography>
					</Grid>
				</Grid>
			</Tooltip>
		);
	}, []);

	const handleVisibilityClick = useCallback(async (projectId, setTo) => {
		await mutate(async (p) => {
			try {
				await updateProjectVisibility(projectId, setTo);
				const newProjects = [...p];
				newProjects.find((e) => e._id === projectId).isShown = setTo;
				return newProjects;
			} catch {
				error();
				return p;
			}
		});
		await mutateProjectAnalytics();
	}, [error, mutate, mutateProjectAnalytics]);

	const tableColumns = useMemo(() => [
		{
			field: "Shown",
			sortable: false,
			width: 50,
			valueGetter: ({ row }) => row.isShown,
			renderHeader: () => <Typography variant="h6" display="flex"><Visibility /></Typography>,
			renderCell: ({ value, id }) => (
				<IconButton onClick={() => handleVisibilityClick(id, value)}>
					{value ? <Visibility /> : <VisibilityOff sx={{ color: "grey.500" }} />}
				</IconButton>
			),
		},
		{
			field: "Name",
			getApplyQuickFilterFn: (searchValue) => ({ row }) => isFuzzyMatch(row.name, searchValue),
			align: "left",
			minWidth: 300,
			flex: 1,
			valueGetter: ({ row }) => ({ name: row.name, isShown: row.isShown }),
			valueFormatter: ({ value }) => value.name,
			sortComparator: ({ name: nameA, isShown: isShownA }, { name: nameB, isShown: isShownB }) => {
				if (!isShownA) return sortModel.sort === "desc" ? -1 : 1;
				if (!isShownB) return sortModel.sort === "desc" ? 1 : -1;
				return stringAToZInsensitive()(nameA, nameB);
			},
			renderCell: (params) => <ProjectQualityGatesCell row={params.row} setName={setName} />,

		},
		{
			field: "Average Score",
			width: 200,
			valueGetter: ({ row }) => ({ quality: projectsAnalytics[row._id]?.avgAnalysisScore, isShown: row.isShown }),
			valueFormatter: ({ value }) => value.quality,
			sortComparator: ({ quality: qualityA, isShown: isShownA }, { quality: qualityB, isShown: isShownB }) => {
				if (!isShownA) return sortModel[0].sort === "desc" ? -1 : 1;
				if (!isShownB) return sortModel[0].sort === "desc" ? 1 : -1;
				return numberSmallToLarge(Number)(qualityA, qualityB);
			},
			renderCell: ({ row, value }) => (row.isShown
				? qualityCell(row.analytics?.quality && value.quality, value.quality === undefined, "body1")
				: <Typography><Remove style={{ fontSize: "inherit" }} /></Typography>),
		},
		{
			field: "Velocity",
			width: 450,
			valueGetter: ({ row }) => ({ velocity: projectsAnalytics[row._id]?.velocity, isShown: row.isShown }),
			valueFormatter: ({ value }) => (value?.velocity?.[0] ?? null),
			sortComparator: ({ velocity: velocityA, isShown: isShownA }, { velocity: velocityB, isShown: isShownB }) => {
				if (!isShownA) return sortModel[0].sort === "desc" ? -1 : 1;
				if (!isShownB) return sortModel[0].sort === "desc" ? 1 : -1;
				return numberSmallToLarge((v) => v[1])(velocityA, velocityB);
			},
			renderCell: ({ row, value }) => (row.isShown
				? velocityCell(value.velocity, "body1")
				: (
					<Grid container justifyContent="center" alignItems="center" color="grey.500">
						<Grid item xs={7}><Typography textAlign="center">{"-commits/week"}</Typography></Grid>
						<Grid item xs={3}><Typography textAlign="center">{"-%"}</Typography></Grid>
						<Grid item xs={1}>
							<Typography textAlign="center">
								<Remove fontSize="inherit" />
							</Typography>
						</Grid>
					</Grid>
				)),
		},
		{
			field: "Last Commit",
			width: 190,
			type: "date",
			valueGetter: ({ row }) => ({ lastCommit: projectsAnalytics[row._id]?.lastCommit, isShown: row.isShown }),
			valueFormatter: ({ value }) => value.lastCommit,
			sortComparator: ({ lastCommit: lastCommitA, isShown: isShownA }, { lastCommit: lastCommitB, isShown: isShownB }) => {
				if (!isShownA) return sortModel[0].sort === "desc" ? -1 : 1;
				if (!isShownB) return sortModel[0].sort === "desc" ? 1 : -1;
				return dateOldToNew((v) => new Date(v))(lastCommitA, lastCommitB);
			},
			renderCell: ({ row }) => (
				<Typography sx={{ ...(!row.isShown && { color: "grey.500" }) }}>
					{row.isShown && projectsAnalytics[row._id]?.lastCommit ? dayjs(projectsAnalytics[row._id]?.lastCommit).fromNow() : <Remove style={{ fontSize: "inherit" }} />}
				</Typography>
			),
		},
	], [handleVisibilityClick, projectsAnalytics, setName, sortModel, velocityCell]);

	return (
		<section style={{ paddingTop: "1rem" }}>
			<div className="container">
				<Typography gutterBottom variant="h4">{`Hi there, ${username || ":-)"}`}</Typography>
				<ProjectsTiles
					activeProjects={projects.filter((e) => e.isShown).length}
					failedQualityGates={!isLoadingFailedQualityGates && uniqueFailedQualityGates}
					totalAnalyses={projectsAnalytics.totalAnalyses || 0}
				/>
				<Grid container direction="row" justifyContent={["cyclopt", "bitbucket", "azure"].includes(type) ? "flex-end" : "space-between"} alignItems="center" mb={2}>
					<Grid item hidden={type !== "github"}>
						<Typography display="flex" alignItems="center">
							<Error color="primary" sx={{ mr: 0.5 }} />
							{"Want to keep commits in sync?"}
							&nbsp;
							<MaterialLink
								href={import.meta.env.VITE_MAIN_SERVER_URL}
								target="_blank"
								rel="noopener noreferrer"
								underline="none"
							>
								{"Configure the Cyclopt app on Github"}
							</MaterialLink>
							{"."}
						</Typography>
					</Grid>
					<Grid item hiddem={type === "gitlab"}>
						<Typography display="flex" alignItems="center">
							<Error color="primary" sx={{ mr: 0.5 }} />
							{"Want to keep commits in sync?"}
							&nbsp;
							<MaterialLink
								underline="none"
								href="https://gitlab.com/oauth/applications"
								target="_blank"
								rel="noopener noreferrer"
							>
								{"Configure the Cyclopt app on Gitlab"}
							</MaterialLink>
							{"."}
						</Typography>
					</Grid>
				</Grid>
				<DataTable
					id="dashBoard"
					rows={projects}
					loading={isLoading}
					columns={tableColumns}
					sortModel={sortModel}
					initialState={{ pagination: { paginationModel: { page: 0 } } }}
					onSortModelChange={(newSortModel) => setSortModel(newSortModel)}
				/>
			</div>
		</section>
	);
};

export default memo(Projects);
