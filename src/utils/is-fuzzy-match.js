import { matchSorter } from "match-sorter";

const isFuzzyMatch = (value, searchToken = "") => matchSorter(Array.isArray(value) ? value : [value], searchToken, { threshold: matchSorter.rankings.ACRONYM }).length > 0;

export default isFuzzyMatch;
