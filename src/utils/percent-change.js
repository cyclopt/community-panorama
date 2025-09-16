const percentChange = (previousValue, nextValue, maximumFractionDigits = 2) => {
	const change = (nextValue - previousValue) / previousValue;
	return `${change > 0 ? "+" : ""}${(change * 100).toLocaleString("fullwide", { maximumFractionDigits })}%`;
};

export default percentChange;
