
import { useMemo, useState, useEffect, memo, useCallback } from "react";
import { styled, useTheme } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";
import {
	Button,
	Stack,
	Grid,
	Typography,
	CircularProgress,
	Box,
	TextField,
	InputAdornment,
	Link as MaterialLink,
	MenuItem,
	Autocomplete,
	Chip,
	Checkbox,
	ToggleButtonGroup,
	Paper,
	ToggleButton,
	ListItemText,
	LinearProgress,
} from "@mui/material";
import {
	Delete, Sync, PriorityHigh, Check, Info, QuestionMark,
	HourglassTop, Done, ErrorOutline,
} from "@mui/icons-material";
import { useImmer } from "use-immer";
import { GridToolbarContainer } from "@mui/x-data-grid";
import debounceFn from "debounce-fn";
import queryString from "query-string";
import { useTour } from "@reactour/tour";

import Select from "../components/Select.jsx";
import Tooltip from "../components/Tooltip.jsx";
import DataTable from "../components/DataTable.jsx";
import SelectKanban from "../components/SelectKanban.jsx";
import TeamMembersTable from "../components/TeamMembersTable.jsx";
import { SecondaryBackgroundButton } from "../components/Buttons.jsx";

import { capitalize, setRepositoryBranches, MUTATION_DELAY_IN_MS, jwt, parseRepo, useSnackbar, DEFAULT_LABELS, POSSIBLE_LANGUAGES, AcceptedFormatsComponent, sortAndPrioritizeBranches, addProjectSteps } from "#utils";
import api, { checkRepoModuleAccess, createProject, useUserAvailableOwners, useGitRepositories, useOrganizations } from "#api";
import { useRepositoryValidity } from "#customHooks";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
	PaperProps: {
		style: {
			maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
		},
	},
};

