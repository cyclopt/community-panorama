import { useMemo, useEffect, useState, memo } from "react";
import PropTypes from "prop-types";
import { Box, CircularProgress, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useTheme } from "@emotion/react";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";

import { useSnackbar, dayjs, overridePlotlyButtons } from "#utils";

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────
const CenteredBox = styled(Box)(({ theme }) => ({
	marginTop: theme.spacing(2),
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
}));

const PlotWrapper = styled(Box)(() => ({
	width: "100%",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	height: "18rem",
}));

// ─── ORGANIZATIONBEAT COMPONENT ─────────────────────────────────────────────
const OrganizationBeat = ({ commitsByDay = [], isLoading = false }) => {
	const [perPeriod, setPerPeriod] = useState("week");
	const { error } = useSnackbar();
	const theme = useTheme();

	// If you have an isError flag from some data‐fetch hook, replace this stub
	const isError = false;

	useEffect(() => {
		if (isError) {
			error("An error occurred while loading commit data.");
		}
	}, [isError, error]);

	// Group commits into buckets (one bucket per startOf(perPeriod)),
	// then extract sorted keys + corresponding y arrays.
	const { x, y1, y2, y3 } = useMemo(() => {
		const buckets = {};
		for (const { date, counts, additions, deletions } of commitsByDay) {
			const bucketKey = dayjs(date).startOf(perPeriod).format("YYYY-MM-DD");
			if (!buckets[bucketKey]) {
				buckets[bucketKey] = { counts: 0, additions: 0, deletions: 0 };
			}

			buckets[bucketKey].counts += counts;
			buckets[bucketKey].additions += additions;
			buckets[bucketKey].deletions += deletions;
		}

		const sortedKeys = Object.keys(buckets).sort((a, b) => (a < b ? -1 : 1));
		return {
			x: sortedKeys,
			y1: sortedKeys.map((k) => buckets[k].counts),
			y2: sortedKeys.map((k) => buckets[k].additions),
			y3: sortedKeys.map((k) => buckets[k].deletions),
		};
	}, [commitsByDay, perPeriod]);

	const hasData = useMemo(() => x.length > 0, [x]);

	return (
		<Card title="Team beat" contentClassName="team-project-beat" width="100%" contentStyle={{ display: "flex", justifyContent: "center" }}>
			{isLoading ? (
				<CircularProgress color="secondary" />
			) : hasData ? (
				<PlotWrapper>
					<Plot
						revision={`${perPeriod}|${x.join(",")}`}
						data={[
							{
								x,
								y: y1,
								type: "bar",
								name: "Commits",
								marker: { color: theme.palette.primary.main },
							},
							{
								x,
								y: y2,
								type: "bar",
								name: "Additions",
								marker: { color: theme.palette.success.main },
							},
							{
								x,
								y: y3,
								type: "bar",
								name: "Deletions",
								marker: { color: theme.palette.error.main },
							},
						]}
						layout={{
							showlegend: false,
							xaxis: {
								autorange: true,
								title: "Date",
								showgrid: true,
								zeroline: false,
								type: "date",
								rangeselector: {
									buttons: [
										{ count: 7, label: "week", step: "day", stepmode: "backward" },
										{ count: 1, label: "month", step: "month", stepmode: "backward" },
									],
								},
							},
							yaxis: {
								title: "Number of contributions",
								showgrid: true,
								zeroline: false,
							},
							margin: { t: 10, l: 40, r: 30, b: 70 },
							barmode: "group", // bars side by side
						}}
						style={{ width: "100%", height: "18rem" }}
						onUpdate={() => overridePlotlyButtons("team-project-beat", commitsByDay.length, setPerPeriod)}
					/>
				</PlotWrapper>
			) : (
				<CenteredBox>
					<Typography variant="body2" color="textSecondary">
						{"No data available!"}
					</Typography>
				</CenteredBox>
			)}
		</Card>
	);
};

OrganizationBeat.propTypes = {
	commitsByDay: PropTypes.arrayOf(
		PropTypes.shape({
			date: PropTypes.string.isRequired,
			counts: PropTypes.number.isRequired,
			additions: PropTypes.number.isRequired,
			deletions: PropTypes.number.isRequired,
		}),
	),
	isLoading: PropTypes.bool,
};

export default memo(OrganizationBeat);
