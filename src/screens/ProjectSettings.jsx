import { useState, useCallback, useEffect, memo, useMemo } from "react";
import { mutate } from "swr";
import { styled, useTheme } from "@mui/material/styles";
import {
	Tabs,
	Tab,
	Typography,
	LinearProgress,
	Grid,
	Button,
	ButtonGroup,
	Switch,
	TextField,
	IconButton,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Zoom,
	Input,
	Autocomplete,
	Chip,
	Box,
	Link as MaterialLink,
} from "@mui/material";
import clsx from "clsx";
import copy from "copy-text-to-clipboard";
import constructUrl from "@iamnapo/construct-url";
import { useNavigate, useParams } from "react-router-dom";
import { ContentPaste, Delete, Sync, DirectionsRun, Edit } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Image } from "mui-image";

import useGlobalState from "../use-global-state.js";
import Card from "../components/Card.jsx";
import UpdateProject from "../components/UpdateProject.jsx";
import { capitalize, jwt, useDocumentTitle, useSnackbar } from "../utils/index.js";
import api, { deleteProject, useProject, useProjectIntegrations, leaveProject, useProjectSystemChecks, updateSystemCheck } from "../api/index.js";
import Tooltip from "../components/Tooltip.jsx";
import SystemCheckModal from "../components/SystemCheckModal.jsx";

const classes = {
	label: "ProjectSettings-label",
	ellipsis: "ProjectSettings-ellipsis",
	dangerButton: "TeamInfoSettings-dangerButton",
	editButton: "SystemChecksSettings-editButton",
};

