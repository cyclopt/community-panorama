import { useState, useEffect, memo, useCallback } from "react";
import PropTypes from "prop-types";
import { TextField, Typography, Autocomplete, MenuItem, Switch, Box, Chip, createFilterOptions } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { dequal } from "dequal";
import { LoadingButton } from "@mui/lab";
import { MobileDatePicker } from "@mui/x-date-pickers";
import { dateNewToOld, stringAToZInsensitive } from "@iamnapo/sort";
import constructUrl from "@iamnapo/construct-url";
import { useImmer } from "use-immer";
import { useHotkeys } from "react-hotkeys-hook";

import { isFuzzyMatch, capitalize, round, useKeysForSuggestions, POSSIBLE_PRIORITIES, useSnackbar, dayjs, DATE_FORMAT, POSSIBLE_NOTIFICATIONS_DAYS } from "../utils/index.js";
import { submitTask } from "../api/index.js";

import MarkdownEditor from "./MarkdownEditor.jsx";
import Select from "./Select.jsx";
import Modal from "./Modal.jsx";

const filter = createFilterOptions();

const GenericGitTask = (props) => {
	const { open, onClose, projects, updateParent, tasks = [], defaultAssignee } = props;
	const defaultTask = {
		title: "",
		body: "",
		projectName: "",
		points: { done: 0, total: 1, review: 0 },
		labels: [],
		assignees: defaultAssignee ? [defaultAssignee] : [],
		reviewers: [],
		dueDate: null,
		notificationDay: "never",
		ignorePoints: false,
		priority: "none",
	};

	const { success, error } = useSnackbar();
	const [task, setTask] = useImmer(defaultTask);
	const [submitting, setSubmitting] = useState(false);
	const theme = useTheme();

	useEffect(() => {
		setSubmitting(false);
	}, [open]);

	const submitNewTask = async () => {
		try {
			if (submitting) return;
			setSubmitting(true);
			await submitTask(projects.find((e) => e.name === task.projectName)._id, task);
			setSubmitting(false);
			updateParent();
			success("Task submitted!");
		} catch {
			setSubmitting(false);
			error();
		}
	};

	useEffect(() => {
		if (!dequal(task, defaultTask)) setTask(defaultTask);
	}, [open]); // eslint-disable-line react-hooks/exhaustive-deps

	const keySuggestion = useKeysForSuggestions();

	const loadSuggestions = useCallback((text, trigger, key) => new Promise((resolve) => {
		setTimeout(() => {
			if (trigger === "@" || (key === "@")) {
				return resolve(projects
					.find((el) => el.name === task.projectName)
					?.team
					?.filter((e) => isFuzzyMatch(e.user.username, text))
					?.map((e) => ({
						preview: <Typography>{e.user.username}</Typography>,
						value: `@${e.user.username}`,
					})));
			}

			if (trigger === "#" || (key === "#")) {
				return resolve(tasks
					.filter((e) => e.project.name === task.projectName && isFuzzyMatch(e.title, text))
					.sort(dateNewToOld((v) => new Date(v.updatedAt)))
					.map((e) => ({
						preview: <Typography>{e.title}</Typography>,
						value: `[#${e._id.slice(0, 6)}](${constructUrl(`${window.location.protocol}//${window.location.host}`,
							`projects/${projects.find((el) => el.name === task.projectName)?._id}/project-analytics/management/`,
							{ id: e._id })})`,
					})));
			}

			return resolve([{
				preview: "Something Went Wrong",
				value: "",
			}]);
		}, 150);
	}), [tasks, task.projectName, projects]);

	useHotkeys(
		"ctrl+enter",
		() => {
			if (task?.title) {
				setSubmitting(true);
				submitNewTask();
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
			title="Create a new Task!"
			actions={(
				<LoadingButton
					variant="contained"
					color="secondary"
					size="medium"
					sx={{ color: "common.white" }}
					loading={submitting}
					disabled={!task.title}
					onClick={() => {
						setSubmitting(true);
						submitNewTask();
					}}
				>
					{"Create"}
				</LoadingButton>
			)}
			onClose={onClose}
		>
			<div className="columns">
				<div className="control is-expanded column">
					<label className="label" htmlFor="title">
						{"Title"}
					</label>
					<div className="control">
						<input
							required
							disabled={!task.projectName}
							className="input"
							type="text"
							id="title"
							placeholder="Title"
							value={task.title}
							onChange={(evt) => { evt.persist(); setTask((p) => { p.title = evt.target.value; }); }}
						/>
					</div>
				</div>
				<div className="control column is-narrow">
					<label className="label" htmlFor="priority">
						{"Priority"}
					</label>
					<div className="control">
						<Select
							disabled={!task.projectName}
							sx={{ minWidth: 120 }}
							value={task.priority}
							id="priority"
							size="small"
							SelectDisplayProps={{
								style: (() => {
									let color = theme.palette.grey[500];
									if (task.priority === "high") color = theme.palette.error.main;
									if (task.priority === "medium") color = theme.palette.warning.main;
									if (task.priority === "low") color = theme.palette.success.main;
									return ({
										borderBottom: `${theme.spacing(0.5)} solid ${color}`,
										cursor: task.external ? "default" : "pointer",
										backgroundColor: theme.palette.common.white,
									});
								})(),
							}}
							onChange={(evt) => setTask((p) => { p.priority = evt.target.value; })}
						>
							{[...POSSIBLE_PRIORITIES].map((e, ind) => (
								<MenuItem key={`priority_${ind}`} value={e}>
									{capitalize(e)}
								</MenuItem>
							))}
						</Select>
					</div>
				</div>
				<div className="control column is-narrow">
					<label className="label" htmlFor="due_date">
						{"Due Date"}
					</label>
					<div className="control">
						<MobileDatePicker
							value={dayjs(task.dueDate ?? null)}
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
							size="small"
							onAccept={(dueDate) => setTask((p) => {
								p.dueDate = dayjs(dueDate)?.utc(true).startOf("d") ?? null;
								if (!dueDate) { p.notificationDay = "never"; }
							})}
						/>
					</div>
				</div>
				{task.dueDate
					? (
						<div className="control column is-narrow">
							<label className="label" htmlFor="notifications">
								{"Notifications"}
							</label>
							<div className="control">
								<Select
									sx={{ minWidth: 120 }}
									readOnly={task.external}
									value={task.notificationDay}
									id="notifications"
									size="small"
									onChange={(e) => {
										if (e.target.value !== task.notificationDay) {
											setTask((p) => { p.notificationDay = e.target.value; });
										}
									}}
								>
									{[...POSSIBLE_NOTIFICATIONS_DAYS].map((e, ind) => (
										<MenuItem key={`notifications_${task._id}_${ind}`} value={e}>
											{capitalize(e)}
										</MenuItem>
									))}
								</Select>
							</div>
						</div>
					) : null}
			</div>
			<div className="field columns">
				<div className="field column">
					<label className="label" htmlFor="project_name" style={{ color: "#2E69A1" }}>
						{"Project"}
					</label>
					<div className="control">
						<Select
							required
							id="project_name"
							value={task.projectName || ""}
							renderValue={(selected) => {
								if (!selected) return <em>{"Select a Project"}</em>;
								return selected;
							}}
							onChange={(e) => setTask((p) => { p.projectName = e.target.value; })}
						>
							{projects.sort(stringAToZInsensitive((v) => v.name)).map((e) => (
								<MenuItem key={e._id} value={e.name}>
									{e.name}
								</MenuItem>
							))}
						</Select>
					</div>
				</div>
				{task.ignorePoints ? null : (
					<>
						<div className="control column is-narrow">
							<label className="label" htmlFor="points_total">
								{"Points Estimated"}
							</label>
							<div className="control">
								<input
									required
									disabled={!task.projectName}
									className="input"
									type="number"
									id="points_total"
									step={0.5}
									min={0.5}
									max={100}
									placeholder="Total"
									value={task.points.total}
									onChange={(evt) => setTask((p) => { p.points.total = round(Math.max(0.5, Number(evt.target.value))); })}
								/>
							</div>
						</div>
						<div className="control column is-narrow">
							<label className="label" htmlFor="points_done">
								{"Points Burned"}
							</label>
							<div className="control">
								<input
									required
									disabled={!task.projectName}
									className="input"
									type="number"
									id="points_done"
									step={0.5}
									min={0}
									max={100}
									placeholder="Done"
									value={task.points.done}
									onChange={(evt) => setTask((p) => { p.points.done = round(Math.max(0, Number(evt.target.value))); })}
								/>
							</div>
						</div>
					</>
				)}
				<div className="control column is-narrow">
					<label className="label" htmlFor="ignore_points">{"Ignore Points"}</label>
					<Box className="control" sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "center" } }} display="flex">
						<Switch
							disabled={!task.projectName}
							checked={task.ignorePoints}
							id="ignore_points"
							onChange={(evt) => {
								setTask((p) => {
									p.ignorePoints = Boolean(evt.target.checked);
									p.points.total = evt.target.checked ? 0 : 0.5;
									p.points.done = 0;
								});
							}}
						/>
					</Box>
				</div>
			</div>

			<div className="field">
				<label className="label" htmlFor="body">
					{"Body"}
				</label>
				<div className="control">
					<MarkdownEditor
						task={task}
						setTask={(val) => setTask((p) => { p.body = val; })}
						loadSuggestions={(text, triggeredBy) => loadSuggestions(text, triggeredBy, keySuggestion)}
					/>
				</div>
			</div>

			<div className="field columns">
				<div className="column">
					<label className="label" htmlFor="labels">
						{"Labels"}
					</label>
					<div className="control">
						<Autocomplete
							multiple
							disablePortal
							size="small"
							disabled={!task.projectName}
							renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Add a label..." />)}
							id="labels"
							options={projects.find((el) => el.name === task.projectName)?.availableLabels || []}
							onChange={(_, labels) => setTask((p) => { p.labels = labels; })}
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
							disabled={!task.projectName}
							renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Select a task..." />)}
							id="blocked_by"
							options={tasks.filter(({ project: { name }, closed, _id }) => (!closed || task.blockedBy?._id === _id)
								&& name === task.projectName) || []}
							getOptionLabel={(e) => e.title}
							isOptionEqualToValue={(a, b) => a._id === b._id}
							value={task.blockedBy || null}
							onChange={(_, blockedBy) => setTask((p) => {
								p.blockedBy = blockedBy;
								p.blocked = Boolean(blockedBy);
							})}
						/>
					</div>
				</div>
			</div>

			<div className="field">
				<label className="label" htmlFor="assignees">
					{"Assignees"}
				</label>
				<div className="control">
					<Autocomplete
						multiple
						disablePortal
						size="small"
						disabled={!task.projectName}
						value={task.assignees}
						getOptionLabel={(e) => e.user.username}
						renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Add an assignee..." />)}
						id="assignees"
						options={projects.find((el) => el.name === task.projectName)?.team || []}
						onChange={(_, assignees) => setTask((p) => { p.assignees = assignees; })}
					/>
				</div>
			</div>
			<div className="columns">
				<div className="column">
					<label className="label" htmlFor="epics">
						{"Epics"}
					</label>
					<div className="control">
						<Autocomplete
							multiple
							disablePortal
							freeSolo
							size="small"
							renderInput={(params) => <TextField {...params} variant="outlined" placeholder="Add an epic..." />}
							id="epics"
							options={task.availableEpics || []}
							value={task.epics || []}
							disabled={task.external}
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
								setTask((p) => { p.epics = epics; });
							}}
						/>
					</div>
				</div>
				<div className="control is-expanded column">
					<label className="label" htmlFor="reviewers">
						{"Reviewers"}
					</label>
					<div className="control">
						<Autocomplete
							multiple
							disablePortal
							size="small"
							disabled={!task.projectName}
							value={task.reviewers}
							getOptionLabel={(e) => e.user.username}
							renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Add a reviewer..." />)}
							id="reviewers"
							options={projects.find((el) => el.name === task.projectName)?.team || []}
							onChange={(_, reviewers) => setTask((p) => { p.reviewers = reviewers; })}
						/>
					</div>
				</div>
				<div className="control column is-narrow">
					<label className="label" htmlFor="points_review">
						{"Review Points"}
					</label>
					<div className="control">
						<input
							required
							disabled={!task.projectName}
							className="input"
							type="number"
							id="points_review"
							step={0.5}
							min={0}
							max={100}
							placeholder="Review"
							value={task.points.review}
							onChange={(evt) => setTask((p) => { p.points.review = round(Math.max(0, Number(evt.target.value))); })}
						/>
					</div>
				</div>
			</div>
		</Modal>
	);
};

GenericGitTask.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	projects: PropTypes.array.isRequired,
	updateParent: PropTypes.func.isRequired,
	tasks: PropTypes.array,
	defaultAssignee: PropTypes.string,
};

export default memo(GenericGitTask);
