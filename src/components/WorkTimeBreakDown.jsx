import { memo, useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { CircularProgress, Box, MenuItem } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { shallow } from "zustand/shallow";
import { useNavigate, useLocation } from "react-router-dom";
import queryString from "query-string";

import { useProjectWorkDownBreakTime } from "../api/index.js";
import useLocalStorage from "../utils/use-local-storage.js";
import { useSnackbar, dayjs } from "../utils/index.js";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";
import Select from "./Select.jsx";
import NoDataAvailable from "./NoDataAvailable.jsx";

const WorkTimeBreakDown = (props) => {
	const theme = useTheme();
	const { pathname, search } = useLocation();
	const navigate = useNavigate();
	const { kanbanTheme } = useLocalStorage(useCallback((e) => ({
		kanbanTheme: e?.kanbanTheme,
	}), []), shallow);
	const { projectId, sprint } = props;
	const [type, setType] = useState("labels");
	const [currentSprint, setCurrentSprint] = useState(false);
	const { error } = useSnackbar();
	const { overview = {}, isLoading, isError } = useProjectWorkDownBreakTime(projectId, sprint?._id ?? sprint?.title);

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	useEffect(() => {
		try {
			const { type: type_ } = queryString.parse(search);
			if (type_ && (type_ !== type)) {
				setType(type_);
			}
		} catch {
			// error();
		}
	}, [search, type]);

	const labels = [];
	const values = [];

	for (const [key, value] of (overview?.[type]?.entries() ?? {})) {
		if (value > 0) {
			labels.push(key);
			values.push(value);
		}
	}

	const availableColors = [
		theme.palette[`workloadBacklog${kanbanTheme}`].main,
		theme.palette[`workloadSprintPlanning${kanbanTheme}`].main,
		theme.palette[`workloadInProgress${kanbanTheme}`].main,
		theme.palette[`workloadDelivered${kanbanTheme}`].main,
		theme.palette[`workloadAccepted${kanbanTheme}`].main,
	];

	useEffect(() => {
		const parsed = queryString.parse(search);
		const date = new Date();
		if (parsed.sprint === undefined) {
			setCurrentSprint(true);
		} else if (dayjs(sprint.endDate).startOf("d") > dayjs(date).startOf("d") || dayjs(sprint.endDate).startOf("d") === dayjs(date).startOf("d")) {
			setCurrentSprint(true);
		} else {
			setCurrentSprint(false);
			parsed.type = "labels";
			navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
		}
	}, [navigate, pathname, search, sprint.endDate]);

	return (
		<Card
			title="Work Time BreakDown"
			tooltip={(type === "labels")
				? "The work time breakdown chart shows the current number of tasks categorized by their labels"
				: "The work time breakdown chart show the current number of tasks categorized by their current status"}
			contentStyle={{ minHeight: "25rem", height: "100%", display: "flex", alignItems: "center", flexDirection: "column" }}
		>
			{currentSprint && (

				<Select
					value={type}
					sx={{ alignSelf: "flex-start" }}
					onChange={(e) => {
						const parsed = queryString.parse(search);
						parsed.type = e.target.value;
						navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
						setType(e.target.value);
					}}
				>

					<MenuItem value="labels">{"Labels"}</MenuItem>
					<MenuItem value="columns">{"Columns"}</MenuItem>

				</Select>
			)}
			<Box sx={{ flexGrow: 1, width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
				{isLoading ? <CircularProgress color="secondary" /> : (labels.length > 0 ? (
					<Plot
						data={[{
							labels,
							values,
							type: "pie",
							name: "Work Time BreakDown",
							textposition: "outside",
							textinfo: "label+percent",
							sort: false,
							automargin: true,
							marker: {
								colors: labels.map((label, ind) => {
									if (type === "labels") return availableColors[(ind + 1) % (labels.length)];
									if (["Backlog"].includes(label)) return theme.palette[`workloadBacklog${kanbanTheme}`].main;
									if (["To Do", "Sprint Planning"].includes(label)) return theme.palette[`workloadSprintPlanning${kanbanTheme}`].main;
									if (["Open", "In Progress"].includes(label)) return theme.palette[`workloadInProgress${kanbanTheme}`].main;
									if (["Delivered"].includes(label)) return theme.palette[`workloadDelivered${kanbanTheme}`].main;
									if (["Closed", "Done", "Accepted"].includes(label)) return theme.palette[`workloadAccepted${kanbanTheme}`].main;
									return theme.palette.workloadArchived.main;
								}),
								line: { color: "#fff", width: 3 },
							},
						}]}
						layout={{ showlegend: false, margin: { t: 40, l: 40, b: 40 } }}
					/>
				)
					: <NoDataAvailable text="No data available!" sx={{ height: "8rem" }} />)}
			</Box>
		</Card>
	);
};

WorkTimeBreakDown.propTypes = {
	projectId: PropTypes.string.isRequired,
	sprint: PropTypes.object,
};

export default memo(WorkTimeBreakDown);
