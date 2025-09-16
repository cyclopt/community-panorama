import { useState, useEffect, useMemo, useCallback } from "react";
import { Typography, Grid, Switch, MenuItem, Skeleton, Autocomplete, TextField, Collapse, IconButton, Box, InputAdornment } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import queryString from "query-string";
import { ControlledBoard as Board, moveCard } from "@caldwell619/react-kanban";
import { PostAdd, Search as SearchIcon, KeyboardArrowUp, KeyboardArrowDown } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { dateNewToOld } from "@iamnapo/sort";
import pluralize from "pluralize";
import { shallow } from "zustand/shallow";
import { produce } from "immer";
import { LoadingButton } from "@mui/lab";
import { useImmer } from "use-immer";

import {
	POSSIBLE_COLUMNS,
	useLocalStorage,
	useSnackbar,
	dayjs,
	taskIsSearchMatch,
	jwt,
	capitalize,
	useDocumentTitle,
} from "../utils/index.js";
import GenericGitTask from "../components/GenericGitTask.jsx";
import KanbanCard from "../components/KanbanCard.jsx";
import Task from "../components/Task.jsx";
import Select from "../components/Select.jsx";
import BorderBox from "../components/BorderBox.jsx";
import {
	defaultTimeRange,
	KanbanCardSkeleton,
	Root,
	Search,
	SearchIconWrapper,
	StyledInputBase,
	timeRangeOptions,
} from "../components/KanbanCommon.jsx";
import {
	updateTaskStatus,
	reopenTask,
	closeTask,
	useUserTasks,
	useUserProjects,
	updateTaskPin,
	updateTaskSubscription,
	loadProjectSprints,
	useTaskComments,
	updateTask,
	deleteTaskComment,
	submitTaskComment,
	updateTaskComment,
} from "../api/index.js";

const classes = {
	root: "MyKanban-root",
	bar: "MyKanban-bar",
	determinate: "MyKanban-determinate",
	progressText: "MyKanban-progressText",
	caption: "MyKanban-caption",
};

