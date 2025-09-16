const convertQualityScoreToLetter = (n) => {
	if (typeof n !== "number" || Number.isNaN(n) || n <= 0) return "-";
	if (n <= 1) n *= 100;
	if (n < 10) return "D⁻";
	if (n < 25) return "D";
	if (n < 33) return "D⁺";
	if (n < 38) return "C⁻";
	if (n < 50) return "C";
	if (n < 55) return "C⁺";
	if (n < 60) return "B⁻";
	if (n < 73) return "B";
	if (n < 80) return "B⁺";
	if (n < 83) return "A⁻";
	if (n < 93) return "A";
	return "A⁺";
};

export default convertQualityScoreToLetter;
