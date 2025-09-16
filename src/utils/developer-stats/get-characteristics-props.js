const getCharacteristicsProps = (score, thresholds) => {
	let cumulative = 0;

	for (const [index, { png, threshHold, startingColor, endColor }] of thresholds.entries()) {
		const lower = cumulative;
		cumulative += threshHold;
		const upper = cumulative;

		if (score < upper) {
			return {
				level: index + 1, // <-- here’s your level
				png,
				levelPct: (score - lower) / threshHold,
				pointsForNextLevel: Math.round(upper - score),
				startingColor,
				endColor,
			};
		}
	}

	// if the score exceeds all thresholds, return the last level
	const last = thresholds.length - 1;
	return {
		level: thresholds.length,
		png: thresholds[last]?.png,
		levelPct: 0,
		pointsForNextLevel: 0,
		startingColor: thresholds[0]?.startingColor,
		endColor: thresholds[0]?.endColor,
	};
};

export default getCharacteristicsProps;
