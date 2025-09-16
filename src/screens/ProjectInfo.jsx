/* eslint-disable max-len */
import { useCallback, useState, useEffect, memo, useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
	Avatar,
	Grid,
	Typography,
	Link as MuiLink,
	LinearProgress,
	CircularProgress,
	Box,
	IconButton,
	Autocomplete,
	Zoom,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	Checkbox,
	Chip,
	Alert,
	AlertTitle,
} from "@mui/material";
import { MobileDatePicker } from "@mui/x-date-pickers";
import { LoadingButton } from "@mui/lab";
import {
	ContentPaste,
	ContentPasteOff,
	Dangerous,
	FlashOn,
	GitHub,
	Public,
	PublicOff,
	Remove,
	Summarize,
	Info,
} from "@mui/icons-material";
import pluralize from "pluralize";
import { Image } from "mui-image";
import { shallow } from "zustand/shallow";
import { useImmer } from "use-immer";

import InfoTile from "../components/InfoTile.jsx";
import GitLabIcon from "../components/GitLabIcon.jsx";
import BitBucketIcon from "../components/BitBucketIcon.jsx";
import Tooltip from "../components/Tooltip.jsx";
import Pulse from "../components/Pulse.jsx";
import { convertQualityScoreToLetter, getColorForQualityScore, jwt, useSnackbar, dayjs, getRepoUrl, useDocumentTitle, DATE_FORMAT, POSSIBLE_LANGUAGES, convertQualityScoreToAvatar } from "../utils/index.js";
import useGlobalState from "../use-global-state.js";
import { loadProjectTaskMetrics, loadRepositoriesMetaData, useProject, useProjectSystemChecksResults, useProjectQualityGatesStatus, useProjectActiveSystemChecks, useProjectWeeklyQualityGates } from "../api/index.js";
import AzureIcon from "../components/AzureIcon.jsx";
import DataTable from "../components/DataTable.jsx";
import OverviewSection from "../components/OverviewSection.jsx";
import WeekInfoWithBranchSwitch from "../components/WeekInfoWithBranchSwitch.jsx";
import CompanionAccordion from "../components/Accordion.jsx";
import OverviewOverallSection from "../components/OverviewOverallSection.jsx";
import QualityTiles from "../components/QualityTiles.jsx";
import TaskImage from "../assets/images/tiles/task.png";
import { PinkBackgroundButton } from "../components/Buttons.jsx";

import { createRepositoryName } from "#utils";

const initialReportOptions = {
	open: false,
	emails: [],
	availableEmails: [],
	criticalViolations: false,
	loading: false,
	date: dayjs().subtract(2, "w"),
};

const projectSubscription = true;
const qualitySubscription = true;
const eligibleLanguages = [...POSSIBLE_LANGUAGES];

