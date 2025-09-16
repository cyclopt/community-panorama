import { useState, useRef, useEffect, useCallback, forwardRef, useMemo } from "react";
import { styled, useTheme } from "@mui/material/styles";
import PropTypes from "prop-types";
import {
	Button,
	ListItem,
	ListItemAvatar,
	Avatar,
	ListItemText,
	Typography,
	IconButton,
	TextField,
	Input,
	InputAdornment,
	Autocomplete,
	DialogTitle,
	DialogContent,
	Dialog,
	Slide,
	DialogContentText,
	DialogActions,
	MenuItem,
	Switch,
	Box,
	createFilterOptions,
	Chip,
	CircularProgress,
} from "@mui/material";
import { useHotkeys } from "react-hotkeys-hook";
import { Edit, Done, Clear, Assignment, Delete } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { MobileDatePicker } from "@mui/x-date-pickers";
import { dateNewToOld } from "@iamnapo/sort";
import constructUrl from "@iamnapo/construct-url";
import copy from "copy-text-to-clipboard";
import { useImmer } from "use-immer";
import debounceFn from "debounce-fn";
import { shallow } from "zustand/shallow";

import useLocalStorage from "../utils/use-local-storage.js";
import { jwt, useSnackbar, dayjs, POSSIBLE_COLUMNS, POSSIBLE_PRIORITIES, capitalize, round, useKeysForSuggestions, MUTATION_DELAY_IN_MS, isFuzzyMatch, DATE_FORMAT, POSSIBLE_NOTIFICATIONS_DAYS } from "../utils/index.js";

import MarkdownEditor from "./MarkdownEditor.jsx";
import Modal from "./Modal.jsx";
import MarkdownViewer from "./MarkdownViewer.jsx";
import Select from "./Select.jsx";

const filter = createFilterOptions();

const classes = {
	comment: "Task-comment",
	author: "Task-author",
	shareButton: "Task-shareButton",
	tag: "Task-tag",
};

const StyledModal = styled(Modal)(({ theme }) => ({
	[`& .${classes.author}`]: {
		padding: theme.spacing(0.5, 1),
		marginBottom: theme.spacing(1),
		backgroundColor: theme.palette.grey[300],
		borderRadius: theme.shape.borderRadius,
		display: "inline-block",
	},
	[`& .${classes.shareButton}`]: {
		minWidth: "unset",
		height: "2.5rem",
	},
	[`& .${classes.tag}`]: {
		opacity: "1 !important",
	},
}));

const Transition = forwardRef((props, ref) => <Slide ref={ref} direction="up" {...props} />);

