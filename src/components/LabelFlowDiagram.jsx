import { useState, memo, useEffect } from "react";
import PropTypes from "prop-types";
import { CircularProgress } from "@mui/material";

import { overridePlotlyButtons, useSnackbar, dayjs } from "../utils/index.js";
import { useProjectOverview7 } from "../api/index.js";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";
import NoDataAvailable from "./NoDataAvailable.jsx";

const LabelFlowDiagram = (props) => {
	const { projectId } = props;
	const [perPeriod, setPerPeriod] = useState("week");
	const { error } = useSnackbar();
	const { overview = [], isLoading, isError } = useProjectOverview7(projectId);

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	const x = new Set();
	const y = {};

	for (const [rawDay, columnMap] of [...overview].reverse()) {
		const day = dayjs(rawDay);
		if (!x.has(day.startOf(perPeriod).toISOString())) {
			x.add(day.startOf(perPeriod).toISOString());
			for (const [colName, value] of columnMap.entries()) {
				if (!y[colName]) y[colName] = [];
				y[colName].push(value);
			}
		}
	}

	return (
		<Card
			title="Label Flow Diagram"
			tooltip={`The label flow diagram shows the number of tasks with each label over time.
			Each line indicates how many tasks have a certain label at a given time.`}
			contentClassName="label-workflow-diagram"
		>
			{isLoading ? <CircularProgress color="secondary" /> : (x.size > 0 ? (
				<Plot
					data={Object.keys(y).map((el) => ({
						x: [...x],
						y: y[el],
						type: "scatter",
						mode: "lines",
						name: el,
						stackgroup: "one",
					}))}
					layout={{
						xaxis: {
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
						yaxis: { title: "Number of Tasks", showgrid: true, zeroline: false },
						margin: { t: 20, l: 40 },
					}}
					onUpdate={() => overridePlotlyButtons("label-workflow-diagram", projectId, setPerPeriod)}
				/>
			) : <NoDataAvailable text="No data available!" sx={{ height: "8rem" }} />)}
		</Card>
	);
};

LabelFlowDiagram.propTypes = { projectId: PropTypes.string.isRequired };

export default memo(LabelFlowDiagram);
