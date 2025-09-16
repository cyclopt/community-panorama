import PropTypes from "prop-types";
import { memo, useState } from "react";
import { Grid, Typography, Popper, Paper, Avatar, MenuItem, Divider, Badge, ClickAwayListener, Fade } from "@mui/material";
import { ArrowDropDown } from "@mui/icons-material";
import { useTheme, styled } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";

import { dayjs } from "../utils/index.js";

import Tooltip from "./Tooltip.jsx";

const infoPopUpWidth = 15;
const minBar = 0.7;

const StyledBadge = styled(Badge)(() => ({
	"& .MuiBadge-badge": {
		right: 3,
	},
}));

const ProgressBar = ({ totalColumnPoints, doneColumnPoints, status, statuses, maxPoints, kanbanTheme }) => {
	const theme = useTheme();

	return (
		<div
			style={{
				width: `${((infoPopUpWidth - (statuses * minBar)) * (totalColumnPoints / maxPoints) + 0.7)}rem`,
				minWidth: `${minBar}rem`,
				height: `${minBar}rem`,
				opacity: (totalColumnPoints ? 1 : 0.2),
				position: "relative",
				margin: "2.5px",
				marginTop: "1px",
			}}
		>
			<div
				style={{
					width: "100%",
					height: "100%",
					borderRadius: "1rem",
					opacity: (totalColumnPoints ? 0.6 : 0.3),
					backgroundColor: ["Backlog"].includes(status) ? theme.palette[`workloadBacklog${kanbanTheme}`].main
						: ["Sprint Planning", "To Do"].includes(status) ? theme.palette[`workloadSprintPlanning${kanbanTheme}`].main
							: ["In Progress", "Open"].includes(status) ? theme.palette[`workloadInProgress${kanbanTheme}`].main
								: ["Delivered"].includes(status) ? theme.palette[`workloadDelivered${kanbanTheme}`].main
									: ["Closed", "Done", "Accepted"].includes(status) ? theme.palette[`workloadAccepted${kanbanTheme}`].main
										: theme.palette.grey[700],
				}}
			/>
			<div
				style={{
					width: `${(doneColumnPoints < totalColumnPoints
						? doneColumnPoints / totalColumnPoints
						: 1) * 100}%`,
					height: "100%",
					borderRadius: "1rem",
					opacity: (doneColumnPoints ? 1 : 0.3),
					position: "absolute",
					top: 0,
					backgroundColor: ["Backlog"].includes(status) ? theme.palette[`workloadBacklog${kanbanTheme}`].main
						: ["Sprint Planning", "To Do"].includes(status) ? theme.palette[`workloadSprintPlanning${kanbanTheme}`].main
							: ["In Progress", "Open"].includes(status) ? theme.palette[`workloadInProgress${kanbanTheme}`].main
								: ["Delivered"].includes(status) ? theme.palette[`workloadDelivered${kanbanTheme}`].main
									: ["Closed", "Done", "Accepted"].includes(status) ? theme.palette[`workloadAccepted${kanbanTheme}`].main
										: theme.palette.grey[700],
				}}
			/>
		</div>
	);
};

ProgressBar.propTypes = {
	totalColumnPoints: PropTypes.number,
	doneColumnPoints: PropTypes.number,
	status: PropTypes.string,
	statuses: PropTypes.number,
	maxPoints: PropTypes.number,
	kanbanTheme: PropTypes.string,
};

