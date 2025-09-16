import { useState, memo, useEffect } from "react";
import PropTypes from "prop-types";
import { CircularProgress, MenuItem } from "@mui/material";

import { overridePlotlyButtons, sum, useSnackbar, dayjs } from "../utils/index.js";
import { useProjectOverview5ForMember } from "../api/index.js";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";
import Select from "./Select.jsx";

const MemberWorkLoad = (props) => {
	const { projectId, memberUsername = "" } = props;

	const [diagramType, setDiagramType] = useState("Tasks");
	const [perPeriod, setPerPeriod] = useState("week");

	const { error } = useSnackbar();
	const { overview = { assigned: [], opened: [] }, isLoading, isError } = useProjectOverview5ForMember(projectId, memberUsername);

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	const x1 = new Set();
	let y1 = [];
	const x2 = new Set();
	let y2 = [];

	let arr = [...overview.assigned].reverse();
	for (const [ind, [rawDay, value]] of arr.entries()) {
		const day = dayjs(rawDay);
		if (x1.has(day.startOf(perPeriod).toISOString())) {
			if (diagramType === "Tasks") {
				y1[y1.length - 1] = [...y1.at(-1), ...value[0]];
			} else {
				for (const [ind2, taskNumber] of value[0].entries()) {
					if (!arr[ind - 1][1][0].includes(taskNumber)) {
						y1[y1.length - 1] = [...y1.at(-1), value[1][ind2]];
					}
				}
			}
		} else {
			x1.add(day.startOf(perPeriod).toISOString());
			if (diagramType === "Tasks") y1.push(value[0]);
			else y1.push(value[1]);
		}
	}

	arr = [...overview.opened].reverse();
	for (const [ind, [rawDay, value]] of arr.entries()) {
		const day = dayjs(rawDay);
		switch (perPeriod) {
			case "day": {
				x2.add(day.startOf("day").toISOString());
				if (diagramType === "Tasks") y2.push(value[0]);
				else y2.push(value[1]);

				break;
			}

			case "week": {
				if (x2.has(day.startOf("week").toISOString())) {
					if (diagramType === "Tasks") {
						y2[y2.length - 1] = [...y2.at(-1), ...value[0]];
					} else {
						for (const [ind2, taskNumber] of value[0].entries()) {
							if (!arr[ind - 1][1][0].includes(taskNumber)) {
								y2[y2.length - 1] = [...y2.at(-1), value[1][ind2]];
							}
						}
					}
				} else {
					x2.add(day.startOf("week").toISOString());
					if (diagramType === "Tasks") y2.push(value[0]);
					else y2.push(value[1]);
				}

				break;
			}

			case "month": {
				if (x2.has(day.startOf("month").toISOString())) {
					if (diagramType === "Tasks") {
						y2[y2.length - 1] = [...y2.at(-1), ...value[0]];
					} else {
						for (const [ind2, taskNumber] of value[0].entries()) {
							if (!arr[ind - 1][1][0].includes(taskNumber)) {
								y2[y2.length - 1] = [...y2.at(-1), value[1][ind2]];
							}
						}
					}
				} else {
					x2.add(day.startOf("month").toISOString());
					if (diagramType === "Tasks") y2.push(value[0]);
					else y2.push(value[1]);
				}

				break;
			}

			default:
			// Do nothing
		}
	}

	if (diagramType === "Tasks") {
		y1 = y1.map((e) => new Set(e).size);
		y2 = y2.map((e) => new Set(e).size);
	} else {
		y1 = y1.map((e) => sum(e));
		y2 = y2.map((e) => sum(e));
	}

	return (
		<Card title={`${memberUsername}’s Workload`} contentClassName="member-workload">
			<div className="columns">
				<div className="column is-8" />
				<div className="field is-horizontal column is-4" style={{ padding: "0.375rem" }}>
					<div className="field-body">
						<div className="field">
							<Select
								placeholder="Select diagram"
								id="diagramType"
								defaultValue="Tasks"
								onChange={(e) => projectId && setDiagramType(e.target.value)}
							>
								<MenuItem value="Tasks">{"Tasks"}</MenuItem>
								<MenuItem value="Points">{"Points"}</MenuItem>
							</Select>
						</div>
					</div>
				</div>
			</div>
			{isLoading ? <CircularProgress color="secondary" /> : (x1.size > 0 ? (
				<Plot
					data={[
						{ x: [...x1], y: y1, type: "scatter", mode: "lines", name: "Assigned" },
						{ x: [...x2], y: y2, type: "scatter", mode: "lines", name: "Opened" },
					]}
					layout={{
						showlegend: false,
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
						yaxis: { title: diagramType === "Tasks" ? "Number of tasks" : "Number of points", showgrid: true, zeroline: false },
						margin: { t: 10, l: 40, r: 30, b: 70 },
					}}
					onUpdate={() => overridePlotlyButtons("member-workload", projectId, setPerPeriod)}
				/>
			) : <span>{"No data available!"}</span>)}
		</Card>
	);
};

MemberWorkLoad.propTypes = { projectId: PropTypes.string, memberUsername: PropTypes.string };

export default memo(MemberWorkLoad);