const Task = ({
	open,
	title: mTitle,
	onClose,
	task,
	sprints,
	team = [],
	comments = [],
	isLoadingComments = true,
	onSubmit = () => {},
	submitting = false,
	onUpdate = () => {},
	onDelete = () => {},
	onUpdateTask = () => {},
	tasks = [],
	pId = "",
	kanban = { style: "default", hasArchived: true },
}) => {
	const [sTask, setSTask] = useImmer({ ...task, ignorePoints: task.points.total === 0 });
	const [newComment, setNewComment] = useState("");
	const [title, setTitle] = useState(task.title);
	const [editTitle, setEditTitle] = useState(false);
	const [taskBody, setTaskBody] = useState(task.body);
	const [editBody, setEditBody] = useState(false);
	const [editComment, setEditComment] = useImmer({ body: "" });
	const [scheduledCommentDeletion, setScheduledCommentDeletion] = useState(null);
	const theme = useTheme();
	const columnOptions = useMemo(() => [
		...POSSIBLE_COLUMNS.get(kanban.style),
		...(kanban.hasArchived ? ["Archived"] : []),
	], [kanban]);
	const { success } = useSnackbar();
	const onUpdateTaskDebounced = useMemo(() => debounceFn(onUpdateTask, { wait: MUTATION_DELAY_IN_MS }), [onUpdateTask]);

	const { kanbanTheme } = useLocalStorage(useCallback((e) => ({
		kanbanTheme: e?.kanbanTheme,
	}), []), shallow);

	useEffect(() => {
		setSTask({ ...task, ignorePoints: task.points.total === 0 });
		setTitle(task.title);
		setTaskBody(task.body);
	}, [JSON.stringify(task)]); // eslint-disable-line react-hooks/exhaustive-deps

	const updateComment = () => {
		if (editComment.body !== comments.find((e) => e._id === editComment._id)?.body) {
			onUpdate(editComment);
		}

		setEditComment({ body: "" });
	};

	const deleteComment = (id) => {
		onDelete({ _id: id });

		if (id === editComment._id) {
			setEditComment({ body: "" });
		}
	};

	useHotkeys(
		"ctrl+enter",
		() => {
			if (!(submitting || !newComment)) {
				onSubmit(newComment);
				setNewComment("");
			} else if (editBody) {
				setEditBody(false);
				onUpdateTaskDebounced({ ...sTask, body: taskBody });
				setSTask((p) => { p.body = taskBody; });
			} else if (editComment.body !== "") {
				updateComment();
			} else if (editTitle) {
				onUpdateTaskDebounced({ ...sTask, title });
				setSTask((p) => { p.title = title; });
				setEditTitle(false);
			}
		},
		{
			enableOnFormTags: true,
			enabled: open,
		},
	);

	const timeoutRef = useRef();

	useEffect(() => {
		clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(() => window.scrollTo(0, 0), 250);
	}, [comments.length]);
	const viewer = jwt.decode();

	const keySuggestion = useKeysForSuggestions();

	const loadSuggestions = useCallback((text, trigger, key) => new Promise((resolve) => {
		setTimeout(() => {
			if (trigger === "@" || (key === "@")) {
				return resolve(team.filter((e) => isFuzzyMatch(e.user.username, text)).map((e) => ({
					preview: (<Typography>{e.user.username}</Typography>),
					value: `@${e.user.username}`,
				})));
			}

			if (trigger === "#" || (key === "#")) {
				return resolve(tasks
					.filter((e) => isFuzzyMatch(e.title, text))
					.sort(dateNewToOld((v) => new Date(v.updatedAt)))
					.map((e) => ({
						preview: <Typography>{e.title}</Typography>,
						value: `[#${e._id.slice(0, 6)}](${constructUrl(`${window.location.protocol}//${window.location.host}`,
							`projects/${pId}/project-analytics/management/`,
							{ id: e._id })})`,
					})));
			}

			return resolve([{
				preview: "Something Went Wrong",
				value: "",
			}]);
		}, 150);
	}), [tasks, pId, team]);

	if (!sTask.author) return null;

	const viewerIsAdmin = team.find((e) => e.user._id === viewer.id)?.role === "admin";

	return (
		<StyledModal
			keepMounted
			open={open}
			title={mTitle}
			disableAreYouSureDialog={!(editTitle || editBody || editComment._id || newComment)}
			actions={!sTask.external && (
				<LoadingButton
					variant="contained"
					color="secondary"
					size="medium"
					disabled={submitting || !newComment}
					sx={{ color: "common.white" }}
					loading={submitting}
					onClick={async () => {
						await onSubmit(newComment);
						setNewComment("");
					}}
				>
					{"Comment"}
				</LoadingButton>
			)}
			onClose={() => { onClose(); setNewComment(""); }}
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
							endAdornment={!sTask.external && (
								<InputAdornment position="end">
									{!editTitle && (<IconButton aria-label="edit title" onClick={() => setEditTitle(true)}><Edit /></IconButton>)}
									{editTitle && (
										<>
											<IconButton
												aria-label="update"
												onClick={() => {
													onUpdateTaskDebounced({ ...sTask, title });
													setSTask((p) => { p.title = title; });
													setEditTitle(false);
												}}
											>
												<Done />
											</IconButton>
											<IconButton
												aria-label="clear"
												onClick={() => {
													setTitle(sTask.title);
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
				<div className="control columns is-mobile column is-narrow">
					<div className="control column is-narrow">
						<label className="label" htmlFor="priority">
							{"Priority"}
						</label>
						<div className="control">
							<Select
								sx={{ minWidth: 120 }}
								readOnly={sTask.external}
								value={sTask.priority}
								id="priority"
								size="small"
								SelectDisplayProps={{
									style: (() => {
										let color = theme.palette.grey[500];
										if (sTask.priority === "low") color = theme.palette.success.main;
										if (sTask.priority === "medium") color = theme.palette.warning.main;
										if (sTask.priority === "high") color = theme.palette.error.main;
										return ({
											borderColor: color,
											borderBottom: `${theme.spacing(0.5)} solid ${color}`,
											cursor: sTask.external ? "default" : "pointer",
										});
									})(),
								}}
								onChange={(e) => {
									if (e.target.value !== sTask.priority) {
										onUpdateTaskDebounced({ ...sTask, priority: e.target.value });
										setSTask((p) => { p.priority = e.target.value; });
									}
								}}
							>
								{[...POSSIBLE_PRIORITIES].map((e, ind) => (
									<MenuItem key={`priority_${sTask._id}_${ind}`} value={e}>
										{capitalize(e)}
									</MenuItem>
								))}
							</Select>
						</div>
					</div>
					<div className="control column is-expanded">
						<label className="label" htmlFor="due_date">
							{"Due Date"}
						</label>
						<div className="control">
							<MobileDatePicker
								value={dayjs(sTask?.dueDate ?? null)}
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
								readOnly={sTask.external}
								onAccept={(dueDate) => {
									onUpdateTaskDebounced({ ...sTask, dueDate });
									setSTask((p) => {
										p.dueDate = dueDate ? dayjs(dueDate)?.utc(true).startOf("d") : null;
										if (!dueDate) { p.notificationDay = "never"; }
									});
								}}
							/>
						</div>
					</div>
					{
						sTask.dueDate ? (
							<div className="control column is-narrow">
								<label className="label" htmlFor="notification">
									{"Notifications"}
								</label>
								<div className="control">
									<Select
										sx={{ minWidth: 120 }}
										readOnly={sTask.external}
										value={sTask.notificationDay}
										id="notifications"
										size="small"
										onChange={(e) => {
											if (e.target.value !== sTask.notificationDay) {
												onUpdateTaskDebounced({ ...sTask, notificationDay: e.target.value });
												setSTask((p) => { p.notificationDay = e.target.value; });
											}
										}}
									>
										{[...POSSIBLE_NOTIFICATIONS_DAYS].map((e, ind) => (
											<MenuItem key={`notifications_${sTask._id}_${ind}`} value={e}>
												{capitalize(e)}
											</MenuItem>
										))}
									</Select>
								</div>
							</div>
						) : null
					}

					<div className="control column is-narrow">
						<label className="label" htmlFor="share">
							{"Share"}
						</label>
						<div className="control" id="share">
							<Button
								variant="outlined"
								type="button"
								className={classes.shareButton}
								onClick={() => {
									copy(constructUrl(`${window.location.protocol}//${window.location.host}`, `projects/${pId}/project-analytics/management/`, {
										id: task._id,
									}), { target: document.querySelector("#share") });
									success("Task URL copied to clipboard!");
								}}
							>
								<Assignment color="secondary" />
							</Button>
						</div>
					</div>
				</div>
			</div>
			<div className="field columns">
				<div className="column is-narrow">
					<label className="label" htmlFor="status">
						{"Status"}
					</label>
					<div className="control">
						<Select
							value={sTask.status || ""}
							readOnly={sTask.external}
							id="status"
							sx={{ width: "15ch" }}
							SelectDisplayProps={{
								style: (() => {
									let color = theme.palette.grey[700];
									if (["Backlog"].includes(sTask.status)) color = theme.palette[`workloadBacklog${kanbanTheme}`].main;
									if (["To Do", "Sprint Planning"].includes(sTask.status)) color = theme.palette[`workloadSprintPlanning${kanbanTheme}`].main;
									if (["Open", "In Progress"].includes(sTask.status)) color = theme.palette[`workloadInProgress${kanbanTheme}`].main;
									if (["Delivered"].includes(sTask.status)) color = theme.palette[`workloadDelivered${kanbanTheme}`].main;
									if (["Closed", "Done", "Accepted"].includes(sTask.status)) color = theme.palette[`workloadAccepted${kanbanTheme}`].main;
									return ({
										borderBottom: `${theme.spacing(0.5)} solid ${color}`,
										cursor: sTask.external ? "default" : "pointer",
										backgroundColor: theme.palette.common.white,
									});
								})(),
							}}
							onChange={(e) => {
								if (e.target.value !== sTask.status) {
									onUpdateTaskDebounced({ ...sTask, status: e.target.value });
									setSTask((p) => {
										if (e.target.value === "Backlog") p.sprint = null;
										p.status = e.target.value;
									});
								}
							}}
						>
							{columnOptions.map((e, ind) => (
								<MenuItem key={`status_${sTask._id}_${ind}`} value={e}>{e}</MenuItem>
							))}
						</Select>
					</div>
				</div>
				{(sTask?.status === "Sprint Planning") && (
					<div className="column is-narrow" style={{ height: "100%", marginTop: "auto" }}>
						<div className="control">
							<label className="label" htmlFor="status">
								{"Sprint"}
							</label>
							<Select
								value={sTask?.sprint || null}
								readOnly={sTask.external}
								id="sprint"
								sx={{
									width: "15ch",
									"& .MuiTypography-root": { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
								}}
								SelectDisplayProps={{
									style: { marginBottom: theme.spacing(0.5), borderColor: theme.palette.cardBackgroundDark.main },
								}}
								renderValue={(v) => <Typography maxWidth="100%">{sprints.find((s) => s._id === v)?.title ?? "Default"}</Typography>}
								onChange={(e) => {
									if (e.target.value !== sTask.sprint) {
										onUpdateTaskDebounced({ ...sTask, sprint: e.target.value });
										setSTask((p) => { p.sprint = e.target.value; });
									}
								}}
							>
								<MenuItem value={null}>{"Default"}</MenuItem>
								{(sprints || []).map((s) => (
									<MenuItem key={`sprint_${s._id}`} sx={{ display: "block", mt: 0.5, mb: 0.5 }} value={s?._id}>
										<Typography>{s?.title}</Typography>
										{s?.startDate && s?.endDate && (
											<Typography variant="caption">
												{`${dayjs(s.startDate).format("DD/MM/YYYY")} - ${dayjs(s.endDate).format("DD/MM/YYYY")}`}
											</Typography>
										)}
									</MenuItem>
								))}
							</Select>
						</div>
					</div>
				)}
				<div className="column">
					<label className="label" htmlFor="labels">
						{"Labels"}
					</label>
					<div className="control">
						<Autocomplete
							multiple
							disablePortal
							size="small"
							renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Add a label..." />)}
							id="labels"
							options={sTask.availableLabels || []}
							value={sTask.labels || []}
							disabled={sTask.external}
							classes={{ tag: classes.tag }}
							onChange={(_, labels) => {
								onUpdateTaskDebounced({ ...sTask, labels });
								setSTask((p) => { p.labels = labels; });
							}}
						/>
					</div>
				</div>
				<div className="column">
					<label className="label" htmlFor="blocked_by">
						{"Blocked by"}
					</label>
					<div className="control">
						<Autocomplete
							disablePortal
							size="small"
							renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Select a task..." />)}
							id="blocked_by"
							options={tasks.reduce((acc, cur) => {
								if ((!cur.closed || sTask.blockedBy?._id === cur._id) && cur._id !== sTask._id) acc.push(cur);
								return acc;
							}, [])}
							getOptionLabel={(e) => e.title}
							isOptionEqualToValue={(a, b) => a._id === b._id}
							value={sTask.blockedBy || null}
							disabled={sTask.external}
							classes={{ tag: classes.tag }}
							onChange={(_, blockedBy) => {
								onUpdateTaskDebounced({ ...sTask, blockedBy, blocked: Boolean(blockedBy) });
								setSTask((p) => {
									p.blockedBy = blockedBy;
									p.blocked = Boolean(blockedBy);
								});
							}}
						/>
					</div>
				</div>
			</div>
			<div className="field columns">
				<div className="control column is-expanded">
					<label className="label" htmlFor="assignees">
						{"Assignees"}
					</label>
					<div className="control">
						<Autocomplete
							multiple
							disablePortal
							size="small"
							getOptionLabel={(e) => e.user?.username || e.username}
							isOptionEqualToValue={(a, b) => (a.user?._id || a._id) === (b.user?._id || b._id)}
							renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Add an assignee..." />)}
							id="assignees"
							value={sTask.assignees || []}
							options={sTask.availableAssignees || []}
							disabled={sTask.external}
							classes={{ tag: classes.tag }}
							onChange={(_, assignees) => {
								onUpdateTaskDebounced({ ...sTask, assignees });
								setSTask((p) => { p.assignees = assignees; });
							}}
						/>
					</div>
				</div>
				{sTask.ignorePoints ? null : (
					<>
						<div className="control column is-narrow" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
							<label className="label" htmlFor="points_total">
								{"Points Estimated"}
							</label>
							<div className="control">
								<input
									required
									className="input"
									type="number"
									id="points_total"
									step={0.5}
									min={0.5}
									max={100}
									placeholder="Total"
									value={sTask.points.total}
									readOnly={sTask.external}
									onChange={(evt) => {
										const total = round(Math.max(0.5, Number(evt.target.value)));
										onUpdateTaskDebounced({ ...sTask, points: { ...sTask.points, total } });
										setSTask((p) => { p.points.total = total; });
									}}

								/>
							</div>
						</div>
						<div className="control column is-narrow" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
							<label className="label" htmlFor="points_done">
								{"Points Burned"}
							</label>
							<div className="control">
								<input
									required
									className="input"
									type="number"
									id="points_done"
									step={0.5}
									min={0}
									max={100}
									placeholder="Done"
									value={sTask.points.done}
									readOnly={sTask.external}
									onChange={(evt) => {
										const done = round(Math.max(0, Number(evt.target.value)));
										onUpdateTaskDebounced({ ...sTask, points: { ...sTask.points, done } });
										setSTask((p) => { p.points.done = done; });
									}}
								/>
							</div>
						</div>
					</>
				)}
				<div className="control column is-narrow">
					<label className="label" htmlFor="ignore_points">{"Ignore Points"}</label>
					<Box className="control" sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "center" } }} display="flex">
						<Switch
							checked={sTask.ignorePoints}
							id="ignore_points"
							onChange={(evt) => {
								setSTask((p) => {
									p.ignorePoints = Boolean(evt.target.checked);
									p.points.total = evt.target.checked ? 0 : 0.5;
									p.points.done = 0;
								});
								onUpdateTaskDebounced({ ...sTask, points: { ...sTask.points, total: evt.target.checked ? 0 : 0.5, done: 0 } });
							}}
						/>
					</Box>
				</div>
			</div>
			<div className="field columns">
				<div className="column">
					<label className="label" htmlFor="epics">
						{"Epics"}
					</label>
					<div className="control">
						<Autocomplete
							multiple
							freeSolo
							disablePortal
							size="small"
							renderInput={(params) => <TextField {...params} variant="outlined" placeholder="Add an epic..." />}
							id="epics"
							options={sTask.availableEpics || []}
							value={sTask.epics || []}
							disabled={sTask.external}
							classes={{ tag: classes.tag }}
							getOptionLabel={(option) => option.title || option}
							renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => (
								<Chip
									key={`${option.inputValue || option.title}_${index}`}
									size="small"
									label={option.inputValue || option.title}
									{...getTagProps({ index })}
								/>
							))}
							filterOptions={(defaultOptions, params) => {
								const options = filter(defaultOptions, params);
								if (params.inputValue !== "") {
									options.push({ inputValue: params.inputValue, title: `Create "${params.inputValue}"` });
								}

								return options;
							}}
							onChange={(_, epics) => {
								onUpdateTaskDebounced({ ...sTask, epics });
								setSTask((p) => { p.epics = epics; });
							}}
						/>
					</div>
				</div>
				<div className="control column is-expanded">
					<label className="label" htmlFor="reviewers">
						{"Reviewers"}
					</label>
					<div className="control">
						<Autocomplete
							multiple
							disablePortal
							size="small"
							getOptionLabel={(e) => e.user?.username || e.username}
							isOptionEqualToValue={(a, b) => (a.user?._id || a._id) === (b.user?._id || b._id)}
							renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Add a reviewer..." />)}
							id="reviewers"
							value={sTask.reviewers || []}
							options={sTask.availableReviewers || []}
							disabled={sTask.external}
							classes={{ tag: classes.tag }}
							onChange={(_, reviewers) => {
								onUpdateTaskDebounced({ ...sTask, reviewers });
								setSTask((p) => { p.reviewers = reviewers; });
							}}
						/>
					</div>
				</div>
				<div className="control column is-narrow" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
					<label className="label" htmlFor="points_review">
						{"Review Points"}
					</label>
					<div className="control">
						<input
							required
							className="input"
							type="number"
							id="points_review"
							step={0.5}
							min={0}
							max={100}
							placeholder="Review"
							value={sTask.points.review}
							readOnly={sTask.external}
							onChange={(evt) => {
								const review = round(Math.max(0, Number(evt.target.value)));
								onUpdateTaskDebounced({ ...sTask, points: { ...sTask.points, review } });
								setSTask((p) => { p.points.review = review; });
							}}
						/>
					</div>
				</div>
			</div>

			<div className="field">
				<label className="label" htmlFor="body">
					{"Body"}
				</label>
				<div className="control" id="task-body">
					<ListItem sx={{
						alignItems: "center",
						mx: 1,
						my: 0,
						borderWidth: (t) => t.spacing(0.2),
						borderStyle: "solid",
						backgroundColor: "grey.50",
						borderColor: "secondary.main",
						borderRadius: 1,
					}}
					>
						<ListItemAvatar>
							<Avatar alt={sTask.author.username} title={sTask.author.username} src={sTask.author.avatar} />
						</ListItemAvatar>
						<ListItemText
							disableTypography
							primary={(
								<div className={classes.author}>
									<Typography variant="h6" style={{ display: "inline-block" }}>{sTask.author.username}</Typography>
									<Typography variant="body2" component="span">{` - ${dayjs(sTask.createdAt).format("DD MMM YY, h:mm A")}`}</Typography>
									{((viewerIsAdmin || sTask.author.username === viewer.username) && !sTask.external) && (editBody
										? (
											<>
												<IconButton
													size="small"
													aria-label="edit comment"
													title="edit comment"
													className="small-icon"
													onClick={() => {
														setEditBody(false);
														onUpdateTaskDebounced({ ...sTask, body: taskBody });
														setSTask((p) => { p.body = taskBody; });
													}}
												>
													<Done color="secondary" />
												</IconButton>
												<IconButton
													size="small"
													aria-label="cancel"
													title="cancel"
													className="small-icon"
													onClick={() => {
														setTaskBody(sTask.body);
														setEditBody(false);
													}}
												>
													<Clear color="primary" />
												</IconButton>
											</>
										)
										: (
											<IconButton
												size="small"
												aria-label="edit body"
												title="edit body"
												className="small-icon"
												onClick={() => { setEditBody(true); }}
											>
												<Edit />
											</IconButton>
										))}
								</div>
							)}
							secondary={editBody ? (
								<MarkdownEditor
									task={{ body: taskBody, projectName: pId }}
									setTask={setTaskBody}
									loadSuggestions={(text, triggeredBy) => loadSuggestions(text, triggeredBy, keySuggestion)}
								/>
							) : <MarkdownViewer content={taskBody || "> No description provided"} />}
						/>
					</ListItem>
				</div>
			</div>

			<div className="field">
				<label htmlFor="comments" className="label">
					{"Comments"}
				</label>
				{isLoadingComments
					? 											(
						<Box sx={{ m: 1, display: "flex", justifyContent: "center" }}>
							<CircularProgress color="secondary" />
						</Box>
					)
					: (
						<div className="control">
							{comments.map(({ author: { username, avatar }, _id, body, updatedAt }, index) => (
								<ListItem
									key={`${username}_${updatedAt}_${index}_${body}`}
									sx={{
										alignItems: "center",
										m: 1,
										borderWidth: (t) => t.spacing(0.2),
										borderStyle: "solid",
										backgroundColor: "grey.50",
										borderColor: "secondary.main",
										borderRadius: 1,
									}}
									id={`list-item-${index}`}
								>
									<ListItemAvatar>
										<Avatar alt={username} title={username} src={avatar} />
									</ListItemAvatar>
									<ListItemText
										disableTypography
										primary={(
											<div className={classes.author}>
												<Typography variant="h6" style={{ display: "inline-block" }}>{username}</Typography>
												<Typography variant="body2" component="span">{` - ${dayjs(updatedAt).format("DD MMM YY, h:mm A")}`}</Typography>
												{(viewerIsAdmin || username === viewer.username) && !sTask.external && (editComment._id === _id ? (
													<>
														<IconButton
															size="small"
															aria-label="edit comment"
															title="edit comment"
															className="small-icon"
															onClick={updateComment}
														>
															<Done color="secondary" />
														</IconButton>
														<IconButton
															size="small"
															aria-label="cancel"
															title="cancel"
															className="small-icon"
															onClick={() => setEditComment({ body: "" })}
														>
															<Clear color="primary" />
														</IconButton>
													</>
												) : (
													<IconButton
														size="small"
														aria-label="edit comment"
														title="edit comment"
														className="small-icon"
														onClick={() => setEditComment({ _id, body })}
													>
														<Edit />
													</IconButton>
												))}
												{(viewerIsAdmin || username === viewer.username) && !sTask.external && (
													<IconButton
														size="small"
														aria-label="delete comment"
														title="delete comment"
														className="small-icon"
														onClick={() => setScheduledCommentDeletion(_id)}
													>
														<Delete color="secondary" />
													</IconButton>
												)}
											</div>
										)}
										secondary={editComment._id === _id ? (
											<MarkdownEditor
												task={{ body: editComment.body, projectName: pId }}
												setTask={(val) => setEditComment((p) => { p.body = val; })}
												loadSuggestions={(text, triggeredBy) => loadSuggestions(text, triggeredBy, keySuggestion)}
											/>
										) : <MarkdownViewer content={body || "> No description provided"} />}
									/>
								</ListItem>
							))}
						</div>
					)}
			</div>
			{!sTask.external && (
				<span id="new-comment">
					<MarkdownEditor
						task={{ body: newComment, projectName: pId }}
						setTask={setNewComment}
						loadSuggestions={
							(text, triggeredBy) => loadSuggestions(text, triggeredBy, keySuggestion)
						}
					/>
				</span>
			)}
			<Dialog
				keepMounted
				open={Boolean(scheduledCommentDeletion)}
				TransitionComponent={Transition}
				onClose={() => setScheduledCommentDeletion(null)}
			>
				<DialogTitle>
					{"Are you sure?"}
				</DialogTitle>
				<DialogContent dividers>
					<DialogContentText>
						{"Are you sure you want to delete this comment?"}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button
						autoFocus
						startIcon={<Delete />}
						variant="contained"
						onClick={() => {
							deleteComment(scheduledCommentDeletion);
							setScheduledCommentDeletion(false);
						}}
					>
						{"Delete"}
					</Button>
					<Button variant="outlined" onClick={() => setScheduledCommentDeletion(false)}>{"Cancel"}</Button>
				</DialogActions>
			</Dialog>
		</StyledModal>
	);
};

Task.propTypes = {
	open: PropTypes.bool.isRequired,
	title: PropTypes.string.isRequired,
	onClose: PropTypes.func.isRequired,
	team: PropTypes.array,
	comments: PropTypes.array,
	isLoadingComments: PropTypes.bool,
	onSubmit: PropTypes.func,
	submitting: PropTypes.bool,
	onUpdate: PropTypes.func,
	onDelete: PropTypes.func,
	onUpdateTask: PropTypes.func,
	task: PropTypes.object.isRequired,
	tasks: PropTypes.array,
	pId: PropTypes.string,
	kanban: PropTypes.object,
	sprints: PropTypes.arrayOf(PropTypes.object),
};

export default Task;
