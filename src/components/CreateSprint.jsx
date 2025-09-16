import { useState, memo } from "react";
import PropTypes from "prop-types";
import { Box, Switch, TextField, Typography } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { MobileDatePicker } from "@mui/x-date-pickers";
import { useImmer } from "use-immer";
import { useHotkeys } from "react-hotkeys-hook";
import { QuestionMark } from "@mui/icons-material";

import { dayjs, DATE_FORMAT } from "../utils/index.js";

import Modal from "./Modal.jsx";
import Tooltip from "./Tooltip.jsx";

const roundDays = (days) => ((days <= 7) ? 7 : (days <= 14) ? 14 : (days <= 30) ? 30 : 60);

const CreateSprint = (props) => {
	const { open, title, onClose, pId, onSubmit, sprint = {} } = props;
	const [newSprint, setNewSprint] = useImmer({ ...sprint });
	const [repeat, setRepeat] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const calculateRepetitions = (repeatUntil) => {
		const sprintDurationRounded = roundDays((newSprint?.endDate)?.diff(newSprint?.startDate, "d"));
		const dayFromEndDate = (repeatUntil ?? newSprint?.repeatUntil)?.diff(newSprint?.endDate, "d");
		const sprintRepetitions = Math.floor(dayFromEndDate / sprintDurationRounded) + 1;
		return (sprintRepetitions > 0) ? sprintRepetitions : 0;
	};

	useHotkeys(
		"ctrl+enter",
		() => {
			if (newSprint?.title && newSprint?.startDate && newSprint?.endDate) {
				setSubmitting(true);
				onSubmit(newSprint, pId).finally(() => setSubmitting(false));
				setNewSprint({});
				setRepeat(false);
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
			actions={(
				<LoadingButton
					data-cy="done"
					variant="contained"
					color="secondary"
					size="medium"
					sx={{ color: "common.white" }}
					loading={submitting}
					disabled={!newSprint?.title || !newSprint?.startDate
						|| !newSprint?.endDate || !(dayjs(newSprint?.startDate).isBefore(dayjs(newSprint?.endDate)))}
					onClick={() => {
						setSubmitting(true);
						onSubmit(newSprint, pId).finally(() => setSubmitting(false));
						setNewSprint({});
						setRepeat(false);
					}}
				>
					{"Create"}
				</LoadingButton>
			)}
			onClose={() => { onClose(); setNewSprint({}); setRepeat(false); }}
		>
			<div className="columns">
				<div className="control is-expanded column">
					<label className="label" htmlFor="title">
						{"Title"}
					</label>
					<TextField
						style={{ width: "100%" }}
						placeholder="Title"
						variant="outlined"
						type="text"
						size="small"
						helperText={(repeat) ? (newSprint?.title?.includes("{i}") ? null : (
							<Typography variant="caption" style={{ color: "red" }}>
								{"Please add {i}."}
							</Typography>
						)) : null}
						value={newSprint?.title}
						InputProps={(repeat) ? {
							endAdornment: (
								<div>
									<Tooltip
										title={"Please add {i} into your title to ensure countability and distinctness between repeated sprint titles. For example \"Sprint {i}\" for n repetitions, will produce, \"Sprint 1\", \"Sprint 2\" and so on"}
										placement="top"
									>
										<QuestionMark
											position="end"
											sx={{
												borderRadius: "100%",
												backgroundColor: "primary.main",
												padding: (t) => t.spacing(0.5),
												height: (t) => t.spacing(3),
												aspectRatio: "1/1",
												minWidth: "0",
												display: "flex",
												justifyContent: "center",
												alignItems: "center",
												color: "white",
												"&:hover": {
													cursor: "pointer",
													color: "white",
												},
											}}
										/>
									</Tooltip>
								</div>
							),
						} : {}}
						onChange={(e) => setNewSprint((p) => { p.title = e.target.value; })}
					/>
				</div>
			</div>
			<div className="columns">
				<div className="control is-expanded column">
					<label className="label" htmlFor="start_date">
						{"Start Date"}
					</label>
					<div className="control">
						<MobileDatePicker
							value={dayjs(newSprint?.startDate ?? null)}
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
							maxDate={newSprint?.endDate ? dayjs(newSprint?.endDate)?.subtract(1, "d") : null}
							onAccept={(startDate) => setNewSprint((p) => { p.startDate = startDate ? dayjs(startDate)?.utc(true)?.startOf("d") : null; })}
						/>
					</div>
				</div>
				<div className="control is-expanded column">
					<label className="label" htmlFor="due_date">
						{"End Date"}
					</label>
					<div className="control">
						<MobileDatePicker
							value={dayjs(newSprint?.endDate ?? null)}
							format={DATE_FORMAT}
							sx={{ width: "100%" }}
							slotProps={{
								actionBar: { actions: ["cancel", "accept"] },
								textField: {
									placeholder: "Set an end date",
									size: "small",
									error: false,
								},
							}}
							slots={{
								textField: ({ value, ...tprops }) => <TextField {...tprops} value={(dayjs(value).isValid()) ? value : ""} />,
							}}
							minDate={newSprint?.startDate ? dayjs(newSprint?.startDate)?.add(1, "d") : null}
							disabled={!newSprint?.startDate}
							onAccept={(endDate) => setNewSprint((p) => { p.endDate = endDate ? dayjs(endDate)?.utc(true).startOf("d") : null; })}
						/>
					</div>
				</div>
			</div>
			<div className="columns" style={{ display: "flex", alignItems: "flex-end" }}>
				<div className="control column is-narrow" style={{ height: "100%" }}>
					<label className="label" htmlFor="repeat_sprint">{"Repeat"}</label>
					<Box className="control" sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "center" } }} display="flex">
						<Switch
							checked={repeat}
							id="repeat_sprint"
							onChange={(e) => { setRepeat(e.target.checked); setNewSprint((p) => { p.repeat = e.target.checked; }); }}
						/>
					</Box>
				</div>
				{repeat && (
					<>
						<div className="control column is-expanded">
							<div className="control">
								<label className="label" htmlFor="repeat_until_sprint">{"Repeat Until"}</label>
								<MobileDatePicker
									value={dayjs(newSprint?.repeatUntil ?? null)}
									format={DATE_FORMAT}
									sx={{ width: "100%" }}
									slotProps={{
										actionBar: { actions: ["clear", "cancel", "accept"] },
										textField: {
											placeholder: "Set a date",
											size: "small",
											error: false,
										},
									}}
									slots={{
										textField: ({ value, ...tprops }) => <TextField {...tprops} value={(dayjs(value).isValid()) ? value : ""} />,
									}}
									minDate={newSprint?.endDate ? dayjs(newSprint?.endDate)?.utc(true) : null}
									onAccept={(repeatUntil) => {
										const repetitions = calculateRepetitions(repeatUntil);
										setNewSprint((p) => {
											p.repeatUntil = repeatUntil ? dayjs(repeatUntil)?.utc(true).startOf("d") : null;
											if (repetitions >= 0) p.repetitions = repetitions;
										});
									}}
								/>
							</div>
						</div>
						<div className="control column is-narrow">
							<div className="control">
								<label className="label" htmlFor="repeat_until_sprint">{"Repetitions"}</label>
								<TextField
									disabled={newSprint?.repeatUntil}
									placeholder="Set Repetitions count"
									variant="outlined"
									type="number"
									size="small"
									value={newSprint?.dueDate ? calculateRepetitions() : newSprint?.repetitions}
									onChange={(e) => setNewSprint((p) => { p.repetitions = e.target.value; })}
								/>
							</div>
						</div>
					</>
				)}
			</div>
		</Modal>
	);
};

CreateSprint.propTypes = {
	open: PropTypes.bool.isRequired,
	title: PropTypes.string.isRequired,
	onClose: PropTypes.func.isRequired,
	sprint: PropTypes.object,
	onSubmit: PropTypes.func.isRequired,
	pId: PropTypes.string.isRequired,
};

export default memo(CreateSprint);
