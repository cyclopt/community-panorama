import { useState, memo, useEffect } from "react";
import PropTypes from "prop-types";
import { CircularProgress, MenuItem } from "@mui/material";

import { useProjectOverview6ForMember } from "../api/index.js";
import { overridePlotlyButtons, sum, useSnackbar, dayjs } from "../utils/index.js";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";
import Select from "./Select.jsx";

const MemberEfficiency = (props) => {
	const { projectId, memberUsername = "" } = props;
	const [diagramType, setDiagramType] = useState("Commits");
	const [perPeriod, setPerPeriod] = useState("week");
	const { error } = useSnackbar();
	const { overview = [], isLoading, isError } = useProjectOverview6ForMember(projectId, memberUsername);

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	const x = new Set();
	const y = [];

	for (const [rawDay, value] of [...overview].reverse()) {
		const day = dayjs(rawDay);
		if (x.has(day.startOf(perPeriod).toISOString())) {
			if (diagramType === "Commits") y[y.length - 1] += value.length;
			else y[y.length - 1] += sum(value);
		} else {
			x.add(day.startOf(perPeriod).toISOString());
			if (diagramType === "Commits") y.push(value.length);
			else y.push(sum(value));
		}
	}

	return (
		<Card title={`${memberUsername}’s Efficiency`} contentClassName="member-efficiency">
			<div className="columns">
				<div className="column is-8" />
				<div className="field is-horizontal column is-4" style={{ padding: "0.375rem" }}>
					<div className="field-body">
						<div className="field">
							<Select id="diagramType" defaultValue="Commits" onChange={(e) => projectId && setDiagramType(e.target.value)}>
								<MenuItem value="Commits">{"Commits"}</MenuItem>
								<MenuItem value="Lines of Code">{"Lines of Code"}</MenuItem>
							</Select>
						</div>
					</div>
				</div>
			</div>
			{isLoading ? <CircularProgress color="secondary" /> : (x.size > 0 ? (
				<Plot
					data={[{ x: [...x], y, type: "bar", mode: "lines", name: diagramType }]}
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
						yaxis: { title: diagramType === "Commits" ? "Number of commits" : "Number of lines", showgrid: true, zeroline: false },
						margin: { t: 10, l: 40, r: 30, b: 70 },
					}}
					onUpdate={() => overridePlotlyButtons("member-efficiency", projectId, setPerPeriod)}
				/>
			) : <span>{"No data available!"}</span>)}
		</Card>
	);
};

MemberEfficiency.propTypes = { projectId: PropTypes.string, memberUsername: PropTypes.string };

export default memo(MemberEfficiency);
