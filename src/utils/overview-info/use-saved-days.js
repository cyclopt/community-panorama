import { useMemo } from "react";

const useSavedDays = (
	systemChecksResults,
	isLoading,
) => useMemo(() => {
	let productionBranch = 0;
	let stagingBranch = 0;
	if (isLoading) return { productionBranch, stagingBranch };

	for (const projectData of Object.values(systemChecksResults)) {
		const achievements = projectData?.["Check Cyclopt Saved Days"]?.achievements || [];
		for (const entry of achievements) {
			if (entry.branch === "productionBranch") {
				productionBranch += entry.value || 0;
			} else if (entry.branch === "stagingBranch") {
				stagingBranch += entry.value || 0;
			}
		}
	}

	return { productionBranch, stagingBranch };
}, [isLoading, systemChecksResults]);

export default useSavedDays;
