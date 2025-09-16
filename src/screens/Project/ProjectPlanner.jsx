import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { Grid, Tab, Tabs, Typography } from "@mui/material";
import { Calendar, Views } from "react-big-calendar";
import { useTheme } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";
import pluralize from "pluralize";
import queryString from "query-string";

import Tile from "../../components/Tile.jsx";
import { dayjs, dayjsLocalizer, useSnackbar, createEpicPlan } from "../../utils/index.js";
import { loadProjectEpicMetrics, useProjectEpics, useProjectTasks } from "../../api/index.js";

import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dayjsLocalizer();

const ProjectPlanner = (props) => {
	const { project } = props;
	const { error } = useSnackbar();
	const { pathname, search } = useLocation();
	const navigate = useNavigate();
	const { epics = [] } = useProjectEpics(project._id, true);
	const { tasks = [] } = useProjectTasks(project._id, false);
	const theme = useTheme();
	const [metrics, setMetrics] = useState({});
	const [tab, setTab] = useState(0);
	const [events, setEvents] = useState([]);

	const Event = useCallback(({ event: { title, start, end, resource: { closed, type, critical } } }) => (
		<Grid container justifyContent="space-between">
			<Grid item sx={{ overflow: "hidden", width: "calc(100% - 75px)" }}>
				<Typography fontWeight={type === "critical" ? "bold" : "normal"}>
					{title}
				</Typography>
			</Grid>
			<Grid item hidden={type === "critical"} sx={{ width: "75px", textAlign: "end" }}>
				<Typography fontWeight="bold">
					{(() => {
						if (closed) return "Closed";
						if (
							(type === "task" && dayjs(end).isAfter(dayjs(epics[tab - 2]?.dueDate || undefined), "day"))
							|| (type === "epic" && (dayjs(end).isBefore(dayjs(), "day") || (critical?.end?.isAfter(dayjs(end)))))
							|| (type === "all_tasks" && dayjs(end).isBefore(dayjs(), "day"))
						) {
							return "Delayed";
						}

						return "On Time";
					})()}
				</Typography>
			</Grid>
			<Grid item hidden={type !== "critical"} sx={{ width: "75px", textAlign: "end" }}>
				<Typography fontWeight="bold">
					{pluralize("day", Math.ceil(end.diff(start, "day", true) + 1) || "-", true)}
				</Typography>
			</Grid>
		</Grid>
	), [epics, tab]);

	useEffect(() => {
		(async () => {
			try {
				const emetrics = await loadProjectEpicMetrics(project._id);
				setMetrics(emetrics);
			} catch {
				error();
			}
		})();
	}, [error, project._id]);

	useEffect(() => {
		if (tab === 0) {
			setEvents(tasks.reduce((acc, cur) => {
				if (cur.dueDate) {
					acc.push({
						title: cur.title,
						start: dayjs(cur.dueDate),
						end: dayjs(cur.dueDate),
						resource: {
							_id: cur._id,
							type: "all_tasks",
							blockedBy: cur.blockedBy,
						},
					});
				}

				return acc;
			}, []));
		} else if (tab === 1) {
			setEvents(epics.map((epic, ind) => {
				const epicPlan = createEpicPlan(epic);
				return {
					title: epic.title,
					start: dayjs(epic.startDate || undefined),
					end: dayjs(epic.dueDate || undefined),
					resource: {
						closed: epic.closed,
						tab: ind + 2,
						_id: epic._id,
						tasks: epic.tasks,
						type: "epic",
						critical: epicPlan?.[0],
					},
				};
			}));
		} else {
			const epicPlan = createEpicPlan(epics[tab - 2]);
			if (epicPlan) {
				setEvents(epicPlan);
			} else {
				setEvents([]);
				error("Can’t show tasks because there is a cyclic reference.");
			}
		}
	}, [epics, error, tab, tasks]);

	useEffect(() => {
		try {
			const { tab: tab_ } = queryString.parse(search);
			if (tab_ && tab_ !== tab) {
				if (tab_ < 2) {
					setTab(Number(tab_));
				} else if (epics.length > 0) {
					setTab(Number(tab_));
				}
			}
		} catch {
			error();
		}
	}, [epics, error, search, tab, tasks]);

	return (
		<Grid container direction="row" spacing={3} m={-1.5} mb={1} sx={{ "> .MuiGrid-item": { p: 1.5 } }}>
			<Grid item xs><Tile row={2} number={metrics.totalEpics} content="total epics" /></Grid>
			<Grid item xs><Tile row={2} number={metrics.meanWorkload} content="epics mean workload (days)" /></Grid>
			<Grid item xs={12}>
				<Tabs
					value={tab}
					onChange={(_, newVal) => {
						const parsed = queryString.parse(search);
						parsed.tab = newVal;
						navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
						setTab(newVal);
					}}
				>
					<Tab label="all tasks" />
					<Tab label="all epics" />
					{epics.map((e) => <Tab key={`tab_${e._id}`} label={e.title} />)}
				</Tabs>
			</Grid>
			<Grid item xs={12}>
				<Calendar
					popup
					style={{ height: "90vh" }}
					localizer={localizer}
					allDayAccessor={() => true}
					events={events}
					views={[Views.MONTH]}
					eventPropGetter={({ end, resource: { closed, type, critical } }) => {
						let backgroundColor = theme.palette.primary.main;
						if (type === "critical") {
							backgroundColor = theme.palette.secondary.main;
						} else if (closed) {
							backgroundColor = theme.palette.green[500];
						} else if (
							(type === "task" && dayjs(end).isAfter(dayjs(epics[tab - 2]?.dueDate || undefined), "day"))
							|| (type === "epic" && (dayjs(end).isBefore(dayjs(), "day") || (critical?.end?.isAfter(dayjs(end)))))
							|| (type === "all_tasks" && dayjs(end).isBefore(dayjs(), "day"))
						) {
							backgroundColor = theme.palette.red[500];
						}

						return ({ style: { backgroundColor } });
					}}
					components={{ event: Event }}
					onSelectEvent={({ resource }) => {
						if (resource.type === "epic") {
							setTab(resource.tab);
						} else if (["task", "all_tasks"].includes(resource.type)) {
							navigate(`/projects/${project._id}/project-analytics/management?id=${resource._id}`);
						}
					}}
				/>

			</Grid>
		</Grid>
	);
};

ProjectPlanner.propTypes = { project: PropTypes.object.isRequired };

export default ProjectPlanner;
