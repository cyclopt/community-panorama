import constructUrl from "@iamnapo/construct-url";

const getRepoUrl = (type, repo) => {
	let branchPath = "";
	switch (type) {
		case ("azure"): {
			const repoUrlParams = {};
			if (repo.vcType === "git") {
				if (repo?.root !== ".") repoUrlParams.path = (repo.root.startsWith("/")) ? repo.root : `/${repo.root}`;
				repoUrlParams.version = `GB${repo.selectedBranch}`;
				return constructUrl("https://dev.azure.com", `/${repo.owner}/_git/${repo.name}`, repoUrlParams);
			}

			if (repo?.root !== ".") repoUrlParams.path = `$/${repo.name}${(repo.root.startsWith("/")) ? repo.root : `/${repo.root}`}`;
			return constructUrl("https://dev.azure.com", `/${repo.owner}/_versionControl`, repoUrlParams);
		}

		case ("github"): {
			branchPath += `tree/${repo.selectedBranch}/`;
			if (repo?.root !== ".") branchPath += (repo.root.startsWith("/")) ? repo.root.slice(1) : repo.root;
			return constructUrl("https://github.com", `/${repo.owner}/${repo.name}/${branchPath}`);
		}

		case ("bitbucket"): {
			branchPath += `src/${repo.selectedBranch}/`;
			if (repo?.root !== ".") branchPath += (repo.root.startsWith("/")) ? repo.root.slice(1) : repo.root;
			return constructUrl("https://bitbucket.org", `/${repo.owner}/${repo.name}/${branchPath}`);
		}

		case ("gitlab"): {
			branchPath += `tree/${repo.selectedBranch}/`;
			if (repo?.root !== ".") branchPath += (repo.root.startsWith("/")) ? repo.root.slice(1) : repo.root;
			return constructUrl("https://gitlab.com", `/${repo.owner}/${repo.name}/${branchPath}`);
		}

		default: {
			return "";
		}
	}
};

export default getRepoUrl;
