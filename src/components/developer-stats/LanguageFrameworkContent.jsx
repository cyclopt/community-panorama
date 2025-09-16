import { memo } from "react";
import { Box, Avatar, Typography, Switch, Grid, Rating, styled, Stack } from "@mui/material";
import PropTypes from "prop-types";

import { convertQualityScoreToAvatar, getColorForQualityScore, formatLocalNumber } from "#utils";

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────
const ItemGrid = styled(Grid)(({ theme }) => ({
	padding: theme.spacing(1),
}));

const ItemWrapper = styled(Box)(({ theme, editmode }) => ({
	...(editmode
		? {
			padding: theme.spacing(1),
			boxShadow: 1,
			borderRadius: theme.shape.borderRadius,
			border: "1px solid #ccc",
		}
		: {}),
}));

const StatsBox = styled(Box)(({ theme }) => ({
	margin: theme.spacing(1),
}));

// ─── LANGUAGE/FRAMEWORK CARD COMPONENT ────────────────────────────────────
const LanguageFrameworkCard = ({
	languageOrFrameWork,
	score,
	linesOfCode,
	averageQuality,
	numOfRepositories,
	isInEditMode,
	checked,
	onChange,
}) => (
	<ItemGrid item xs={12} sm={6}>
		{isInEditMode && (
			<Stack direction="row-reverse">
				<Typography variant="caption">{"Public"}</Typography>
				<Switch
					size="small"
					checked={checked}
					color="primary"
					onChange={onChange}
				/>
			</Stack>
		)}

		<ItemWrapper editmode={isInEditMode ? 1 : 0}>
			<Stack direction="row" gap={1} alignItems="center">
				<Typography fontWeight="bold">{languageOrFrameWork}</Typography>
				<Rating
					readOnly
					name={`${languageOrFrameWork}-rating`}
					sx={{ color: "secondary.main" }}
					value={score}
				/>
			</Stack>

			<StatsBox>
				<Typography variant="body2">
					{"• Lines of code: "}
					<b>{formatLocalNumber(linesOfCode)}</b>
				</Typography>
				<Typography variant="body2" justifyContent="center">
					{"• Average Code Quality:"}
					{" "}
					<Avatar
						sx={{
							width: (t) => t.spacing(2.5),
							height: (t) => t.spacing(2.5),
							bgcolor: getColorForQualityScore(averageQuality),
							display: "inline-flex",
							fontSize: "inherit",
						}}
					>
						{convertQualityScoreToAvatar(averageQuality)}
					</Avatar>
				</Typography>
				<Typography variant="body2">
					{"• Repositories: "}
					<b>{formatLocalNumber(numOfRepositories)}</b>
				</Typography>
			</StatsBox>
		</ItemWrapper>
	</ItemGrid>
);

LanguageFrameworkCard.propTypes = {
	languageOrFrameWork: PropTypes.string.isRequired,
	score: PropTypes.number.isRequired,
	linesOfCode: PropTypes.number.isRequired,
	averageQuality: PropTypes.number.isRequired,
	numOfRepositories: PropTypes.number.isRequired,
	isInEditMode: PropTypes.bool,
	checked: PropTypes.bool,
	onChange: PropTypes.func,
};

LanguageFrameworkCard.defaultProps = {
	isInEditMode: false,
	checked: false,
	onChange: () => {},
};

export default memo(LanguageFrameworkCard);
