import { useMemo, useState, useEffect, memo, useCallback } from "react";
import { styled, useTheme } from "@mui/material/styles";
import PropTypes from "prop-types";
import clsx from "clsx";
import {
	Button,
	CircularProgress,
	Grid,
	Typography,
	LinearProgress,
	ListItemText,
	Box,
	TextField,
	InputAdornment,
	Link as MaterialLink,
	MenuItem,
	Autocomplete,
	Chip,
	Checkbox,
	ToggleButtonGroup,
	ToggleButton,
} from "@mui/material";
import { Delete, Sync, PriorityHigh, Check, Info, QuestionMark, HourglassTop, Done, ErrorOutline } from "@mui/icons-material";
import { dequal } from "dequal";
import { useImmer } from "use-immer";
import { GridToolbarContainer } from "@mui/x-data-grid";
import debounceFn from "debounce-fn";

import SelectKanban from "./SelectKanban.jsx";
import Card from "./Card.jsx";
import Tooltip from "./Tooltip.jsx";
import Select from "./Select.jsx";
import DataTable from "./DataTable.jsx";
import TeamMembersTable from "./TeamMembersTable.jsx";

import api, { checkRepoModuleAccess, updateProject, useUserAvailableOwners, useGitRepositories } from "#api";
import { capitalize, DEFAULT_LABELS, POSSIBLE_LANGUAGES, jwt, parseRepo, useSnackbar, MUTATION_DELAY_IN_MS, AcceptedFormatsComponent, sortAndPrioritizeBranches, setRepositoryBranches } from "#utils";
import { useRepositoryValidity } from "#customHooks";

const classes = {
	buttonProgress: "UpdateProject-buttonProgress",
	changeButton: "UpdateProject-changeButton",
	label: "UpdateProject-label",
	list: "UpdateProject-list",
};

const Root = styled("div")(({ theme }) => ({
	[`& .${classes.buttonProgress}`]: {
		color: theme.palette.primary.main,
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
	},
	[`& .${classes.changeButton}`]: {
		borderTopLeftRadius: 0,
		borderBottomLeftRadius: 0,
		boxShadow: "none",
	},
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
}));

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
	PaperProps: {
		style: {
			maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
		},
	},
};

const eligibleLanguages = [...POSSIBLE_LANGUAGES];

