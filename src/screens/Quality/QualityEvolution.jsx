import { useCallback, memo } from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";

import EvolutionOfSpecificQualityCharacteristic from "../../components/EvolutionOfSpecificQualityCharacteristic.jsx";
import { useAnalyses } from "../../api/index.js";
import useGlobalState from "../../use-global-state.js";

const QualityEvolution = (props) => {
	const { projectId, repositoryId } = props;
	const branchName = useGlobalState(useCallback((e) => e.branchName, []));
	const { analyses } = useAnalyses(projectId, repositoryId, branchName);

	return (
		<Grid container direction="row" spacing={3} m={-1.5} sx={{ "> .MuiGrid-item": { p: 1.5 } }}>
			<Grid item xs={12}>
				<EvolutionOfSpecificQualityCharacteristic analysesInfo={analyses} characteristic="LogicalLOC" />
			</Grid>
			<Grid item xs={12}>
				<EvolutionOfSpecificQualityCharacteristic analysesInfo={analyses} characteristic="CC" />
			</Grid>
			{ (analyses?.characteristics?.avLocPerClass?.some(Boolean)
			|| analyses?.characteristics?.avLocPerFunction?.some(Boolean))
			&& (
				<Grid item xs={12}>
					<EvolutionOfSpecificQualityCharacteristic
						analysesInfo={analyses}
						characteristic={analyses?.characteristics?.avLocPerClass?.some(Boolean) ? "avLocPerClass" : "avLocPerFunction"}
					/>
				</Grid>
			)}
			<Grid item xs={12}>
				<EvolutionOfSpecificQualityCharacteristic analysesInfo={analyses} characteristic="CommentsDensity" />
			</Grid>
			<Grid item xs={12}>
				<EvolutionOfSpecificQualityCharacteristic analysesInfo={analyses} characteristic="DuplicateCodePct" />
			</Grid>
		</Grid>
	);
};

QualityEvolution.propTypes = {
	projectId: PropTypes.string,
	repositoryId: PropTypes.string,
};

export default memo(QualityEvolution);
