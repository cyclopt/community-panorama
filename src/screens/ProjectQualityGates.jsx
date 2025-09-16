import { useState, memo, useEffect, useMemo, useCallback } from "react";
import { styled, useTheme } from "@mui/material/styles";
import { getGridBooleanOperators } from "@mui/x-data-grid";
import { useNavigate, useParams, useLocation, Link, Navigate } from "react-router-dom";
import {
	Tabs, Tab,
	Grid,
	Typography,
	Box,
	Tooltip,
	Chip,
	Button,
	LinearProgress,
	ToggleButtonGroup, ToggleButton,
	Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
	Zoom,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Add, Edit, ToggleOn, ToggleOff, Delete, Visibility } from "@mui/icons-material";
import { stringAToZInsensitive } from "@iamnapo/sort";
import { shallow } from "zustand/shallow";
import queryString from "query-string";

import useGlobalState from "../use-global-state.js";
import { useSnackbar, jwt, createRepositoryName } from "../utils/index.js";
import QualityGateStatus from "../components/QualityGateStatus.jsx";
import QualityGateEditor from "../components/QualityGateEditor.jsx";
import DataTable from "../components/DataTable.jsx";
import Pulse from "../components/Pulse.jsx";
import ConditionalTooltip from "../components/ConditionalTooltip.jsx";
import { PinkBackgroundButton } from "../components/Buttons.jsx";

import { useProject,
	updateTeamProjectQualityGate, updatePersonalProjectQualityGate,
	useProjectQualityGates, useOrganizationRunAllQualityGates,
	deleteTeamQualityGate, deletePersonalQualityGate } from "#api";

const classes = {
	label: "ProjectQualityGates-label",
};

const Root = styled("div")(({ theme }) => ({
	[`& .${classes.label}`]: {
		color: theme.palette.primary.main,
	},
}));

