import PropTypes from "prop-types";

import api from "#api";

const setRepositoryBranches = async (initialRepositories, type, setProject, error) => {
	await Promise.all(initialRepositories.map(async (lRepo) => {
		const { owner, name, vcType } = lRepo;

		const associatedRepoWithBranches = initialRepositories.find((lr) => (
			lr.name === name && lr.owner === owner && String(lr.vcType) === String(vcType) && lr.branches?.length > 0
		));
		if (associatedRepoWithBranches) {
			setProject((prevProject) => ({
				...prevProject,
				linkedRepositories:
								prevProject.linkedRepositories.map((repo) => (
									repo.owner === owner && repo.name === name && String(repo.vcType) === String(vcType)
										? { ...repo, branches: associatedRepoWithBranches.branches }
										: repo)),
			}));

			return;
		}

		try {
			const tempInfo = await api.get(`api/${type}/repository/branches`, { owner, name, vcType });
			if (tempInfo.branches.length > 0) {
				setProject((prevProject) => ({
					...prevProject,
					linkedRepositories:
											prevProject.linkedRepositories.map((repo) => (
												repo.owner === owner && repo.name === name && String(repo.vcType) === String(vcType)
													? { ...repo, branches: tempInfo.branches }
													: repo)),
				}));
			} else {
				// If we don't find branches pass a default value of "-" in branches array.
				setProject((prevProject) => ({
					...prevProject,
					linkedRepositories:
										prevProject.linkedRepositories.map((repo) => (
											repo?.branches?.length > 0 ? repo : { ...repo, branches: ["-"], isRepoValid: false }
										)),
				}));
			}
		} catch {
			error();
		}
	}));
};

setRepositoryBranches.propTypes = {
	initialRepositories: PropTypes.array.isRequired,
	type: PropTypes.string,
	setProject: PropTypes.func,
	error: PropTypes.func,
};

export default setRepositoryBranches;
