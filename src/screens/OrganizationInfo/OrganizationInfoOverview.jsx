import { memo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Grid, Typography, Box } from "@mui/material";
import { Image } from "mui-image";

import ProjectsTiles from "../../components/ProjectsTiles.jsx";
import WeekInfoWithBranchSwitch from "../../components/WeekInfoWithBranchSwitch.jsx";
import OverviewSection from "../../components/OverviewSection.jsx";
import OverviewOverallSection from "../../components/OverviewOverallSection.jsx";
import CompanionAccordion from "../../components/Accordion.jsx";
import { useSnackbar, dayjs, DATE_FORMAT, OverviewInfo } from "../../utils/index.js";
import { useSystemChecksResults, useProjectsActiveSystemChecks, useUserFailedQualityGates, useUserWeeklyQualityGates } from "../../api/index.js";

const OrganizationInfoOverview = (props) => {
	const { organization } = props;

	const { data: systemChecksResults = {},
		isLoading: isLoadingSystemChecks,
		isError: isErrorSystemChecks } = useSystemChecksResults(organization._id);

	const {
		activeSystemChecksCategories = [],
		isError: isErrorActiveSystemChecksCategories,
	} = useProjectsActiveSystemChecks(organization._id);

	const { data: failedQualityGates = {},
		isLoading: isLoadingFailedQualityGates,
		isError: isErrorFailedQualityGates } = useUserFailedQualityGates(true, true, organization._id);

	const { data: weeklyQualityGatesResults,
		isLoading: isLoadingWeeklyQualityResults,
		isError: isErrorWeeklyQualityResults } = useUserWeeklyQualityGates(true, true, organization._id);

	const [showStagingBranch, setShowStagingBranch] = useState(false);
	const [week, setWeek] = useState({
		numOfWeek: 0,
		startDay: "",
		endDay: "",
	});

	const { error } = useSnackbar();

	useEffect(() => {
		if (isErrorSystemChecks
			|| isErrorFailedQualityGates || isErrorActiveSystemChecksCategories || isErrorWeeklyQualityResults) error();
	}, [error, isErrorFailedQualityGates, isErrorSystemChecks, isErrorActiveSystemChecksCategories, isErrorWeeklyQualityResults]);

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
		organization?.teams?.flatMap((team) => team?.projects),
		systemChecksResults,
		weeklyQualityGatesResults,
		isLoadingSystemChecks,
		showStagingBranch,
		"attention",
	);

	const achievementsInformation = OverviewInfo.useWeeklyInformation(
		organization?.teams?.flatMap((team) => team?.projects),
		systemChecksResults,
		weeklyQualityGatesResults,
		isLoadingSystemChecks,
		showStagingBranch,
		"achievements",
	);

	const overallFeedbackInformation = OverviewInfo.useOverallInformation(
		organization?.teams?.flatMap((team) => team?.projects),
		systemChecksResults,
		failedQualityGates,
		isLoadingSystemChecks,
		showStagingBranch,
	);

	return (
		<div className="container">
			<Box width="100%" mb={3}>
				<Grid container xs={12} sx={{ "> .MuiGrid-item": { p: 1, ":first-child": { pl: 0 }, ":last-child": { pr: 0 } } }}>
					<ProjectsTiles
						totalProjects={organization?.totalProjects}
						failedQualityGates={uniqueFailedQualityGates}
						totalRepositories={organization?.totalRepositories}
						cycloptSavedDays={showStagingBranch ? cycloptSavedDays.stagingBranch : cycloptSavedDays.productionBranch}
						sx={{ marginBottom: "6rem" }}
					/>
				</Grid>
			</Box>
			<Grid container direction="row" mb={2}>
				<Grid item xs={12} sm={9} display="flex" alignItems="center">
					<Typography variant="h5">{"Organization members:"}</Typography>
					<Box
						sx={{
							display: "flex",
							flexDirection: "row",
							flexWrap: "wrap",
							alignItems: "flex-start",
							justifyContent: "flex-start",
							overflow: "visible",
							padding: "20px",
							paddingRight: "20px",
							minHeight: "80px",
							gap: "5px 0",
							maxWidth: "100%",
						}}
					>
						{organization.members.map(({ user: { username: usrname, _id, avatar }, role }, ind) => (
							<Box
								key={`${usrname}_${ind}_${_id}`}
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
									to={`../team-analytics/${_id}`}
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
											{usrname}
										</Typography>
									</Box>
									<Image
										src={avatar}
										alt={`${usrname} (${role})`}
										title={`${usrname} (${role})`}
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
					</Box>
				</Grid>
			</Grid>
			<WeekInfoWithBranchSwitch currentWeek={week} showStagingBranch={showStagingBranch} setShowStagingBranch={setShowStagingBranch} parentContainerSx={{ py: "1rem" }} />
			<OverviewSection isAttention title="attention required" info={attentionRequiredInformation} isLoading={isLoadingSystemChecks} isLoadingQualityGates={isLoadingFailedQualityGates} isLoadingWeeklyQualityResults={isLoadingWeeklyQualityResults} />
			<OverviewSection title="achievements" info={achievementsInformation} isLoading={isLoadingSystemChecks} isLoadingQualityGates={isLoadingFailedQualityGates} isLoadingWeeklyQualityResults={isLoadingWeeklyQualityResults} />
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
					<OverviewOverallSection title="Select fields to monitor" activeSystemChecksCategories={activeSystemChecksCategories} info={overallFeedbackInformation} isLoading={isLoadingSystemChecks} isLoadingQualityGates={isLoadingFailedQualityGates} />
				)}
			/>
		</div>
	);
};

OrganizationInfoOverview.propTypes = {
	organization: PropTypes.object,
};

export default memo(OrganizationInfoOverview);
