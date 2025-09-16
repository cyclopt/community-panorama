import { memo, useState } from "react";
import { useTheme, styled } from "@mui/material/styles";
import Measure from "react-measure";
import pluralize from "pluralize";
import PropTypes from "prop-types";

import Tooltip from "../Tooltip.jsx";

import { dayjs } from "#utils";

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────
const TimeLineContainer = styled("div")({
	width: "100%",
});

const MeasureWrapper = styled("div")({
	width: "100%",
});

const SvgChart = styled("svg")({
	width: "100%",
});

const WeekLabel = styled("text")({
	fontSize: 9,
	alignmentBaseline: "central",
	fill: "#AAA",
	textAnchor: "middle",
});

const MonthLabel = styled("text")({
	fontSize: 10,
	alignmentBaseline: "central",
	fill: "#AAA",
	textAnchor: "middle",
});

// ─── TIMELINE COMPONENT ───────────────────────────────────────────────────
const TimeLine = ({ values = {}, scale = 1 }) => {
	const [columns, setColumns] = useState(53);
	const {
		palette: { grey, green },
	} = useTheme();

	// Build a 2D array of contributions per week/day
	const contributions = [];
	for (let i = 0; i < columns; i++) {
		contributions[i] = [];
		for (let j = 0; j < 7; j++) {
			const date = dayjs()
				.endOf("week")
				.subtract((columns - i - 1) * 7 + (6 - j), "days");
			contributions[i][j] = date.isSameOrBefore(dayjs().endOf("day"))
				? { value: values[date.format("YYYY-MM-DD")] || 0, month: date.month() }
				: null;
		}
	}

	const cells = [];
	// Render contribution rectangles with tooltip
	for (const [i, week] of contributions.entries()) {
		for (const [j, cell] of week.entries()) {
			if (cell) {
				const fillLevels = [
					grey[300],
					grey[300],
					green[200],
					green[300],
					green[400],
					green[500],
					green[700],
					green[900],
				];
				cells.push(
					<Tooltip
						key={`cell_${i}_${j}`}
						title={`${pluralize(
							"contribution",
							cell.value === 0 ? cell.value : Math.round((cell.value - 1) * scale),
							true,
						)}.`}
						PopperProps={{ disablePortal: false }}
					>
						<rect
							x={15 + 13 * i}
							y={15 + 13 * j}
							width={11}
							height={11}
							fill={fillLevels[Math.ceil(cell.value)]}
						/>
					</Tooltip>,
				);
			}
		}
	}

	// Weekday labels
	for (const [i, dayChar] of [..."SMTWTFS"].entries()) {
		cells.push(
			<WeekLabel key={`weeklabel_${i}`} x={7.5} y={20.5 + 13 * i}>
				{dayChar}
			</WeekLabel>,
		);
	}

	// Month labels
	let prevMonth = -1;
	for (const [i, week] of contributions.entries()) {
		const firstDay = week[0];
		if (firstDay && firstDay.month !== prevMonth) {
			cells.push(
				<MonthLabel key={`monthlabel_${i}`} x={20.5 + 13 * i} y={7.5}>
					{["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][firstDay.month]}
				</MonthLabel>,
			);
			prevMonth = firstDay.month;
		}
	}

	return (
		<TimeLineContainer>
			<Measure
				bounds
				onResize={({ bounds }) => {
					if (!bounds) return;
					const weeksVisible = Math.floor((bounds.width - 15) / 13);
					setColumns(Math.min(weeksVisible, 53));
				}}
			>
				{({ measureRef }) => (
					<MeasureWrapper ref={measureRef}>
						<SvgChart height={110}>
							{cells}
						</SvgChart>
					</MeasureWrapper>
				)}
			</Measure>
		</TimeLineContainer>
	);
};

TimeLine.propTypes = {
	values: PropTypes.object,
	scale: PropTypes.number,
};

export default memo(TimeLine);
