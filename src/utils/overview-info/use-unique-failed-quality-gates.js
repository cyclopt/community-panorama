import { useMemo } from "react";

const useUniqueFailedQualityGates = (failedQualityGates, isLoading, showStagingBranch) => useMemo(() => {
	// If failed quality gates have not finished loading we use null as a result
	// thus the Tile shows "-"
	if (isLoading) return null;

	return new Set(
		Object.values(failedQualityGates)
			.flat()
			.flatMap((qG) => (qG.repositories.some((repo) => (showStagingBranch ? repo.stagingBranch : repo.productionBranch))
				? [qG.qualityGate._id]
				: [])),
	).size;
}, [failedQualityGates, isLoading, showStagingBranch]);

export default useUniqueFailedQualityGates;

