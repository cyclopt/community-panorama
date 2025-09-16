import { memo } from "react";
import PropTypes from "prop-types";
import { Grid, styled } from "@mui/material";
import pluralize from "pluralize";

import ProjectImage from "../assets/images/tiles/project.png";
import AnalysisImage from "../assets/images/tiles/analysis.png";
import QualityGatesImage from "../assets/images/tiles/quality_gates_bad.png";
import TimesGoodImage from "../assets/images/tiles/time_good.png";
import RepositoriesImage from "../assets/images/tiles/repositories.png";

import InfoTile from "./InfoTile.jsx";

// 1) Helper moved outside the component
const formatDaysSaved = (value, threshold = 0.1) => {
	if (value === 0) return "-";
	if (value < threshold) return `~${threshold}`;
	return Number.parseFloat(value?.toFixed(1));
};

// 2) Styled container
const TilesContainer = styled(Grid)(({ theme }) => ({
	marginTop: theme.spacing(2),
	marginBottom: theme.spacing(6),
}));

const ProjectsTiles = ({
	activeProjects,
	totalProjects,
	totalRepositories,
	failedQualityGates,
	totalAnalyses,
	cycloptSavedDays,
	...gridProps
}) => (
	<TilesContainer container spacing={2} {...gridProps}>
		{totalProjects !== undefined && (<InfoTile imageSrc={ProjectImage} value={totalProjects} label="total projects" />)}
		{totalRepositories !== undefined && (<InfoTile imageSrc={RepositoriesImage} value={totalRepositories} label="total repositories" />)}
		{activeProjects !== undefined && (<InfoTile imageSrc={ProjectImage} value={activeProjects} label="Active Projects" />)}
		{failedQualityGates !== undefined && (<InfoTile imageSrc={QualityGatesImage} value={failedQualityGates} label={`Failed Quality ${pluralize("Gate", failedQualityGates)}`} />)}
		{totalAnalyses !== undefined && (<InfoTile imageSrc={AnalysisImage} value={totalAnalyses} label="Total Analyses (this week)" />)}
		{cycloptSavedDays !== undefined && (<InfoTile imageSrc={TimesGoodImage} value={formatDaysSaved(cycloptSavedDays)} label="Days Saved (this week)" />)}
	</TilesContainer>
);

ProjectsTiles.propTypes = {
	activeProjects: PropTypes.number.isRequired,
	failedQualityGates: PropTypes.number.isRequired,
	totalAnalyses: PropTypes.number.isRequired,
	cycloptSavedDays: PropTypes.number.isRequired,
	...Grid.propTypes,
};

export default memo(ProjectsTiles);
