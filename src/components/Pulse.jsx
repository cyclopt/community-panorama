import { Box, Tooltip } from "@mui/material";
import { keyframes } from "@emotion/react";
import PropTypes from "prop-types";

const Pulse = ({ isRunning = false }) => (
	<Tooltip title={isRunning ? "Quality Gate currenlty running!" : "Ready to overview!"}>
		<Box
			sx={{
				position: "relative",
				display: "inline-block",
				width: "15px",
				height: "15px",
				borderRadius: "50%",
				margin: "0 10px",
				bgcolor: isRunning ? "yellow.800" : "green.500",
				"::before": {
					content: "\"\"",
					display: "block",
					position: "absolute",
					left: "-5px",
					top: "-5px",
					width: "25px",
					height: "25px",
					bgcolor: isRunning ? "yellow.800" : "green.500",
					borderRadius: "50%",
					animation: (t) => `${keyframes({
						from: {
							transform: "scale(0.5)",
							opacity: 1,
						},
						to: {
							transform: "scale(1.5)",
							opacity: 0,
						},
					})} 1.5s infinite ${t.transitions.easing.easeIn}`,
				},
			}}
		/>
	</Tooltip>

);

Pulse.propTypes = {
	isRunning: PropTypes.bool,
};

export default Pulse;
