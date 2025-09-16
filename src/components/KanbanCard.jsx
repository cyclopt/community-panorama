import { useState, memo, useCallback } from "react";
import { styled, useTheme } from "@mui/material/styles";
import PropTypes from "prop-types";
import {
	Typography,
	Grid,
	Paper,
	Box,
	LinearProgress,
	Menu,
	MenuItem,
	IconButton,
	Divider,
	Popover,
	Chip,
	Link as MaterialLink,
} from "@mui/material";
import { ExpandMore, ChevronRight, Info, History, Done, EventAvailable, Update, PushPin, OpenInNew, GitHub, Block, NotificationsActive } from "@mui/icons-material";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { shallow } from "zustand/shallow";
import { Image } from "mui-image";

import useLocalStorage from "../utils/use-local-storage.js";
import { dayjs, capitalize, POSSIBLE_COLUMNS, useSnackbar } from "../utils/index.js";
import defaultAvatar from "../assets/images/cyclopt.png";

import AzureIcon from "./AzureIcon.jsx";
import Tooltip from "./Tooltip.jsx";

const classes = {
	root1: "KanbanCard-root1",
	leftIcon: "KanbanCard-leftIcon",
	root: "KanbanCard-root",
	bar: "KanbanCard-bar",
	determinate: "KanbanCard-determinate",
	iconButton: "KanbanCard-iconButton",
	caption: "KanbanCard-caption",
	chip: "KanbanCard-chip",
};

const StyledPaper = styled(Paper)(({ theme }) => ({
	[`&.${classes.root1}`]: {
		height: "100%",
		borderRadius: theme.shape.borderRadius,
		width: "350px",
		backgroundColor: "rgba(255, 255, 255, 0.93)",
		padding: theme.spacing(1),
		marginBottom: theme.spacing(1),
		borderWidth: theme.spacing(0.2),
		borderStyle: "solid",
		borderColor: "transparent",
		boxShadow: theme.shadows[4],
		color: theme.palette.common.black,
		cursor: "pointer",
	},
	[`& .${classes.leftIcon}`]: {
		marginRight: theme.spacing(1),
	},
	[`& .${classes.root}`]: {
		height: theme.spacing(2),
	},
	[`& .${classes.bar}`]: {
		borderRadius: theme.shape.borderRadius,
		backgroundColor: theme.palette.secondary.main,
	},
	[`& .${classes.determinate}`]: {
		borderRadius: theme.shape.borderRadius,
		backgroundColor: theme.palette.grey[300],
		width: "7rem",
	},
	[`& .${classes.iconButton}`]: {
		padding: 0,
	},
	[`& .${classes.caption}`]: {
		wordWrap: "break-word",
		whiteSpace: "normal",
		display: "flex",
		alignItems: "center",
		marginRight: "10px",
	},
	[`& .${classes.chip}`]: {
		marginRight: theme.spacing(0.5),
		marginTop: theme.spacing(0.5),
		backgroundColor: theme.palette.grey.light,
	},
}));

const VerticalLine = styled(Box)(({ theme, color, isSelected, hasSelection }) => ({
	width: "10px",
	height: "10px",
	borderRadius: "50%",
	margin: "2px",
	backgroundColor: color || theme.palette.primary.main,
	cursor: "pointer",
	opacity: hasSelection ? (isSelected ? 1 : 0.5) : 1, // Lower opacity if not selected
	boxShadow: isSelected ? `0 0 10px ${color || theme.palette.primary.main}` : "none", // Glow effect if selected
}));

const VerticalLinesContainer = ({ epics = [], onClick = () => {}, selectedEpicId = null }) => (
	<Box
		sx={{
			position: "absolute",
			top: -4,
			right: 0,
			width: "200px",
			display: "ruby",
			direction: "rtl",
			cursor: "pointer",
			overflowX: "auto !important", // Enable horizontal scroll
			overflowY: "hidden !important", // Hide vertical scroll if any
			pointerEvents: "auto",
			whiteSpace: "nowrap", // Prevent the items from wrapping
		}}
	>
		{epics.map((epic, index) => (
			<Tooltip key={index} title={epic.title}>
				<VerticalLine
					color={epic.color}
					isSelected={selectedEpicId === epic._id}
					hasSelection={selectedEpicId !== null}
					onClick={(e) => { e.stopPropagation(); onClick(epic); }}
				/>
			</Tooltip>
		))}
	</Box>
);

VerticalLinesContainer.propTypes = {
	epics: PropTypes.array,
	onClick: PropTypes.func,
	selectedEpicId: PropTypes.string,
};

