import { useState, memo, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { Grid, Box, CircularProgress, MenuItem, Typography } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import queryString from "query-string";

import { useProjectVelocity } from "../api/index.js";
import { POSSIBLE_COLUMNS, useSnackbar, dayjs } from "../utils/index.js";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";
import Select from "./Select.jsx";
import NoDataAvailable from "./NoDataAvailable.jsx";

const Velocity = (props) => {
	const { projectId, sprint, kanban, hasExternalTasks } = props;
	const { pathname, search } = useLocation();
	const navigate = useNavigate();
	const [toColumn, setToColumn] = useState(POSSIBLE_COLUMNS.get(kanban.style).at(-1));
	const [diagramType, setDiagramType] = useState("Tasks");
	const { error } = useSnackbar();
	const columnOptions = [...POSSIBLE_COLUMNS.get(kanban.style).slice(1), ...(kanban.hasArchived ? ["Archived"] : [])];
	const { overview = {}, isLoading, isError } = useProjectVelocity(projectId, sprint?._id ?? sprint?.title, columnOptions);

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	useEffect(() => {
		try {
			const { diagramType: diagramType_, toColumn: toColumn_ } = queryString.parse(search);
			if (Boolean(diagramType_) && (diagramType_ !== diagramType)) {
				setDiagramType(diagramType_);
			}

			if (toColumn_ && (toColumn !== toColumn_)) {
				setToColumn(toColumn_);
			}
		} catch {
			// error();
		}
	}, [diagramType, search, toColumn]);

	const data = useMemo(() => {
		const x = new Set();
		const y = [];

		for (const [rawDay, value] of [...(overview[toColumn] || [])].reverse()) {
			const day = dayjs(rawDay);
			if (x.has(day.startOf("d").toISOString())) {
				if (diagramType === "Tasks") y[y.length - 1] += value[0];
				else y[y.length - 1] += value[1];
			} else {
				x.add(day.startOf("d").toISOString());
				if (diagramType === "Tasks") y.push(value[0]);
				else y.push(value[1]);
			}
		}

		if (x.size === 1 && y.every((cy) => cy === 0)) return [];

		return [{
			x: [...x],
			y: y.map((e) => e.toFixed(2)),
			type: "scatter",
			mode: "lines",
		}];
	}, [diagramType, overview, toColumn]);

	return (
		<Card
			title="Velocity/Throughput"
			tooltip={`Velocity is the amount of valuable work (measured in points by default) delivered over a period of time. You can also
			choose to measure velocity in number of tasks and over different boards (default is Delivered).`}
			contentClassName="velocity-diagram"
			contentStyle={{ minHeight: "25rem", height: "100%", display: "flex", alignItems: "center", flexDirection: "column" }}
		>
			<Box display="flex" justifyContent="center" alignItems="center" width="100%" mb={1}>
				<Box display="flex" alignItems="center" justifyContent="center" flexGrow={1}>
					{hasExternalTasks
						? <Typography>{"Tasks"}</Typography>
						: (
							<Select
								id="diagramType"
								value={diagramType}
								defaultValue="Tasks"
								onChange={(e) => {
									const parsed = queryString.parse(search);
									parsed.diagramType = e.target.value;
									navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
									setDiagramType(e.target.value);
								}}
							>
								<MenuItem value="Tasks">{"Tasks"}</MenuItem>
								<MenuItem value="Points">{"Points"}</MenuItem>
							</Select>
						)}
				</Box>
				<Box ml={1} mr={1}>
					<Typography fontWeight="bold">{"moved to: "}</Typography>
				</Box>
				<Box display="flex" alignItems="center" justifyContent="center" flexGrow={1}>
					{hasExternalTasks
						? <Typography>{toColumn}</Typography>
						: (
							<Select
								id="column"
								value={toColumn}
								defaultValue={columnOptions.at(kanban.hasArchived ? -2 : -1)}
								onChange={(e) => {
									const parsed = queryString.parse(search);
									parsed.toColumn = columnOptions.find((el) => el === e.target.value) || "Accepted";
									navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
									setToColumn(columnOptions.find((el) => el === e.target.value) || "Accepted");
								}}
							>
								{columnOptions.map((el, ind) => <MenuItem key={`column${el}_${ind}`} value={el}>{el}</MenuItem>)}
							</Select>
						)}
				</Box>
			</Box>
			<Box sx={{ flexGrow: 1, width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
				{isLoading ? <CircularProgress color="secondary" /> : (data?.length > 0 ? (
					<Grid container display="flex" flexDirection="column">
						<Grid item>
							<Plot
								data={data}
								layout={{
									xaxis: {
										title: "Date",
										showgrid: true,
										zeroline: false,
										type: "date",
									},
									yaxis: { title: diagramType === "Tasks" ? "Number of tasks" : "Number of points", showgrid: true, zeroline: false, rangemode: "nonnegative" },
									margin: { t: 10, l: 40, r: 30, b: 70 },
								}}
							/>
						</Grid>
					</Grid>
				) : <NoDataAvailable text="No data available!" sx={{ height: "8rem" }} />)}
			</Box>
		</Card>
	);
};

Velocity.propTypes = {
	projectId: PropTypes.string.isRequired,
	sprint: PropTypes.object,
	kanban: PropTypes.object.isRequired,
	hasExternalTasks: PropTypes.bool,
};

export default memo(Velocity);
