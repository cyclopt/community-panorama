import PropTypes from "prop-types";
import { useState, memo } from "react";

import { dayjs, overridePlotlyButtons } from "../utils/index.js";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";

const ClosedPullRequests = ({ data }) => {
	const [perPeriod, setPerPeriod] = useState("week");

	const tz = dayjs.tz.guess();

	const x = new Set();
	const y = [];

	for (const { closedDate: _closed } of data) {
		const closed = dayjs(_closed).tz(tz);
		if (x.has(closed.startOf(perPeriod).format())) {
			y[y.length - 1] += 1;
		} else {
			x.add(closed.startOf(perPeriod).format());
			y.push(1);
		}
	}

	return (
		<Card title="Closed Pull Requests" className="closed-pull-requests">
			<Plot
				data={[
					{ x: [...x], y, type: "bar", mode: "lines", name: "Pull Requests" },
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
					yaxis: { title: "Closed Pull Requests", showgrid: true, zeroline: false },
					margin: { t: 10, l: 40, r: 30, b: 70 },
					barmode: "stack",
				}}
				style={{ width: "100%", height: "18rem" }}
				onUpdate={() => overridePlotlyButtons("closed-pull-requests", "this-is-required-to-work", setPerPeriod)}
			/>
		</Card>
	);
};

ClosedPullRequests.propTypes = {
	data: PropTypes.array,
};

export default memo(ClosedPullRequests);
