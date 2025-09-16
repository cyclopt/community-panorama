import { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
	Button,
	Typography,
	Box,
	CircularProgress,
	LinearProgress,
	IconButton,
	ToggleButtonGroup,
	ToggleButton,
	MenuItem,
	Link as MaterialLink,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import {
	PostAdd,
	Info,
	History,
	Done,
	EventAvailable,
	OpenInNew,
	GitHub,
	Block,
	PushPin,
	NotificationsActive,
	ToggleOff,
	ToggleOn,
} from "@mui/icons-material";
import queryString from "query-string";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { dateOldToNew, numberSmallToLarge, stringAToZInsensitive } from "@iamnapo/sort";
import { shallow } from "zustand/shallow";
import { useImmer } from "use-immer";
import { produce } from "immer";
import { Image } from "mui-image";

import GitTask from "../../components/GitTask.jsx";
import DataTable from "../../components/DataTable.jsx";
import Tooltip from "../../components/Tooltip.jsx";
import Task from "../../components/Task.jsx";
import Epic from "../../components/Epic.jsx";
import Select from "../../components/Select.jsx";
import CreateEpic from "../../components/CreateEpic.jsx";
import AzureIcon from "../../components/AzureIcon.jsx";
import { isFuzzyMatch, POSSIBLE_COLUMNS, useLocalStorage, useSnackbar, dayjs, capitalize } from "../../utils/index.js";
import {
	closeTask,
	closeEpic,
	useTaskComments,
	reopenTask,
	reopenEpic,
	submitTask,
	submitEpic,
	submitTaskComment,
	updateTask,
	updateEpic,
	updateTaskComment,
	updateTaskPin,
	updateEpicPin,
	updateTaskStatus,
	useProjectTasks,
	useProjectEpics,
	deleteTaskComment,
	updateTaskSubscription,
	useProjectSprints,
} from "../../api/index.js";

const classes = {
	root: "ProjectTaskManagement-root",
	bar: "ProjectTaskManagement-bar",
	determinate: "ProjectTaskManagement-determinate",
	progressText: "ProjectTaskManagement-progressText",
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
}));

