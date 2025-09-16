import findConditionLabel from "./find-condition-label.js";
import findBranches from "./find-branches.js";
import groupAndSortOptions from "./group-sort-options.js";

// mapping metrics from metricsScores that have the same meaning to the same title
const metricsScoresMapping = {
	SECURITY_VIOL: "Security Vulnerabilities of Dependencies",
	NSP_VIOL: "Security Vulnerabilities of Dependencies",
	ESCOMP_PAR: "Number of Parameters",
	PAR: "Number of Parameters",
};

const operatorOptions = [
	{ label: "is less than", value: "<" },
	{ label: "is less or equal than", value: "<=" },
	{ label: "is equal", value: "=" },
	{ label: "is equal or greater than", value: ">=" },
	{ label: "is greater than", value: ">" },
];

// Define which metrics have an integer as input value
const isIntegerMetrics = [
	"Number of Files",
	"Number of Functions",
	"Number of Classes",
	"Number of Parameters",
	"Number of Imports",
	"Security Vulnerabilities of Dependencies",
];

const QualityGates = {
	findConditionLabel,
	findBranches,
	groupAndSortOptions,
	metricsScoresMapping,
	operatorOptions,
	isIntegerMetrics,
};

export default QualityGates;
