import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import Measure from "react-measure";
import pluralize from "pluralize";
import PropTypes from "prop-types";

import { dayjs } from "../utils/index.js";

import Tooltip from "./Tooltip.jsx";

const Timeline = ({ values = {}, scale = 1 }) => {
	const [columns, setColumns] = useState(53);
	const { palette: { grey, green } } = useTheme();

	const contributions = [];
	for (let i = 0; i < columns; i++) {
		contributions[i] = [];
		for (let j = 0; j < 7; j++) {
			const date = dayjs().endOf("week").subtract((columns - i - 1) * 7 + (6 - j), "days");
			contributions[i][j] = date.isSameOrBefore(dayjs().endOf("d"))
				? { value: values[date.format("YYYY-MM-DD")] || 0, month: date.month() }
				: null;
		}
	}

	const innerDom = [];

	for (let i = 0; i < columns; i++) {
		for (let j = 0; j < 7; j++) {
			const contribution = contributions[i][j];
			if (contribution) {
				innerDom.push(
					<Tooltip
						key={`panel_key_${i}_${j}`}
						title={`${pluralize("contribution", Math.round((contribution.value - 1) * scale), true)}.`}
						PopperProps={{ disablePortal: false }}
					>
						<rect
							x={15 + 13 * i}
							y={15 + 13 * j}
							width={11}
							height={11}
							fill={[
								grey[300],
								grey[300],
								green[200],
								green[300],
								green[400],
								green[500],
								green[700],
								green[900],
							][Math.ceil(contribution.value)]}
						/>
					</Tooltip>,
				);
			}
		}
	}

	for (const [i, weekName] of ["S", "M", "T", "W", "T", "F", "S"].entries()) {
		innerDom.push(
			<text
				key={`week_key_${i}`}
				style={{ fontSize: 9, alignmentBaseline: "central", fill: "#AAA" }}
				x={7.5}
				y={20.5 + 13 * i}
				textAnchor="middle"
			>
				{weekName}
			</text>,
		);
	}

	let prevMonth = -1;
	for (let i = 0; i < columns; i++) {
		const c = contributions[i][0];
		if (c) {
			if (c?.month !== prevMonth) {
				innerDom.push(
					<text
						key={`month_key_${i}`}
						style={{ fontSize: 10, alignmentBaseline: "central", fill: "#AAA" }}
						x={20.5 + 13 * i}
						y={7.5}
						textAnchor="middle"
					>
						{["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][c.month]}
					</text>,
				);
			}

			prevMonth = c.month;
		}
	}

	return (
		<Measure
			bounds
			onResize={(rect) => {
				if (!rect.bounds) return;
				const visibleWeeks = Math.floor((rect.bounds.width - 15) / 13);
				setColumns(Math.min(visibleWeeks, 53));
			}}
		>
			{({ measureRef }) => (
				<div ref={measureRef} style={{ width: "100%" }}>
					<svg style={{ width: "100%" }} height="110">
						{innerDom}
					</svg>
				</div>
			)}
		</Measure>
	);
};

Timeline.propTypes = { values: PropTypes.object, scale: PropTypes.number };

export default Timeline;