const CollaboratorsPointInfoBar = ({ team, tasks, filtered, columnOptions, kanbanTheme, sprint, selectedEpic }) => {
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const [anchorEl, setAnchorEl] = useState();

	const tasksPerMember = team.map((member) => {
		const memberTasks = tasks.filter((task) => !task.closed
			&& task.assignees
				.some((assignee) => assignee._id === member.user._id)
			&& !["Archived", "Backlog", "Accepted"].includes(task.status)
			&& filtered?.every((filter) => {
				if (filter.id === "updatedAt") {
					if (filter.value.value === "all") return true;
					const from = dayjs().startOf("day").subtract(Number(filter.value.value.split(" ")[0]), filter.value.value.split(" ")[1]);
					return dayjs(task.updatedAt).isAfter(from);
				}

				if (filter.id === "closed") return filter.value || !task.closed;
				if (filter.id === "epic") return selectedEpic ? selectedEpic.tasks?.some((t) => t._id === task._id) : true;
				return filter.value === task[filter.id];
			})
			&& (task.status === "Sprint Planning"
				? sprint?.title === "Default"
					? true
					: task.sprint === sprint?._id
				: true));
		const totalPoints = memberTasks
			.reduce((accumulator, object) => accumulator + object.points.total, 0);
		const donePoints = memberTasks
			.reduce((accumulator, object) => accumulator + object.points.done, 0);

		return {
			id: member.user._id,
			username: member.user.username,
			avatar: member.user.avatar,
			totalPoints,
			donePoints,
			pointsPerColumn: columnOptions.filter((stat) => !["Archived", "Backlog", "Accepted"].includes(stat))
				.map((status) => {
					const totalColumnPoints = memberTasks.filter((mTask) => mTask.status === status)
						.reduce((accumulator, object) => accumulator + object.points.total, 0);
					const doneColumnPoints = memberTasks.filter((mTask) => mTask.status === status)
						.reduce((accumulator, object) => accumulator + object.points.done, 0);
					return ({ status, totalColumnPoints, doneColumnPoints });
				}),
		};
	});

	const maxPoints = Math.abs(tasksPerMember?.sort((a, b) => (a.totalPoints < b.totalPoints ? 1 : -1))[0].totalPoints);

	return (
		<ClickAwayListener onClickAway={() => setAnchorEl(null)}>
			<MenuItem
				disableRipple
				aria-haspopup="true"
				aria-owns={anchorEl ? "simple-menu" : undefined}
				sx={{
					border: 1,
					borderRadius: "0.5rem",
					borderColor: "primary.main",
					textTransform: "none",
					paddingRight: "4px",
					paddingLeft: "4px",
					minHeight: "auto",
				}}
				onClick={(e) => setAnchorEl(e.currentTarget)}
			>
				<Grid container m={0} flexDirection="row" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					{"Collaborators"}
					<ArrowDropDown />
				</Grid>
				<Popper
					transition
					open={Boolean(anchorEl)}
					id="simple-menu"
					anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
					transformOrigin={{ vertical: "top", horizontal: "center" }}
					anchorEl={anchorEl}
					sx={{
						borderRadius: "8px",
						boxShadow: (t) => t.popUpsShadows,
					}}
				>
					{({ TransitionProps }) => (
						<Fade {...TransitionProps} timeout={150}>
							<Paper m={0} pr={2} sx={{ overflowY: "auto", maxHeight: "20rem" }}>
								<Grid container p={0.5} minWidth={`${infoPopUpWidth}rem`} direction="column" sx={{ gridAutoFlow: "column", pointerEvents: "auto" }}>
									{tasksPerMember
										?.sort((a, b) => (a?.totalPoints > b?.totalPoints ? -1 : 1))
										?.map((t, tInd) => (
											<div
												key={`${tInd}_${t.id}`}
											>
												<Grid
													container
													direction="column"
													my={1}
												>
													<Grid container item pl={1} pr={1} pb={0.5} direction="row" sm={12} justifyContent="space-between" alignItems="center">
														<Grid
															item
															mb={1}
															sm={7}
															display="flex"
															alignItems="center"
															sx={{ cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "h4" }}
															onClick={() => navigate(`${pathname}/collaborators/${t.id}`.replace("/kanban/", "/"))}
														>
															<Avatar
																sx={{ maxWidth: "2rem", maxHeight: "2rem" }}
																alt={t.username}
																title={t.username}
																src={t.avatar}
															/>
															<Typography
																ml={1}
																variant="subtitle"
															>
																{t.username}
															</Typography>
														</Grid>
														<Grid item container mb={1} direction="row-reverse" display="flex" sm={5}>
															<Tooltip
																placement="top"
																title="total"
															>
																<Typography>
																	{t.totalPoints}
																</Typography>
															</Tooltip>
															{"/"}
															<Tooltip
																placement="top"
																title="burned"
															>
																<Typography>
																	{t.donePoints}
																</Typography>
															</Tooltip>
														</Grid>
													</Grid>
													<Grid container item pb={0.5} pl={1} pr={1} direction="row">
														{t.pointsPerColumn.map((column) => (
															<Tooltip
																key={column.status}
																arrow
																title={`${column.status}: ${column.doneColumnPoints - column.totalColumnPoints > 0
																	? `${column.doneColumnPoints - column.totalColumnPoints} exceeding`
																	: column.doneColumnPoints - column.totalColumnPoints < 0
																		? `${Math.abs(column.doneColumnPoints - column.totalColumnPoints)} remaining`
																		: 0} points`}
																ml={4}
																mr={4}
															>
																<StyledBadge
																	invisible={column.doneColumnPoints <= column.totalColumnPoints}
																	overlap="circular"
																	color="error"
																	variant="dot"
																>
																	<ProgressBar
																		totalColumnPoints={column.totalColumnPoints}
																		doneColumnPoints={column.doneColumnPoints}
																		status={column.status}
																		statuses={t.pointsPerColumn.length}
																		maxPoints={maxPoints}
																		kanbanTheme={kanbanTheme}
																	/>
																</StyledBadge>
															</Tooltip>
														))}
													</Grid>
												</Grid>
												{(tInd !== tasksPerMember.length - 1) && <Divider />}
											</div>
										))}
								</Grid>
							</Paper>
						</Fade>
					)}
				</Popper>
			</MenuItem>
		</ClickAwayListener>
	);
};

CollaboratorsPointInfoBar.propTypes = {
	tasks: PropTypes.array,
	filtered: PropTypes.array,
	team: PropTypes.array,
	columnOptions: PropTypes.array,
	kanbanTheme: PropTypes.string,
	selectedEpic: PropTypes.object,
	sprint: PropTypes.object,
};

export default memo(CollaboratorsPointInfoBar);
