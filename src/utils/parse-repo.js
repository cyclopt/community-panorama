import gitUrlParse from "git-url-parse";

const parseRepo = (repo) => {
	try {
		return gitUrlParse(repo);
	} catch {
		return {};
	}
};

export default parseRepo;
