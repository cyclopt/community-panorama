import { useState, useEffect, useMemo, memo, useCallback } from "react";
import {
	Button,
	Typography,
	CircularProgress,
	Grid,
	Box,
	LinearProgress,
	IconButton,
	ToggleButtonGroup,
	ToggleButton,
	MenuItem,
	Divider,
	Link as MaterialLink,
} from "@mui/material";
import {
	PostAdd,
	Info,
	Done,
	EventAvailable,
	PushPin,
	OpenInNew,
	GitHub,
	Block,
	NotificationsActive,
	AccountTree,
} from "@mui/icons-material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { styled, useTheme } from "@mui/material/styles";
import queryString from "query-string";
import { dateOldToNew, stringAToZInsensitive } from "@iamnapo/sort";
import { useImmer } from "use-immer";
import { Image } from "mui-image";
import { shallow } from "zustand/shallow";

import useLocalStorage from "../utils/use-local-storage.js";
import GitTask from "../components/GitTask.jsx";
import GenericGitTask from "../components/GenericGitTask.jsx";
import DataTable from "../components/DataTable.jsx";
import Task from "../components/Task.jsx";
import Select from "../components/Select.jsx";
import Tooltip from "../components/Tooltip.jsx";
import AzureIcon from "../components/AzureIcon.jsx";
import { POSSIBLE_COLUMNS, useSnackbar, isFuzzyMatch, dayjs, capitalize } from "../utils/index.js";
import {
	closeTask,
	deleteTaskComment,
	useTaskComments,
	loadProjectTasks,
	loadProjectSprints,
	loadProjects,
	submitTask,
	submitTaskComment,
	updateTask,
	updateTaskComment,
	updateTaskPin,
	updateTaskStatus,
	updateTaskSubscription,
	loadProjectEpics,
} from "../api/index.js";

const classes = {
	root: "Tasks-root",
	bar: "Tasks-bar",
	determinate: "Tasks-determinate",
	progressText: "Tasks-progressText",
	caption: "Tasks-caption",
};

const Root = styled("div")(({ theme }) => ({
	[`& .${classes.root}`]: {
		height: theme.spacing(2),
	},
	[`& .${classes.bar}`]: {
		borderRadius: theme.shape.borderRadius,
		backgroundColor: theme.palette.secondary.main,
	},
	[`& .${classes.determinate}`]: {
		borderRadius: theme.shape.borderRadius,
		backgroundColor: theme.palette.grey.transparent,
	},
	[`& .${classes.progressText}`]: {
		position: "absolute",
		top: "50%",
		right: theme.spacing(0.5),
		marginTop: theme.spacing(-1.2),
		height: theme.spacing(2),
		fontWeight: 500,
	},
	[`& .${classes.caption}`]: {
		wordWrap: "break-word",
		whiteSpace: "normal",
		display: "flex",
		alignItems: "center",
	},
}));

