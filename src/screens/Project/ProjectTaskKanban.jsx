import { useState, useEffect, useMemo, useCallback, forwardRef } from "react";
import PropTypes from "prop-types";
import {
	Grid,
	Switch,
	MenuItem,
	Typography,
	Skeleton,
	Button,
	Slide,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Box,
	InputAdornment,
	Autocomplete,
	TextField,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import queryString from "query-string";
import { ControlledBoard as Board, moveCard } from "@caldwell619/react-kanban";
import { PostAdd, Close, Search as SearchIcon } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { dateNewToOld } from "@iamnapo/sort";
import pluralize from "pluralize";
import { shallow } from "zustand/shallow";
import { produce } from "immer";
import { LoadingButton } from "@mui/lab";
import { useImmer } from "use-immer";
import { useDebouncedCallback } from "use-debounce";

import { POSSIBLE_COLUMNS, MUTATION_DELAY_IN_MS, useLocalStorage, useSnackbar, dayjs, taskIsSearchMatch } from "../../utils/index.js";
import GitTask from "../../components/GitTask.jsx";
import KanbanCard from "../../components/KanbanCard.jsx";
import Task from "../../components/Task.jsx";
import Select from "../../components/Select.jsx";
import CollaboratorsPointInfoBar from "../../components/CollaboratorsPointInfoBar.jsx";
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
	closeTasks,
	deleteTaskComment,
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
	useProjectTasks,
	useProjectSprints,
} from "../../api/index.js";

const classes = {
	root: "ProjectTaskKanban-root",
	bar: "ProjectTaskKanban-bar",
	determinate: "ProjectTaskKanban-determinate",
	progressText: "ProjectTaskKanban-progressText",
	caption: "ProjectTaskKanban-caption",
};

const Transition = forwardRef((props, ref) => <Slide ref={ref} direction="up" {...props} />);

