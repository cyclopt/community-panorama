import { useState, useEffect, memo, Fragment } from "react";
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
	Chip,
	Divider,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { MobileDatePicker } from "@mui/x-date-pickers";
import { Delete } from "@mui/icons-material";
import { useHotkeys } from "react-hotkeys-hook";
import { useImmer } from "use-immer";

import { dayjs, DATE_FORMAT } from "../utils/index.js";

import Modal from "./Modal.jsx";

const CreateEpic = (props) => {
	const { open, title, onClose, epic, onSubmit, tasks = [] } = props;
	const [sEpic, setSEpic] = useImmer(epic);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		setSubmitting(false);
	}, [open]);

	useEffect(() => {
		if (open) {
			setSEpic(epic);
		}
	}, [open, setSEpic, epic]);

	useHotkeys(
		"ctrl+enter",
		() => {
			if (sEpic?.title) {
				setSubmitting(true);
				onSubmit(sEpic).finally(() => setSubmitting(false));
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
			disableAreYouSureDialog
			open={open}
			title={title}
			actions={(
				<LoadingButton
					data-cy="done"
					variant="contained"
					color="secondary"
					size="medium"
					sx={{ color: "common.white" }}
					loading={submitting}
					disabled={!sEpic.title}
					onClick={() => {
						setSubmitting(true);
						onSubmit(sEpic).finally(() => setSubmitting(false));
					}}
				>
					{"Create"}
				</LoadingButton>
			)}
			onClose={() => { onClose(); setSEpic(epic); }}
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
							value={sEpic.title}
							onChange={(evt) => setSEpic((p) => { p.title = evt.target.value; })}
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
							onAccept={(startDate) => setSEpic((p) => { p.startDate = startDate ? dayjs(startDate).utc(true).startOf("d") : null; })}
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
							onAccept={(dueDate) => setSEpic((p) => { p.dueDate = dueDate ? dayjs(dueDate).utc(true)?.startOf("d") : null; })}
						/>
					</div>
				</div>
			</div>

			<div className="control">
				<div className="label field-label is-normal" style={{ textAlign: "left", flexGrow: 0 }}>{"Tasks"}</div>
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
										options={tasks?.filter((e) => !sEpic.tasks.some((task) => task._id === e._id)) || []}
										getOptionLabel={(e) => e.title}
										isOptionEqualToValue={(a, b) => a._id === b._id}
										value={null}
										onChange={(_, task) => setSEpic((p) => { p.tasks.push(task); })}
									/>
								</ListSubheader>
							)}
						>
							{sEpic.tasks.map((task, ind) => (
								<Fragment key={`task_${task._id}_${ind}`}>
									<ListItem disableGutters>
										<ListItemText
											disableTypography
											primary={<Typography>{task.title}</Typography>}
											secondary={(
												<>
													<Typography variant="body2" display="inline">
														{"Blocked by:"}
														&nbsp;
													</Typography>
													<Autocomplete
														multiple
														disablePortal
														sx={{ width: "unset", minWidth: "50%", display: "inline-flex" }}
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
															setSEpic((p) => { p.tasksBlockedBy[task._id] = newValue; });
														}}
													/>
												</>
											)}
										/>
										<ListItemSecondaryAction>
											<IconButton
												edge="end"
												aria-label="delete"
												title="delete"
												onClick={() => {
													const deletedTask = sEpic.tasks[ind];
													setSEpic((p) => {
														p.tasks = p.tasks.filter((_, idx) => ind !== idx);
														p.tasksBlockedBy = Object.fromEntries(
															Object.entries(p.tasksBlockedBy).map(([taskk, blockedBy]) => [
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

CreateEpic.propTypes = {
	open: PropTypes.bool.isRequired,
	title: PropTypes.string.isRequired,
	onClose: PropTypes.func.isRequired,
	epic: PropTypes.shape({
		title: PropTypes.string,
		startDate: PropTypes.any,
		dueDate: PropTypes.any,
		tasksBlockedBy: PropTypes.object,
		tasks: PropTypes.array,
	}).isRequired,
	onSubmit: PropTypes.func.isRequired,
	tasks: PropTypes.array,
	pId: PropTypes.string.isRequired,
};

export default memo(CreateEpic);
