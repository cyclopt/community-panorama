import pluralize from "pluralize";

import capitalize from "./capitalize.js";

// feedBackInformation is an array of objects
// each object has { branch, metric, value }
// this function will be used for both new and current findings
export const constructMessage = (feedBackInformation, type, isAttention, isCurrent = false) => {
	let highPriority = 0;
	let lowPriority = 0;
	let total = 0;
	for (const item of feedBackInformation) {
		const metric = item.metric.toLowerCase();
		if (metric.includes("high")) highPriority = item.value;
		if (metric.includes("low")) lowPriority = item.value;
		if (metric.includes("total")) total = item.value;
	}

	// ensure the total value gets the correct value
	// that handles the case when some low priority issues are added/removed and some high priority issues are removed/added
	// so there is the total number is either in attention or in achievement section
	total = Math.max(total, lowPriority + highPriority);

	const priorityMessage = (highPriority > 0 && lowPriority > 0)
		? `, ${highPriority} of high and ${lowPriority} of low priority`
		: (
			highPriority > 0
				? " of high priority"
				: " of low priority"
		);

	return `has ${total} ${isCurrent ? "" : `${isAttention ? "new" : "less"} `}${pluralize(type, total)}${priorityMessage}!`;
};

export const constructCharacteristicsMessage = (feedBackInformation, isAttention) => {
	const metricsMessage = feedBackInformation.map(({ metric, value }) => {
		const metricName = capitalize(metric.replaceAll(/score|quality/gi, ""));
		if (value < 0.01) {
			return `${metricName} slightly ${isAttention ? "decreased" : "increased"} (<1%)`;
		}

		return `${metricName} ${isAttention ? "decreased" : "increased"} by ${(value * 100).toFixed(2)}%`;
	}).join(". ");
	return `quality has ${isAttention ? "dropped" : "picked up"}! ${metricsMessage}`;
};
