import { Grid, Typography } from "@mui/material";

const getLetterAndSymbol = (n) => {
	if (typeof n !== "number" || Number.isNaN(n) || n <= 0) return { letter: "-", symbol: "" };
	if (n <= 1) n *= 100;
	if (n < 10) return { letter: "D", symbol: "-" };
	if (n < 25) return { letter: "D", symbol: "" };
	if (n < 33) return { letter: "D", symbol: "+" };
	if (n < 38) return { letter: "C", symbol: "-" };
	if (n < 50) return { letter: "C", symbol: "" };
	if (n < 55) return { letter: "C", symbol: "+" };
	if (n < 60) return { letter: "B", symbol: "-" };
	if (n < 73) return { letter: "B", symbol: "" };
	if (n < 80) return { letter: "B", symbol: "+" };
	if (n < 83) return { letter: "A", symbol: "-" };
	if (n < 93) return { letter: "A", symbol: "" };
	return { letter: "A", symbol: "+" };
};

const convertQualityScoreToAvatar = (n) => {
	const { letter, symbol } = getLetterAndSymbol(n);

	if (letter === "-") return null;

	return (
		<Grid fontSize="100%" sx={{ display: "flex", flexDirection: "row", alignItems: "center", fontWeight: "bold" }}>
			{letter}
			{symbol && (
				<Typography fontSize="inherit" fontWeight="bold" style={{ marginBottom: "0.2em" }}>
					{symbol}
				</Typography>
			)}
		</Grid>
	);
};

export default convertQualityScoreToAvatar;
