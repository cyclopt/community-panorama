import PropTypes from "prop-types";
import { memo } from "react";
import { Avatar, Typography } from "@mui/material";
import { Remove } from "@mui/icons-material";

import { convertQualityScoreToAvatar, getColorForQualityScore } from "#utils";

const ScoreTypographyAvatar = ({ score }) => (
	<Typography
		variant="h4"
		align="center"
		display="flex"
		alignItems="center"
		justifyContent="center"
		sx={{ gap: 2 }}
	>
		<Avatar
			sx={{
				width: (t) => t.spacing(6),
				height: (t) => t.spacing(6),
				bgcolor: getColorForQualityScore(score),
				display: "inline-flex",
				fontSize: "inherit",
			}}
		>
			{(() => {
				const quality = convertQualityScoreToAvatar(score);
				return quality || <Remove style={{ fontSize: "inherit" }} />;
			})()}
		</Avatar>
	</Typography>
);

ScoreTypographyAvatar.propTypes = {
	score: PropTypes.number,
};

export default memo(ScoreTypographyAvatar);

