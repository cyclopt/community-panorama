import { memo, useMemo } from "react";
import PropTypes from "prop-types";
import { Typography } from "@mui/material";

import { convertQualityScoreToLetter, percentChange } from "../utils/index.js";

const QualityTile = (props) => {
	const {
		currentValue = 0,
		previousValue = null,
		severity = null } = props;
	const change = useMemo(() => (severity
		? currentValue - previousValue
		: percentChange(previousValue, currentValue)), [currentValue, severity, previousValue]);

	return (
		<>
			<Typography variant="h4" fontWeight="bold" color="primary">
				{severity ? currentValue : convertQualityScoreToLetter(currentValue)}
			</Typography>
			{previousValue != null && (
				<Typography
					fontWeight="bold"
					sx={{ color: severity
						? change < 0 ? "green.700" : change > 0 ? "red.700" : "grey.700"
						: change.startsWith("+") ? "green.700" : change.startsWith("-") ? "red.700" : "grey.700",
					}}
				>
					{severity ? null : change}
				</Typography>
			)}
		</>
	);
};

QualityTile.propTypes = {
	currentValue: PropTypes.number,
	previousValue: PropTypes.number,
	severity: PropTypes.string,
};

export default memo(QualityTile);
