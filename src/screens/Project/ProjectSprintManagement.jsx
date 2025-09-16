import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { Grid, Typography, Avatar, IconButton, ButtonGroup, TextField } from "@mui/material";
import { MobileDatePicker } from "@mui/x-date-pickers";
import { useTheme } from "@mui/material/styles";
import { Calendar, Views } from "react-big-calendar";
import queryString from "query-string";
import { shallow } from "zustand/shallow";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";

import { dayjs, dayjsLocalizer, useLocalStorage } from "../../utils/index.js";
import { useProjectSprints, useProjectSprintTasks } from "../../api/index.js";

const localizer = dayjsLocalizer();

const ProjectSprintsManagement = (props) => {
	const { project } = props;
	const theme = useTheme();
	const { pathname, search } = useLocation();
	const [timePeriod, setTimePeriod] = useState(dayjs().startOf("month"));
	const { sprints = [] } = useProjectSprints(project._id, true);
	const { tasks = [] } = useProjectSprintTasks(project._id);
	const [events, setEvents] = useState([]);
	const navigate = useNavigate();
	const { kanbanTheme } = useLocalStorage(useCallback((e) => ({
		kanbanTheme: e?.kanbanTheme,
	}), []), shallow);

	useEffect(() => {
		setEvents(sprints?.reduce((acc, sprint) => {
			const sprintTasks = tasks.filter((t) => t?.sprint === sprint._id);
			acc.push({
				title: sprint.title,
				start: dayjs(sprint.startDate),
				end: dayjs(sprint.endDate),
				resource: {
					_id: sprint._id,
					active: sprint.active,
					tasks: sprintTasks,
				},
			});

			return acc;
		}, []));
	}, [sprints, tasks]);

	useEffect(() => {
		const parsed = queryString.parse(search);

		// change timePeriod only if it has the default value (meaning start of month date)
		if (parsed?.["time-period"] && timePeriod.isSame(dayjs().startOf("month")) && dayjs(parsed?.["time-period"]).isValid()) {
			setTimePeriod(dayjs(parsed["time-period"]));
		}
	}, [search, timePeriod]);

	const Event = useCallback(({ event: { title, resource: { tasks: sprintTasks, active = true } } }) => (
		<Grid container pl={1} flexDirection="row" alignItems="flex-end" justifyContent="flex-start" flexWrap="nowrap" sx={{ borderBottomRightRadius: "1rem", cursor: (active ? "pointer" : "auto") }}>
			<Grid item>
				<Typography fontWeight="normal" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
					{title}
				</Typography>
			</Grid>
			<Grid item ml={1}>
				<Avatar
					sx={{
						bgcolor: "pink.main",
						maxWidth: (t) => t.spacing(3.2),
						maxHeight: (t) => t.spacing(3.2),
						fontSize: 14,
					}}
				>
					<Typography style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: "3ch" }}>{sprintTasks.length}</Typography>
				</Avatar>
			</Grid>
		</Grid>
	), []);

	const Toolbar = useCallback(() => (
		<Grid container direction="row" alignItems="center">
			<Grid item xs={3.5}>
				<MobileDatePicker
					value={dayjs(timePeriod ?? null)}
					format="MMMM, YYYY"
					views={["month", "year"]}
					sx={{ m: 2 }}
					slotProps={{
						actionBar: { actions: ["cancel"] },
						textField: {
							placeholder: "Set an end date",
							size: "small",
							variant: "standard",
							error: false,
							inputProps: {
								sx: { color: theme.palette.primary.main, fontWeight: "600", fontSize: 35, cursor: "pointer" },
							},
						},
					}}
					slots={{
						textField: ({ value, ...tprops }) => <TextField {...tprops} value={(dayjs(value).isValid()) ? value : ""} />,
					}}
					onAccept={(date_) => {
						const parsed = queryString.parse(search);
						parsed["time-period"] = dayjs(date_)?.utc(true)?.format("MM-DD-YYYY") ?? null;
						navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
						setTimePeriod(date_ ? dayjs(date_).utc(true).startOf("d") : null);
					}}
				/>
			</Grid>
			<Grid item direction="column">
				<ButtonGroup
					variant="contained"
					orientation="vertical"
					color="secondary"
					sx={{ p: 0, bgcolor: theme.palette.pink.main }}
					size="small"
				>
					<IconButton
						sx={{ p: 0 }}
						size="small"
						title="Previous month"
						aria-label="Previous month"
						onClick={() => {
							const parsed = queryString.parse(search);
							const updatedTimePeriod = timePeriod.add(1, "month").utc(true);
							parsed["time-period"] = updatedTimePeriod.format("MM-DD-YYYY");
							navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
							setTimePeriod(updatedTimePeriod);
						}}
					>
						<KeyboardArrowUp sx={{ color: "white" }} />
					</IconButton>
					<IconButton
						sx={{ p: 0 }}
						size="small"
						title="Next month"
						aria-label="Next month"
						onClick={() => {
							const parsed = queryString.parse(search);
							const updatedTimePeriod = timePeriod.subtract(1, "month").utc(true);
							parsed["time-period"] = updatedTimePeriod.format("MM-DD-YYYY");
							navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
							setTimePeriod(updatedTimePeriod);
						}}
					>
						<KeyboardArrowDown sx={{ color: "white" }} />
					</IconButton>
				</ButtonGroup>
			</Grid>
		</Grid>
	), [navigate, pathname, search, theme.palette.pink.main, theme.palette.primary.main, timePeriod]);

	return (
		<Grid container direction="row" spacing={3} m={-1.5} mb={1} sx={{ "> .MuiGrid-item": { p: 1.5 } }}>
			<Grid item xs={12}>
				<Calendar
					popup
					style={{ height: "90vh" }}
					localizer={localizer}
					allDayAccessor={() => true}
					events={events}
					date={timePeriod}
					views={[Views.MONTH]}
					components={{ event: Event, toolbar: Toolbar }}
					eventPropGetter={() => ({ style: { backgroundColor: theme.palette[`workloadSprintPlanning${kanbanTheme}`].main } })}
					onSelectEvent={({ resource }) => (resource.active ? navigate(`/projects/${project._id}/project-analytics/kanban?sprint=${resource._id}`)
						: false)}
				/>

			</Grid>
		</Grid>
	);
};

ProjectSprintsManagement.propTypes = { project: PropTypes.object.isRequired };

export default ProjectSprintsManagement;
