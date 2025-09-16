import isFuzzyMatch from "./is-fuzzy-match.js";

const getSearches = (value) => ([...value.matchAll(/"[^"]*"|[^,]+/g)].map((r) => r[0].trim()));

const taskIsSearchMatch = ({ title, body, priority, labels = [], assignees = [], reviewers = [], project: { name } }, value) => {
	if (!value) return true;

	if (/label(s?):/.test(value)) {
		const match = value.match(/(?<=label(s?):)((("?).*?(\4)(,?))*?(\s|$))/)[0];
		const searches = getSearches(match);
		for (const search of searches) {
			const cleanSearch = search.startsWith("\"") ? search.slice(1, -1) : search;
			if (cleanSearch && isFuzzyMatch(labels, cleanSearch)) return true;
		}
	}

	if (/assignee(s?):/.test(value)) {
		const match = value.match(/(?<=assignee(s?):)((("?).*?(\4)(,?))*?(\s|$))/)[0];
		const searches = getSearches(match);
		const assigneesSearch = assignees.map((a) => a.username);
		for (const search of searches) {
			const cleanSearch = search.startsWith("\"") ? search.slice(1, -1) : search;
			if (cleanSearch && isFuzzyMatch(assigneesSearch, cleanSearch)) return true;
		}
	}

	if (/reviewer(s?):/.test(value)) {
		const match = value.match(/(?<=reviewer(s?):)((("?).*?(\4)(,?))*?(\s|$))/)[0];
		const searches = getSearches(match);
		const reviewersSearch = reviewers.map((a) => a.username);
		for (const search of searches) {
			const cleanSearch = search.startsWith("\"") ? search.slice(1, -1) : search;
			if (cleanSearch && isFuzzyMatch(reviewersSearch, cleanSearch)) return true;
		}
	}

	if (/priorit(y|ies):/.test(value)) {
		const match = value.match(/(?<=priorit(y|ies):)((("?).*?(\4)(,?))*?(\s|$))/)[0];
		const searches = getSearches(match);
		for (const search of searches) {
			const cleanSearch = search.startsWith("\"") ? search.slice(1, -1) : search;
			if (cleanSearch && isFuzzyMatch(priority, cleanSearch)) return true;
		}
	}

	if (/title(s?):/.test(value)) {
		const match = value.match(/(?<=title(s?):)((("?).*?(\4)(,?))*?(\s|$))/)[0];
		const searches = getSearches(match);
		for (const search of searches) {
			const cleanSearch = search.startsWith("\"") ? search.slice(1, -1) : search;
			if (cleanSearch && isFuzzyMatch(title, cleanSearch)) return true;
		}
	}

	if (/project(s?):/.test(value)) {
		const match = value.match(/(?<=project(s?):)((("?).*?(\4)(,?))*?(\s|$))/)[0];
		const searches = match.split(/(,)(?=(?:[^"]|"[^"]*")*$)/);
		for (const search of searches) {
			const cleanSearch = search.startsWith("\"") ? search.slice(1, -1) : search;
			if (cleanSearch && isFuzzyMatch(name, cleanSearch)) return true;
		}
	}

	if (/bod(y|ies):/.test(value)) {
		const match = value.match(/(?<=bod(y|ies):)((("?).*?(\4)(,?))*?(\s|$))/)[0];
		const searches = getSearches(match);
		for (const search of searches) {
			const cleanSearch = search.startsWith("\"") ? search.slice(1, -1) : search;
			if (cleanSearch && isFuzzyMatch(body, cleanSearch)) return true;
		}
	}

	if (value.startsWith("mention: @")) {
		return isFuzzyMatch(`${title} ${body}`, value.replace("mention: ", ""));
	}

	return isFuzzyMatch(`${title} ${name} ${priority} ${labels.reduce((a, c) => `${a} ${c}`, "")} ${assignees.reduce((a, c) => `${a} ${c.username}`, "")} ${reviewers.reduce((a, c) => `${a} ${c.username}`, "")}`, value);
};

export default taskIsSearchMatch;

