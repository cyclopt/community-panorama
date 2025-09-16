import { Box, Typography, styled, CircularProgress } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import Tooltip from "../../components/Tooltip.jsx";

const StatusContainer = styled(Box)(() => ({
	display: "flex",
	alignItems: "center",
}));

const statsData = {
	synced: {
		icon: <CheckCircleIcon color="success" sx={{ marginRight: 0.5 }} />,
		tooltip: "Data is up to date with recent commits",
		text: "Synced",
	},
	inprogress: {
		icon: <CircularProgress size={16} sx={{ marginRight: 0.5 }} />,
		tooltip: null,
		text: "In Progress",
	},
	noDeveloperStats: {
		icon: <WarningAmberIcon color="warning" sx={{ marginRight: 0.5 }} />,
		tooltip: "Configure repositories to generate stats",
		text: "No developer stats",
	},
	// Fallback if status isn’t in statsData
	default: {
		icon: <CancelIcon color="error" sx={{ marginRight: 0.5 }} />,
		tooltip: "Click to sync developer data",
		text: "Not Synced",
	},
};

const renderStatus = (status) => {
	// Choose the correct entry, or fallback to “default”
	const { icon, tooltip, text } = statsData[status] || statsData.default;

	// If there’s a tooltip, wrap in <Tooltip>
	return (
		<Tooltip title={tooltip}>
			<StatusContainer>
				{icon}
				<Typography variant="body2" color="textSecondary">
					{text}
				</Typography>
			</StatusContainer>
		</Tooltip>
	);
};

export default renderStatus;
