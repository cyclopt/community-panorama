import { memo } from "react";
import PropTypes from "prop-types";
import { Box, styled } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

import PrimaryToggleButton from "./PrimaryToggleButton.jsx";
import Tooltip from "./Tooltip.jsx";

// ─── FULL-WIDTH WRAPPER ──────────────────────────────────────────────────────
const Wrapper = styled(Box)(() => ({
	width: "100%",
	display: "flex",
	justifyContent: "center",
}));

// ─── SCROLLABLE CONTAINER ────────────────────────────────────────────────────
const ScrollContainer = styled(Box, {
	shouldForwardProp: (prop) => prop !== "gap",
})(({ gap = 1, theme }) => ({
	display: "flex",
	overflowX: "auto",
	flexWrap: "nowrap",
	width: "auto", // shrink-to-fit content
	maxWidth: "100%", // never exceed wrapper
	justifyContent: "flex-start",
	gap: typeof gap === "number"
		? theme.spacing(gap)
		: gap,
	// hide scrollbars
	"&::-webkit-scrollbar": { display: "none" },
	msOverflowStyle: "none",
	scrollbarWidth: "none",
	scrollSnapType: "x mandatory",
}));

/**
 * ToggleButtonTabs
 * Replaces MUI Tabs with a row of PrimaryToggleButtons.
 * Centers when all fit, scrolls when overflowing.
 */
const ToggleButtonTabs = memo(({ tabs, defaultValue, onChange, sx = {}, gap = 1 }) => {
	const location = useLocation();
	const navigate = useNavigate();

	// derive current activeTab from path or defaultValue
	const currentPath = location.pathname;
	const activeTab = tabs.find((tab) => currentPath.includes(tab.path))
    || tabs.find((tab) => tab.value === defaultValue);

	const handleClick = (tab) => {
		if (onChange) onChange(tab.value);
		if (tab.path) navigate(tab.path, { relative: "path" });
	};

	return (
		<Wrapper>
			<ScrollContainer gap={gap} sx={sx}>
				{tabs.map((tab) => (
					<Tooltip
						key={tab.value}
						title={tab.tooltip}
						disabled={!tab.disabled}
					>
						<span>

							<PrimaryToggleButton
								id={`toggle-${tab.value}`}
								title={tab.label}
								size="medium"
								disabled={tab.disabled}
								imageSources={tab.imageSources}
								selected={activeTab?.value === tab.value}
								minWidth={100} // each button at least 100px
								onClick={() => handleClick(tab)}
							/>
						</span>
					</Tooltip>
				))}
			</ScrollContainer>
		</Wrapper>
	);
});

ToggleButtonTabs.propTypes = {
	tabs: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.string.isRequired,
			value: PropTypes.string.isRequired,
			path: PropTypes.string,
			icon: PropTypes.element,
		}),
	).isRequired,
	defaultValue: PropTypes.string,
	onChange: PropTypes.func,
	sx: PropTypes.object,
	gap: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

ToggleButtonTabs.defaultProps = {
	defaultValue: "",
	onChange: undefined,
	sx: {},
	gap: 1,
};

export default ToggleButtonTabs;
