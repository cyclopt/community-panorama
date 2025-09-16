import { memo } from "react";
import PropTypes from "prop-types";
import { Paper, Typography, IconButton, Box } from "@mui/material";
import { Info } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import Tooltip from "./Tooltip.jsx";

import { formatTileNumber } from "#utils";

const Tile = (props) => {
	const navigate = useNavigate();
	const { number, title, tooltip, adornment, redirectTo, content = "default content", row = 1, percent = false, isTime = false } = props;

	if (row === 1) {
		return (
			<Paper
				elevation={0}
				sx={{ p: 2, color: "primary.light", bgcolor: "cardBackgroundLight.main", borderRadius: 1, height: "100%", ":hover": (redirectTo) && { boxShadow: 5, cursor: "pointer" } }}
				onClick={() => (redirectTo) && navigate(redirectTo)}
			>
				<Box sx={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
					<Typography variant="h3" align="center" fontWeight="bold" sx={{ m: 1 }}>
						{title || formatTileNumber(number, { percent, isTime })}
					</Typography>
					<Typography align="center">
						{content.toUpperCase()}
					</Typography>
				</Box>
			</Paper>
		);
	}

	return (
		<Paper
			square
			elevation={0}
			sx={{ p: 1.5, color: "primary.light", bgcolor: "cardBackgroundLight.main", borderRadius: 1, height: "100%", position: "relative", ":hover": (redirectTo) && { boxShadow: 5, cursor: "pointer" } }}
			onClick={() => (redirectTo) && navigate(redirectTo)}
		>
			<Box sx={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
				{(tooltip) && (
					<Tooltip title={tooltip} titleVariant="body2" placement="top">
						<Box sx={{ position: "absolute", top: "5%", right: "5%" }}>
							<IconButton aria-label="tooltip" sx={{ p: 0, bgcolor: "transparent", color: "primary.light" }}><Info sx={{ width: "20px" }} /></IconButton>
						</Box>
					</Tooltip>
				)}
				<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
					{adornment}
					<Typography variant="h4" align="center" fontWeight="bold" sx={{ m: 1 }}>
						{title || formatTileNumber(number, { percent, isTime })}
					</Typography>
				</Box>
				<Typography variant="body2" align="center" fontWeight="bold">
					{content.toUpperCase()}
				</Typography>
			</Box>
		</Paper>
	);
};

Tile.propTypes = {
	number: PropTypes.number,
	title: PropTypes.string,
	content: PropTypes.string,
	row: PropTypes.number,
	percent: PropTypes.bool,
	isTime: PropTypes.bool,
	tooltip: PropTypes.string,
	adornment: PropTypes.element,
	redirectTo: PropTypes.string,
};

export default memo(Tile);
