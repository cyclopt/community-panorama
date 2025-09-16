import PropTypes from "prop-types";
import clsx from "clsx";
import { Box, IconButton, Typography } from "@mui/material";
import { Info } from "@mui/icons-material";

import Tooltip from "./Tooltip.jsx";

const Card = ({ title, tooltip, className, sx, headerSx, children = null, contentClassName = "", contentStyle = {}, boldHeader = false, danger = false, ...props }) => (
	<Box
		className={clsx("card", className)}
		sx={{
			borderRadius: (t) => `${t.shape.borderRadius}px !important`,
			borderWidth: 0,
			borderStyle: "solid",
			borderColor: (t) => `${danger ? t.palette.error.main : t.palette.primary.main} !important`,
			height: "100% !important",
			display: "flex",
			flexDirection: "column",
			...sx,
		}}
		{...props}
	>
		<Box
			component="header"
			className="card-header"
			sx={{
				bgcolor: (t) => `${danger ? t.palette.error.main : t.palette.primary.main} !important`,
				borderTopLeftRadius: (t) => `${t.shape.borderRadius}px !important`,
				borderTopRightRadius: (t) => `${t.shape.borderRadius}px !important`,
				alignItems: "center !important",
				whiteSpace: "normal !important",
				wordBreak: "break-all",
				...headerSx,
			}}
		>
			{typeof title === "string"
				? (
					<Typography variant="h6" sx={{ m: 1, color: "common.white", ...(boldHeader && { fontWeight: "bolds" }) }}>
						{title}
					</Typography>
				)
				: title}
			{tooltip && (
				<>
					<div style={{ flexGrow: 1 }} />
					<Tooltip title={tooltip} titleVariant="body2" placement="left">
						<IconButton aria-label="tooltip" sx={{ bgcolor: "transparent", color: "common.white" }}><Info /></IconButton>
					</Tooltip>
				</>
			)}
		</Box>
		<div className={clsx("card-content", contentClassName)} style={contentStyle}>{children}</div>
	</Box>
);

Card.propTypes = {
	title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
	tooltip: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
	children: PropTypes.node,
	contentClassName: PropTypes.string,
	className: PropTypes.string,
	style: PropTypes.object,
	sx: PropTypes.object,
	headerSx: PropTypes.object,
	boldHeader: PropTypes.bool,
	danger: PropTypes.bool,
	contentStyle: PropTypes.object,
};

export default Card;
