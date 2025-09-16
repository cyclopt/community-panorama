import { memo, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { CircularProgress, Box, Grid } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { shallow } from "zustand/shallow";

import useLocalStorage from "../utils/use-local-storage.js";
import { useSnackbar, dayjs } from "../utils/index.js";
import { useProjectSprintFlowDiagram } from "../api/index.js";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";
import LegendButtons from "./LegendButtons.jsx";
import NoDataAvailable from "./NoDataAvailable.jsx";

const SprintFlowDiagram = (props) => {
	const { projectId, kanban, sprint } = props;
	const theme = useTheme();
	const [hiddenColumns, setHiddenColumns] = useState([]);
	const { kanbanTheme } = useLocalStorage(useCallback((e) => ({
		kanbanTheme: e?.kanbanTheme,
	}), []), shallow);
	const { error } = useSnackbar();
	const { overview = [], isLoading, isError } = useProjectSprintFlowDiagram(projectId, sprint?._id ?? sprint?.title);

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	const data = useMemo(() => {
		const data_ = [];
		const x = new Set();
		const y = {};
		for (const [rawDay, columnMap] of [...overview].reverse()) {
			const day = dayjs(rawDay);
			if (!x.has(day.startOf("d").format())) {
				x.add(day.startOf("d").format());
				for (const [colName, value] of columnMap.entries()) {
					if (!y[colName]) y[colName] = [];
					y[colName].push(value);
				}
			}
		}

		for (const [colIndex, colName] of Object.keys(y).entries()) {
			let color = theme.palette.workloadArchived.main;
			if (["Sprint Planning"].includes(colName)) color = theme.palette[`workloadSprintPlanning${kanbanTheme}`].main;
			if (["In Progress"].includes(colName)) color = theme.palette[`workloadInProgress${kanbanTheme}`].main;
			if (["Delivered"].includes(colName)) color = theme.palette[`workloadDelivered${kanbanTheme}`].main;

			const summedY = [];
			const ys = Object.keys(y)
				.filter((col) => !hiddenColumns.includes(col))
				.slice(0, colIndex + 1)
				.reduce((acc, col) => { acc.push(y[col]); return acc; }, []);

			if (ys.length > 0) {
				for (let yIndex = 0; yIndex <= ys[0].length; yIndex++) {
					let sum = 0;
					let isNull = true;
					for (const yColValues of ys) {
						sum += yColValues[yIndex];
						isNull = isNull && (yColValues[yIndex] === null);
					}

					if (isNull) summedY.push(null);
					else summedY.push(sum);
				}
			}

			data_.push({
				x: [...x],
				y: summedY,
				text: y[colName],
				hovertemplate: "%{text}",
				type: "scatter",
				mode: "lines",
				name: colName,
				fill: "tonexty",
				line: { color },
				...(hiddenColumns.includes(colName) ? { visible: "legendonly" } : {}),
			});
		}

		return data_;
	}, [kanbanTheme, overview, theme.palette, hiddenColumns]);

	return (
		<Card
			title="Sprint Flow Diagram"
			tooltip={`The flow diagram shows the number of tasks in each "active" stage over time.
			Each line indicates how many tasks are present in each stage of the process at a given time.`}
			contentStyle={{ minHeight: "25rem", height: "100%", display: "flex", alignItems: "center", flexDirection: "column" }}
		>
			<Box sx={{ flexGrow: 1, width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
				{isLoading ? <CircularProgress color="secondary" /> : ((data?.length > 0 || kanban === "none") ? (
					<Grid container display="flex" flexDirection="column" sx={{ height: "100%" }}>
						<LegendButtons data={data} hiddenColumns={hiddenColumns} setHiddenColumns={setHiddenColumns} />
						<Grid item sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
							<Plot
								loading
								data={data}
								layout={{
									xaxis: {
										title: "Date",
										showgrid: true,
										zeroline: false,
										type: "date",
									},
									yaxis: { title: "Number of Tasks", showgrid: true, zeroline: false, rangemode: "nonnegative" },
									showlegend: false,
									margin: { t: 20, l: 40 },
								}}
							/>
						</Grid>
					</Grid>
				) : <NoDataAvailable text="No data available" sx={{ height: "8rem" }} />)}
			</Box>

		</Card>
	);
};

SprintFlowDiagram.propTypes = {
	projectId: PropTypes.string.isRequired,
	kanban: PropTypes.string.isRequired,
	sprint: PropTypes.object,
};

export default memo(SprintFlowDiagram);
