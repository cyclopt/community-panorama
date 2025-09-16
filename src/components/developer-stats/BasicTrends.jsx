import { memo, useState } from "react";
import { Box, Typography, List, ListItem, ListItemText, ListItemIcon, styled } from "@mui/material";
import PropTypes from "prop-types";
import { QuestionMark } from "@mui/icons-material";

import Tooltip from "../Tooltip.jsx";
import { PrimaryBorderButton } from "../Buttons.jsx";
import SectionTitle from "../SectionTitle.jsx";

import { getTrendEventProps } from "#utils";

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────
const DateHeader = styled(Typography)(({ theme }) => ({
	marginBottom: theme.spacing(1),
}));

const EventContainer = styled(Box)(({ theme }) => ({
	marginLeft: theme.spacing(2),
	marginBottom: theme.spacing(1),
}));

const EventTitle = styled(Typography)(({ theme }) => ({
	marginBottom: theme.spacing(1),
}));

const EventList = styled(List)(({ theme }) => ({
	marginLeft: theme.spacing(2),
	marginBottom: theme.spacing(2),
}));

const IconWrapper = styled(ListItemIcon)(() => ({
	minWidth: 32,
}));

// ─── BASIC TRENDS COMPONENT ────────────────────────────────────────────────
const BasicTrends = ({ trends = [], isLoading }) => {
	// State to track whether we’re showing all blocks or just the first two
	const [showAll, setShowAll] = useState(false);

	// If showAll is false, only take the first two trend blocks; otherwise take the full array.
	const visibleTrends = showAll ? trends : trends.slice(0, 2);

	// Determine if there are more items than the two we’re showing
	const hasMore = trends.length > 2;

	return (
		<SectionTitle
			title="Trends"
			isLoading={isLoading}
			customToolbar={(
				<Tooltip
					placement="top"
					title={(
						<Box sx={{ textAlign: "left" }}>
							<Typography variant="body2" sx={{ mt: 0.5 }}>
								{"The most significant changes in the developer’s performance and contribution over time."}
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
			{visibleTrends.map((block, i) => (
				<Box key={i} mb={4}>
					<DateHeader gutterBottom variant="h6">
						{block.date}
					</DateHeader>
					{block.events.map((event, j) => (
						<EventContainer key={j}>
							<EventTitle gutterBottom variant="subtitle1">
								{event.title}
							</EventTitle>
							<EventList dense disablePadding>
								{event.details?.map((item, k) => {
									const { IconComponent, primaryText } = getTrendEventProps(event.type, item);
									return (
										<ListItem key={k} disableGutters>
											<IconWrapper>
												<IconComponent color="secondary" />
											</IconWrapper>
											<ListItemText primary={primaryText} />
										</ListItem>
									);
								})}
							</EventList>
						</EventContainer>
					))}
				</Box>
			))}

			{/* Only render the “Show more” button if there are more than 2 blocks */}
			{hasMore && (
				<Box textAlign="center" mt={2}>
					<PrimaryBorderButton
						title={showAll ? "Show less" : "Show more"}
						width="100%"
						onClick={() => setShowAll((p) => !p)}
					/>
				</Box>
			)}
		</SectionTitle>
	);
};

BasicTrends.propTypes = {
	isLoading: PropTypes.bool,

	trends: PropTypes.arrayOf(
		PropTypes.shape({
			date: PropTypes.string,
			events: PropTypes.arrayOf(
				PropTypes.shape({
					title: PropTypes.string,
					type: PropTypes.oneOf(["commits", "repo", "characteristics"]),
					details: PropTypes.array,
				}),
			),
		}),
	),
};

export default memo(BasicTrends);
