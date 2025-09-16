import { Box, Typography, styled } from "@mui/material";
import PropTypes from "prop-types";

const NoDataTypography = styled(Typography)(({ theme }) => ({
	textAlign: "center",
	width: "100%",
	margin: theme.spacing(1, 0),
}));

// ─── NO DATA COMPONENT ────────────────────────────────────────────────────
const NoDataFound = ({ value }) => (
	<NoDataTypography gutterBottom>
		{"No "}
		<Box component="span" sx={{ color: "primary.main" }}>{value}</Box>
		{" "}
		{"found"}
	</NoDataTypography>
);

NoDataFound.propTypes = {
	value: PropTypes.string,
};

export default NoDataFound;