const classes = {
	buttonProgress: "AddProject-buttonProgress",
	changeButton: "AddProject-changeButton",
	label: "AddProject-label",
	list: "AddProject-list",
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

const initProject = {
	name: "",
	description: "",
	kanban: { style: "default", hasArchived: true },
	linkedRepositories: [],
	collaborators: [],
	availableLabels: [...DEFAULT_LABELS],
	type: "team",
	team: null,
	organization: null,
	analytics: { project: true, quality: true },
};
const projectSubscription = true;
const qualitySubscription = true;

const AddProject = () => {
	const navigate = useNavigate();
	const theme = useTheme();
	const { error } = useSnackbar();

	const [kanbanModal, setKanbanModal] = useState(false);
	const [fetchRepoAccess, setFetchRepoAccess] = useState(true);
	const [isLoadingInfo, setIsLoadingInfo] = useState(false);
	const [canSubmit, setCanSubmit] = useState(true);
	const [inputRepo, setInputRepo] = useState("");
	const [organization, setOrganization] = useState(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [repoName, setRepoName] = useState("");

	const [project, setProject] = useImmer(initProject);
	const [team, setTeam] = useImmer({
		name: "",
		members: [],
	});

	const { search } = useLocation();

	const { gitRepositories = [], isLoading: isLoadingGitRepositories, isError: isErrorGitRepositories } = useGitRepositories((project?.type === "personal" && !qualitySubscription));
	const { availableOwners = [], isError: isError2 } = useUserAvailableOwners();
	const { organizations = [], isLoading: isLoadingOrganizations } = useOrganizations();
	const { setIsOpen, setSteps, setCurrentStep, isOpen, currentStep } = useTour();

	const { username: viewer, type = "github" } = useMemo(() => jwt.decode(), []);
	const [repoValidity] = useRepositoryValidity(project.linkedRepositories, type, fetchRepoAccess, setFetchRepoAccess);

	const initialTeamMembers = useMemo(() => (project?.organization?.teams.flatMap((t) => t.members)
		?.filter((m) => m.user.username !== viewer)
		?.map((m) => (
			{ 	...m.user,
				isProjectAdmin: m.role === "admin",
				isDeleted: !(m.role === "admin"),
			}))
		.sort((m) => (m.isAdmin ? -1 : +1))), [project?.organization?.teams, viewer]);

	const debouncedSetInputRepo = useMemo(() => debounceFn(({ target: { value } }) => {
		setInputRepo(value);
	}, { wait: MUTATION_DELAY_IN_MS }), []);

	useEffect(() => {
		if (isError2 || isErrorGitRepositories) error();
	}, [error, isError2, isErrorGitRepositories]);

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
				//  Empty
			}

			parsedRepo.path = parsedRepo.pathname;
			if (parsedRepo && parsedRepo.name) {
				parsedRepo.full = true;
				parsedRepo.root = ".";
				parsedRepo.rootValid = "valid";
				parsedRepo.language = null;
				if (!project.linkedRepositories.some(
					(repo) => repo.owner === parsedRepo.owner
						&& repo.name === parsedRepo.name
						&& repo.root === "."
						&& repo.language === null,
				)) {
					let info = {
						isPrivate: true,
						branches: null,
						defaultBranch: "",
						languages: [...POSSIBLE_LANGUAGES],
					};

					try {
						const tempInfo = await api.get(`api/${type}/repository/info`, { owner: parsedRepo.owner, name: parsedRepo.name, vcType: parsedRepo.vcType });
						info = { ...info, ...tempInfo };
					} catch { /* */ }

					if (projectSubscription || (project?.type === "personal" && !info.isPrivate)) {
						setProject((p) => {
							p.linkedRepositories.push({
								...parsedRepo,
								productionBranch: info?.defaultBranch || "-",
								stagingBranch: info?.defaultBranch || "-",
								branches: null,
								language: info.languages?.[0] ?? "JavaScript",
								isPrivate: info?.isPrivate,
							});
						});
						setFetchRepoAccess(true);
					} else {
						error("Cannot add private repo as part of the free subscription plan");
					}
				}

				setInputRepo("");
			}

			setIsLoadingInfo(false);
		}
	}, [error, inputRepo, project.linkedRepositories, project?.type, setProject, type]);

	const submitCreateProject = async (e) => {
		try {
			if (canSubmit) {
				setCanSubmit((p) => !p);
				e.preventDefault();
				setIsSubmitting(true);
				await createProject(project, team);
				setIsSubmitting(false);
				navigate("/projects");
			}
		} catch (error_) {
			setIsSubmitting(false);
			setCanSubmit((p) => !p);
			if (error_.response) {
				const { message } = await error_.response.json();
				error(message);
			} else {
				error();
			}
		}

		return null;
	};

	// ******************************** TOUR-HANDING ********************************** //

	const memoizedAddProjectSteps = useMemo(() => addProjectSteps(
		viewer,
		type,
		navigate,
	),
	// eslint-disable-next-line react-hooks/exhaustive-deps
	[type, viewer]);

	useEffect(() => {
		const parsed = queryString.parse(search);
		if (isLoadingOrganizations) {
			setIsOpen(false);
		} else {
			if (parsed.tour === "addProject") {
				setSteps(memoizedAddProjectSteps);
				setIsOpen(true);
			} else {
				setIsOpen(false);
			}

			if (parsed.tourStep !== currentStep) {
				setCurrentStep(Number(parsed.tourStep));
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search, currentStep, memoizedAddProjectSteps, isLoadingOrganizations]);

	// ******************************************************************************** //

	// ******************************** FORM-HANDING ********************************** //

	const handleNext = (e) => {
		submitCreateProject(e);
	};

	// ******************************************************************************** //
	const tableColumns = useMemo(() => [
		{
			field: "Validity",
			sortable: false,
			maxWidth: 40,
			flex: 1,
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
							<Check id="repoCheck" style={{ color: theme.palette.green[500] }} />
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
			minWidth: 200,
			flex: 1,
			valueGetter: ({ row }) => <Typography align="center">{`${row.owner}/${row.name}`}</Typography>,
		},
		{
			field: "Language",
			valueGetter: ({ row }) => row.language,
			minWidth: 150,
			flex: 1,
			renderCell: ({ row, value }) => (
				<Box py={1} display="flex" flexDirection="column" justifyContent="center" sx={{ width: "100%" }}>
					<Select
						fullWidth
						value={value || ""}
						id="language"
						size="small"
						onChange={(evt) => setProject((p) => { p.linkedRepositories[row.index].language = evt.target.value; })}
					>
						{[...POSSIBLE_LANGUAGES].map((e, ind) => (
							<MenuItem key={`language_${ind}`} disabled={!(project?.type === "personal" && !row?.isPrivate)} value={e}>
								{e}
							</MenuItem>
						))}
					</Select>
				</Box>
			),
		},
		{
			field: "Production branch",
			minWidth: 180,
			flex: 1,
			renderCell: ({ row: { productionBranch, owner, name, providerId, branches, ref, root, index, vcType = "git", isPrivate } }) => (
				<Select
					fullWidth
					value={productionBranch || ""}
					id="productionBranch"
					size="small"
					sx={{ py: 1 }}
					onChange={async (evt) => {
						let isRootValid = false;
						try {
							setProject((p) => {
								p.linkedRepositories[index].rootValid = "pending";
							});
							if (type === "cyclopt") {
								isRootValid = true;
							} else {
								({ isRootValid } = await checkRepoModuleAccess(
									{ owner, name, providerId, ref: evt.target.value, isPrivate },
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
					}}
				>
					{branches
						? (
							[...new Set(sortAndPrioritizeBranches([...(branches || []), ref], productionBranch).filter(Boolean))]
								.map((e, ind) => (
									<MenuItem key={`branches_${ind}`} value={e}>
										{e}
									</MenuItem>
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
			minWidth: 180,
			flex: 1,
			renderCell: ({ row: { stagingBranch, owner, name, providerId, branches, ref, root, index, vcType = "git", isPrivate } }) => (
				<Select
					fullWidth
					value={stagingBranch || ""}
					id="stagingBranch"
					size="small"
					sx={{ py: 1 }}
					onChange={async (evt) => {
						let isRootValid = false;
						try {
							setProject((p) => {
								p.linkedRepositories[index].rootValid = "pending";
							});
							if (type === "cyclopt") {
								isRootValid = true;
							} else {
								({ isRootValid } = await checkRepoModuleAccess(
									{ owner, name, providerId, ref: evt.target.value, isPrivate },
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
					}}
				>
					{branches
						? (
							[...new Set(sortAndPrioritizeBranches([...(branches || []), ref], stagingBranch).filter(Boolean))]
								.map((e, ind) => (
									<MenuItem key={`branches_${ind}`} value={e}>
										{e}
									</MenuItem>
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
			maxWidth: 60,
			flex: 1,
			renderCell: ({ row }) => (
				<Checkbox
					checked={row.full}
					name="full"
					onChange={(e) => setProject((p) => {
						p.linkedRepositories[row.index].full = e.target.checked;
						p.linkedRepositories[row.index].rootValid = "valid";
						p.linkedRepositories[row.index].root = ".";
					})}
				/>
			),
		},
		{
			field: "Root",
			minWidth: 250,
			flex: 1,
			renderCell: ({ row: { owner, name, providerId, root, rootValid, full, productionBranch,
				index, availableCsProjects = null, selectedCsProjects = null, vcType = "git", isPrivate } }) => (
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
									size="small"
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
												({ isRootValid, csProjects: availableCsProjects } = await checkRepoModuleAccess(
													{ owner, name, providerId, ref: productionBranch, isPrivate },
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
												? e.target.value?.endsWith(".sln") && project.linkedRepositories[index]?.csProjects?.length === 0
													? "csprojMissing"
													: "valid"
												: "invalid";

											p.linkedRepositories[index].availableCsProjects = availableCsProjects;
											p.linkedRepositories[index].selectedCsProjects = project.linkedRepositories[index].selectedCsProjects
												?? selectedCsProjects ?? availableCsProjects;
										});
									}}
								/>
							</Grid>
							{root.endsWith(".sln") && availableCsProjects?.length > 0
								&& (
									<Grid item width="100%" mt={1}>
										<Select
											multiple
											id="cs-projects-selection"
											value={selectedCsProjects}
											renderValue={(selected = []) => (selected.length === 0
												? <Typography color="grey" pl="6px" sx={{ opacity: "0.6" }}>{"*Select .csproj files"}</Typography>
												: selected?.map((s, sIndex) => <Chip key={`s_${sIndex}`} size="small" label={s} />))}
											sx={{ ".MuiSelect-multiple": { whiteSpace: "normal", maxHeight: "5rem" } }}
											MenuProps={{
												...MenuProps,
											}}
											onChange={(e) => {
												setProject((p) => {
													p.linkedRepositories[index].selectedCsProjects = e.target.value;
													p.linkedRepositories[index].rootValid = (e.target.value?.length === 0) ? "csprojMissing" : "valid";
												});
											}}
										>
											{availableCsProjects?.map((value) => {
												const labelId = `checkbox-list-secondary-label-${value}`;
												return (
													<MenuItem
														key={value}
														value={value}
													>
														<Checkbox
															edge="end"
															checked={selectedCsProjects?.includes(value)}
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
			maxWidth: 50,
			flex: 1,
			sortable: undefined,
			renderHeader: () => null,
			renderCell: ({ row }) => (
				<ToggleButtonGroup exclusive size="small" aria-label="actions">
					<ToggleButton
						value="delete"
						title="delete"
						aria-label="delete"
						onClick={() => setProject((p) => { p.linkedRepositories.splice(row.index, 1); })}
					>
						<Delete />
					</ToggleButton>
				</ToggleButtonGroup>
			),
		},
	], [project.linkedRepositories, project?.type, repoValidity, setProject, theme.palette.green, theme.palette.red, type]);

	console.log(type);

	return (
		<Root className="container" sx={{ display: "flex", flexDirection: "column" }}>
			{isSubmitting ? (
				<Grid container direction="column" justifyContent="center" alignItems="center" sx={{ margin: "auto", "> .MuiGrid-item": { m: 1 } }}>
					<Grid item>
						<Typography gutterBottom variant="h5" color="primary">{"Adding your project. Please don’t close this window!"}</Typography>
					</Grid>
					<Grid item><CircularProgress color="primary" /></Grid>
				</Grid>
			) : (
				<Grid
					container
					mt="3rem"
					mb="1rem"
					display="flex"
					flexDirection="column"
					alignItems="center"
					justifyContent="center"
					sx={{ "> .MuiGrid-item": { m: 2, width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" } }}
				>
					<Grid item>
						<Typography variant="h4">
							{"Create your new project"}
						</Typography>
					</Grid>
					<Grid item xs={12} sm={9} sx={{ width: "100%" }}>
						<Paper square sx={{ width: "100%", p: 2, backgroundColor: theme.palette.cardBackgroundLight.main }}>
							<Typography align="center">
								<p>
									{(
										<Grid>
											<Typography
												variant="subtitle2"
												hidden={["cyclopt", "gitlab", "bitbucket", "azure"].includes(type)}
											>
												{"*If you haven’t already done so, "}
												<MaterialLink
													underline="none"
													href={import.meta.env.VITE_MAIN_SERVER_URL}
													target="_blank"
													style={{ alignItems: "center" }}
													rel="noopener noreferrer"
												>
													<span style={{ color: theme.palette.secondary.main }}>{"configure the Cyclopt app on Github."}</span>
													<Info style={{ verticalAlign: "sub", fontSize: "1.2rem" }} />
												</MaterialLink>
											</Typography>
											<Typography
												variant="subtitle2"
												hidden={["cyclopt", "github", "bitbucket", "azure"].includes(type)}
											>
												{"*If you haven’t already done so "}
												<MaterialLink
													underline="none"
													href="https://gitlab.com/oauth/applications"
													target="_blank"
													rel="noopener noreferrer"
												>
													<span style={{ color: theme.palette.secondary.main }}>{"configure the Cyclopt app on Gitlab"}</span>
													<Info style={{ verticalAlign: "sub", fontSize: "1.2rem" }} />
												</MaterialLink>
												{"."}
											</Typography>
										</Grid>
									)}
								</p>
							</Typography>
						</Paper>
					</Grid>
					<Grid item container flexDirection="column" xs={12} sm={9}>
						{project.type === "team" && (
							<Grid item container>
								<Grid container item xs={12} direction="row" mb={3}>
									<Grid item id="organization" xs={6} pr={1}>
										<Autocomplete
											focused
											fullWidth
											size="small"
											disabled={isOpen}
											loading={isLoadingOrganizations}
											renderInput={(params) => <TextField {...params} placeholder="Select Organization" />}
											value={project?.organization || null}
											options={organizations || null}
											getOptionLabel={(option) => option?.name || option}
											isOptionEqualToValue={(a, b) => (a?._id === b?._id)}
											onChange={(_, org) => setProject((p) => {
												p.organization = org;
												p.team = org?.teams[0];
												p.collaborators = org?.teams[0]?.members?.map(({ user, ...u }) => ({
													...user, ...u, isDeleted: (u?.role !== "admin"), isAdmin: (u?.role === "admin"),
												})) ?? [];
											})}
											onClear={() => setProject((p) => {
												p.organization = null;
												p.team = null;
												p.collaborators = [];
											})}
										/>
									</Grid>
								</Grid>
								<Typography variant="h6" fontWeight="bold" color="primary" align="start">
									{"Collaborators"}
								</Typography>
								<TeamMembersTable
									viewerIsAdmin
									label="project"
									collaborators={team?.members}
									viewerAvatar={project?.team?.members?.find((m) => m.user.username === viewer)?.user?.avatar}
									setTeam={(e) => setTeam(e)}
								/>
							</Grid>
						)}
					</Grid>
					<Grid item container flexDirection="column" xs={12} sm={9}>
						<Grid item container id="add_name">
							<Typography variant="h6" fontWeight="bold" color="primary" align="start">
								{"Name"}
							</Typography>
							<TextField
								focused
								fullWidth
								id="inputName"
								width="fill-parent"
								name="name"
								size="small"
								disabled={isOpen}
								className={classes.label}
								value={project.name || ""}
								type="text"
								placeholder="Project name"
								sx={{ mb: 2 }}
								onChange={({ target: { value } }) => setProject((p) => { p.name = value; })}
							/>
						</Grid>
						<Grid item container id="add_description">
							<Typography variant="h6" fontWeight="bold" color="primary" align="start">
								{"Description"}
							</Typography>
							<TextField
								focused
								fullWidth
								multiline
								minRows="4"
								size="small"
								name="name"
								disabled={isOpen}
								value={project.description || ""}
								type="text"
								className={classes.label}
								placeholder="Description"
								onChange={({ target: { value } }) => setProject((p) => { p.description = value; })}
							/>
						</Grid>
					</Grid>
					<Grid item container id="addRepositoryGeneral" flexDirection="column" alignItems="center" xs={12} sm={9}>
						{(type === "github" || type === "gitlab" || type === "bitbucket") && (
							<Grid item container>
								<Grid container item display="flex" flexDirection="column">
									<Grid item>
										<Typography variant="h6" fontWeight="bold" color="primary">
											{"Select Repository"}
										</Typography>
									</Grid>
									<Grid item container id="addRepositoryFromPlatform" direction="row" spacing={1}>
										<Grid item xs={3}>
											<Autocomplete
												focused
												fullWidth
												disablePortal
												size="small"
												disabled={isOpen}
												renderInput={(params) => <TextField {...params} placeholder="Add an organization..." />}
												id="organizations"
												value={organization ?? null}
												options={availableOwners || null}
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
										</Grid>
										<Grid item xs={3}>
											<Autocomplete
												fullWidth
												disablePortal
												loading={isLoadingGitRepositories}
												disabled={!organization || isOpen}
												size="small"
												renderInput={(params) => <TextField {...params} placeholder="Add a repository..." />}
												id="organization_repositories"
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
												onChange={(_, repo) => { setRepoName(repo); }}
											/>
										</Grid>
										<Grid item>
											<Button
												disabled={!organization || !repoName || isLoadingInfo || isOpen}
												variant="outlined"
												color="secondary"
												sx={{ fontWeight: "bold", borderWidth: 2, borderColor: "secondary.main", height: "100%" }}
												onClick={async () => {
													await addRepo(organization, repoName);
													setRepoName(null);
												}}
											>
												{"Add"}
											</Button>
										</Grid>
									</Grid>
								</Grid>
								<Grid container item display="flex" flexDirection="column" my={2}>
									<Grid item>
										<Typography fontSize={17} fontWeight="bold" color="primary" align="start">
											{`Or enter a valid repository ${capitalize(type)} URL`}
										</Typography>
									</Grid>
								</Grid>
							</Grid>
						)}
						<DataTable
							hideFooter
							id="addRepositoryFromUrl"
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
							getRowId={(e) => `${e.full_name}_${e.root}_${e.language}_${e.index}_${e.vcType}`}
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
												<Box sx={{ display: "flex", alignItems: "center" }} id="azureRepo">
													<TextField
														fullWidth
														error={inputRepo.length > 0 && (!(parseRepo(inputRepo) && parseRepo(inputRepo).name))}
														disabled={isOpen}
														defaultValue={inputRepo ?? ""}
														type="url"
														size="small"
														color="secondary"
														name="repository"
														id="repository_input"
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
														id="repoButton"
														disabled={isLoadingInfo || isOpen}
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
							style={{ padding: theme.spacing(0.5, 2) }}
							hidden={type !== "cyclopt"}
						>
							{"Login with a git provider to be able to add your repositories."}
						</Typography>
					</Grid>
					<Grid item>
						<Stack
							id="buttonss"
							direction="row"
							justifyContent="center"
							alignItems="center"
							spacing={2}
						>
							<SecondaryBackgroundButton
								id="doneButton"
								size="small"
								color="secondary"
								variant="contained"
								disabled={isOpen}
								sx={{ maxWidth: "none", width: "6rem", borderRadius: "6px", color: "common.white" }}
								onClick={handleNext}
							>
								{"Done"}
							</SecondaryBackgroundButton>
						</Stack>
					</Grid>
				</Grid>
			)}
			<SelectKanban
				open={kanbanModal}
				kanban={project.kanban}
				setKanban={(kanban) => setProject((p) => { p.kanban = kanban; })}
				onClose={() => setKanbanModal(false)}
			/>
		</Root>
	);
};

export default memo(AddProject);
