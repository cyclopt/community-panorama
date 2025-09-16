import { useState, memo, useEffect } from "react";
import PropTypes from "prop-types";
import { CircularProgress } from "@mui/material";

import { useProjectOverview6 } from "../api/index.js";
import { overridePlotlyButtons, useSnackbar, dayjs } from "../utils/index.js";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";

const TeamProjectBeat = (props) => {
	const { projectId } = props;
	const [perPeriod, setPerPeriod] = useState("week");
	const { error } = useSnackbar();
	const { overview = [], isLoading, isError } = useProjectOverview6(projectId);

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	const x = new Set();
	const y1 = [];
	const y2 = [];

	for (const [rawDay, value] of [...overview].reverse()) {
		const day = dayjs(rawDay);
		if (x.has(day.startOf(perPeriod).toISOString())) {
			y1[y1.length - 1] += value[0];
			y2[y2.length - 1] += value[1];
		} else {
			x.add(day.startOf(perPeriod).toISOString());
			y1.push(value[0]);
			y2.push(value[1]);
		}
	}

	return (
		<Card title="Project beat" contentClassName="team-project-beat">
			{isLoading ? <CircularProgress color="secondary" /> : (x.size > 0 ? (
				<Plot
					data={[
						{ x: [...x], y: y1, type: "bar", mode: "lines", name: "Dev" },
						{ x: [...x], y: y2, type: "bar", mode: "lines", name: "Ops" },
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
						yaxis: { title: "Number of contributions", showgrid: true, zeroline: false },
						margin: { t: 10, l: 40, r: 30, b: 70 },
						barmode: "stack",
					}}
					style={{ width: "100%", height: "18rem" }}
					onUpdate={() => overridePlotlyButtons("team-project-beat", projectId, setPerPeriod)}
				/>
			) : <span>{"No data available!"}</span>)}
		</Card>
	);
};

TeamProjectBeat.propTypes = { projectId: PropTypes.string.isRequired };

export default memo(TeamProjectBeat);