const ProjectTaskKanban = (props) => {
	const { project } = props;
	const { pathname, search, state } = useLocation();
	const navigate = useNavigate();
	const { success, error } = useSnackbar();
	const { tasks = [], isLoading, isError, mutate } = useProjectTasks(project._id);
	const { sprints = [], isLoading: isLoadingSprints, isError: isErrorSpints } = useProjectSprints(project._id, false);
	const { epics = [], isLoading: isLoadingEpics, isError: isErrorEpics, mutate: mutateEpics } = useProjectEpics(project._id);
	const [submitting, setSubmitting] = useState(false);
	const [isLoadingClosingTasks, setIsLoadingClosingTasks] = useState(false);
	const [areYouSureDialogOpen, setAreYouSureDialogOpen] = useState(false);
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
		notificationDay: "never",
		availableAssignees: [],
		availableReviewers: [],
		assignees: [],
		reviewers: [],
		dueDate: null,
		external: false,
		blocked: false,
		blockedBy: null,
		status: "",
		sprint: null,
	}), []);
	const [editTaskData, setEditTaskData] = useImmer({ ...initialEditTaskData, ignorePoints: false });
	const {
		showClosedTasks,
		toggleShowClosedTasks,
		kanbanTheme,
		currentSprint,
		setCurrentSprint,
	} = useLocalStorage(useCallback((e) => ({
		showClosedTasks: e.showClosedTasks,
		toggleShowClosedTasks: e.toggleShowClosedTasks,
		kanbanTheme: e?.kanbanTheme,
		currentSprint: e?.currentSprint,
		setCurrentSprint: e?.setCurrentSprint,
	}), []), shallow);
	const [selectedTaskId, setSelectedTaskId] = useState();
	const [filtered, setFiltered] = useState([
		{ id: "updatedAt", value: timeFilter },
		{ id: "closed", value: !showClosedTasks },
		{ id: "epic", value: null },
		...((state?.assignee) ? [{ id: "assignees", value: state.assignee }] : []),
	]);
	const [newTaskModal, setNewTaskModal] = useState(false);
	const [taskModal, setTaskModal] = useState(false);
	const columnOptions = useMemo(() => [
		...POSSIBLE_COLUMNS.get(project.kanban.style),
		...(project.kanban.hasArchived ? ["Archived"] : []),
	], [project.kanban.hasArchived, project.kanban.style]);
	const [board, setBoard] = useState({
		columns: columnOptions.map((col) => ({
			id: (col === "Archived") ? col : `${col}-${kanbanTheme}`,
			title: col,
			titleStyle: { width: "100%" },
			cards: [],
			sprint: col?.sprint ?? {},
		})),
	});
	const {
		comments = [],
		isLoading: isLoadingComments,
		isError: isErrorComments,
		mutate: mutateComments,
	} = useTaskComments(project?._id, selectedTaskId);
	const [searchValue, setSearchValue] = useImmer("");
	const [debouncedSearchValue, setDebouncedSearchValue] = useImmer("");
	const theme = useTheme();
	const [selectedEpic, setSelectedEpic] = useState(null);

	const availableEpicOptions = useMemo(() => epics.filter((t) => !t.closed), [epics]);

	const debounceSearchValue = useDebouncedCallback((v) => {
		setDebouncedSearchValue(v);
		const parsed = queryString.parse(search);
		parsed.searchValue = v;
		navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
	}, MUTATION_DELAY_IN_MS);

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
			}));
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
			}));
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
			}));
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
			mutateEpics();
			setSubmitting(false);
			setNewTaskModal(false);
			success("Task submitted!");
		} catch {
			error();
		}
	}, [editTaskData, submitting, project._id, mutate, mutateEpics, success, error]);

	const handleEpicSelection = useCallback((epic = selectedEpic) => {
		try {
			if (epic._id === selectedEpic?._id) {
				// Clear selection
				setSelectedEpic(null);
				setFiltered((prev) => [...(prev || []).filter((x) => x.id !== "epic"), { id: "epic", value: null }]);
				const parsed = queryString.parse(search);
				delete parsed.epic;
				navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
				return;
			}

			const newVal = epic?._id;
			const parsed = queryString.parse(search);
			parsed.epic = newVal;
			setSelectedEpic(epic);
			setFiltered((prev) => [...(prev || []).filter((x) => x.id !== "epic"), { id: "epic", value: newVal }]);
			navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
		} catch {
			error();
		}
	}, [error, navigate, pathname, search, selectedEpic]);

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

	useEffect(() => {
		if (isError || isErrorEpics || isErrorSpints || isErrorComments) error();
	}, [error, isError, isErrorEpics, isErrorSpints, isErrorComments]);

	useEffect(() => setFiltered((p) => [...(p || []).filter((x) => x.id !== "closed"), { id: "closed", value: showClosedTasks }]), [showClosedTasks]);

	useEffect(() => {
		if (newTaskModal || taskModal) return;
		const filterInput = document.querySelector(`#input_${filtered.at(-1)?.id}`);
		if (filterInput) filterInput.focus();
	});

	useEffect(() => {
		const parsed = queryString.parse(search);

		if (parsed.body && parsed.title && !taskModal) {
			setEditTaskData((p) => {
				Object.assign(p, initialEditTaskData);
				p.availableEpics = epics;
				p.availableLabels = project.availableLabels;
				p.availableAssignees = project.team;
				p.availableReviewers = project.team;
				p.body = parsed.body;
				p.title = parsed.title;
			});
			setNewTaskModal(true);
		}

		if (parsed.epic && !selectedEpic) {
			const epic = availableEpicOptions.find((el) => el._id === parsed.epic) || {};
			setSelectedEpic(epic);
			setFiltered((prev) => [...(prev || []).filter((x) => x.id !== "epic"), { id: "epic", value: epic.title }]);
		}

		if (parsed["time-range"]) {
			const newVal = timeRangeOptions.find((el) => el.label === parsed["time-range"]) || defaultTimeRange;
			setTimeFilter(newVal);
			setFiltered((prev) => [...(prev || []).filter((x) => x.id !== "updatedAt"), { id: "updatedAt", value: newVal }]);
		}

		if (!parsed?.showClosed && showClosedTasks) {
			parsed.showClosed = true;
			navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
		}

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
				const selectedSprint = sprints.find((s) => dayjs().utc(true).isBetween(dayjs(s?.startDate).utc(true).startOf("d"), dayjs(s?.endDate).utc(true).startOf("d"), "day", "[]")) ?? defaultSprint;
				setCurrentSprint(selectedSprint);

				parsed.sprint = selectedSprint?._id ?? undefined;
				navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
			}
		}
	}, [search, isLoadingSprints, taskModal, setEditTaskData, initialEditTaskData, epics, project.availableLabels, project.team,
		isLoading, navigate, pathname, sprints, setCurrentSprint, currentSprint, showClosedTasks,
		selectedEpic, availableEpicOptions]);

	useEffect(() => {
		try {
			const parsed = queryString.parse(search);
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
			}
		} catch {
			error();
		}
	}, [epics, error, project._id, project.availableLabels, project.team, search, setEditTaskData, taskModal, tasks]);

	useEffect(() => {
		setBoard({
			columns: columnOptions.map((col) => ({
				id: (col === "Archived") ? col : `${col}-${kanbanTheme}`,
				title: col,
				titleStyle: { width: "100%" },
				sprints: (col === "Sprint Planning") ? [...sprints, { _id: null, title: "Default" }] : [],
				...((tasks.length > 0)
					? {
						cards: tasks
							.filter((e) => ((col === "Sprint Planning" && e.status === col)
								? (currentSprint?.title === "Default" && !currentSprint?._id)
									? true
									: e.sprint === currentSprint?._id
								: e.status === col)
								&& filtered.every((filter) => {
									if (filter.id === "updatedAt") {
										if (filter.value.value === "all") return true;
										const from = dayjs().startOf("day").subtract(Number(filter.value.value.split(" ")[0]), filter.value.value.split(" ")[1]);
										return dayjs(e.updatedAt).isAfter(from);
									}

									if (filter.id === "closed") return filter.value || !e.closed;
									if (filter.id === "epic") return selectedEpic ? selectedEpic.tasks?.some((t) => t._id === e._id) : true;
									return filter.value === e[filter.id];
								})
								&& taskIsSearchMatch(e, debouncedSearchValue))
							.sort((a, b) => {
								if (a.pinned) return -1;
								if (b.pinned) return 1;
								return dateNewToOld((v) => new Date(v.updatedAt))(a, b);
							})
							.map((task) => ({
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
								epics: epics.filter((e) => e.tasks.some((t) => t._id === task._id)),
								closed: task.closed,
								updatedAt: task.updatedAt,
								priority: task.priority,
								notificationDay: task.notificationDay,
								external: task.external,
								blocked: task.blocked,
								blockedBy: task.blockedBy,
								status: task.status,
								project,
								metadata: task.metadata,
								viewerIsSubscribed: task.viewerIsSubscribed,
								selectedEpicId: selectedEpic?._id,
								onClickViewEdit: () => viewOrEditTask(task),
								onClickEpic: (epic) => { handleEpicSelection(epic); },
								onClickReopen: () => {
									submitReopenTask(task._id);
								},
								onClickClose: () => !task.closed && submitCloseTask(task._id),
								onClickPin: () => submitUpdateTaskPin(task._id, !task.pinned),
								onClickSubscribe: () => submitUpdateTaskSubscription(task._id, !task.viewerIsSubscribed),
								onSubmitUpdateTaskStatus: (a, b, c) => submitUpdateTaskStatus(a, b, c),
							})),
					// Provide two default empty objects for rendering the skeleton.
					} : { cards: [...(isLoading || isLoadingEpics ? [{}, {}] : [])] }),
			})),
		});
	}, [columnOptions, currentSprint?._id, currentSprint?.title, debouncedSearchValue, epics,
		filtered, handleEpicSelection, isLoading, isLoadingEpics, kanbanTheme, navigate,
		pathname, project, search, selectedEpic, sprints, submitCloseTask, submitReopenTask,
		submitUpdateTaskPin, submitUpdateTaskStatus, submitUpdateTaskSubscription, tasks, theme.palette, viewOrEditTask]);

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

	// this is for apply css style for safari
	const userAgent = navigator.userAgent;
	const isChrome = userAgent.includes("Chrome");
	const isSafari = userAgent.includes("Safari") && !isChrome;

	return (
		<Root cls={classes} style={{ display: "flex", flexDirection: "column", flexGrow: 1, alignContent: "flex-start" }}>
			<div className="container" style={{ flexGrow: 0, margin: "1rem auto 0" }}>
				<Grid container spacing={2} mb={1} direction="row" justifyContent="space-between" alignItems="flex-end">
					<Grid item xs={12} sm={6} md={6} lg={4} xl={4}>
						<Grid container alignItems="center" spacing={1} mb={1}>
							<Grid item>
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
						<Grid container alignItems="center" spacing={1}>
							<Grid item>
								<Typography variant="h6" color="primary">{"Epic:"}</Typography>
							</Grid>
							<Grid item style={{ flexGrow: 1 }}>
								<Autocomplete
									size="small"
									options={[...availableEpicOptions]}
									renderInput={(params) => (
										<TextField
											{...params}
											variant="outlined"
											placeholder={selectedEpic ? "" : "Select an Epic"}
											InputProps={{
												...params.InputProps,
												endAdornment: (
													<InputAdornment position="end">
														<Box
															sx={{
																position: "absolute",
																backgroundColor: selectedEpic?.color,
																borderRadius: "0 1rem 1rem 0",
																top: 0,
																right: 0,
																width: "10px",
																height: "100%",
															}}
														/>
														{params.InputProps.endAdornment}
													</InputAdornment>
												),
											}}
										/>
									)}
									getOptionLabel={(option) => option.title || ""}
									renderOption={(_props, option) => (
										<MenuItem
											key={`epicOption_${option.title}`}
											sx={{ position: "relative" }}
											{..._props}
										>
											{option.title}
											<Box
												sx={{
													position: "absolute",
													backgroundColor: option.color,
													top: 0,
													right: 0,
													width: "10px",
													height: "100%",
												}}
											/>
										</MenuItem>
									)}
									value={selectedEpic || null}
									isOptionEqualToValue={(option, value) => option.title === value.title}
									onClear={() => handleEpicSelection()}
									onChange={(_, newValue) => { handleEpicSelection(newValue || selectedEpic); }}
								/>
							</Grid>
						</Grid>
					</Grid>
					<Grid item xs={12} sm={6} md={6} lg={4} xl={4}>
						<Grid container alignItems="center" spacing={1} mb={1}>
							<Grid item>
								<Typography variant="h6" color="primary" align="left">{"Show closed:"}</Typography>
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
									setSearchValue(e.target.value);
									debounceSearchValue(e.target.value);
								}}
							/>
						</Search>
					</Grid>
					<Grid item container xs={12} lg={4} xl={3} my={0.5} columnGap="10px" alignItems="center" justifyContent="flex-end" flexWrap="nowrap">
						<Grid item>
							<CollaboratorsPointInfoBar
								team={project.team}
								tasks={tasks}
								selectedEpic={selectedEpic}
								filtered={filtered}
								columnOptions={columnOptions}
								kanbanTheme={kanbanTheme}
								sprint={currentSprint}
							/>
						</Grid>
						<Grid item>
							<LoadingButton
								color="pink"
								sx={{ color: "common.white", whiteSpace: "nowrap" }}
								loading={isLoading || isLoadingEpics || isLoadingSprints || submitting}
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
			<Grid container className={isSafari ? "kanban-container safari" : "kanban-container "} flexGrow={1} width="98vw" sx={{ margin: "0 auto" }} id="board">
				{isLoading || isLoadingEpics
					? (
						<Board
							disableColumnDrag
							renderCard={() => (
								<KanbanCardSkeleton
									el={isLoading || isLoadingEpics}
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
					)
					: (
						<Board
							disableColumnDrag
							renderCard={(p) => {
								if (Object.keys(p).length > 0) return (<KanbanCard {...p} />);
								return null;
							}}
							renderColumnHeader={({ title, sprints: sprints_, cards }) => {
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
												<Typography variant="h6" sx={{ fontWeight: "bold", paddingTop: 1 }}>
													{title}
												</Typography>
												<br />
											</Grid>
											{sprints_?.length > 0 && (
												<Grid item>
													<Select
														size="small"
														value={JSON.stringify(currentSprint ?? {})}
														sx={{
															width: "12rem",
															"& .MuiSelect-select": {
																backgroundColor: "rgb(255, 255, 255, 0.9) !important",
																transition: "background-color 100ms",
																"&:focus": {
																	backgroundColor: "white !important",
																},
																"&:hover": {
																	backgroundColor: "white !important",
																},
															},
															"& .MuiTypography-root": {
																overflow: "hidden",
																textOverflow: "ellipsis",
															},
														}}
														renderValue={() => (<Typography>{currentSprint?.title ?? "Default"}</Typography>)}
														onChange={(e) => {
															const sprint = JSON.parse(e.target.value);
															const parsed = queryString.parse(search);
															// setting it undefined removes `sprint` from the url
															parsed.sprint = sprint?._id ?? undefined;
															navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
															setCurrentSprint(sprint);
														}}
													>
														{sprints_.map((el, ind) => (
															<MenuItem key={`sprint_${ind}`} value={JSON.stringify(el)} sx={{ display: "block", mt: 0.5, mb: 0.5 }}>
																<Typography>
																	{el.title}
																</Typography>
																{el?.startDate && el?.endDate && (
																	<Typography variant="caption">
																		{`${dayjs(el.startDate).format("DD/MM/YYYY")} - ${dayjs(el.endDate).format("DD/MM/YYYY")}`}
																	</Typography>
																)}
															</MenuItem>
														))}
													</Select>
												</Grid>
											)}
											{title === "Accepted"
											&& (
												<LoadingButton
													disableRipple
													disableTouchRipple
													disableFocusRipple
													disabled={cards.every((c) => c.closed)}
													loading={isLoadingClosingTasks}
													variant="text"
													sx={{ textTransform: "none", textDecoration: "underline", color: "black", "&:hover": { backgroundColor: "transparent", textDecoration: "underline" } }}
													onClick={() => setAreYouSureDialogOpen(title)}
												>
													{"Close All"}
												</LoadingButton>
											)}
										</Grid>
										{cards.some((c) => c?.id) ? (
											<Grid item>
												<Typography variant="body2" style={{ fontWeight: "bold", lineHeight: 2 }}>
													{`${pluralize("task", cards.length, true)} | ${pluralize("point", Number(totalPoints.toFixed(2)), true)} (${remaining}) | ${pluralize("review points", Number(reviewPoints.toFixed(2)), true)}`}
												</Typography>
											</Grid>
										) : null}
									</Grid>
								);
							}}
							onCardDragEnd={({ id, external }, from, to) => {
								const { fromColumnId } = from;
								const { toColumnId } = to;
								const fromColumn = fromColumnId.split(`-${kanbanTheme}`)[0];
								const toColumn = toColumnId.split(`-${kanbanTheme}`)[0];
								const possibleToColumnSprintId = (toColumn === "Sprint Planning") ? currentSprint?._id : null;
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
				onClose={() => {
					const parsed = queryString.parse(search);
					const tempParsed = parsed?.["time-range"];
					navigate(queryString.stringifyUrl({ url: pathname, query: tempParsed }), { replace: true });
					setNewTaskModal(false);
					setEditTaskData((p) => {
						Object.assign(p, {
							initialEditTaskData,
						});
					});
				}}
				onSubmit={async (newTask) => {
					const parsed = queryString.parse(search);
					const tempParsed = parsed?.["time-range"];
					navigate(queryString.stringifyUrl({ url: pathname, query: tempParsed }), { replace: true });
					await submitNewTask(newTask);
				}}
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
					mutateEpics();
				}}
				onUpdateTask={onUpdateTask}
				onSubmit={onSubmit}
				onUpdate={onUpdate}
				onDelete={onDelete}
			/>
			<Dialog
				keepMounted
				open={areYouSureDialogOpen}
				TransitionComponent={Transition}
				onClose={() => setAreYouSureDialogOpen(false)}
			>
				<DialogTitle>
					{"Are you sure?"}
				</DialogTitle>
				<DialogContent dividers>
					<DialogContentText>
						{"Please be aware that accepting will result in the closure of all tasks in this column."}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button
						autoFocus
						startIcon={<Close />}
						variant="contained"
						onClick={async () => {
							setAreYouSureDialogOpen(false);
							setIsLoadingClosingTasks(true);
							const tasksS = await closeTasks(project._id, areYouSureDialogOpen);
							mutate((p) => produce(p, (draft) => {
								for (const task of tasksS) {
									const ind = draft.findIndex((x) => x._id === task._id);
									draft[ind] = { ...draft[ind], ...task };
								}
							}), false);
							success("Tasks closed!");
							setIsLoadingClosingTasks(false);
						}}
					>
						{"Close All"}
					</Button>
					<Button variant="outlined" onClick={() => setAreYouSureDialogOpen(false)}>{"Cancel"}</Button>
				</DialogActions>
			</Dialog>
		</Root>
	);
};

ProjectTaskKanban.propTypes = { project: PropTypes.object.isRequired };

export default ProjectTaskKanban;
