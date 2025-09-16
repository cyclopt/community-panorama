import { useCallback, useEffect, useMemo, memo } from "react";
import PropTypes from "prop-types";
import { Typography, Grid, Box, Link as MaterialLink } from "@mui/material";
import { Link } from "react-router-dom";
import { numberSmallToLarge } from "@iamnapo/sort";
import pluralize from "pluralize";
import { Image } from "mui-image";

import DataTable from "../../components/DataTable.jsx";
import useGlobalState from "../../use-global-state.js";
import { useSnackbar } from "../../utils/index.js";
import { useTeamMembers, useTeamMetrics } from "../../api/index.js";
import Tile from "../../components/Tile.jsx";
import TeamProjectBeat from "../../components/TeamProjectBeat.jsx";

const ProjectCollaborators = (props) => {
	const { projectId } = props;
	const { error } = useSnackbar();
	const setShowGlobalLoading = useGlobalState(useCallback((e) => e.setShowGlobalLoading, []));
	const { members = [], isLoading, isError } = useTeamMembers(projectId);
	const {
		metrics = { averageTasksClosedPerDay: null, tasksPerMember: null, remainingWorkloadPerMember: null, commitsPerMember: null },
		isError: isError2,
	} = useTeamMetrics(projectId);

	useEffect(() => {
		if (isError || isError2) error();
	}, [error, isError, isError2]);

	useEffect(() => setShowGlobalLoading(isLoading), [isLoading, setShowGlobalLoading]);

	const tableColumns = useMemo(() => [
		{
			field: "Collaborator",
			minWidth: 180,
			flex: 1,
			align: "left",
			valueGetter: ({ row }) => row.username,
			renderCell: ({ row, value }) => (
				<Box sx={{ display: "flex" }}>
					<Image
						src={row.avatar}
						alt={value}
						title={value}
						width="24px"
						height="24px"
						sx={{ borderRadius: "50%" }}
					/>
					&nbsp;
					<MaterialLink variant="body1" underline="none" component={Link} to={row._id}>
						{value}
					</MaterialLink>
				</Box>
			),
		},
		{
			field: "Assigned Workload",
			minWidth: 220,
			flex: 1,
			valueGetter: ({ row }) => row.workload,
			sortComparator: numberSmallToLarge((v) => v[1]),
			getApplyQuickFilterFn: undefined,
			renderCell: ({ value }) => (
				<Typography>
					{`${pluralize("task", value[0], true)} (${pluralize("point", Number(value[1].toFixed(2)), true)})`}
				</Typography>
			),
		},
		{
			field: "Tasks Completed",
			minWidth: 220,
			flex: 1,
			valueGetter: ({ row }) => row.completed,
			sortComparator: numberSmallToLarge((v) => v[0]),
			getApplyQuickFilterFn: undefined,
			renderCell: ({ value }) => (
				<Typography>
					{`${pluralize("task", value[0], true)} (${pluralize("point", Number(value[1].toFixed(2)), true)})`}
				</Typography>
			),
		},
		{
			field: "Dev Stats",
			minWidth: 200,
			flex: 1,
			valueGetter: ({ row }) => ({ commits: row.commits, additions: row.additions, deletions: row.deletions }),
			valueFormatter: ({ value }) => Object.values(value),
			sortComparator: numberSmallToLarge((v) => v.commits),
			getApplyQuickFilterFn: undefined,
			renderCell: ({ value }) => (
				<Grid container direction="column" justifyContent="center" align="center" style={{ padding: "0 5%" }}>
					<Grid item><Typography>{pluralize("commit", value.commits, true)}</Typography></Grid>
					<Grid item container justifyContent="center" align="center">
						<Grid item xs>
							<Typography sx={{ color: "green.700" }}>{`${value.additions}++`}</Typography>
						</Grid>
						<Grid item xs>
							<Typography sx={{ color: "red.500" }}>{`${value.deletions}--`}</Typography>
						</Grid>
					</Grid>
				</Grid>
			),
		},
	], []);

	return (
		<Grid container direction="column" justifyContent="center" alignItems="center" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
			<Grid item container justifyContent="center" spacing={3} m={-1.5} sx={{ "> .MuiGrid-item": { p: 1.5 } }} xs={12}>
				<Grid item xs><Tile row={2} number={metrics.averageTasksClosedPerDay} content="tasks delivered per day" /></Grid>
				<Grid item xs><Tile row={2} number={metrics.tasksPerMember} content="tasks assigned per member" /></Grid>
				<Grid item xs><Tile row={2} number={metrics.remainingWorkloadPerMember} content="workload per member (points)" /></Grid>
				<Grid item xs><Tile row={2} number={metrics.commitsPerMember} content="mean commits per member" /></Grid>
			</Grid>
			<Grid item container textAlign="center" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }} xs={12}>
				<Grid item xs={12}><TeamProjectBeat projectId={projectId} /></Grid>
			</Grid>
			<Grid item container textAlign="center" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }} xs={12}>
				<Grid item xs={12} style={{ width: "100%" }}>
					<DataTable
						rows={members}
						loading={isLoading}
						columns={tableColumns}
						initialState={{ sorting: { sortModel: [{ field: "Tasks Completed", sort: "desc" }] }, pagination: { paginationModel: { page: 0 } } }}
						rowHeight={70}
					/>
				</Grid>
			</Grid>
		</Grid>
	);
};

ProjectCollaborators.propTypes = { projectId: PropTypes.string };

export default memo(ProjectCollaborators);