const Tasks = () => {
	const navigate = useNavigate();
	const { search, pathname } = useLocation();
	const { success, error } = useSnackbar();
	const [data, setData] = useImmer([]);
	const [sprints, setSprints] = useState([]);
	const [projects, setProjects] = useState([]);
	const [selectedProject, setSelectedProject] = useState(null);
	const [doneFetching, setDoneFetching] = useState(false);
	const initialEditTaskData = useMemo(() => ({
		title: "",
		points: { total: 1, done: 0, review: 0 },
		body: "",
		id: "",
		availableLabels: [],
		labels: [],
		notificationDay: "never",
		availableEpics: [],
		epics: [],
		priority: "none",
		availableAssignees: [],
		availableReviewers: [],
		assignees: [],
		reviewers: [],
		dueDate: null,
		project: {},
		external: false,
		blocked: false,
		blockedBy: null,
		status: "",
		sprint: null,
	}), []);
	const [editTaskData, setEditTaskData] = useImmer(initialEditTaskData);
	const [sortModel, setSortModel] = useState([{ field: "Last Updated", sort: "desc" }]);
	const [filterModel, setFilterModel] = useImmer({ items: [], quickFilterValues: [] });
	const [selectedTask, setSelectedTask] = useState();
	const [submitting, setSubmitting] = useState(false);
	const [newTaskModal, setNewTaskModal] = useState(false);
	const [genericTaskModal, setGenericTaskModal] = useState(false);
	const [taskModal, setTaskModal] = useState(false);
	const theme = useTheme();
	const { kanbanTheme } = useLocalStorage(useCallback((e) => ({
		kanbanTheme: e?.kanbanTheme,
	}), []), shallow);
	const {
		comments = [],
		isLoading: isLoadingComments,
		isError: isErrorComments,
		mutate: mutateComments,
	} = useTaskComments(selectedTask?.project?._id, selectedTask?._id);

	useEffect(() => {
		if (isErrorComments) error();
	}, [isErrorComments, error]);

	const submitCloseTask = useCallback(async (pid, id) => {
		try {
			await closeTask(pid, id);
			setData((p) => {
				const ind = p.findIndex((x) => x._id === id);
				p.splice(ind, 1);
			});
			success("Task closed!");
		} catch ({ response }) {
			error(response.status === 400 ? "You can’t close a blocked task." : "");
		}
	}, [error, setData, success]);

	const submitUpdateTaskStatus = useCallback(async (pid, id, setTo) => {
		try {
			const { project: _, ...task } = await updateTaskStatus(pid, id, setTo);
			setData((p) => {
				const ind = p.findIndex((x) => x._id === id);
				p[ind] = { ...p[ind], ...task };
			});
			success("Task updated!");
		} catch {
			error();
		}
	}, [error, setData, success]);

	const submitUpdateTaskPin = useCallback(async (pid, id, setTo) => {
		try {
			const { project: _, ...task } = await updateTaskPin(pid, id, setTo);
			setData((p) => {
				const ind = p.findIndex((x) => x._id === id);
				p[ind] = { ...p[ind], ...task };
			});
			success("Task updated!");
		} catch {
			error();
		}
	}, [error, setData, success]);

	const submitUpdateTaskSubscription = useCallback(async (pid, id, setTo) => {
		try {
			const { project: _, ...task } = await updateTaskSubscription(pid, id, setTo);
			setData((p) => {
				const ind = p.findIndex((x) => x._id === id);
				p[ind] = { ...p[ind], ...task };
			});
			success("Task updated!");
		} catch {
			error();
		}
	}, [error, setData, success]);

	const submitNewTask = async (taskData = editTaskData) => {
		try {
			if (submitting) return;
			setSubmitting(true);
			await submitTask(editTaskData.project._id, taskData);
			setSubmitting(false);
			setNewTaskModal(false);
			success("Task submitted!");
		} catch {
			setSubmitting(false);
			error();
		}
	};

	useEffect(() => {
		setSelectedProject((p) => p);
		setDoneFetching(false);

		(async () => {
			try {
				const projcts = await loadProjects(false);
				setProjects(projcts.filter((e) => e.analytics?.project));
				const tasks = await Promise.all(projcts.map((e) => loadProjectTasks(e._id, false)
					.then(async (el) => {
						const epics = await loadProjectEpics(e._id, false);
						return el.map((ele) => ({ ...ele, project: { ...e, epics } }));
					})));

				const sprints_ = await Promise.all(projcts.map((e) => loadProjectSprints(e._id, true)));
				setSprints(sprints_.reduce((acc, s) => { acc.push(...s); return acc; }, []));
				setDoneFetching(true);
				setData(tasks.flat());
			} catch {
				setDoneFetching(true);
				error();
			}
		})();
	}, [error, setData, taskModal]);

	useEffect(() => {
		const { assignee, selectedProjectName, ...o } = queryString.parse(search);

		if (selectedProjectName && projects && selectedProjectName !== selectedProject?.name) {
			setSelectedProject(projects.find((el) => el.name === selectedProjectName));
		}

		if (assignee === "All") {
			setFilterModel((p) => {
				p.items = [];
				p.quickFilterValues = [];
			});
			navigate(queryString.stringifyUrl({ url: pathname, query: o }), { replace: true });
		} else if (assignee) {
			setFilterModel((p) => {
				p.items = [];
				p.quickFilterValues = [assignee];
			});
		}
	}, [navigate, pathname, projects, search, selectedProject?.name, setFilterModel]);

	const updateParent = () => {
		setGenericTaskModal(false);
	};

	const tableColumns = useMemo(() => [
		{
			field: "Task Name",
			valueGetter: ({ row }) => ({ title: row.title, pinned: row.pinned }),
			valueFormatter: ({ value }) => value.title,
			minWidth: 160,
			flex: 1,
			align: "left",
			sortComparator: ({ pinned: pinnedA, title: titleA }, { pinned: pinnedB, title: titleB }) => {
				if (pinnedA) return sortModel[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModel[0].sort === "desc" ? -1 : 1;
				return stringAToZInsensitive()(titleA, titleB);
			},
			getApplyQuickFilterFn: (searchValue) => ({ row }) => isFuzzyMatch(row.title, searchValue),
			renderCell: ({ row, value }) => (
				<Grid container>
					<Grid item xs={12}>
						<Typography sx={{ display: "flex", alignItems: "center" }}>
							<Tooltip style={{ width: "auto" }} title="Get updates for this task.">
								<IconButton
									style={{ padding: "3px", color: theme.palette.grey.light }}
									onClick={() => submitUpdateTaskSubscription(row.project._id, row._id, !row.viewerIsSubscribed)}
								>
									<NotificationsActive style={{ ...(row.viewerIsSubscribed && { color: theme.palette.primary.main }) }} />
								</IconButton>
							</Tooltip>
							{row.external
								? (
									<Tooltip title={`Fetched from ${row.metadata?.provider || "github"}.`}>
										<span>
											<IconButton disabled style={{ padding: "3px" }} size="small">
												{row.metadata?.provider === "azure"
													? <AzureIcon fontSize="inherit" />
													: <GitHub fontSize="inherit" />}
											</IconButton>
										</span>
									</Tooltip>
								)
								: (
									<Tooltip title="Pin task">
										<IconButton
											style={{ padding: "3px", marginTop: "2px" }}
											onClick={() => submitUpdateTaskPin(row.project._id, row._id, !value.pinned)}
										>
											<PushPin sx={{ ...(value.pinned && { color: "primary.main" }) }} />
										</IconButton>
									</Tooltip>
								)}
							{`${value.title} `}
							{row.blocked && (
								<Tooltip
									title={(
										<Typography>
											{"This task is blocked by task "}
											<MaterialLink component={Link} to={`/projects/${row.project._id}/project-analytics?id=${row.blockedBy._id}`} sx={{ color: "common.white", textDecoration: "underline" }}>{`${row.blockedBy.title.slice(0, 20)}${row.blockedBy.title.length > 20 && "..."}`}</MaterialLink>
											{row.blockedBy.closed ? ", which is closed" : ""}
											{"."}
										</Typography>
									)}
								>
									<span>
										<IconButton disabled style={{ padding: "3px" }} size="small">
											<Block fontSize="inherit" sx={{ color: row.blockedBy.closed ? "green.500" : "red.500" }} />
										</IconButton>
									</span>
								</Tooltip>
							)}
						</Typography>
					</Grid>
					{row.dueDate && (
						<Grid item xs={12}>
							<Typography sx={{ display: "flex", alignItems: "center" }} variant="caption">
								<EventAvailable sx={{ fontSize: "body1.fontSize", mr: 1 }} />
								{` Task due: ${dayjs(row.dueDate).format("DD MMM, YYYY")}`}
							</Typography>
						</Grid>
					)}
					<Grid item xs={12}>
						<Typography variant="caption" sx={{ display: "flex", alignItems: "center" }} className={classes.caption}>
							<AccountTree sx={{ fontSize: "body1.fontSize", mr: 1 }} />
							&nbsp;
							{row.project.name}
						</Typography>
					</Grid>
				</Grid>
			),
		},
		{
			field: "Labels",
			valueGetter: ({ row }) => ({ labels: row.labels, pinned: row.pinned }),
			valueFormatter: ({ value }) => value.labels.reduce((a, c) => `${a} ${c}`.trim(), "").replaceAll(" ", ", "),
			minWidth: 180,
			flex: 0.6,
			sortComparator: ({ pinned: pinnedA, labels: labelsA }, { pinned: pinnedB, labels: labelsB }) => {
				if (pinnedA) return sortModel[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModel[0].sort === "desc" ? -1 : 1;
				return stringAToZInsensitive((v) => v.reduce((a, c) => `${a} ${c}`, ""))(labelsA, labelsB);
			},
			getApplyQuickFilterFn: (searchValue) => ({ row }) => isFuzzyMatch(row.labels, searchValue),
			renderCell: ({ value }) => (
				<Typography align="center">
					{value.labels.reduce((a, c) => `${a}${c.trim()}, `, "").slice(0, -2)}
				</Typography>
			),
		},
		{
			field: "People",
			valueGetter: ({ row }) => ({ assignees: row.assignees, pinned: row.pinned, reviewers: row?.reviewers }),
			valueFormatter: ({ value }) => value.assignees.reduce((a, c) => `${a} ${c.username}`.trim(), "").replaceAll(" ", ", "),
			width: 150,
			flex: 0.4,
			sortComparator: ({ pinned: pinnedA, assignees: assigneesA }, { pinned: pinnedB, assignees: assigneesB }) => {
				if (pinnedA) return sortModel[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModel[0].sort === "desc" ? -1 : 1;
				return stringAToZInsensitive((v) => v.reduce((a, { username }) => `${a} ${username}`, ""))(assigneesA, assigneesB);
			},
			getApplyQuickFilterFn: (searchValue) => ({ row }) => {
				const reviewers = row?.reviewers?.map((e) => e?.username) || [];
				const assignees = row?.assignees?.map((e) => e.username) || [];
				return isFuzzyMatch([...reviewers, ...assignees], searchValue);
			},
			renderCell: ({ value }) => (
				<Box sx={{ display: "flex", justifyContent: "center" }}>
					<Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
						{value?.reviewers?.map(({ username, avatar }, ind) => (
							<Image
								key={`${username}_${ind}_${value._id}`}
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
						)) || null}
					</Box>
					{value?.reviewers?.length > 0 && value?.assignees.length > 0 && (
						<Box sx={{ display: "flex", alignItems: "center", py: "4px" }}>
							<Divider orientation="vertical" sx={{ border: "1px solid rgba(0, 0, 0, 0.12)" }} />
						</Box>
					)}
					<Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
						{value?.assignees.map(({ username, avatar }, ind) => (
							<Image
								key={`${username}_${ind}_${value._id}`}
								src={avatar}
								alt={username}
								title={`${username} (assignee)`}
								width="24px"
								height="24px"
								wrapperStyle={{ margin: "0.2rem" }}
								sx={{
									borderRadius: "50%",
								}}
							/>
						))}
					</Box>
				</Box>
			),
		},
		{
			field: "Progress",
			valueGetter: ({ row }) => {
				let ratio = row.points.total ? Math.trunc((row.points.done / row.points.total) * 100) : 0;
				if ([
					row.project.kanban.style === "none" ? "Closed" : (row.project.kanban.style === "minimal" ? "Done" : "Delivered"),
					row.project.kanban.style === "none" ? "Closed" : (row.project.kanban.style === "minimal" ? "Done" : "Accepted"),
				].includes(row.status)) ratio = 100;
				return ({ ratio, ...row.points, pinned: row.pinned });
			},
			valueFormatter: ({ value }) => `${value?.ratio}%`,
			width: 150,
			sortComparator: (a, b) => {
				if (a.pinned) return sortModel[0].sort === "desc" ? 1 : -1;
				if (b.pinned) return sortModel[0].sort === "desc" ? -1 : 1;
				if (a.ratio !== b.ratio) return a.ratio - b.ratio;
				if ((a.done / a.total) !== (b.done / b.total)) return (a.done / a.total) - (b.done / b.total);
				return a.total - b.total;
			},
			getApplyQuickFilterFn: undefined,
			renderCell: ({ row, value }) => {
				const { done, total, ratio: initialRatio } = value;
				const ratio = initialRatio > 100 ? 100 : initialRatio;
				if (total === 0) return <Typography>{"Not available"}</Typography>;
				return (
					<Box sx={{ width: "100%", textAlign: "center" }}>
						{row.external
							? <Typography>{"Not available"}</Typography> : (
								<Root>
									<Typography variant="body2">{`Points: ${done} / ${total}`}</Typography>
									<Box sx={{ position: "relative" }}>
										<LinearProgress
											className={classes.determinate}
											classes={{ root: classes.root, bar: classes.bar }}
											variant="determinate"
											color="secondary"
											value={ratio}
										/>
										<Typography variant="body2" className={classes.progressText}>
											{`${ratio}%`}
										</Typography>
									</Box>
								</Root>
							)}
					</Box>
				);
			},
		},
		{
			field: "Status",
			valueGetter: ({ row }) => ({ status: row.status ?? "", pinned: row.pinned }),
			valueFormatter: ({ value }) => value?.status,
			width: 150,
			sortComparator: ({ pinned: pinnedA, status: statusA = "" }, { pinned: pinnedB, status: statusB = "" }) => {
				if (pinnedA) return sortModel[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModel[0].sort === "desc" ? -1 : 1;
				return stringAToZInsensitive()(statusA, statusB);
			},
			getApplyQuickFilterFn: (searchValue) => ({ row }) => isFuzzyMatch(row.status, searchValue),
			renderCell: ({ row, value }) => (
				<Select
					value={value.status || ""}
					readOnly={row.external}
					id="status"
					SelectDisplayProps={{
						style: (() => {
							let color = theme.palette.grey[700];
							if (["Backlog"].includes(value.status)) color = theme.palette[`workloadBacklog${kanbanTheme}`].main;
							if (["To Do", "Sprint Planning"].includes(value.status)) color = theme.palette[`workloadSprintPlanning${kanbanTheme}`].main;
							if (["Open", "In Progress"].includes(value.status)) color = theme.palette[`workloadInProgress${kanbanTheme}`].main;
							if (["Delivered"].includes(value.status)) color = theme.palette[`workloadDelivered${kanbanTheme}`].main;
							if (["Closed", "Done", "Accepted"].includes(value.status)) color = theme.palette[`workloadAccepted${kanbanTheme}`].main;
							return ({
								borderBottom: `${theme.spacing(0.5)} solid ${color}`,
								cursor: row.external ? "default" : "pointer",
								backgroundColor: theme.palette.common.white,
							});
						})(),
					}}
					onChange={(e) => e.target.value !== value.status && submitUpdateTaskStatus(row.project._id, row._id, e.target.value)}
				>
					{[...POSSIBLE_COLUMNS.get(row.project.kanban.style), ...(row.project.kanban.hasArchived ? ["Archived"] : []),
					].map((e, ind) => <MenuItem key={`status_${row._id}_${ind}`} value={e}>{e}</MenuItem>)}
				</Select>
			),
		},
		{
			field: "Last Updated",
			width: 170,
			valueGetter: ({ row }) => ({ updatedAt: row.updatedAt, pinned: row.pinned }),
			valueFormatter: ({ value }) => value.updatedAt,
			sortComparator: ({ pinned: pinnedA, updatedAt: updatedAtA }, { pinned: pinnedB, updatedAt: updatedAtB }) => {
				if (pinnedA) return sortModel[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModel[0].sort === "desc" ? -1 : 1;
				return dateOldToNew((v) => new Date(v))(updatedAtA, updatedAtB);
			},
			getApplyQuickFilterFn: undefined,
			renderCell: ({ row }) => <Typography>{dayjs(row.updatedAt).fromNow()}</Typography>,
		},
		{
			field: "Actions",
			disableExport: true,
			width: 140,
			sortable: false,
			getApplyQuickFilterFn: undefined,
			renderCell: ({ row: {
				project,
				_id,
				status,
				title,
				points,
				body,
				dueDate,
				labels,
				priority,
				notificationDay,
				assignees,
				reviewers,
				createdAt,
				updatedAt,
				author,
				external,
				metadata,
				blocked,
				blockedBy,
				sprint,
			} }) => (
				<ToggleButtonGroup key={_id} exclusive size="small" aria-label="actions">
					<ToggleButton
						value={`view${external ? "" : "/edit"}`}
						title={`view${external ? "" : "/edit"}`}
						aria-label={`view${external ? "" : "/edit"}`}
						onClick={() => {
							setSelectedTask({ _id, project });
							setEditTaskData((p) => {
								Object.assign(p, {
									project,
									title,
									points,
									body,
									dueDate,
									_id,
									labels,
									assignees,
									reviewers,
									notificationDay,
									availableLabels: project.availableLabels,
									availableEpics: project.epics,
									epics: project.epics.filter((epic) => epic.tasks.some((t) => String(t._id) === String(_id))),
									availableAssignees: project.team,
									availableReviewers: project.team,
									priority,
									author,
									createdAt,
									updatedAt,
									external,
									blocked,
									blockedBy,
									status,
									sprint,
								});
							});
							setTaskModal(true);
						}}
					>
						<Info color="primary" />
					</ToggleButton>
					{!external && (
						<ToggleButton
							aria-label="close"
							title="close"
							value="close"
							onClick={() => submitCloseTask(project._id, _id)}
						>
							<Done color="secondary" sx={{ ...(blocked && { color: "grey.500" }) }} />
						</ToggleButton>
					)}
					{external && (
						<ToggleButton
							aria-label={`View on ${capitalize(metadata?.provider || "github")}`}
							title={`View on ${capitalize(metadata?.provider || "github")}`}
							value={`View on ${capitalize(metadata?.provider || "github")}`}
							sx={{ color: "primary.main" }}
							onClick={() => {
								const a = document.createElement("a");
								a.rel = "noopener noreferrer";
								a.target = "_blank";
								a.href = metadata.url;
								a.click();
							}}
						>
							<OpenInNew />
						</ToggleButton>
					)}
				</ToggleButtonGroup>
			),
		},
	], [
		kanbanTheme,
		setEditTaskData,
		sortModel,
		submitCloseTask,
		submitUpdateTaskPin,
		submitUpdateTaskStatus,
		submitUpdateTaskSubscription,
		theme,
	]);

	return (
		<section style={{ paddingLeft: 0, paddingRight: 0, paddingTop: "1rem" }}>
			<Grid container className="container" direction="column">
				<Typography gutterBottom variant="h4">{"All running Tasks"}</Typography>
				<Grid item xs={12}>
					<Grid container justifyContent="space-between" alignItems="center" sx={{ "> .MuiGrid-item": { mt: 3, px: 0 } }}>
						<Grid item display="flex" sm={6} xs={12} m={0} sx={{ justifyContent: { xs: "center", md: "flex-start" } }}>
							<Grid item style={{ display: "flex", alignItems: "center" }} mr={1}>
								<Typography variant="h6" color="primary">{"Project: "}</Typography>
							</Grid>
							<Grid item xs={6}>
								<Select
									id="projectNameFilter"
									value={selectedProject?.name || ""}
									onChange={(e) => {
										const parsed = queryString.parse(search);
										parsed.selectedProjectName = e.target.value;
										navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
										setSelectedProject(projects.find((el) => el.name === e.target.value));
									}}
								>
									<MenuItem value="">{"All"}</MenuItem>
									{projects.sort(stringAToZInsensitive((v) => v.name)).map((e) => (
										<MenuItem key={e._id} value={e.name}>
											{e.name}
										</MenuItem>
									))}
								</Select>
							</Grid>
						</Grid>
						<Grid item display="flex" sm={6} xs={12} sx={{ justifyContent: { xs: "center", md: "flex-end" } }}>
							<Grid item>
								<Button
									color="pink"
									sx={{ justifySelf: "flex-end", color: "common.white" }}
									variant="contained"
									size="medium"
									disabled={!doneFetching && !submitting}
									startIcon={<PostAdd />}
									onClick={() => {
										if (selectedProject) {
											setEditTaskData({
												title: "",
												points: { total: 1, done: 0, review: 0 },
												body: "",
												id: "",
												labels: [],
												assignees: [],
												reviewers: [],
												dueDate: null,
												availableEpics: selectedProject.epics,
												epics: [],
												availableLabels: selectedProject.availableLabels,
												availableAssignees: selectedProject.team,
												availableReviewers: selectedProject.team,
												priority: "none",
												project: selectedProject,
												external: false,
												blocked: false,
												blockedBy: null,
												status: "",
											});
											setNewTaskModal(true);
										} else {
											setGenericTaskModal(true);
										}
									}}
								>
									{"Create Task"}
									{submitting && <CircularProgress size={24} className={classes.buttonProgress} />}
								</Button>
							</Grid>
						</Grid>
					</Grid>
				</Grid>
				<DataTable
					rows={data.filter((e) => (String(e.project._id) === String(selectedProject?._id) || !selectedProject))}
					loading={!doneFetching}
					columns={tableColumns}
					rowHeight={70}
					sortModel={sortModel}
					filterModel={filterModel}
					initialState={{ pagination: { paginationModel: { page: 0 } } }}
					onSortModelChange={(newSortModel) => setSortModel(newSortModel)}
					onFilterModelChange={(newFilterModel) => setFilterModel(newFilterModel)}
				/>
			</Grid>

			<GitTask
				open={newTaskModal}
				title="Create a new Task!"
				task={editTaskData}
				tasks={data.filter((e) => e.project._id === editTaskData.project._id)}
				pId={editTaskData.project._id || ""}
				onClose={() => {
					setEditTaskData((p) => { Object.assign(p, initialEditTaskData); });
					setNewTaskModal(false);
				}}
				onSubmit={submitNewTask}
			/>
			<GenericGitTask
				open={genericTaskModal}
				updateParent={updateParent}
				projects={projects}
				tasks={data}
				onClose={() => setGenericTaskModal(false)}
			/>
			<Task
				open={taskModal}
				title={`View${editTaskData?.external ? "" : " / Edit Task"}`}
				task={editTaskData}
				team={selectedTask?.project?.team || []}
				tasks={data.filter((e) => e.project._id === editTaskData.project._id)}
				pId={editTaskData.project._id || ""}
				sprints={sprints.filter((s) => s.project === editTaskData.project._id)}
				comments={comments}
				isLoadingComments={isLoadingComments}
				submitting={submitting}
				onClose={() => {
					setSelectedTask();
					setEditTaskData((p) => { Object.assign(p, initialEditTaskData); });
					setTaskModal(false);
				}}
				onUpdateTask={async (task) => {
					if (!submitting) {
						setSubmitting(true);
						await updateTask(task.project._id, task._id, task)
							.then(({ project: _, ...uTask }) => {
								setSubmitting(false);
								setData((p) => {
									const ind = p.findIndex((x) => x._id === uTask._id);
									p[ind] = { ...p[ind], ...uTask };
								});
								success("Task updated!");
							}).catch(() => error());
						setSubmitting(false);
						setEditTaskData(task);
					}
				}}
				onSubmit={(body) => {
					if (body.length > 0 && !submitting) {
						setSubmitting(true);
						submitTaskComment(selectedTask?.project?._id, selectedTask?._id, body)
							.then((commentS) => {
								success("Comment submitted!");
								mutateComments(commentS.map((e) => ({ ...e, updatedAt: new Date(e.updatedAt) })));
							}).catch(() => error());
						setSubmitting(false);
					}
				}}
				onUpdate={(comment) => {
					if (comment.body.length > 0 && !submitting) {
						setSubmitting(true);
						updateTaskComment(selectedTask?.project?._id, selectedTask?._id, comment._id, comment.body)
							.then((commentS) => {
								success("Comment updated!");
								mutateComments(commentS.map((e) => ({ ...e, updatedAt: new Date(e.updatedAt) })));
							}).catch(() => error());
						setSubmitting(false);
					}
				}}
				onDelete={(comment) => {
					if (!submitting) {
						setSubmitting(true);
						deleteTaskComment(selectedTask?.project?._id, selectedTask?._id, comment._id)
							.then((commentS) => {
								success("Comment deleted!");
								mutateComments(commentS.map((e) => ({ ...e, updatedAt: new Date(e.updatedAt) })));
							}).catch(() => error());
						setSubmitting(false);
					}
				}}
			/>
		</section>
	);
};

export default memo(Tasks);
