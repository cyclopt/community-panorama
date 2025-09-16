import { useState, memo, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { Button, Input, InputAdornment, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Divider, TextField } from "@mui/material";
import { Assignment, Done, Clear, Edit } from "@mui/icons-material";
import { MobileDatePicker } from "@mui/x-date-pickers";
import { useImmer } from "use-immer";
import copy from "copy-text-to-clipboard";
import constructUrl from "@iamnapo/construct-url";
import { shallow } from "zustand/shallow";
import { useHotkeys } from "react-hotkeys-hook";

import { useSnackbar, dayjs, useLocalStorage, DATE_FORMAT } from "../utils/index.js";

import Modal from "./Modal.jsx";

const CreateSprint = (props) => {
	const { open, title, onSubmit, onDelete, pId, sprint = {}, onClose } = props;
	const [updatedSprint, setUpdatedSprint] = useImmer(sprint);
	const [sprintTitleTemplate, setSprintTitleTemplate] = useState(sprint?.titleTemplate);
	const [sprintTitle, setSprintTitle] = useState(sprint?.title);
	const [updateDialog, setUpdateDialog] = useState(false);
	const [deleteDialog, setDeleteDialog] = useState(false);
	const [editTitle, setEditTitle] = useState(false);
	const { success } = useSnackbar();

	const { currentSprint, setCurrentSprint } = useLocalStorage(useCallback((e) => ({
		currentSprint: e?.currentSprint,
		setCurrentSprint: e?.setCurrentSprint,
	}), []), shallow);

	const isDisabled = (sprint?.title === updatedSprint?.title
		&& dayjs(sprint.startDate).utc().valueOf() === dayjs(updatedSprint.startDate).valueOf()
		&& dayjs(sprint.endDate).utc().valueOf() === dayjs(updatedSprint.endDate).valueOf());

	useEffect(() => {
		setSprintTitleTemplate(sprint?.titleTemplate);
		setSprintTitle(sprint.title);
		setUpdatedSprint((p) => {
			Object.assign(p, sprint);
			p.startDate = dayjs(sprint?.startDate).utc();
			p.endDate = dayjs(sprint?.endDate).utc();
		});
	}, [JSON.stringify(sprint)]); // eslint-disable-line react-hooks/exhaustive-deps

	useHotkeys(
		"ctrl+enter",
		async () => {
			if (updateDialog) {
				await onSubmit(updatedSprint, true);
				setUpdatedSprint({});
				setUpdateDialog(false);
			} else if (!isDisabled) {
				if (updatedSprint?.origin) setUpdateDialog(true);
				else {
					await onSubmit(updatedSprint);
					setUpdatedSprint({});
				}
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
			title={title}
			disableAreYouSureDialog={!editTitle}
			actions={(
				<>
					<Button
						data-cy="done"
						variant="outlined"
						color="pink"
						size="medium"
						onClick={async () => {
							if (updatedSprint?.origin) setDeleteDialog(true);
							else {
								await onDelete(updatedSprint, false);
								if (String(currentSprint?._id) === String(updatedSprint._id)) setCurrentSprint(null);
								setUpdatedSprint({});
							}
						}}
					>
						{"Delete"}
					</Button>
					<Button
						data-cy="done"
						variant="contained"
						color="secondary"
						size="medium"
						sx={{ color: "common.white" }}
						disabled={isDisabled}
						onClick={async () => {
							if (updatedSprint?.origin) setUpdateDialog(true);
							else {
								await onSubmit(updatedSprint);
								setUpdatedSprint({});
							}
						}}
					>
						{"Update"}
					</Button>
				</>
			)}
			onClose={() => {
				onClose();
				setUpdateDialog(false);
				setDeleteDialog(false);
				setUpdatedSprint({});
				setEditTitle(false);
				setSprintTitle(null);
				setSprintTitleTemplate(null);
			}}
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
							value={(editTitle && sprintTitleTemplate) ? sprintTitleTemplate : sprintTitle}
							readOnly={!editTitle}
							endAdornment={(
								<InputAdornment position="end">
									{!editTitle && (
										<IconButton
											aria-label="edit title"
											onClick={() => {
												setEditTitle(true);
											}}
										>
											<Edit />
										</IconButton>
									)}
									{editTitle && (
										<>
											<IconButton
												aria-label="update"
												onClick={() => {
													if (editTitle && sprintTitleTemplate) {
														setUpdatedSprint((p) => {
															p.title = sprintTitleTemplate;
															p.titleTemplate = sprintTitleTemplate;
														});
													} else { setUpdatedSprint((p) => { p.title = sprintTitle; }); }

													setEditTitle(false);
												}}
											>
												<Done />
											</IconButton>
											<IconButton
												aria-label="clear"
												onClick={() => {
													setSprintTitle(updatedSprint.title);
													setEditTitle(false);
												}}
											>
												<Clear />
											</IconButton>
										</>
									)}
								</InputAdornment>
							)}
							onChange={(e) => {
								if (sprintTitleTemplate) {
									setSprintTitleTemplate(e.target.value);
									setSprintTitle((e.target.value).replaceAll("{i}", updatedSprint?.repetition));
								} else { setSprintTitle(e.target.value); }
							}}
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
								copy(constructUrl(`${window.location.protocol}//${window.location.host}`, `projects/${pId}/project-analytics/sprints/`, {
									id: updatedSprint._id,
								}), { target: document.querySelector("#share") });
								success("Sprint URL copied to clipboard!");
							}}
						>
							<Assignment color="secondary" />
						</Button>
					</div>
				</div>
			</div>
			<div className="columns" style={{ marginBottom: "0.5rem" }}>
				<div className="control is-expanded column">
					<label className="label" htmlFor="start_date">
						{"Start Date"}
					</label>
					<div className="control">
						<MobileDatePicker
							value={dayjs(updatedSprint?.startDate ?? null)}
							format={DATE_FORMAT}
							sx={{ width: "100%" }}
							slotProps={{
								actionBar: { actions: ["cancel", "accept"] },
								textField: {
									placeholder: "Set a start date",
									size: "small",
									error: false,
								},
							}}
							slots={{
								textField: ({ value, ...tprops }) => <TextField {...tprops} value={(dayjs(value).isValid()) ? value : ""} />,
							}}
							maxDate={updatedSprint?.endDate ? dayjs(updatedSprint?.endDate)?.subtract(1, "d") : null}
							onAccept={(startDate) => {
								setUpdatedSprint((p) => { p.startDate = startDate ? dayjs(startDate).utc(true).startOf("d") : null; });
							}}
						/>
					</div>
				</div>
				<div className="control is-expanded column">
					<label className="label" htmlFor="due_date">
						{"End Date"}
					</label>
					<div className="control">
						<MobileDatePicker
							value={dayjs(updatedSprint?.endDate ?? true)}
							format={DATE_FORMAT}
							sx={{ width: "100%" }}
							slotProps={{
								actionBar: { actions: ["clear", "cancel", "accept"] },
								textField: {
									placeholder: "Set an end date",
									size: "small",
									error: false,
								},
							}}
							slots={{
								textField: ({ value, ...tprops }) => <TextField {...tprops} value={(dayjs(value).isValid()) ? value : ""} />,
							}}
							minDate={updatedSprint?.startDate ? dayjs(updatedSprint?.startDate).add(1, "d") : null}
							onChange={(endDate) => {
								setUpdatedSprint((p) => { p.endDate = endDate ? dayjs(endDate).utc(true) : null; });
							}}
						/>
					</div>
				</div>
			</div>
			<Dialog
				keepMounted
				open={updateDialog}
				onClose={() => {
					onClose();
					setUpdateDialog(false);
				}}
			>
				<DialogTitle>{"Hold up"}</DialogTitle>
				<Divider />
				<DialogContent>
					<DialogContentText>
						{"You are about to update a repeated sprint. Would you like your changes to apply to other sprints linked to this?"}
					</DialogContentText>
				</DialogContent>
				<Divider />
				<DialogActions>
					<Button
						variant="outlined"
						onClick={async () => {
							await onSubmit(updatedSprint, false);
							setUpdatedSprint({});
							setUpdateDialog(false);
						}}
					>
						{"Update One"}
					</Button>
					<Button
						variant="contained"
						onClick={async () => {
							await onSubmit(updatedSprint, true);
							setUpdatedSprint({});
							setUpdateDialog(false);
						}}
					>
						{"Update All"}
					</Button>
				</DialogActions>
			</Dialog>
			<Dialog
				keepMounted
				open={deleteDialog}
				onClose={() => {
					onClose();
					setDeleteDialog(false);
				}}
			>
				<DialogTitle>{"Hold up"}</DialogTitle>
				<Divider />
				<DialogContent>
					<DialogContentText>
						{"You are about to delete a repeated sprint. Would you like your changes to apply to other sprints linked to this?"}
					</DialogContentText>
				</DialogContent>
				<Divider />
				<DialogActions>
					<Button
						variant="outlined"
						onClick={async () => {
							await onDelete(updatedSprint, false);
							if (String(currentSprint?._id) === String(updatedSprint._id)) setCurrentSprint(null);
							setUpdatedSprint({});
							setUpdateDialog(false);
							setDeleteDialog(false);
						}}
					>
						{"Delete One"}
					</Button>
					<Button
						variant="contained"
						onClick={async () => {
							await onDelete(updatedSprint, true);
							if (String(currentSprint?._id) === String(updatedSprint._id)) setCurrentSprint(null);
							setUpdatedSprint({});
							setUpdateDialog(false);
							setDeleteDialog(false);
						}}
					>
						{"Delete All"}
					</Button>
				</DialogActions>
			</Dialog>
		</Modal>
	);
};

CreateSprint.propTypes = {
	open: PropTypes.bool.isRequired,
	title: PropTypes.string.isRequired,
	onSubmit: PropTypes.func.isRequired,
	onDelete: PropTypes.func.isRequired,
	sprint: PropTypes.object,
	onClose: PropTypes.func,
	pId: PropTypes.string.isRequired,
};

export default memo(CreateSprint);
