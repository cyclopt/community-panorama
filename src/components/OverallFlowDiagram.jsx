import { memo, useEffect, useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { CircularProgress, Box, Grid } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { shallow } from "zustand/shallow";

import { useProjectOverallFlowDiagram } from "../api/index.js";
import useLocalStorage from "../utils/use-local-storage.js";
import { useSnackbar, dayjs } from "../utils/index.js";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";
import LegendButtons from "./LegendButtons.jsx";
import NoDataAvailable from "./NoDataAvailable.jsx";

const OverallFlowDiagram = (props) => {
	const theme = useTheme();
	const { projectId, sprint } = props;
	const [hiddenColumns, setHiddenColumns] = useState(["Closed", "Done", "Accepted"]);
	const { kanbanTheme } = useLocalStorage(useCallback((e) => ({
		kanbanTheme: e?.kanbanTheme,
	}), []), shallow);

	const { error } = useSnackbar();
	const { overview = [], isLoading, isError } = useProjectOverallFlowDiagram(projectId, sprint?._id ?? sprint?.title);

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
			if (["Backlog"].includes(colName)) color = theme.palette[`workloadBacklog${kanbanTheme}`].main;
			if (["To Do"].includes(colName)) color = theme.palette[`workloadSprintPlanning${kanbanTheme}`].main;
			if (["Open"].includes(colName)) color = theme.palette[`workloadInProgress${kanbanTheme}`].main;
			if (["Closed", "Done", "Accepted"].includes(colName)) color = theme.palette[`workloadAccepted${kanbanTheme}`].main;

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
			title="Overall Flow Diagram"
			tooltip={`The overall flow diagram shows the number of all project's tasks from their creation until the time they were closed.
			Each line indicates how many tasks are present in each stage of the process at a given time.`}
			contentStyle={{ minHeight: "25rem", height: "100%", display: "flex", alignItems: "center", flexDirection: "column" }}
		>
			<Box sx={{ flexGrow: 1, width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
				{isLoading ? <CircularProgress color="secondary" /> : (data?.length > 0 ? (
					<Grid container display="flex" flexDirection="column" sx={{ height: "100%" }}>
						<LegendButtons data={data} hiddenColumns={hiddenColumns} setHiddenColumns={setHiddenColumns} />
						<Grid item sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
							<Plot
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
				) : <NoDataAvailable text="No data available!" sx={{ height: "8rem" }} />)}
			</Box>
		</Card>
	);
};

OverallFlowDiagram.propTypes = {
	projectId: PropTypes.string.isRequired,
	sprint: PropTypes.object,
};

export default memo(OverallFlowDiagram);
