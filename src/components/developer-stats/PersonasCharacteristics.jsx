import { memo, useMemo } from "react";
import { Box, Typography, Switch, Grid, Stack, styled, useTheme } from "@mui/material";
import { Image } from "mui-image";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";
import { QuestionMark } from "@mui/icons-material";

import Tooltip from "../Tooltip.jsx";
import SectionTitle from "../SectionTitle.jsx";

import NoDataFound from "./NoDataFound.jsx";

import { useDeveloperThresholds, useDevCharacteristics } from "#api";
import { getCharacteristicsProps, formatLocalNumber, softSkills } from "#utils";

// ─── UTILS ─────────────────────────────────────────────────────────────────
const ItemBox = styled(Box)(({ theme, editMode }) => ({
	display: "flex",
	flexDirection: "column",
	justifyContent: "space-between",
	...(editMode
		? {
			padding: theme.spacing(1),
			boxShadow: 1,
			borderRadius: theme.shape.borderRadius,
			border: "1px solid #ccc",
		}
		: {}),
}));

const LabelTypography = styled(Typography)(({ theme }) => ({
	fontWeight: theme.typography.fontWeightBold,
}));

const BarContainer = styled(Box)(({ width }) => ({
	width,
	minWidth: "0.7rem",
	height: "0.7rem",
	position: "relative",
	margin: "2.5px 0",
}));

const BarBackground = styled(Box)(() => ({
	width: "100%",
	height: "100%",
	borderRadius: "1rem",
	backgroundColor: "#f5f5f5",
}));

const BarForeground = styled(Box)(({ color, value }) => ({
	width: `${value * 100}%`,
	height: "100%",
	borderRadius: "1rem",
	background: color,
	position: "absolute",
	top: 0,
	left: 0,
}));

// ─── PERSONAS CHARACTERISTICS COMPONENT ─────────────────────────────────────
const PersonasCharacteristics = ({ isInEditMode, keysToExclude, updateKeys }) => {
	const { thresholds = [] } = useDeveloperThresholds();
	const { developerId, organizationid } = useParams();
	const { characteristics = {}, isLoading } = useDevCharacteristics(organizationid, developerId);
	const theme = useTheme();

	const entries = useMemo(
		() => Object.entries(characteristics).filter(
			([label]) => (isInEditMode || !keysToExclude?.characteristics?.includes(label))
					&& !softSkills.has(label),
		),
		[characteristics, keysToExclude?.characteristics, isInEditMode],
	);

	const allZero = entries.every(([, total]) => total === 0);

	return (
		<SectionTitle
			title="Characteristics"
			isLoading={isLoading}
			customToolbar={(
				<Tooltip
					placement="top"
					title={(
						<Box sx={{ textAlign: "left" }}>
							<Typography variant="subtitle2" fontWeight={600}>
								{"Characteristics"}
							</Typography>

							<Typography variant="body2" sx={{ mt: 0.5 }}>
								{"The developer’s strengths and areas for improvement"}
							</Typography>

							<Box component="ul" sx={{ my: 0.5, m: 0 }}>
								<li style={{ marginTop: 4 }}>
									<i style={{ color: theme.palette.secondary.main }}>{"Code"}</i>
									{" - A points-based system for the amount of code written, with bonus for optimal commit sizes (the number of lines of modified code in a commit)."}
								</li>
								<li style={{ marginTop: 4 }}>
									<i style={{ color: theme.palette.secondary.main }}>{"Security"}</i>
									{" - A points-based system for the number of security vulnerabilities fixed in the code, including both dependencies and security application issues."}
								</li>
								<li style={{ marginTop: 4 }}>
									<i style={{ color: theme.palette.secondary.main }}>{"Debugging"}</i>
									{" - A points-based system for the number of code violations fixed, depending on their severity."}
								</li>
								<li style={{ marginTop: 4 }}>
									<i style={{ color: theme.palette.secondary.main }}>{"Refactoring"}</i>
									{" - A points-based system for duplicate/legacy cleanup and better structure."}
								</li>
							</Box>
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
			<Grid container>

				{allZero ? (
					<NoDataFound value="characteristics" />
				) : (
					entries.map(([label, points], idx) => {
						const {
							png,
							levelPct,
							pointsForNextLevel,
							startingColor,
							endColor,
						} = getCharacteristicsProps(points, thresholds);

						return (
							<Grid key={idx} item xs={12} sm={6}>
								<Box padding={1}>
									<ItemBox editMode={isInEditMode ? 1 : 0}>
										{isInEditMode && (
											<Stack direction="row-reverse">
												<Typography variant="caption">{"Public"}</Typography>
												<Switch
													size="small"
													checked={!keysToExclude.characteristics?.includes(label)}
													color="primary"
													onChange={(e) => updateKeys(e, "characteristics", label)}
												/>
											</Stack>
										)}

										<Grid container alignItems="center" spacing={1}>
											<Grid item xs={4}>
												<LabelTypography variant="body2">
													{label.charAt(0).toUpperCase() + label.slice(1)}
													{":"}
												</LabelTypography>
											</Grid>
											<Grid item xs={8}>
												<Tooltip disabled title="">
													<Stack direction="row" alignItems="center" spacing={1} py={1}>
														<Image
															src={png}
															alt={label}
															width="32px"
															height="32px"
															style={{ objectFit: "contain" }}
														/>
														<Typography>{formatLocalNumber(Math.ceil(points))}</Typography>
														<Typography variant="caption" color="text.secondary">
															{"points"}
														</Typography>
													</Stack>
												</Tooltip>
											</Grid>
										</Grid>

										{isInEditMode && (
											<>
												<BarContainer width="60%">
													<BarBackground />
													<BarForeground
														value={levelPct}
														color={`linear-gradient(90deg, ${startingColor} 0%, ${endColor} 100%)`}
													/>
												</BarContainer>
												<Typography variant="caption" color="text.secondary">
													{"Points remaining for next level "}
													<b>{formatLocalNumber(Math.ceil(pointsForNextLevel))}</b>
												</Typography>
											</>
										)}
									</ItemBox>
								</Box>
							</Grid>
						);
					})
				)}
			</Grid>
		</SectionTitle>
	);
};

PersonasCharacteristics.propTypes = {
	updateKeys: PropTypes.func,
	isInEditMode: PropTypes.bool,
	keysToExclude: PropTypes.shape({
		characteristics: PropTypes.array,
	}),
};

export default memo(PersonasCharacteristics);
