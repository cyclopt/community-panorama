import { memo, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Chip, CircularProgress, Grid, Typography } from "@mui/material";
import regression from "regression";
import { useTheme } from "@mui/material/styles";
import { TrendingUp, Info, TrendingFlat, TrendingDown, Warning } from "@mui/icons-material";
import pluralize from "pluralize";
import average from "@iamnapo/average";

import { filterOutliers, percentChange } from "../utils/index.js";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";

const characteristics = {
	LogicalLOC: {
		name: "Project Size Evolution (Lines of Code)",
		lowerBound: 0,
		upperBound: Number.POSITIVE_INFINITY,
		precision: 0,
		order: 1,
		minRange: 1000,
		coloring: {
			up: "error.main",
			flat: "primary.main",
			down: "success.main",
		},
		trend: {
			up: "The repository is in active development mode.",
			flat: "The repository is in maintenance mode.",
			down: "The repository is in maintenance mode.",
		},
	},
	CC: {
		name: "Cyclomatic Complexity Evolution",
		lowerBound: Number.NEGATIVE_INFINITY,
		upperBound: Number.POSITIVE_INFINITY,
		precision: 2,
		order: 5,
		minRange: 2,
		coloring: {
			up: "error.main",
			flat: "primary.main",
			down: "success.main",
		},
		trend: {
			up: "The complexity is growing (Quality Impact: Negative).",
			flat: "The complexity is stable.",
			down: "The complexity is decreasing (Quality Impact: Positive).",
		},
		forecast: {
			text: "the code will become significantly harder to maintain.",
			type: "max",
			threshold: 4,
		},
	},
	avLocPerFunction: {
		name: "Function Size Evolution (Lines of Code)",
		lowerBound: 0,
		upperBound: Number.POSITIVE_INFINITY,
		precision: 2,
		order: 1,
		minRange: 20,
		coloring: {
			up: "error.main",
			flat: "primary.main",
			down: "success.main",
		},
		trend: {
			up: "The cohesion of the code is decreasing (Quality Impact: Negative).",
			flat: "The cohesion of the code is stable.",
			down: "The cohesion of the code is increasing (Quality Impact: Positive).",
		},
		forecast: {
			text: "the code will require refactoring.",
			type: "max",
			threshold: 200,
		},
	},
	avLocPerClass: {
		name: "Class Size Evolution (Lines of Code)",
		lowerBound: 0,
		upperBound: Number.POSITIVE_INFINITY,
		precision: 2,
		order: 1,
		minRange: 20,
		coloring: {
			up: "error.main",
			flat: "primary.main",
			down: "success.main",
		},
		trend: {
			up: "The complexity of the code is decreasing (Quality Impact: Negative).",
			flat: "The complexity of the code is stable.",
			down: "The complexity of the code is increasing (Quality Impact: Positive).",
		},
		forecast: {
			text: "the code will require refactoring.",
			type: "max",
			threshold: 200,
		},
	},
	CommentsDensity: {
		name: "Comment Density Evolution",
		lowerBound: 0,
		upperBound: 100,
		precision: 2,
		order: 5,
		minRange: 5,
		coloring: {
			up: "success.main",
			flat: "primary.main",
			down: "error.main",
		},
		trend: {
			up: "The repository is in active development mode.",
			flat: "The repository is in maintenance mode.",
			down: "The repository is in maintenance mode.",
		},
	},
	DuplicateCodePct: {
		name: "Evolution of Percentage of Duplicate Code",
		lowerBound: 0,
		upperBound: 100,
		precision: 2,
		order: 5,
		minRange: 5,
		coloring: {
			up: "error.main",
			flat: "primary.main",
			down: "success.main",
		},
		trend: {
			up: "The repository is in active development mode.",
			flat: "The repository is in maintenance mode.",
			down: "The repository is in maintenance mode.",
		},
	},
};

const clampAndRound = (number, min, max, precision) => Number.parseFloat(Math.max(min, Math.min(number, max)).toFixed(precision));

