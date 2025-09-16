import { useCallback, useMemo, memo } from "react";
import PropTypes from "prop-types";
import { Typography, Grid, Divider } from "@mui/material";
import { CheckCircle as MuiCheckCircle, Error as MuiError } from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { useLocation } from "react-router-dom";
import queryString from "query-string";

// * -------------------- Import components ---------------------
import InfoTile from "../../components/InfoTile.jsx";
import Tooltip from "../../components/Tooltip.jsx";
import EvolutionOfViolations from "../../components/EvolutionOfViolations.jsx";
import EvolutionOfQualityCharacteristics from "../../components/EvolutionOfQualityCharacteristics.jsx";
import ScoreTypographyAvatar from "../../components/ScoreTypographyAvatar.jsx";
// * ------------------------------------------------------------
import { useAnalyses } from "../../api/index.js";
import useGlobalState from "../../use-global-state.js";
// * -------------------- Import tile images --------------------
import LocImage from "../../assets/images/tiles/analysis.png";
import filesImage from "../../assets/images/tiles/files.png";
import functionsImage from "../../assets/images/tiles/functions.png";
import classesImage from "../../assets/images/tiles/classes.png";
import duplicateCodeImage from "../../assets/images/tiles/duplicate_code.png";
import maintainabilityIndexImage from "../../assets/images/tiles/maintainability_index.png";
import cyclomaticComplexityImage from "../../assets/images/tiles/cyclomatic_complexity.png";
import violationsImage from "../../assets/images/tiles/violations.png";
import codeEffortImage from "../../assets/images/tiles/code_effort.png";
import commentsDensityImage from "../../assets/images/tiles/comments_density.png";
// * ------------------------------------------------------------

const CheckCircle = styled(MuiCheckCircle)(({ theme }) => ({
	width: "20px",
	color: theme.palette.success.main,
}));

const Error = styled(MuiError)(({ theme }) => ({
	width: "20px",
	color: theme.palette.error.main,
}));

const TitleComponent = styled(Typography)(() => ({
	textTransform: "capitalize",
}));

const CustomDivider = styled(Divider)(({ theme }) => ({
	backgroundColor: theme.palette.grey,
}));

