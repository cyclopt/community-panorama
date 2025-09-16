import { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { Typography, Grid, Box, Switch, MenuItem, IconButton, Skeleton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import queryString from "query-string";
import { ControlledBoard as Board, moveCard } from "@caldwell619/react-kanban";
import { PostAdd, Search as SearchIcon, EditNote } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { dateNewToOld } from "@iamnapo/sort";
import pluralize from "pluralize";
import { shallow } from "zustand/shallow";
import { produce } from "immer";
import { LoadingButton } from "@mui/lab";
import { useImmer } from "use-immer";

import { POSSIBLE_COLUMNS, useLocalStorage, useSnackbar, dayjs, taskIsSearchMatch } from "../../utils/index.js";
import GitTask from "../../components/GitTask.jsx";
import KanbanCard from "../../components/KanbanCard.jsx";
import Task from "../../components/Task.jsx";
import Sprint from "../../components/Sprint.jsx";
import Select from "../../components/Select.jsx";
import CreateSprint from "../../components/CreateSprint.jsx";
import {
	defaultTimeRange,
	KanbanCardSkeleton,
	Root,
	Search,
	SearchIconWrapper,
	StyledInputBase,
	timeRangeOptions,
} from "../../components/KanbanCommon.jsx";
import {
	closeTask,
	deleteTaskComment,
	deleteSprint,
	useTaskComments,
	reopenTask,
	submitTask,
	submitTaskComment,
	updateTask,
	updateTaskComment,
	updateTaskPin,
	updateTaskStatus,
	updateTaskSubscription,
	useProjectEpics,
	useProjectSprints,
	useProjectSprintTasks,
	submitSprint,
	updateSprint,
} from "../../api/index.js";

const classes = {
	root: "ProjectsSprints-root",
	bar: "ProjectsSprints-bar",
	determinate: "ProjectsSprints-determinate",
	progressText: "ProjectsSprints-progressText",
	caption: "ProjectsSprints-caption",
};

const ProjectSprints = (props) => {
	const { project } = props;
	const { pathname, search, state } = useLocation();
	const navigate = useNavigate();
	const { success, error } = useSnackbar();
	const { tasks = [], isLoading, isError, mutate } = useProjectSprintTasks(project._id);
	const [selectedTaskId, setSelectedTaskId] = useState();
	const {
		sprints = [],
		isLoading: isLoadingSprints,
		isError: isErrorSprints,
		mutate: mutateSprints,
	} = useProjectSprints(project._id);
	const {
		comments = [],
		isLoading: isLoadingComments,
		isError: isErrorComments,
		mutate: mutateComments,
	} = useTaskComments(project?._id, selectedTaskId);
	const { epics = [], isLoading: isLoadingEpics, isError: isErrorEpics } = useProjectEpics(project._id);
	const [submitting, setSubmitting] = useState(false);
	const [timeFilter, setTimeFilter] = useState(defaultTimeRange);
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
		external: false,
		blocked: false,
		blockedBy: null,
		status: "",
		notificationDay: "never",
	}), []);
	const initialSprintData = useMemo(() => ({
		title: "",
		startDate: null,
		endDate: null,
		repeat: false,
		origin: null,
		repetitions: 0,
	}), []);
	const [editTaskData, setEditTaskData] = useImmer(initialEditTaskData);
	const [editSprintData, setEditSprintData] = useImmer(initialSprintData);
	const { showClosedTasks, toggleShowClosedTasks, kanbanTheme } = useLocalStorage(useCallback((e) => ({
		showClosedTasks: e.showClosedTasks,
		toggleShowClosedTasks: e.toggleShowClosedTasks,
		kanbanTheme: e.kanbanTheme,
	}), []), shallow);
	const [filtered, setFiltered] = useState([
		{ id: "updatedAt", value: timeFilter },
		{ id: "closed", value: !showClosedTasks },
		...((state?.assignee) ? [{ id: "assignees", value: state.assignee }] : []),
	]);
	const [newTaskModal, setNewTaskModal] = useState(false);
	const [taskModal, setTaskModal] = useState(false);
	const [sprintModal, setSprintModal] = useState(false);
	const [newSprintModal, setNewSprintModal] = useState(false);
	const columnOptions = useMemo(() => [
		{ id: POSSIBLE_COLUMNS.get(project.kanban.style)[0], title: POSSIBLE_COLUMNS.get(project.kanban.style)[0] },
		{ id: "Sprint Planning", title: "Sprint Planning" },
		...sprints.map((s) => ({
			id: s?._id,
			title: s?.title,
			subtitle: `(${dayjs(s?.startDate).format("DD/MM/YYYY")} - ${dayjs(s?.endDate).format("DD/MM/YYYY")})`,
			sprint: s,
		})),
	], [project.kanban.style, sprints]);

	const [board, setBoard] = useState({
		columns: columnOptions.map((col) => ({
			id: (col?.id === "Archived") ? col?.id : `${col?.id}-${kanbanTheme}` ?? `${col?.title}-${kanbanTheme}`,
			title: col?.title,
			subtitle: col?.subtitle,
			titleStyle: { width: "100%" },
			cards: [],
			sprint: col?.sprint ?? null,
		})),
	});
	const [searchValue, setSearchValue] = useImmer("");
	const theme = useTheme();

	const submitCloseTask = useCallback(async (id) => {
		try {
			const task = await closeTask(project._id, id);
			mutate((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === id);
				draft[ind] = { ...draft[ind], ...task };
			}), false);
			success("Task closed!");
		} catch ({ response }) {
			error(response.status === 400 ? "You can’t close a blocked task." : "");
		}
	}, [error, mutate, project._id, success]);

	const submitReopenTask = useCallback(async (id) => {
		try {
			const task = await reopenTask(project._id, id);
			mutate((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === id);
				draft[ind] = { ...draft[ind], ...task };
			}), false);
			success("Task reopened!");
		} catch {
			error();
		}
	}, [project._id, mutate, success, error]);

	const submitUpdateTaskStatus = useCallback(async (id, setTo, setToSprintId, from, to) => {
		try {
			if (from && to) setBoard((b) => moveCard(b, from, to));
			const task = await updateTaskStatus(project._id, id, setTo, setToSprintId);
			mutate((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === id);
				draft[ind] = { ...draft[ind], ...task };
			}));
			success("Task updated!");
		} catch {
			if (from && to) {
				setBoard((b) => (moveCard(
					b,
					{ fromPosition: to.toPosition, fromColumnId: to.toColumnId },
					{ toPosition: from.fromPosition, toColumnId: from.fromColumnId },
				)));
			}

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

	const submitNewTask = useCallback(async (data = editTaskData) => {
		try {
			if (submitting) return;
			setSubmitting(true);
			await submitTask(project._id, data);
			mutate();
			setSubmitting(false);
			setNewTaskModal(false);
			success("Task submitted!");
		} catch {
			error();
		}
	}, [editTaskData, error, mutate, project._id, submitting, success]);

	const viewOrEditTask = useCallback((task) => {
		try {
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
			const parsed = queryString.parse(search);
			parsed.id = task._id;
			navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
			setTaskModal(true);
		} catch {
			error();
		}
	}, [project.availableLabels, project.team, setEditTaskData, search, navigate, pathname, epics, error]);

	const viewOrEditSprint = useCallback((sprint_) => {
		try {
			const parsed = queryString.parse(search);
			parsed.id = sprint_._id;
			navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
			setSprintModal(true);
		} catch {
			error();
		}
	}, [error, navigate, pathname, search]);

	useEffect(() => {
		if (isError || isErrorEpics || isErrorSprints || isErrorComments) error();
	}, [error, isError, isErrorComments, isErrorEpics, isErrorSprints]);

	useEffect(() => setFiltered((p) => [...(p || []).filter((x) => x.id !== "closed"), { id: "closed", value: showClosedTasks }]), [showClosedTasks]);

	useEffect(() => {
		if (newTaskModal || taskModal) return;
		const filterInput = document.querySelector(`#input_${filtered.at(-1)?.id}`);
		if (filterInput) filterInput.focus();
	}, [filtered, newTaskModal, taskModal]);

	useEffect(() => {
		const parsed = queryString.parse(search);
		if (parsed.searchValue && searchValue !== parsed.searchValue) {
			setSearchValue(parsed.searchValue);
		}

		if (!parsed?.showClosed && showClosedTasks) {
			parsed.showClosed = true;
			navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
		}
	}, [navigate, pathname, search, searchValue, setSearchValue, showClosedTasks]);

	useEffect(() => {
		try {
			const parsed = queryString.parse(search);
			if (parsed["time-range"]) {
				const newVal = timeRangeOptions.find((el) => el.label === parsed["time-range"]) || defaultTimeRange;
				setTimeFilter(newVal);
				setFiltered((prev) => [...(prev || []).filter((x) => x.id !== "updatedAt"), { id: "updatedAt", value: newVal }]);
			}

			if (!taskModal && parsed.id) {
				const task = tasks.find((e) => e._id === parsed.id);
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
				}

				const sprint_ = sprints.find((s) => s._id === parsed.id);
				if (sprint_) {
					setEditSprintData((p) => { Object.assign(p, sprint_); });
					setSprintModal(true);
				}
			}
		} catch {
			error();
		}
	}, [search, tasks, taskModal, project, setTaskModal, error, setEditTaskData, epics, sprints, setEditSprintData]);

	useEffect(() => {
		setBoard({
			columns: columnOptions.map((col) => ({
				id: (col?.id === "Archived") ? col?.id : `${col?.id}-${kanbanTheme}` ?? `${col?.title}-${kanbanTheme}`,
				title: col?.title,
				subtitle: col?.subtitle,
				titleStyle: { width: "100%" },
				sprint: col?.sprint ?? {},
				...(tasks.length > 0
					? {
						cards: tasks
							?.filter(
								(e) => ((col?.sprint?._id)
									? (col?.id === e?.sprint && e.status === "Sprint Planning")
									: (col.title === "Sprint Planning")
										? (!e.sprint && col.title === e.status)
										: (col.title === e.status))
									&& filtered.every((filter) => {
										if (filter.id === "updatedAt") {
											if (filter.value.value === "all") return true;
											const from = dayjs().startOf("day").subtract(Number(filter.value.value.split(" ")[0]), filter.value.value.split(" ")[1]);
											return dayjs(e.updatedAt).isAfter(from);
										}

										if (filter.id === "closed") return filter.value || !e.closed;
										return filter.value === e[filter.id];
									})
									&& taskIsSearchMatch(e, searchValue),
							)
							?.sort((a, b) => {
								if (a.pinned) return -1;
								if (b.pinned) return 1;
								return dateNewToOld((v) => new Date(v.updatedAt))(a, b);
							})
							?.map((task) => ({
								id: task._id,
								title: task.title,
								label: task.updatedAt,
								dueDate: task.dueDate,
								description: task.body,
								tags: task.labels.map((lbl) => ({
									title: lbl,
									bgcolor: "#EEE",
									color: theme.palette.getContrastText("#EEE"),
								})),
								pinned: task.pinned || false,
								points: task.points,
								done: task?.points?.done || 0,
								total: task?.points?.total || 0,
								ratio: ["Delivered", "Accepted"].includes(task.status)
									? 100 : ((task?.points?.total ?? 1)
										? Math.trunc(((task?.points?.done || 0) / (task?.points?.total || 0)) * 100)
										: 0),
								assignees: task.assignees,
								reviewers: task.reviewers,
								closed: task.closed,
								updatedAt: task.updatedAt,
								priority: task.priority,
								external: task.external,
								blocked: task.blocked,
								blockedBy: task.blockedBy,
								status: task.status,
								metadata: task.metadata,
								viewerIsSubscribed: task.viewerIsSubscribed,
								onClickViewEdit: () => viewOrEditTask(task),
								onClickReopen: () => {
									if ([
										project.kanban.style === "none" ? "Closed" : (project.kanban.style === "minimal" ? "Done" : "Delivered"),
										project.kanban.style === "none" ? "Closed" : (project.kanban.style === "minimal" ? "Done" : "Accepted"),
									].includes(task.status) && task.closed) submitReopenTask(task._id);
								},
								onClickClose: () => !task.closed && submitCloseTask(task._id),
								onClickPin: () => submitUpdateTaskPin(task._id, !task.pinned),
								onClickSubscribe: () => submitUpdateTaskSubscription(task._id, !task.viewerIsSubscribed),
								onSubmitUpdateTaskStatus: (a, b, c) => submitUpdateTaskStatus(a, b, c),
							})),
					} : { cards: [{}, {}] }),
			})),
		});
	}, [columnOptions, filtered, tasks, project.kanban.style, submitCloseTask, submitReopenTask,
		submitUpdateTaskPin, submitUpdateTaskSubscription, theme.palette, viewOrEditTask,
		searchValue, sprints, kanbanTheme, submitUpdateTaskStatus]);

	const onUpdateTask = useCallback(async (task) => {
		if (!submitting) {
			setSubmitting(true);
			await updateTask(project._id, task._id, task).then((uTask) => {
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
				success("Comment submitted!");
				mutateComments(commentS.map((e) => ({ ...e, updatedAt: new Date(e.updatedAt) })));
			}).catch(() => error());
			setSubmitting(false);
		}
	}, [submitting, project._id, selectedTaskId, success, mutateComments, error]);

	const onUpdate = useCallback((comment) => {
		if (comment.body.length > 0 && !submitting) {
			setSubmitting(true);
			updateTaskComment(project._id, selectedTaskId, comment._id, comment.body).then((commentS) => {
				success("Comment updated!");
				mutateComments(commentS.map((e) => ({ ...e, updatedAt: new Date(e.updatedAt) })));
			}).catch(() => error());
			setSubmitting(false);
		}
	}, [error, mutateComments, project._id, selectedTaskId, submitting, success]);

	const onDelete = useCallback((comment) => {
		if (!submitting) {
			setSubmitting(true);
			deleteTaskComment(project._id, selectedTaskId, comment._id).then((commentS) => {
				success("Comment deleted!");
				mutateComments(commentS.map((e) => ({ ...e, updatedAt: new Date(e.updatedAt) })));
			}).catch(() => error());
			setSubmitting(false);
		}
	}, [error, mutateComments, project._id, selectedTaskId, submitting, success]);

	return (
		<Root cls={classes} style={{ display: "flex", flexDirection: "column", flexGrow: 1, alignContent: "flex-start" }}>
			<div className="container" style={{ flexGrow: 0, margin: "1rem auto 0" }}>
				<Grid container mb={1} direction="row" justifyContent="space-between" alignItems="flex-end">
					<Grid item container xs={12} md={8} alignItems="flex-end">
						<Grid item container flexGrow={1} maxWidth="12rem" my={0.5} flexWrap="nowrap" flexDirection="center" justifyContent="flex-start" alignItems="center">
							<Grid item>
								<Typography variant="h6" color="primary" align="right">{"Show closed:"}</Typography>
							</Grid>
							<Grid item>
								<Switch
									checked={showClosedTasks}
									onChange={() => {
										toggleShowClosedTasks();
										const parsed = queryString.parse(search);
										parsed.showClosed = !showClosedTasks || undefined;
										navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
									}}
								/>
							</Grid>
						</Grid>
						<Grid item container flexGrow={1} maxWidth="20rem" my={0.5} pr={2} flexWrap="nowrap" flexDirection="center" justifyContent="flex-start" alignItems="center">
							<Grid item pr={1}>
								<Typography variant="h6" color="primary">{"Time Range:"}</Typography>
							</Grid>
							<Grid item style={{ flexGrow: 1 }}>
								<Select
									id="timePeriod"
									value={timeFilter?.value || ""}
									onChange={(e) => {
										const newVal = timeRangeOptions.find((el) => el.value === e.target.value) || defaultTimeRange;
										const parsed = queryString.parse(search);
										parsed["time-range"] = newVal.label;
										navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
										setTimeFilter(newVal);
										setFiltered((prev) => [...(prev || []).filter((x) => x.id !== "updatedAt"), { id: "updatedAt", value: newVal }]);
									}}
								>
									{timeRangeOptions.map((el, ind) => <MenuItem key={`periodOption_${el}_${ind}`} value={el.value}>{el.label}</MenuItem>)}
								</Select>
							</Grid>
						</Grid>
						<Grid item flexGrow={1} my={0.5} maxWidth="20rem" flexDirection="center" justifyContent="flex-start" alignItems="center">
							<Search>
								<SearchIconWrapper>
									<SearchIcon />
								</SearchIconWrapper>
								<StyledInputBase
									placeholder="Search…"
									inputProps={{ "aria-label": "search" }}
									value={searchValue}
									size="medium"
									onChange={(e) => {
										const parsed = queryString.parse(search);
										parsed.searchValue = e.target.value;
										navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
										setSearchValue(e.target.value);
									}}
								/>
							</Search>
						</Grid>
					</Grid>
					<Grid item container xs={12} md={4} my={0.5} columnGap="10px" alignItems="center" justifyContent="flex-end" flexWrap="nowrap">
						<Grid item>
							<LoadingButton
								color="primary"
								sx={{ whiteSpace: "nowrap" }}
								loading={isLoading || isLoadingEpics || submitting}
								variant="outlined"
								startIcon={<PostAdd />}
								onClick={() => setNewSprintModal(true)}
							>
								{"Create Sprint"}
							</LoadingButton>
						</Grid>
						<Grid item>
							<LoadingButton
								color="pink"
								sx={{ color: "common.white", whiteSpace: "nowrap" }}
								loading={isLoading || isLoadingEpics || submitting}
								variant="contained"
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
							</LoadingButton>
						</Grid>
					</Grid>
				</Grid>
			</div>
			<Grid container flexGrow={1} width="98vw" sx={{ margin: "0 auto" }} id="board">
				{isLoading || isLoadingEpics || isLoadingSprints ? (
					<Board
						disableColumnDrag
						renderCard={() => (
							<KanbanCardSkeleton
								el={isLoading || isLoadingEpics || isLoadingSprints}
							/>
						)}
						renderColumnHeader={({ title }) => (
							<Grid container direction="column" justifyContent="space-between">
								<Grid item container direction="row" justifyContent="space-between" alignItems="flex-start">
									<Grid item width="100%">
										<Typography variant="h6" sx={{ fontWeight: "bold", paddingTop: 1 }}>
											{title}
										</Typography>
										<br />
										<Skeleton variant="text" width="80%" height="20px" sx={{ mb: 1 }} />
									</Grid>
								</Grid>
							</Grid>
						)}
					>
						{board}
					</Board>
				) : (
					<Board
						disableColumnDrag
						renderCard={(p) => {
							if (Object.keys(p).length > 0) return (<KanbanCard {...p} />);
							return null;
						}}
						renderColumnHeader={({ title, subtitle, sprint: sprint_, cards }) => {
							let points = 0;
							let reviewPoints = 0;
							let totalPoints = 0;
							for (const task of cards) {
								totalPoints += task?.points?.total ?? 1;
								points += (task?.points?.total || 0) - (task?.points?.done || 0);
								reviewPoints += task?.points?.review || 0;
							}

							let remaining = `${Number(points.toFixed(2))} remaining`;
							if (points < 0) remaining = `Overflow by ${-points}`;

							return (
								<Grid container direction="column" justifyContent="space-between">
									<Grid item container direction="row" justifyContent="space-between" alignItems="flex-start">
										<Grid item>
											<Typography
												variant="h6"
												sx={{
													pt: 1,
													fontWeight: "bold",
													overflow: "hidden",
													maxWidth: "25ch",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
												}}
											>
												{title}
												{(Object.keys(sprint_ ?? {}).length === 0 && title === "Sprint Planning") && <Box ml={0.5} fontWeight="normal" display="inline">{"(Default)"}</Box>}
											</Typography>
											{subtitle ? (
												<Typography variant="subtitle2" fontWeight="normal" fontStyle="italic">
													{subtitle}
												</Typography>
											) : <br />}
										</Grid>
										{(Object.keys(sprint_ ?? {}).length > 0) && (
											<IconButton aria-label="edit" sx={{ color: "white" }} onClick={() => viewOrEditSprint(sprint_)}>
												<EditNote />
											</IconButton>
										)}
									</Grid>
									{
										cards.length > 0 ? (
											<Grid item>
												<Typography variant="body2" style={{ fontWeight: "bold", lineHeight: 2 }}>
													{`${pluralize("task", cards.length, true)} | ${pluralize("point", Number(totalPoints.toFixed(2)), true)} (${remaining}) | ${pluralize("review points", Number(reviewPoints.toFixed(2)), true)}`}
												</Typography>
											</Grid>
										) : null
									}
								</Grid>
							);
						}}
						onCardDragEnd={({ id, external }, from, to) => {
							const { fromColumnId } = from;
							const { toColumnId } = to;
							const fromColumn = fromColumnId.split(`-${kanbanTheme}`)[0];
							const toColumn = toColumnId.split(`-${kanbanTheme}`)[0];
							const possibleToColumnSprintId = sprints.find((s) => s._id === toColumn)?._id;
							if (external) {
								error("This is an external task. You can edit it on GitHub.");
							} else if (fromColumn !== toColumn) {
								if (possibleToColumnSprintId) submitUpdateTaskStatus(id, "Sprint Planning", possibleToColumnSprintId, from, to);
								else submitUpdateTaskStatus(id, toColumn, null, from, to);
							}
						}}
					>
						{board}
					</Board>
				)}
			</Grid>
			<GitTask
				open={newTaskModal}
				title="Create a new Task!"
				task={editTaskData}
				tasks={tasks}
				pId={project._id}
				updateTask={setEditTaskData}
				onClose={() => {
					setNewTaskModal(false);
					setEditTaskData((p) => {
						Object.assign(p, {
							initialEditTaskData,
						});
					});
				}}
				onSubmit={submitNewTask}
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
					setEditTaskData((p) => {
						Object.assign(p, {
							initialEditTaskData,
						});
					});
					const { id: _, ...o } = queryString.parse(search);
					navigate(queryString.stringifyUrl({ url: pathname, query: o }), { replace: true });
					setTaskModal(false);
				}}
				onUpdateTask={onUpdateTask}
				onSubmit={onSubmit}
				onUpdate={onUpdate}
				onDelete={onDelete}
			/>
			<CreateSprint
				open={newSprintModal}
				title="Create a new Sprint!"
				pId={project._id}
				onClose={() => setNewSprintModal(false)}
				onSubmit={async (s, pid) => {
					try {
						if (submitting) return;
						setSubmitting(true);
						await submitSprint(pid, s);
						mutateSprints();
						setSubmitting(false);
						setNewSprintModal(false);
						success("Sprint submitted!");
					} catch { error(); }
				}}
			/>
			<Sprint
				open={sprintModal}
				title="View / Edit Sprint"
				pId={project._id}
				sprint={editSprintData}
				onClose={() => {
					setEditSprintData((p) => { Object.assign(p, initialSprintData); });
					const { id: _, ...o } = queryString.parse(search);
					navigate(queryString.stringifyUrl({ url: pathname, query: o }), { replace: true });
					setSprintModal(false);
				}}
				onSubmit={useCallback((sprint_, propagate) => {
					if (!submitting) {
						setSubmitting(true);
						updateSprint(project._id, sprint_._id, sprint_, propagate).then((uSprints) => {
							const updatedSprints = uSprints.reduce((updatedSprints_, uSprint) => {
								const uSprintIndex = sprints.findIndex((x) => x._id === uSprint._id);
								updatedSprints_[uSprintIndex] = { ...sprints[uSprintIndex], uSprint };
								return updatedSprints_;
							}, [...sprints]);
							mutateSprints(updatedSprints);
							setSubmitting(false);
							success("Sprint updated!");
						}).catch(() => error());
						setSubmitting(false);

						setEditSprintData((p) => { Object.assign(p, initialSprintData); });
						const { id: _, ...o } = queryString.parse(search);
						navigate(queryString.stringifyUrl({ url: pathname, query: o }), { replace: true });
						setSprintModal(false);
					}
				}, [submitting, JSON.stringify(editSprintData)])} /* eslint-disable-line react-hooks/exhaustive-deps */
				onDelete={useCallback((sprint_, propagate) => {
					if (!submitting) {
						setSubmitting(true);
						deleteSprint(project._id, sprint_._id, propagate).then((dSprints) => {
							const deletedSprints = dSprints.reduce((splicedSprints, dSprint) => {
								const dSprintIndex = splicedSprints?.findIndex((x) => x._id === dSprint._id);
								return [...splicedSprints].splice(dSprintIndex);
							}, [...sprints]);
							const updatedTasks = [...tasks].reduce((uts, t) => {
								if (dSprints.some((ds) => String(ds._id) === String(t.sprint))) {
									t.sprint = null;
									t.status = "Backlog";
								}

								uts.push(t);
								return uts;
							}, []);
							mutateSprints(deletedSprints);
							mutate(updatedTasks);
							setSubmitting(false);
							success("Sprint removed!");
						});

						setEditSprintData((p) => { Object.assign(p, initialSprintData); });
						const { id: _, ...o } = queryString.parse(search);
						navigate(queryString.stringifyUrl({ url: pathname, query: o }), { replace: true });
						setSprintModal(false);
					}
				}, [submitting, JSON.stringify(editSprintData)])} /* eslint-disable-line react-hooks/exhaustive-deps */
			/>
		</Root>
	);
};

ProjectSprints.propTypes = { project: PropTypes.object.isRequired };

export default ProjectSprints;
