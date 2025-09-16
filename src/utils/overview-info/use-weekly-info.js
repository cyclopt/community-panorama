import { useMemo } from "react";

const useWeeklyInformation = (
	projects,
	systemChecksResults,
	weeklyQualityGatesResults,
	isLoading,
	showStagingBranch,
	type,
) => useMemo(() => projects.map((project) => {
	let qgType = "broken";
	if (isLoading) return {};
	if (type === "achievements") qgType = "fixed";
	return ({
		_id: project._id,
		name: project.name,
		parentOrganization: project?.parentOrganization?._id ?? null,
		velocityChecks: systemChecksResults[project._id]?.["Check Velocity"]?.[type] || [],
		violationsChecks: systemChecksResults[project._id]?.["Check new Violations"]?.[type]
			.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch")) || [],
		vulnerabilitiesChecks: systemChecksResults[project._id]?.["Check new Vulnerabilities"]?.[type]
			.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch")) || [],
		// TO DO: decide whether to add other metrics than overall quality score
		characteristicsChecks: systemChecksResults[project._id]?.["Check new Characteristics"]?.[type]
			.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch")) || [],
		weeklyQualityGates: weeklyQualityGatesResults?.[project._id]?.[qgType]
			?.map(({ qualityGate, repositories }) => {
				// Filter repos based on showStagingBranch state
				const filteredRepos = repositories
					.filter((repo) => (showStagingBranch && repo.stagingBranch)
                            || (!showStagingBranch && repo.productionBranch));
					// If repos array is empty, remove the entire parent object
				return filteredRepos.length > 0 ? { qualityGate, repositories: filteredRepos } : null;
			})
			.filter(Boolean) // Remove null values
				|| [],
	});
}), [projects, isLoading, type, systemChecksResults, weeklyQualityGatesResults, showStagingBranch]);

export default useWeeklyInformation;