const Root = styled("div")(({ theme }) => ({
	[`& .${classes.label}`]: {
		color: theme.palette.primary.main,
	},
	[`& .${classes.ellipsis}`]: {
		textOverflow: "ellipsis",
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
	[`& .${classes.editButton}`]: {
		color: theme.palette.primary.main,
	},
}));

const ProjectSettings = () => {
	const { id, type = "github" } = useMemo(() => jwt.decode(), []);
	const { projectid } = useParams();
	const navigate = useNavigate();
	const [tab, setTab] = useState(0);
	const [copied, setCopied] = useState(false);
	const setName = useGlobalState(useCallback((e) => e.setName, []));
	const { project = {}, isError } = useProject(projectid, true);
	const { integrations = [], isError: isError2, mutate: mutateIntegrations } = useProjectIntegrations(projectid);
	const {
		projectSystemChecks = [],
		isError: isErrorSystemChecks,
		isLoading: isLoadingSystemChecks,
		mutate: mutateSystemChecks,
	} = useProjectSystemChecks(projectid);
	const [openSystemCheckModal, setOpenSystemCheckModal] = useState(false);
	const { success, error } = useSnackbar();
	const [isLoading, setIsLoading] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isLeaving, setIsLeaving] = useState(false);
	const [open, setOpen] = useState(false);
	const [leaveOpen, setLeaveOpen] = useState(false);
	// we get the number of team admins
	const theme = useTheme();
	const numberOfAdmins = useMemo(() => project?.team?.filter((member) => member.role === "admin").length, [project?.team]);
	const azureProject = useMemo(() => integrations.azureTasks?.integration?.metadata?.azureProject, [integrations]);
	const azureToken = useMemo(() => integrations.azureTasks?.integration?.metadata?.token, [integrations]);
	const azurePullRequest = useMemo(() => integrations?.azurePullRequests, [integrations]);
	const useReq = useMemo(() => integrations?.useReq, [integrations]);
	const githubTasks = useMemo(() => integrations?.githubTasks, [integrations]);
	const azureTasks = useMemo(() => integrations?.azureTasks, [integrations]);

	useDocumentTitle(project?.name && `${project.name} · Cyclopt`);

	useEffect(() => {
		if (isError || isError2 || isErrorSystemChecks) navigate("/projects");
	}, [navigate, isError, isError2, isErrorSystemChecks]);

	useEffect(() => { setName(project.name); }, [project.name, setName]);

	const vulnerabilitiesSystemChecks = useMemo(() => {
		if (isLoadingSystemChecks) return [];
		return {
			systemChecks: projectSystemChecks.filter((sC) => sC.name.includes("Vulnerabilities")),
			// get the first element of array (they should always be the same)
			isActive: projectSystemChecks.filter((sC) => sC.name.includes("Vulnerabilities")).map((scRes) => scRes.isActive)[0],
		};
	}, [isLoadingSystemChecks, projectSystemChecks]);

	const violationsSystemChecks = useMemo(() => {
		if (isLoadingSystemChecks) return [];
		return {
			systemChecks: projectSystemChecks.filter((sC) => sC.name.includes("Violations")),
			// get the first element of array (they should always be the same)
			isActive: projectSystemChecks.filter((sC) => sC.name.includes("Violations")).map((scRes) => scRes.isActive)[0],
		};
	}, [isLoadingSystemChecks, projectSystemChecks]);

	const characteristicsSystemChecks = useMemo(() => {
		if (isLoadingSystemChecks) return [];
		return {
			systemChecks: projectSystemChecks.filter((sC) => sC.name.includes("Characteristics")),
			// get the first element of array (they should always be the same)
			isActive: projectSystemChecks.filter((sC) => sC.name.includes("Characteristics")).map((scRes) => scRes.isActive)[0],
		};
	}, [isLoadingSystemChecks, projectSystemChecks]);

	// no need to be an array but do this that way for consistency
	const velocitySystemChecks = useMemo(() => {
		if (isLoadingSystemChecks) return [];
		return {
			systemChecks: projectSystemChecks.filter((sC) => sC.name.includes("Velocity")),
			// get the first element of array (they should always be the same)
			isActive: projectSystemChecks.filter((sC) => sC.name.includes("Velocity")).map((scRes) => scRes.isActive)[0],
		};
	}, [isLoadingSystemChecks, projectSystemChecks]);

	const [systemCheckToEdit, setSystemCheckToEdit] = useState(null);

	const submitEnableOrDisableSystemChecks = async (systemCheckIds, target) => {
		try {
			for (const systemCheckId of systemCheckIds) {
				await updateSystemCheck(systemCheckId, { isActive: target });
			}

			success("System Check has been updated!");
		} catch {
			error();
		}
	};

	const submitDeleteProject = async () => {
		try {
			setIsDeleting(true);
			await deleteProject(project._id);

			setOpen(false);
			setIsDeleting(false);
			success(`Project: ${project.name}, has been deleted!`);
			navigate("/projects");
		} catch {
			setIsDeleting(false);
			error();
		}
	};

	const submitLeaveProject = async () => {
		try {
			setIsLeaving(true);
			await leaveProject(project._id);
			setLeaveOpen(false);
			setIsLeaving(false);
			success(`You have left the Project: ${project.name}`);
			navigate("/projects");
		} catch {
			setIsLeaving(false);
			error();
		}
	};

	const badgeUrl = constructUrl(import.meta.env.VITE_MAIN_SERVER_URL, `api/badges/${project._id || ""}`);

	const viewerIsAdmin = project?.team?.find((e) => e.user._id === id)?.role === "admin";

	if (!project._id) return (<LinearProgress color="primary" />);

	return (
		<Root>
			{isLoading && (<LinearProgress color="primary" />)}
			<div className="container">
				<Tabs value={tab} onChange={(_, newVal) => setTab(newVal)}>
					<Tab label="general" value={0} />
					<Tab label="integrations" value={1} />
					<Tab label="system checks" value={2} />
					<Tab label="other" value={3} />
				</Tabs>
			</div>
			<section style={{ paddingTop: "1rem" }}>
				<div className="container">
					<Grid container direction="column">
						<Grid item hidden={tab !== 0}>
							{project._id ? <UpdateProject project={project} /> : null}
						</Grid>
						<Grid item hidden={tab !== 1}>
							<Card title="Integrations">
								<form>
									<div className="field is-horizontal">
										<div className={clsx("label field-label is-normal", classes.label)}>{"useReq:"}</div>
										<div className="field-body is-expanded" style={{ alignItems: "center" }}>
											<Switch disabled={!(viewerIsAdmin && useReq?.subscription)} checked={useReq?.enabled} />
											{useReq?.integration?.key ? (
												viewerIsAdmin ? (
													<>
														<TextField
															disabled
															InputProps={{ inputProps: { className: classes.ellipsis } }}
															size="small"
															sx={{ width: "40%", ml: "1rem" }}
															value={useReq?.integration?.key || ""}
														/>
														<IconButton
															size="small"
															type="button"
															color="secondary"
															sx={{ ml: "1rem" }}
															onClick={() => {
																copy(useReq?.integration?.key);
																success("Copied key to clipboard!");
															}}
														>
															<Tooltip title="Copy to clipboard"><ContentPaste /></Tooltip>
														</IconButton>
													</>
												) : <Typography><em>{"Only Admins can view integration keys."}</em></Typography>
											) : null}
										</div>
									</div>
									<div className="field is-horizontal">
										<div className={clsx("label field-label is-normal", classes.label)}>{"GitHub tasks:"}</div>
										<div className="field-body is-expanded" style={{ alignItems: "center" }}>
											<Switch disabled={!(viewerIsAdmin && githubTasks?.subscription)} checked={githubTasks?.enabled} />
											{githubTasks?.integration?.key ? (
												viewerIsAdmin ? (
													<>
														<TextField
															disabled
															InputProps={{ inputProps: { className: classes.ellipsis } }}
															size="small"
															sx={{ width: "40%", ml: "1rem" }}
															value={githubTasks?.integration?.key || ""}
														/>
														<IconButton
															size="small"
															type="button"
															color="secondary"
															sx={{ ml: "1rem" }}
															onClick={() => {
																copy(githubTasks?.integration?.key);
																success("Copied key to clipboard!");
															}}
														>
															<Tooltip title="Copy to clipboard"><ContentPaste /></Tooltip>
														</IconButton>
													</>
												) : <Typography><em>{"Only Admins can view integration keys."}</em></Typography>
											) : null}
										</div>
									</div>
									<div className="field is-horizontal">
										<div className={clsx("label field-label is-normal", classes.label)}>{"Azure tasks:"}</div>
										<div className="field-body is-expanded" style={{ flexDirection: "column" }}>
											<Box sx={{ display: "flex" }}>
												<Switch disabled={!(viewerIsAdmin && azureTasks?.subscription)} checked={azureTasks?.enabled} />
												{azureTasks?.integration?.key ? (
													viewerIsAdmin ? (
														<>
															<TextField
																disabled
																InputProps={{ inputProps: { className: classes.ellipsis } }}
																size="small"
																sx={{ width: "40%", ml: "1rem" }}
																value={azureTasks?.integration?.key || ""}
															/>
															<IconButton
																size="small"
																type="button"
																color="secondary"
																sx={{ ml: "1rem" }}
																onClick={() => {
																	copy(azureTasks?.integration?.key);
																	success("Copied key to clipboard!");
																}}
															>
																<Tooltip title="Copy to clipboard"><ContentPaste /></Tooltip>
															</IconButton>
														</>
													) : <Typography sx={{ alignSelf: "center" }}><em>{"Only Admins can view integration keys."}</em></Typography>
												) : null}
											</Box>
											<Box>
												{azureTasks?.integration?.key ? (
													<Box sx={{ mt: 3 }}>
														<div className="field">
															<div className="control" style={{ marginBottom: "1rem" }}>
																<div className="field is-horizontal">
																	<div
																		className={clsx("label field-label is-normal", classes.label)}
																		style={{ textAlign: "left", marginRight: 0 }}
																	>
																		{"Project name:"}
																	</div>
																	<div className="field-body is-expanded" style={{ flexGrow: 6 }}>
																		<Input
																			required
																			disableUnderline
																			readOnly
																			className="input"
																			type="text"
																			id="azureProject"
																			placeholder="Project name"
																			value={azureProject || ""}
																			sx={{ width: "25rem !important" }}
																		/>
																	</div>
																</div>
															</div>
															<div className="control" style={{ marginBottom: "1rem" }}>
																<div className="field is-horizontal">
																	<div
																		className={clsx("label field-label is-normal", classes.label)}
																		style={{ textAlign: "left", marginRight: 0 }}
																	>
																		{"Token:"}
																	</div>
																	<div className="field-body is-expanded" style={{ flexGrow: 6 }}>
																		{viewerIsAdmin ? (
																			<Input
																				required
																				disableUnderline
																				readOnly
																				className="input"
																				type="text"
																				id="token"
																				placeholder="Token"
																				value={azureToken || ""}
																				sx={{ width: "25rem !important" }}
																			/>
																		) : <Typography sx={{ alignSelf: "center" }}><em>{"Only Admins can view integration tokens."}</em></Typography>}
																	</div>
																</div>
															</div>
															{Object.keys(azureTasks?.integration?.metadata?.mappings || {}).map((column, ind) => (
																<Box key={`${column}_${ind}`} sx={{ mt: 0.5 }}>
																	<div className="field is-horizontal" style={{ alignItems: "center" }}>
																		<div
																			className={clsx("field-label", classes.label)}
																			style={{ textAlign: "left", marginRight: 0 }}
																		>
																			{`${column}:`}
																		</div>
																		<div className="field-body is-expanded" style={{ flexGrow: 6 }}>
																			<Autocomplete
																				multiple
																				disableClearable
																				readOnly
																				forcePopupIcon={false}
																				size="small"
																				sx={{ width: "25rem !important" }}
																				renderInput={(params) => (<TextField {...params} variant="outlined" />)}
																				id={`${column}_columns`}
																				value={azureTasks?.integration.metadata?.mappings?.[column] || []}
																				options={[
																					...new Set(Object.values(azureTasks?.integration.metadata?.mappings || {}).flat()),
																				]}
																				renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => (
																					<Chip
																						key={`${column}_${option}_${index}`}
																						size="small"
																						label={option}
																						{...getTagProps({ index })}
																						sx={{ opacity: 1 }}
																					/>
																				))}
																				isOptionEqualToValue={(a, b) => (a.title ?? a) === (b.title ?? b)}
																				getOptionLabel={(option) => option.title ?? option}
																			/>
																		</div>
																	</div>
																</Box>
															))}
														</div>
														{viewerIsAdmin ? (
															<LoadingButton
																variant="contained"
																size="medium"
																disabled={!viewerIsAdmin || !azureProject || !azureToken}
																loading={isLoading}
																startIcon={<Sync />}
																onClick={async () => {
																	try {
																		setIsLoading(true);
																		await api.post("api/integrations/azure-tasks/sync-tasks/", { token: azureTasks?.integration?.key });
																		success("Tasks synced.");
																	} catch (error_) {
																		error(`Something went wrong: ${error_.message}`);
																	}

																	setIsLoading(false);
																}}
															>
																{"Sync Tasks"}
															</LoadingButton>
														) : null}
													</Box>
												) : null}
											</Box>
										</div>
									</div>
									<div className="field is-horizontal">
										<div className={clsx("label field-label is-normal", classes.label)}>{"Azure Pull Requests:"}</div>
										<div className="field-body is-expanded" style={{ alignItems: "center" }}>
											<Switch
												disabled={!(viewerIsAdmin && azurePullRequest?.subscription)}
												defaultChecked={azurePullRequest?.enabled}
												onChange={async (e) => {
													await api.put("api/integrations/azure-pull-requests", {
														enable: e.target.checked,
														projectId: projectid,
													});
													mutate(`api/projects/${projectid}/`);
													mutateIntegrations();
												}}
											/>
										</div>
									</div>
									<div className="field is-horizontal">
										<div className="label field-label" />
										<div className="field-body" style={{ justifyContent: "flex-end" }}>
											<Typography variant="body2" sx={{ mt: 1, justifySelf: "flex-end" }}>
												{"To update your subscription "}
												<MaterialLink href="mailto:info@cyclopt.com" underline="none">{"contact us"}</MaterialLink>
												{"."}
											</Typography>
										</div>
									</div>
								</form>
							</Card>
						</Grid>
						<Grid item hidden={tab !== 2}>
							<Card title="System Checks">
								<form>
									<div className={classes.label} style={{ marginBottom: "1rem" }}>{"Select information you would like to monitor:"}</div>
									<div className="field is-horizontal">
										<div className={clsx("label field-label is-normal", classes.label)}>{"Characteristics:"}</div>
										<div className="field-body" style={{ alignItems: "center" }}>
											<div className="field is-grouped is-align-items-center">
												<div className="control">
													<Switch
														disabled={!(viewerIsAdmin) || isLoadingSystemChecks}
														defaultChecked={characteristicsSystemChecks.isActive}
														onChange={async (e) => {
															const isActive = e.target.checked;
															const ids = characteristicsSystemChecks.systemChecks.map((sC) => sC._id);
															await submitEnableOrDisableSystemChecks(ids, isActive);
															mutateSystemChecks();
														}}
													/>
												</div>
												<div className="control">
													<IconButton
														className={classes.editButton}
														onClick={() => {
															const perCommitSystemCheck = characteristicsSystemChecks.systemChecks.find((sC) => sC.timeInterval === "perCommit");
															setSystemCheckToEdit(perCommitSystemCheck);
															setOpenSystemCheckModal(true);
														}}
													>
														<Edit />
													</IconButton>
												</div>
											</div>
										</div>
									</div>
									<div className="field is-horizontal">
										<div className={clsx("label field-label is-normal", classes.label)}>{"Violations:"}</div>
										<div className="field-body" style={{ alignItems: "center" }}>
											<div className="field is-grouped is-align-items-center">
												<div className="control">
													<Switch
														disabled={!(viewerIsAdmin) || isLoadingSystemChecks}
														defaultChecked={violationsSystemChecks.isActive}
														onChange={async (e) => {
															const isActive = e.target.checked;
															const ids = violationsSystemChecks.systemChecks.map((sC) => sC._id);
															await submitEnableOrDisableSystemChecks(ids, isActive);
															mutateSystemChecks();
														}}
													/>
												</div>
												<div className="control">
													<IconButton
														className={classes.editButton}
														onClick={() => {
															const perCommitSystemCheck = violationsSystemChecks.systemChecks.find((sC) => sC.timeInterval === "perCommit");
															setSystemCheckToEdit(perCommitSystemCheck);
															setOpenSystemCheckModal(true);
														}}
													>
														<Edit />
													</IconButton>
												</div>
											</div>
										</div>
									</div>
									<div className="field is-horizontal">
										<div className={clsx("label field-label is-normal", classes.label)}>{"Vulnerabilities:"}</div>
										<div className="field-body" style={{ alignItems: "center" }}>
											<div className="field is-grouped is-align-items-center">
												<div className="control">
													<Switch
														disabled={!(viewerIsAdmin) || isLoadingSystemChecks}
														defaultChecked={vulnerabilitiesSystemChecks.isActive}
														onChange={async (e) => {
															const isActive = e.target.checked;
															const ids = vulnerabilitiesSystemChecks.systemChecks.map((sC) => sC._id);
															await submitEnableOrDisableSystemChecks(ids, isActive);
															mutateSystemChecks();
														}}
													/>
												</div>
												<div className="control">
													<IconButton
														className={classes.editButton}
														onClick={() => {
															const perCommitSystemCheck = vulnerabilitiesSystemChecks.systemChecks.find((sC) => sC.timeInterval === "perCommit");
															setSystemCheckToEdit(perCommitSystemCheck);
															setOpenSystemCheckModal(true);
														}}
													>
														<Edit />
													</IconButton>
												</div>
											</div>
										</div>
									</div>
									<div className="field is-horizontal">
										<div className={clsx("label field-label is-normal", classes.label)}>{"Velocity:"}</div>
										<div className="field-body" style={{ alignItems: "center" }}>
											<div className="field is-grouped is-align-items-center">
												<div className="control">
													<Switch
														disabled={!(viewerIsAdmin) || isLoadingSystemChecks}
														defaultChecked={velocitySystemChecks.isActive}
														onChange={async (e) => {
															const isActive = e.target.checked;
															const ids = velocitySystemChecks.systemChecks.map((sC) => sC._id);
															await submitEnableOrDisableSystemChecks(ids, isActive);
															mutateSystemChecks();
														}}
													/>
												</div>
											</div>
										</div>
									</div>
								</form>
							</Card>
						</Grid>
						<Grid item hidden={tab !== 3}>
							<Grid container spacing={2}>
								<Grid item xs={12}>
									<Card title="Add Cyclopt Badge to Repository">
										<div className="field is-horizontal">
											<div className={clsx("field-label is-normal", classes.label)}>
												<Image src={badgeUrl} alt="cyclopt rating" />
											</div>
											<div className="field-body">
												<ButtonGroup color="primary" variant="outlined">
													<Button onClick={() => {
														copy(`[![Cyclopt rating](${badgeUrl})](${window.location.origin})`);
														setCopied("md");
													}}
													>
														{copied === "md" ? "Copied!" : "Copy Markdown"}
													</Button>
													<Button onClick={() => {
														copy(`<a href="http://cyclopt.com">
															  <img src="${badgeUrl}" alt="cyclopt rating" />
															</a>`.replaceAll("\t", ""));
														setCopied("html");
													}}
													>
														{copied === "html" ? "Copied!" : "Copy HTML"}
													</Button>
												</ButtonGroup>
											</div>
										</div>
									</Card>
								</Grid>
								<Grid item xs={12}>
									<Card danger title="Danger Zone">
										<Grid container direction="row" justifyContent="space-around" spacing={1} m={-0.5} sx={{ "> .MuiGrid-item": { p: 0.5 } }}>
											{project.type === "team" && (
												<Grid item sm={8}>
													<Typography style={{ color: theme.palette.red[500] }}>
														<span style={{ fontWeight: "bold" }}>{"Caution:"}</span>
														{" Leaving the project."}
													</Typography>
												</Grid>
											)}
											{project.type === "team" && (
												<Grid item sm={4} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
													<Tooltip title={(numberOfAdmins === 1 && viewerIsAdmin) ? "You can't leave the project without any admin" : (project.team.length === 1 && "You can't leave the project without any member")}>
														<span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "80%" }}>
															<Button
																type="button"
																variant="outlined"
																className={classes.dangerButton}
																disabled={(numberOfAdmins === 1 && viewerIsAdmin) || project.team.length === 1}
																onClick={() => setLeaveOpen(true)}
															>
																{"leave project"}
															</Button>
														</span>
													</Tooltip>
												</Grid>
											)}

											<Grid item sm={8}>
												<Typography style={{ color: theme.palette.red[500] }}>
													<span style={{ fontWeight: "bold" }}>{"Caution:"}</span>
													{" Deleting the project will result in permanent data loss."}
												</Typography>
											</Grid>
											<Grid item sm={4} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
												<Tooltip title={!viewerIsAdmin && "Only project admins can delete a project"}>
													<span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "80%" }}>
														<Button
															type="button"
															variant="outlined"
															className={classes.dangerButton}
															disabled={!viewerIsAdmin}
															onClick={() => viewerIsAdmin && setOpen(true)}
														>
															{"delete project"}
														</Button>
													</span>
												</Tooltip>
											</Grid>
										</Grid>
									</Card>
								</Grid>
							</Grid>
						</Grid>
					</Grid>
				</div>
			</section>
			<SystemCheckModal
				open={openSystemCheckModal}
				setOpen={(val) => setOpenSystemCheckModal(val)}
				mutateProjectQGs={mutateSystemChecks}
				prQualityGate={systemCheckToEdit}
				updatePrQualityGate={setSystemCheckToEdit}
				isLoading={isLoading && isLoadingSystemChecks}
				viewerIsAdmin={viewerIsAdmin}
				linkedRepositories={project?.linkedRepositories}
			/>
			<Dialog keepMounted open={open} TransitionComponent={Zoom} onClose={() => !isDeleting && setOpen(false)}>
				<DialogTitle>
					{`Delete project ${project.name}?`}
				</DialogTitle>
				<DialogContent dividers>
					<DialogContentText>
						{`This will delete the project from Cyclopt, but not from ${capitalize(type)}.`}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<LoadingButton
						autoFocus
						startIcon={<Delete />}
						loading={isDeleting}
						loadingPosition="start"
						variant="contained"
						onClick={submitDeleteProject}
					>
						{"Delete"}
					</LoadingButton>
					<Button variant="outlined" disabled={isDeleting} onClick={() => setOpen(false)}>{"Cancel"}</Button>
				</DialogActions>
			</Dialog>
			<Dialog keepMounted open={leaveOpen} TransitionComponent={Zoom} onClose={() => !setIsLeaving && setLeaveOpen(false)}>
				<DialogTitle>
					{`Leave project ${project.name}?`}
				</DialogTitle>
				<DialogContent dividers>
					<DialogContentText>
						{`You won't be able to see the project ${project.name}`}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<LoadingButton
						autoFocus
						startIcon={<DirectionsRun />}
						loading={isDeleting}
						loadingPosition="start"
						variant="contained"
						onClick={submitLeaveProject}
					>
						{"Leave"}
					</LoadingButton>
					<Button variant="outlined" disabled={isDeleting} onClick={() => !isLeaving && setLeaveOpen(false)}>{"Cancel"}</Button>
				</DialogActions>
			</Dialog>
		</Root>
	);
};

export default memo(ProjectSettings);