const ProjectTaskManagement = (props) => {
	const { project } = props;
	const location = useLocation();
	const navigate = useNavigate();
	const { success, error } = useSnackbar();
	const { tasks = [], isLoading, isError, mutate } = useProjectTasks(project._id);
	const { epics = [], isLoading: isLoadingEpics, isError: isErrorEpics, mutate: mutateEpics } = useProjectEpics(project._id);
	const [submitting, setSubmitting] = useState(false);
	const [submittingEpic, setSubmittingEpic] = useState(false);
	const { sprints = [], isLoading: isLoadingSprints, isError: isErrorSpints } = useProjectSprints(project._id);
	const initialEditTaskData = useMemo(() => ({
		title: "",
		points: { total: 1, done: 0, review: 0 },
		body: "",
		availableLabels: [],
		availableEpics: [],
		labels: [],
		epics: [],
		priority: "none",
		availableAssignees: [],
		availableReviewers: [],
		assignees: [],
		reviewers: [],
		dueDate: null,
		notificationDay: "never",
		external: false,
		blocked: false,
		blockedBy: null,
		status: "",
		sprint: null,
	}), []);
	const [editTaskData, setEditTaskData] = useImmer({ ...initialEditTaskData, ignorePoints: false });
	const initialEditEpicData = useMemo(() => ({
		title: "",
		startDate: null,
		dueDate: null,
		external: false,
		tasks: [],
		tasksBlockedBy: {},
	}), []);
	const [editEpicData, setEditEpicData] = useImmer(initialEditEpicData);
	const {
		showClosedTasks,
		toggleShowClosedTasks,
		showClosedEpics,
		toggleShowClosedEpics,
	} = useLocalStorage(useCallback((e) => ({
		showClosedTasks: e.showClosedTasks,
		toggleShowClosedTasks: e.toggleShowClosedTasks,
		showClosedEpics: e.showClosedEpics,
		toggleShowClosedEpics: e.toggleShowClosedEpics,
	}), []), shallow);
	const [selectedTaskId, setSelectedTaskId] = useState();
	const [newTaskModal, setNewTaskModal] = useState(false);
	const [newEpicModal, setNewEpicModal] = useState(false);
	const [taskModal, setTaskModal] = useState(false);
	const [epicModal, setEpicModal] = useState(false);
	const [sortModelTasks, setSortModelTasks] = useState([{ field: "Last Updated", sort: "desc" }]);
	const [sortModelEpics, setSortModelEpics] = useState([{ field: "Last Updated", sort: "desc" }]);
	const { kanbanTheme } = useLocalStorage(useCallback((e) => ({
		kanbanTheme: e?.kanbanTheme,
	}), []), shallow);
	const {
		comments = [],
		isLoading: isLoadingComments,
		isError: isErrorComments,
		mutate: mutateComments,
	} = useTaskComments(project?._id, selectedTaskId);

	const submitCloseTask = useCallback(async (id) => {
		try {
			const task = await closeTask(project._id, id);
			mutate((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === id);
				draft[ind] = { ...draft[ind], ...task };
			}));
			mutateEpics();
			success("Task closed!");
		} catch ({ response }) {
			error(response.status === 400 ? "You can’t close a blocked task." : "");
		}
	}, [error, mutate, mutateEpics, project._id, success]);

	const submitCloseEpic = useCallback(async (id) => {
		try {
			const epic = await closeEpic(project._id, id);
			mutateEpics((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === id);
				draft[ind] = { ...draft[ind], ...epic };
			}), false);
			success("Epic closed!");
		} catch {
			error();
		}
	}, [error, mutateEpics, project._id, success]);

	const submitReopenTask = useCallback(async (id) => {
		try {
			const task = await reopenTask(project._id, id);
			mutate((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === id);
				draft[ind] = { ...draft[ind], ...task };
			}), false);
			mutateEpics();
			success("Task reopened!");
		} catch {
			error();
		}
	}, [error, mutate, mutateEpics, project._id, success]);

	const submitReopenEpic = useCallback(async (id) => {
		try {
			const epic = await reopenEpic(project._id, id);
			mutateEpics((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === id);
				draft[ind] = { ...draft[ind], ...epic };
			}), false);
			success("Epic reopened!");
		} catch {
			error();
		}
	}, [error, mutateEpics, project._id, success]);

	const submitUpdateTaskStatus = useCallback(async (id, setTo) => {
		try {
			const task = await updateTaskStatus(project._id, id, setTo);
			mutate((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === id);
				draft[ind] = { ...draft[ind], ...task };
			}), false);
			success("Task updated!");
		} catch {
			error();
		}
	}, [error, mutate, project._id, success]);

	const submitUpdateTaskPin = useCallback(async (id, setTo) => {
		try {
			const task = await updateTaskPin(project._id, id, setTo);
			mutate((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === id);
				draft[ind] = { ...draft[ind], ...task };
			}), false);
			success("Task updated!");
		} catch {
			error();
		}
	}, [error, mutate, project._id, success]);

	const submitUpdateEpicPin = useCallback(async (id, setTo) => {
		try {
			const epic = await updateEpicPin(project._id, id, setTo);
			mutateEpics((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === id);
				draft[ind] = { ...draft[ind], ...epic };
			}), false);
			success("Epic updated!");
		} catch {
			error();
		}
	}, [error, mutateEpics, project._id, success]);

	const submitUpdateTaskSubscription = useCallback(async (id, setTo) => {
		try {
			const task = await updateTaskSubscription(project._id, id, setTo);
			mutate((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === id);
				draft[ind] = { ...draft[ind], ...task };
			}), false);
			success("Task updated!");
		} catch {
			error();
		}
	}, [error, mutate, project._id, success]);

	const submitNewTask = async (data = editTaskData) => {
		try {
			if (submitting) return;
			setSubmitting(true);
			await submitTask(project._id, data);
			setSubmitting(false);
			setNewTaskModal(false);
			mutate();
			mutateEpics();
			success("Task submitted!");
		} catch {
			error();
		}
	};

	const submitNewEpic = async (data = editEpicData) => {
		try {
			if (submittingEpic) return;
			setSubmittingEpic(true);
			await submitEpic(project._id, data);
			setSubmittingEpic(false);
			setNewEpicModal(false);
			mutateEpics();
			success("Epic submitted!");
		} catch {
			error();
		}
	};

	useEffect(() => {
		if (isError || isErrorEpics || isErrorSpints || isErrorComments) error();
	}, [error, isError, isErrorEpics, isErrorSpints, isErrorComments]);

	useEffect(() => {
		try {
			if (!taskModal && !epicModal) {
				const { id, title, body, ...others } = queryString.parse(location.search);
				if (id) {
					const task = tasks.find((e) => e._id === id);
					if (task) {
						setSelectedTaskId(task._id);
						setEditTaskData((p) => {
							Object.assign(p, task, {
								availableEpics: epics,
								epics: epics.filter((epic) => epic.tasks.some((t) => String(t._id) === String(task._id))),
								availableLabels: project.availableLabels,
								availableAssignees: project.team,
								availableReviewers: project.team,
							});
						});
						setTaskModal(true);
					} else {
						const epic = epics.find((e) => e._id === id);
						if (epic) {
							setEditEpicData((p) => {
								Object.assign(p, {
									title: epic.title,
									_id: epic._id,
									startDate: epic.startDate,
									dueDate: epic.dueDate,
									external: epic.external,
									tasks: epic.tasks,
									tasksBlockedBy: epic.tasksBlockedBy,
								});
							});
							setEpicModal(true);
						}
					}
				} else if ((title || body) && !isLoading && !submitting) {
					setEditTaskData((p) => {
						Object.assign(p, initialEditTaskData);
						p.availableEpics = epics;
						p.epics = epics.filter((epic) => epic.tasks.some((t) => String(t._id) === String(id)));
						p.availableLabels = project.availableLabels;
						p.availableAssignees = project.team;
						p.availableReviewers = project.team;
						p.title = title || "";
						p.body = body || "";
					});
					navigate(queryString.stringifyUrl({ url: location.pathname, query: others }), { replace: true });
					setNewTaskModal(true);
				}
			}
		} catch {
			error();
		}
	}, [location.search, tasks, epics, taskModal, epicModal]); // eslint-disable-line react-hooks/exhaustive-deps

	const theme = useTheme();
	const columnOptions = useMemo(() => [
		...POSSIBLE_COLUMNS.get(project.kanban.style),
		...(project.kanban.hasArchived ? ["Archived"] : []),
	], [project.kanban]);

	const onUpdateTask = useCallback((task) => {
		if (!submitting) {
			setSubmitting(true);
			updateTask(project._id, task._id, task).then((uTask) => {
				mutate((p) => produce(p, (draft) => {
					const ind = draft.findIndex((x) => x._id === uTask._id);
					draft[ind] = { ...draft[ind], ...uTask };
				}), false);
				setSubmitting(false);
				success("Task updated!");
			}).catch(() => error());
			setSubmitting(false);
			setEditTaskData(task);
		}
	}, [error, mutate, project._id, setEditTaskData, submitting, success]);

	const onSubmit = useCallback((body) => {
		if (body.length > 0 && !submitting) {
			setSubmitting(true);
			submitTaskComment(project._id, selectedTaskId, body).then((commentS) => {
				mutate();
				success("Comment submitted!");
				mutateComments(commentS.map((e) => ({ ...e, updatedAt: new Date(e.updatedAt) })));
			}).catch(() => error());
			setSubmitting(false);
		}
	}, [submitting, selectedTaskId])/* eslint-disable-line react-hooks/exhaustive-deps */;

	const onUpdate = useCallback((comment) => {
		if (comment.body.length > 0 && !submitting) {
			setSubmitting(true);
			updateTaskComment(project._id, selectedTaskId, comment._id, comment.body).then((commentS) => {
				mutate();
				success("Comment updated!");
				mutateComments(commentS.map((e) => ({ ...e, updatedAt: new Date(e.updatedAt) })));
			}).catch(() => error());
			setSubmitting(false);
		}
	}, [submitting, JSON.stringify(comments)])/* eslint-disable-line react-hooks/exhaustive-deps */;

	const onDelete = useCallback((comment) => {
		if (!submitting) {
			setSubmitting(true);
			deleteTaskComment(project._id, selectedTaskId, comment._id).then((commentS) => {
				mutate();
				success("Comment deleted!");
				mutateComments(commentS.map((e) => ({ ...e, updatedAt: new Date(e.updatedAt) })));
			}).catch(() => error());
			setSubmitting(false);
		}
	}, [submitting, JSON.stringify(comments)])/* eslint-disable-line react-hooks/exhaustive-deps */;

	const tasksTableColumns = useMemo(() => [
		{
			field: "Task Name",
			valueGetter: ({ row }) => ({ title: row.title, pinned: row.pinned }),
			valueFormatter: ({ value }) => value.title,
			minWidth: 160,
			flex: 1,
			align: "left",
			sortComparator: ({ pinned: pinnedA, title: titleA }, { pinned: pinnedB, title: titleB }) => {
				if (pinnedA) return sortModelTasks[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModelTasks[0].sort === "desc" ? -1 : 1;
				return stringAToZInsensitive()(titleA, titleB);
			},
			getApplyQuickFilterFn: (searchValue) => ({ row }) => isFuzzyMatch(row.title, searchValue),
			renderCell: ({ row, value }) => (
				<Box sx={{ display: "flex", flexWrap: "wrap" }}>
					<Typography sx={{ display: "flex", alignItems: "center", flexBasis: "100%" }}>
						<Tooltip style={{ width: "auto" }} title="Get updates for this task.">
							<IconButton
								style={{ padding: "3px", color: theme.palette.grey.light }}
								onClick={() => submitUpdateTaskSubscription(row._id, !row.viewerIsSubscribed)}
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
										style={{ padding: "3px", marginTop: "2px", color: theme.palette.grey.light }}
										onClick={() => submitUpdateTaskPin(row._id, !value.pinned)}
									>
										<PushPin style={{ ...(value.pinned && { color: theme.palette.primary.main }) }} />
									</IconButton>
								</Tooltip>
							)}
						{`${value.title} `}
						{row.blocked && (
							<Tooltip
								title={(
									<Typography>
										{"This task is blocked by task "}
										<MaterialLink component={Link} to={`?id=${row.blockedBy._id}`} sx={{ color: "common.white", textDecoration: "underline" }}>{`${row.blockedBy.title.slice(0, 20)}${row.blockedBy.title.length > 20 && "..."}`}</MaterialLink>
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
					{row.dueDate && (
						<Typography sx={{ display: "flex", alignItems: "center" }} variant="caption">
							<EventAvailable sx={{ fontSize: "body1.fontSize" }} />
							{` Task due: ${dayjs(row.dueDate).format("DD MMM, YYYY")}`}
						</Typography>
					)}
				</Box>
			),
		},
		{
			field: "Labels",
			valueGetter: ({ row }) => ({ labels: row.labels, pinned: row.pinned }),
			valueFormatter: ({ value }) => value.labels.reduce((a, c) => `${a} ${c}`.trim(), "").replaceAll(" ", ", "),
			minWidth: 180,
			flex: 1,
			sortComparator: ({ pinned: pinnedA, labels: labelsA }, { pinned: pinnedB, labels: labelsB }) => {
				if (pinnedA) return sortModelTasks[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModelTasks[0].sort === "desc" ? -1 : 1;
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
			valueGetter: ({ row }) => ({ assignees: row.assignees, pinned: row.pinned }),
			valueFormatter: ({ value }) => value.assignees.reduce((a, c) => `${a} ${c.username}`.trim(), "").replaceAll(" ", ", "),
			width: 150,
			sortComparator: ({ pinned: pinnedA, assignees: assigneesA }, { pinned: pinnedB, assignees: assigneesB }) => {
				if (pinnedA) return sortModelTasks[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModelTasks[0].sort === "desc" ? -1 : 1;
				return stringAToZInsensitive((v) => v.reduce((a, { username }) => `${a} ${username}`, ""))(assigneesA, assigneesB);
			},
			getApplyQuickFilterFn: (searchValue) => ({ row }) => isFuzzyMatch(row.assignees.map((e) => e.username), searchValue),
			renderCell: ({ value }) => (
				<Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
					{value.assignees.map(({ username, avatar }, ind) => (
						<Image
							key={`${username}_${ind}_${value._id}`}
							src={avatar}
							alt={username}
							title={username}
							width="24px"
							height="24px"
							wrapperStyle={{ margin: "0.2rem" }}
							sx={{ borderRadius: "50%" }}
						/>
					))}
				</Box>
			),
		},
		{
			field: "Progress",
			valueGetter: ({ row }) => {
				let ratio = row.points.total ? Math.trunc((row.points.done / row.points.total) * 100) : 0;
				if ([
					project.kanban.style === "none" ? "Closed" : (project.kanban.style === "minimal" ? "Done" : "Delivered"),
					project.kanban.style === "none" ? "Closed" : (project.kanban.style === "minimal" ? "Done" : "Accepted"),
				].includes(row.status)) ratio = 100;
				return ({ ratio, ...row.points, pinned: row.pinned });
			},
			valueFormatter: ({ value }) => `${value.ratio}%`,
			width: 150,
			sortComparator: (a, b) => {
				if (a.pinned) return sortModelTasks[0].sort === "desc" ? 1 : -1;
				if (b.pinned) return sortModelTasks[0].sort === "desc" ? -1 : 1;
				if (a.ratio !== b.ratio) return a.ratio - b.ratio;
				if ((a.done / a.total) !== (b.done / b.total)) return (a.done / a.total) - (b.done / b.total);
				return a.total - b.total;
			},
			getApplyQuickFilterFn: (searchValue) => ({ row }) => isFuzzyMatch(row.assignees.map((e) => e.username), searchValue),
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
			valueGetter: ({ row }) => ({ status: row.status, pinned: row.pinned }),
			valueFormatter: ({ value }) => value.status,
			width: 150,
			sortComparator: ({ pinned: pinnedA, status: statusA }, { pinned: pinnedB, status: statusB }) => {
				if (pinnedA) return sortModelTasks[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModelTasks[0].sort === "desc" ? -1 : 1;
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
					onChange={(e) => e.target.value !== value.status && submitUpdateTaskStatus(row._id, e.target.value)}
				>
					{columnOptions.map((e, ind) => <MenuItem key={`status_${row._id}_${ind}`} value={e}>{e}</MenuItem>)}
				</Select>
			),
		},
		{
			field: "Last Updated",
			width: 170,
			valueGetter: ({ row }) => ({ updatedAt: row.updatedAt, pinned: row.pinned }),
			valueFormatter: ({ value }) => value.updatedAt,
			sortComparator: ({ pinned: pinnedA, updatedAt: updatedAtA }, { pinned: pinnedB, updatedAt: updatedAtB }) => {
				if (pinnedA) return sortModelTasks[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModelTasks[0].sort === "desc" ? -1 : 1;
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
				closed,
				_id,
				status,
				title,
				points,
				body,
				dueDate,
				labels,
				priority,
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
							setSelectedTaskId(_id);
							setEditTaskData((p) => {
								Object.assign(p, {
									title,
									points,
									body,
									dueDate,
									_id,
									labels,
									assignees,
									reviewers,
									availableEpics: epics,
									epics: epics.filter((epic) => epic.tasks.some((t) => String(t._id) === String(_id))),
									availableLabels: project.availableLabels,
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
							const parsed = queryString.parse(location.search);
							parsed.id = _id;
							navigate(queryString.stringifyUrl({ url: location.pathname, query: parsed }), { replace: true });
							setTaskModal(true);
						}}
					>
						<Info color="primary" />
					</ToggleButton>
					{!external && (
						<ToggleButton
							aria-label="reopen"
							title="reopen"
							value="reopen"
							disabled={!closed || !["Closed", "Delivered", "Accepted"].includes(status)}
							style={{ ...(!closed || !["Closed", "Delivered", "Accepted"].includes(status) ? {} : { color: theme.palette.red[500] }) }}
							onClick={() => closed && [
								project.kanban.style === "none" ? "Closed" : (project.kanban.style === "minimal" ? "Done" : "Delivered"),
								project.kanban.style === "none" ? "Closed" : (project.kanban.style === "minimal" ? "Done" : "Accepted"),
							].includes(status) && submitReopenTask(_id)}
						>
							<History />
						</ToggleButton>
					)}
					{!external && (
						<ToggleButton
							aria-label="close"
							title="close"
							value="close"
							disabled={closed}
							style={{ ...(closed ? {} : { color: theme.palette.secondary.main }) }}
							color="secondary"
							onClick={() => !closed && submitCloseTask(_id)}
						>
							<Done />
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
	], [sortModelTasks, theme, submitUpdateTaskSubscription, submitUpdateTaskPin, project.kanban.style,
		project.availableLabels, project.team, columnOptions, kanbanTheme, submitUpdateTaskStatus, setEditTaskData,
		location.search, location.pathname, navigate, epics, submitReopenTask, submitCloseTask]);

	const epicsTableColumns = useMemo(() => [
		{
			field: "Epic Name",
			valueGetter: ({ row }) => ({ title: row.title, pinned: row.pinned }),
			valueFormatter: ({ value }) => value.title,
			minWidth: 160,
			flex: 1,
			align: "left",
			sortComparator: ({ pinned: pinnedA, title: titleA }, { pinned: pinnedB, title: titleB }) => {
				if (pinnedA) return sortModelEpics[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModelEpics[0].sort === "desc" ? -1 : 1;
				return stringAToZInsensitive()(titleA, titleB);
			},
			getApplyQuickFilterFn: (searchValue) => ({ row }) => isFuzzyMatch(row.title, searchValue),
			renderCell: ({ row, value }) => (
				<Typography>
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
						) : (
							<Tooltip title="Pin task">
								<IconButton style={{ padding: "3px", color: theme.palette.grey.light }} onClick={() => submitUpdateEpicPin(row._id, !value.pinned)}>
									<PushPin fontSize="inherit" style={{ ...(value.pinned && { color: theme.palette.primary.main }) }} />
								</IconButton>
							</Tooltip>
						)}
					{value.title}
				</Typography>
			),
		},
		{
			field: "Start Date",
			width: 150,
			valueGetter: ({ row }) => ({ startDate: row.startDate, pinned: row.pinned }),
			valueFormatter: ({ value }) => value.startDate,
			sortComparator: ({ pinned: pinnedA, startDate: startDateA }, { pinned: pinnedB, startDate: startDateB }) => {
				if (pinnedA) return sortModelEpics[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModelEpics[0].sort === "desc" ? -1 : 1;
				return dateOldToNew((v) => new Date(v))(startDateA, startDateB);
			},
			getApplyQuickFilterFn: undefined,
			renderCell: ({ value }) => (value.startDate ? (
				<Typography>
					{dayjs(value.startDate).format("DD MMM, YYYY")}
				</Typography>
			) : ""),
		},
		{
			field: "Due Date",
			width: 150,
			valueGetter: ({ row }) => ({ dueDate: row.dueDate, pinned: row.pinned }),
			valueFormatter: ({ value }) => value.dueDate,
			sortComparator: ({ pinned: pinnedA, dueDate: dueDateA }, { pinned: pinnedB, dueDate: dueDateB }) => {
				if (pinnedA) return sortModelEpics[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModelEpics[0].sort === "desc" ? -1 : 1;
				return dateOldToNew((v) => new Date(v))(dueDateA, dueDateB);
			},
			getApplyQuickFilterFn: undefined,
			renderCell: ({ value }) => (value.dueDate ? (
				<Typography>
					{dayjs(value.dueDate).format("DD MMM, YYYY")}
				</Typography>
			) : ""),
		},
		{
			field: "Progress",
			valueGetter: ({ row }) => {
				let [sumDone, ratioDone, sumTotal] = [0, 0, 0];
				for (const { points: { done, total }, closed } of row.tasks) {
					sumDone += done;
					ratioDone += closed ? Math.max(done, total) : done;
					sumTotal += total;
				}

				const ratio = sumTotal ? Math.trunc((ratioDone / sumTotal) * 100) : 0;
				return ({ pinned: row.pinned, done: sumDone, total: sumTotal, ratio });
			},
			valueFormatter: ({ value }) => `${value.ratio}%`,
			width: 150,
			sortComparator: (a, b) => {
				if (a.pinned) return sortModelEpics[0].sort === "desc" ? 1 : -1;
				if (b.pinned) return sortModelEpics[0].sort === "desc" ? -1 : 1;
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
											{`${String(ratio).padStart(3, "\u00A0")}%`}
										</Typography>
									</Box>
								</Root>
							)}
					</Box>
				);
			},
		},
		{
			field: "Tasks Involved",
			valueGetter: ({ row }) => ({ count: row.tasks.length, pinned: row.pinned }),
			valueFormatter: ({ value }) => value.count,
			width: 175,
			type: "number",
			sortComparator: ({ pinned: pinnedA, count: countA }, { pinned: pinnedB, count: countB }) => {
				if (pinnedA) return sortModelEpics[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModelEpics[0].sort === "desc" ? -1 : 1;
				return numberSmallToLarge()(countA, countB);
			},
			getApplyQuickFilterFn: (searchValue) => ({ value }) => isFuzzyMatch(value.count, searchValue),
			renderCell: ({ value }) => <Typography>{value.count}</Typography>,
		},
		{
			field: "People",
			valueGetter: ({ row }) => {
				const assignees = [];
				for (const person of (row.tasks || []).flatMap((e) => e.assignees)) {
					if (!assignees.some((e) => e._id === person._id)) assignees.push(person);
				}

				return { pinned: row.pinned, assignees };
			},
			valueFormatter: ({ value }) => value.assignees.reduce((a, c) => `${a} ${c.username}`.trim(), "").replaceAll(" ", ", "),
			width: 150,
			flex: 1,
			sortComparator: ({ pinned: pinnedA, assignees: assigneesA }, { pinned: pinnedB, assignees: assigneesB }) => {
				if (pinnedA) return sortModelEpics[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModelEpics[0].sort === "desc" ? -1 : 1;
				return stringAToZInsensitive((v) => v.reduce((a, { username }) => `${a} ${username}`, ""))(assigneesA, assigneesB);
			},
			getApplyQuickFilterFn: (searchValue) => ({ value }) => isFuzzyMatch(value.assignees.map((e) => e.username), searchValue),
			renderCell: ({ value }) => (
				<Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
					{value.assignees.map(({ username, avatar }, ind) => (
						<Image
							key={`${username}_${ind}_${value._id}`}
							src={avatar}
							alt={username}
							title={username}
							width="24px"
							height="24px"
							wrapperStyle={{ margin: "0.2rem" }}
							sx={{ borderRadius: "50%" }}
						/>
					))}
				</Box>
			),
		},
		{
			field: "Last Updated",
			width: 170,
			valueGetter: ({ row }) => ({ updatedAt: row.updatedAt, pinned: row.pinned }),
			valueFormatter: ({ value }) => value.updatedAt,
			sortComparator: ({ pinned: pinnedA, updatedAt: updatedAtA }, { pinned: pinnedB, updatedAt: updatedAtB }) => {
				if (pinnedA) return sortModelEpics[0].sort === "desc" ? 1 : -1;
				if (pinnedB) return sortModelEpics[0].sort === "desc" ? -1 : 1;
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
				closed,
				_id,
				title,
				dueDate,
				startDate,
				tasks: epicTasks,
				tasksBlockedBy,
				external,
				metadata,
			} }) => (
				<ToggleButtonGroup key={_id} exclusive size="small" aria-label="actions">
					<ToggleButton
						value={`view${external ? "" : "/edit"}`}
						title={`view${external ? "" : "/edit"}`}
						aria-label={`view${external ? "" : "/edit"}`}
						onClick={() => {
							setEditEpicData((p) => {
								Object.assign(p, {
									title,
									_id,
									startDate,
									dueDate,
									tasks: epicTasks,
									tasksBlockedBy,
									external,
								});
							});
							const parsed = queryString.parse(location.search);
							parsed.id = _id;
							navigate(queryString.stringifyUrl({ url: location.pathname, query: parsed }), { replace: true });
							setEpicModal(true);
						}}
					>
						<Info color="primary" />
					</ToggleButton>
					{!external && (
						<ToggleButton
							aria-label="reopen"
							title="reopen"
							value="reopen"
							disabled={!closed}
							style={{ ...(closed && { color: theme.palette.red[500] }) }}
							onClick={() => closed && submitReopenEpic(_id)}
						>
							<History />
						</ToggleButton>
					)}
					{!external && (
						<ToggleButton
							aria-label="close"
							title="close"
							value="close"
							disabled={closed}
							style={{ ...(!closed && { color: theme.palette.secondary.main }) }}
							color="secondary"
							onClick={() => !closed && submitCloseEpic(_id)}
						>
							<Done />
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
		location.pathname,
		location.search,
		navigate,
		setEditEpicData,
		sortModelEpics,
		submitCloseEpic,
		submitReopenEpic,
		submitUpdateEpicPin,
		theme,
	]);

	return (
		<>
			<Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
				<Button
					variant="outlined"
					size="medium"
					color="epic"
					sx={{ justifySelf: "flex-end", mr: 1 }}
					disabled={isLoadingEpics && !submittingEpic}
					startIcon={<PostAdd />}
					onClick={() => {
						setEditEpicData((p) => { Object.assign(p, initialEditEpicData); });
						setNewEpicModal(true);
					}}
				>
					{"Create Epic"}
					{submittingEpic && <CircularProgress size={24} sx={{ color: "common.white" }} />}
				</Button>
				<Button
					color="pink"
					variant="contained"
					size="medium"
					sx={{ justifySelf: "flex-end", color: "common.white" }}
					disabled={isLoading || isLoadingEpics || isLoadingSprints || submitting}
					startIcon={<PostAdd />}
					onClick={() => {
						setEditTaskData((p) => {
							Object.assign(p, initialEditTaskData);
							p.availableEpics = epics;
							p.availableLabels = project.availableLabels;
							p.availableAssignees = project.team;
							p.availableReviewers = project.team;
						});
						setNewTaskModal(true);
					}}
				>
					{"Create Task"}
					{submitting && <CircularProgress size={24} />}
				</Button>
			</Box>
			<DataTable
				tableName="tasks"
				rows={[...tasks].filter((e) => showClosedTasks || !e.closed)}
				loading={isLoading}
				columns={tasksTableColumns}
				rowHeight={70}
				sortModel={sortModelTasks}
				toolbar={(
					<Button
						startIcon={showClosedTasks ? <ToggleOn color="secondary" /> : <ToggleOff />}
						onClick={() => {
							toggleShowClosedTasks();
							const parsed = queryString.parse(location.search);
							parsed.showClosed = !showClosedTasks || undefined;
							navigate(queryString.stringifyUrl({ url: location.pathname, query: parsed }), { replace: true });
						}}
					>
						{"closed tasks"}
					</Button>
				)}
				initialState={{
					filter: { filterModel: { items: [], quickFilterValues: [location.state?.assignee] } },
					pagination: { paginationModel: { page: 0 } },
				}}
				onSortModelChange={(newSortModel) => setSortModelTasks(newSortModel)}

			/>
			<DataTable
				tableName="epics"
				sx={{ mt: 4 }}
				color="epic.main"
				rows={[...epics].filter((e) => showClosedEpics || !e.closed)}
				loading={isLoadingEpics}
				columns={epicsTableColumns}
				rowHeight={70}
				sortModel={sortModelEpics}
				toolbar={(
					<Button
						startIcon={showClosedEpics ? <ToggleOn color="secondary" /> : <ToggleOff />}
						onClick={() => {
							toggleShowClosedEpics();
							const parsed = queryString.parse(location.search);
							parsed.showClosedEpics = !showClosedEpics || undefined;
							navigate(queryString.stringifyUrl({ url: location.pathname, query: parsed }), { replace: true });
						}}
					>
						{"closed epics"}
					</Button>
				)}
				onSortModelChange={(newSortModel) => setSortModelEpics(newSortModel)}
			/>
			<GitTask
				open={newTaskModal}
				title="Create a new Task!"
				task={editTaskData}
				tasks={tasks}
				pId={project._id}
				onClose={() => {
					setNewTaskModal(false);
					setEditTaskData((p) => { Object.assign(p, initialEditTaskData); });
				}}
				onSubmit={submitNewTask}
			/>
			<CreateEpic
				open={newEpicModal}
				title="Create a new Epic!"
				epic={editEpicData}
				tasks={tasks}
				pId={project._id}
				onClose={() => {
					setNewEpicModal(false);
					setEditEpicData((p) => { Object.assign(p, initialEditEpicData); });
				}}
				onSubmit={submitNewEpic}
			/>
			<Task
				open={taskModal}
				title={`View${editTaskData.external ? "" : " / Edit Task"}`}
				task={editTaskData}
				tasks={tasks}
				pId={project._id}
				kanban={project.kanban}
				team={project.team}
				comments={comments}
				isLoadingComments={isLoadingComments}
				sprints={sprints}
				submitting={submitting}
				onClose={() => {
					setSelectedTaskId();
					setEditTaskData((p) => { Object.assign(p, initialEditTaskData); });
					const { id: _, ...o } = queryString.parse(location.search);
					navigate(queryString.stringifyUrl({ url: location.pathname, query: o }), { replace: true });
					setTaskModal(false);
					mutateEpics();
				}}
				onUpdateTask={onUpdateTask}
				onSubmit={onSubmit}
				onUpdate={onUpdate}
				onDelete={onDelete}
			/>
			<Epic
				open={epicModal}
				title={`View${editEpicData.external ? "" : " / Edit Epic"}`}
				epic={editEpicData}
				tasks={tasks}
				pId={project._id}
				submitting={submittingEpic}
				onClose={() => {
					setEditEpicData((p) => { Object.assign(p, initialEditEpicData); });
					const { id: _, ...o } = queryString.parse(location.search);
					navigate(queryString.stringifyUrl({ url: location.pathname, query: o }), { replace: true });
					setEpicModal(false);
				}}
				onUpdateEpic={useCallback((epic) => {
					if (!submittingEpic) {
						setSubmittingEpic(true);
						updateEpic(project._id, epic._id, epic).then((uEpic) => {
							const updatedEpic = epics.findIndex((x) => x._id === uEpic._id);
							const updatedEpics = [...epics];
							updatedEpics[updatedEpic] = { ...epics[updatedEpic], ...uEpic };
							mutateEpics(updatedEpics);
							setSubmittingEpic(false);
							success("Epic updated!");
						}).catch(() => error());
						setSubmittingEpic(false);
						setEditEpicData((p) => Object.assign(p, epic));
					}
				}, [submittingEpic, JSON.stringify(editEpicData)]) /* eslint-disable-line react-hooks/exhaustive-deps */}
			/>
		</>
	);
};

ProjectTaskManagement.propTypes = { project: PropTypes.object.isRequired };

export default ProjectTaskManagement;
