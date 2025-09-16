const getColorForQualityScore = (n) => {
	if (typeof n !== "number" || Number.isNaN(n) || n <= 0) return "secondary.main";
	if (n <= 1) n *= 100;
	if (n < 10) return "#9C1006";
	if (n < 25) return "#C00B0D";
	if (n < 33) return "#D10910";
	if (n < 38) return "#E30B13";
	if (n < 50) return "#E74011";
	if (n < 55) return "#EC6608";
	if (n < 60) return "#F58D05";
	if (n < 73) return "#FBBA00";
	if (n < 80) return "#C8B505";
	if (n < 83) return "#9AB81F";
	if (n < 93) return "#62A630";
	return "#009640";
};

export default getColorForQualityScore;
