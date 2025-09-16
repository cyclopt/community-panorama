import { useState, useEffect, memo, useMemo } from "react";
import { getGridBooleanOperators } from "@mui/x-data-grid";
import { styled, useTheme } from "@mui/material/styles";
import PropTypes from "prop-types";
import {
	Grid,
	Typography,
	Button,
	ToggleButtonGroup,
	ToggleButton,
	Tooltip,
	Dialog,
	DialogTitle,
	DialogContent,
	Zoom,
	DialogContentText,
	DialogActions,
	Box,
	LinearProgress,
}
	from "@mui/material";
import { Delete, Add, Edit, ToggleOn, ToggleOff, Check, Visibility } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { useParams, useLocation, Link, useNavigate, Navigate } from "react-router-dom";
import queryString from "query-string";

import { useSnackbar } from "../../utils/index.js";
import DataTable from "../../components/DataTable.jsx";
import QualityGateEditor from "../../components/QualityGateEditor.jsx";
import Pulse from "../../components/Pulse.jsx";
import ConditionalTooltip from "../../components/ConditionalTooltip.jsx";

import { deleteTeamQualityGate, updateOrganizationQualityGate, useOrganizationQualityGates } from "#api";

const classes = {
	label: "OrganizationInfoQualitygates-label",
	list: "OrganizationInfoQualitygates-list",
	dangerButton: "OrganizationInfoQualitygates-dangerButton",
};

