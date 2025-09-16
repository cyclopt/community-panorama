
import { Grid, Link as MaterialLink, LinearProgress } from "@mui/material";
import { useMemo } from "react";
import PropTypes from "prop-types";
import pluralize from "pluralize";
import { Link } from "react-router-dom";

import CongratsImage from "../assets/images/filled_check_box.png";
import FailureImage from "../assets/images/severities/critical.png";
import { constructMessage, constructCharacteristicsMessage } from "../utils/index.js";

import ComponentOverviewItem from "./ComponentOverviewItem.jsx";
import SectionTitle from "./SectionTitle.jsx";

const OverviewSection = ({ title, info,
	isAttention = false, isLoading, isLoadingQualityGates, isLoadingWeeklyQualityResults, projectId = null }) => {
	const isProjectView = Boolean(projectId);
	const isOverallFeedback = title === "OVERALL FEEDBACK";
	const projectOrRepository = projectId ? "Repository" : "Project";
	const linkTemplate = projectId ? `/projects/${projectId}/quality-analytics/` : "/projects/";

	const mentionVelocityComponents = useMemo(() => {
		if (isLoading) return [];
		return isProjectView || isOverallFeedback ? [] : info.filter((project) => project.velocityChecks.length > 0);
	}, [isLoading, isProjectView, isOverallFeedback, info]);

	const mentionViolationsComponents = useMemo(() => {
		if (isLoading) return [];
		return info.filter((component) => component.violationsChecks.length > 0);
	}, [isLoading, info]);

	const mentionVulnerabilitiesComponents = useMemo(() => {
		if (isLoading) return [];
		return info.filter((component) => component.vulnerabilitiesChecks.length > 0);
	}, [isLoading, info]);

	const mentionCharacteristicsComponents = useMemo(() => {
		if (isLoading) return [];
		return info.filter((component) => component.characteristicsChecks.length > 0);
	}, [isLoading, info]);

	const mentionFailedQualityGatesComponents = useMemo(() => {
		if (isLoadingQualityGates) return [];
		return info.filter((component) => (component.failedQualityGates ?? []).length > 0);
	}, [info, isLoadingQualityGates]);

	const mentionWeeklyQualityGatesResultsComponents = useMemo(() => {
		if (isLoadingWeeklyQualityResults) return [];
		return info.filter((component) => (component.weeklyQualityGates ?? []).length > 0);
	}, [info, isLoadingWeeklyQualityResults]);

	const mentionOnTrackComponents = useMemo(() => {
		if (isLoading) return [];
		return info.filter((component) => (component?.isOnTrack));
	}, [info, isLoading]);

	// check if no components have additional information
	// in that case we show a custom message
	const nothingToShow = useMemo(() => (
		mentionVelocityComponents.length === 0
			&& mentionViolationsComponents.length === 0
			&& mentionVulnerabilitiesComponents.length === 0
			&& mentionCharacteristicsComponents.length === 0
			&& (
				isOverallFeedback || (
					mentionFailedQualityGatesComponents.length === 0
					&& mentionWeeklyQualityGatesResultsComponents.length === 0
						&& mentionOnTrackComponents.length === 0
				)
			)
	), [
		mentionVelocityComponents,
		mentionViolationsComponents,
		mentionVulnerabilitiesComponents,
		mentionCharacteristicsComponents,
		isOverallFeedback,
		mentionFailedQualityGatesComponents,
		mentionWeeklyQualityGatesResultsComponents,
		mentionOnTrackComponents,
	]);

	return (
		<SectionTitle
			isLoading={isLoading}
			title={title}
			noDataMessage={nothingToShow ? "changes" : null}
		>
			{ isLoadingWeeklyQualityResults && (<LinearProgress sx={{ "& .MuiLinearProgress-bar": { bgcolor: "black" }, my: "0.5rem" }} />)}
			<Grid sx={{ maxHeight: "300px", overflow: "auto" }}>

				{mentionVelocityComponents.map((component) => (
					<ComponentOverviewItem
						key={`velocity-component-${component.name}`}
						component={component}
						link={`${linkTemplate}${component._id}`}
						imageSrc={isAttention
							? FailureImage
							: CongratsImage}
						message={`velocity is ${isAttention ? "low" : "high"}!`}
						projectOrRepository={projectOrRepository}
					/>
				))}

				{mentionViolationsComponents.map((component) => (
					<ComponentOverviewItem
						key={`violations-component-${component.name}`}
						component={component}
						link={`${linkTemplate}${component._id}`}
						imageSrc={isAttention
							? FailureImage
							: CongratsImage}
						message={constructMessage(component.violationsChecks, "violation", isAttention, isOverallFeedback)}
						projectOrRepository={projectOrRepository}
					/>
				))}

				{mentionVulnerabilitiesComponents.map((component) => (
					<ComponentOverviewItem
						key={`vulnerabilities-component-${component.name}`}
						component={component}
						link={`${linkTemplate}${component._id}`}
						imageSrc={isAttention
							? FailureImage
							: CongratsImage}
						message={constructMessage(component.vulnerabilitiesChecks, "vulnerability", isAttention, isOverallFeedback)}
						projectOrRepository={projectOrRepository}
					/>
				))}

				{mentionCharacteristicsComponents.map((component) => (
					<ComponentOverviewItem
						key={`vulnerabilities-component-${component.name}`}
						component={component}
						link={`${linkTemplate}${component._id}`}
						imageSrc={isAttention
							? FailureImage
							: CongratsImage}
						message={constructCharacteristicsMessage(component.characteristicsChecks, isAttention)}
						projectOrRepository={projectOrRepository}
					/>
				))}

				{mentionWeeklyQualityGatesResultsComponents.map((component) => (
					<ComponentOverviewItem
						key={`feedback-repo-${component.name}-quality-gate`}
						link={`${linkTemplate}${component._id}`}
						component={component}
						imageSrc={isAttention
							? FailureImage
							: CongratsImage}
						message={`${isAttention ? "broke" : `${pluralize("was", component.weeklyQualityGates.length)} fixed`} this week!`}
						projectOrRepository={projectOrRepository}
						qualityGatesLinkComponent={(
							<MaterialLink
								component={Link}
								underline="none"
								state={{
									failedQualityGates: component.weeklyQualityGates
										.flatMap(({ qualityGate, repositories }) => repositories.map((repo) => ({
											qualityGate: { _id: qualityGate._id, name: qualityGate.name },
											repoId: repo.repoId,
											branch: repo.branch,
											productionBranch: repo.productionBranch,
											stagingBranch: repo.stagingBranch,
										}))),
								}}
								style={{ paddingRight: "0.5rem" }}
								to={`/projects/${projectId || component._id}/quality-gates?tab=1`}
							>
								{component.weeklyQualityGates.length > 2
									? `${component.weeklyQualityGates.length} Quality Gates`
									: component.weeklyQualityGates.flatMap((qG) => qG.qualityGate.name).join(", ")}
							</MaterialLink>
						)}
					/>
				))}
			</Grid>
		</SectionTitle>
	);
};

OverviewSection.propTypes = {
	title: PropTypes.string,
	info: PropTypes.array,
	isAttention: PropTypes.bool,
	isLoading: PropTypes.bool,
	isLoadingQualityGates: PropTypes.bool,
	isLoadingWeeklyQualityResults: PropTypes.bool,
	projectId: PropTypes.string,
};

export default OverviewSection;
