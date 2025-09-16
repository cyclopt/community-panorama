import { useCallback, useEffect, useMemo, memo } from "react";
import { Grid, Typography, Button, Card, CardContent, Avatar, Divider, Box, Chip, LinearProgress } from "@mui/material";
import { useTheme, styled } from "@mui/material/styles";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { PostAdd, Remove, Reply } from "@mui/icons-material";
import { shallow } from "zustand/shallow";
import { dateNewToOld, numberSmallToLarge } from "@iamnapo/sort";
import average from "@iamnapo/average";
import { Image } from "mui-image";

import useLocalStorage from "../../utils/use-local-storage.js";
import useGlobalState from "../../use-global-state.js";
import MemberMetricTile from "../../components/MemberMetricTile.jsx";
import MemberEfficiency from "../../components/MemberEfficiency.jsx";
import MemberWorkload from "../../components/MemberWorkload.jsx";
import DataTable from "../../components/DataTable.jsx";
import TimeLine from "../../components/Timeline.jsx";
import { sum, useSnackbar, dayjs } from "../../utils/index.js";
import { useMemberMetrics, useProjectOverview5ForMember, useProjectOverview6ForMember } from "../../api/index.js";

const classes = {
	card: "MemberProfile-card",
	statLabel: "MemberProfile-statLabel",
	backToAll: "MemberProfile-backToAll",
};

const Root = styled("div")(({ theme }) => ({
	[`& .${classes.card}`]: {
		borderRadius: theme.shape.borderRadius,
		borderWidth: theme.spacing(0.3),
		boxShadow: theme.shadows[4],
		minWidth: "85%",
	},
	[`& .${classes.statLabel}`]: {
		color: theme.palette.grey[500],
		margin: 0,
		fontWeight: "bold",
		alignSelf: "center",
		textAlign: "center",
	},
	[`& .${classes.backToAll}`]: {
		"&:hover": {
			color: theme.palette.common.white,
		},
	},
}));

const DevOpsProgress = styled(LinearProgress)(({ theme }) => ({
	height: theme.spacing(1.5),
	borderRadius: theme.shape.borderRadius,
	backgroundColor: theme.palette.secondary.main,
}));