const Root = styled("div")(({ theme }) => ({
	[`& .${classes.label}`]: {
		color: theme.palette.primary.main,
	},
	[`& .${classes.list}`]: {
		paddingTop: theme.spacing(1),
		borderWidth: theme.spacing(0.2),
		borderStyle: "solid",
		borderColor: theme.palette.primary.main,
		borderRadius: theme.shape.borderRadius,
		justifyContent: "center",
	},
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

// NOTE: pass current organizations data to add-team
const QualityGatesInfo = (props) => {
	const { organization: org } = props;
	const { state, search, pathname } = useLocation();
	const { organizationid } = useParams();
	const navigate = useNavigate();
	const { success, error } = useSnackbar();
	const [openQualityGateModal, setOpenQualityGateModal] = useState(false);
	const [isPreviewMode, setIsPreviewMode] = useState(false);
	const [currentSelectedQualityGate, setCurrentSelectedQualityGate] = useState({});
	const [currentQualityGates, setCurrentQualityGates] = useState(state?.currentQGs ?? []);
	const [filterModel, setFilterModel] = useState({ items: [], quickFilterValues: [] });
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingChanges, setIsLoadingChanges] = useState(true);
	const [isDeleting, setIsDeleting] = useState(false);
	const [openDelete, setOpenDelete] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);

	const {
		qualityGates: orgQualityGates,
		isLoading: isLoadingOrgQualityGates,
		isError: isErrorOrgQualityGates,
		mutate: mutateOrgQualityGates,
	} = useOrganizationQualityGates(organizationid);

	const theme = useTheme();

	// This useEffect is used to fetch the running state of Quality Gate
	useEffect(() => {
		let intervalId;
		const fetchData = async () => { setIsLoadingChanges(true); await mutateOrgQualityGates(); setIsLoadingChanges(false); };
		setInterval(fetchData, 10_000);
		return () => clearInterval(intervalId);
	}, [mutateOrgQualityGates]);

	useEffect(() => {
		if (!isLoadingOrgQualityGates) {
			// set current quality gates only if not provided from other component
			if (!state?.currentQGs) setCurrentQualityGates(orgQualityGates);
			setIsLoading(false);
		}
	}, [currentQualityGates?.length, isLoadingOrgQualityGates, orgQualityGates, setIsLoading, state?.currentQGs]);

	useEffect(() => {
		if (isErrorOrgQualityGates) error();
	}, [error, isErrorOrgQualityGates]);

	useEffect(() => {
		const parsed = queryString.parse(search);

		// Wait until gates are fully loaded before proceeding (current quality gates have been set)
		if (isLoading) return;

		const idExists = currentQualityGates.find((prQG) => prQG._id === parsed.id);

		if (parsed.id) {
			if (!idExists) {
				delete parsed.id;
				const newSearch = queryString.stringify(parsed);
				navigate(`${pathname}?${newSearch}`, { replace: true });
			} else if (!openQualityGateModal && currentQualityGates.length > 0) {
				// If ID exists, open the modal and select the gate
				setCurrentSelectedQualityGate(() => currentQualityGates.find((qG) => qG._id === parsed.id));
				setIsPreviewMode(true);
				setOpenQualityGateModal(true);
			}
		} else if (parsed.mode) {
			setOpenQualityGateModal(true);
			if (parsed.mode === "preview") {
				setIsPreviewMode(true);
			} else {
				setIsPreviewMode(false);
			}
		} else {
			setOpenQualityGateModal(false);
		}
	}, [openQualityGateModal, currentQualityGates, search, isLoadingOrgQualityGates, navigate, pathname, isLoading]);

	const submitUpdateQualityGate = async (e, qG, shouldExecuteQualityGate) => {
		e.preventDefault();
		setIsUpdating(true);
		try {
			const qualityGate = await updateOrganizationQualityGate(organizationid, qG._id, qG, shouldExecuteQualityGate);
			setCurrentQualityGates((prevQualityGates) => {
				const index = prevQualityGates.findIndex((gate) => gate._id === qG._id);
				const updatedQualityGates = [...prevQualityGates];
				updatedQualityGates[index] = qualityGate;
				return updatedQualityGates;
			});
			success(`Quality Gate: ${qualityGate.name} has been updated!`);
		} catch (error_) {
			const errorMsg = await error_.response.text() ?? "Oops, something went wrong ";
			error(errorMsg);
			setIsUpdating(false);
		}
	};

	const submitDeleteQualityGate = async (e, qId) => {
		e.preventDefault();
		setIsDeleting(true);
		try {
			const qualityGate = await deleteTeamQualityGate(organizationid, qId);
			mutateOrgQualityGates();
			setOpenDelete(false);
			success(`Quality Gate ${qualityGate.name}: has been deleted!`);
			setIsDeleting(false);
		} catch (error_) {
			const errorMsg = await error_.response.text() ?? "Oops, something went wrong ";
			error(errorMsg);
			setIsDeleting(false);
		}
	};

	const qualityGatesTableColumns = useMemo(() => [
		{
			field: "Is Active",
			width: 150,
			filterOperators: getGridBooleanOperators(),
			valueGetter: ({ row }) => row.isActive,
			renderCell: ({ row }) => (
				<Grid>
					{row.isActive ? (
						<Box sx={{ display: "flex", alignItems: "center" }}><Pulse isRunning={row?.isRunning} /></Box>
					) : null }
				</Grid>
			),
		},
		{
			field: "Quality Gate",
			minWidth: 500,
			flex: 1,
			align: "left",
			valueGetter: ({ row }) => row.name,
			renderCell: ({ row }) => (
				<Box sx={{ textAlign: "left", width: "100%", fontSize: "medium", cursor: "pointer" }}>
					<Tooltip title="Preview Quality Gate">
						<Typography
							sx={{ display: "inline" }}
							onClick={() => {
								setCurrentSelectedQualityGate(() => currentQualityGates.find((qG) => qG._id === row._id));
								setIsPreviewMode(true);
								setOpenQualityGateModal(true);
								const parsed = queryString.parse(search);
								const updatedQuery = {
									...parsed,
									mode: "preview",
								};
								navigate(queryString.stringifyUrl({ url: pathname, query: updatedQuery }, { replace: true }));
							}}
						>
							{row.name}
						</Typography>
					</Tooltip>
				</Box>
			),
		},
		{
			field: "Is Template",
			width: 150,
			filterOperators: getGridBooleanOperators(),
			valueGetter: ({ row }) => row?.isTemplate,
			renderCell: ({ value }) => (
				<Grid>
					{value ? (
						<Box sx={{ display: "flex", alignItems: "center" }}><Check /></Box>
					) : null }
				</Grid>
			),
		},
		{
			field: "Actions",
			disableExport: true,
			sortable: false,
			filterable: false,
			width: 200,
			valueGetter: ({ row }) => {
				const isDisabled = isUpdating;
				let tooltipMessage = "";
				if (!row.isActive) {
					tooltipMessage = "Only active Quality Gates can be edited!";
				} else if (isUpdating) {
					tooltipMessage = "Please wait, update in progress...";
				}

				return {
					qualityGateId: row._id,
					isActive: row.isActive,
					isTemplate: row.isTemplate,
					isDisabled,
					tooltipMessage,
				};
			},
			renderCell: ({ value }) => (
				<ToggleButtonGroup key={value.qualityGateId} exclusive size="small" aria-label="actions">
					<ConditionalTooltip condition={isUpdating} title={value.tooltipMessage}>
						<ToggleButton
							value="Preview Quality Gate"
							title="Preview Quality Gate"
							aria-label="Preview Quality Gate"
							disabled={isUpdating}
							onClick={() => {
								setCurrentSelectedQualityGate(() => currentQualityGates.find((qG) => qG._id === value.qualityGateId));
								setIsPreviewMode(true);
								setOpenQualityGateModal(true);
								const parsed = queryString.parse(search);
								const updatedQuery = {
									...parsed,
									mode: "preview",
								};
								navigate(queryString.stringifyUrl({ url: pathname, query: updatedQuery }, { replace: true }));
							}}
						>
							<Visibility />
						</ToggleButton>
					</ConditionalTooltip>
					<ConditionalTooltip condition={value.isDisabled || (!value.isActive && !value.isTemplate)} title={value.tooltipMessage}>
						<ToggleButton
							value="Edit Quality Gate"
							title="Edit Quality Gate"
							aria-label="Edit Quality Gate"
							disabled={value.isDisabled || (!value.isActive && !value.isTemplate)}
							onClick={() => {
								setCurrentSelectedQualityGate(() => currentQualityGates.find((qG) => qG._id === value.qualityGateId));
								setIsPreviewMode(false);
								setOpenQualityGateModal(true);
								const parsed = queryString.parse(search);
								const updatedQuery = {
									...parsed,
									mode: "edit",
								};
								navigate(queryString.stringifyUrl({ url: pathname, query: updatedQuery }, { replace: true }));
							}}
						>
							<Edit />
						</ToggleButton>
					</ConditionalTooltip>
					{
						!value?.isTemplate && value.isActive && (
							<ConditionalTooltip condition={value.isDisabled} title={value.tooltipMessage.replaceAll(/edited/gi, "disabled").replaceAll(/edit/gi, "disable")}>
								<ToggleButton
									value="Disable Quality Gate"
									title="Disable Quality Gate"
									aria-label="Disable Quality Gate"
									disabled={value.isDisabled}
									onClick={async (e) => {
										try {
											setIsUpdating(true);
											let qualityGateToBeUpdated = currentQualityGates.find((qG) => qG._id === value.qualityGateId);
											qualityGateToBeUpdated = { ...qualityGateToBeUpdated, isActive: !qualityGateToBeUpdated.isActive };
											await submitUpdateQualityGate(e, qualityGateToBeUpdated, false);
											setIsUpdating(false);
										} catch {
											error();
											setIsUpdating(false);
										}
									}}
								>
									<ToggleOn style={{ color: theme.palette.secondary.main }} />
								</ToggleButton>
							</ConditionalTooltip>
						)
					}
					{
						!value?.isTemplate && !value.isActive && (
							<ConditionalTooltip condition={value.isDisabled} title={value.tooltipMessage.replaceAll(/edited/gi, "enabled").replaceAll(/edit/gi, "enable")}>
								<ToggleButton
									value="Enable Quality Gate"
									title="Enable Quality Gate"
									aria-label="Enable Quality Gate"
									disabled={value.isDisabled}
									onClick={async (e) => {
										try {
											setIsUpdating(true);
											let qualityGateToBeUpdated = currentQualityGates.find((qG) => qG._id === value.qualityGateId);
											qualityGateToBeUpdated = { ...qualityGateToBeUpdated, isActive: !qualityGateToBeUpdated.isActive };
											await submitUpdateQualityGate(e, qualityGateToBeUpdated, false);
											setIsUpdating(false);
										} catch {
											error();
											setIsUpdating(false);
										}
									}}
								>
									<ToggleOff />
								</ToggleButton>
							</ConditionalTooltip>
						)
					}
					<ConditionalTooltip condition={value.isDisabled} title={value.tooltipMessage.replaceAll(/edited/gi, "deleted").replaceAll(/edit/gi, "delete")}>
						<ToggleButton
							value="Delete Quality Gate"
							title="Delete Quality Gate"
							aria-label="Delete Quality Gate"
							disabled={value.isDisabled}
							onClick={() => {
								setCurrentSelectedQualityGate(() => currentQualityGates.find((qG) => qG._id === value.qualityGateId));
								setOpenDelete(true);
							}}
						>
							<Delete />
						</ToggleButton>
					</ConditionalTooltip>
				</ToggleButtonGroup>
			),
		},
	// eslint-disable-next-line react-hooks/exhaustive-deps
	], [currentQualityGates, error, isUpdating, navigate, pathname, search, theme.palette.secondary.main]);

	if (!org._id) return (<LinearProgress color="primary" />);

	if (!org.showCycloptGuard) return <Navigate replace to={`/organizations/${org._id}`} />;

	return (
		<Root>
			<section>
				<div className="container">
					{isLoadingOrgQualityGates ? (
						<Grid container justifyContent="center" align="center" direction="column">
							<Grid item>
								<Typography gutterBottom variant="h5" color="primary">{"Loading your Quality Gates. Please don’t close this window!"}</Typography>
							</Grid>
							<Grid item><LinearProgress color="primary" /></Grid>
						</Grid>
					) : (
						<Grid container sx={{ display: "flex" }}>
							<Grid container direction="column" justifyContent="center">
								<Grid container sx={{ display: "flex", justifyContent: "flex-end", mb: "0.5rem" }}>
									<Grid item>
										<Button
											disabled={isUpdating}
											component={Link}
											to={`/organizations/${org._id}/quality-gates/add-quality-gate`}
											state={{ isTemplate: false }}
											variant="contained"
											size="medium"
											sx={{ ":hover": { color: "common.white" }, color: "common.white", margin: "0.5rem" }}
											color="pink"
											startIcon={<Add />}
										>
											{"ADD GENERAL"}
										</Button>
									</Grid>
									<Grid item>
										<Button
											disabled={isUpdating}
											component={Link}
											to={`/organizations/${org._id}/quality-gates/add-quality-gate`}
											state={{ isTemplate: true }}
											variant="contained"
											size="medium"
											sx={{ ":hover": { color: "common.white" }, color: "common.white", margin: "0.5rem" }}
											color="pink"
											startIcon={<Add />}
										>
											{"ADD TEMPLATE"}
										</Button>
									</Grid>
								</Grid>
								<Grid item width="100%">
									<DataTable
										addFilterButton
										tableName="organizationQualityGatesTable"
										noRowsLabel="No quality gates set yet!"
										filterModel={filterModel}
										rows={currentQualityGates}
										columns={qualityGatesTableColumns}
										getRowId={(e) => e.name}
										initialState={{ sorting: { sortModel: [{ field: "isActive", sort: "desc" }] }, pagination: { paginationModel: { page: 0 } } }}
										isLoading={isUpdating || isLoadingChanges || isLoading || isLoadingOrgQualityGates}
										onFilterModelChange={(newFilterModel) => setFilterModel(newFilterModel)}
									/>
								</Grid>
							</Grid>
						</Grid>
					)}
				</div>
			</section>
			<QualityGateEditor
				open={openQualityGateModal}
				setOpen={(val) => setOpenQualityGateModal(val)}
				isPreviewMode={isPreviewMode}
				qualityGateInput={currentSelectedQualityGate}
				setCurrentQualityGates={setCurrentQualityGates}
				setCurrentSelectedQualityGate={setCurrentSelectedQualityGate}
				mutateOrgQGs={mutateOrgQualityGates}
			/>
			<Dialog
				keepMounted
				open={openDelete}
				TransitionComponent={Zoom}
				onClose={() => !isDeleting && setOpenDelete(false)}
			>
				<DialogTitle>
					{`Delete Quality Gate ${currentSelectedQualityGate?.name}?`}
				</DialogTitle>
				<DialogContent dividers>
					<DialogContentText>
						{"Deleting this quality gate will result in permanent data loss."}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<LoadingButton
						autoFocus
						startIcon={<Delete />}
						loading={isDeleting}
						loadingPosition="start"
						variant="contained"
						onClick={async (e) => {
							await submitDeleteQualityGate(e, currentSelectedQualityGate?._id);
							setCurrentSelectedQualityGate({});
						}}
					>
						{"Delete"}
					</LoadingButton>
					<Button variant="outlined" disabled={isDeleting} onClick={() => setOpenDelete(false)}>{"Cancel"}</Button>
				</DialogActions>
			</Dialog>
		</Root>
	);
};

QualityGatesInfo.propTypes = {
	organization: PropTypes.object,
};

export default memo(QualityGatesInfo);
