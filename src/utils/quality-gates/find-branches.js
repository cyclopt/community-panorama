const findBranches = (repositories) => {
	const productionBranches = [];
	const stagingBranches = [];
	const otherBranches = [];

	for (const repo of repositories) {
		for (const br of repo.branches) {
			if (br === repo.productionBranch) productionBranches.push(br);
			if (br === repo.stagingBranch) stagingBranches.push(br);
			if (![repo.productionBranch, repo.stagingBranch].includes(br)) otherBranches.push(br);
		}
	}

	const tempResult = [...new Set(otherBranches)].flatMap((br) => ({
		category: "Rest",
		title: br,
		branches: [br],
	}));

	return [
		{ category: "Production/Staging", title: "Production Branch", branches: [...new Set(productionBranches)] },
		{ category: "Production/Staging", title: "Staging Branch", branches: [...new Set(stagingBranches)] },
		...tempResult,
	];
};

export default findBranches;