const MemberProfile = () => {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { projectid: projectId, collaboratorid: collaboratorId } = useParams();
	const { error } = useSnackbar();
	const { setUserName, setShowGlobalLoading } = useGlobalState(
		useCallback((e) => ({ setUserName: e.setUserName, setShowGlobalLoading: e.setShowGlobalLoading }), []),
		shallow,
	);
	const { metrics: member = {}, isLoading, isError } = useMemberMetrics(projectId, collaboratorId);
	const { overview = { assigned: [], opened: [] }, isError: isError2 } = useProjectOverview5ForMember(projectId, member.username);
	const { overview: overview2 = [], isError: isError3 } = useProjectOverview6ForMember(projectId, member.username);
	if (isError || isError2 || isError3) error();

	useEffect(() => {
		if (isError || isError2 || isError3) error();
	}, [error, isError, isError2, isError3]);

	const theme = useTheme();
	const { kanbanTheme } = useLocalStorage(useCallback((e) => ({
		kanbanTheme: e?.kanbanTheme,
	}), []), shallow);

	const values = useMemo(() => {
		const contributions = member.contributionsPerDay?.map((e) => e[1]) || [];
		return {
			values: member.contributionsPerDay?.reduce((acc, cur) => ({
				...acc,
				[cur[0]]: 1 + (6 * (cur[1] / Math.max(...contributions))),
			}), {}) || {},
			scale: Math.max(...contributions) / 6,
		};
	}, [member.contributionsPerDay]);

	useEffect(() => {
		setShowGlobalLoading(!member.username);
		setUserName(member.username);
	}, [member.username, setShowGlobalLoading, setUserName]);

	const x = new Set();
	const x1 = new Set();
	const x2 = new Set();
	const yCommits = [];
	const yTasks = [];
	const yPoints = [];
	const yOpened = [];
	const arr = [...overview.assigned].reverse();
	for (const [ind, [rawDay, value]] of arr.entries()) {
		const day = dayjs(rawDay);
		if (x1.has(day.startOf("week").toISOString())) {
			yTasks[yTasks.length - 1] = [...yTasks.at(-1), ...value[0]];
			for (const [ind2, taskNumber] of value[0].entries()) {
				if (!arr[ind - 1][1][0].includes(taskNumber)) {
					yPoints[yPoints.length - 1] = [...yPoints.at(-1), value[1][ind2]];
				}
			}
		} else {
			x1.add(day.startOf("week").toISOString());
			yTasks.push(value[0]);
			yPoints.push(value[1]);
		}
	}

	for (const [rawDay, value] of [...overview.opened].reverse()) {
		const day = dayjs(rawDay);
		if (x2.has(day.startOf("week").toISOString())) {
			yOpened[yOpened.length - 1] = [...yOpened.at(-1), ...value[0]];
		} else {
			x2.add(day.startOf("week").toISOString());
			yOpened.push(value[0]);
		}
	}

	for (const [rawDay, value] of [...overview2].reverse()) {
		const day = dayjs(rawDay);
		if (x.has(day.startOf("week").toISOString())) {
			yCommits[yCommits.length - 1] += value.length;
		} else {
			x.add(day.startOf("week").toISOString());
			yCommits.push(value.length);
		}
	}

	const latest5CommitsTableColumns = useMemo(() => [
		{
			field: "Commit Message",
			minWidth: 200,
			flex: 1,
			align: "left",
			valueGetter: ({ row }) => row.message,
		},
		{
			field: "Authored At",
			minWidth: 180,
			getApplyQuickFilterFn: undefined,
			type: "date",
			valueGetter: ({ row }) => (row?.authoredAt ? new Date(row.authoredAt) : null),
			renderCell: ({ value }) => (value ? <Typography>{dayjs(value).format("DD MMM YY, hh:mm a")}</Typography> : null),
		},
		{
			field: "Dev Stats",
			minWidth: 180,
			flex: 0.5,
			valueGetter: ({ row }) => ({ additions: row.additions, deletions: row.deletions }),
			valueFormatter: ({ value }) => Object.values(value),
			sortComparator: numberSmallToLarge((v) => v.additions + v.deletions),
			getApplyQuickFilterFn: undefined,
			renderCell: ({ value: { additions, deletions } }) => (
				<Grid container justifyContent="center" align="center" style={{ padding: "0 5%" }}>
					<Grid item style={{ marginRight: "5%" }}>
						<Typography style={{ color: theme.palette.green[700] }}>{`${additions}++`}</Typography>
					</Grid>
					<Grid item><Typography style={{ color: theme.palette.red[500] }}>{`${deletions}--`}</Typography></Grid>
				</Grid>
			),
		},
	], [theme]);

	const latest5TasksAssignedTableColumns = useMemo(() => [
		{
			field: "Name",
			flex: 1,
			align: "left",
			valueGetter: ({ row }) => row.title,
		},
		{
			field: "Status",
			flex: 0.5,
			valueGetter: ({ row }) => row.status,
			renderCell: ({ value }) => {
				let color = theme.palette.grey[700];
				if (["Backlog"].includes(value)) color = theme.palette[`workloadBacklog${kanbanTheme}`].main;
				if (["To Do", "Sprint Planning"].includes(value)) color = theme.palette[`workloadSprintPlanning${kanbanTheme}`].main;
				if (["Open", "In Progress"].includes(value)) color = theme.palette[`workloadInProgress${kanbanTheme}`].main;
				if (["Delivered"].includes(value)) color = theme.palette[`workloadDelivered${kanbanTheme}`].main;
				if (["Closed", "Done", "Accepted"].includes(value)) color = theme.palette[`workloadAccepted${kanbanTheme}`].main;
				return <Typography style={{ color }}>{value}</Typography>;
			},
		},
	], [kanbanTheme, theme]);

	return (
		<Root>
			<Grid container direction="row" justifyContent="flex-start" spacing={3} m={-1.5} mb={1} sx={{ "> .MuiGrid-item": { p: 1.5 } }}>
				<Grid item>
					<Button
						variant="contained"
						component={Link}
						size="medium"
						style={{ justifySelf: "flex-start" }}
						to={pathname.split("/").slice(0, -1).join("/")}
						className={classes.backToAll}
						startIcon={<Reply />}
					>
						{"back to all collaborators"}
					</Button>
				</Grid>
			</Grid>
			<Grid container direction="row" justifyContent="center" spacing={2} m={-1} mb={1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
				<Grid item md xs={12} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
					<Card className={classes.card}>
						<Grid container direction="row" justifyContent="center" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
							<Grid item>
								<CardContent>
									<Image
										src={member.avatar}
										alt={member.username}
										title={member.username}
										width="96px"
										height="96px"
										sx={{
											margin: "auto",
											borderRadius: "50%",
											borderWidth: 0.3,
											borderStyle: "solid",
											borderColor: "secondary.main",
											display: "flex",
										}}
									/>
									<Typography variant="h6" color="primary">{member.username}</Typography>
								</CardContent>
							</Grid>
							<Grid item>
								<Grid container direction="column" justifyContent="center" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
									<Grid item>
										<Box sx={{ p: 2, flex: "auto" }}>
											<Typography className={classes.statLabel} style={{ flex: "auto" }}>
												{"Project Role: "}
												{Object.prototype.hasOwnProperty.call(member, "commits") && (
													(member.devPoints || 0) / ((member.devPoints || 1) + (member.opsPoints || 1)) > 0.4
														? (member.devPoints || 0) / ((member.devPoints || 1) + (member.opsPoints || 1)) < 0.6
															? (
																<Chip
																	label="DevOps"
																	avatar={<Avatar component="span" style={{ backgroundColor: "white" }}>{"DO"}</Avatar>}
																	component="span"
																	style={{ backgroundColor: "#0097AD" }}
																/>
															)
															: (<Chip label="Dev" avatar={<Avatar component="span">{"D"}</Avatar>} component="span" color="primary" />)
														: (<Chip label="Ops" avatar={<Avatar component="span">{"O"}</Avatar>} component="span" color="secondary" />)
												)}
											</Typography>
										</Box>
									</Grid>
									<Grid item>
										<Box sx={{ p: 2, flex: "auto", display: "flex" }}>
											<Typography className={classes.statLabel}>{"Dev"}</Typography>
											<Box sx={{ p: 1, flex: "auto" }}>
												<DevOpsProgress
													variant="determinate"
													value={((member.devPoints || 0) / ((member.devPoints || 1) + (member.opsPoints || 1))) * 100}
												/>
											</Box>
											<Typography className={classes.statLabel}>{"Ops"}</Typography>
										</Box>
									</Grid>
								</Grid>
							</Grid>
							<Grid item style={{ width: "80%" }}>
								<TimeLine {...values} />
							</Grid>
						</Grid>
						<Divider light />
						<Grid container direction="row" justifyContent="center" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
							<Grid item xs={6}>
								<Box sx={{ p: 2, textAlign: "center" }}>
									<Typography className={classes.statLabel}>{"Languages"}</Typography>
									{(member.languages || []).map((lang, ind) => (
										<Chip key={`key_${ind}`} label={lang} color="default" style={{ margin: theme.spacing(0.25) }} />
									))}
								</Box>
							</Grid>
							<Grid item xs={6}>
								<Box sx={{ p: 2, textAlign: "center" }}>
									<Typography className={classes.statLabel}>{"Upcoming Deadlines"}</Typography>
									{member.deadlines?.length > 0 ? (
										<>
											<Typography style={{ fontWeight: "bold", display: "inline" }}>{member.deadlines.length}</Typography>
											<Typography
												style={{ display: "inline" }}
											>
												{` (closest ${dayjs(member.deadlines[0].dueDate).fromNow()})`}
											</Typography>
										</>
									) : (<Typography><Remove style={{ fontSize: "inherit" }} /></Typography>)}
								</Box>
							</Grid>
						</Grid>
					</Card>
				</Grid>
				<Grid item xs style={{ display: "flex" }}>
					<Grid container direction="row" justifyContent="center" spacing={2}>
						<Grid item xs={6}>
							<MemberMetricTile
								title="points assigned"
								current={member.workload?.[1]}
								currentText="currently"
								average={Number(average(yPoints, { get: sum }).toFixed(2))}
							/>
						</Grid>
						<Grid item xs={6}>
							<MemberMetricTile
								title="tasks opened"
								current={yOpened.map((e) => new Set(e).size).at(-1)}
								currentText="this week"
								average={Number(average(yOpened, { get: (v) => new Set(v).size }).toFixed(2))}
							/>
						</Grid>
						<Grid item xs={6}>
							<MemberMetricTile
								title="tasks completed"
								current={member.completed?.[0]}
								average={Number(average(yTasks, { get: (v) => new Set(v).size }).toFixed(2))}
							/>
						</Grid>
						<Grid item xs={6}>
							<MemberMetricTile
								title="commits"
								current={member.commits}
								average={Number(average(yCommits).toFixed(2))}
							/>
						</Grid>
					</Grid>
				</Grid>
			</Grid>
			<Grid container direction="row" justifyContent="flex-end" spacing={3} m={-1.5} mb={1} sx={{ "> .MuiGrid-item": { p: 1.5 } }}>
				<Grid item>
					<Button
						variant="contained"
						size="medium"
						style={{ justifySelf: "flex-end" }}
						startIcon={<PostAdd />}
						onClick={() => navigate(
							pathname
								.replace("collaborators", "management")
								.split("/")
								.slice(0, -1)
								.join("/"),
							{ state: { assignee: member.username } },
						)}
					>
						{`${member.username ? `${member.username}’s ` : ""}Tasks`}
					</Button>
				</Grid>
			</Grid>
			<Grid container direction="row" justifyContent="center" alignItems="stretch" textAlign="center" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
				<Grid item xs={12} md={6} style={{ height: "100%" }}>
					<Typography gutterBottom variant="h5">{"Latest 5 Commits"}</Typography>
					<DataTable
						hideFooter
						rows={member?.latest5Commits}
						loading={isLoading}
						columns={latest5CommitsTableColumns}
						initialState={{
							pagination: { paginationModel: { pageSize: 5, page: 0 } },
							sorting: { sortModel: [{ field: "Authored At", sort: "desc" }] },
						}}
						sx={{ "& .MuiDataGrid-row--lastVisible": {
							borderBottomLeftRadius: (t) => `${t.shape.borderRadius}px`,
							borderBottomRightRadius: (t) => `${t.shape.borderRadius}px`,
						} }}
					/>
				</Grid>
				<Grid item xs={12} md={6} style={{ height: "100%" }}>
					<Typography gutterBottom variant="h5">{"Latest 5 Tasks Assigned"}</Typography>
					<DataTable
						hideFooter
						rows={[...member?.latest5TasksAssigned || []].sort(dateNewToOld((v) => new Date(v.updatedAt)))}
						loading={isLoading}
						columns={latest5TasksAssignedTableColumns}
						initialState={{ pagination: { paginationModel: { page: 0, pageSize: 5 } } }}
						sx={{ "& .MuiDataGrid-row--lastVisible": {
							borderBottomLeftRadius: (t) => `${t.shape.borderRadius}px`,
							borderBottomRightRadius: (t) => `${t.shape.borderRadius}px`,
						} }}
					/>
				</Grid>
				<Grid item xs={12} md={6}>
					<MemberWorkload projectId={projectId} memberUsername={member.username} />
				</Grid>
				<Grid item xs={12} md={6}>
					<MemberEfficiency projectId={projectId} memberUsername={member.username} />
				</Grid>
			</Grid>
		</Root>
	);
};

export default memo(MemberProfile);
