import PropTypes from "prop-types";
import { Box, Typography, Grid, styled } from "@mui/material";
import { ThumbUp, Remove } from "@mui/icons-material";

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────
const CenteredGrid = styled(Grid)(() => ({
	width: "100%",
	justifyContent: "center",
	alignItems: "center",
}));

const MessageBox = styled(Box)(({ theme, isRow, top }) => ({
	marginTop: theme.spacing(top),
	display: "flex",
	flexDirection: isRow ? "row" : "column",
	alignItems: "center",
	justifyContent: "center",
	textAlign: "center",
}));

// ─── NO FINDINGS COMPONENT ─────────────────────────────────────────────────
const NoFindings = ({
	text = "No data available!",
	congratsVariant = "h4",
	logoVariant = "h3",
	boxTopMargin = 4,
	isCongrats = true,
	isRow = false,
}) => {
	const logo = isCongrats
		? <ThumbUp color="secondary" fontSize="inherit" />
		: <Remove color="secondary" fontSize="inherit" />;

	return (
		<CenteredGrid
			item
			container
			xs={12}
		>
			<MessageBox isRow={isRow ? 1 : 0} top={isRow ? 0 : boxTopMargin} gap={isRow ? 1 : 0}>
				<Typography variant={logoVariant}>
					{logo}
				</Typography>
				<Typography variant={congratsVariant}>
					{isCongrats && (
						<Typography
							component="span"
							fontSize="inherit"
							color="secondary"
							sx={{ mr: 1 }}
						>
							{"Congrats!"}
						</Typography>
					)}
					{text}
				</Typography>
			</MessageBox>
		</CenteredGrid>
	);
};

NoFindings.propTypes = {
	text: PropTypes.string,
	congratsVariant: PropTypes.string,
	logoVariant: PropTypes.string,
	boxTopMargin: PropTypes.number,
	isCongrats: PropTypes.bool,
	isRow: PropTypes.bool,
};

export default NoFindings;
