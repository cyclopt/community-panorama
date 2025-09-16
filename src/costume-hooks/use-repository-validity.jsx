import { useMemo, useState, useEffect } from "react";
import PropTypes from "prop-types";

import { checkRepoAccess } from "#api";
import { useSnackbar } from "#utils";

const useRepositoryValidity = (initialRepositories, type, fetchRepoAccess, setFetchRepoAccess) => {
	const [repoValidity, setRepoValidity] = useState([]);

	const { error } = useSnackbar();

	const uniqueRepositories = useMemo(() => {
		// Guard against project or linkedRepositories being nullish
		if (!initialRepositories) return [];
		// Map each repository to a unique identifier string and then convert back to values to deduplicate
		const repoMap = new Map(
			initialRepositories.map((repo) => [`${repo.owner}/${repo.name}/${repo.vcType}`, repo]),
		);
		// Convert the map values back to an array
		return [...repoMap.values()];
	}, [initialRepositories]);

	useEffect(() => {
		(async () => {
			try {
				if (uniqueRepositories.length > 0 && fetchRepoAccess) {
					await Promise.all(uniqueRepositories.map(async ({ name, owner, vcType = "git", providerId }) => {
						const alreadyCheck = repoValidity.some((r) => (
							r.name === name && r.owner === owner && String(r.vcType) === String(vcType)));
						if (!alreadyCheck) {
							const repository = type === "cyclopt"
								? { owner, name, isValid: true }
								: await checkRepoAccess({ name, owner, vcType, providerId }, type);
							setRepoValidity((p) => ([...p, repository]));
						}

						setFetchRepoAccess(false);
					}));
				}
			} catch {
				error();
			}
		})();
	}, [error, uniqueRepositories, repoValidity, type, fetchRepoAccess, setFetchRepoAccess]);

	return [repoValidity];
};

useRepositoryValidity.propTypes = {
	initialRepositories: PropTypes.array.isRequired,
	type: PropTypes.string,
	fetchRepoAccess: PropTypes.bool,
	setFetchRepoAccess: PropTypes.func,
};

export default useRepositoryValidity;