const MyKanbanView = () => {
	useDocumentTitle("My Kanban · Cyclopt");
	const { pathname, search } = useLocation();
	const navigate = useNavigate();
	const { success, error } = useSnackbar();
	const [submitting, setSubmitting] = useState(false);
	const [expandOptions, setExpandOptions] = useState(true);
	const [timeFilter, setTimeFilter] = useState(defaultTimeRange);
	const [selectedProject, setSelectedProject] = useState("all");
	const [sprints, setSprints] = useState([]);
	const [sprintsLoading, setSprintsLoading] = useState(true);
	const { tasks = [], isLoading: isLoading1, isError: isError1, mutate } = useUserTasks(timeFilter.value, selectedProject);
	const { projects = [], isLoading: isLoading2, isError: isError2 } = useUserProjects();
	const [selectedTask, setSelectedTask] = useState({});
	const [selectedEpic, setSelectedEpic] = useState(null);
	const {
		comments = [],
		isLoading: isLoadingComments,
		isError: isErrorComments,
		mutate: mutateComments,
	} = useTaskComments(selectedTask?.project?._id, selectedTask?._id);

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
		project: "",
		assigneees: [],
		reviewers: [],
		dueDate: null,
		external: false,
		blocked: false,
		blockedBy: null,
		status: "",
	}), []);
	const [editTaskData, setEditTaskData] = useImmer(initialEditTaskData);
	const { showClosedTasks, toggleShowClosedTasks, kanbanTheme } = useLocalStorage(useCallback((e) => ({
		showClosedTasks: e.showClosedTasks,
		toggleShowClosedTasks: e.toggleShowClosedTasks,
		kanbanTheme: e?.kanbanTheme,
	}), []), shallow);

	const availableEpicOptions = useMemo(() => {
		const uniqueEpics = new Set();
		return tasks
			.flatMap((t) => t.project?.epics || [])
			.filter((epic) => {
				const alreadyFound = uniqueEpics.has(epic._id);
				uniqueEpics.add(epic._id);
				return !epic.closed && !alreadyFound && epic.tasks.some((t) => tasks.some((task) => task._id === t._id));
			});
	}, [tasks]);

	const [filtered, setFiltered] = useState([
		{ id: "closed", value: !showClosedTasks },
		{ id: "epic", value: null },
	]);
	const [genericTaskModal, setGenericTaskModal] = useState(false);
	const [taskModal, setTaskModal] = useState(false);
	const columnOptions = useMemo(() => {
		const columns = [[], [], [], [], []];
		if (tasks.some((t) => t?.project?.kanban?.style === "default")) {
			const defCols = POSSIBLE_COLUMNS.get("default");
			columns.map((c, ind) => c.push(defCols[ind]));
		}

		if (tasks.some((t) => t?.project?.kanban?.style === "minimal")) {
			const minimalCols = POSSIBLE_COLUMNS.get("minimal");
			columns.map((c, ind) => ((ind % 2 === 0) ? c.push(minimalCols[ind / 2]) : c));
		}

		if (tasks.some((t) => t?.project?.kanban?.style === "none")) {
			const noneCols = POSSIBLE_COLUMNS.get("none");
			columns.map((c, ind) => ((ind % 4 === 0) ? c.push(noneCols[ind / 4]) : c));
		}

		if (tasks.some((t) => t?.project?.kanban?.hasArchived)) columns.push(["Archived"]);

		return columns.filter((col) => col.length > 0).map((col) => [...new Set(col)]);
	}, [tasks]);

	const [board, setBoard] = useState({
		columns: columnOptions.map((col) => ({
			id: (col[0] === "Archived") ? col[0] : `${col[0]}-${kanbanTheme}`,
			title: col[0],
			titleStyle: { width: "100%" },
			cards: [],
		})),
	});
	const [searchValue, setSearchValue] = useImmer("");
	const theme = useTheme();

	const isLoading = isLoading1 || isLoading2 || sprintsLoading;
	const isError = isError1 || isError2 || isErrorComments;

	const user = useMemo(() => {
		const id = jwt.decode().id;
		if (projects?.length > 0) return projects[0]?.team?.find((u) => u.user?._id === id);

		return null;
	}, [projects]);

	const submitCloseTask = useCallback(async (task) => {
		try {
			const updatedTask = await closeTask(task.project._id, task._id);
			mutate((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === task._id);
				draft[ind] = { ...draft[ind], ...updatedTask, project: draft[ind].project };
			}));
			success("Task closed!");
		} catch ({ response }) {
			error(response.status === 400 ? "You can't close a blocked task." : "");
		}
	}, [error, success, mutate]);

	const submitReopenTask = useCallback(async (task) => {
		try {
			const updatedTask = await reopenTask(task.project._id, task._id);
			mutate((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === task._id);
				draft[ind] = { ...draft[ind], ...updatedTask, project: draft[ind].project };
			}));
			success("Task reopened!");
		} catch {
			error();
		}
	}, [error, success, mutate]);

	const submitUpdateTaskStatus = useCallback(async (task, setTo, from, to) => {
		try {
			setBoard((b) => moveCard(b, from, to));
			await updateTaskStatus(task.project._id, task.id, setTo);
			mutate((p) => produce(p, (draft) => {
				const selectedTaskIndex = draft.findIndex((t) => t._id === task.id);
				draft[selectedTaskIndex] = { ...draft[selectedTaskIndex], status: setTo };
			}));
			success("Task updated!");
		} catch {
			error();
		}
	}, [mutate, success, error]);

	const submitUpdateTaskPin = useCallback(async (task, setTo) => {
		try {
			const updatedTask = await updateTaskPin(task.project._id, task._id, setTo);
			mutate((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === task._id);
				draft[ind] = { ...draft[ind], ...updatedTask, project: draft[ind].project };
			}));
			success("Task updated!");
		} catch {
			error();
		}
	}, [error, success, mutate]);

	const submitUpdateTaskSubscription = useCallback(async (task, setTo) => {
		try {
			const updatedTask = await updateTaskSubscription(task.project._id, task._id, setTo);
			mutate((p) => produce(p, (draft) => {
				const ind = draft.findIndex((x) => x._id === task._id);
				draft[ind] = { ...draft[ind], ...updatedTask, project: draft[ind].project };
			}));
			success("Task updated!");
		} catch {
			error();
		}
	}, [error, success, mutate]);

	const viewOrEditTask = useCallback((task) => {
		try {
			setSelectedTask(task);
			setEditTaskData((p) => {
				Object.assign(p, task, {
					availableEpics: task.project.epics,
					epics: task.project.epics.filter((epic) => epic.tasks.some((t) => String(t._id) === String(task._id))),
					availableLabels: task.project.availableLabels,
					availableAssignees: task.project.team,
					availableReviewers: task.project.team,
				});
			});
			const parsed = queryString.parse(search);
			parsed.id = task._id;
			navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
			setTaskModal(true);
		} catch {
			error();
		}
	}, [error, navigate, pathname, search, setEditTaskData]);

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	useEffect(() => {
		setSprintsLoading(true);
		(async () => {
			try {
				const sprints_ = await Promise.all(projects.map((e) => loadProjectSprints(e._id)));
				setSprints(sprints_.reduce((acc, s) => { acc.push(...s); return acc; }, []));
				setSprintsLoading(false);
			} catch {
				setSprintsLoading(false);
				error();
			}
		})();
	}, [error, projects]);

	useEffect(() => setFiltered((p) => [...(p || []).filter((x) => x.id !== "closed"), { id: "closed", value: showClosedTasks }]), [showClosedTasks]);

	useEffect(() => {
		if (genericTaskModal || taskModal) return;
		const filterInput = document.querySelector(`#input_${filtered.at(-1)?.id}`);
		if (filterInput) filterInput.focus();
	});

	useEffect(() => {
		try {
			const parsed = queryString.parse(search);
			if (parsed["time-range"]) {
				const newVal = timeRangeOptions.find((el) => el.label === parsed["time-range"]) || defaultTimeRange;
				setTimeFilter(newVal);
				setFiltered((prev) => [...(prev || []).filter((x) => x.id !== "updatedAt"), { id: "updatedAt", value: newVal }]);
			}

			if (parsed?.excluded) {
				const projectsExcluded = Array.isArray(parsed.excluded) ? parsed.excluded : [parsed.excluded];
				setFiltered((prev) => [...(prev || []).filter((x) => x.id !== "excluded"), { id: "excluded", value: projectsExcluded }]);
			}

			if (parsed.epic && !selectedEpic) {
				const epic = availableEpicOptions.find((el) => el._id === parsed.epic) || {};
				setSelectedEpic(epic);
				setFiltered((prev) => [...(prev || []).filter((x) => x.id !== "epic"), { id: "epic", value: epic.title }]);
			}

			if (parsed?.project && selectedProject !== parsed?.project) {
				setSelectedProject(parsed?.project);
				setFiltered((prev) => [...(prev || []).filter((x) => x.id !== "project"), { id: "project", value: parsed?.project }]);
			}

			if (!taskModal && parsed.id) {
				const task = tasks.find((e) => e._id === parsed.id);
				if (task) {
					setSelectedTask(task);
					setEditTaskData((p) => {
						Object.assign(p, task, {
							availableLabels: task.project.availableLabels,
							availableEpics: task.project.epics,
							epics: task.project.epics.filter((epic) => epic.tasks.some((t) => String(t._id) === String(task._id))),
							availableAssignees: task.project.team,
							availableReviewers: task.project.team,
						});
					});
					setTaskModal(true);
				}
			}
		} catch {
			error();
		}
	}, [tasks, taskModal, setTaskModal, error, setEditTaskData, selectedProject, search, selectedEpic, availableEpicOptions]);

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

	useEffect(() => {
		setBoard({
			columns: columnOptions.map((col) => ({
				id: (col[0] === "Archived") ? col[0] : `${col[0]}-${kanbanTheme}`,
				title: col[0],
				titles: col,
				titleStyle: {
					width: "100%",
				},
				cards: tasks
					.filter(
						(e) => col.includes(e.status)
							&& filtered.every((filter) => {
								if (filter.id === "closed") return filter.value || !e.closed;

								if (filter.id === "excluded") {
									return !filter?.value?.includes(e.project.name);
								}

								if (filter.id === "epic") return selectedEpic ? selectedEpic.tasks?.some((t) => t._id === e._id) : true;

								return true;
							})
							&& taskIsSearchMatch(e, searchValue),
					)
					.sort((a, b) => {
						if (a.pinned) return -1;
						if (b.pinned) return 1;
						return dateNewToOld((v) => new Date(v.updatedAt))(a, b);
					})
					.map((task) => ({
						id: task._id,
						title: task.title,
						project: task.project,
						sprint: sprints.find((s) => s?._id === task?.sprint),
						label: task.updatedAt,
						dueDate: task.dueDate,
						points: task.points,
						description: task.body,
						tags: task.labels.map((lbl) => ({
							title: lbl,
							bgcolor: "#EEE",
							color: theme.palette.getContrastText("#EEE"),
						})),
						selectedEpicId: selectedEpic?._id,
						pinned: task.pinned || false,
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
						notificationDay: task.notificationDay,
						priority: task.priority,
						external: task.external,
						blocked: task.blocked,
						blockedBy: task.blockedBy,
						status: task.status,
						metadata: task.metadata,
						epics: task.project.epics.filter((epic) => epic.tasks.some((t) => String(t._id) === String(task._id))),
						viewerIsSubscribed: task.viewerIsSubscribed,
						onClickEpic: (epic) => { handleEpicSelection(epic); },
						onClickViewEdit: () => viewOrEditTask(task),
						onClickReopen: () => {
							if ([
								task.project.kanban.style === "none" ? "Closed" : (task.project.kanban.style === "minimal" ? "Done" : "Delivered"),
								task.project.kanban.style === "none" ? "Closed" : (task.project.kanban.style === "minimal" ? "Done" : "Accepted"),
							].includes(task.status) && task.closed) submitReopenTask(task);
						},
						onSubmitUpdateTaskStatus: (a, b) => submitUpdateTaskStatus(a, b),
						onClickClose: () => !task.closed && submitCloseTask(task),
						onClickPin: () => submitUpdateTaskPin(task, !task.pinned),
						onClickSubscribe: () => submitUpdateTaskSubscription(task, !task.viewerIsSubscribed),
					})) || [{}, {}],
			})),
		});
	}, [columnOptions, filtered, tasks, submitCloseTask, submitReopenTask, submitUpdateTaskPin, submitUpdateTaskSubscription,
		theme.palette, viewOrEditTask, searchValue, kanbanTheme, sprints, submitUpdateTaskStatus, selectedEpic, handleEpicSelection]);

	const onUpdateTask = useCallback(async (task) => {
		if (!submitting) {
			setSubmitting(true);
			await updateTask(task.project._id, task._id, task).then((uTask) => {
				mutate((p) => produce(p, (draft) => {
					const ind = draft.findIndex((x) => x._id === uTask._id);
					if (uTask?.assignees?.map((a) => a._id).includes(user.user._id)) {
						draft[ind] = { ...draft[ind], ...uTask, project: draft[ind].project };
					} else {
						draft.splice(ind, 1);
					}
				}), false);
				setSubmitting(false);
				success("Task updated!");
			}).catch(() => error());
			setSubmitting(false);
			setEditTaskData(task);
		}
	}, [submitting, setEditTaskData, mutate, success, user?.user._id, error]);

	const onSubmit = useCallback((body) => {
		if (body.length > 0 && !submitting) {
			setSubmitting(true);
			submitTaskComment(selectedTask.project._id, selectedTask._id, body).then((commentS) => {
				success("Comment submitted!");
				mutateComments(commentS.map((e) => ({ ...e, updatedAt: new Date(e.updatedAt) })));
			}).catch(() => error());
			setSubmitting(false);
		}
	}, [submitting, selectedTask, success, mutateComments, error]);

	const onUpdate = useCallback((comment) => {
		if (comment.body.length > 0 && !submitting) {
			setSubmitting(true);
			updateTaskComment(selectedTask.project._id, selectedTask._id, comment._id, comment.body).then((commentS) => {
				success("Comment updated!");
				mutateComments(commentS.map((e) => ({ ...e, updatedAt: new Date(e.updatedAt) })));
			}).catch(() => error());
			setSubmitting(false);
		}
	}, [error, success, submitting, selectedTask, mutateComments]);

	const onDelete = useCallback((comment) => {
		if (!submitting) {
			setSubmitting(true);
			deleteTaskComment(selectedTask.project._id, selectedTask._id, comment._id).then((commentS) => {
				success("Comment deleted!");
				mutateComments(commentS.map((e) => ({ ...e, updatedAt: new Date(e.updatedAt) })));
			}).catch(() => error());
			setSubmitting(false);
		}
	}, [submitting, selectedTask, success, mutateComments, error]);

	return (
		<Root cls={classes} style={{ display: "flex", flexDirection: "column", flexGrow: 1, alignContent: "flex-start" }}>
			<div className="container" style={{ flexGrow: 0, margin: "1rem auto 0" }}>
				<Grid container mt={2} direction="row" justifyContent="space-between" alignItems="center">
					<Grid item container xs={12} sm={11} md={8}>
						<BorderBox sx={{ width: "100%" }}>
							<Grid container sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
								<Grid item container style={{ width: "90%" }}>
									<Grid item container className="kanban-grid-container" xs={12} sm={6} lg={6}>
										<Grid item xs={4} md={4}>
											<Typography variant="h6" color="primary">{"Project"}</Typography>
										</Grid>
										<Grid item xs={8} md={6}>
											<Select
												id="project"
												value={selectedProject}
												onChange={(e) => {
													const project = projects.find((pr) => pr._id === e.target.value);
													const temp = project?._id ?? "all";
													setSelectedProject(temp);
													const parsed = queryString.parse(search);
													if (temp === "all") {
														const { project: _, ...newParsed } = parsed;
														navigate(queryString.stringifyUrl({ url: pathname, query: newParsed }), { replace: true });
														setFiltered((prev) => (prev || []).filter((x) => x.id !== "project"));
													}

													if (temp !== "all") {
														const { excluded: _, ...newParsed } = parsed;
														newParsed.project = temp;
														navigate(queryString.stringifyUrl({ url: pathname, query: newParsed }), { replace: true });
														setFiltered((prev) => [...(prev || []).filter((x) => x.id !== "excluded").filter((x) => x._id !== "project"), { id: "project", value: temp }]);
													}
												}}
											>
												<MenuItem key="projectOption_all" value="all">{capitalize("all")}</MenuItem>
												{projects.map((p, ind) => <MenuItem key={`projectOption_${p.name}_${ind}`} value={p._id}>{p.name}</MenuItem>)}
											</Select>
										</Grid>
									</Grid>
									<Grid item container className="kanban-grid-container" xs={12} sm={6} lg={6}>
										<Grid item>
											<Typography variant="h6" color="primary" align="right">{"Show closed"}</Typography>
										</Grid>
										<Grid item>
											<Switch checked={showClosedTasks} onChange={toggleShowClosedTasks} />
										</Grid>
									</Grid>
								</Grid>
								<Grid item style={{ width: "10%", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
									<IconButton
										aria-label="expand row"
										size="small"
										onClick={() => setExpandOptions((pr) => !pr)}
									>
										{expandOptions ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
									</IconButton>
								</Grid>
								<Collapse unmountOnExit in={expandOptions} timeout="auto" style={{ width: "90%" }}>
									<Grid item container mt={0} spacing={1} sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
										<Grid item container className="kanban-grid-container" xs={12} sm={6} lg={6}>
											<Grid item xs={4} md={4}>
												<Typography variant="h6" color="primary">{"Time Range"}</Typography>
											</Grid>
											<Grid item xs={8} md={6}>
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
										<Grid item className="kanban-grid-container" xs={12} sm={6} lg={6}>
											<Search>
												<SearchIconWrapper>
													<SearchIcon />
												</SearchIconWrapper>
												<StyledInputBase
													placeholder="Search…"
													inputProps={{ "aria-label": "search" }}
													value={searchValue}
													size="medium"
													onChange={(e) => setSearchValue(e.target.value)}
												/>
											</Search>
										</Grid>
										<Grid item container className="kanban-grid-container" xs={12} sm={6} lg={6}>
											<Grid item xs={4} md={4} pt={0.5} style={{ alignSelf: "flex-start" }}>
												<Typography variant="h6" color="primary">{"Epic"}</Typography>
											</Grid>
											<Grid item xs={8} md={6}>
												<Autocomplete
													size="small"
													options={[...availableEpicOptions || []]}
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
										{(selectedProject === "all") && (
											<Grid item container className="kanban-grid-container" xs={12} sm={6} lg={6}>
												<Grid item xs={4} md={4} pt={0.5} style={{ alignSelf: "flex-start" }}>
													<Typography variant="h6" color="primary">{"Exclude"}</Typography>
												</Grid>
												<Grid item xs={8} md={6}>
													<Autocomplete
														multiple
														size="small"
														style={{ zIndex: 999, overflow: "hidden", textOverflow: "ellipsis" }}
														renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Project A" />)}
														id="availableProjectExclusions"
														value={filtered?.find((f) => f.id === "excluded")?.value}
														options={projects?.filter((p) => !(filtered?.find((f) => f.id === "excluded")?.value)?.includes(p.name))?.map((p) => p?.name) || []}
														onChange={(_, newValue) => {
															const parsed = queryString.parse(search);
															parsed.excluded = [...new Set(newValue)];
															navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
															setFiltered((prev) => [...(prev || []).filter((x) => x.id !== "excluded"), { id: "excluded", value: parsed.excluded }]);
														}}
													/>
												</Grid>
											</Grid>
										)}
									</Grid>
								</Collapse>
							</Grid>
						</BorderBox>
					</Grid>
					<Grid item alignSelf="flex-start">
						<Grid mt={1}>
							<LoadingButton
								color="pink"
								sx={{ color: "common.white" }}
								loading={isLoading || submitting}
								variant="contained"
								startIcon={<PostAdd />}
								onClick={() => {
									setGenericTaskModal(true);
								}}
							>
								{"Create Task"}
							</LoadingButton>
						</Grid>
					</Grid>
				</Grid>
			</div>
			<Grid container className="kanban-container" flexGrow={1} width="98vw" sx={{ margin: "0 auto" }} id="board">
				{isLoading ? (
					<Board
						disableColumnDrag
						renderCard={() => (
							<KanbanCardSkeleton
								el={isLoading}
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
							if (Object.keys(p).length > 0) {
								return (
									<KanbanCard
										{...p}
										showProject
										showSprint
									/>
								);
							}

							return null;
						}}
						renderColumnHeader={({ title, titles, id }) => {
							const tmpData = tasks.filter(
								(e) => e.status === id
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
							);
							let points = 0;
							let reviewPoints = 0;
							let totalPoints = 0;
							for (const task of tmpData) {
								totalPoints += task?.points?.total ?? 1;
								points += (task?.points?.total ?? 1) - (task?.points?.done || 0);
								reviewPoints += task?.points?.review || 0;
							}

							let remaining = `${Number(points.toFixed(2))} remaining`;
							if (points < 0) remaining = `Overflow by ${-points}`;
							return (
								<Grid container direction="column" justifyContent="space-between">
									<Grid item direction="row">
										<Typography variant="h6" sx={{ fontWeight: "bold", display: "flex", flexDirection: "row", alignItems: "end" }}>
											{`${title}`}
											{(titles?.length > 1)
												&& <Typography ml={0.5} variant="h6" sx={{ fontWeight: "500", fontSize: "1rem", fontStyle: "italic" }}>{`(${titles.slice(1).join(" - ")})`}</Typography>}
										</Typography>
									</Grid>
									{tmpData.length > 0 ? (
										<Grid item>
											<Typography variant="body2" style={{ fontWeight: "bold", lineHeight: 2 }}>
												{`${pluralize("task", tmpData.length, true)} | ${pluralize("point", Number(totalPoints.toFixed(2)), true)} (${remaining}) | ${pluralize("review points", Number(reviewPoints.toFixed(2)), true)}`}
											</Typography>
										</Grid>
									) : null}
								</Grid>
							);
						}}
						onCardDragEnd={async (task, from, to) => {
							const { fromColumnId } = from;
							const { toColumnId } = to;
							if (task.external) {
								error("This is an external task. You can edit it on GitHub.");
							} else if (fromColumnId !== toColumnId) {
								const toColumn = columnOptions.find((c) => c.includes(toColumnId.split("-")[0]));
								const validStatuses = POSSIBLE_COLUMNS.get(task.project.kanban.style || "default");
								const validStatus = validStatuses.find((vs) => toColumn.includes(vs));
								if (validStatus) {
									await submitUpdateTaskStatus(task, validStatus, from, to);
								} else {
									error("Task can't be moved here, please check project's kanban style");
								}
							}
						}}
					>
						{board}
					</Board>
				)}
			</Grid>
			<GenericGitTask
				open={genericTaskModal}
				updateParent={() => { mutate(); setGenericTaskModal(false); }}
				projects={projects}
				tasks={tasks}
				defaultAssignee={user}
				onClose={() => { mutate(); setGenericTaskModal(false); }}
			/>
			<Task
				open={taskModal && Object.keys(selectedTask).length > 0}
				title={`${selectedTask?.project?.name} - View${editTaskData.external ? "" : " / Edit Task"}`}
				task={editTaskData}
				tasks={tasks}
				sprints={[...sprints].filter((s) => s?.project === selectedTask?.project?._id)}
				pId={selectedTask?.project?._id}
				kanban={selectedTask?.project?.kanban}
				team={selectedTask?.project?.team}
				comments={comments}
				isLoadingComments={isLoadingComments}
				submitting={submitting}
				onClose={() => {
					setSelectedTask({});
					setEditTaskData(initialEditTaskData);
					const { id: _, ...o } = queryString.parse(search);
					navigate(queryString.stringifyUrl({ url: pathname, ...(o && { query: o }) }), { replace: true });
					setTaskModal(false);
					mutate();
				}}
				onUpdateTask={onUpdateTask}
				onSubmit={onSubmit}
				onUpdate={onUpdate}
				onDelete={onDelete}
			/>
		</Root>
	);
};

export default MyKanbanView;
