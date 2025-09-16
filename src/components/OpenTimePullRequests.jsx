import PropTypes from "prop-types";
import { useState, memo } from "react";

import { dayjs, overridePlotlyButtons, sum } from "../utils/index.js";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";

const OpenTimePullRequests = ({ openTimeMap, data }) => {
	const [perPeriod, setPerPeriod] = useState("week");

	const tz = dayjs.tz.guess();

	const x = new Set();
	const y = [];

	for (const { closedDate: _closed, pullRequestId: _id } of data) {
		const closed = dayjs(_closed).tz(tz);

		const timeBetween = openTimeMap?.get(_id)?.ms;

		if (x.has(closed.startOf(perPeriod).format())) {
			y.at(y.length - 1 || 0).push(timeBetween);
		} else {
			x.add(closed.startOf(perPeriod).format());
			y.push([timeBetween]);
		}
	}

	const yAvg = y.map((ySub) => sum(ySub) / ySub.length);
	const yRev = [...y].reverse();
	const yRunningAvg = yRev.map((a, i) => {
		if (i === 0) return sum(a) / a.length;
		return (sum(yRev[i - 1]) + sum(a)) / (yRev[i - 1].length + a.length);
	});

	return (
		<Card title="Open Time Trends" className="open-time-trends">
			<Plot
				data={[
					{ x: [...x], y: yAvg.map((yA) => (yA / (60 * 60 * 1000)).toFixed(2)), type: "bar", mode: "lines", name: "Average" },
					{ x: [...x], y: [...yRunningAvg].reverse().map((yA) => (yA / (60 * 60 * 1000)).toFixed(2)), type: "scatter", mode: "lines", name: "Running Avg." },
				]}
				layout={{
					showlegend: false,
					xaxis: {
						tickformat: "%d %b",
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
					yaxis: { title: "Avg. Pull Request Duration (hr)", showgrid: true, zeroline: false },
					margin: { t: 10, l: 40, r: 30, b: 70 },
					barmode: "stack",
				}}
				style={{ width: "100%", height: "18rem" }}
				onUpdate={() => overridePlotlyButtons("open-time-trends", "this-is-required-to-work", setPerPeriod)}
			/>
		</Card>
	);
};

OpenTimePullRequests.propTypes = {
	openTimeMap: PropTypes.object,
	data: PropTypes.array,
};

export default memo(OpenTimePullRequests);
