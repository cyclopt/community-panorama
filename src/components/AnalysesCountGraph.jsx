import { memo } from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";

import { overridePlotlyButtons } from "../utils/index.js";

import Card from "./Card.jsx";
import Plot from "./Plot.jsx";

const AnalysesCountGraph = ({ data }) => (
	<Grid item>
		<Card title="Analyses Count" className="team-analyses-count">
			<Plot
				data={[
					{
						x: Object.keys(data),
						y: Object.values(data).map((a) => a.length),
						type: "bar",
						name: "Analyses Count",
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
					yaxis: { title: "Number of Analyses", showgrid: true, zeroline: false },
					margin: { t: 10, l: 60, r: 30, b: 70 },
					barmode: "stack",
				}}
				style={{ width: "100%", height: "18rem" }}
				onUpdate={() => overridePlotlyButtons("team-analyses-count", "this-is-required-to-work")}
			/>
		</Card>
	</Grid>
);

AnalysesCountGraph.propTypes = { data: PropTypes.object.isRequired };

export default memo(AnalysesCountGraph);
