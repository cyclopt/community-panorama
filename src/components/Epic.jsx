import { useState, useEffect, memo, Fragment, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
	Box,
	List,
	ListItem,
	ListSubheader,
	TextField,
	Typography,
	ListItemText,
	ListItemSecondaryAction,
	IconButton,
	Autocomplete,
	Input,
	InputAdornment,
	Button,
	Select,
	Chip,
	Divider,
	ListItemAvatar,
	MenuItem,
	Grid,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { MobileDatePicker } from "@mui/x-date-pickers";
import { Assignment, AssignmentTurnedIn, AssignmentLate, Clear, Delete, Done, Edit, ToggleOn, ToggleOff } from "@mui/icons-material";
import copy from "copy-text-to-clipboard";
import constructUrl from "@iamnapo/construct-url";
import { useHotkeys } from "react-hotkeys-hook";
import { useImmer } from "use-immer";
import debounceFn from "debounce-fn";
import { shallow } from "zustand/shallow";

import useLocalStorage from "../utils/use-local-storage.js";
import { MUTATION_DELAY_IN_MS, useSnackbar, dayjs, DATE_FORMAT, POSSIBLE_COLUMNS, jwt } from "../utils/index.js";

import Modal from "./Modal.jsx";
import Tooltip from "./Tooltip.jsx";

import { useKanbanTheme } from "#api";

const Epic = (props) => {
	const { open, title: mTitle, onClose, epic, onUpdateEpic, pId, tasks = [] } = props;
	const [sEpic, setSEpic] = useImmer(epic);
	const [title, setTitle] = useState(epic.title);
	const [editTitle, setEditTitle] = useState(false);
	const [showClosed, setShowClosed] = useState(false);
	const { success } = useSnackbar();
	const onUpdatEpicDebounced = useMemo(() => debounceFn(onUpdateEpic, { wait: MUTATION_DELAY_IN_MS }), [onUpdateEpic]);
	const theme = useTheme();
	const token = jwt.getToken();
	const { userTheme } = useKanbanTheme(token);
	const columnOptions = useMemo(() => [
		...(POSSIBLE_COLUMNS.get(userTheme.toLowerCase()) || []),
	], [userTheme]);

	const { kanbanTheme } = useLocalStorage(useCallback((e) => ({
		kanbanTheme: e?.kanbanTheme,
	}), []), shallow);

	const uniqueAssignees = useMemo(() => Object.values(
		([...epic.tasks]?.flatMap((t) => t.assignees) ?? []).reduce((acc, assignee) => {
		// Use the assignee's username as a key to ensure uniqueness
			if (assignee && assignee.username && !acc[assignee.username]) {
				acc[assignee.username] = assignee;
			}

			return acc;
		}, {}),
	), [epic.tasks]);

	const shortedTasks = useMemo(() => [...sEpic.tasks].sort((a, b) => {
		// Sort by status using the order from columnOptions
		const statusOrderA = columnOptions.indexOf(a.status);
		const statusOrderB = columnOptions.indexOf(b.status);

		if (statusOrderA !== statusOrderB) {
			return statusOrderA - statusOrderB; // Prioritize tasks based on status order
		}

		// If status is the same, sort by updatedAt
		return dayjs(b.updatedAt).valueOf() - dayjs(a.updatedAt).valueOf();
	}).filter((t) => (showClosed ? true : !t.closed)), [sEpic.tasks, columnOptions, showClosed]);

	useEffect(() => {
		setSEpic((p) => {
			Object.assign(p, epic);
			p.startDate = dayjs(epic?.startDate).utc();
			p.endDate = dayjs(epic?.endDate).utc();
		});
		setTitle(epic.title);
	}, [JSON.stringify(epic)]); // eslint-disable-line react-hooks/exhaustive-deps

	useHotkeys(
		"ctrl+enter",
		() => {
			if (editTitle) {
				onUpdatEpicDebounced({ ...sEpic, title });
				setSEpic((p) => { p.title = title; });
				setEditTitle(false);
			}
		},
		{
			enableOnFormTags: true,
			enabled: open,
		},
	);

	return (
		<Modal
			keepMounted
			open={open}
			title={mTitle}
			disableAreYouSureDialog={!editTitle}
			onClose={onClose}
		>
			<div className="columns">
				<div className="control is-expanded column">
					<label className="label" htmlFor="title">
						{"Title"}
					</label>
					<div className="control">
						<Input
							required
							disableUnderline
							className="input"
							type="text"
							id="title"
							placeholder="Title"
							value={title}
							readOnly={!editTitle}
							endAdornment={!sEpic.external && (
								<InputAdornment position="end">
									{!editTitle && (<IconButton aria-label="edit title" onClick={() => setEditTitle(true)}><Edit /></IconButton>)}
									{editTitle && (
										<>
											<IconButton
												aria-label="update"
												onClick={() => {
													onUpdatEpicDebounced({ ...sEpic, title });
													setSEpic((p) => { p.title = title; });
													setEditTitle(false);
												}}
											>
												<Done />
											</IconButton>
											<IconButton
												aria-label="clear"
												onClick={() => {
													setTitle(sEpic.title);
													setEditTitle(false);
												}}
											>
												<Clear />
											</IconButton>
										</>
									)}
								</InputAdornment>
							)}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>
				</div>
				<div className="control column is-narrow">
					<label className="label" htmlFor="start_date">
						{"Start Date"}
					</label>
					<div className="control">
						<MobileDatePicker
							value={dayjs(sEpic?.startDate ?? null)}
							format={DATE_FORMAT}
							slotProps={{
								actionBar: { actions: ["clear", "cancel", "accept"] },
								textField: {
									placeholder: "Set a start date",
									size: "small",
									error: false,
								},
							}}
							slots={{
								textField: ({ value, ...tprops }) => <TextField {...tprops} value={(dayjs(value).isValid()) ? value : ""} />,
							}}
							readOnly={sEpic.external}
							onAccept={(startDate) => onUpdatEpicDebounced({
								...sEpic,
								startDate: startDate ? dayjs(startDate)?.utc(true).startOf("d") : null,
							})}
						/>
					</div>
				</div>
				<div className="control column is-narrow">
					<label className="label" htmlFor="due_date">
						{"Due Date"}
					</label>
					<div className="control">
						<MobileDatePicker
							value={dayjs(sEpic?.dueDate ?? null)}
							format={DATE_FORMAT}
							slotProps={{
								actionBar: { actions: ["clear", "cancel", "accept"] },
								textField: {
									placeholder: "Set a due date",
									size: "small",
									error: false,
								},
							}}
							slots={{
								textField: ({ value, ...tprops }) => <TextField {...tprops} value={(dayjs(value).isValid()) ? value : ""} />,
							}}
							readOnly={sEpic.external}
							onAccept={(dueDate) => onUpdatEpicDebounced({
								...sEpic,
								dueDate: dueDate ? dayjs(dueDate).utc(true).startOf("d") : null,
							})}
						/>
					</div>
				</div>
				<div className="control column is-narrow">
					<label className="label" htmlFor="share">
						{"Share"}
					</label>
					<div className="control" id="share">
						<Button
							variant="outlined"
							type="button"
							onClick={() => {
								copy(constructUrl(`${window.location.protocol}//${window.location.host}`, `projects/${pId}/project-analytics/management/`, {
									id: sEpic._id,
								}), { target: document.querySelector("#share") });
								success("Epic URL copied to clipboard!");
							}}
						>
							<Assignment color="secondary" />
						</Button>
					</div>
				</div>
			</div>
			<label className="label" htmlFor="assignees">
				{"Assignees"}
			</label>
			<div className="control">
				<Autocomplete
					disabled
					multiple
					disablePortal
					size="small"
					getOptionLabel={(e) => e.user?.username || e.username}
					isOptionEqualToValue={(a, b) => (a.user?._id || a._id) === (b.user?._id || b._id)}
					renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Add an assignee..." />)}
					id="assignees"
					value={uniqueAssignees || []}
					options={[]}
					sx={{ opacity: "1 !important" }}
				/>
			</div>

			<div className="control">
				<div className="label field-label is-normal" style={{ textAlign: "left", flexGrow: 0 }}>
					{"Tasks"}
					<Button
						startIcon={showClosed ? <ToggleOn color="secondary" /> : <ToggleOff />}
						onClick={() => {
							setShowClosed((p) => !p);
						}}
					>
						{"closed tasks"}
					</Button>
				</div>
				<div className="field-body">
					<Box className="field">
						<List
							dense
							disablePadding
							subheader={(
								<ListSubheader disableGutters sx={{ bgcolor: "transparent" }}>
									<Autocomplete
										size="small"
										renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Select a task..." />)}
										id="select_task"
										options={tasks.filter((e) => !sEpic.tasks.some((task) => task._id === e._id)) || []}
										getOptionLabel={(e) => e.title}
										isOptionEqualToValue={(a, b) => a._id === b._id}
										value={null}
										disabled={sEpic.external}
										onChange={(_, task) => {
											onUpdatEpicDebounced({ ...sEpic, tasks: [...sEpic.tasks, task] });
											setSEpic((p) => { p.tasks.push(task); });
										}}
									/>
								</ListSubheader>
							)}
						>
							{shortedTasks.map((task, ind) => (
								<Fragment key={`task_${task._id}_${ind}`}>
									<ListItem disableGutters>
										<ListItemAvatar>
											<Tooltip title={`This task is ${task.closed ? "closed" : "open"}.`}>
												{task.closed
													? <AssignmentTurnedIn sx={{ color: "red.500" }} />
													: <AssignmentLate sx={{ color: "green.500" }} />}
											</Tooltip>
										</ListItemAvatar>
										<ListItemText
											disableTypography
											primary={<Typography>{task.title}</Typography>}
											secondary={(
												<Box sx={{ flexGrow: 1 }}>
													<Grid container spacing={2} alignItems="flex-start">
														<Grid item xs={12} sm={6}>
															<Box>
																<Typography variant="body2" mb={0.5}>{"Blocked by:"}</Typography>
																<Autocomplete
																	multiple
																	disablePortal
																	disabled={sEpic.external}
																	sx={{ width: "100%" }}
																	size="small"
																	renderInput={(params) => (
																		<TextField
																			{...params}
																			variant="outlined"
																			placeholder="Add a task..."
																		/>
																	)}
																	value={sEpic.tasksBlockedBy?.[task._id] || []}
																	options={sEpic.tasks.filter((e) => !e.closed && e._id !== task._id)}
																	renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => (
																		<Chip
																			key={`${option}_${index}`}
																			size="small"
																			label={option.title}
																			{...getTagProps({ index })}
																			sx={{
																				opacity: 1,
																				...(sEpic.tasks.find((e) => e._id === option._id).closed && { bgcolor: "red.500" }),
																			}}
																			color={sEpic.tasks.find((e) => e._id === option._id).closed ? "error" : "default"}
																		/>
																	))}
																	isOptionEqualToValue={(a, b) => (a._id ?? a) === (b._id ?? b)}
																	getOptionLabel={(option) => (option.title ?? option)}
																	onChange={(_, newValue) => {
																		onUpdatEpicDebounced({
																			...sEpic,
																			tasksBlockedBy: {
																				...sEpic.tasksBlockedBy,
																				[task._id]: newValue,
																			},
																		});
																		setSEpic((p) => {
																			p.tasksBlockedBy[task._id] = newValue;
																		});
																	}}
																/>
															</Box>
														</Grid>
														<Grid item xs={12} sm={3} md={4}>
															<Box>
																<Typography variant="body2" mb={0.5}>{"Assignees:"}</Typography>
																<Autocomplete
																	readOnly
																	multiple
																	disablePortal
																	size="small"
																	getOptionLabel={(e) => e.user?.username || e.username}
																	isOptionEqualToValue={(a, b) => (a.user?._id || a._id) === (b.user?._id || b._id)}
																	renderInput={(params) => (
																		<TextField {...params} variant="outlined" placeholder="Add an assignee..." />
																	)}
																	id="assignees"
																	value={uniqueAssignees || []}
																	options={[]}
																	sx={{ width: "100%" }}
																/>
															</Box>
														</Grid>
														<Grid item xs={12} sm={3} md={2}>
															<Box>
																<Typography variant="body2" mb={0.5}>{"Status:"}</Typography>
																<Select
																	readOnly
																	value={task.status || ""}
																	id="status"
																	size="small"
																	sx={{
																		width: "100%",
																		backgroundColor: theme.palette.common.white,
																		"& .MuiSelect-select": {
																			cursor: task.external ? "default" : "pointer",
																			backgroundColor: theme.palette.common.white,
																			borderBottom: (t) => {
																				let color = t.palette.grey[700];
																				if (["Backlog"].includes(task.status)) color = t.palette[`workloadBacklog${kanbanTheme}`].main;
																				if (["To Do", "Sprint Planning"].includes(task.status)) color = t.palette[`workloadSprintPlanning${kanbanTheme}`].main;
																				if (["Open", "In Progress"].includes(task.status)) color = t.palette[`workloadInProgress${kanbanTheme}`].main;
																				if (["Delivered"].includes(task.status)) color = t.palette[`workloadDelivered${kanbanTheme}`].main;
																				if (["Closed", "Done", "Accepted"].includes(task.status)) color = t.palette[`workloadAccepted${kanbanTheme}`].main;
																				return `${t.spacing(0.5)} solid ${color}`;
																			},
																		},
																	}}
																>
																	{columnOptions.map((e, index) => (
																		<MenuItem key={`status_${task._id}_${index}`} value={e}>{e}</MenuItem>
																	))}
																</Select>
															</Box>
														</Grid>
													</Grid>
												</Box>

											)}
										/>
										<ListItemSecondaryAction>
											<IconButton
												edge="end"
												aria-label="delete"
												title="delete"
												disabled={sEpic.external}
												onClick={() => {
													const deletedTask = sEpic.tasks[ind];
													onUpdatEpicDebounced({
														...sEpic,
														tasks: sEpic.tasks.filter((_, idx) => ind !== idx),
														tasksBlockedBy: Object.fromEntries(
															Object.entries(sEpic.tasksBlockedBy)
																.map(([taskk, blockedBy]) => [
																	taskk, blockedBy.filter((e) => e._id !== deletedTask._id),
																]),
														),
													});
													setSEpic((p) => {
														p.tasks.splice(ind, 1);
														p.tasksBlockedBy = Object.fromEntries(
															Object.entries(p.tasksBlockedBy)
																.map(([taskk, blockedBy]) => [
																	taskk, blockedBy.filter((e) => e._id !== deletedTask._id),
																]),
														);
													});
												}}
											>
												<Delete />
											</IconButton>
										</ListItemSecondaryAction>
									</ListItem>
									{ind !== sEpic.tasks.length - 1 && <Divider />}
								</Fragment>
							))}
						</List>
					</Box>
				</div>

			</div>

		</Modal>
	);
};

Epic.propTypes = {
	open: PropTypes.bool.isRequired,
	title: PropTypes.string.isRequired,
	onClose: PropTypes.func.isRequired,
	epic: PropTypes.object.isRequired,
	onUpdateEpic: PropTypes.func.isRequired,
	tasks: PropTypes.array,
	pId: PropTypes.string.isRequired,
};

export default memo(Epic);
