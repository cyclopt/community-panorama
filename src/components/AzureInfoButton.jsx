import PropTypes from "prop-types";
import { memo } from "react";
import { Button, Box, Typography } from "@mui/material";

import Tooltip from "./Tooltip.jsx";

const AzureInfoButton = ({ onClick, tooltip = "See details" }) => (
	<Box>
		<Tooltip title={tooltip} placement="top">
			<Button
				target="_blank"
				variant="contained"
				size="small"
				sx={{
					borderRadius: "100%",
					padding: (t) => t.spacing(1),
					height: (t) => t.spacing(2.2),
					marginRight: (t) => t.spacing(1),
					aspectRatio: "1/1",
					minWidth: "0",
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					"&:hover": {
						color: "white",
					},
				}}
				onClick={onClick}
			>
				<Typography style={{ color: "white", fontSize: "0.8rem", textTransform: "lowercase", fontFamily: "Monospace" }}>
					{"i"}
				</Typography>
			</Button>
		</Tooltip>
	</Box>
);

AzureInfoButton.propTypes = {
	onClick: PropTypes.func,
	tooltip: PropTypes.string,
};

export default memo(AzureInfoButton);
