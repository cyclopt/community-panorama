import { memo, useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { Button, styled, Box } from "@mui/material";
import { darken } from "@mui/material/styles";

import Tooltip from "./Tooltip.jsx";

const ICON_PX = 24;
const SQUARE_PX = 40;

const StyledPrimaryButton = styled(Button, {
	shouldForwardProp: (prop) => !["selected", "minWidth", "iconOnly"].includes(prop),
})(({ theme, selected, minWidth, iconOnly }) => ({
	boxSizing: "border-box",
	flex: "0 0 auto",
	minWidth: iconOnly ? SQUARE_PX : (minWidth ?? 0),
	...(iconOnly && { minHeight: SQUARE_PX, padding: 6 }),

	textTransform: "none",
	borderWidth: 1,
	borderStyle: "solid",
	borderColor: selected ? "transparent" : theme.palette.primary.main,
	backgroundColor: selected ? theme.palette.primary.main : "transparent",
	color: selected ? theme.palette.common.white : theme.palette.primary.main,
	borderRadius: theme.shape.borderRadius,
	overflow: "hidden",

	// unify startIcon spacing and lock its size
	"& .MuiButton-startIcon": {
		marginRight: iconOnly ? 0 : 8,
		flex: `0 0 ${ICON_PX}px`,
	},
	"& .MuiButton-startIcon > *": {
		width: ICON_PX,
		height: ICON_PX,
		objectFit: "contain",
		display: "block",
		flex: `0 0 ${ICON_PX}px`,
	},

	"&:hover": {
		backgroundColor: selected
			? darken(theme.palette.primary.main, 0.3) // darker primary if selected
			: darken(theme.palette.grey.soft, 0.3), // slightly darker hover otherwise
		borderColor: selected ? "transparent" : theme.palette.primary.main,
	},
	"&.Mui-disabled": {
		backgroundColor: theme.palette.grey[400],
		borderColor: theme.palette.grey[400],
		color: theme.palette.grey[300],
	},
}));

const Label = styled("span")({
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	minWidth: 0,
	display: "inline-block",
});

const PrimaryToggleButton = memo(({
	id,
	selected = false,
	disabled = false,
	size = "small",
	width,
	imageSources,
	onClick,
	title,
	className = "",
	titleClassName = "",
	titleColor,
	tooltipTitle,
	minWidth = 10,
	sx,
	...props
}) => {
	const [src, setSrc] = useState(imageSources?.normalSrc || null);
	useEffect(() => { if (imageSources?.normalSrc) setSrc(imageSources.normalSrc); }, [imageSources]);

	const handleMouseEnter = useCallback(() => { if (imageSources?.hoverSrc) setSrc(imageSources.hoverSrc); }, [imageSources]);
	const handleMouseLeave = useCallback(() => { setSrc(imageSources?.normalSrc || null); }, [imageSources]);
	const handleMouseDown = useCallback(() => { if (imageSources?.activeSrc) setSrc(imageSources.activeSrc); }, [imageSources]);
	const handleMouseUp = useCallback(() => { setSrc(imageSources?.hoverSrc ?? imageSources?.normalSrc ?? null); }, [imageSources]);

	const iconOnly = !title;

	return (
		<Tooltip title={tooltipTitle} disabled={tooltipTitle.length === 0}>
			<StyledPrimaryButton
				disableElevation
				disableRipple
				id={id}
				iconOnly={iconOnly}
				selected={selected}
				type="button"
				disabled={disabled}
				variant="outlined"
				color="primary"
				size={size}
				className={className}
				sx={{ width, color: selected ? "common.white" : titleColor, ...sx }}
				minWidth={minWidth}
				startIcon={
					src ? (
						<Box
							component="img"
							src={selected ? imageSources?.activeSrc || src : src}
							alt=""
						/>
					) : undefined
				}
				onClick={onClick}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				onMouseDown={handleMouseDown}
				onMouseUp={handleMouseUp}
				{...props}
			>
				{iconOnly ? null : <Label className={titleClassName}>{title}</Label>}
			</StyledPrimaryButton>
		</Tooltip>
	);
});

PrimaryToggleButton.propTypes = {
	id: PropTypes.string,
	selected: PropTypes.bool,
	disabled: PropTypes.bool,
	size: PropTypes.oneOf(["small", "medium", "large"]),
	width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	minWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	imageSources: PropTypes.shape({
		normalSrc: PropTypes.string.isRequired,
		hoverSrc: PropTypes.string,
		activeSrc: PropTypes.string,
	}),
	onClick: PropTypes.func,
	title: PropTypes.string,
	className: PropTypes.string,
	titleClassName: PropTypes.string,
	tooltipTitle: PropTypes.string,
	titleColor: PropTypes.string,
	sx: PropTypes.object,
};

PrimaryToggleButton.defaultProps = {
	id: undefined,
	selected: false,
	disabled: false,
	size: "small",
	title: "",
	width: undefined,
	minWidth: 10,
	imageSources: undefined,
	onClick: undefined,
	className: "",
	titleClassName: "",
	tooltipTitle: "",
	titleColor: undefined,
	sx: undefined,
};

export default PrimaryToggleButton;