const UpdateProject = (props) => {
	const { project: initProject } = props;
	const initialState = useMemo(() => ({
		...initProject,
		linkedRepositories: initProject.linkedRepositories.map((e) => ({
			...e,
			full: e.root === ".",
			rootValid: "valid",
		})),

		team: initProject?.parentTeam || "",
		organization: initProject?.parentOrganization ?? {},
	}), [initProject]);

	const theme = useTheme();
	const { error } = useSnackbar();

	const [kanbanModal, setKanbanModal] = useState(false);
	const [fetchRepoAccess, setFetchRepoAccess] = useState(true);
	const [isLoadingInfo, setIsLoadingInfo] = useState(false);
	const [canSubmit, setCanSubmit] = useState(true);
	const [inputRepo, setInputRepo] = useState("");
	const [organization, setOrganization] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [repoName, setRepoName] = useState("");

	const [checkRepoValidity, setCheckRepoValidity] = useState(false);

	const [project, setProject] = useImmer(initialState);
	const [team, setTeam] = useImmer({
		name: "",
		members: [],
	});

	const projectSubscription = true;
	const qualitySubscription = true;
	const { gitRepositories = [], isLoading: isLoadingGitRepositories, isError: isErrorGitRepositories } = useGitRepositories((project?.type === "personal" && !qualitySubscription));
	const { availableOwners = [], isError: isErrorAvailableOwners } = useUserAvailableOwners();

	const { username: viewer, type = "github" } = useMemo(() => jwt.decode(), []);

	// COSTUME_HOOKS
	const [repoValidity] = useRepositoryValidity(project.linkedRepositories, type, fetchRepoAccess, setFetchRepoAccess);

	const initialTeamMembers = useMemo(() => (initProject?.parentTeam?.members
		?.filter((m) => m.user.username !== viewer)
		?.map((m) => (
			{ 	...m.user,
				isProjectAdmin: initProject?.team?.find((oM) => oM.user.username === m.user.username)?.role === "admin",
				isAdmin: m.role === "admin",
				isDeleted: !initProject?.team?.some((mT) => mT.user.username === m.user.username),
			}))
		.sort((m) => (m.isAdmin ? -1 : +1))), [initProject?.parentTeam?.members, initProject?.team, viewer]);

	const viewerIsAdmin = initProject.team.find((e) => e.user.username === viewer)?.role === "admin";
	const viewerCanUpdateQuality = viewerIsAdmin
		&& (qualitySubscription || (project?.type === "personal" && project?.linkedRepositories?.every((lr) => !lr.isPrivate)));
	const viewerCanUpdateProject = viewerIsAdmin && projectSubscription;

	const debouncedSetInputRepo = useMemo(() => debounceFn(({ target: { value } }) => {
		setInputRepo(value);
	}, { wait: MUTATION_DELAY_IN_MS }), []);

	useEffect(() => {
		if (isErrorGitRepositories || isErrorAvailableOwners) error();
	}, [error, isErrorGitRepositories, isErrorAvailableOwners]);

	useEffect(() => {
		setProject(initialState);
	}, [initialState, setProject]);

	useEffect(() => {
		setTeam((p) => { p.members = initialTeamMembers; });
	}, [initialTeamMembers, setTeam]);

	useEffect(() => {
		if (project?.linkedRepositories?.some((lr) => !lr.branches)) {
			(async () => { await setRepositoryBranches(project.linkedRepositories, type, setProject, error); })();
		}
	}, [error, project.linkedRepositories?.length, setProject, type]); 	// eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		document.querySelector("#repository_input")?.focus?.();
	}, [inputRepo]);

	// * --------------------- SET AVAILABLE REPOSITORIES OF SELECTED ORGANIZATION --------------------- * //
	const selectedOrgGitRepositories = useMemo(() => {
		if (!organization || isLoadingGitRepositories) return [];

		return [...new Set(gitRepositories.filter((repo) => repo.owner === organization).map((repo) => repo.name))];
	}, [gitRepositories, isLoadingGitRepositories, organization]);

	// * ----------------------------------------------------------------------------------------------- * //

	const addRepo = useCallback(async (owner = null, name = null) => {
		try {
			if (inputRepo.length > 0 || (owner && name)) {
				setIsLoadingInfo(true);
				const parsedRepo = (owner && name) ? { owner, name } : parseRepo(inputRepo);
				parsedRepo.vcType = "git";

				switch (type) {
					case "azure": {
						if (inputRepo.includes("/_git/")) {
							if (!parsedRepo?.organization && parsedRepo.host.includes(".visualstudio.com")) {
								parsedRepo.organization = parsedRepo.host.replace(".visualstudio.com", "");
							}

							parsedRepo.owner = `${parsedRepo.organization}/${parsedRepo.owner}`;
						} else {
							const parts = inputRepo.split("/");
							parsedRepo.owner = `${decodeURI(parts[3])}/${decodeURI(parts[4])}`;
							parsedRepo.name = decodeURI(parts[4]);
							parsedRepo.organization = decodeURI(parts[3]);
							parsedRepo.vcType = "tfvc";
						}

						break;
					}

					default:
					// Do nothing
				}

				if (parsedRepo && parsedRepo.name) {
					parsedRepo.full = true;
					parsedRepo.root = ".";
					parsedRepo.rootValid = "valid";
					parsedRepo.language = null;
					if (!project.linkedRepositories.some(
						(repo) => repo.owner === parsedRepo.owner
						&& repo.name === parsedRepo.name
						&& repo.root === "."
						&& repo.language === "null",
					)) {
						let info = {
							isPrivate: true,
							branches: null,
							defaultBranch: "",
							languages: eligibleLanguages ?? [],
						};

						try {
							const tempInfo = await api.get(`api/${type}/repository/info`, { owner: parsedRepo.owner, name: parsedRepo.name, vcType: parsedRepo.vcType });
							info = { ...info, ...tempInfo };
						} catch { /* */ }

						if ((project?.type === "personal" && !qualitySubscription && !info.isPrivate) || qualitySubscription) {
							setProject((p) => {
								p.linkedRepositories.push({
									...parsedRepo,
									productionBranch: info?.defaultBranch || "-",
									stagingBranch: info?.defaultBranch || "-",
									branches: null,
									language: info.languages?.[0] ?? eligibleLanguages[0] ?? "",
									isPrivate: info.isPrivate,
								});
							});
							setCheckRepoValidity(true);
							setFetchRepoAccess(true);
						} else {
							error("Cannot add private repo as part of the free subscription plan");
						}
					}

					setInputRepo("");
				}
			}

			setIsLoadingInfo(false);
		} catch { /* empty */ }
	}, [error, inputRepo, project.linkedRepositories, project?.type, qualitySubscription, setProject, type]);

	const submitUpdateProject = async (e) => {
		try {
			if (canSubmit) {
				setCanSubmit((p) => !p);
				e.preventDefault();
				setIsLoading(true);

				await updateProject(initProject._id, {
					...project,
					checkRepoValidity: type === "cyclopt" ? false : checkRepoValidity,
				}, team);

				setCanSubmit((p) => !p);
				window.location.reload();
			}
		} catch (error_) {
			setIsLoading(false);
			setCanSubmit((p) => !p);
			setProject(initialState);
			if (error_.response) {
				const { message } = await error_.response.json();
				error(message);
			} else {
				error();
			}
		}

		return null;
	};

	const tableColumns = useMemo(() => [
		{
			field: "Validity",
			sortable: false,
			width: 40,
			renderHeader: () => null,
			renderCell: ({ row: { owner, name } }) => {
				if (type === "cyclopt") {
					return (
						<Tooltip title="Your account doesn’t belong to a git provider.">
							<QuestionMark sx={{ color: "grey.500" }} />
						</Tooltip>
					);
				}

				const repo = repoValidity.find((e) => e.owner === owner && e.name === name);
				if (!repo) {
					return (
						<Tooltip title="Checking repository...">
							<Sync />
						</Tooltip>
					);
				}

				if (repo.isValid) {
					return (
						<Tooltip title="Repository is valid.">
							<Check style={{ color: theme.palette.green[500] }} />
						</Tooltip>
					);
				}

				return (
					<Tooltip title="Repository doesn’t exist or you don’t have access.">
						<PriorityHigh style={{ color: theme.palette.red[500] }} />
					</Tooltip>
				);
			},
		},
		{
			field: "Repository",
			minWidth: 150,
			flex: 0.7,
			valueGetter: ({ row }) => <Typography align="center">{`${row.owner}/${row.name}`}</Typography>,
		},
		{
			field: "Language",
			valueGetter: ({ row }) => row.language,
			minWidth: 150,
			renderCell: ({ row, value }) => (
				<Box py={1} width="100%" display="flex" flexDirection="column" justifyContent="center">
					<Select
						fullWidth
						value={value || ""}
						disabled={!viewerCanUpdateQuality || type === "cyclopt"}
						id="language"
						size="small"
						onChange={(evt) => {
							setProject((p) => { p.linkedRepositories[row.index].language = evt.target.value; });
							setCheckRepoValidity(true);
						}}
					>
						{[...POSSIBLE_LANGUAGES].map((e, ind) => (
							<MenuItem key={`language_${ind}`} disabled={!(project?.type === "personal" && !row?.isPrivate) && !eligibleLanguages.includes(e)} value={e}>
								{e}
							</MenuItem>
						))}
					</Select>
				</Box>
			),
		},
		{
			field: "Production branch",
			width: 180,
			renderCell: ({ row: { productionBranch, owner, name, providerId, branches, ref, root, index, tags = [], vcType = "git" } }) => (
				<Select
					required
					fullWidth
					id="production_branch"
					value={productionBranch || ""}
					disabled={!viewerCanUpdateQuality || type === "cyclopt"}
					sx={{ py: 1 }}
					onChange={async (evt) => {
						let isRootValid = false;
						try {
							setProject((p) => { p.linkedRepositories[index].rootValid = "pending"; });
							if (type === "cyclopt") {
								isRootValid = true;
							} else {
								({ isRootValid } = await checkRepoModuleAccess(
									{ owner, name, providerId, ref: evt.target.value },
									root,
									type,
									vcType,
								));
							}
						} catch {
							isRootValid = false;
						}

						setProject((p) => {
							p.linkedRepositories[index].productionBranch = evt.target.value;
							p.linkedRepositories[index].rootValid = isRootValid ? "valid" : "invalid";
						});
						setCheckRepoValidity(true);
					}}
				>
					{branches
						? (
							[...new Set(sortAndPrioritizeBranches([...(branches || []), ref], productionBranch).filter(Boolean))]
								.map((e, ind) => (
									!tags?.includes(e) && (
										<MenuItem key={`branches_${ind}`} value={e}>
											{e}
										</MenuItem>
									)

								)))
						: (
							<MenuItem key="production_branch" value={productionBranch}>
								{productionBranch}
								<LinearProgress />
							</MenuItem>
						)}
				</Select>
			),
		},
		{
			field: "Staging branch",
			width: 180,
			renderCell: ({ row: { stagingBranch, owner, name, providerId, branches, ref, root, index, tags = [], vcType = "git" } }) => (
				<Select
					required
					fullWidth
					id="staging_branch"
					value={stagingBranch || ""}
					disabled={!viewerCanUpdateQuality || type === "cyclopt"}
					sx={{ py: 1 }}
					onChange={async (evt) => {
						let isRootValid = false;
						try {
							setProject((p) => { p.linkedRepositories[index].rootValid = "pending"; });
							if (type === "cyclopt") {
								isRootValid = true;
							} else {
								({ isRootValid } = await checkRepoModuleAccess(
									{ owner, name, providerId, ref: evt.target.value },
									root,
									type,
									vcType,
								));
							}
						} catch {
							isRootValid = false;
						}

						setProject((p) => {
							p.linkedRepositories[index].stagingBranch = evt.target.value;
							p.linkedRepositories[index].rootValid = isRootValid ? "valid" : "invalid";
						});
						setCheckRepoValidity(true);
					}}
				>
					{branches
						? (
							[...new Set(sortAndPrioritizeBranches([...(branches || []), ref], stagingBranch).filter(Boolean))]
								.map((e, ind) => (
									!tags?.includes(e) && (
										<MenuItem key={`branches_${ind}`} value={e}>
											{e}
										</MenuItem>
									)

								)))
						: (
							<MenuItem key="staging_branch" value={stagingBranch}>
								{stagingBranch}
								<LinearProgress />
							</MenuItem>
						)}
				</Select>
			),
		},
		{
			field: "Full",
			width: 40,
			renderCell: ({ row }) => (
				<Checkbox
					checked={row.full}
					disabled={!viewerCanUpdateQuality || type === "cyclopt"}
					name="full"
					onChange={(e) => {
						setProject((p) => {
							p.linkedRepositories[row.index].full = e.target.checked;
							p.linkedRepositories[row.index].rootValid = "valid";
							p.linkedRepositories[row.index].root = ".";
						});
						setCheckRepoValidity(true);
					}}
				/>
			),
		},
		{
			field: "Root",
			minWidth: 250,
			flex: 1,
			renderCell: ({ row: { owner, name, providerId, root, rootValid, full, productionBranch,
				index, availableCsProjects = [], csProjects = [], vcType = "git" } }) => (
				full
					? <Typography>{"Whole repository"}</Typography>
					: (
						<Grid
							container
							p={1}
							justifyContent="center"
							alignItems="center"
							direction="column"
						>
							<Grid item width="100%">
								<TextField
									fullWidth
									required
									disabled={!viewerCanUpdateQuality || type === "cyclopt"}
									size="small"
									name="repo_root"
									placeholder="/a/b/whatever"
									InputProps={{
										endAdornment: (rootValid === "csprojMissing")
											? <Tooltip title="No .csproject file selected"><InputAdornment><ErrorOutline color="error" /></InputAdornment></Tooltip>
											: (rootValid === "pending")
												? <Tooltip title="Validating"><InputAdornment><HourglassTop color="grey" /></InputAdornment></Tooltip>
												: (rootValid === "valid")
													? <Tooltip title="This is a valid path"><InputAdornment><Done color="secondary" /></InputAdornment></Tooltip>
													: <Tooltip title="This is not a valid path, try again"><InputAdornment><ErrorOutline color="error" /></InputAdornment></Tooltip>,
									}}
									defaultValue={root}
									onBlur={async (e) => {
										setProject((p) => {
											p.linkedRepositories[index].root = e.target.value;
											p.linkedRepositories[index].rootValid = "pending";
										});
										let isRootValid = false;
										try {
											if (type === "cyclopt") {
												isRootValid = true;
											} else {
												({ isRootValid, csProjects } = await checkRepoModuleAccess(
													{ owner, name, providerId, ref: productionBranch },
													e.target.value,
													type,
													vcType,
												));
											}
										} catch {
											isRootValid = false;
										}

										setProject((p) => {
											p.linkedRepositories[index].rootValid = isRootValid
												? e.target.value?.endsWith(".sln") && p.linkedRepositories[index]?.csProjects?.length === 0
													? "csprojMissing"
													: "valid"
												: "invalid";
											p.linkedRepositories[index].availableCsProjects = csProjects;
											p.linkedRepositories[index].csProjects = p.linkedRepositories[index].csProjects ?? csProjects;
										});

										setCheckRepoValidity(true);
									}}
								/>
							</Grid>
							{root.endsWith(".sln") && availableCsProjects?.length > 0
								&& (
									<Grid item width="100%" mt={1}>
										<Select
											multiple
											disabled={!viewerCanUpdateQuality}
											id="cs-projects-selection"
											value={csProjects}
											renderValue={(selected = []) => (selected.length === 0
												? <Typography color="grey" pl="6px" sx={{ opacity: "0.6" }}>{"Select .csproj files"}</Typography>
												: selected?.map((s, sIndex) => <Chip key={`s_${sIndex}`} size="small" label={s} />))}
											sx={{ ".MuiSelect-multiple": { whiteSpace: "normal", maxHeight: "5rem" } }}
											MenuProps={MenuProps}
											onChange={(e) => {
												setProject((p) => {
													p.linkedRepositories[index].csProjects = e.target.value;
													p.linkedRepositories[index].rootValid = (e.target.value?.length === 0) ? "csprojMissing" : "valid";
												});
											}}
										>
											{availableCsProjects.map((value) => {
												const labelId = `checkbox-list-secondary-label-${value}`;
												return (
													<MenuItem
														key={value}
														value={value}
													>
														<Checkbox
															edge="end"
															checked={csProjects?.includes(value)}
															sx={{ mx: 0 }}
															inputProps={{ "aria-labelledby": labelId }}
														/>
														<ListItemText id={labelId} primary={value} />
													</MenuItem>
												);
											})}
										</Select>
									</Grid>
								)}
						</Grid>
					)
			),
		},
		{
			field: "Delete",
			width: 60,
			renderHeader: () => null,
			renderCell: ({ row }) => (
				<ToggleButtonGroup exclusive size="small" aria-label="actions">
					<ToggleButton
						value="delete"
						title="delete"
						aria-label="delete"
						disabled={!viewerCanUpdateQuality || type === "cyclopt"}
						onClick={() => {
							setProject((p) => { p.linkedRepositories.splice(row.index, 1); });
							setCheckRepoValidity(true);
						}}
					>
						<Delete />
					</ToggleButton>
				</ToggleButtonGroup>
			),
		},
	], [project?.type, repoValidity, setProject, theme.palette.green, theme.palette.red, type, viewerCanUpdateQuality]);

	return (
		<Root className="container">
			<Card title="Update Project">
				{isLoading ? (
					<Grid container justifyContent="center" align="center" direction="column" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
						<Grid item>
							<Typography gutterBottom variant="h5" color="primary">{"Updating your project. Please don’t close this window!"}</Typography>
						</Grid>
						<Grid item><LinearProgress color="primary" /></Grid>
					</Grid>
				)
					: (
						<form>
							<div className="field is-horizontal">
								<div className={clsx("label field-label is-normal", classes.label)}>{"Name:"}</div>
								<div className="field-body">
									<div className="field">
										<div className="control">
											<TextField
												required
												fullWidth
												color="secondary"
												size="small"
												readOnly={!viewerIsAdmin}
												value={project.name || ""}
												placeholder="Project name"
												InputProps={{ ...(project.name ? {} : { endAdornment: <Tooltip title="Field Required"><PriorityHigh color="error" /></Tooltip> }) }}
												onChange={({ target: { value } }) => viewerIsAdmin && setProject((p) => { p.name = value; })}
											/>
										</div>
									</div>
								</div>
							</div>

							<div className="field is-horizontal">
								<div className={clsx("label field-label is-normal", classes.label)}>{"Description:"}</div>
								<div className="field-body">
									<div className="field">
										<div className="control">
											<TextField
												fullWidth
												multiline
												minRows={3}
												color="secondary"
												size="small"
												value={project.description}
												readOnly={!viewerIsAdmin}
												placeholder="Description"
												onChange={({ target: { value } }) => viewerIsAdmin && setProject((p) => { p.description = value; })}
											/>
										</div>
									</div>
								</div>
							</div>
							{project.type === "team" && (
								<div className="field is-horizontal">
									<div className={clsx("label field-label is-normal", classes.label)}>{"Collaborators:"}</div>
									<div className="field-body">
										<TeamMembersTable
											label="project"
											collaborators={team?.members}
											viewerIsAdmin={viewerIsAdmin}
											viewerAvatar={project?.team?.members?.find((m) => m.user.username === viewer)?.user?.avatar}
											setTeam={(e) => setTeam(e)}
										/>
									</div>
								</div>
							)}
							{project.analytics.project && (
								<>
									<div className="field is-horizontal">
										<div className={clsx("label field-label is-normal", classes.label)}>{"Kanban model:"}</div>
										<div className="field-body">
											<div className="field has-addons">
												<div className="control" style={{ minWidth: "30%" }}>
													<input
														readOnly
														className="input"
														type="text"
														value={`${project.kanban.style === "none" ? "Without Kanban"
															: (project.kanban.style === "minimal" ? "Cyclopt Minimal Kanban" : "Cyclopt Default Kanban")}`}
														style={{ height: "100%" }}
													/>
												</div>
												<Button
													variant="contained"
													size="medium"
													type="button"
													disabled={!viewerIsAdmin}
													className={classes.changeButton}
													onClick={() => viewerIsAdmin && setKanbanModal(true)}
												>
													{"Change"}
												</Button>
											</div>
										</div>
									</div>
									<div className="field is-horizontal">
										<div className={clsx("label field-label is-normal", classes.label)}>{"Available labels:"}</div>
										<div className="field-body">
											<div className="field">
												<div className="control">
													<Autocomplete
														multiple
														disablePortal
														disabled={!viewerIsAdmin}
														size="small"
														renderInput={(params) => (<TextField {...params} color="secondary" variant="outlined" placeholder={viewerIsAdmin ? "Add a label..." : ""} />)}
														id="availableLabels"
														value={project.availableLabels}
														options={[]}
														renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => (
															<Chip
																key={`${option}_${index}`}
																size="small"
																label={option}
																{...getTagProps({ index })}
																style={{
																	opacity: 1,
																	...(DEFAULT_LABELS.has(option) && { backgroundColor: theme.palette.grey.light }),
																}}
																disabled={DEFAULT_LABELS.has(option)}
															/>
														))}
														isOptionEqualToValue={(a, b) => (a.title ?? a) === (b.title ?? b)}
														getOptionLabel={(option) => option.title ?? option}
														filterOptions={(_, { inputValue }) => {
															if (inputValue !== "" && !project.availableLabels.includes(inputValue)) {
																return [{ inputValue, title: `Create "${inputValue}"` }];
															}

															return [];
														}}
														onChange={(_, newValue) => setProject((p) => {
															p.availableLabels = [...new Set([
																...DEFAULT_LABELS,
																...newValue.map((e) => (e.title ? e.inputValue : e)),
															])];
														})}
													/>
													<Typography variant="caption">{"To create a new label, just start typing in the field above."}</Typography>
												</div>
											</div>
										</div>
									</div>
								</>
							)}
							{project.analytics.quality && (
								<div className="field is-horizontal" style={{ marginTop: "1rem", marginBottom: "1rem" }}>
									<div className={clsx("label field-label is-normal", classes.label)} style={{ padding: 0 }}>{"Linked Repositories:"}</div>
									<div className="field-body">
										<div className="field">
											{(type === "github" || type === "gitlab" || type === "bitbucket") && (
												<>
													<div className={classes.label} style={{ marginBottom: "0.5rem" }}>{"Select Repository"}</div>
													<Box sx={{ display: "flex", alignItems: "center" }}>
														<Autocomplete
															disablePortal
															disabled={!viewerCanUpdateQuality}
															size="small"
															renderInput={(params) => <TextField {...params} color="secondary" placeholder="Add an organization..." />}
															sx={{ width: "30%" }}
															id="labels"
															value={organization ?? null}
															options={availableOwners ?? null}
															renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => (
																<Chip
																	key={`${option}_${index}`}
																	size="small"
																	label={option}
																	{...getTagProps({ index })}
																	style={{
																		opacity: 1,
																		...(DEFAULT_LABELS.has(option) && { backgroundColor: theme.palette.grey.light }),
																	}}
																	disabled={DEFAULT_LABELS.has(option)}
																/>
															))}
															getOptionLabel={(option) => option.name || option}
															onChange={(_, org) => { setOrganization(org); setRepoName(null); }}
														/>
														<Autocomplete
															disablePortal
															loading={isLoadingGitRepositories}
															disabled={!organization || !viewerCanUpdateQuality}
															size="small"
															renderInput={(params) => <TextField {...params} color="secondary" placeholder="Add a repository..." />}
															sx={{ ml: 1, width: "30%" }}
															id="labels"
															value={repoName}
															options={selectedOrgGitRepositories || null}
															renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => (
																<Chip
																	key={`${option}_${index}`}
																	size="small"
																	label={option}
																	{...getTagProps({ index })}
																	style={{
																		opacity: 1,
																		...(DEFAULT_LABELS.has(option) && { backgroundColor: theme.palette.grey.light }),
																	}}
																	disabled={DEFAULT_LABELS.has(option)}
																/>
															))}
															getOptionLabel={(option) => option.title || option}
															onChange={(_, repo) => {
																setRepoName(repo);
															}}
														/>
														<Button
															disabled={!organization || !repoName || isLoadingInfo}
															variant="outlined"
															color="secondary"
															sx={{ ml: 1, fontWeight: "bold", borderWidth: 2, borderColor: "secondary.main" }}
															onClick={async () => {
																await addRepo(organization, repoName);
																setRepoName(null);
															}}
														>
															{"Add"}
														</Button>
													</Box>
													<Box style={{ marginBottom: "1rem" }}>
														<div className={classes.label} style={{ marginTop: "1rem", marginBottom: "0.5rem" }}>{`OR enter a valid ${capitalize(type)} repository URL`}</div>
													</Box>
												</>
											)}
											<DataTable
												hideFooter
												rows={project.linkedRepositories?.map((e, index) => ({ ...e, index }))}
												noRowsLabel="No repositories added yet."
												columns={tableColumns}
												initialState={{ pagination: { paginationModel: { page: 0, pageSize: 100 } } }}
												sx={{
													"& .MuiDataGrid-row--lastVisible": {
														borderBottomLeftRadius: (t) => `${t.shape.borderRadius}px`,
														borderBottomRightRadius: (t) => `${t.shape.borderRadius}px`,
													},
												}}
												getRowId={(e) => `${e.owner}_${e.name}_${e.root}_${e.language}_${e.index}`}
												CustomToolbar={() => ((type === "cyclopt") ? null : (
													<GridToolbarContainer
														sx={{
															borderRadius: (t) => `${t.shape.borderRadius}px`,
															boxShadow: (t) => `${t.shadows[4]} !important`,
															bgcolor: "common.white",
															borderBottomLeftRadius: 0,
															borderBottomRightRadius: 0,
															borderBottomWidth: 2,
															borderBottomStyle: "solid",
															borderBottomColor: "secondary.main",
															justifyContent: "center",
															padding: 0,
														}}
													>
														<Box m={1.5} mb={0} width="100%">
															{type !== "cyclopt" && (
																<>
																	<Box sx={{ display: "flex", alignItems: "center" }}>
																		<TextField
																			fullWidth
																			disabled={!viewerIsAdmin}
																			error={inputRepo.length > 0 && (!(parseRepo(inputRepo) && parseRepo(inputRepo).name))}
																			type="url"
																			size="small"
																			color="secondary"
																			name="repository"
																			id="repository_input"
																			defaultValue={inputRepo || ""}
																			label={`${capitalize(type)} URL`}
																			inputProps={{ style: { height: "auto" } }}
																			InputProps={{
																				endAdornment: (
																					<InputAdornment position="end">
																						<Tooltip
																							style={{ backgroundColor: "transparent", color: theme.palette.secondary.main }}
																							title={AcceptedFormatsComponent(type)}
																						>
																							<Info className={classes.tooltip} />

																						</Tooltip>
																					</InputAdornment>
																				),
																			}}
																			onChange={debouncedSetInputRepo}
																			onKeyDown={(e) => {
																				if (e.key === "Enter") {
																					e.preventDefault();
																					addRepo();
																				}
																			}}
																		/>
																		<Button
																			disabled={
																				!inputRepo
																					|| !viewerIsAdmin
																					|| (inputRepo.length > 0 && (!(parseRepo(inputRepo) && parseRepo(inputRepo).name)))
																					|| isLoadingInfo
																			}
																			variant="outlined"
																			color="secondary"
																			sx={{ ml: 1, fontWeight: "bold", borderWidth: 2, borderColor: "secondary.main" }}
																			onClick={addRepo}
																		>
																			{"Add"}
																		</Button>
																	</Box>
																	<Typography variant="caption" sx={{ ml: 1, color: "rgba(0, 0, 0, 0.6)" }}>
																		{`Enter a valid repository ${capitalize(type)} URL.`}
																		{availableOwners.length > 0 && ` You can add repositories from ${new Intl.ListFormat("en-GB").format(availableOwners)}.`}
																	</Typography>
																</>
															)}
														</Box>
														{isLoadingInfo && <LinearProgress style={{ width: "100%" }} />}
													</GridToolbarContainer>
												))}
											/>
											<Typography
												variant="caption"
												hidden={["cyclopt", "gitlab", "bitbucket", "azure"].includes(type)}
											>
												{"Unable to connect repository? "}
												<MaterialLink
													underline="none"
													href={import.meta.env.VITE_MAIN_SERVER_URL}
													target="_blank"
													rel="noopener noreferrer"
												>
													{"Configure the Cyclopt app on Github."}
												</MaterialLink>
											</Typography>
											<Typography
												variant="caption"
												hidden={["cyclopt", "github", "bitbucket", "azure"].includes(type)}
											>
												{"Unable to connect repository? "}
												<MaterialLink
													underline="none"
													href="https://gitlab.com/oauth/applications"
													target="_blank"
													rel="noopener noreferrer"
												>
													{"Configure the Cyclopt app on Gitlab"}
												</MaterialLink>
												{"."}
											</Typography>
											<Typography
												variant="caption"
												style={{ padding: theme.spacing(0.5, 2) }}
												hidden={type !== "cyclopt"}
											>
												{"Login with a git provider to be able to add your repositories."}
											</Typography>
										</div>
									</div>
								</div>
							)}
							<Grid container direction="row" justifyContent="flex-end" alignItems="center" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
								<Button
									variant="contained"
									color="secondary"
									style={{ color: theme.palette.common.white }}
									size="medium"
									type="button"
									disabled={
										isLoading
										|| !viewerIsAdmin
										|| !project.name
										|| (dequal(project, initialState) && dequal(team?.members, initialTeamMembers))
										|| (project?.type === "team" && !project.team)
										|| (!viewerCanUpdateProject && project?.analytics?.project)
										|| (!viewerCanUpdateQuality && project?.analytics?.quality)
										|| (!project.linkedRepositories?.every((r) => r.rootValid === "valid" && r?.isRepoValid !== false && r.branches?.length > 0 && (!r.isPrivate || eligibleLanguages.includes(r.language))))
									}
									onClick={submitUpdateProject}
								>
									{"Done"}
									{isLoading && <CircularProgress size={24} className={classes.buttonProgress} />}
								</Button>
								<Grid item>
									<Button disabled={!viewerIsAdmin} variant="outlined" size="medium" type="button" onClick={() => setProject(initialState)}>
										{"Reset"}
									</Button>
								</Grid>
							</Grid>
						</form>
					)}
				<SelectKanban
					open={kanbanModal}
					kanban={project.kanban}
					setKanban={(kanban) => setProject((p) => { p.kanban = kanban; })}
					onClose={() => setKanbanModal(false)}
				/>
			</Card>
		</Root>
	);
};

UpdateProject.propTypes = { project: PropTypes.object.isRequired };

export default memo(UpdateProject);
