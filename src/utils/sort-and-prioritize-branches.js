const sortAndPrioritizeBranches = (arr, pBranche) => {
	const priorityKeywords = [pBranche, "master", "main"]; // Highest priority keywords
	const secondaryKeywords = ["develop"]; // Secondary priority keywords
	return arr?.sort((a, b) => {
		const aPriorityIndex = priorityKeywords.indexOf(a.toLowerCase());
		const bPriorityIndex = priorityKeywords.indexOf(b.toLowerCase());
		const aSecondaryIndex = secondaryKeywords.indexOf(a.toLowerCase());
		const bSecondaryIndex = secondaryKeywords.indexOf(b.toLowerCase());

		if (aPriorityIndex !== -1 || bPriorityIndex !== -1) {
			if (aPriorityIndex !== -1 && bPriorityIndex === -1) return -1;
			if (aPriorityIndex === -1 && bPriorityIndex !== -1) return 1;
		}

		if (aSecondaryIndex !== -1 || bSecondaryIndex !== -1) {
			if (aSecondaryIndex !== -1 && bSecondaryIndex === -1) return -1;
			if (aSecondaryIndex === -1 && bSecondaryIndex !== -1) return 1;
		}

		return a.localeCompare(b);
	}) || [];
};

export default sortAndPrioritizeBranches;
