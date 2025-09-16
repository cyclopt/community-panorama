import { memo } from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";

import { overridePlotlyButtons } from "../utils/index.js";

import Card from "./Card.jsx";
import Plot from "./Plot.jsx";

const AnalysesTimeGraph = ({ data }) => (
	<Grid item>
		<Card title="Total Analyses Time per day" className="total-analyses-time-per-day">
			<Plot
				data={[
					{
						x: Object.keys(data),
						y: Object.values(data).map((a) => Number.parseFloat(a.reduce(
							(pr, cur) => pr + cur,
						) / (1000 * 60)).toFixed(2)),
						type: "bar",
						name: "Total Analyses Time per day",
					},
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

					},
					yaxis: { title: "Time (in minutes)", showgrid: true, zeroline: false },
					margin: { t: 10, l: 60, r: 30, b: 70 },
					barmode: "stack",
				}}
				style={{ width: "100%", height: "18rem" }}
				onUpdate={() => overridePlotlyButtons("total-analyses-time-per-day", "this-is-required-to-work")}
			/>
		</Card>
	</Grid>
);

AnalysesTimeGraph.propTypes = { data: PropTypes.object.isRequired };

export default memo(AnalysesTimeGraph);