const EvolutionOfSpecificQualityCharacteristic = (props) => {
	const { analysesInfo, characteristic } = props;
	const theme = useTheme();
	const { name, lowerBound, upperBound, precision, order, trend, forecast, minRange, coloring } = characteristics[characteristic];
	const x = useMemo(() => [...(analysesInfo?.hashes || [])].reverse(), [analysesInfo?.hashes]);
	const y = useMemo(() => (analysesInfo?.characteristics?.[characteristic] || []).map((e) => e || 0).reverse(),
		[analysesInfo?.characteristics, characteristic]);
	const { array: cleanY, min, max } = useMemo(() => filterOutliers(y), [y]);

	const { predict } = useMemo(() => regression.polynomial(cleanY.map((e, ind) => [ind, e]), {
		order: Math.min(cleanY.length - 1, order),
		precision: 10,
	}), [cleanY, order]);

	const r2 = useMemo(() => {
		const error = cleanY.map((val, ind) => val - predict(ind)[1]);
		const meanError = average(error, { get: Math.abs });
		const meanY = average(cleanY, { get: Math.abs });
		return meanError / meanY;
	}, [cleanY, predict]);

	const predicts = useMemo(() => {
		const preds = [];
		const cleans = [];
		for (const clY of [...cleanY].reverse()) {
			cleans.push(clY);
			if (cleans.length >= 2) {
				const { predict: pred } = regression.polynomial([...cleans].reverse().map((e, ind) => [ind, e]), {
					order: 1,
					precision: 10,
				});
				preds.push(pred);
			}
		}

		return preds;
	}, [cleanY]);

	const myPredict = useCallback((value) => average(predicts, { get: (v) => v(value)[1] }), [predicts]);

	const plotTrend = useMemo(() => {
		const a = clampAndRound(y.at(-1), lowerBound, upperBound, precision);
		const b = clampAndRound(myPredict(y.length + 2), lowerBound, upperBound, precision);
		const prediction = clampAndRound(myPredict(y.length + 4), lowerBound, upperBound, precision);
		if (!prediction) return "flat";
		if (a - b > 0.05 * a) return "down";
		if (a - b >= -0.05 * a) return "flat";
		return "up";
	}, [y, lowerBound, upperBound, precision, myPredict]);

	const forecastTrend = useMemo(() => {
		if (forecast) {
			for (let i = 1; i < 6; i++) {
				if (
					forecast.type === "max"
						? clampAndRound(predict(y.length + i - 1)[1], lowerBound, upperBound, precision) >= forecast.threshold
						: clampAndRound(predict(y.length + i - 1)[1], lowerBound, upperBound, precision) <= forecast.threshold
				) {
					return i;
				}
			}
		}

		return null;
	}, [forecast, lowerBound, precision, predict, upperBound, y.length]);

	const getRange = () => {
		const values = [
			...y,
			...y.map((_, ind) => clampAndRound(predict(ind)[1], lowerBound, upperBound, precision)),
			...Array.from({ length: 5 }).map((_, ind) => clampAndRound(
				myPredict(y.length + ind), lowerBound, upperBound, precision,
			)),
			...Array.from({ length: 5 }).map((_, ind) => clampAndRound(
				(1 + r2) * myPredict(y.length + ind), lowerBound, upperBound, precision,
			)),
			...Array.from({ length: 5 }).map((_, ind) => clampAndRound(
				(1 - r2) * myPredict(y.length + ind), lowerBound, upperBound, precision,
			)),
		];
		const center = (Math.max(...values) + Math.min(...values)) / 2;
		const yAxisMargin = 0.05;

		if (Math.max(...values) - Math.min(...values) >= minRange) {
			return [Math.min(...values) * (1 - yAxisMargin), Math.max(...values) * (1 + yAxisMargin)];
		}

		return [center - minRange / 2, center + minRange / 2];
	};

	return (
		<Card title={name}>
			<Grid container>
				{analysesInfo
					? (Object.keys(analysesInfo).length > 0
						? (
							<>
								<Grid item xs={12} md={8}>
									<Plot
										style={{ width: "100%", height: "20rem" }}
										data={[
											{
												y,
												type: "scatter",
												mode: "markers",
												name,
												marker: {
													color: y.map((el) => (el >= min && el <= max ? theme.palette.primary.main : theme.palette.grey[500])),
												},
											},
											{
												y: y.map((_, ind) => clampAndRound(predict(ind)[1], lowerBound, upperBound, precision)),
												type: "scatter",
												mode: "lines",
												name: "Actual Evolution Trend",
												line: { shape: "spline", smoothing: 2 },
											},
											{
												x: Array.from({ length: 5 }).map((_, ind) => y.length + ind),
												y: Array.from({ length: 5 }).map((_, ind) => clampAndRound(
													myPredict(y.length + ind), lowerBound, upperBound, precision,
												)),
												type: "scatter",
												mode: "lines",
												line: { dash: "dash" },
												name: "Forecast",
											},
											{
												x: Array.from({ length: 5 }).map((_, ind) => y.length + ind),
												y: Array.from({ length: 5 }).map((_, ind) => clampAndRound(
													(1 + r2) * myPredict(y.length + ind), lowerBound, upperBound, precision,
												)),
												type: "scatter",
												mode: "lines",
												line: { width: 0, color: "rgb(0,100,80,0.5)" },
												showlegend: false,
												name: `+${(r2 * 100).toFixed(2)}%`,
											},
											{
												x: Array.from({ length: 5 }).map((_, ind) => y.length + ind),
												y: Array.from({ length: 5 }).map((_, ind) => clampAndRound(
													(1 - r2) * myPredict(y.length + ind), lowerBound, upperBound, precision,
												)),
												type: "scatter",
												mode: "lines",
												fill: "tonexty",
												fillcolor: "rgba(0,100,80,0.2)",
												line: { width: 0, color: "rgb(0,100,80,0.5)" },
												showlegend: false,
												name: `-${(r2 * 100).toFixed(2)}%`,
											},
										]}
										layout={{
											xaxis: {
												title: "Latest 20 Commits",
												showgrid: true,
												zeroline: false,
												showticklabels: false,
												tickvals: Array.from({ length: y.length + 5 }).map((_, ind) => ind),
												ticktext: [
													...y.map((_, ind) => `Commit #${x[ind]}`),
													...Array.from({ length: 5 }).map((_, ind) => `Future Commit #${ind + 1}`),
												],
											},
											yaxis: {
												title: "Value",
												showgrid: true,
												zeroline: false,
												range: getRange(),
											},
											margin: { t: 20, l: 60, b: 30 },
											legend: {
												orientation: "h",
												x: 0.5,
												xanchor: "center",
												y: 1.1,
											},
										}}
									/>
								</Grid>
								<Grid
									item
									container
									direction="column"
									xs={12}
									md={4}
									alignItems="center"
									justifyContent="space-around"
									textAlign="center"
									spacing={2}
								>
									<Grid item>
										<Typography variant="h5" sx={{ mb: 3 }}>
											{"Evolution Summary"}
										</Typography>
										<Typography variant="h6" sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
											{"Trend: "}
											&nbsp;
											<Chip
												sx={{
													bgcolor: coloring[plotTrend],
													color: "white",
													">.MuiChip-icon": {
														color: "white",
													},
												}}
												label={plotTrend}
												icon={plotTrend === "up"
													? <TrendingUp />
													: plotTrend === "flat"
														? <TrendingFlat />
														: <TrendingDown />}
											/>
										</Typography>
										<Typography sx={{ mt: 2 }} display="flex">
											<Info color="primary" />
									&nbsp;
											{trend[plotTrend]}
										</Typography>
									</Grid>
									<Grid item>
										<Typography variant="h5" sx={{ mb: 3 }}>
											{"Forecast"}
										</Typography>
										<Grid container justifyContent="center" alignItems="center">
											<Typography variant="h6">
												{"Estimated value in 5 Commits: "}
											</Typography>
											&nbsp;
											<Typography variant="h6" sx={{ color: coloring[plotTrend] }}>
												{clampAndRound(myPredict(y.length + 4), lowerBound, upperBound, precision)}
												{clampAndRound(myPredict(y.length + 4), lowerBound, upperBound, precision) === 0
													? ""
													: ` (${percentChange(y.at(-1), clampAndRound(myPredict(y.length + 4), lowerBound, upperBound, precision))})`}
											</Typography>
										</Grid>
										{forecastTrend && (
											<Typography sx={{ mt: 2 }} display="flex">
												<Warning sx={{ color: "red.500" }} />
										&nbsp;
												{`In ${pluralize("commit", forecastTrend, true)} ${forecast.text}`}
											</Typography>
										)}
									</Grid>
								</Grid>
							</>
						)
						: (
							<Grid item xs={12} justifyContent="center" display="flex">
								<Typography>
									{"No data available."}
								</Typography>
							</Grid>
						))
					: (
						<Grid item xs={12} justifyContent="center" display="flex">
							<CircularProgress color="secondary" />
						</Grid>
					)}
			</Grid>
		</Card>
	);
};

EvolutionOfSpecificQualityCharacteristic.propTypes = {
	analysesInfo: PropTypes.object,
	characteristic: PropTypes.string.isRequired,
};

export default memo(EvolutionOfSpecificQualityCharacteristic);
