import { memo } from "react";
import { Box, Typography, Divider, styled, CircularProgress } from "@mui/material";
import PropTypes from "prop-types";

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────
const StatsWrapper = styled(Box)(({ theme }) => ({
	width: "100%",
	marginTop: theme.spacing(4),
	marginBottom: theme.spacing(2),
}));

const TitleComponent = styled(Typography)(() => ({
	textTransform: "capitalize",
}));

const ToolbarComponent = styled(Box)(({ theme }) => ({
	fontWeight: 500,
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	width: "100%",
	paddingBottom: theme.spacing(1),
	[theme.breakpoints.down("sm")]: {
		flexDirection: "column",
	},
	[theme.breakpoints.up("sm")]: {
		flexDirection: "row",
	},
}));
const ContentBox = styled(Box)(({ theme }) => ({
	marginTop: theme.spacing(2),
}));

const CustomDivider = styled(Divider)(({ theme }) => ({
	backgroundColor: theme.palette.grey,
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	justifyContent: "center",
	alignItems: "center",
	padding: theme.spacing(2),
}));

const NoDataTypography = styled(Typography)(({ theme }) => ({
	textAlign: "center",
	width: "100%",
	margin: theme.spacing(1, 0),
}));

// ─── STATS SECTION COMPONENT ───────────────────────────────────────────────
const SectionTitle = ({ title, children, noDataMessage, customToolbar, isLoading = false }) => (
	<StatsWrapper>
		<ToolbarComponent>
			<TitleComponent variant="h5">
				{title}
			</TitleComponent>
			{customToolbar}
		</ToolbarComponent>
		<CustomDivider />
		<ContentBox>
			{isLoading ? (
				<LoadingContainer>
					<CircularProgress color="secondary" />
				</LoadingContainer>
			) : noDataMessage ? (
				<NoDataTypography gutterBottom>
					{"No "}
					<Box component="span" sx={{ color: "primary.main" }}>{noDataMessage}</Box>
					{" "}
					{"found yet"}
				</NoDataTypography>
			) : (
				children
			)}
		</ContentBox>
	</StatsWrapper>
);

SectionTitle.propTypes = {
	title: PropTypes.string.isRequired,
	children: PropTypes.node,
	customToolbar: PropTypes.node,
	noDataMessage: PropTypes.string,
	isLoading: PropTypes.bool,
};

export default memo(SectionTitle);
