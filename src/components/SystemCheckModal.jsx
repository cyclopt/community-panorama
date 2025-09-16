/*
	Project Gate Modal is used to preview the details of project Quality Gates
	The user can set name, linked repositories, branches and checks
	This modal is opened in Quality Gates Overview
*/
import { useState, memo, useEffect, useMemo, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { Button,
	CircularProgress,
	Grid,
	Typography,
	LinearProgress,
	Box,
	TextField,
	Stack,
	Autocomplete,
	ToggleButtonGroup,
	ToggleButton,
	Checkbox,
	OutlinedInput,
	InputAdornment,
	Select,
	MenuItem,
	FormGroup,
	FormControlLabel,
} from "@mui/material";
import queryString from "query-string";
import { styled, useTheme } from "@mui/material/styles";
import { PriorityHigh, Delete, CheckBoxOutlineBlank, CheckBox, AddCircleOutline } from "@mui/icons-material";
import clsx from "clsx";
import { dequal } from "dequal";
import { useImmer } from "use-immer";
import { useHotkeys } from "react-hotkeys-hook";
import debounceFn from "debounce-fn";

import { useSnackbar, systemChecksOptions } from "../utils/index.js";

import DataTable from "./DataTable.jsx";
import Tooltip from "./Tooltip.jsx";
import Modal from "./Modal.jsx";

import { updateSystemCheck } from "#api";

const classes = {
	label: "ProjectQualityGateModal-label",
};

const Root = styled("div")(({ theme }) => ({
	[`& .${classes.label}`]: {
		color: theme.palette.primary.main,
	},
}));

const operatorOptions = [
	{ label: "is less than", value: "<" },
	{ label: "is less or equal than", value: "<=" },
	{ label: "is equal", value: "=" },
	{ label: "is equal or greater than", value: ">=" },
	{ label: "is greater than", value: ">" },
];

const getRows = (qualityGate) => qualityGate?.checks?.flatMap((cond, index) => [{
	id: index + 1,
	metric: cond.metric,
	operator: cond.operator,
	threshold: cond.threshold,
},
(index < qualityGate.checks.length - 1 ? { id: `AND_${index + 1}`, label: "AND" } : null),
]).filter(Boolean);

const CustomOutlinedInput = forwardRef((
	{ row, value, initValue, onChange, viewerIsAdmin, conditionsLength }, ref,
) => {
	const isInteger = systemChecksOptions.find((option) => option.metric === row.metric).isInteger;
	const [innerValue, setInnerValue] = useState(value);
	const theme = useTheme();

	const debouncedChange = useMemo(() => debounceFn(onChange, { wait: 100 }), [onChange]);

	useImperativeHandle(ref, () => ({
		resetValue: () => setInnerValue(initValue),
	}));

	// when the number of checks changes (when deleting repos or branches or when removing checks)
	// synchronize innerValue with value to show the correct threshold values
	// value is not defined on dependenceis on purpose
	useEffect(() => {
		setInnerValue(value);
	}, [conditionsLength]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleInputChange = (e) => {
		const input = e.target.value;
		const newValue = isInteger ? Number.parseInt(input, 10) : Number.parseFloat(input);
		setInnerValue(newValue);
		debouncedChange(newValue);
	};

	return (
		<OutlinedInput
			id="number-threshold"
			size="small"
			disabled={!viewerIsAdmin}
			inputProps={{ type: "number", min: 0, step: "any" }}
			value={innerValue}
			sx={{ width: "50%" }}
			startAdornment={
				(row.operator === "<" && innerValue === 0) || (innerValue < 0) ? (
					<InputAdornment position="start">
						<Tooltip title="Invalid input!">
							<PriorityHigh sx={{ color: theme.palette.error.main }} />
						</Tooltip>
					</InputAdornment>
				) : null
			}
			onChange={handleInputChange}
		/>
	);
});

CustomOutlinedInput.propTypes = {
	row: PropTypes.object,
	value: PropTypes.number,
	initValue: PropTypes.number,
	onChange: PropTypes.func,
	viewerIsAdmin: PropTypes.bool,
	conditionsLength: PropTypes.number,
};

CustomOutlinedInput.defaultProps = {
	row: {},
	value: 0,
	initValue: 0,
	onChange: () => {},
	viewerIsAdmin: false,
	conditionsLength: 0,
};

// NOTE: pass current organizations data to add-team
// Modal takes as props:
// i)    open: boolean variable for opening and closing the modal
// ii)   setOpen: setter to change open state
// iii)  mutateProjectQGs, mutateOrgQGs: mutate project and organization quality gates
// iv)   prQualityGate: the Quality Gate passed on the modal
// v)    isLoading: passed from from Quality Gates Overview page, true if project has loaded,
//		 project and organization quality gates have been loaded
// vi)   viewerIsAdmin: boolean variable that to check if viewer is project admin
// vii)  organizationId: the if of the organization that the current project belongs to
// viii) projectId: the id of the current project
// ix)   linkedRepositories: repositories linked to the current project
const SystemCheckModal = ({
	open,
	setOpen,
	mutateProjectQGs,
	prQualityGate,
	updatePrQualityGate,
	isLoading,
	viewerIsAdmin,
	linkedRepositories }) => {
	const { pathname, search } = useLocation();
	const navigate = useNavigate();
	const [isUpdating, setIsUpdating] = useState(false);
	const [conditionMetric, setConditionMetric] = useState(null);
	const [conditionOperator, setConditionOperator] = useState(null);
	const [conditionThreshold, setConditionThreshold] = useState(null);
	const [qualityGate, setQualityGate] = useImmer(
		{
			name: "",
			checks: [],
			references: null,
			linkedRepositories: [],
			branches: [],
		},
	);
	const [isLoadingCurrentSystemCheck, setIsLoadingCurrentSystemCheck] = useState(true);
	const { success, error } = useSnackbar();
	const theme = useTheme();

	const icon = <CheckBoxOutlineBlank fontSize="small" />;
	const checkedIcon = <CheckBox fontSize="small" />;

	const inputRefs = useRef({});

	// disable add button if metric, operator or condition are not defined
	// disable if threshold is negative
	// allow 0 value only if is less than operator is chosen
	const addIsDisabled = useMemo(() => !conditionMetric
		|| !conditionOperator
		|| (conditionThreshold < 0)
		|| (conditionMetric?.category === "Characteristics" && !conditionThreshold)
		|| (conditionMetric?.category !== "Characteristics" && conditionOperator?.label === "is less than" && !conditionThreshold)
		|| (conditionMetric?.category !== "Characteristics" && conditionOperator?.label !== "is less than" && (conditionThreshold === null || Number.isNaN(conditionThreshold))),
	[conditionMetric, conditionOperator, conditionThreshold]);

	// disable Done button when:
	// i)		the QG is being updated
	// ii)		the user is not an organization admin
	// iii) 	the QG name is empty or there are no checks, linked repositories, branches in it
	// iv)		the QG has no changes
	// v) 		the value of a QG's condition is empty
	// vi) 		the value of a QG's condition is negative
	// vii) 	the condition for metrics is : is less than 0
	// viii) 	the condition for characteristic metric is: is less than D-
	// ix) 		the condition for characteristic metric is: is greater than A+
	const doneIsDisabled = useMemo(() => isUpdating
		|| !viewerIsAdmin
        || (prQualityGate
            && dequal([...qualityGate.branches].sort(), [...prQualityGate.branches].sort())
            && dequal([...qualityGate.linkedRepositories].sort(), [...prQualityGate.linkedRepositories].sort())
            // eslint-disable-next-line max-len
            && dequal([...qualityGate.checks].sort((a, b) => a.metric.localeCompare(b.metric)), [...prQualityGate.checks].sort((a, b) => a.metric.localeCompare(b.metric))))
		|| !qualityGate?.name.trim()
		|| qualityGate?.checks?.length === 0
		|| qualityGate?.linkedRepositories?.length === 0
		|| qualityGate?.branches?.length === 0
		// check what changes does the user make on checks already added in quality gate
		|| qualityGate?.checks?.some((condition) => Number.isNaN(condition.threshold))
		|| qualityGate?.checks?.some((condition) => condition.operator === "<" && condition.threshold === 0)
		|| qualityGate?.checks?.some((condition) => condition.threshold < 0)
		|| qualityGate?.checks?.some((condition) => condition.operator === ">" && condition.threshold === "A+")
		|| qualityGate?.checks?.some((condition) => condition.operator === "<" && condition.threshold === "D-"),
	[isUpdating, prQualityGate, qualityGate, viewerIsAdmin]);

	// load the current Quality Gate from the Quality Gate selected from the menu
	useEffect(() => {
		if (prQualityGate) {
			setQualityGate(prQualityGate);
			setIsLoadingCurrentSystemCheck(false);
		}
	}, [prQualityGate, setQualityGate]);

	// filter available options for user to select from Add a metric.. AutoComplete element
	const availableMetricOptions = useMemo(() => {
		if (isLoadingCurrentSystemCheck) return [];
		// select possible checks depending on the system check
		return systemChecksOptions.filter(
			(option) => qualityGate.name.toLowerCase().includes(option.category.toLowerCase())
				&& !qualityGate.checks.some((check) => check.metric === option.metric),
		) || [];
	}, [isLoadingCurrentSystemCheck, qualityGate.checks, qualityGate.name]);

	const tableColumns = useMemo(() => [
		{
			field: "Metric",
			minWidth: 150,
			flex: 0.7,
			sortable: false,
			colSpan: ({ row }) => {
				if (/^AND_\d+$/.test(row.id)) {
					return 4;
				}

				return null;
			},
			valueGetter: ({ row }) => {
				if (/^AND_\d+$/.test(row.id)) {
					return (
						<Grid
							container
							justifyContent="center" // Horizontal centering
							alignItems="center" // Vertical centering
							sx={{ width: "100%" }}
						>
							<AddCircleOutline sx={{ color: theme.palette.primary.main }} />
						</Grid>
					);
				}

				return (<Typography align="center">{systemChecksOptions.find((option) => option.metric === row.metric)?.title}</Typography>);
			},
		},
		{
			field: "Operator",
			minWidth: 150,
			flex: 0.7,
			sortable: false,
			valueGetter: ({ row }) => row.operator,
			renderCell: ({ row, value }) => (
				<Select
					fullWidth
					disabled={!viewerIsAdmin} // disable element if viewer is not admin
					size="small"
					id="operator"
					value={value || ""}
					onChange={(e) => {
						setQualityGate((qG) => { qG.checks[row.id - 1].operator = e.target.value; });
					}}
				>
					{
						operatorOptions.map((option, ind) => (
							<MenuItem key={`operator_${ind}`} value={option.value}>
								{option.label}
							</MenuItem>
						))
					}
				</Select>
			),
		},
		{
			field: "Value",
			minWidth: 150,
			flex: 0.7,
			sortable: false,
			valueGetter: ({ row }) => row.threshold,
			renderCell: ({ row, value }) => (typeof row.threshold === "string" ? (
				<Select
					disabled={!viewerIsAdmin} // disable element if viewer is not admin
					id="string-threshold"
					size="small"
					value={value || ""}
					MenuProps={{
						PaperProps: {
							style: {
								maxHeight: 190, // Set the maximum height of the dropdown menu
							},
						},
					}}
					sx={{ width: "50%" }}
					input={(
						<OutlinedInput
							startAdornment={
								(value === "A+" && row.operator === ">") || (value === "D-" && row.operator === "<") ? (
									<InputAdornment position="start">
										<Tooltip title="Invalid input!">
											<PriorityHigh sx={{ color: theme.palette.error.main }} />
										</Tooltip>
									</InputAdornment>
								) : null
							}
						/>
					)}
					onChange={(e) => {
						setQualityGate((qG) => { qG.checks[row.id - 1].threshold = e.target.value; });
					}}
				>
					{["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-"].map((option, ind) => (
						<MenuItem key={`language_${ind}`} disabled={(row.operator === "<" && option === "D-") || (row.operator === ">" && option === "A+")} value={option}>
							{option}
						</MenuItem>
					))}
				</Select>
			) : (
				<CustomOutlinedInput
					ref={(ref) => { inputRefs.current[row.id] = ref; }}
					row={row}
					value={value}
					initValue={prQualityGate?.checks?.[row.id - 1]?.threshold}
					viewerIsAdmin={viewerIsAdmin}
					conditionsLength={qualityGate?.checks.length}
					onChange={(newValue) => {
						setQualityGate((qG) => { qG.checks[row.id - 1].threshold = newValue; });
					}}
				/>
			)),
		},
		{
			field: "Delete",
			width: 60,
			sortable: false,
			renderHeader: () => null,
			renderCell: ({ row }) => (
				<ToggleButtonGroup exclusive size="small" aria-label="actions">
					<ToggleButton
						value="delete"
						title="delete"
						aria-label="delete"
						disabled={!viewerIsAdmin}
						onClick={() => {
							setQualityGate((p) => { p.checks.splice(row.id - 1, 1); });
						}}
					>
						<Delete />
					</ToggleButton>
				</ToggleButtonGroup>
			),
		},
	], [prQualityGate?.checks, qualityGate?.checks.length, setQualityGate,
		theme.palette.error.main, theme.palette.primary.main, viewerIsAdmin]);
	const closeModal = () => {
		setOpen(false);
		setConditionMetric(null);
		setConditionOperator(null);
		setConditionThreshold(null);
		setQualityGate(prQualityGate);
		const parsed = queryString.parse(search);
		const { tab: tab_ } = parsed;
		navigate(queryString.stringifyUrl({ url: pathname, query: { tab: tab_ } }));
	};

	const submitUpdateQualityGate = async (e, qG) => {
		e.preventDefault();
		setIsUpdating(true);
		try {
			const result = await updateSystemCheck(qG._id, qG);

			mutateProjectQGs((pv) => {
				pv.map((item) => (item._id === result._id ? result : item));
			});

			// update prQualityGate
			updatePrQualityGate(result);

			// update state variable for updating
			setIsUpdating(false);
			success(`System Check: ${result.name} has been updated!`);
		} catch {
			setIsUpdating(false);
			error();
		}
	};

	// function that returns the options for linked repositories
	const getOptionLabel = useCallback((option) => {
		const { owner, name, root } = option;
		return root === "." ? `${owner}/${name}` : `${owner}/${name}/${root}`;
	}, []);

	useHotkeys(
		"ctrl+enter",
		(e) => {
			submitUpdateQualityGate(e, qualityGate);
			closeModal();
		},
		{
			enableOnFormTags: true,
			enabled: !(isUpdating || !viewerIsAdmin || dequal(qualityGate, prQualityGate) || qualityGate?.name === "" || qualityGate?.checks?.length === 0),
		},
	);

	return (
		<Modal
			keepMounted
			disableAreYouSureDialog={dequal(qualityGate, prQualityGate)}
			open={open}
			title="Quality Gate"
			actions={(
				<Stack
					direction="row"
					justifyContent="center"
					alignItems="center"
					spacing={2}
					mr={2}
				>
					<Button
						variant="outlined"
						size="medium"
						type="button"
						disabled={
							isUpdating
                            || !viewerIsAdmin
							|| (prQualityGate
								&& dequal([...qualityGate.branches].sort(), [...prQualityGate.branches].sort())
								&& dequal([...qualityGate.linkedRepositories].sort(), [...prQualityGate.linkedRepositories].sort())
								&& dequal([...qualityGate.checks].sort((a, b) => a.metric.localeCompare(b.metric)),
									[...prQualityGate.checks].sort((a, b) => a.metric.localeCompare(b.metric))))
						}
						onClick={() => {
							setConditionMetric(null);
							setConditionOperator(null);
							setConditionThreshold(null);
							setQualityGate(prQualityGate);

							for (const key of Object.keys(inputRefs.current)) {
								inputRefs.current[key].resetValue();
							}
						}}
					>
						{"reset"}
					</Button>
					<Button
						variant="contained"
						color="secondary"
						size="medium"
						type="submit"
						sx={{ color: "common.white" }}
						disabled={doneIsDisabled}
						onClick={async (e) => { await submitUpdateQualityGate(e, qualityGate); }}
					>
						{isUpdating
							? (<CircularProgress size={24} sx={{ color: "common.white" }} />)
							: "Done"}
					</Button>
				</Stack>
			)}
			onClose={() => {
				closeModal();
			}}
		>
			<Root className="container">
				{isUpdating ? (
					<Grid container justifyContent="center" align="center" direction="column" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
						<Grid item>
							<Typography gutterBottom variant="h5" color="primary">{"Updating your System Check. Please don’t close this window!"}</Typography>
						</Grid>
						<Grid item><LinearProgress color="primary" /></Grid>
					</Grid>
				) : (
					<div>
						{
							isLoading ? null : (
								<>
									<div className="field is-horizontal">
										<div className={clsx("label field-label is-normal", classes.label)}>{"Name:"}</div>
										<div className="field-body">
											<div className="field">
												<div className="control">
													<TextField
														disabled
														color="secondary"
														sx={{ width: "100%" }}
														size="small"
														value={qualityGate?.name}
														placeholder="System Check name"
													/>
												</div>
											</div>
										</div>
									</div>
									<div className="field is-horizontal" style={{ marginTop: "2rem", marginBottom: "2rem" }}>
										<div className={clsx("label field-label is-normal", classes.label)}>{"Linked Repositories:"}</div>
										<div className="field-body">
											<div className="field">
												<div className="control">
													<Autocomplete
														multiple
														disableCloseOnSelect
														id="linked-repos"
														disabled={!viewerIsAdmin}
														size="small"
														value={linkedRepositories.filter(
															(repo) => qualityGate.linkedRepositories.includes(repo._id),
														)}
														options={linkedRepositories}
														getOptionLabel={(option) => (option.root === "." ? `${option.owner}/${option.name}` : `${option.owner}/${option.name}/${option.root}`)}
														renderOption={(props, option, { selected }) => (
															<li {...props}>
																<Checkbox
																	icon={icon}
																	checkedIcon={checkedIcon}
																	style={{ marginRight: "1rem" }}
																	checked={selected}
																/>
																{getOptionLabel(option)}
															</li>
														)}
														renderInput={(params) => <TextField {...params} color="secondary" placeholder="Add a repository..." />}
														onChange={(_, newValue) => {
															setQualityGate((gate) => {
																gate.linkedRepositories = newValue.map((repo) => repo._id);
																return gate;
															});
														}}
													/>
												</div>
											</div>
										</div>
									</div>
									<div className="field is-horizontal" style={{ marginTop: "2rem", marginBottom: "2rem" }}>
										<div className={clsx("label field-label is-normal", classes.label)}>{"Branches:"}</div>
										<div className="field-body">
											<div className="field">
												<div className="control">
													<FormGroup row style={{ pointerEvents: "none" }}>
														<FormControlLabel
															control={(
																<Checkbox
																	disabled={!viewerIsAdmin} // disable element if viewer is not admin
																	style={{ pointerEvents: "auto" }}
																	checked={qualityGate.branches.includes("productionBranch")}
																	name="production branch"
																	onChange={(_, newValue) => {
																		const newBranches = newValue
																			? [...qualityGate.branches, "productionBranch"].filter((value, index, branches) => branches.indexOf(value) === index)
																			: qualityGate.branches.filter((branch) => branch !== "productionBranch");
																		setQualityGate((gate) => {
																			gate.branches = [...new Set(newBranches)];
																			return gate;
																		});
																	}}
																/>
															)}
															label="Production Branch"
														/>
														<FormControlLabel
															control={(
																<Checkbox
																	disabled={!viewerIsAdmin} // disable element if viewer is not admin
																	style={{ pointerEvents: "auto" }}
																	checked={qualityGate.branches.includes("stagingBranch")}
																	name="staging branch"
																	onChange={(_, newValue) => {
																		const newBranches = newValue
																			? [...qualityGate.branches, "stagingBranch"].filter((value, index, branches) => branches.indexOf(value) === index)
																			: qualityGate.branches.filter((branch) => branch !== "stagingBranch");
																		setQualityGate((gate) => {
																			gate.branches = [...new Set(newBranches)];
																			return gate;
																		});
																	}}
																/>
															)}
															label="Staging Branch"
														/>
													</FormGroup>
												</div>
											</div>
										</div>
									</div>
									<div className="field is-horizontal" style={{ marginTop: "2rem" }}>
										<div className={clsx("label field-label is-normal", classes.label)}>{"Conditions:"}</div>
										<div className="field-body">
											<div className="field">
												<Box sx={{ display: "flex", alignItems: "center", marginBottom: "1rem", marginLeft: "auto", marginRight: "auto" }}>
													<Autocomplete
														disabled={!viewerIsAdmin} // disable element if viewer is not admin
														size="small"
														renderInput={(params) => <TextField {...params} color="secondary" placeholder="Add a metric..." />}
														sx={{ width: "33%" }}
														id="metric-labels"
														options={availableMetricOptions}
														getOptionLabel={(option) => option.title}
														value={availableMetricOptions.find((option) => option.metric === conditionMetric?.metric) || null}
														onChange={(_, newValue) => {
															setConditionMetric(newValue);
															setConditionOperator(null);
															setConditionThreshold(null);
														}}
													/>
													<Autocomplete
														disabled={!conditionMetric}
														size="small"
														renderInput={(params) => <TextField {...params} color="secondary" placeholder="Add an operator..." />}
														sx={{ ml: 1, width: "33%" }}
														id="operator-labels"
														options={operatorOptions}
														getOptionLabel={(option) => option.label ?? option}
														value={conditionOperator}
														onChange={(_, newValue) => {
															setConditionOperator(newValue);
															setConditionThreshold(null);
														}}
													/>
													{prQualityGate?.name.includes("Characteristics") ? (
														<Autocomplete
															disabled={!conditionMetric || !conditionOperator}
															size="small"
															renderInput={(params) => <TextField {...params} color="secondary" placeholder="Add a threshold..." />}
															sx={{ ml: 1, width: "33%" }}
															id="threshold-labels"
															options={[
																{ label: "A+", value: "A+" },
																{ label: "A", value: "A" },
																{ label: "A-", value: "A-" },
																{ label: "B+", value: "B+" },
																{ label: "B", value: "B" },
																{ label: "B-", value: "B-" },
																{ label: "C+", value: "C+" },
																{ label: "C", value: "C" },
																{ label: "C-", value: "C-" },
																{ label: "D+", value: "D+" },
																{ label: "D", value: "D" },
																{ label: "D-", value: "D-" },
															]}
															getOptionLabel={(option) => option.label ?? option}
															getOptionDisabled={(option) => {
																if (conditionOperator?.label === "is greater than" && option.label === "A+") return true;
																if (conditionOperator?.label === "is less than" && option.label === "D-") return true;
																return false;
															}}
															value={conditionThreshold}
															onChange={(_, newValue) => {
																setConditionThreshold(newValue);
															}}
														/>
													) : (
														<OutlinedInput
															disabled={!conditionMetric || !viewerIsAdmin || !conditionOperator}
															size="small"
															inputProps={{ type: "number", min: 0, step: "any" }}
															placeholder="Add a threshold..."
															variant="outlined"
															sx={{ ml: 1, width: "30%" }}
															color="secondary"
															id="threshold-labels"
															value={conditionThreshold ?? ""}
															startAdornment={
																(conditionOperator?.label === "is less than" && conditionThreshold === 0) || (conditionThreshold < 0) ? (
																	<InputAdornment position="start">
																		<Tooltip title="Invalid input!">
																			<PriorityHigh sx={{ color: theme.palette.error.main }} />
																		</Tooltip>
																	</InputAdornment>
																) : null
															}
															onChange={(event) => {
																// Check if input value is valid
																const { value } = event.target;
																const newValue = conditionMetric?.isInteger
																	? Number.parseInt(value, 10) : Number.parseFloat(value);

																setConditionThreshold(newValue);
															}}
														/>
													)}
													<Button
														disabled={addIsDisabled}
														variant="outlined"
														color="secondary"
														sx={{ ml: 1, fontWeight: "bold", borderWidth: 2, borderColor: "secondary.main" }}
														onClick={() => {
															setQualityGate((p) => {
																p.checks.push({
																	metric: conditionMetric.metric,
																	operator: conditionOperator.value,
																	threshold: conditionThreshold?.value
                                                                            || Number.parseFloat(conditionThreshold) });
															});
															setConditionMetric(null);
															setConditionOperator(null);
															setConditionThreshold(null);
														}}
													>
														{"Add"}
													</Button>
												</Box>
												<DataTable
													hideFooter
													noRowsLabel="No checks added yet."
													initialState={{ pagination:
                                                            { paginationModel: { page: 0, pageSize: 100 } } }}
													rows={getRows(qualityGate)}
													columns={tableColumns}
													// loading={isLoadingExtra}
													getRowHeight={(params) => {
														if (/^AND_\d+$/.test(params.id)) {
															return 25;
														}

														return "auto !important";
													}}
													sx={{
														"& .MuiDataGrid-row--lastVisible": {
															borderBottomLeftRadius: (t) => `${t.shape.borderRadius}px`,
															borderBottomRightRadius: (t) => `${t.shape.borderRadius}px`,
														},
													}}
												/>
											</div>
										</div>
									</div>
								</>
							)
						}
					</div>
				)}
			</Root>
		</Modal>
	);
};

SystemCheckModal.propTypes = {
	open: PropTypes.bool,
	setOpen: PropTypes.func,
	mutateProjectQGs: PropTypes.func,
	prQualityGate: PropTypes.object,
	updatePrQualityGate: PropTypes.func,
	isLoading: PropTypes.bool,
	viewerIsAdmin: PropTypes.bool,
	linkedRepositories: PropTypes.array,
};

export default memo(SystemCheckModal);
