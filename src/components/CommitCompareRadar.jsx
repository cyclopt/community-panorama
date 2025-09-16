import { memo } from "react";
import PropTypes from "prop-types";
import { CircularProgress } from "@mui/material";

import { convertQualityScoreToLetter } from "../utils/index.js";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";

const CommitCompareRadar = (props) => {
	const { commitInfo } = props;

	return (
		<Card boldHeader title="Metrics Comparison" contentClassName="commit-metrics-comparison-diagram">
			{commitInfo ? commitInfo.length > 0 ? (
				<Plot
					data={commitInfo.map((el) => ({
						r: el.r,
						type: "scatterpolar",
						name: el.name,
						fill: "toself",
						theta: ["Maintainability", "Security", "Readability", "Reusability", "Maintainability"],
						hovertext: el.r.map((e) => `${convertQualityScoreToLetter(e)} | ${el.name}`),
						hoverinfo: "text",
					}))}
					layout={{
						showlegend: false,
						margin: { t: 30, l: 30, r: 30, b: 30 },
						polar: {
							radialaxis: {
								visible: true,
								range: [0, 1],
								tickvals: [0.14, 0.415, 0.65, 0.9],
								ticktext: ["<em>D</em>", "<em>C</em>", "<em>B</em>", "<em>A</em>"],
							},
						},
					}}
				/>
			) : <span>{"No data available!"}</span> : (<CircularProgress color="secondary" />)}
		</Card>
	);
};

CommitCompareRadar.propTypes = { commitInfo: PropTypes.array };

export default memo(CommitCompareRadar);
