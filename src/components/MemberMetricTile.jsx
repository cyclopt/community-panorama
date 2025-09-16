import { memo } from "react";
import PropTypes from "prop-types";
import { Typography, Grid } from "@mui/material";

const MemberMetricTile = (props) => {
	const { title = "", current, currentText = "in total", average, averageText = "weekly average" } = props;

	return (
		<Grid
			container
			sx={{
				p: 1.5,
				height: "100%",
				bgcolor: "grey.300",
				borderRadius: (t) => `${t.shape.borderRadius}px`,
				alignItems: "center",
				textAlign: "center",
				color: "primary.main",
			}}
		>
			<Grid item xs={12}>
				<Typography variant="h6" fontWeight="bold">{title.toUpperCase()}</Typography>
			</Grid>
			<Grid item xs={7}>
				<Typography>{`${currentText.toUpperCase()}:`}</Typography>
			</Grid>
			<Grid item xs={5}>
				<Typography variant="h4">
					{Number.isFinite(current) ? Number(current.toFixed(1)) : "-"}
				</Typography>
			</Grid>
			<Grid item xs={7}>
				<Typography>{`${averageText.toUpperCase()}:`}</Typography>
			</Grid>
			<Grid item xs={5}>
				<Typography variant="h4">
					{Number.isFinite(average) ? Number(average.toFixed(2)) : "-"}
				</Typography>
			</Grid>
		</Grid>
	);
};

MemberMetricTile.propTypes = {
	title: PropTypes.string,
	current: PropTypes.number,
	currentText: PropTypes.string,
	average: PropTypes.number,
	averageText: PropTypes.string,
};

export default memo(MemberMetricTile);