const ProjectInfo = () => {
	const { type = "github" } = jwt.decode();
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const { setName, setBranchName } = useGlobalState(useCallback((e) => ({
		setName: e.setName,
		setBranchName: e.setBranchName,
	}), []), shallow);
	const { projectid } = useParams();
	const { error } = useSnackbar();
	const initRepoMetaData = { analysesThisWeek: {}, cycloptConfig: {}, repoFetched: {} };
	const [reposMetaData, setReposMetaData] = useState(initRepoMetaData);
	const [projectInfo, setProjectInfo] = useState({ team: [] });
	const [shouldFetch, setShouldFetch] = useState(true);
	const [showStagingBranch, setShowStagingBranch] = useState(false);
	const [week, setWeek] = useState({
		numOfWeek: 0,
		startDay: "",
		endDay: "",
	});
	const [reportOptions, setReportOptions] = useImmer(initialReportOptions);

	const { project = {}, isLoading, isError } = useProject(projectid, false, true);
	const { projectSystemChecksResults = {},
		isLoading: isLoadingSystemChecks,
		isError: isErrorSystemChecks,
	} = useProjectSystemChecksResults(projectid);

	const { activeSystemChecksCategories = [], isError: isErrorActiveSystemChecksCategories } = useProjectActiveSystemChecks(projectid);

	const { failedQualityGates, isLoading: isLoadingFailedQualityGates, isError: isErrorFailedQualityGates } = useProjectQualityGatesStatus(project?.parentOrganization?._id, project._id, !isLoading);

	const { data: weeklyQualityGatesResults,
		isLoading: isLoadingWeeklyQualityResults,
		isError: isErrorWeeklyQualityResults } = useProjectWeeklyQualityGates(project?.parentOrganization?._id, project._id, !isLoading);

	useDocumentTitle(project?.name && `${project.name} · Cyclopt`);

	// Update week state with current data
	useEffect(() => {
		setWeek((prev) => ({
			...prev,
			numOfWeek: dayjs().subtract(1, "w").week(), // Get the current ISO week number
			startDay: dayjs().subtract(1, "w").startOf("week").format(DATE_FORMAT), // Start of the current week (Sunday by default)
			endDay: dayjs().subtract(1, "w").endOf("week").format(DATE_FORMAT), // End of the current week (Saturday by default)
		}));
	}, [setWeek]);

	const uniqueRepositories = useMemo(() => {
		const repoMap = new Map();

		if (!project.linkedRepositories) return repoMap;
		for (const repo of project.linkedRepositories) {
			const key = `${repo.owner}$$$${repo.name}$$$${repo.productionBranch}$$$${repo.vcType || "git"}`;

			// Check if the key already exists in the map
			if (repoMap.has(key)) {
				// Append the current repo's _id to the existing entry's _ids array
				repoMap.get(key)._ids.push(repo._id);
			} else {
				// Initialize a new entry with the repo data and start an array for the _ids
				repoMap.set(key, { _ids: [repo._id] });
			}
		}

		// Convert the map values back to an array; the values now include the _ids array
		return repoMap;
	}, [project.linkedRepositories]);

	const { totalViolations, totalTimeToFixViolations, overallTotalAnalyses } = useMemo(() => {
		let tV = 0; let tT = 0; let oTA = 0;
		if (!project.linkedRepositories) return { totalViolations: 0, totalTimeToFixViolations: 0, overallTotalAnalyses: 0 };
		for (const repo of project.linkedRepositories) {
			tV += repo.numberOfViolations?.[0] || 0;
			// Sum the time to fix violations
			tT += repo.timeToFixViolations;

			// Sum the total number of analyses
			oTA += repo.totalAnalyses;
		}

		return { totalViolations: tV, totalTimeToFixViolations: tT, overallTotalAnalyses: oTA };
	}, [project.linkedRepositories]);

	const showProjectAnalytics = projectSubscription && project?.analytics?.project;
	// hide quality analytics only if it's a team project and no quality subscription is active
	const showQualityAnalytics = ((project?.type === "team" && qualitySubscription && project?.analytics?.quality)
		|| (project?.type === "personal" && project?.analytics?.quality && (qualitySubscription || project?.linkedRepositories?.some((r) => !r.isPrivate))));

	useEffect(() => {
		if (isError || isErrorSystemChecks || isErrorFailedQualityGates || isErrorActiveSystemChecksCategories || isErrorWeeklyQualityResults) {
			error();
			navigate("/overview");
		}
	}, [error, isError, isErrorSystemChecks, isErrorFailedQualityGates, navigate, isErrorActiveSystemChecksCategories, isErrorWeeklyQualityResults]);
	useEffect(() => {
		(async () => {
			if (!isLoading) {
				setName(project.name);
				if (showProjectAnalytics) {
					const projectMetrics = await loadProjectTaskMetrics(project._id, "default", true);
					setProjectInfo({
						...projectMetrics,
						averageDaysToCloseTask: Number.parseFloat((projectMetrics.averageDaysToCloseTask || 0).toFixed(2), 10),
					});
				}

				setReportOptions((p) => {
					p.availableEmails = [...new Set(project.team.reduce((opts, cur) => {
						const email = cur.user?.email;
						if (email) opts.push(email);
						return opts;
					}, []))];
				});
			}
		})();
	}, [isLoading, project._id, project.name, project.team, setName, setReportOptions, showProjectAnalytics]);

	useEffect(() => {
		if (!isLoading && shouldFetch) {
			const fetchMetrics = async () => {
				try {
					if (uniqueRepositories) {
						const qualitiesUpdates = {};
						const cycloptConfigUpdates = {};

						for (const repository of project.linkedRepositories) {
							const { _id: rid } = repository;
							qualitiesUpdates[rid] = "fetching";
							cycloptConfigUpdates[rid] = "fetching";
						}

						setReposMetaData((prevRepoMetaData) => ({
							...prevRepoMetaData,
							cycloptConfig: { ...prevRepoMetaData.cycloptConfig, ...cycloptConfigUpdates },
						}));
					}

					await Promise.all([...uniqueRepositories]?.map(async (uRepository) => {
						const [uRepoKey, uRepoValues] = uRepository;
						const productionBranch = uRepoKey.split("$$$")[2];
						const { _ids } = uRepoValues;
						const groupedRepoMetaData = await loadRepositoriesMetaData(projectid, _ids, productionBranch);
						for (const repoMetaData of groupedRepoMetaData) {
							const {
								analysesThisWeek: aTW,
								cycloptConfig: cC,
								repoId: rid,
							} = repoMetaData;

							setReposMetaData((prevRepoMetaData) => {
								if (prevRepoMetaData.repoFetched[rid]) return prevRepoMetaData;
								// Updating individual metrics
								const repoFetched = { ...prevRepoMetaData.repoFetched, [rid]: true };
								const analysesThisWeek = { ...prevRepoMetaData.analysesThisWeek, [rid]: aTW };
								const cycloptConfig = { ...prevRepoMetaData.cycloptConfig, [rid]: cC };
								return {
									...prevRepoMetaData,
									repoFetched,
									analysesThisWeek,
									cycloptConfig,
								};
							});
						}
					}));
					setShouldFetch(false);
				} catch {
					error();
					navigate("/projects");
				}
			};

			fetchMetrics().then();
		}
	}, [error, isLoading, navigate, overallTotalAnalyses, project.linkedRepositories, projectid,
		shouldFetch, totalTimeToFixViolations, totalViolations, uniqueRepositories]);

	// compute saved days per branch for all project together
	const cycloptSavedDays = useMemo(() => {
		let productionBranch = 0;
		let stagingBranch = 0;
		if (isLoadingSystemChecks) return { productionBranch, stagingBranch };

		productionBranch = projectSystemChecksResults.groupedPerProject?.["Check Cyclopt Saved Days"]?.achievements.find((obj) => obj.branch === "productionBranch").value || 0;
		stagingBranch = projectSystemChecksResults.groupedPerProject?.["Check Cyclopt Saved Days"]?.achievements.find((obj) => obj.branch === "stagingBranch").value || 0;

		return { productionBranch, stagingBranch };
	}, [isLoadingSystemChecks, projectSystemChecksResults]);

	const attentionRequiredInformation = useMemo(() => {
		if (isLoading || isLoadingSystemChecks) return [];
		return (
			Object.entries(projectSystemChecksResults.groupedPerRepo).map(([repository, checks]) => ({
				_id: repository,
				name: createRepositoryName(project.linkedRepositories.find((lr) => lr._id === repository)),
				velocityChecks: checks?.["Check Velocity"]?.attention || [],
				violationsChecks: (checks?.["Check new Violations"]?.attention || [])
					.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch")),
				vulnerabilitiesChecks: (checks?.["Check new Vulnerabilities"]?.attention || [])
					.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch")),
				characteristicsChecks: (checks?.["Check new Characteristics"]?.attention || [])
					.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch")),
				weeklyQualityGates: weeklyQualityGatesResults?.[repository]?.broken
					?.map(({ qualityGate, repositories }) => {
						// Filter repos based on showStagingBranch state
						const filteredRepos = repositories.filter((repo) => (showStagingBranch && repo.stagingBranch) || (!showStagingBranch && repo.productionBranch));
						// If repos array is empty, remove the entire parent object
						return filteredRepos.length > 0 ? { qualityGate, repositories: filteredRepos } : null;
					})
					.filter(Boolean) // Remove null values
					|| [],
			}))
		);
	}, [isLoading, isLoadingSystemChecks, project.linkedRepositories, projectSystemChecksResults.groupedPerRepo, showStagingBranch, weeklyQualityGatesResults]);

	// in achievements ensure that the value is different than 0 for violations, vulnerabilities and characteristics
	const achievementsInformation = useMemo(() => {
		if (isLoading || isLoadingSystemChecks) return [];
		return (
			Object.entries(projectSystemChecksResults.groupedPerRepo).map(([repository, checks]) => ({
				_id: repository,
				name: createRepositoryName(project.linkedRepositories.find((lr) => lr._id === repository)),
				velocityChecks: checks?.["Check Velocity"]?.achievements || [],
				violationsChecks: (checks?.["Check new Violations"]?.achievements || [])
					.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch") && entry.value),
				vulnerabilitiesChecks: (checks?.["Check new Vulnerabilities"]?.achievements || [])
					.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch") && entry.value),
				characteristicsChecks: (checks?.["Check new Characteristics"]?.achievements || [])
					.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch") && entry.value),
				weeklyQualityGates: weeklyQualityGatesResults?.[repository]?.fixed
					?.map(({ qualityGate, repositories }) => {
						// Filter repos based on showStagingBranch state
						const filteredRepos = repositories.filter((repo) => (showStagingBranch && repo.stagingBranch) || (!showStagingBranch && repo.productionBranch));
						// If repos array is empty, remove the entire parent object
						return filteredRepos.length > 0 ? { qualityGate, repositories: filteredRepos } : null;
					})
					.filter(Boolean) // Remove null values
					|| [],
			}))
		);
	}, [isLoading, isLoadingSystemChecks, project.linkedRepositories, projectSystemChecksResults.groupedPerRepo, showStagingBranch, weeklyQualityGatesResults]);

	// Bring failed Quality Gates into correct form
	// object with keys the repo ids and values qualityGate and repositories
	// repositories is an array to be in alliance with the same procedure for all projects
	const failedQualityGatesPerRepo = useMemo(() => {
		if (isLoadingFailedQualityGates) return {};

		return failedQualityGates.reduce((acc, obj) => {
			if (!acc[obj.repoId]) {
				acc[obj.repoId] = []; // Initialize as an array if it doesn't exist
			}

			const { qualityGate, ...rest } = obj;
			const existingEntry = acc[obj.repoId].find((entry) => entry.qualityGate._id === qualityGate._id);

			if (existingEntry) {
				existingEntry.repositories.push(rest); // Add to existing entry
			} else {
				acc[obj.repoId].push({ qualityGate, repositories: [rest] }); // Create new entry
			}

			return acc;
		}, {});
	}, [failedQualityGates, isLoadingFailedQualityGates]);

	const overallFeedbackInformation = useMemo(() => {
		if (isLoading || isLoadingSystemChecks) return [];
		return (
			Object.entries(projectSystemChecksResults.groupedPerRepo).map(([repository, checks]) => ({
				_id: repository,
				name: createRepositoryName(project.linkedRepositories.find((lr) => lr._id === repository)),
				isOnTrack: Object.values(checks)
					.every((value) => {
						const filteredAttention = value.attention.filter((item) => item.branch === (showStagingBranch ? "stagingBranch" : "productionBranch"));
						const filteredAchievements = value.achievements.filter((item) => item.branch === (showStagingBranch ? "stagingBranch" : "productionBranch"));
						const failedQualityGatesInRepo = failedQualityGatesPerRepo?.[repository]
							?.map(({ qualityGate, repositories }) => {
							// Filter repos based on showStagingBranch state
								const filteredRepos = repositories.filter((repo) => (showStagingBranch && repo.stagingBranch) || (!showStagingBranch && repo.productionBranch));
								// If repos array is empty, remove the entire parent object
								return filteredRepos.length > 0 ? { qualityGate, repositories: filteredRepos } : null;
							})
							.filter(Boolean) // Remove null values
						|| [];
						return (
							Array.isArray(filteredAttention)
								&& filteredAttention.length === 0
								&& Array.isArray(filteredAchievements)
								&& filteredAchievements.length > 0
								&& failedQualityGatesInRepo.length === 0
						);
					}),
				violationsChecks: (checks?.["Check Violations"]?.attention || [])
					.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch")),
				vulnerabilitiesChecks: (checks?.["Check Vulnerabilities"]?.attention || [])
					.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch")),
				characteristicsChecks: (checks?.["Check Characteristics"]?.attention || [])
					.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch")),
				failedQualityGates: failedQualityGatesPerRepo?.[repository]
					?.map(({ qualityGate, repositories }) => {
						// Filter repos based on showStagingBranch state
						const filteredRepos = repositories.filter((repo) => (showStagingBranch && repo.stagingBranch) || (!showStagingBranch && repo.productionBranch));
						// If repos array is empty, remove the entire parent object
						return filteredRepos.length > 0 ? { qualityGate, repositories: filteredRepos } : null;
					})
					.filter(Boolean) // Remove null values
					|| [],
			}))
		);
	}, [failedQualityGatesPerRepo, isLoading, isLoadingSystemChecks, project.linkedRepositories, projectSystemChecksResults, showStagingBranch]);

	const tableColumns = useMemo(() => [
		{
			field: "Repository Name",
			minWidth: 200,
			flex: 1,
			align: "left",
			valueGetter: ({ row }) => `${row.owner}/${row.name}`,
			renderCell: ({ row, value }) => {
				const isEligible = (() => {
					if (!row.isPrivate) return true;

					return eligibleLanguages?.includes(row.language) && qualitySubscription;
				})();

				return (
					<Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
						{reposMetaData.analysesThisWeek?.[row._id] ? (
							<Tooltip title={`Active repository! ${pluralize("analysis", reposMetaData.analysesThisWeek?.[row._id], true)} ${pluralize("was", row.analysesThisWeek)} made in the last week, across all branches.`}>
								<span><Pulse /></span>
							</Tooltip>
						) : null}
						<Box>
							<Typography align="left">
								{`${value}${(row.root === "." ? "" : `/${row.root.replace(/^\//, "")}`)}`}
								<MuiLink
									href={getRepoUrl(type, { selectedBranch: row.productionBranch, ...row })}
									target="_blank"
									rel="noopener noreferrer"
									underline="none"
								>
									<IconButton size="small">
										{type === "github"
											? <GitHub style={{ fontSize: "inherit" }} />
											: type === "bitbucket"
												? <BitBucketIcon style={{ fontSize: "inherit" }} />
												: type === "azure"
													? <AzureIcon style={{ fontSize: "inherit" }} />
													: type === "gitlab" && <GitLabIcon style={{ fontSize: "inherit" }} />}
									</IconButton>
								</MuiLink>
							</Typography>
							<Typography
								variant="caption"
								sx={{
									fontSize: "body4",
									wordWrap: "break-word",
									whiteSpace: "normal",
									display: "inline-flex",
									float: "left",
									alignItems: "center",
								}}
							>
								<Tooltip title="Production branch">
									<FlashOn sx={{ fontSize: "body1.fontSize", color: "primary.main" }} />
								</Tooltip>
								{row.productionBranch}
							</Typography>
							<Box style={{ float: "right" }}>
								{isEligible
									? null
									: (
										<Tooltip title="Based on your plan, this repository is NOT eligible for analysis.">
											<Dangerous sx={{ fontSize: "body1.fontSize", color: "red.500" }} />
										</Tooltip>
									)}
								<Tooltip title={`This repository is ${row.isPrivate ? "private" : "public"}.`}>
									{row.isPrivate
										? <PublicOff sx={{ fontSize: "body1.fontSize", color: "primary.main" }} />
										: <Public sx={{ fontSize: "body1.fontSize", color: "primary.main" }} />}
								</Tooltip>
								{(reposMetaData.cycloptConfig?.[row._id] === "fetching")
									? <CircularProgress size="1rem" />
									: reposMetaData.cycloptConfig?.[row._id]
										? <Tooltip title="Config file is used."><ContentPaste sx={{ fontSize: "body1.fontSize", color: "secondary.main" }} /></Tooltip>
										: <Tooltip title="Config file is not used."><ContentPasteOff sx={{ fontSize: "body1.fontSize", color: "secondary.main" }} /></Tooltip>}
								&nbsp;
							</Box>
						</Box>
						{row.root.endsWith("sln") && (
							<Tooltip
								sx={{ maxHeight: "250px", overflowY: "auto" }}
								title={
									row.csProjects.map((key, index) => (
										<div key={index}>
											{`${index + 1}:${key}`}
										</div>
									))
								}

							>
								<Info sx={{ fontSize: "body1.fontSize", color: "primary.main" }} />
							</Tooltip>
						)}
					</Box>
				);
			},
		},
		{
			field: "Language",
			width: 140,
			valueGetter: ({ row }) => row.language,
			renderCell: ({ value }) => <Typography>{value || <Remove style={{ fontSize: "inherit" }} />}</Typography>,
		},
		{
			field: "Quality Score",
			valueGetter: ({ row }) => row?.overallQualityScore,
			type: "number",
			width: 170,
			renderCell: ({ row, value }) => {
				const quality = convertQualityScoreToLetter(value);
				const qualityAvatar = convertQualityScoreToAvatar(value);
				return showQualityAnalytics ? (
					<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "auto" }}>
						<Tooltip followCursor arrow={false} enterDelay={1000} enterNextDelay={1000} title="Jump to Quality Page">
							<MuiLink
								underline="none"
								component={(quality === "-") ? "span" : Link}
								to={`/projects/${project?._id}/quality-analytics/${row._id}`}
								onClick={() => setBranchName(row.productionBranch)}
							>
								<Avatar
									sx={{
										bgcolor: getColorForQualityScore((quality === "-") ? Number.NaN : value),
										display: "inline-flex",
										fontSize: "h6",
									}}
								>
									{qualityAvatar || <Remove style={{ fontSize: "inherit" }} />}
								</Avatar>
							</MuiLink>
						</Tooltip>
					</Box>
				) : <Remove style={{ fontSize: "inherit" }} />;
			},
		},
		{
			field: "Analyses",
			type: "number",
			valueGetter: ({ row }) => row.totalAnalyses || 0,
			width: 130,
		},
		{
			field: "Last Update",
			type: "date",
			valueGetter: ({ row }) => (
				(row.updatedAt) ? new Date(row?.updatedAt) : null
			),
			width: 190,
			renderCell: ({ value }) => (value ? <Typography>{dayjs(value).fromNow()}</Typography> : null),
		},
	], [reposMetaData.analysesThisWeek, reposMetaData.cycloptConfig, type, showQualityAnalytics, pathname, setBranchName]);

	return (
		<>
			{isLoading && (<LinearProgress color="primary" />)}
			<Grid container className="container" direction="column">
				<Grid item container justifyContent="center" spacing={3} mt={1} mb={2}>
					{project?.parentOrganization?.cycloptSpecifics?.teamSizeExceededMessage
						&& project?.parentOrganization?.members.length > project.parentOrganization?.subscription?.platform?.seats
						&& (
							<Grid item xs={12}>
								<Box sx={{ my: 2 }}>
									<Alert severity="warning" variant="filled">
										<AlertTitle>
											<Typography variant="h6" fontWeight="bold">
												{"Watch out!"}
											</Typography>
										</AlertTitle>
										<Typography>
											{`Your team has ${project.parentTeam.members.length} members, but has only purchased ${pluralize("seat", project.parentOrganization?.subscription?.platform?.seats, true)}. 30 days after the limit was exceeded, Cyclopt will stop analysing your commits. `}
											<MuiLink component={Link} href="mailto:info@cyclopt.com" fontWeight="bold">
												{"Contact us"}
											</MuiLink>
											{" to purchase more."}
										</Typography>
									</Alert>
								</Box>
							</Grid>
						)}
				</Grid>
				<Grid item container justifyContent="center" spacing={2} sx={{ marginBottom: "6rem" }}>
					{
						showProjectAnalytics && (
							<>
								<InfoTile imageSrc={TaskImage} value={projectInfo.totalOpenTasks} label="open tasks" />
								<InfoTile imageSrc={TaskImage} value={projectInfo.newTasksThisWeek} label="new tasks this week" />
								<InfoTile
									imageSrc={TaskImage}
									value={
										projectInfo.averageTasksClosedPerDay && Number.parseFloat(projectInfo.averageTasksClosedPerDay.toFixed(2), 10)
									}
									label="tasks delivered per day"
								/>
								<InfoTile imageSrc={TaskImage} value={projectInfo.averageDaysToCloseTask} label="mean time to close tasks (days)" />
							</>
						)
					}
					<Grid item container justifyContent="center" spacing={2} sx={{ marginBottom: "6rem" }}>
						<QualityTiles project={project} />
					</Grid>
				</Grid>
				{
					showQualityAnalytics && (
						<>
							<WeekInfoWithBranchSwitch currentWeek={week} showStagingBranch={showStagingBranch} setShowStagingBranch={setShowStagingBranch} cycloptSavedDays={cycloptSavedDays} parentContainerSx={{ mt: "2rem", mb: "1rem" }} />
							<OverviewSection isAttention title="attention required" info={attentionRequiredInformation} projectId={project._id} isLoading={isLoadingSystemChecks || isLoading} isLoadingWeeklyQualityResults={isLoadingWeeklyQualityResults} />
							<OverviewSection title="achievements" info={achievementsInformation} projectId={project._id} isLoading={isLoadingSystemChecks || isLoading} isLoadingWeeklyQualityResults={isLoadingWeeklyQualityResults} />
							<Grid item width="100%" textAlign="center" p={1} mt={2} mb={2} sx={{ backgroundColor: (t) => t.palette.grey.light }}>
								<Typography variant="body1" sx={{ fontStyle: "italic" }}>
									{"The following section provides useful insights about the current state of your repositories!"}
								</Typography>
							</Grid>
							<CompanionAccordion
								defaultExpanded={false}
								title="Show Bigger Picture"
								tooltip="Check out important things about the current state of your repositories refering to selected branch!"
								component={(
									<OverviewOverallSection title="Select fields to monitor" activeSystemChecksCategories={activeSystemChecksCategories} info={overallFeedbackInformation} projectId={project._id} isLoading={isLoading || isLoadingSystemChecks} isLoadingQualityGates={isLoadingFailedQualityGates} />
								)}
							/>
						</>
					)
				}
				<Grid item width="100%" textAlign="center" mt={3} mb={4}>
					<Typography variant="h6">
						<em>
							{"The provided metrics refer to the "}
							<MuiLink component={Link} to={`/projects/${project?._id}/settings`} underline="none">{"production"}</MuiLink>
							{" branch of each repository."}
						</em>
					</Typography>
				</Grid>
				<Grid item container flexDirection="row" justifyContent="flex-start" alignItems="center">
					<Grid item hidden={project.type !== "team"} mt={1} mb={1} mr={2}>
						<Typography variant="h5">{"Project collaborators: "}</Typography>
					</Grid>
					{project.team?.map(({ role, user: { username, _id, avatar } }, ind) => (
						<Box
							key={`${username}_${ind}_${_id}`}
							className="member-avatar"
							sx={{
								cursor: "pointer",
								position: "relative",
								marginLeft: (ind % 20) === 0 ? 0 : "-20px", // Reset margin at start of new line
								transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
								zIndex: 1,
								"&:hover": {
									zIndex: 10,
									"& .avatar-container": {
										transform: "scale(1.1)",
										marginRight: "25px",
									},
								},
								"&:hover ~ .member-avatar": {
									transform: "translateX(30px)", // Reduced push distance for multi-line
								},
							}}
						>
							<Box
								component={Link}
								to={`/projects/${project?._id}/project-analytics/collaborators/${_id}`}
								className="avatar-container"
								sx={{
									position: "relative",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									textDecoration: "none",
									transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
								}}
							>
								<Box
									sx={{
										position: "absolute",
										top: "-20px",
										backgroundColor: "rgba(0,0,0,0.8)",
										color: "white",
										padding: "4px 8px",
										borderRadius: "4px",
										fontSize: "12px",
										whiteSpace: "nowrap",
										opacity: 0,
										transform: "translateY(10px)",
										transition: "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
										pointerEvents: "none",
										zIndex: 200,
										".member-avatar:hover &": {
											opacity: 1,
											transform: "translateY(0)",
										},
									}}
								>
									<Typography variant="caption" sx={{ color: "white", fontWeight: "bold" }}>
										{username}
									</Typography>
								</Box>
								<Image
									src={avatar}
									alt={`${username} (${role})`}
									title={`${username} (${role})`}
									width="40px"
									height="40px"
									wrapperStyle={{
										border: "3px solid white",
										backgroundColor: "white",
										borderRadius: "50%",
										boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
									}}
									sx={{ borderRadius: "50%" }}
								/>
							</Box>
						</Box>
					))}
					{type !== "cyclopt" && (
						<Grid item style={{ display: "flex", margin: "auto", marginRight: 0, marginBottom: "0.5rem" }}>
							<MuiLink underline="none" component={Link} to={`/projects/${project?._id}/settings`}>
								<PinkBackgroundButton
									variant="outlined"
									size="medium"
									style={{ justifySelf: "flex-end" }}
								>
									{"Add repo"}
								</PinkBackgroundButton>
							</MuiLink>
						</Grid>
					)}
				</Grid>
				<Grid item width="100%">
					<DataTable
						rows={isLoading ? [] : project?.linkedRepositories}
						loading={isLoading}
						columns={tableColumns}
						initialState={{ sorting: { sortModel: [{ field: "Last Update", sort: "desc" }] }, pagination: { paginationModel: { page: 0 } } }}
					/>
				</Grid>
			</Grid>
			<Dialog
				fullWidth
				TransitionComponent={Zoom}
				open={reportOptions.open}
				onClose={() => setReportOptions((p) => ({ ...initialReportOptions, availableEmails: p.availableEmails }))}
			>
				<DialogTitle>
					{"Generate Cyclopt Report"}
				</DialogTitle>
				<DialogContent>
					<Autocomplete
						multiple
						clearText="Remove All"
						size="small"
						renderInput={(params) => (
							<TextField
								{...params}
								variant="outlined"
								placeholder="Press to select an email..."
							/>
						)}
						id="reportEmail"
						value={reportOptions.emails}
						options={reportOptions.availableEmails}
						renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => (
							<Chip
								key={`${option}_${index}`}
								size="small"
								label={option}
								{...getTagProps({ index })}
								sx={{ opacity: 1, bgcolor: "grey.light" }}
							/>
						))}
						getOptionLabel={(option) => option.title || option}
						onChange={(_, newValue) => setReportOptions((p) => ({
							...p,
							emails: [...new Set(newValue.map((e) => (e.title ? e.inputValue : e)))],
						}))}
					/>
					<Box sx={{ display: "flex", alignItems: "center" }} />
					<Grid container display="flex" justifyContent="center">
						<Grid item display="flex" px={1} alignItems="center">
							<Checkbox
								checked={reportOptions.criticalViolations}
								onClick={() => setReportOptions((p) => ({ ...p, criticalViolations: !p.criticalViolations }))}
							/>
							<Typography variant="h6" style={{ fontSize: "1rem" }}>{"Include Critical Violations report"}</Typography>
						</Grid>
						<Grid container display="flex" justifyContent="center">
							<Grid item px={1}>
								<label className="label" htmlFor="points_done">
									{"From:"}
								</label>
								<MobileDatePicker
									disableFuture // Disable dates in the future
									minDate={dayjs().utc().subtract(2, "month")}
									maxDate={dayjs().utc()}
									format={DATE_FORMAT}
									slotProps={{
										actionBar: { actions: ["cancel", "accept"] },
										textField: { size: "small", error: false },
									}}
									value={reportOptions.date}
									slots={{
										textField: ({ value, ...tprops }) => (
											<TextField {...tprops} value={dayjs(value).isValid() ? value : ""} />
										),
									}}
									onAccept={(date) => { setReportOptions((p) => ({ ...p, date })); }}
								/>
							</Grid>
							<Grid item px={1}>
								<label className="label" htmlFor="points_done">
									{"To:"}
								</label>
								<MobileDatePicker
									disabled
									disableFuture // Disable dates in the future
									format={DATE_FORMAT}
									slotProps={{
										textField: { size: "small", error: false },
									}}
									value={dayjs()}
									slots={{
										textField: ({ value, ...tprops }) => (
											<TextField {...tprops} value={dayjs(value).isValid() ? value : ""} />
										),
									}}
								/>
							</Grid>
						</Grid>

					</Grid>
				</DialogContent>
				<DialogActions>
					<LoadingButton
						disabled={reportOptions.emails.length === 0}
						loading={reportOptions.loading}
						variant="contained"
						startIcon={<Summarize />}
						sx={{ m: 0.5 }}
					>
						{"Send"}
					</LoadingButton>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default memo(ProjectInfo);
