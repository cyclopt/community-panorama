import { memo, useState } from "react";
import {
	Accordion as MuiAccordion,
	AccordionSummary as MuiAccordionSummary,
	AccordionDetails as MuiAccordionDetails,
	Typography,
	Box,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import { ExpandMore } from "@mui/icons-material";
import { Icon } from "@iconify/react";

import ToggleSwitch from "./ToggleSwitch.jsx";

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────
const AccordionRoot = styled(MuiAccordion)(({ theme }) => ({
	"&::before": { opacity: 0 },
	paddingBottom: theme.spacing(2),
	disableGutters: true,
}));

const AccordionSummaryRoot = styled(MuiAccordionSummary)(({ theme, disabled }) => ({
	pointerEvents: "none",
	borderRadius: theme.shape.borderRadius,
	border: `${theme.spacing(0.25)} solid ${theme.palette.primary.main}`,
	flexDirection: "row-reverse",
	padding: theme.spacing(1, 2),
	opacity: disabled ? 0.5 : 1,
	"& .MuiAccordionSummary-content": {
		marginLeft: theme.spacing(1),
	},
	"&.Mui-expanded": {
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
	},
}));

const AccordionExpandIcon = styled(Box, {
	shouldForwardProp: (prop) => prop !== "expanded",
})(({ theme, expanded, disabled }) => ({
	transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
	transition: theme.transitions.create("transform", {
		duration: theme.transitions.duration.shortest,
	}),
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	pointerEvents: disabled ? "none" : "auto",
}));

const AccordionDetailsRoot = styled(MuiAccordionDetails)(({ theme, disabled }) => ({
	borderBottomLeftRadius: theme.shape.borderRadius,
	borderBottomRightRadius: theme.shape.borderRadius,
	border: `${theme.spacing(0.25)} solid ${theme.palette.primary.main}`,
	padding: theme.spacing(2),
	opacity: disabled ? 0.5 : 1,
}));

const HeaderContainer = styled(Box)(() => ({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	width: "100%",
	flexWrap: "wrap", // allow wrapping
	minWidth: 0, // important for wrapping
}));

const TitleText = styled(Typography)(({ theme }) => ({
	fontWeight: theme.typography.fontWeightBold,
}));

const Language = ({ language }) => {
	const basePath = `logos:${language.toLowerCase()}`;
	let iconName = "";
	switch (language.toLowerCase()) {
		case "kotlin":
		case "typescript": {
			iconName = `${basePath}-icon`;
			break;
		}

		case "c#": {
			iconName = "logos:c-sharp";
			break;
		}

		default: {
			iconName = basePath;
		}
	}

	return <Icon icon={iconName} width="24" />;
};

Language.propTypes = {
	language: PropTypes.string.isRequired,
};

// ─── ACCORDION COMPONENT ─────────────────────────────────────────────────
const RepositoryAccordion = ({
	isPreviewMode,
	isRepositoryEnabled,
	setIsRepositoryEnabled,
	language,
	title,
	numberOfBranches,
	children,
}) => {
	const [expanded, setExpanded] = useState(false);
	return (
		<AccordionRoot disableGutters expanded={expanded}>
			<AccordionSummaryRoot disabled={!isRepositoryEnabled}>
				<HeaderContainer>
					<Box display="flex" justifyContent="center" alignItems="center" gap="1rem">
						<AccordionExpandIcon
							disabled={!isRepositoryEnabled}
							expanded={expanded}
							onClick={(e) => {
								e.stopPropagation();
								setExpanded((prev) => !prev);
							}}
						>
							<ExpandMore />
						</AccordionExpandIcon>
						<Language language={language} />
						<TitleText>{title}</TitleText>
						<Box display="flex" justifyContent="center" alignItems="center" gap="0.5rem">
							<Typography>{numberOfBranches}</Typography>
							<Icon icon="eos-icons:branch" width="24" />
						</Box>
					</Box>
					<ToggleSwitch
						isSwitchEnabled={isRepositoryEnabled}
						isSwitchDisabled={isPreviewMode}
						handleToggle={(e) => {
							const isOn = e.target.checked;
							setIsRepositoryEnabled(isOn);
							if (!isOn) {
								setExpanded(false);
							}
						}}
					/>
				</HeaderContainer>
			</AccordionSummaryRoot>

			<AccordionDetailsRoot disabled={!isRepositoryEnabled}>
				{children}
			</AccordionDetailsRoot>
		</AccordionRoot>
	);
};

RepositoryAccordion.propTypes = {
	title: PropTypes.string.isRequired,
	language: PropTypes.string.isRequired,
	numberOfBranches: PropTypes.number,
	isPreviewMode: PropTypes.bool,
	isRepositoryEnabled: PropTypes.bool,
	setIsRepositoryEnabled: PropTypes.func,
	children: PropTypes.node.isRequired,
};

export default memo(RepositoryAccordion);
