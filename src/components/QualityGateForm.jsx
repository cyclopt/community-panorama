import PropTypes from "prop-types";
import { useState, useEffect, useRef, memo, useMemo } from "react";
import { styled, useTheme } from "@mui/material/styles";
import { Button,
	CircularProgress,
	Grid,
	Typography,
	Box,
	TextField,
	Stack,
	Autocomplete,
	ToggleButtonGroup,
	ToggleButton,
	Checkbox as MuiCheckBox,
	OutlinedInput,
	InputAdornment,
	Select,
	MenuItem, Switch, FormControlLabel, FormGroup,
}
	from "@mui/material";
import { PriorityHigh, Delete, CheckBoxOutlineBlank, CheckBox, AddCircleOutline } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useImmer } from "use-immer";
import { dequal } from "dequal";
import queryString from "query-string";

import { metricsInfo, generalMetricOptions, useSnackbar, QualityGates, createRepositoryName } from "../utils/index.js";
import {
	createOrganizationQualityGate, createTeamProjectQualityGate, createPersonalProjectQualityGate,
	validateTeamQualityGate, validatePersonalQualityGate,
	updateTeamProjectQualityGate, updatePersonalProjectQualityGate, updateOrganizationQualityGate,
	useOrganizationTemplatesQualityGates,
} from "../api/index.js";

import DataTable from "./DataTable.jsx";
import Tooltip from "./Tooltip.jsx";
import RepositoryAccordion from "./RepositoryAccordion.jsx";
import ToggleSwitch from "./ToggleSwitch.jsx";

const icon = <CheckBoxOutlineBlank fontSize="small" />;
const checkedIcon = <CheckBox fontSize="small" />;

const classes = {
	dangerButton: "Qualitygates-dangerButton",
};

const Root = styled("div")(({ theme }) => ({
	[`& .${classes.dangerButton}`]: {
		[theme.breakpoints.up("xs")]: {
			width: "100%",
		},
		[theme.breakpoints.up("sm")]: {
			width: "75%",
		},
		[theme.breakpoints.up("lg")]: {
			width: "65%",
		},
		color: theme.palette.red[500],
		borderColor: theme.palette.red[500],
		"&:hover": {
			backgroundColor: "rgba(244, 67, 5, 0.04)",
			borderColor: theme.palette.red[500],
		},
	},
}));

const GroupBox = ({ group, groupSelected, groupIndeterminate, toggleGroup }) => (
	<Box
		sx={{
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			pr: "1rem",
			pl: "1rem",
			color: "rgba(0, 0, 0, 0.6)",
			height: "46px",
			fontSize: "0.875rem",
		}}
	>
		{group}
		<MuiCheckBox
			checked={groupSelected}
			indeterminate={groupIndeterminate}
			size="small"
			onChange={toggleGroup}
		/>
	</Box>
);

GroupBox.propTypes = {
	group: PropTypes.bool,
	groupSelected: PropTypes.bool,
	groupIndeterminate: PropTypes.bool,
	toggleGroup: PropTypes.func,
};

// * ----------------------------------- Helper functions -----------------------------------

const sortByRepoId = (a, b) => {
	const idA = a.repoId?.toString?.() ?? "";
	const idB = b.repoId?.toString?.() ?? "";
	return idA.localeCompare(idB);
};

// * ----------------------------------------------------------------------------------------

