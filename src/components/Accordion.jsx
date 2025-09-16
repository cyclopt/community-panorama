import { Accordion as MuiAccordion, AccordionSummary as MuiAccordionSummary, AccordionDetails as MuiAccordionDetails, Typography, Grid } from "@mui/material";
import PropTypes from "prop-types";
import { ArrowForwardIosSharp, ExpandMore, Error } from "@mui/icons-material";
import { styled } from "@mui/material/styles";

import Tooltip from "./Tooltip.jsx";

const AccordionRoot = styled((props) => (
	<MuiAccordion {...props} />
))(() => ({
	"&::before": {
		opacity: 0,
	},
	marginBottom: "2rem",
}));

const AccordionSummary = styled((props) => (
	<MuiAccordionSummary expandIcon={<ArrowForwardIosSharp sx={{ fontSize: "0.9rem" }} />} {...props} />
))(({ theme }) => ({
	flexDirection: "row-reverse",
	paddingLeft: 0,
	paddingRight: 0,
	"& .MuiAccordionSummary-expandIconWrapper": {
		transform: "rotate(-90deg)",
		transition: theme.transitions.create("transform", {
			duration: theme.transitions.duration.standard,
		}),
	},
	"& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
		transform: "rotate(0deg)",
	},
	"& .MuiAccordionSummary-content": {
		marginLeft: theme.spacing(1),
	},
	"&.Mui-expanded": {
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
	},

}));

const AccordionDetails = styled((props) => (
	<MuiAccordionDetails {...props} />
))(() => ({
	padding: 0,
	marginTop: "1rem",
}));

const Accordion = ({ defaultExpanded, title, tooltip, dividerComponent, component }) => (
	<AccordionRoot disableGutters defaultExpanded={defaultExpanded}>
		<AccordionSummary
			expandIcon={<ExpandMore />}
		>

			<Grid container justifyContent="start" alignItems="center">
				<Tooltip title={tooltip}>
					<Error color="primary" sx={{ mr: 0.5 }} />
				</Tooltip>
				<Typography variant="h5">{title}</Typography>
			</Grid>
			{
				dividerComponent && (
					<Grid sx={{
						position: "absolute",
						bottom: "-0.5rem",
						left: 0,
						right: 0,
					}}
					>
						{dividerComponent}
					</Grid>
				)
			}
		</AccordionSummary>
		<AccordionDetails>
			{component}
		</AccordionDetails>
	</AccordionRoot>
);

Accordion.propTypes = {
	defaultExpanded: PropTypes.bool,
	tooltip: PropTypes.string,
	title: PropTypes.string,
	dividerComponent: PropTypes.element,
	component: PropTypes.element,
};

export default Accordion;
