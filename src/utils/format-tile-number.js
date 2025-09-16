const formatTileNumber = (number, { percent = false, isTime = false, isFewDays = false }) => {
	if (number === undefined) {
		return "-";
	}

	if (Number.isFinite(number)) {
		if (percent) {
			if (number < 0.01 && number > 0) {
				return "<1%";
			}

			const percentage = Number.parseInt(number * 100, 10);
			return `${percentage}%`;
		}

		if (number < 1000) {
			// Display in milliseconds if under 100
			return isTime ? `${Number.parseFloat(number.toFixed(2))}ms` : `${Number.parseFloat(number.toFixed(2), 10)}`;
		}

		// Display in seconds if 100 or above
		const seconds = number / 1000;
		return isTime ? `${Number.parseFloat(seconds.toFixed(2))}sec` : `${Number.parseFloat(number.toFixed(2), 10)}`;
	}

	// This case handles the case of Days Saved that are less than the threshold (returns ~0.1)
	if (isFewDays) return number;

	return "-";
};

export default formatTileNumber;

// // Example usage:
// const result1 = formatTileNumber(75); // Output: "75"
// const result2 = formatTileNumber(120); // Output: "120ms"
// const result3 = formatTileNumber(0.005, true); // Output: "<1%"
// const result4 = formatTileNumber(150, false, true); // Output: "0.15sec"
// const result5 = formatTileNumber(150, true, true); // Output: "15%"

