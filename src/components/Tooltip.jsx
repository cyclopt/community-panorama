import PropTypes from "prop-types";
import { Tooltip as MUITooltip, Zoom, Box, Typography } from "@mui/material";

const Tooltip = ({ children, title, titleVariant = "caption", placement = "top", sx = {}, disabled, ...rest }) => {
	const isDisabled = !!disabled;
	return (
		isDisabled ? (
			<Box>
				{children}
			</Box>
		) : (
			<MUITooltip
				arrow
				title={typeof title === "string" ? (<Typography variant={titleVariant} color="inherit">{title}</Typography>) : title || ""}
				placement={placement}
				TransitionComponent={Zoom}
				componentsProps={{
					tooltip: {
						style: {
							whiteSpace: "normal",
							wordWrap: "break-word",
							textAlign: "center",
							...sx,
						},
					},
				}}
				{...rest}
			>
				{children}
			</MUITooltip>
		)
	);
};

Tooltip.propTypes = {
	children: PropTypes.node,
	disabled: PropTypes.any,
	title: PropTypes.oneOfType([PropTypes.string, PropTypes.element, PropTypes.bool]).isRequired,
	titleVariant: PropTypes.string,
	placement: PropTypes.string,
	sx: PropTypes.object,
};

export default Tooltip;
