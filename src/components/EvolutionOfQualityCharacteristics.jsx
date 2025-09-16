import { memo } from "react";
import PropTypes from "prop-types";
import { CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";

const EvolutionOfQualityCharacteristics = (props) => {
	const { analysesInfo } = props;
	const theme = useTheme();

	return (
		<Card title="Evolution of Quality Characteristics" contentClassName="evolution-of-quality-characterestics-diagram">
			{analysesInfo ? (Object.keys(analysesInfo).length > 0 ? (
				<Plot
					data={Object.keys(analysesInfo.qualities).map((el) => ({
						x: [...analysesInfo.hashes].reverse().map((e) => `Commit #${e}`),
						y: [...analysesInfo.qualities[el]].reverse().map((e) => (e || 0) * 100),
						hovertext: [...analysesInfo.qualities[el]].reverse().map((e) => `${Number.parseInt((e || 0) * 100, 10)} | ${el}`),
						type: "scatter",
						mode: "lines+markers",
						name: el,
						hoverinfo: "x+text",
					}))}
					layout={{
						xaxis: { title: "Latest 20 Commits", showgrepositoryId: true, zeroline: false, tickangle: -45, showticklabels: false },
						yaxis: {
							title: "Rating",
							showgrid: true,
							zeroline: false,
							showticklabels: true,
							tickvals: [17, 41.5, 65, 90],
							ticktext: ["<em>D</em>", "<em>C</em>", "<em>B</em>", "<em>A</em>"],
							tickfont: { size: 16 },
						},
						margin: { t: 20, l: 30 },
						shapes: [
							{
								type: "rect",
								x0: `Commit #${[...analysesInfo.hashes].reverse()[0]}`,
								x1: `Commit #${[...analysesInfo.hashes].reverse()[analysesInfo.hashes.length - 1]}`,
								y0: 0,
								y1: 33,
								fillcolor: theme.palette.red[700],
								opacity: 0.3,
								line: { width: 0 },
							},
							{
								type: "rect",
								x0: `Commit #${[...analysesInfo.hashes].reverse()[0]}`,
								x1: `Commit #${[...analysesInfo.hashes].reverse()[analysesInfo.hashes.length - 1]}`,
								y0: 33,
								y1: 55,
								fillcolor: theme.palette.deepOrange[700],
								opacity: 0.2,
								line: { width: 0 },
							},
							{
								type: "rect",
								x0: `Commit #${[...analysesInfo.hashes].reverse()[0]}`,
								x1: `Commit #${[...analysesInfo.hashes].reverse()[analysesInfo.hashes.length - 1]}`,
								y0: 55,
								y1: 80,
								fillcolor: theme.palette.yellow[700],
								opacity: 0.2,
								line: { width: 0 },
							},
							{
								type: "rect",
								x0: `Commit #${[...analysesInfo.hashes].reverse()[0]}`,
								x1: `Commit #${[...analysesInfo.hashes].reverse()[analysesInfo.hashes.length - 1]}`,
								y0: 80,
								y1: 100,
								fillcolor: theme.palette.green[700],
								opacity: 0.2,
								line: { width: 0 },
							},
						],
					}}
				/>
			) : <span>{"No data available!"}</span>) : (<div style={{ display: "flex", justifyContent: "center" }}><CircularProgress color="secondary" /></div>)}
		</Card>
	);
};

EvolutionOfQualityCharacteristics.propTypes = { analysesInfo: PropTypes.object };

export default memo(EvolutionOfQualityCharacteristics);
