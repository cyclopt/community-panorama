const createRepositoryName = (repository, includeOwner = false) => {
	if (!repository) return null;
	const { owner, name, root } = repository;
	const baseName = `${name}${(root === "." ? "" : `/${root.replace(/^\//, "")}`)}`;
	return includeOwner ? `${owner}/${baseName}` : baseName;
};

export default createRepositoryName;
