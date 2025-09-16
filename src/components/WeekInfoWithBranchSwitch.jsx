import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import ToggleSwitch from "./ToggleSwitch.jsx";

// the outer header box with top & bottom borders
const Header = styled(Box)(({ theme }) => ({
	borderTop: `1px solid ${theme.palette.divider}`,
	borderBottom: `1px solid ${theme.palette.divider}`,
	marginBottom: theme.spacing(2),
}));

// the inner flex container that switches from column → row
const Content = styled(Stack)(({ theme }) => ({
	padding: theme.spacing(1, 2),
	gap: theme.spacing(1),
	[theme.breakpoints.up("sm")]: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 0,
	},
	[theme.breakpoints.down("sm")]: {
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "space-between",
	},
}));

// the week label with responsive text alignment
const WeekLabel = styled(Typography)(({ theme }) => ({
	fontWeight: 700,
	[theme.breakpoints.down("sm")]: {
		textAlign: "center",
	},
	[theme.breakpoints.up("sm")]: {
		textAlign: "left",
	},
}));

// the span inside the label for “normal” weight dates
const DateSpan = styled("span")({
	fontWeight: 400,
});

const WeekInfoWithBranchSwitch = ({
	currentWeek,
	showStagingBranch,
	setShowStagingBranch,
	...props // everything else (sx, className, id, event handlers…) flows to <Header>
}) => (
	<Header component="header" {...props}>
		<Content>
			<WeekLabel variant="subtitle1" component="div">
				<Box component="span">
					{"Week"}
					{currentWeek.numOfWeek}
					{":"}
				</Box>
				{" "}
				<DateSpan>
					{currentWeek.startDay}
					{" "}
					{"–"}
					{currentWeek.endDay}
				</DateSpan>
			</WeekLabel>

			<ToggleSwitch
				isSwitchEnabled={!showStagingBranch}
				isSwitchDisabled={false}
				enableText="Production Branch"
				disableText="Staging Branch"
				handleToggle={(e) => setShowStagingBranch(!e.target.checked)}
			/>
		</Content>
	</Header>
);

WeekInfoWithBranchSwitch.propTypes = {
	currentWeek: PropTypes.shape({
		numOfWeek: PropTypes.number.isRequired,
		startDay: PropTypes.string.isRequired,
		endDay: PropTypes.string.isRequired,
	}).isRequired,
	showStagingBranch: PropTypes.bool.isRequired,
	setShowStagingBranch: PropTypes.func.isRequired,
};

export default WeekInfoWithBranchSwitch;
