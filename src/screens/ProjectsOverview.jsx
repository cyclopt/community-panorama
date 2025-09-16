/* eslint-disable max-len */
import { useCallback, useEffect, memo, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Typography, Grid, Link as MaterialLink } from "@mui/material";
import { Error } from "@mui/icons-material";
import { shallow } from "zustand/shallow";
import queryString from "query-string";
import { useTour } from "@reactour/tour";

import { jwt, useSnackbar, dayjs, DATE_FORMAT, addProjectSteps, OverviewInfo } from "../utils/index.js";
import ProjectsTiles from "../components/ProjectsTiles.jsx";
import OverviewSection from "../components/OverviewSection.jsx";
import OverviewOverallSection from "../components/OverviewOverallSection.jsx";
import CompanionAccordion from "../components/Accordion.jsx";
import WeekInfoWithBranchSwitch from "../components/WeekInfoWithBranchSwitch.jsx";
import useGlobalState from "../use-global-state.js";
import { useProjects, useRegisterTour, useProjectsAnalytics, useSystemChecksResults, useUserFailedQualityGates, useProjectsActiveSystemChecks, useUserWeeklyQualityGates } from "../api/index.js";

const ProjectsOverview = () => {
	const { setIsOpen, setSteps, setCurrentStep, currentStep } = useTour();
	const { type = "github" } = jwt.decode();
	const { shouldFetch } = useGlobalState(useCallback((e) => ({
		setShowNotificationBadge: e.setShowNotificationBadge,
		shouldFetch: e.shouldFetch,
	}), []), shallow);
	const { search, pathname } = useLocation();
	const navigate = useNavigate();
	const { username } = jwt.decode();
	const { error } = useSnackbar();
	const token = jwt.getToken();
	const { projects = [], isLoading, isError } = useProjects(true, true, false);
	const {
		projectsAnalytics = {},
		isError: isErrorProjectAnalytics,
	} = useProjectsAnalytics();

	const { data: weeklyQualityGatesResults,
		isLoading: isLoadingWeeklyQualityResults,
		isError: isErrorWeeklyQualityResults } = useUserWeeklyQualityGates();

	const { data: failedQualityGates = {},
		isLoading: isLoadingFailedQualityGates,
		isError: isErrorFailedQualityGates } = useUserFailedQualityGates();

	const { data: systemChecksResults = {},
		isLoading: isLoadingSystemChecks,
		isError: isErrorSystemChecks } = useSystemChecksResults();

	const { activeSystemChecksCategories = [], isError: isErrorActiveSystemChecksCategories } = useProjectsActiveSystemChecks();

	const { isTourRegistered, mutate: tourMutate } = useRegisterTour(token, shouldFetch);
	const [showStagingBranch, setShowStagingBranch] = useState(false);
	const [week, setWeek] = useState({
		numOfWeek: 0,
		startDay: "",
		endDay: "",
	});

	// this useEffect is for starting the tour if the user sign in for the first time
	useEffect(() => {
		const parsed = queryString.parse(search);
		parsed.tour = "addProject";
		if (isTourRegistered && !isLoading) {
			navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
			tourMutate();
		}
	}, [isTourRegistered]); // eslint-disable-line react-hooks/exhaustive-deps

	const memoizedAddProjectSteps = useMemo(() => addProjectSteps(
		username,
		type,
		navigate,
	),
	// eslint-disable-next-line react-hooks/exhaustive-deps
	[type, username]);

	useEffect(() => {
		const parsed = queryString.parse(search);
		if (!isLoading && parsed.tour === "addProject") {
			setSteps(memoizedAddProjectSteps);
			setIsOpen(true);
		} else {
			setIsOpen(false);
		}

		if (parsed.tourStep !== currentStep) {
			setCurrentStep(Number(parsed.tourStep));
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoading, search, currentStep, memoizedAddProjectSteps]);

	useEffect(() => {
		if (isError || isErrorProjectAnalytics || isErrorSystemChecks || isErrorFailedQualityGates || isErrorActiveSystemChecksCategories || isErrorWeeklyQualityResults) error();
	}, [error, isError, isErrorFailedQualityGates, isErrorProjectAnalytics, isErrorSystemChecks, isErrorActiveSystemChecksCategories, isErrorWeeklyQualityResults]);

	// Update week state with current data
	useEffect(() => {
		setWeek((prev) => ({
			...prev,
			numOfWeek: dayjs().subtract(1, "w").week(), // Get the current ISO week number
			startDay: dayjs().subtract(1, "w").startOf("week").format(DATE_FORMAT), // Start of the current week (Sunday by default)
			endDay: dayjs().subtract(1, "w").endOf("week").format(DATE_FORMAT), // End of the current week (Saturday by default)
		}));
	}, [setWeek]);

	// calculate the number of quality gates failed
	// each quality gate can fail in multiple repositories but will be counted once
	const uniqueFailedQualityGates = OverviewInfo.useUniqueFailedQualityGates(
		failedQualityGates,
		isLoadingFailedQualityGates,
		showStagingBranch,
	);

	const cycloptSavedDays = OverviewInfo.useSavedDays(systemChecksResults, isLoadingSystemChecks);

	const attentionRequiredInformation = OverviewInfo.useWeeklyInformation(
		projects,
		systemChecksResults,
		weeklyQualityGatesResults,
		isLoading || isLoadingSystemChecks,
		showStagingBranch,
		"attention",
	);

	const achievementsInformation = OverviewInfo.useWeeklyInformation(
		projects,
		systemChecksResults,
		weeklyQualityGatesResults,
		isLoading || isLoadingSystemChecks,
		showStagingBranch,
		"achievements",
	);

	const overallFeedbackInformation = OverviewInfo.useOverallInformation(
		projects,
		systemChecksResults,
		failedQualityGates,
		isLoading || isLoadingSystemChecks,
		showStagingBranch,
	);

	return (
		<section style={{ paddingTop: "1rem" }}>
			<div className="container">
				<Typography gutterBottom variant="h4">{`Hi there, ${username || ":-)"}`}</Typography>
				<ProjectsTiles
					activeProjects={projects.filter((e) => e.isShown).length}
					failedQualityGates={uniqueFailedQualityGates}
					totalAnalyses={projectsAnalytics.analysesThisWeek || 0}
					cycloptSavedDays={showStagingBranch ? cycloptSavedDays.stagingBranch : cycloptSavedDays.productionBranch}
					sx={{ marginBottom: "6rem" }}
				/>
				<Grid container direction="row" justifyContent={["cyclopt", "bitbucket", "azure"].includes(type) ? "flex-end" : "space-between"} alignItems="center" mb={2}>
					<Grid item hidden={type !== "github"}>
						<Typography display="flex" alignItems="center">
							<Error color="primary" sx={{ mr: 0.5 }} />
							{"Want to keep commits in sync?"}
							&nbsp;
							<MaterialLink
								href={import.meta.env.VITE_MAIN_SERVER_URL}
								target="_blank"
								rel="noopener noreferrer"
								underline="none"
							>
								{"Configure the Cyclopt app on Github"}
							</MaterialLink>
							{"."}
						</Typography>
					</Grid>
					<Grid item hidden={type === "gitlab"}>
						<Typography display="flex" alignItems="center">
							<Error color="primary" sx={{ mr: 0.5 }} />
							{"Want to keep commits in sync?"}
							&nbsp;
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
					</Grid>
				</Grid>
				<WeekInfoWithBranchSwitch currentWeek={week} showStagingBranch={showStagingBranch} setShowStagingBranch={setShowStagingBranch} cycloptSavedDays={cycloptSavedDays} parentContainerSx={{ py: "1rem" }} />
				<OverviewSection isAttention title="attention required" info={attentionRequiredInformation} isLoading={isLoading || isLoadingSystemChecks} isLoadingQualityGates={isLoadingFailedQualityGates} isLoadingWeeklyQualityResults={isLoadingWeeklyQualityResults} />
				<OverviewSection title="achievements" info={achievementsInformation} isLoading={isLoading || isLoadingSystemChecks} isLoadingQualityGates={isLoadingFailedQualityGates} isLoadingWeeklyQualityResults={isLoadingWeeklyQualityResults} />
				<Grid item width="100%" textAlign="center" p={1} mt={2} mb={2} sx={{ backgroundColor: (t) => t.palette.grey.light }}>
					<Typography variant="body1" sx={{ fontStyle: "italic" }}>
						{"The following section provides useful insights about the current state of your projects!"}
					</Typography>
				</Grid>
				<CompanionAccordion
					defaultExpanded={false}
					title="Show Bigger Picture"
					tooltip="Check out important things about the current state of your projects refering to selected branch!"
					component={(
						<OverviewOverallSection title="Select fields to monitor" activeSystemChecksCategories={activeSystemChecksCategories} info={overallFeedbackInformation} isLoading={isLoading || isLoadingSystemChecks} isLoadingQualityGates={isLoadingFailedQualityGates} />
					)}
				/>
			</div>
		</section>
	);
};

export default memo(ProjectsOverview);
