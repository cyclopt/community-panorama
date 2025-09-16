import { useState, useEffect, memo, useCallback } from "react";
import PropTypes from "prop-types";
import { TextField, Typography, Autocomplete, MenuItem, Switch, Box, Chip, createFilterOptions } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { LoadingButton } from "@mui/lab";
import { MobileDatePicker } from "@mui/x-date-pickers";
import { dateNewToOld } from "@iamnapo/sort";
import constructUrl from "@iamnapo/construct-url";
import { useImmer } from "use-immer";
import { useHotkeys } from "react-hotkeys-hook";
import { dequal } from "dequal";

import { isFuzzyMatch, capitalize, round, useKeysForSuggestions, POSSIBLE_PRIORITIES, dayjs, DATE_FORMAT, POSSIBLE_NOTIFICATIONS_DAYS } from "../utils/index.js";

import MarkdownEditor from "./MarkdownEditor.jsx";
import Modal from "./Modal.jsx";
import Select from "./Select.jsx";

const filter = createFilterOptions();

const GitTask = (props) => {
	const { open, title, onClose, task, onSubmit, tasks = [], pId } = props;
	const [sTask, setSTask] = useImmer({ ...task, ignorePoints: task.points.total === 0 });
	const [submitting, setSubmitting] = useState(false);
	const theme = useTheme();

	useEffect(() => {
		setSubmitting(false);
	}, [open]);

	useEffect(() => {
		setSTask({ ...task, ignorePoints: task.points.total === 0 });
	}, [setSTask, task]);

	const keySuggestion = useKeysForSuggestions();

	const loadSuggestions = useCallback((text, trigger, key) => new Promise((resolve) => {
		setTimeout(() => {
			if (trigger === "@" || (key === "@")) {
				return resolve(
					(sTask.availableAssignees || [])
						.filter((e) => isFuzzyMatch(e.user.username, text))
						.map((e) => ({
							preview: <Typography>{e.user.username}</Typography>,
							value: `@${e.user.username}`,
						})),
				);
			}

			if (trigger === "#" || (key === "#")) {
				return resolve(tasks
					.filter((e) => isFuzzyMatch(e.title, text))
					.sort(dateNewToOld((v) => new Date(v.updatedAt)))
					.map((e) => ({
						preview: (<Typography>{e.title}</Typography>),
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
	}), [sTask.availableAssignees, pId, tasks]);

	useHotkeys(
		"ctrl+enter",
		async () => {
			if (sTask?.title) {
				setSubmitting(true);
				await onSubmit(sTask);
				setSubmitting(false);
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
			disableAreYouSureDialog={dequal(task, sTask)}
			open={open}
			title={title}
			actions={(
				<LoadingButton
					data-cy="done"
					variant="contained"
					color="secondary"
					size="medium"
					sx={{ color: "common.white" }}
					disabled={!sTask.title}
					loading={submitting}
					onClick={async () => {
						setSubmitting(true);
						await onSubmit(sTask);
						setSubmitting(false);
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
							className="input"
							type="text"
							id="title"
							placeholder="Title"
							value={sTask.title}
							onChange={(evt) => { setSTask((p) => { p.title = evt.target.value; }); }}
						/>
					</div>
				</div>
				<div className="control column is-narrow">
					<label className="label" htmlFor="priority">
						{"Priority"}
					</label>
					<div className="control">
						<Select
							sx={{ minWidth: 120 }}
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
							onChange={(evt) => setSTask((p) => { p.priority = evt.target.value; })}
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
					<div className="control" id="datePicker">
						<MobileDatePicker
							value={dayjs(sTask.dueDate ?? null)}
							format={DATE_FORMAT}
							sx={{ maxHeight: "1rem" }}
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
							onAccept={(dueDate) => {
								setSTask((p) => {
									p.dueDate = dueDate ? dayjs(dueDate)?.utc(true).startOf("d") : null;
									if (!dueDate) { p.notificationDay = "never"; }
								});
							}}
						/>
					</div>
				</div>
				{sTask.dueDate
					? (
						<div className="control column is-narrow">
							<label className="label" htmlFor="notifications">
								{"Notification"}
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
					) : null}
			</div>
			<div className="field">
				<label className="label" htmlFor="body">
					{"Body"}
				</label>
				<div className="control">
					<MarkdownEditor
						task={{ body: sTask.body, projectName: pId }}
						setTask={(val) => setSTask((p) => { p.body = val; })}
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
							renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Add a label..." />)}
							id="labels"
							options={sTask.availableLabels || []}
							onChange={(_, labels) => setSTask((p) => { p.labels = labels; })}
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
							renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Select an task..." />)}
							id="blocked_by"
							options={tasks.filter((e) => !e.closed || sTask.blockedBy?._id === e._id) || []}
							getOptionLabel={(e) => e.title}
							isOptionEqualToValue={(a, b) => a._id === b._id}
							value={sTask.blockedBy || null}
							onChange={(_, blockedBy) => setSTask((p) => {
								p.blockedBy = blockedBy;
								p.blocked = Boolean(blockedBy);
							})}
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
							getOptionLabel={(e) => e.user.username}
							renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Add an assignee..." />)}
							id="assignees"
							options={sTask.availableAssignees || []}
							onChange={(_, assignees) => setSTask((p) => { p.assignees = assignees; })}
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
									onChange={(evt) => setSTask((p) => { p.points.total = round(Math.max(0.5, Number(evt.target.value))); })}
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
									onChange={(evt) => setSTask((p) => { p.points.done = round(Math.max(0, Number(evt.target.value))); })}
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
							disablePortal
							freeSolo
							size="small"
							renderInput={(params) => <TextField {...params} variant="outlined" placeholder="Add an epic..." />}
							id="epics"
							options={sTask.availableEpics || []}
							value={sTask.epics || []}
							disabled={sTask.external}
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
							getOptionLabel={(e) => e.user.username}
							renderInput={(params) => (<TextField {...params} variant="outlined" placeholder="Add a reviewer..." />)}
							id="reviewers"
							options={sTask.availableReviewers || []}
							onChange={(_, reviewers) => setSTask((p) => { p.reviewers = reviewers; })}
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
							onChange={(evt) => setSTask((p) => { p.points.review = round(Math.max(0, Number(evt.target.value))); })}
						/>
					</div>
				</div>
			</div>
		</Modal>
	);
};

GitTask.propTypes = {
	open: PropTypes.bool.isRequired,
	title: PropTypes.string.isRequired,
	onClose: PropTypes.func.isRequired,
	task: PropTypes.shape({
		title: PropTypes.string,
		dueDate: PropTypes.any,
		points: PropTypes.shape({
			done: PropTypes.number,
			total: PropTypes.number,
			review: PropTypes.number,
		}),
		body: PropTypes.string,
		availableLabels: PropTypes.array,
		labels: PropTypes.array,
		assignees: PropTypes.array,
		availableAssignees: PropTypes.array,
		reviewers: PropTypes.array,
		availableReviewers: PropTypes.array,
		blockedBy: PropTypes.object,
	}).isRequired,
	onSubmit: PropTypes.func.isRequired,
	tasks: PropTypes.array,
	pId: PropTypes.string.isRequired,
};

export default memo(GitTask);
