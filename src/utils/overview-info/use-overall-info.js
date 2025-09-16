import { useMemo } from "react";

const useOverallInfo = (
	projects,
	systemChecksResults,
	failedQualityGates,
	isLoading,
	showStagingBranch,
) => useMemo(() => projects.map((project) => {
	if (isLoading) return {};
	return ({
		_id: project._id,
		name: project.name,
		parentOrganization: project?.parentOrganization?._id ?? null,
		isOnTrack: systemChecksResults[project._id]
			? Object.values(systemChecksResults[project._id])
				.every((value) => {
					const filteredAttention = value.attention.filter((item) => item.branch === (showStagingBranch ? "stagingBranch" : "productionBranch"));
					const filteredAchievements = value.achievements.filter((item) => item.branch === (showStagingBranch ? "stagingBranch" : "productionBranch"));
					const failedQualityGatesInProject = failedQualityGates?.[project._id]
						?.map(({ qualityGate, repositories }) => {
							// Filter repos based on showStagingBranch state
							const filteredRepos = repositories
								.filter((repo) => (showStagingBranch && repo.stagingBranch)
                                    || (!showStagingBranch && repo.productionBranch));
							// If repos array is empty, remove the entire parent object
							return filteredRepos.length > 0 ? { qualityGate, repositories: filteredRepos } : null;
						})
						.filter(Boolean) // Remove null values
						|| [];
					return (
						Array.isArray(filteredAttention)
								&& filteredAttention.length === 0
								&& Array.isArray(filteredAchievements)
								&& filteredAchievements.length > 0
								&& failedQualityGatesInProject.length === 0
					);
				})
			: false,
		violationsChecks: systemChecksResults[project._id]?.["Check Violations"]?.attention
			.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch")) || [],
		vulnerabilitiesChecks: systemChecksResults[project._id]?.["Check Vulnerabilities"]?.attention
			.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch")) || [],
		characteristicsChecks: systemChecksResults[project._id]?.["Check Characteristics"]?.attention
			.filter((entry) => entry.branch === (showStagingBranch ? "stagingBranch" : "productionBranch")) || [],
		failedQualityGates: failedQualityGates?.[project._id]
			?.map(({ qualityGate, repositories }) => {
				// Filter repos based on showStagingBranch state
				const filteredRepos = repositories
					.filter((repo) => (showStagingBranch && repo.stagingBranch)
                        || (!showStagingBranch && repo.productionBranch));
				// If repos array is empty, remove the entire parent object
				return filteredRepos.length > 0
					? { qualityGate, repositories: filteredRepos, stagingBranch: showStagingBranch, productionBranch: !showStagingBranch }
					: null;
			})
			.filter(Boolean) // Remove null values
				|| [],
	});
}), [projects, isLoading, systemChecksResults, failedQualityGates, showStagingBranch]);

export default useOverallInfo;
