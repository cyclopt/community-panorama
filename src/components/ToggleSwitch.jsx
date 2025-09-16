import PropTypes from "prop-types";
import { Stack, Switch, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

// Styled container
const ToggleSwitchContainer = styled(Stack)(({ theme }) => ({
	flexDirection: "row",
	alignItems: "center",
	gap: theme.spacing(1),
	justifyContent: "flex-start",
	[theme.breakpoints.up("sm")]: {
		justifyContent: "flex-end",
	},
	pointerEvents: "auto",
}));

// Styled toggle
const InnerSwitch = styled(
	({ isSwitchEnabled, ...switchProps }) => <Switch {...switchProps} />,
	{ shouldForwardProp: (prop) => prop !== "isSwitchEnabled" },
)(({ theme }) => {
	const selectedColor = theme.palette.primary.main;

	return {
		"& .MuiSwitch-thumb": {
			backgroundColor: selectedColor,
		},
		"& .MuiSwitch-track": {
			backgroundColor: selectedColor,
		},
	};
});

const ToggleSwitch = ({
	isSwitchEnabled,
	isSwitchDisabled,
	enableText = "On",
	disableText = "Off",
	handleToggle,
}) => (
	<ToggleSwitchContainer>
		<Typography
			variant="body2"
			color={isSwitchEnabled ? "text.disabled" : "text.primary"}
		>
			{disableText}
		</Typography>
		<InnerSwitch
			id="checkbox_switch"
			size="small"
			isSwitchEnabled={isSwitchEnabled}
			checked={isSwitchEnabled}
			disabled={isSwitchDisabled}
			onChange={handleToggle}
		/>
		<Typography
			variant="body2"
			color={isSwitchEnabled ? "text.primary" : "text.disabled"}
		>
			{enableText}
		</Typography>
	</ToggleSwitchContainer>
);

ToggleSwitch.propTypes = {
	isSwitchEnabled: PropTypes.bool,
	isSwitchDisabled: PropTypes.bool,
	enableText: PropTypes.string,
	disableText: PropTypes.string,
	handleToggle: PropTypes.func,
};

export default ToggleSwitch;