const KanbanCard = (props) => {
	const {
		className,
		id,
		dueDate,
		status,
		title = "",
		tags = [],
		done = 0,
		total = 1,
		ratio = 0,
		assignees = [],
		reviewers = [],
		external = false,
		blocked = false,
		blockedBy = {},
		metadata = {},
		onClickViewEdit = () => {},
		onClickReopen = () => {},
		onClickClose = () => {},
		onClickPin = () => {},
		onClickSubscribe = () => {},
		onSubmitUpdateTaskStatus = () => {},
		onClickEpic = () => {},
		closed = false,
		pinned = false,
		viewerIsSubscribed = false,
		priority = "none",
		updatedAt = new Date().toISOString(),
		project = null,
		sprint = null,
		showProject = null,
		showSprint = null,
		selectedEpicId = null,
		epics = [],
	} = props;
	const [anchorEl, setAnchorEl] = useState(null);
	const [anchorEl2, setAnchorEl2] = useState(null);
	const { error } = useSnackbar();
	const theme = useTheme();
	const { kanbanTheme, currentSprint } = useLocalStorage(useCallback((e) => ({
		kanbanTheme: e?.kanbanTheme,
		currentSprint: e?.currentSprint,
	}), []), shallow);

	return (
		<StyledPaper square elevation={0} className={clsx(classes.root1, className)} sx={{ position: "relative" }} onClick={onClickViewEdit}>
			{epics.length > 0
			&& <VerticalLinesContainer epics={epics} selectedEpicId={selectedEpicId} onClick={(e) => onClickEpic(e)} />}
			<Grid container direction="row" justifyContent="space-between" alignItems="center" sx={{ opacity: Number(`${closed ? 0.7 : 1}`) }}>
				<Grid item xs={10} style={{ wordWrap: "break-word", whiteSpace: "normal" }}>
					<Box display="flex" flexDirection="column" alignItems="flex-start" justifyContent="center">
						{(showProject && project) && (
							<Chip color="primary" size="small" style={{ margin: "0.5rem", marginTop: "0", fontStyle: "italic" }} label={project.name} />
						)}
						{(showSprint && sprint) && (
							<Chip
								size="small"
								sx={{ m: 1, mt: 0, mb: 2, fontStyle: "italic" }}
								label={sprint.title}
							/>
						)}
					</Box>
					<Box sx={{ display: "flex", alignItems: "center" }}>
						<Tooltip style={{ width: "auto", color: theme.palette.grey.light }} title="Get updates for this task" enterDelay={1000} enterNextDelay={1000}>
							<IconButton
								className={classes.iconButton}
								onClick={(e) => {
									e.stopPropagation();
									setAnchorEl(null);
									onClickSubscribe();
								}}
							>
								<NotificationsActive sx={{ ...(viewerIsSubscribed && { color: "primary.main" }) }} />
							</IconButton>
						</Tooltip>
						{external
							? (
								<Tooltip title={`Fetched from ${metadata?.provider || "github"}.`}>
									<span>
										<IconButton disabled style={{ padding: "3px" }} size="small" className={classes.iconButton}>
											{metadata?.provider === "azure"
												? <AzureIcon fontSize="inherit" />
												: <GitHub fontSize="inherit" />}
										</IconButton>
									</span>
								</Tooltip>
							)
							: (
								<Tooltip title="Pin task" enterDelay={1000} enterNextDelay={1000}>
									<IconButton
										className={classes.iconButton}
										style={{ marginTop: "2px", color: theme.palette.grey.light }}
										onClick={(e) => {
											e.stopPropagation();
											setAnchorEl(null);
											onClickPin();
										}}
									>
										<PushPin sx={{ ...(pinned && { color: "primary.main" }) }} />
									</IconButton>
								</Tooltip>
							)}
						<Typography style={{ overflow: "hidden" }}>
							{title}
						</Typography>
						{blocked && (
							<Tooltip
								title={(
									<Typography>
										{"This task is blocked by task "}
										<MaterialLink
											component={Link}
											to={`?id=${blockedBy._id}`}
											sx={{ color: "common.white", textDecoration: "underline" }}
											onClick={(e) => e.stopPropagation()}
										>
											{`${blockedBy.title.slice(0, 20)}${blockedBy.title.length > 20 && "..."}`}
										</MaterialLink>
										{blockedBy.closed ? ", which is closed" : ""}
										{"."}
									</Typography>
								)}
							>
								<span>
									<IconButton disabled style={{ padding: "3px" }} size="small">
										<Block fontSize="inherit" sx={{ color: blockedBy.closed ? "green.500" : "red.500" }} />
									</IconButton>
								</span>
							</Tooltip>
						)}
					</Box>
				</Grid>
				<Grid item xs={2} sx={{ display: "flex", justifyContent: "flex-end" }}>
					<IconButton
						aria-controls="task-menu"
						aria-haspopup="true"
						sx={{ p: 0, mt: 1 }}
						onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
					>
						<ExpandMore color="secondary" />
					</IconButton>
					<Menu
						keepMounted
						id="simple-menu"
						anchorEl={anchorEl}
						open={Boolean(anchorEl)}
						onClose={(e) => { e.stopPropagation(); setAnchorEl(null); }}
					>
						<MenuItem onClick={(e) => { e.stopPropagation(); setAnchorEl(null); onClickViewEdit(); }}>
							<Info color="primary" className={classes.leftIcon} />
							{`View${external ? "" : " / Edit"}`}
						</MenuItem>
						<MenuItem
							component={Typography}
							aria-haspopup="true"
							aria-owns={anchorEl2 ? "simple-menu" : undefined}
							onMouseLeave={() => setAnchorEl2(null)}
							onClick={(e) => e.stopPropagation()}
							onMouseOver={(event) => {
								if (anchorEl2 !== event.currentTarget) {
									setAnchorEl2(event.currentTarget);
								}
							}}
						>
							<ChevronRight
								className={classes.leftIcon}
								style={{
									fill: ["Backlog"].includes(status) ? theme.palette[`workloadBacklog${kanbanTheme}`].main
										: ["Sprint Planning", "To Do"].includes(status) ? theme.palette[`workloadSprintPlanning${kanbanTheme}`].main
											: ["In Progress", "Open"].includes(status) ? theme.palette[`workloadInProgress${kanbanTheme}`].main
												: ["Delivered"].includes(status) ? theme.palette[`workloadDelivered${kanbanTheme}`].main
													: ["Closed", "Done", "Accepted"].includes(status) ? theme.palette[`workloadAccepted${kanbanTheme}`].main
														: theme.palette.grey[700],
								}}
							/>
							{"Move to"}
							<Popover
								disableRestoreFocus
								id="simple-menu"
								anchorOrigin={{ vertical: "top", horizontal: "right" }}
								transformOrigin={{ vertical: "top", horizontal: "left" }}
								anchorEl={anchorEl2}
								open={Boolean(anchorEl2)}
								sx={{
									pointerEvents: "none",
								}}
							>
								<Box sx={{ pointerEvents: "auto" }}>
									{[...POSSIBLE_COLUMNS.get(project?.kanban?.style ?? "default"), ...(project?.kanban.hasArchived ? ["Archived"] : []),
									].filter((stat) => stat !== status).map((stat, ind) => (
										<MenuItem
											key={`status_${id}_${ind}`}
											aria-owns={Boolean(anchorEl2)}
											value={stat}
											sx={{
												borderLeft: `${theme.spacing(1)} solid ${["Backlog"].includes(stat) ? theme.palette[`workloadBacklog${kanbanTheme}`].main
													: ["Sprint Planning", "To Do"].includes(stat) ? theme.palette[`workloadSprintPlanning${kanbanTheme}`].main
														: ["In Progress", "Open"].includes(stat) ? theme.palette[`workloadInProgress${kanbanTheme}`].main
															: ["Delivered"].includes(stat) ? theme.palette[`workloadDelivered${kanbanTheme}`].main
																: ["Closed", "Done", "Accepted"].includes(stat) ? theme.palette[`workloadAccepted${kanbanTheme}`].main
																	: theme.palette.grey[700]} !important`,
												cursor: external ? "default" : "pointer",
												backgroundColor: theme.palette.common.white,
											}}
											onClick={() => {
												setAnchorEl2(null);
												if (external) {
													error("This is an external task. You can edit it on GitHub.");
												} else if (status !== stat) {
													if (stat === "Sprint Planning") onSubmitUpdateTaskStatus(id, "Sprint Planning", currentSprint?.id);
													else onSubmitUpdateTaskStatus(id, stat);
												}
											}}
										>
											{stat}
										</MenuItem>
									))}
								</Box>
							</Popover>
						</MenuItem>
						{external ? null : closed
							? (
								<MenuItem onClick={(e) => { e.stopPropagation(); setAnchorEl(null); onClickReopen(); }}>
									<History color="secondary" className={classes.leftIcon} />
									{"Reopen"}
								</MenuItem>
							)
							: (
								<MenuItem onClick={(e) => { e.stopPropagation(); setAnchorEl(null); onClickClose(); }}>
									<Done color="secondary" className={classes.leftIcon} />
									{"Close"}
								</MenuItem>
							)}
						{external && (
							<MenuItem
								component={MaterialLink}
								href={metadata.url}
								target="_blank"
								rel="noopener noreferrer"
								onClick={(e) => { e.stopPropagation(); setAnchorEl(null); }}
							>
								<OpenInNew color="primary" className={classes.leftIcon} />
								{`View on ${capitalize(metadata?.provider || "github")}`}
							</MenuItem>
						)}

					</Menu>
				</Grid>
				<Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
				<Grid item xs={12}>
					<Box sx={{ display: "flex", justifyContent: "space-between" }}>
						<Typography variant="caption" className={classes.caption}>
							<Update sx={{ fontSize: "body1.fontSize" }} />
							&nbsp;
							{dayjs(updatedAt).fromNow()}
						</Typography>
						{priority !== "none" && (
							<Chip
								label={priority}
								variant="outlined"
								size="small"
								color={(() => {
									if (priority === "high") return "error";
									if (priority === "medium") return "warning";
									if (priority === "low") return "success";
									return "default";
								})()}
							/>
						)}
					</Box>
					{dueDate && (
						<Typography variant="caption" className={classes.caption}>
							<EventAvailable sx={{ fontSize: "body1.fontSize" }} />
							&nbsp;
							{`Task due: ${dayjs(dueDate).format("D MMM, YYYY")}`}
						</Typography>
					)}
				</Grid>
				<Grid item xs={12} mt={1}>
					<Typography variant="body2" style={{ wordWrap: "break-word", whiteSpace: "normal" }}>
						{tags.map((tag) => <Chip key={tag.title} className={classes.chip} label={tag.title} size="small" />)}
					</Typography>
				</Grid>
				<Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
				<Grid item container justifyContent="space-between" alignItems="center">
					<Grid item hidden={external || total === 0}>
						<Typography variant="body2" align="center">{`Points: ${done} / ${total}`}</Typography>
						<Box sx={{ position: "relative" }}>
							<LinearProgress
								className={classes.determinate}
								classes={{ root: classes.root, bar: classes.bar }}
								variant="determinate"
								color="secondary"
								value={Math.min(ratio, 100)}
							/>
							<Typography
								variant="body2"
								sx={{ position: "absolute", top: "50%", left: "80%", mt: -1.4, height: 2, ml: -2, fontWeight: 500 }}
							>
								{`${String(Math.min(ratio, 100)).padStart(3, "\u00A0")}%`}
							</Typography>
						</Box>
					</Grid>
					<Box sx={{ flexGrow: 1 }} />
					<Grid item sx={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap" }}>
						{reviewers.map(({ username, avatar }, ind) => (
							<Image
								key={`${username}_${ind}_${id}`}
								src={avatar}
								alt={username}
								title={`${username} (reviewer)`}
								width="24px"
								height="24px"
								wrapperStyle={{ margin: "0.2rem" }}
								sx={{
									borderRadius: "50%",
								}}
							/>
						))}
					</Grid>
					{reviewers.length > 0 && assignees.length > 0
						&& (
							<Grid item>
								<Divider orientation="vertical" sx={{ height: "25px", border: "1px solid rgba(0, 0, 0, 0.12)", width: "2px", background: "rgba(0, 0, 0, 0.12)" }} />
							</Grid>
						)}
					<Grid item sx={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap" }}>
						{assignees.map(({ username, avatar }, ind) => (
							<Image
								key={`${username}_${ind}_${id}`}
								src={avatar}
								alt={username}
								title={`${username} (assignee)`}
								width="24px"
								height="24px"
								wrapperStyle={{ margin: "0.2rem" }}
								sx={{
									borderRadius: "50%",
								}}
								onError={(e) => {
									e.target.src = defaultAvatar; // Handle load error gracefully
								}}
							/>
						))}
					</Grid>
				</Grid>
			</Grid>
		</StyledPaper>
	);
};

KanbanCard.propTypes = {
	className: PropTypes.string,
	selectedEpicId: PropTypes.string,
	id: PropTypes.string.isRequired,
	title: PropTypes.string,
	tags: PropTypes.array,
	dueDate: PropTypes.any,
	done: PropTypes.number,
	total: PropTypes.number,
	ratio: PropTypes.number,
	assignees: PropTypes.array,
	reviewers: PropTypes.array,
	external: PropTypes.bool,
	blocked: PropTypes.bool,
	blockedBy: PropTypes.object,
	metadata: PropTypes.object,
	onClickViewEdit: PropTypes.func,
	onClickReopen: PropTypes.func,
	onClickClose: PropTypes.func,
	onClickPin: PropTypes.func,
	onClickSubscribe: PropTypes.func,
	closed: PropTypes.bool,
	pinned: PropTypes.bool,
	viewerIsSubscribed: PropTypes.bool,
	priority: PropTypes.string,
	updatedAt: PropTypes.string,
	project: PropTypes.object,
	sprint: PropTypes.object,
	showProject: PropTypes.bool,
	showSprint: PropTypes.bool,
	status: PropTypes.string,
	onSubmitUpdateTaskStatus: PropTypes.func,
	onClickEpic: PropTypes.func,
	epics: PropTypes.array,
};

export default memo(KanbanCard);
