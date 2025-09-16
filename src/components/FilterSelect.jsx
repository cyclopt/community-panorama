import { memo, useState, useMemo } from "react";
import PropTypes from "prop-types";
import {
	Box,
	MenuItem,
	ListSubheader,
	Checkbox,
	Typography,
	Collapse,
	IconButton,
	styled,
	Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import Select from "./Select.jsx"; // your existing styled Select

import { capitalize } from "#utils";

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────
const Container = styled(Box)(({ theme }) => ({
	display: "flex",
	flexDirection: "row",
	justifyContent: "center",
	alignItems: "center",
	width: theme.spacing(25),
}));

const GroupLabel = styled(
	ListSubheader,
	{ shouldForwardProp: (prop) => prop !== "level" && prop !== "disabled" },
)(({ theme, disabled }) => ({
	display: "flex",
	alignItems: "center",
	cursor: disabled ? "default" : "pointer",
	color: disabled ? theme.palette.text.disabled : theme.palette.text.primary,
	pointerEvents: disabled ? "none" : "auto",
}));

const OptionItem = styled(
	MenuItem,
	{ shouldForwardProp: (prop) => prop !== "level" && prop !== "disabled" },
)(({ disabled }) => ({
	display: "flex",
	alignItems: "center",
	opacity: disabled ? 0.5 : 1,
	pointerEvents: disabled ? "none" : "auto",
}));

// ─── FILTERSELECT COMPONENT ───────────────────────────────────────────────
const FilterSelect = ({
	label,
	options,
	selected = [],
	onChange,
	placeholder,
}) => {
	const [openGroups, setOpenGroups] = useState({});

	const displayValue = useMemo(
		() => (selected.length > 0 ? selected.map((s) => {
			const metricMatch = /^(.+?)&&&level&&&(\d+)$/.exec(s);
			if (metricMatch) {
				const [, metricKey, levelStr] = metricMatch;
				return `${capitalize(metricKey)} LvL ${capitalize(levelStr)}`;
			}

			return s;
		}).join(", ") : placeholder),
		[placeholder, selected],
	);

	const toggleGroup = (id, disabled) => {
		if (disabled) return;
		setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const toggleItem = (id) => {
		const next = selected.includes(id)
			? selected.filter((v) => v !== id)
			: [...selected, id];
		onChange(next);
	};

	const renderTree = (nodes, level = 0) => nodes.map((node, idx) => {
		const { id, label: lbl, children, disabled = false } = node;
		if (children) {
			const isOpen = !!openGroups[id];
			return (
				<Box key={id}>
					<GroupLabel
						level={level}
						disabled={disabled}
						component="div"
						onClick={() => toggleGroup(id, disabled)}
					>
						<Typography variant="body2" sx={{ flexGrow: 1, userSelect: "none" }}>
							{lbl}
						</Typography>
						<IconButton
							size="small"
							disabled={disabled}
							sx={{ visibility: disabled ? "hidden" : "visible" }}
						>
							<ExpandMoreIcon
								fontSize="small"
								sx={{
									transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
									transition: "0.2s",
								}}
							/>
						</IconButton>
					</GroupLabel>
					{idx + 1 < nodes.length && <Divider sx={{ mx: 2 }} />}
					<Collapse unmountOnExit in={isOpen} timeout="auto">
						{renderTree(children, level + 1)}
					</Collapse>
				</Box>
			);
		}

		// leaf node
		return (
			<OptionItem
				key={id}
				level={level}
				disabled={disabled}
				onClick={(e) => {
					e.stopPropagation();
					toggleItem(id);
				}}
			>
				<Checkbox
					disableRipple
					size="small"
					checked={selected.includes(id)}
					disabled={disabled}
					tabIndex={-1}
					sx={{ p: 0, m: 0 }}
				/>
				<Typography
					variant="body2"
					sx={{ color: disabled ? (theme) => theme.palette.text.disabled : "inherit" }}
				>
					{lbl}
				</Typography>
			</OptionItem>
		);
	});

	return (
		<Container>
			<Select
				// secondary
				multiple
				displayEmpty
				label={label}
				labelId={`${label}-filter-label`}
				id={`${label}-filter-select`}
				value={selected}
				placeHolder="pliz select"
				renderValue={() => displayValue}
			>
				{renderTree(options)}
			</Select>
		</Container>
	);
};

FilterSelect.propTypes = {
	label: PropTypes.string.isRequired,
	placeholder: PropTypes.string,
	options: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.string.isRequired,
			label: PropTypes.string.isRequired,
			children: PropTypes.array,
			disabled: PropTypes.bool,
		}),
	).isRequired,
	selected: PropTypes.arrayOf(PropTypes.string),
	onChange: PropTypes.func.isRequired,
};

export default memo(FilterSelect);