const QualityGateForm = ({
	qualityGateInput = {},
	project = {},
	organization = {},
	isLoading = true,
	isPreviewMode = false,
	isUpdating = false,
	isSubmitting = false,
	setCurrentQualityGates = () => {},
	setOpen = () => {},
	setIsUpdating = () => {},
	setIsSubmitting = () => {},
	setIsCloseModalDisabled = () => {},
	mutateQualityGates = () => {},
}) => {
	const navigate = useNavigate();
	const { state, search, pathname } = useLocation();

	const [projectRepos, setProjectRepos] = useState([]);
	const [templates, setTemplates] = useState([]);
	const [templateOption, setTemplateOption] = useState(null);
	const [linkedReposUpdated, setLinkedReposUpdated] = useState(false);
	const [areAllRepositoriesSelected, setAreAllRepositoriesSelected] = useState(true);
	const [areAllBranchesSelected, setAreAllBranchesSelected] = useState(false);
	const isTemplate = state ? state.isTemplate : null;

	const { orgTemplateQualityGates = [],
		isLoading: isLoadingTemplateOrganizationQGs,
		isError: isErrorTemplateOrganizationQGs,
	} = useOrganizationTemplatesQualityGates(project?.parentOrganization?._id);

	// track if we are dealing with project or organization quality gates
	const isProject = useMemo(() => Object.keys(project).length > 0, [project]);
	// track if we are editing/previewing existing quality gate or adding a new one
	const isExistingQualityGate = useMemo(() => Object.keys(qualityGateInput).length > 0, [qualityGateInput]);

	// conditionally initialize state of Quality Gate
	const [qualityGate, setQualityGate] = useImmer(() => {
		if (isExistingQualityGate) {
			return {
				_id: qualityGateInput._id,
				name: qualityGateInput.name,
				conditions: qualityGateInput.conditions,
				references: qualityGateInput.references,
				linkedRepositories: qualityGateInput.linkedRepositories,
				...(qualityGateInput.branches && { branches: qualityGateInput.branches }),
				...(!isProject && { isTemplate: qualityGateInput.isTemplate }),
			};
		}

		return {
			_id: null,
			name: "",
			conditions: [],
			references: null,
			branches: ["productionBranch", "stagingBranch"],
			...(isProject
				? { linkedRepositories: project?.linkedRepositories?.map((repo) => (
					{
						repoId: repo._id,
						branches: { isProductionBranch: true, isStagingBranch: true, otherBranches: [] },
					})) }
				: { isTemplate }),
		};
	});

	const [conditionMetric, setConditionMetric] = useState(null);
	const [conditionOperator, setConditionOperator] = useState(null);
	const [conditionThreshold, setConditionThreshold] = useState(null);
	const [rows, setRows] = useState([]);
	const { success, error } = useSnackbar();
	const theme = useTheme();

	useEffect(() => {
		if (isErrorTemplateOrganizationQGs) {
			error();
		}
	}, [error, navigate, isErrorTemplateOrganizationQGs]);

	useEffect(() => {
		if (!isLoadingTemplateOrganizationQGs) setTemplates(orgTemplateQualityGates);
	}, [isLoadingTemplateOrganizationQGs, orgTemplateQualityGates]);

	// this useEffect is for load the repos is you reload the page
	useEffect(() => {
		if (!isLoading && isProject) {
			setProjectRepos(project?.linkedRepositories);
			setLinkedReposUpdated(true);
		}
	}, [isExistingQualityGate, isLoading, isProject, project, project?.linkedRepositories, qualityGateInput]);

	// disable add button if metric, operator or condition are not defined
	// disable if threshold is negative
	// allow 0 value only if is less than operator is choosen
	const addIsDisabled = useMemo(() => !conditionMetric
			|| !conditionOperator
			|| (conditionThreshold < 0)
			|| (conditionMetric?.category === "Characteristics" && !conditionThreshold)
			|| (conditionMetric?.category !== "Characteristics" && conditionOperator?.label === "is less than" && !conditionThreshold)
			|| (conditionMetric?.category !== "Characteristics" && conditionOperator?.label !== "is less than" && (conditionThreshold === null || Number.isNaN(conditionThreshold))),
	[conditionMetric, conditionOperator, conditionThreshold]);

	const languages = useMemo(() => [...new Set(projectRepos
		?.map((repo) => repo?.language?.toLowerCase()))], [projectRepos]);

	// reference to be used to track allOptions
	const prevAllOptionsRef = useRef();

	// allOptions stores all the options for metrics depending on which languages are present (via linked repos and branches)
	const allOptions = useMemo(() => {
		// Flatten the array of infos for each language
		const infos = languages.flatMap((language) => (metricsInfo[language] || [])
			.filter((info) => !["ESCOMP_MI", "MI", "PHPMETRICS_MI", "ESCOMP_CC", "CC", "PHPMETRICS_CC", "CD", "TCD", "ESCOMP_CD", "PHPMETRICS_CD"].includes(info.metric))
			.map((info) => {
				const { metric, title } = info;
				return {
					metric,
					title: QualityGates.metricsScoresMapping[metric] || title,
				};
			}));

		// Create a map to group unique metrics by title
		const titleToMetricsMap = {};

		for (const { metric, title } of infos) {
			if (!titleToMetricsMap[title]) {
				titleToMetricsMap[title] = new Set();
			}

			titleToMetricsMap[title].add(metric);
		}

		// Convert the map back to an array of objects with unique titles
		const options = Object.keys(titleToMetricsMap).map((title) => ({
			category: "Metric Scores",
			title,
			metric: [...titleToMetricsMap[title]],
		}));

		// join Size in Lines of Code and Class Size in Lines of Code in one new metric: (Class) Size in Lines of Code
		const filteredOptions = options.filter((obj) => obj.title !== "Class Size in Lines of Code" && obj.title !== "Size in Lines of Code");
		const combinedMetrics = [...new Set([...options.find((obj) => obj.title === "Class Size in Lines of Code")?.metric || [], ...options.find((obj) => obj.title === "Size in Lines of Code")?.metric || []])];
		const newOptions = combinedMetrics.length > 0 ? [...filteredOptions, { category: "Metric Scores", title: "(Class) Size in Lines of Code", metric: combinedMetrics }] : filteredOptions;

		// Depending on the languages of the project add different metric option
		const additionalMetric = [];
		if (["javascript", "typescript"].some((language) => languages.includes(language))) {
			additionalMetric.push({ category: "High Level Metrics", title: "Number of Files", metric: ["NumFiles"] });
		}

		if (languages.includes("dart")) {
			additionalMetric.push({ category: "High Level Metrics", title: "Number of Functions", metric: ["NumFunctions"] }, { category: "High Level Metrics", title: "Halstead Volume", metric: ["Difficulty"] });
		}

		if (["python", "java", "php", "kotlin", "c#"].some((language) => languages.includes(language))) {
			additionalMetric.push({ category: "High Level Metrics", title: "Number of Classes", metric: ["NumClasses"] });
		}

		if (["typescript", "javascript", "php", "java"].some((language) => languages.includes(language))) {
			additionalMetric.push({ category: "High Level Metrics", title: "Code Effort (days)", metric: ["EffortInDays"] });
		}

		// Add a field in the metrics to specify if the user is expected to provide integer value to the threshold
		const additionalMetrics = [...additionalMetric, ...newOptions].map((metric) => {
			const isInteger = QualityGates.isIntegerMetrics.some((str) => metric.title.includes(str));
			return { ...metric, isInteger };
		});

		// TEMPORARY: remove security vulnerabilities from generalMetrics when project Quality Gates are being created
		return [
			...generalMetricOptions.filter((obj) => !obj.title.includes("Security Vulnerabilities of Dependencies")),
			...additionalMetrics,
		];
	}, [languages]);

	// filter available options for user to select from Add a metric.. AutoComplete element
	const availableMetricOptions = allOptions
		// TEMPORARY: hide all metrics except from: Violations, Duplication of Code and Security Vulnerabilities
		.filter((obj) => ["Total Violations", "Critical Violations", "Major Violations", "Minor Violations", "Duplicate Code (%)", "Security Vulnerabilities of Dependencies"].includes(obj.title))
		.filter((obj) => !qualityGate.conditions.some((item) => dequal([...item.metric].sort(), [...obj.metric].sort())));

	// disable Done button when:
	// i)		the QG is being submitted
	// ii)		the user is not an organization admin
	// iii) 	the QG name is empty or there are no conditions, linked repositories, branches in it
	// iv)		the QG has no changes
	// v) 		the value of a QG's condition is empty
	// vi) 		the value of a QG's condition is negative
	// vii) 	the condition for metrics is : is less than 0
	// viii) 	the condition for characteristic metric is: is less than D-
	// ix) 		the condition for characteristic metric is: is greater than A+
	const doneIsDisabled = useMemo(() => {
		const isGeneralConditions = isSubmitting || isUpdating;
		// // Validation checks
		const isInvalid = !qualityGate?.name.trim()
				|| qualityGate?.conditions.length === 0
				|| (isProject && qualityGate?.linkedRepositories?.length === 0)
				|| (!qualityGate?.isTemplate && qualityGate?.branches?.length === 0)
				|| qualityGate?.conditions.some((condition) => Number.isNaN(condition.threshold))
				|| qualityGate?.conditions.some((condition) => condition.operator === "<" && condition.threshold === 0)
				|| qualityGate?.conditions.some((condition) => condition.threshold < 0)
				|| qualityGate?.conditions.some((condition) => condition.operator === ">" && condition.threshold === "A+")
				|| qualityGate?.conditions.some((condition) => condition.operator === "<" && condition.threshold === "D-");

		// Prevent enabling the button if the user hasn't made meaningful changes
		const isUnchanged = isExistingQualityGate
				&& qualityGate?.name === qualityGateInput?.name
				&& (isProject
					? dequal(
						[...qualityGate?.linkedRepositories ?? []].sort(sortByRepoId),
						[...qualityGateInput?.linkedRepositories ?? []].sort(sortByRepoId),
					)
					: true)
				&& (qualityGate?.isTemplate
					? true
					: dequal([...qualityGate?.branches ?? []].sort(), [...qualityGateInput?.branches ?? []].sort()))
				&& dequal(qualityGate?.conditions, qualityGateInput?.conditions);

		return isGeneralConditions || isInvalid || isUnchanged;
	}, [isExistingQualityGate, isProject, isSubmitting, isUpdating, qualityGate, qualityGateInput]);

	// Pass the state to enable or disable the the close modal option to the outter component
	useEffect(() => {
		setIsCloseModalDisabled(doneIsDisabled);
	}, [doneIsDisabled, setIsCloseModalDisabled]);

	const resetIsDisabled = useMemo(() => {
		const isGeneralConditions = isSubmitting || isUpdating;
		const isNewQgConditions = qualityGate.name === ""
				&& qualityGate.conditions.length === 0
				&& dequal(projectRepos, project?.linkedRepositories);
		// && (dequal(branches, projectBranches));
		const isOldQgConditions = qualityGate?.name === qualityGateInput?.name
			&& (isProject
				? dequal(
					[...qualityGate?.linkedRepositories ?? []].sort(sortByRepoId),
					[...qualityGateInput?.linkedRepositories ?? []].sort(sortByRepoId),
				)
				: true
			)
			&& (qualityGate?.isTemplate
				? true
				: dequal([...qualityGate?.branches ?? []].sort(), [...qualityGateInput?.branches ?? []].sort()))
			&& dequal(qualityGate?.conditions ?? [], qualityGateInput?.conditions ?? []);
		return isGeneralConditions || (qualityGateInput ? isOldQgConditions : isNewQgConditions);
	}, [isSubmitting, isUpdating, projectRepos, project?.linkedRepositories,
		qualityGate, qualityGateInput, isProject]);

	// update the metric array of quality gate's conditions depending on the languages provided
	// that ensures that when a repository-branch is deleted or added when conditions are already set
	// no condition will be falsely removed
	useEffect(() => {
		const prevData = prevAllOptionsRef?.current;

		// return the titles of the metrics in allOptions before update
		const titles = new Set(prevData?.map((obj) => obj.title));

		// search the allOptions
		const result = [];

		// find which metrics exist before and after updating repos or branches
		// check which of those have different metric arrays
		// this can happen for metrics that depending on the languages provided have different value, e.g. Number of Parameters
		for (const obj of allOptions) {
			const prevMetric = prevData
				?.filter((oj) => oj.title === obj.title)
				.flatMap((res) => res.metric);

			if (titles.has(obj.title) && !dequal([...obj.metric].sort(), [...prevMetric].sort())) {
				result.push({ previous: prevMetric, next: obj.metric });
			}
		}

		// set the metric array of the conditions already created to the new values
		if (result.length > 0) {
			setQualityGate((gate) => ({
				...gate,
				conditions: gate?.conditions?.map((condition) => {
					for (const res of result) {
						if (dequal([...condition.metric].sort(), [...res.previous].sort())) {
							return { ...condition, metric: res.next };
						}
					}

					return condition;
				}),
			}));
		}

		// Update the ref with the current computedData
		prevAllOptionsRef.current = allOptions;
	}, [allOptions, setQualityGate]);

	// when the linked Repos change -> find the available branches
	// check if the metrics of the conditions set already in the quality gate are valid
	useEffect(() => {
		if (!isLoading && isProject && linkedReposUpdated) {
			setQualityGate((gate) => ({
				...gate,
				conditions: gate?.conditions
					?.filter((condition) => allOptions.some((obj) => dequal([...condition.metric].sort(), [...obj.metric].sort()))),
			}));

			setLinkedReposUpdated(false);
		}
	}, [projectRepos, setQualityGate, allOptions, isLoading, isProject, linkedReposUpdated]);

	useEffect(() => {
		const updatedRows = [];
		for (const [index, condition] of qualityGate.conditions.entries()) {
			updatedRows.push({
				id: index + 1,
				metric: condition.metric,
				operator: condition.operator,
				threshold: condition.threshold,
			});
			if (index < qualityGate.conditions.length - 1) {
				updatedRows.push({
					id: `AND_${index + 1}`,
					label: "AND",
				});
			}
		}

		setRows(updatedRows);
	}, [qualityGate.conditions]);

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

				return (<Typography align="center">{QualityGates.findConditionLabel(allOptions, "metric", row.metric, "title")}</Typography>);
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
					disabled={isPreviewMode}
					size="small"
					id="operator"
					value={value || ""}
					onChange={(e) => {
						setQualityGate((qG) => { qG.conditions[row.id - 1].operator = e.target.value; });
					}}
				>
					{
						QualityGates.operatorOptions.map((option, ind) => (
							<MenuItem key={`operator_${ind}`} value={option.value}>
								{" "}
								{option.label}
								{" "}
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
					id="string-threshold"
					size="small"
					disabled={isPreviewMode}
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
						setQualityGate((qG) => { qG.conditions[row.id - 1].threshold = e.target.value; });
					}}
				>
					{["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-"].map((option, ind) => (
						<MenuItem key={`language_${ind}`} disabled={(row.operator === "<" && option === "D-") || (row.operator === ">" && option === "A+")} value={option}>
							{option}
						</MenuItem>
					))}
				</Select>
			) : (
				<OutlinedInput
					id="number-threshold"
					size="small"
					disabled={isPreviewMode}
					inputProps={{ type: "number", min: 0, step: "any" }}
					value={value}
					sx={{ width: "50%" }}
					startAdornment={
						(row.operator === "<" && value === 0) || (value < 0) ? (
							<InputAdornment position="start">
								<Tooltip title="Invalid input!">
									<PriorityHigh sx={{ color: theme.palette.error.main }} />
								</Tooltip>
							</InputAdornment>
						) : null
					}
					onChange={(e) => {
						// Check if input value is valid
						const input = e.target.value;

						// check if the input should be integer or float number
						const isInteger = allOptions.find((option) => option.title === QualityGates.findConditionLabel(allOptions, "metric", row.metric, "title")).isInteger;

						const newValue = isInteger ? Number.parseInt(input, 10) : Number.parseFloat(input);
						setQualityGate((qG) => { qG.conditions[row.id - 1].threshold = newValue; });
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
						disabled={isPreviewMode}
						aria-label="delete"
						onClick={() => {
							setQualityGate((p) => { p.conditions.splice(row.id - 1, 1); });
						}}
					>
						<Delete />
					</ToggleButton>
				</ToggleButtonGroup>
			),
		},
	], [allOptions, theme.palette.primary.main, theme.palette.error.main, isPreviewMode, setQualityGate]);

	// when updating the quality gate it should be executed again if linked repositories, branches or conditions have been modified
	const executeQualityGate = useMemo(() => {
		if (!isExistingQualityGate) return false;

		const linkedReposChanged = isProject
			? !dequal(
				[...qualityGate?.linkedRepositories ?? []].sort(sortByRepoId),
				[...qualityGateInput?.linkedRepositories ?? []].sort(sortByRepoId),
			)
			: false;

		const branchesChanged = qualityGate?.isTemplate
			? false
			: !dequal([...qualityGate?.branches ?? []].sort(), [...qualityGateInput?.branches ?? []].sort());

		const conditionsChanged = !dequal(qualityGate?.conditions, qualityGateInput?.conditions);

		return linkedReposChanged || branchesChanged || conditionsChanged;
	}, [
		qualityGate?.branches,
		qualityGate?.conditions,
		qualityGate?.linkedRepositories,
		qualityGateInput,
		isExistingQualityGate,
		isProject,
		qualityGate?.isTemplate,
	]);

	const submitCreateQualityGate = async (e) => {
		e.preventDefault();

		setIsSubmitting(true);
		try {
			let newQualityGate;
			if (isProject) {
				if (project.type === "team") {
					await validateTeamQualityGate(project.parentOrganization._id, qualityGate);
					newQualityGate = await createTeamProjectQualityGate(project.parentOrganization._id, project._id, qualityGate);
				} else {
					// validate and create Quality Gate for personal projects of users
					await validatePersonalQualityGate(qualityGate);
					newQualityGate = await createPersonalProjectQualityGate(project._id, qualityGate);
				}
			} else {
				await validateTeamQualityGate(organization._id, qualityGate);
				newQualityGate = await createOrganizationQualityGate(organization._id, qualityGate);
			}

			setCurrentQualityGates((prevQualityGates) => {
				const updatedQualityGates = [...prevQualityGates, newQualityGate];
				return updatedQualityGates;
			});
			mutateQualityGates();

			success(`Quality Gate: ${newQualityGate.name} has been added!`);
			// navigate(`/cyclopt-guard`, { replace: true, state: { currentQGs } });
			if (isProject) {
				navigate(`/projects/${project._id}/quality-gates?tab=0`, { replace: true });
			} else {
				navigate(`/organizations/${organization._id}/quality-gates`, { replace: true });
			}
		} catch (error_) {
			const errorMsg = await error_.response.text() ?? "Oops, something went wrong ";
			error(errorMsg);
		}

		setIsSubmitting(false);
	};

	const submitUpdateQualityGate = async (e, qG, shouldExecuteQualityGate) => {
		e.preventDefault();
		setIsUpdating(true);

		// After updating a quality gate remove mode query
		const parsed = queryString.parse(search);
		delete parsed.mode;
		try {
			let qualityGate_;
			if (isProject) {
				qualityGate_ = await (project?.type === "team"
					? updateTeamProjectQualityGate(project?.parentOrganization?._id, project._id, qG._id, qG, shouldExecuteQualityGate)
					: updatePersonalProjectQualityGate(project._id, qG._id, qG, shouldExecuteQualityGate));
				setCurrentQualityGates((prevQualityGates) => {
					const index = prevQualityGates.findIndex((gate) => gate._id === qG._id);
					const updatedQualityGates = [...prevQualityGates];
					updatedQualityGates[index] = qualityGate_;
					return updatedQualityGates;
				});
			} else {
				qualityGate_ = await updateOrganizationQualityGate(organization._id, qG._id, qG, shouldExecuteQualityGate);
				setCurrentQualityGates((prevQualityGates) => {
					const index = prevQualityGates.findIndex((gate) => gate._id === qG._id);
					const updatedQualityGates = [...prevQualityGates];
					updatedQualityGates[index] = qualityGate_;
					return updatedQualityGates;
				});
			}

			mutateQualityGates();
			success(`Quality Gate: ${qualityGate_.name} has been updated!`);
			setIsUpdating(false);
			setOpen(false);
			navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
		} catch (error_) {
			const errorMsg = await error_.response.text() ?? "Oops, something went wrong ";
			error(errorMsg);
			setIsUpdating(false);
			navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
		}
	};

	return (
		<Root>
			<form style={{ padding: "1.5rem" }}>
				<Grid container spacing={2} alignItems="flex-start">
					<Grid item xs={12} sm={3} textAlign="right" color={theme.palette.primary.main} fontWeight="bold">
						{"Name:"}
					</Grid>
					<Grid item xs={12} sm={9}>
						<TextField
							color="secondary"
							disabled={isPreviewMode}
							sx={{ width: "100%", minWidth: 200 }}
							size="small"
							value={qualityGate.name}
							placeholder="Quality Gate name"
							InputProps={{ ...(qualityGate.name ? {} : { endAdornment: <Tooltip title="Field Required"><PriorityHigh color="error" /></Tooltip> }) }}
							onChange={({ target: { value } }) => setQualityGate((p) => { p.name = value; })}
						/>
					</Grid>
				</Grid>
				{
					isProject ? (
						<>
							{(project.type === "team" && !isExistingQualityGate) ? (
								<Grid container spacing={2} alignItems="flex-start" marginTop="2rem" marginBottom="2rem">
									<Grid item xs={12} sm={3} textAlign="right" color={theme.palette.primary.main} fontWeight="bold">
										{"Available Templates:"}
									</Grid>
									<Grid item xs={12} sm={9}>
										<Autocomplete
											disablePortal
											disabled={isPreviewMode}
											size="small"
											id="templates"
											renderInput={(params) => <TextField {...params} color="secondary" placeholder="Add a template..." />}
											value={templateOption}
											options={templates.map((item) => item.name)}
											onChange={(_, newValue) => {
												setTemplateOption(newValue);
												if (newValue) {
													const template = templates.find((obj) => obj.name === newValue);
													setQualityGate((prev) => ({
														...prev,
														conditions: template.conditions,
													}));
												} else {
													setQualityGate((prev) => ({
														...prev,
														conditions: [],
													}));
												}
											}}
										/>
									</Grid>
								</Grid>
							) : null}
							<Grid container spacing={2} alignItems="flex-start" marginTop="2rem" marginBottom="2rem">
								<Grid item xs={12} sm={3} textAlign="right" color={theme.palette.primary.main} fontWeight="bold">
									{"Linked Repositories:"}
								</Grid>
								<Grid item xs={12} sm={9} direction="column" p="1rem 0rem 0rem 1rem">
									<Grid item mb="1rem">
										<ToggleSwitch
											isSwitchEnabled={areAllRepositoriesSelected}
											isSwitchDisabled={isPreviewMode}
											enableText="All repositories"
											disableText="No repositories"
											handleToggle={(e) => {
												const isOn = e.target.checked;
												setAreAllRepositoriesSelected(isOn);
												if (isOn) {
													setQualityGate((qG) => ({
														...qG,
														linkedRepositories: project?.linkedRepositories?.map((repo) => (
															{
																repoId: repo._id,
																branches: { isProductionBranch: true, isStagingBranch: true, otherBranches: [] },
															})),
													}));
												} else {
													setQualityGate((qG) => ({
														...qG,
														linkedRepositories: [],
													}));
												}
											}}
										/>
										<ToggleSwitch
											isSwitchEnabled={areAllBranchesSelected}
											isSwitchDisabled={isPreviewMode}
											enableText="All branches"
											disableText="Production/Staging branches"
											handleToggle={(e) => {
												const isOn = e.target.checked;
												setAreAllBranchesSelected(isOn);
												if (isOn) {
													setQualityGate((qG) => ({
														...qG,
														linkedRepositories: project?.linkedRepositories?.map((repo) => (
															{
																repoId: repo._id,
																branches: {
																	isProductionBranch: true,
																	isStagingBranch: true,
																	otherBranches: repo.branches
																		.filter((r) => ![repo.productionBranch, repo.stagingBranch].includes(r)),
																},
															})),
													}));
												} else {
													setQualityGate((qG) => ({
														...qG,
														linkedRepositories: project?.linkedRepositories?.map((repo) => (
															{
																repoId: repo._id,
																branches: { isProductionBranch: true, isStagingBranch: true, otherBranches: [] },
															})),
													}));
												}
											}}
										/>
									</Grid>
									<Grid item>
										{projectRepos.map((repo) => {
											const isEnabled = qualityGate.linkedRepositories?.some((r) => r.repoId === repo._id);
											const lrBranches = qualityGate.linkedRepositories.find((lr) => lr.repoId === repo._id)?.branches;
											return (
												<RepositoryAccordion
													key={repo._id}
													defaultExpanded={false}
													language={repo.language}
													numberOfBranches={
														(lrBranches?.otherBranches?.length ?? 0)
													+ (lrBranches?.isProductionBranch ? 1 : 0)
													+ (lrBranches?.isStagingBranch ? 1 : 0)
													}
													isPreviewMode={isPreviewMode}
													isRepositoryEnabled={isEnabled}
													setIsRepositoryEnabled={(enabled) => {
														setQualityGate((qG) => {
															if (enabled && !isEnabled) {
																qG.linkedRepositories.push({
																	repoId: repo._id,
																	branches: {
																		isProductionBranch: true,
																		isStagingBranch: true,
																		otherBranches: [],
																	},
																});
															} else if (!enabled && isEnabled) {
																qG.linkedRepositories = qG.linkedRepositories.filter((r) => r.repoId !== repo._id);
															}
														});
													}}
													title={createRepositoryName(repo, true)}
												>
													<FormGroup style={{ pointerEvents: "none" }}>
														<FormControlLabel
															control={(
																<MuiCheckBox
																	disabled={isPreviewMode || !isEnabled}
																	style={{ pointerEvents: "auto" }}
																	checked={!!lrBranches?.isProductionBranch}
																	onChange={(_, newValue) => {
																		setQualityGate((prev) => ({
																			...prev,
																			linkedRepositories: prev.linkedRepositories.map((lr) => (lr.repoId === repo._id
																				? {
																					...lr,
																					branches: {
																						...lr.branches,
																						isProductionBranch: newValue,
																					},
																				}
																				: lr)),
																		}));
																	}}
																/>
															)}
															label="Production Branch"
														/>
														<FormControlLabel
															control={(
																<MuiCheckBox
																	disabled={isPreviewMode || !isEnabled}
																	style={{ pointerEvents: "auto" }}
																	checked={!!lrBranches?.isStagingBranch}
																	onChange={(_, newValue) => {
																		setQualityGate((prev) => ({
																			...prev,
																			linkedRepositories: prev.linkedRepositories.map((lr) => (lr.repoId === repo._id
																				? {
																					...lr,
																					branches: {
																						...lr.branches,
																						isStagingBranch: newValue,
																					},
																				}
																				: lr)),
																		}));
																	}}
																/>
															)}
															label="Staging Branch"
														/>
													</FormGroup>
													<Grid container alignItems="center">
														<Grid item xs={12} sm={3} textAlign="left">
															{"Other Branches:"}
														</Grid>
														<Grid item xs={12} sm={9}>
															<Autocomplete
																multiple
																disablePortal
																disableCloseOnSelect
																disabled={isPreviewMode || !isEnabled}
																size="small"
																id="selected-branches"
																value={lrBranches?.otherBranches || []}
																options={repo.branches
																	.filter((branch) => ![repo.stagingBranch, repo.productionBranch].includes(branch))}
																renderOption={(props, option, { selected }) => (
																	<li {...props}>
																		<MuiCheckBox
																			icon={icon}
																			checkedIcon={checkedIcon}
																			style={{ marginRight: "1rem" }}
																			checked={selected}
																		/>
																		{option}
																	</li>
																)}
																renderInput={(params) => (
																	<TextField {...params} color="secondary" placeholder="Apply in branches..." />
																)}
																onChange={(_, newValue) => {
																	setQualityGate((prev) => ({
																		...prev,
																		linkedRepositories: prev.linkedRepositories.map((lr) => (lr.repoId === repo._id
																			? {
																				...lr,
																				branches: {
																					...lr.branches,
																					otherBranches: newValue,
																				},
																			}
																			: lr)),
																	}));
																}}
															/>
														</Grid>
													</Grid>
												</RepositoryAccordion>
											);
										})}
									</Grid>
								</Grid>
							</Grid>
						</>
					) : null
				}
				<Grid container spacing={2} alignItems="flex-start" marginTop="2rem" marginBottom="2rem">
					<Grid item xs={12} sm={3} textAlign="right" color={theme.palette.primary.main} fontWeight="bold">
						{"Conditions:"}
					</Grid>
					<Grid item xs={12} sm={9}>
						<Grid item sx={{ marginBottom: "1rem" }} color={theme.palette.primary.main}>
							{"Select Condition"}
						</Grid>
						<Grid container spacing={1} />
						<Box sx={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
							<Autocomplete
								disablePortal
								disabled={isPreviewMode}
								size="small"
								renderInput={(params) => <TextField {...params} color="secondary" placeholder="Add a metric..." />}
								sx={{ width: "30%" }}
								id="metric-labels"
								options={availableMetricOptions}
								groupBy={(option) => option.category}
								getOptionLabel={(option) => option.title ?? option}
								value={conditionMetric}
								onChange={(_, newValue) => {
									setConditionMetric(newValue);
									setConditionOperator(null);
									setConditionThreshold(null);
								}}
							/>
							<Autocomplete
								disablePortal
								disabled={!conditionMetric || isPreviewMode}
								size="small"
								renderInput={(params) => <TextField {...params} color="secondary" placeholder="Add an operator..." />}
								sx={{ ml: 1, width: "30%" }}
								id="operator-labels"
								options={QualityGates.operatorOptions}
								getOptionLabel={(option) => option.label ?? option}
								value={conditionOperator}
								onChange={(_, newValue) => {
									setConditionOperator(newValue);
									setConditionThreshold(null);
								}}
							/>
							{conditionMetric?.category === "Characteristics" ? (
								<Autocomplete
									disablePortal
									disabled={!conditionMetric || !conditionOperator || isPreviewMode}
									size="small"
									renderInput={(params) => <TextField {...params} color="secondary" placeholder="Add a threshold..." />}
									sx={{ ml: 1, width: "30%" }}
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
									disabled={!conditionMetric || !conditionOperator || isPreviewMode}
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

										const newValue = conditionMetric?.isInteger ? Number.parseInt(value, 10) : Number.parseFloat(value);

										setConditionThreshold(newValue);
									}}
								/>
							)}
							<Button
								disabled={addIsDisabled || isPreviewMode}
								variant="outlined"
								color="secondary"
								sx={{ ml: 1, fontWeight: "bold", borderWidth: 2, borderColor: "secondary.main" }}
								onClick={() => {
									setQualityGate((p) => {
										p.conditions.push({
										// metric: metric.value,
											metric: conditionMetric.metric,
											operator: conditionOperator.value,
											threshold: conditionThreshold?.value || Number.parseFloat(conditionThreshold) });
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
							noRowsLabel="No conditions added yet."
							initialState={{ pagination: { paginationModel: { page: 0, pageSize: 100 } } }}
							rows={rows}
							columns={tableColumns}
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
					</Grid>
				</Grid>
				{!isProject && (
					<>
						<Grid container alignItems="flex-start" marginTop="2rem" marginBottom="2rem">
							<Grid item xs={12} sm={3} textAlign="right" color={theme.palette.primary.main} fontWeight="bold" paddingTop="1rem" paddingLeft="1rem">
								{"Template:"}
							</Grid>
							<Grid item xs={12} sm={9} sx={{ pl: "1rem", pt: "0.5rem" }}>
								<Switch
									disabled
									id="checkbox_switch"
									checked={isTemplate}
									onChange={(event) => {
										setQualityGate((p) => { p.isTemplate = event.target.checked; });
									}}
								/>
							</Grid>
						</Grid>
						{ !qualityGate?.isTemplate && (
							<Grid container alignItems="flex-start" marginTop="2rem" marginBottom="2rem">
								<Grid item xs={12} sm={3} textAlign="right" color={theme.palette.primary.main} fontWeight="bold" pt="1rem" pl="1rem">
									{"Branches:"}
								</Grid>
								<Grid item xs={12} sm={9} sx={{ pl: "1rem", pt: "0.5rem" }}>
									<FormGroup row style={{ pointerEvents: "none" }}>
										<FormControlLabel
											control={(
												<MuiCheckBox
													disabled={isPreviewMode}
													style={{ pointerEvents: "auto" }}
													checked={qualityGate.branches?.includes("productionBranch")}
													onChange={(e) => {
														const isChecked = e.target.checked;
														const rawBranches = qualityGate?.branches || [];
														const cleanedBranches = rawBranches.filter((branch) => branch !== "all");

														const updatedBranches = isChecked
															? [...new Set([...cleanedBranches, "productionBranch"])]
															: cleanedBranches.filter((branch) => branch !== "productionBranch");
														setQualityGate((prev) => ({
															...prev,
															branches: updatedBranches,
														}));
													}}
												/>
											)}
											label="Production Branch"
										/>
										<FormControlLabel
											control={(
												<MuiCheckBox
													disabled={isPreviewMode}
													style={{ pointerEvents: "auto" }}
													checked={qualityGate.branches?.includes("stagingBranch")}
													onChange={(e) => {
														const isChecked = e.target.checked;
														const rawBranches = qualityGate?.branches || [];
														const cleanedBranches = rawBranches.filter((branch) => branch !== "all");

														const updatedBranches = isChecked
															? [...new Set([...cleanedBranches, "stagingBranch"])]
															: cleanedBranches.filter((branch) => branch !== "stagingBranch");
														setQualityGate((prev) => ({
															...prev,
															branches: updatedBranches,
														}));
													}}
												/>
											)}
											label="Staging Branch"
										/>
										<FormControlLabel
											control={(
												<MuiCheckBox
													disabled={isPreviewMode}
													style={{ pointerEvents: "auto" }}
													checked={qualityGate.branches?.at(0) === "all"}
													onChange={(e) => {
														const isChecked = e.target.checked;
														const newBranches = isChecked ? ["all"] : [];
														setQualityGate((prev) => ({
															...prev,
															branches: newBranches,
														}));
													}}
												/>
											)}
											label="All branches"
										/>
									</FormGroup>
								</Grid>
							</Grid>
						)}
					</>
				)}
				<Grid container direction="row" justifyContent="flex-end" alignItems="center" sx={{ "> .MuiGrid-item": { p: 1 } }}>
					<Stack
						direction="row"
						justifyContent="center"
						alignItems="center"
						spacing={2}
					>
						<Button
							variant="outlined"
							size="medium"
							type="button"
							disabled={resetIsDisabled || isPreviewMode}
							onClick={() => {
								if (isProject) {
									if (isExistingQualityGate) {
										setQualityGate(qualityGateInput);
									} else {
										setQualityGate((p) => { Object.assign(p, { ...p, name: "", conditions: [], references: [] }); });
										setTemplateOption(null);
									}
								} else if (isExistingQualityGate) {
									setQualityGate(qualityGateInput);
								} else {
									setQualityGate((p) => { Object.assign(p, { ...p, name: "", conditions: [], references: [], isTemplate }); });
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
							disabled={doneIsDisabled || isPreviewMode}
							onClick={(e) => {
								if (isExistingQualityGate) {
									submitUpdateQualityGate(e, qualityGate, executeQualityGate);
								} else {
									submitCreateQualityGate(e);
								}
							}}
						>
							{isSubmitting
								? (<CircularProgress size={24} sx={{ color: "common.white" }} />)
								: "Done"}
						</Button>
					</Stack>
				</Grid>
			</form>
		</Root>

	);
};

QualityGateForm.propTypes = {
	qualityGateInput: PropTypes.object,
	project: PropTypes.object,
	organization: PropTypes.object,
	isLoading: PropTypes.bool,
	isPreviewMode: PropTypes.bool,
	isUpdating: PropTypes.bool,
	isSubmitting: PropTypes.bool,
	setCurrentQualityGates: PropTypes.func,
	setOpen: PropTypes.func,
	setIsUpdating: PropTypes.func,
	setIsSubmitting: PropTypes.func,
	setIsCloseModalDisabled: PropTypes.func,
	mutateQualityGates: PropTypes.func,
};

export default memo(QualityGateForm);
