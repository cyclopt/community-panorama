import { useState, useEffect, useMemo, memo, useRef } from "react";
import PropTypes from "prop-types";
import { Box, Select, InputLabel, MenuItem, styled, FormControl } from "@mui/material";

import PrimaryToggleButton from "./PrimaryToggleButton.jsx";

import { dayjs } from "#utils";

const Container = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(2),
	marginTop: theme.spacing(2),
	marginBottom: theme.spacing(2),
}));

const ALL = "__ALL__";

const RangeSelector = ({
	onChange,
	maxDepth = 10,
	maxDistance = 6,
	showAllTime = true,
}) => {
	const options = useMemo(() => {
		const opts = [];
		let cursor = dayjs().startOf("month");
		for (let i = 0; i <= maxDepth; i++) {
			const label = cursor.format("MM-YYYY");
			opts.push({ key: label, label, value: cursor });
			cursor = cursor.subtract(1, "month");
		}

		return opts;
	}, [maxDepth]);

	// default: "From" at oldest, "To" at maxDistance months newer
	const defaultFrom = options.length - maxDistance;
	const defaultTo = 0;

	const [fromIdx, setFromIdx] = useState(defaultFrom);
	const [toIdx, setToIdx] = useState(defaultTo);

	const prev = useRef({ start: null, end: null });

	useEffect(() => {
		if (!onChange || !options[fromIdx] || !options[toIdx]) return;
		const newStart = options[fromIdx].value.startOf("month").toDate();
		const newEnd = options[toIdx].value.endOf("month").toDate();

		if (
			prev.current.start?.getTime?.() !== newStart.getTime?.()
      || prev.current.end?.getTime?.() !== newEnd.getTime?.()
		) {
			onChange({ start: newStart, end: newEnd });
			prev.current = { start: newStart, end: newEnd };
		}
	}, [fromIdx, toIdx, onChange, options]);

	const snapToAllTime = () => {
		// oldest index is the last item; newest is index 0
		setFromIdx(options.length - 1);
		setToIdx(0);
	};

	const handleFromChange = (e) => {
		if (e.target.value === ALL) {
			snapToAllTime();
			return;
		}

		const newFrom = options.findIndex((o) => o.key === e.target.value);
		let adjTo = toIdx;

		// if gap > maxDistance, push the "to" forward
		if (newFrom - toIdx > maxDistance) {
			adjTo = newFrom - maxDistance;
			setToIdx(adjTo);
		}

		setFromIdx(newFrom);
	};

	const handleToChange = (e) => {
		if (e.target.value === ALL) {
			snapToAllTime();
			return;
		}

		const newTo = options.findIndex((o) => o.key === e.target.value);
		let adjFrom = fromIdx;

		// if gap > maxDistance, pull the "from" backward
		if (fromIdx - newTo > maxDistance) {
			adjFrom = newTo + maxDistance;
			setFromIdx(adjFrom);
		}

		setToIdx(newTo);
	};

	return (
		<Container>
			<FormControl size="small" variant="outlined">
				<InputLabel id="from-label">{"From:"}</InputLabel>
				<Select
					labelId="from-label"
					value={options[fromIdx]?.key || ""}
					label="From"
					onChange={handleFromChange}
				>
					{showAllTime && <MenuItem value={ALL}>{"All time"}</MenuItem>}
					{options.map((opt, idx) => (
						<MenuItem
							key={opt.key}
							value={opt.key}
							disabled={idx < toIdx}
						>
							{opt.label}
						</MenuItem>
					))}
				</Select>
			</FormControl>
			<FormControl size="small" variant="outlined">
				<InputLabel id="to-label">{"To:"}</InputLabel>
				<Select
					labelId="to-label"
					value={options[toIdx]?.key || ""}
					label="To"
					size="small"
					onChange={handleToChange}
				>
					{showAllTime && <MenuItem value={ALL}>{"All time"}</MenuItem>}
					{options.map((opt, idx) => (
						<MenuItem
							key={opt.key}
							value={opt.key}
							disabled={idx > fromIdx}
						>
							{opt.label}
						</MenuItem>
					))}
				</Select>
			</FormControl>
			<PrimaryToggleButton
				title="All time"
				size="large"
				selected={fromIdx === options.length - 1 && toIdx === 0}
				onClick={snapToAllTime}
			/>
		</Container>
	);
};

RangeSelector.propTypes = {
	onChange: PropTypes.func.isRequired,
	maxDepth: PropTypes.number,
	maxDistance: PropTypes.number,
	showAllTime: PropTypes.bool,
};

export default memo(RangeSelector);