const ProjectQualityGates = () => {
	const { pathname, search, state } = useLocation();
	const theme = useTheme();
	const { projectid } = useParams();
	const navigate = useNavigate();
	const { setName } = useGlobalState(useCallback((e) => ({
		setName: e.setName,
	}), []), shallow);
	const { tab: tab_ } = queryString.parse(search);
	const [tab, setTab] = useState(Number.parseInt(tab_, 10));
	const { error, success } = useSnackbar();

	const [openQualityGateModal, setOpenQualityGateModal] = useState(false);
	const [isPreviewMode, setIsPreviewMode] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [openDelete, setOpenDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	// state variable that is updated when projectQGs and orgQualityGates states are set
	const [isLoadingQualityGates, setIsLoadingQualityGates] = useState(true);
	const [isLoadingChanges, setIsLoadingChanges] = useState(true);
	const [currentQualityGates, setCurrentQualityGates] = useState(state?.currentQGs ?? []);
	const [currentSelectedQualityGate, setCurrentSelectedQualityGate] = useState({});
	const [filterModel, setFilterModel] = useState({ items: [], quickFilterValues: [] });

	const { username: viewer, type = "github" } = useMemo(() => jwt.decode(), []);

	const { project = {}, isLoading: isLoadingProject, isError } = useProject(projectid);
	const { prQualityGates = [],
		isLoading: isLoadingProjectQGs,
		isError: isErrorProjectQGs,
		mutate: mutateProjectQGs } = useProjectQualityGates(project?.parentOrganization?._id,
		project?._id,
		!isLoadingProject && !isError);
	const { orgQualityGates = [],
		isLoading: isLoadingOrganizationQGs,
		isError: isErrorOrganizationQGs,
		mutate: mutateOrgQGs } = useOrganizationRunAllQualityGates(project?.parentOrganization?._id, !isLoadingProject && !isError && project.type === "team");

	const viewerIsAdmin = project?.team?.find((e) => e.user.username === viewer)?.role === "admin";

	// This useEffect is used to fetch the running state of Quality Gate
	useEffect(() => {
		let intervalId;
		const fetchData = async () => { setIsLoadingChanges(true); await mutateProjectQGs(); setIsLoadingChanges(false); };
		setInterval(fetchData, 10_000);
		return () => clearInterval(intervalId);
	}, [mutateProjectQGs]);

	// this is used to track the history
	useEffect(() => {
		const parsed = queryString.parse(search);
		// if tab exists in search parameters navigate into the specified tab
		// if it does not exist navigate to overview page
		if (parsed.tab) {
			setTab(Number.parseInt(parsed.tab, 10));
		} else {
			setTab(0);
		}

		if (parsed.mode) {
			setOpenQualityGateModal(true);
			if (parsed.mode === "preview") {
				setIsPreviewMode(true);
			} else {
				setIsPreviewMode(false);
			}
		} else {
			setOpenQualityGateModal(false);
		}
	}, [search]);

	useEffect(() => {
		if (isError || isErrorProjectQGs || isErrorOrganizationQGs) {
			error();
			navigate(`/projects/${projectid}`);
		}
	}, [error, isError, isErrorProjectQGs, isErrorOrganizationQGs, navigate, projectid]);

	useEffect(() => {
		setName(project.name);
	}, [project.name, setName]);

	// This useMemo is used to handle the case of rerenders when no organization quality gates exist in personal project
	const stableCombinedGates = useMemo(
		() => [...prQualityGates, ...orgQualityGates],
		[orgQualityGates, prQualityGates],
	);

	useEffect(() => {
		if (!isLoadingProjectQGs && (project.type === "personal" || !isLoadingOrganizationQGs)) {
			setCurrentQualityGates(stableCombinedGates);
			setIsLoadingQualityGates(false);
		}
	}, [isLoadingOrganizationQGs, isLoadingProjectQGs, stableCombinedGates, project.type]);

	useEffect(() => {
		const parsed = queryString.parse(search);

		// Update open modal state if corresponding state variable is present
		if (state && state.openProjectQualityGateModal) {
			setOpenQualityGateModal(true);
			setCurrentSelectedQualityGate(() => currentQualityGates
				.find((qG) => qG._id === parsed.id));
		} else {
			const idExists = currentQualityGates.find((prQG) => prQG._id === parsed.id);

			if (!idExists && parsed.id) {
				const newSearch = queryString.stringify({ tab: parsed.tab }); // Keep the 'tab' parameter
				// Navigate to the new URL with the updated search parameters
				navigate(`${pathname}?${newSearch}`, { replace: true });
			} else if (!openQualityGateModal && parsed.id && !isLoadingQualityGates && currentQualityGates.length > 0 && idExists) {
				setCurrentSelectedQualityGate(() => currentQualityGates
					.find((qG) => qG._id === parsed.id));
				setOpenQualityGateModal(true);
			}
		}
	}, [isLoadingQualityGates, navigate, openQualityGateModal, pathname, currentQualityGates, search, state]);

	const submitUpdateQualityGate = useCallback(async (e, qG, shouldExecuteQualityGate) => {
		e.preventDefault();
		setIsUpdating(true);
		try {
			const qualityGate_ = await (project?.type === "team"
				? updateTeamProjectQualityGate(project?.parentOrganization?._id, projectid, qG._id, qG, shouldExecuteQualityGate)
				: updatePersonalProjectQualityGate(projectid, qG._id, qG, shouldExecuteQualityGate));
			setCurrentQualityGates((prevQualityGates) => {
				const index = prevQualityGates.findIndex((gate) => gate._id === qG._id);
				const updatedQualityGates = [...prevQualityGates];
				updatedQualityGates[index] = qualityGate_;
				return updatedQualityGates;
			});
			success(`Quality Gate: ${qualityGate_.name} has been updated!`);
			setIsUpdating(false);
		} catch {
			setIsUpdating(false);
			error();
		}
	}, [error, project?.parentOrganization?._id, project?.type, projectid, success]);

	const submitDeleteQualityGate = async (e, qId) => {
		e.preventDefault();
		setIsDeleting(true);
		try {
			const qualityGate_ = await (project?.type === "team" ? deleteTeamQualityGate(project?.parentOrganization?._id, qId) : deletePersonalQualityGate(qId));
			mutateProjectQGs();
			setOpenDelete(false);
			success(`Quality Gate ${qualityGate_.name}: has been deleted!`);
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
			field: "Type",
			width: 250,
			filterable: true,
			valueGetter: ({ row }) => (row.references?.organizations ? "Organization" : "Project"),
			renderCell: ({ value }) => (
				<Grid>
					<Box sx={{ display: "flex", alignItems: "center", fontSize: "medium" }}>{value}</Box>
				</Grid>
			),
		},
		{
			field: "Quality Gate",
			minWidth: 500,
			flex: 1,
			align: "left",
			valueGetter: ({ row }) => row.name,
			renderCell: ({ row }) => {
				const isProjectQualityGate = row?.references?.projects;
				return (
					<Box sx={{ textAlign: "center", width: "100%", fontSize: "medium", cursor: "pointer" }}>
						{
							isProjectQualityGate ? (
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
							) : (
								<Tooltip title="Preview Quality Gate in parent organization">
									<Typography
										sx={{ display: "inline" }}
										onClick={() => {
											const qualityGateSearch = queryString.stringify({ id: row?._id }); // Keep the 'tab' parameter
											navigate(`/organizations/${project.parentOrganization._id}/quality-gates/?${qualityGateSearch}`);
										}}
									>
										{row.name}
									</Typography>
								</Tooltip>
							)
						}

					</Box>
				);
			},
		},
		{
			field: "Linked Repositories",
			width: 250,
			align: "left",
			sortable: false,
			renderCell: ({ row }) => {
				const projectRepositories = project?.linkedRepositories
					.filter((repo) => row.linkedRepositories.map((lr) => lr.repoId.toString()).includes(repo._id.toString()));

				return (
					<Box
						sx={{
							display: "block",
							overflowY: "auto",
							maxHeight: "8rem",
							minHeight: "1.5rem",
							width: "100%",
							alignSelf: "start",
						}}
					>
						<Box display="flex" gap={1} m={1} flexWrap="wrap">
							{projectRepositories.map((repo) => (
								<Chip
									key={repo._id}
									label={createRepositoryName(repo)}
									size="small"
								/>
							))}
						</Box>
					</Box>
				);
			},

		},
		{
			field: "Actions",
			disableExport: true,
			sortable: false,
			filterable: false,
			width: 200,
			valueGetter: ({ row }) => {
				const isOrganizationQualityGate = row?.references?.organizations;
				const isDisabled = isUpdating || !viewerIsAdmin || isOrganizationQualityGate;
				let tooltipMessage = "";
				if (isOrganizationQualityGate) {
					tooltipMessage = "To edit an organization Quality Gate go to Organization Settings!";
				} else if (!viewerIsAdmin) {
					tooltipMessage = "Only admins can edit Quality Gates!";
				} else if (!row.isActive) {
					tooltipMessage = "Only active Quality Gates can be edited!";
				} else if (isUpdating) {
					tooltipMessage = "Please wait, update in progress...";
				}

				return {
					qualityGateId: row._id,
					isActive: row.isActive,
					isOrganizationQualityGate,
					isDisabled,
					tooltipMessage,
				};
			},
			renderCell: ({ value }) => (
				<ToggleButtonGroup key={value.qualityGateId} exclusive size="small" aria-label="actions">
					<ConditionalTooltip condition={isUpdating} title={value.tooltipMessage}>
						<ToggleButton
							value={value.isOrganizationQualityGate ? "Preview Quality Gate in parent organization" : "Preview Quality Gate"}
							title={value.isOrganizationQualityGate ? "Preview Quality Gate in parent organization" : "Preview Quality Gate"}
							aria-label={value.isOrganizationQualityGate ? "Preview Quality Gate in parent organization" : "Preview Quality Gate"}
							disabled={isUpdating}
							onClick={() => {
								if (value.isOrganizationQualityGate) {
									const qualityGateSearch = queryString.stringify({ id: value.qualityGateId }); // Keep the 'tab' parameter
									navigate(`/organizations/${project.parentOrganization._id}/quality-gates/?${qualityGateSearch}`);
								} else {
									setCurrentSelectedQualityGate(() => currentQualityGates.find((qG) => qG._id === value.qualityGateId));
									setIsPreviewMode(true);
									setOpenQualityGateModal(true);
									const parsed = queryString.parse(search);
									const updatedQuery = {
										...parsed,
										mode: "preview",
									};
									navigate(queryString.stringifyUrl({ url: pathname, query: updatedQuery }, { replace: true }));
								}
							}}
						>
							<Visibility />
						</ToggleButton>
					</ConditionalTooltip>
					<ConditionalTooltip condition={value.isDisabled || !value.isActive} title={value.tooltipMessage}>
						<ToggleButton
							value="Edit Quality Gate"
							title="Edit Quality Gate"
							aria-label="Edit Quality Gate"
							disabled={value.isDisabled || !value.isActive}
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
						value.isActive && (
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
						!value.isActive && (
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
			)
			,
		},
	], [search, navigate,
		pathname, currentQualityGates, project.parentOrganization?._id,
		project?.linkedRepositories, isUpdating, viewerIsAdmin,
		theme.palette.secondary.main, error,
	]);

	if (!project._id) return (<LinearProgress color="primary" />);

	if (!project.showCycloptGuard) return <Navigate replace to={`/projects/${project._id}`} />;

	return (
		<Root className="container">
			{isLoadingProject ? (<LinearProgress color="primary" />)
				: (
					<>
						<Grid>
							<Tabs
								value={tab}
								onChange={(_, newVal) => {
									const parsed = queryString.parse(search);
									parsed.tab = newVal;
									setTab(newVal);
									navigate(queryString.stringifyUrl({ url: pathname, query: parsed }, { replace: true }));
								}}
							>
								<Tab label="overview" />
								{project?.linkedRepositories?.length > 0 && <Tab label="status" />}
							</Tabs>
						</Grid>
						<section style={{ paddingTop: "1rem" }}>
							<Grid container sx={{ display: "flex" }}>
								{ tab === 0 && (
									<Grid container direction="column">
										<Grid item width="100%" sx={{ display: "flex", justifyContent: "flex-end", mb: "0.5rem" }}>
											<Tooltip title="Only admins can add Quality Gates!" disableHoverListener={viewerIsAdmin}>
												<span>
													<PinkBackgroundButton
														component={Link}
														disabled={!viewerIsAdmin || isUpdating}
														to="add-quality-gate"
														state={{ isTemplate: false }}
														variant="contained"
														size="medium"
														sx={{ ":hover": { color: "common.white" }, color: "common.white", margin: "0.5rem" }}
														color="pink"
														startIcon={<Add />}
													>
														{"Add Quality Gate"}
													</PinkBackgroundButton>
												</span>
											</Tooltip>
										</Grid>
										<Grid item width="100%">
											<DataTable
												addFilterButton
												tableName="qualityGatesTable"
												noRowsLabel="No quality gates set yet!"
												filterModel={filterModel}
												rows={currentQualityGates}
												columns={qualityGatesTableColumns}
												getRowId={(e) => e.name}
												initialState={{ sorting: { sortModel: [{ field: "Is Active", sort: "desc" }] }, pagination: { paginationModel: { page: 0 } } }}
												isLoading={isUpdating || isLoadingChanges || isLoadingProject || isLoadingQualityGates}
												onFilterModelChange={(newFilterModel) => setFilterModel(newFilterModel)}
											/>
										</Grid>
									</Grid>
								)}
							</Grid>
							{ tab === 1 && (
								<Grid item container direction="row" justifyContent="center" spacing={2}>
									{/* Load the linked Repositories Status if
									i) the project has been loaded,
									ii) the quality gates of this project have been loaded
									iii) the project is personal or the organization quality gates have been loaded */}
									{!isLoadingProject && !isLoadingProjectQGs && (project.type === "personal" || !isLoadingOrganizationQGs) && (
										[...(project.linkedRepositories || [])].sort(stringAToZInsensitive((v) => `${v.owner}/${v.name}`)).map((repo, ind) => (
											<Grid key={`repo_card_${ind}_${repo._id}`} item sm={12} md={6} lg={6} xl={6}>
												<QualityGateStatus
													pId={project._id}
													orgId={project?.parentOrganization?._id}
													qualityGates={[
														...currentQualityGates
															.filter((qualityGate) => qualityGate.references.projects
																	&& qualityGate?.linkedRepositories?.map((lr) => lr.repoId).includes(repo._id)
																	&& qualityGate?.isActive),
														...currentQualityGates.filter((qualityGate) => qualityGate.references.organizations
																&& qualityGate?.isActive)]}
													repo={repo}
													type={type}
													failedQualityGate={(state && state.failedQualityGates)
														? state.failedQualityGates.find((qG) => qG.repoId === repo._id) : null}
												/>
											</Grid>
										))
									)}
								</Grid>
							)}
						</section>
						<QualityGateEditor
							open={openQualityGateModal}
							setOpen={(val) => setOpenQualityGateModal(val)}
							isPreviewMode={isPreviewMode}
							qualityGateInput={currentSelectedQualityGate}
							setCurrentQualityGates={setCurrentQualityGates}
							setCurrentSelectedQualityGate={setCurrentSelectedQualityGate}
							mutateOrgQGs={mutateOrgQGs}
							mutateProjectQGs={mutateProjectQGs}
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
					</>
				)}
		</Root>
	);
};

export default memo(ProjectQualityGates);
