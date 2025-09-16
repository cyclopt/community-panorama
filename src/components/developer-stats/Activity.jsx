/* eslint-disable no-unused-vars */
import { memo, useMemo } from "react";
import { Box, Typography, Switch, Stack, styled } from "@mui/material";
import { QuestionMark } from "@mui/icons-material";
import PropTypes from "prop-types";

import SectionTitle from "../SectionTitle.jsx";
import Tooltip from "../Tooltip.jsx";

import TimeLine from "./TimeLine.jsx";

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────
const CenteredBox = styled(Box)(({ theme }) => ({
	marginTop: theme.spacing(2),
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	flexDirection: "column",
}));

const CommitsContainer = styled(Box)(({ theme, isedit }) => ({
	display: "flex",
	width: "80%",
	flexDirection: "column",
	marginTop: theme.spacing(1),
	...(isedit
		? { padding: theme.spacing(1), boxShadow: 1, borderRadius: theme.shape.borderRadius, border: "1px solid #ccc" }
		: {}),
}));

const TimelineWrapper = styled(Box)(() => ({
	width: "100%",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
}));

// ─── ACTIVITY COMPONENT ───────────────────────────────────────────────────
const Activity = ({ contributionsPerDay = [], isLoading, isInEditMode, updateKeys, keysToExclude }) => {
	const values = useMemo(() => {
		const contributions = contributionsPerDay.map(([, count]) => count);
		const max = Math.max(...contributions, 0);
		return {
			values: Object.fromEntries(contributionsPerDay.map(
				([date, count]) => [date, 1 + 6 * (count / max)],
			)),
			scale: max / 6,
		};
	}, [contributionsPerDay]);

	const hasData = contributionsPerDay.some(([_, c]) => c !== 0)
		&& !(!isInEditMode && keysToExclude?.activity.includes("commitsPerDay"));

	return (
		<SectionTitle
			title="Activity"
			isLoading={isLoading}
			noDataMessage={hasData ? null : "commits"}
			customToolbar={(
				<Tooltip
					placement="top"
					title={(
						<Box sx={{ textAlign: "left" }}>
							<Typography variant="body2" sx={{ mt: 0.5 }}>
								{"The developer's activity and contributions over time."}
							</Typography>
						</Box>
					)}
				>
					<QuestionMark
						position="end"
						sx={{
							borderRadius: "100%",
							backgroundColor: "primary.main",
							p: (t) => t.spacing(0.5),
							height: (t) => t.spacing(3),
							aspectRatio: "1 / 1",
							minWidth: 0,
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							color: "white",
							"&:hover": { cursor: "pointer", color: "white" },
						}}
					/>
				</Tooltip>
			)}
		>
			<CenteredBox>
				{(isInEditMode || !keysToExclude?.activity?.includes("commitsPerDay")) && (
					<CommitsContainer isedit={isInEditMode ? 1 : 0}>
						{isInEditMode && (
							<Stack direction="row-reverse">
								<Typography variant="caption">{"Public"}</Typography>
								<Switch
									size="small"
									checked={!keysToExclude?.activity?.includes("commitsPerDay")}
									name="commitsPerDay"
									color="primary"
									onChange={(e) => updateKeys(e, "activity", "commitsPerDay")}
								/>
							</Stack>
						)}

						<TimelineWrapper>
							<TimeLine {...values} />
						</TimelineWrapper>
					</CommitsContainer>
				)}
			</CenteredBox>
		</SectionTitle>
	);
};

Activity.propTypes = {
	contributionsPerDay: PropTypes.array,
	keysToExclude: PropTypes.shape({
		activity: PropTypes.array,
	}),
	isInEditMode: PropTypes.bool,
	isLoading: PropTypes.bool,
	updateKeys: PropTypes.func,
};

export default memo(Activity);
