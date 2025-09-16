
import { memo, useMemo } from "react";
import { Avatar, Typography } from "@mui/material";
import PropTypes from "prop-types";

import { convertQualityScoreToAvatar, getColorForQualityScore } from "../utils/index.js";
import AnalysisImage from "../assets/images/tiles/analysis.png";
import ViolationsImage from "../assets/images/tiles/violations.png";
import TimeToFixImage from "../assets/images/tiles/time_to_fix.png";

import InfoTile from "./InfoTile.jsx";

const qualitySubscription = true;

const QualityTiles = ({ project }) => {
	let totalQualityNom = 0;
	let totalQualityDenom = 0;
	for (const { overallQualityScore } of (Object.values(project?.linkedRepositories || []))) {
		if (overallQualityScore !== null) {
			totalQualityNom += overallQualityScore;
			totalQualityDenom += 1;
		}
	}

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

	// hide quality analytics only if it's a team project and no quality subscription is active
	const showQualityAnalytics = ((project?.type === "team" && qualitySubscription && project?.analytics?.quality)
        || (project?.type === "personal" && project?.analytics?.quality && (qualitySubscription || project?.linkedRepositories?.some((r) => !r.isPrivate))));

	return (showQualityAnalytics ? (
		<>
			<InfoTile
				iconNode={(
					<Typography variant="h4" align="center" display="flex" alignItems="center" justifyContent="center" sx={{ gap: 2 }}>
						<Avatar
							sx={{
								width: (t) => t.spacing(6),
								height: (t) => t.spacing(6),
								bgcolor: getColorForQualityScore(totalQualityNom / totalQualityDenom),
								display: "inline-flex",
								fontSize: "inherit",
							}}
						>
							{convertQualityScoreToAvatar(totalQualityNom / totalQualityDenom)}
						</Avatar>
					</Typography>
				)}
				label="overall quality score"
			/>
			<InfoTile imageSrc={ViolationsImage} value={totalViolations} label="total number of violations" />
			<InfoTile imageSrc={AnalysisImage} value={overallTotalAnalyses} label="total analyses" />
			<InfoTile imageSrc={TimeToFixImage} value={totalTimeToFixViolations && Number.parseFloat(totalTimeToFixViolations.toFixed(2), 10)} label="time to fix violations (days)" />
		</>
	) : null);
};

QualityTiles.propTypes = {
	project: PropTypes.shape({
		type: PropTypes.string,
		analytics: PropTypes.shape({
			quality: PropTypes.bool,
		}),
		linkedRepositories: PropTypes.arrayOf(PropTypes.shape({
			overallQualityScore: PropTypes.number,
			numberOfViolations: PropTypes.arrayOf(PropTypes.number),
			timeToFixViolations: PropTypes.number,
			totalAnalyses: PropTypes.number,
			isPrivate: PropTypes.bool,
		})),
		subscription: PropTypes.object,
	}).isRequired,
};

export default memo(QualityTiles);