const QualityOverview = (props) => {
	const { analysis, projectId, repositoryId } = props;
	const { branchName, shortView } = useGlobalState(
		useCallback((e) => ({ branchName: e.branchName, shortView: e.shortView }), []),
	);
	const { analyses } = useAnalyses(projectId, repositoryId, branchName);
	const { pathname, search } = useLocation();

	const tileInfos = useMemo(() => {
		switch (analysis?.language?.toLowerCase()) {
			case "javascript":
			case "typescript": {
				return {
					logicalLOC: analysis?.metricsScores?.size?.ESCOMP_LOC?.avgScore,
					maintainability: analysis?.metricsScores?.complexity?.ESCOMP_MI?.avgScore,
					cyclomaticComp: analysis?.metricsScores?.complexity?.ESCOMP_CC?.avgScore,
					security: analysis?.metricsScores?.security?.NSP_VIOL?.avgScore,
					commentDensity: analysis?.metricScores?.documentation?.ESCOMP_CD?.avgScore,
				};
			}

			case "java": {
				return {
					logicalLOC: analysis?.metricsScores?.size?.ESCOMP_LOC?.avgScore,
					maintainability: analysis?.metricsScores?.complexity?.MI?.avgScore,
					cyclomaticComp: analysis?.metricsScores?.complexity?.ESCOMP_CC?.avgScore,
					security: analysis?.metricsScores?.security?.NSP_VIOL?.avgScore,
					commentDensity: analysis?.metricScores?.documentation?.ESCOMP_CD?.avgScore,
				};
			}

			case "python": {
				return {
					logicalLOC: analysis?.metricsScores?.size?.LOC?.avgScore,
					maintainability: analysis?.metricsScores?.complexity?.MI?.avgScore,
					security: analysis?.metricsScores?.security?.SECURITY_VIOL?.avgScore,
					commentDensity: analysis?.metricScores?.documentation?.ESCOMP_CD?.avgScore,
				};
			}

			case "php": {
				return {
					logicalLOC: analysis?.metricsScores?.size?.PHPMETRICS_LOC?.avgScore,
					maintainability: analysis?.metricsScores?.complexity?.PHPMETRICS_MI?.avgScore,
					cyclomaticComp: analysis?.metricsScores?.complexity?.PHPMETRICS_CC?.avgScore,
					security: analysis?.metricsScores?.security?.NSP_VIOL?.avgScore,
					commentDensity: analysis?.metricsScores?.documentation?.PHPMETRICS_CD?.avgScore,
				};
			}

			case "c#": {
				return {
					logicalLOC: analysis?.metricsScores?.size?.LOC?.avgScore,
					maintainability: analysis?.metricsScores?.complexity?.MI?.avgScore,
					security: analysis?.metricsScores?.security?.SECURITY_VIOL?.avgScore,
					commentDensity: analysis?.metricsScores?.documentation?.TCD?.avgScore,
				};
			}

			case "kotlin": {
				return {
					logicalLOC: analysis?.metricsScores?.size?.LOC?.avgScore,
					maintainability: analysis?.metricsScores?.complexity?.MI?.avgScore,
					cyclomaticComp: analysis?.metricsScores?.complexity?.CC?.avgScore,
					security: analysis?.metricsScores?.security?.NSP_VIOL?.avgScore,
					commentDensity: analysis?.metricScores?.documentation?.CD?.avgScore,
				};
			}

			case "dart": {
				return {
					logicalLOC: analysis?.metricsScores?.size?.LOC?.avgScore,
					maintainability: analysis?.metricsScores?.complexity?.MI?.avgScore,
					cyclomaticComp: analysis?.metricsScores?.complexity?.CC?.avgScore,
					security: analysis?.metricsScores?.security?.NSP_VIOL?.avgScore,
					commentDensity: analysis?.metricScores?.documentation?.CD?.avgScore,
				};
			}

			default: { return {}; }
		}
	}, [analysis]);

	return (
		<div>
			<Grid
				container
				direction="row"
				justifyContent="center"
				spacing={3}
				m={-1.5}
				mb={1}
				sx={{ "> .MuiGrid-item": { p: 1.5, flexBasis: "20%", maxWidth: "20%", flexGrow: 0 } }}
			>
				<InfoTile
					isMainTile
					iconNode={(
						<ScoreTypographyAvatar score={analysis.overallQualityScore} />
					)}
					label="overall project rating"
				/>
				<InfoTile
					iconNode={(
						<ScoreTypographyAvatar score={analysis.characteristics?.maintainabilityScore} />
					)}
					label="maintainability"
					redirectTo={shortView ? {} : {
						url: `/${(pathname.includes("overview"))
							? pathname.split("/").filter(Boolean).slice(0, -1).join("/")
							: pathname.slice(1)}/metrics`,
						query: { ...queryString.parse(search), category: "Maintainability" },
					}}
				/>
				<InfoTile
					iconNode={(
						<ScoreTypographyAvatar score={analysis.characteristics?.securityScore} />
					)}
					label="security"
					redirectTo={shortView ? {} : {
						url: `/${(pathname.includes("overview"))
							? pathname.split("/").filter(Boolean).slice(0, -1).join("/")
							: pathname.slice(1)}/metrics`,
						query: { ...queryString.parse(search), category: "Security" },
					}}
				/>
				<InfoTile
					iconNode={(
						<ScoreTypographyAvatar score={analysis.characteristics?.readabilityScore} />
					)}
					label="readability"
					redirectTo={shortView ? {} : {
						url: `/${(pathname.includes("overview"))
							? pathname.split("/").filter(Boolean).slice(0, -1).join("/")
							: pathname.slice(1)}/metrics`,
						query: { ...queryString.parse(search), category: "Readability" },
					}}
				/>
				<InfoTile
					iconNode={(
						<ScoreTypographyAvatar score={analysis.characteristics?.reusabilityScore} />
					)}
					label="reusability"
					redirectTo={shortView ? {} : {
						url: `/${(pathname.includes("overview"))
							? pathname.split("/").filter(Boolean).slice(0, -1).join("/")
							: pathname.slice(1)}/metrics`,
						query: { ...queryString.parse(search), category: "Reusability" },
					}}
				/>
			</Grid>
			<Grid sx={{ mb: 2, mt: 2 }}>
				<TitleComponent variant="h5">
					{"analysis info"}
				</TitleComponent>
				<CustomDivider />
			</Grid>
			<Grid container direction="row" justifyContent="center" alignItems="stretch" spacing={3} m={-1.5} pt={1} pb={1} sx={{ "> .MuiGrid-item": { p: 1.5 } }}>
				<InfoTile
					imageSrc={LocImage}
					value={analysis.HighLevelMetrics?.LogicalLOC}
					label="total logical loc analyzed"
					tooltip="Number of code lines of the class, excluding empty and comment lines."
					adornment={tileInfos?.logicalLOC >= 0.8 ? (
						<Tooltip title="Try to maintain the number of logical lines of code" titleVariant="body2" placement="top">
							<CheckCircle />
						</Tooltip>
					) : ((tileInfos?.logicalLOC || tileInfos?.logicalLOC !== 0) && (tileInfos.logicalLOC <= 0.2)) ? (
						<Tooltip title="Try to reduce the number of logical lines of code" titleVariant="body2" placement="top">
							<Error />
						</Tooltip>
					) : null}
				/>
				<InfoTile
					imageSrc={LocImage}
					value={analysis.HighLevelMetrics?.PhysicalLOC}
					label="total physical loc analyzed"
					tooltip="Number of code lines of the class, including empty and comment lines."
				/>
				<InfoTile
					imageSrc={
						Object.keys(analysis).length > 0
							? ["JavaScript", "TypeScript"].includes(analysis.language)
								? filesImage
								: analysis.language === "Dart"
									? functionsImage
									: classesImage
							: null
					}
					// No need to check if analysis object has been populated
					// undefined value in analysis returns "-"
					value={
						["JavaScript", "TypeScript"].includes(analysis.language)
							? analysis.HighLevelMetrics?.NumFiles
							: analysis.language === "Dart"
								? analysis.HighLevelMetrics?.NumFunctions
								: analysis.HighLevelMetrics?.NumClasses
					}
					label={
						Object.keys(analysis).length > 0
							? ["JavaScript", "TypeScript"].includes(analysis.language)
								? "number of files"
								: analysis.language === "Dart"
									? "number of functions"
									: "number of classes"
							: "-"
					}
					tooltip={
						Object.keys(analysis).length > 0
							? ["JavaScript", "TypeScript"].includes(analysis.language)
								? "The total number of files found in the project."
								: analysis.language === "Dart"
									? "The total number of functions found in the project."
									: "The total number of classes found in the project."
							: "-"
					}
				/>
				<InfoTile
					percent
					imageSrc={duplicateCodeImage}
					value={(analysis.HighLevelMetrics?.DuplicateCodePct || 0) / 100}
					label="duplicate code"
					tooltip="It measures the percentage of duplicate code instances found across the project."
					adornment={analysis?.HighLevelMetrics?.DuplicateCodePct <= 5 ? (
						<Tooltip title="The code duplication percentage is quite low" titleVariant="body2" placement="top">
							<CheckCircle />
						</Tooltip>
					) : analysis?.HighLevelMetrics?.DuplicateCodePct >= 10 ? (
						<Tooltip title="Try to reduce the duplicate instances in your repository" titleVariant="body2" placement="top">
							<Error />
						</Tooltip>
					) : null}
					redirectTo={shortView ? {} : {
						url: `/${(pathname.includes("overview"))
							? pathname.split("/").filter(Boolean).slice(0, -1).join("/")
							: pathname.slice(1)}/duplicates`,
					}}
				/>
				<InfoTile
					imageSrc={maintainabilityIndexImage}
					value={analysis.HighLevelMetrics?.MI}
					label="maintainability index"
					tooltip="It measures the extent to which a software component is maintainable based on its complexity, size and level of documentation."
					adornment={tileInfos?.maintainability >= 0.8 ? (
						<Tooltip title="Try to maintain this level of complexity in your implementation" titleVariant="body2" placement="top">
							<CheckCircle />
						</Tooltip>
					) : ((tileInfos?.maintainability || tileInfos?.maintainability === 0) && (tileInfos.maintainability <= 0.2)) ? (
						<Tooltip title="Try to reduce the complexity of the implementation" titleVariant="body2" placement="top">
							<Error />
						</Tooltip>
					) : null}
				/>
				<InfoTile
					imageSrc={cyclomaticComplexityImage}
					value={analysis.HighLevelMetrics?.CC}
					label="cyclomatic complexity"
					tooltip="It measures the number of different execution paths that exist in the source code."
					adornment={tileInfos?.cyclomaticComp >= 0.8 ? (
						<Tooltip title="Try to maintain this level of complexity in your methods" titleVariant="body2" placement="top">
							<CheckCircle />
						</Tooltip>
					) : ((tileInfos?.cyclomaticComp || tileInfos?.cyclomaticComp === 0) && (tileInfos.cyclomaticComp <= 0.2)) ? (
						<Tooltip title="Try to reduce the complexity of your methods" titleVariant="body2" placement="top">
							<Error />
						</Tooltip>
					) : null}
				/>
				<InfoTile
					imageSrc={violationsImage}
					value={analysis.totalViolationsCount}
					label="total number of violations"
					tooltip="It measures the number of violations regarding widely accepted code writing practices."
					adornment={tileInfos?.security >= 0.8 ? (
						<Tooltip title="The number of violations is quite low" titleVariant="body2" placement="top">
							<CheckCircle />
						</Tooltip>
					) : ((tileInfos?.security || tileInfos?.security === 0) && (tileInfos?.security <= 0.3)) ? (
						<Tooltip title="Try to reduce the total number of violations" titleVariant="body2" placement="top">
							<Error />
						</Tooltip>
					) : null}
				/>
				<InfoTile
					percent={["Python", "C#", "Kotlin"].includes(analysis.language)}
					imageSrc={
						Object.keys(analysis).length > 0
							? ["Python", "C#", "Kotlin"].includes(analysis.language)
								? commentsDensityImage
								: codeEffortImage
							: null
					}
					// No need to check if analysis object has been populated
					// undefined value in analysis returns "-"
					value={
						["Python", "C#", "Kotlin"].includes(analysis.language)
							? (analysis.HighLevelMetrics?.CD || 0) / 100
							: analysis.language === "Dart"
								? analysis.HighLevelMetrics?.Difficulty
								: analysis.HighLevelMetrics?.EffortInDays
					}
					label={
						Object.keys(analysis).length > 0
							? ["Python", "C#", "Kotlin"].includes(analysis.language)
								? "comments density"
								: analysis.language === "Dart"
									? "halstead volume"
									: "code effort (days)"
							: "-"
					}
					tooltip={
						Object.keys(analysis).length > 0
							? ["Python", "C#", "Kotlin"].includes(analysis.language)
								? "It measures the level of documentation of the file as expressed by the ratio of the total comment lines of the class to the total lines of code."
								: analysis.language === "Dart"
									? "It describes the size of the implementation of the respective project."
									: "It estimates the number of days required to develop the respective project."
							: "-"
					}
					adornment={
						["Python", "C#", "Kotlin"].includes(analysis.language)
							? tileInfos?.commentDensity >= 0.8 ? (
								<Tooltip title="Keep adding detailed documentation" titleVariant="body2" placement="top">
									<CheckCircle />
								</Tooltip>
							) : (tileInfos?.commentDensity || tileInfos?.commentDensity === 0) && tileInfos?.commentDensity <= 0.2 ? (
								<Tooltip title="Add a more detailed documentation" titleVariant="body2" placement="top">
									<Error />
								</Tooltip>
							) : null
							: null
					}
				/>
			</Grid>
			<Grid sx={{ mb: 2, mt: 2 }}>
				<TitleComponent variant="h5">
					{"evolution"}
				</TitleComponent>
				<CustomDivider />
			</Grid>
			<Grid container direction="row" spacing={3} m={-1.5} mt={2} sx={{ "> .MuiGrid-item": { p: 1.5 } }}>
				<Grid item xs={12} md={6}><EvolutionOfQualityCharacteristics analysesInfo={analyses} /></Grid>
				<Grid item xs={12} md={6}><EvolutionOfViolations analysesInfo={analyses} /></Grid>
			</Grid>
		</div>
	);
};

QualityOverview.propTypes = {
	analysis: PropTypes.object.isRequired,
	projectId: PropTypes.string,
	repositoryId: PropTypes.string,
};

export default memo(QualityOverview);
