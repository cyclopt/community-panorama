import { Tooltip } from "@mui/material";
import PropTypes from "prop-types";

const ConditionalTooltip = ({ condition, title, children }) => (condition ? (
	<Tooltip
		disableFocusListener
		disableTouchListener
		title={title}
	>
		<span>{children}</span>
	</Tooltip>
) : (
	<span>{children}</span>
));

ConditionalTooltip.propTypes = {
	condition: PropTypes.bool,
	title: PropTypes.string,
	children: PropTypes.element,
};

export default ConditionalTooltip;
