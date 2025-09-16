import { memo } from "react";
import PropTypes from "prop-types";
import { CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";

const EvolutionOfViolations = (props) => {
	const { analysesInfo } = props;

	const theme = useTheme();

	return (
		<Card title="Evolution of Violations" contentClassName="evolution-of-violations-diagram">
			{analysesInfo ? (Object.keys(analysesInfo).length > 0 ? (
				<Plot
					data={Object.keys(analysesInfo.violations).reverse().map((el) => ({
						x: [...analysesInfo.hashes].reverse().map((e) => `Commit #${e}`),
						y: [...analysesInfo.violations[el]].reverse(),
						type: "scatter",
						mode: "lines+markers",
						name: el,
						line: {
							color: el === "Critical" ? theme.palette.red[900] : (el === "Major" ? theme.palette.deepOrange[300] : theme.palette.yellow[700]),
						},
					}))}
					layout={{
						xaxis: { title: "Latest 20 Commits", showgrid: true, zeroline: false, tickangle: -45, showticklabels: false },
						yaxis: { title: "Number of Violations", showgrid: true, zeroline: false },
						margin: { t: 20, l: 40 },
					}}
				/>
			) : <span>{"No data available!"}</span>) : (<div style={{ display: "flex", justifyContent: "center" }}><CircularProgress color="secondary" /></div>)}
		</Card>
	);
};

EvolutionOfViolations.propTypes = { analysesInfo: PropTypes.object };

export default memo(EvolutionOfViolations);
