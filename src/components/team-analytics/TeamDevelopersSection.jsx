import { memo, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { Box, Grid, MenuItem, styled, FormControl, Divider as MUIDivider, Stack, Rating, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Image } from "mui-image";

import FilterSelect from "../FilterSelect.jsx";
import Select from "../Select.jsx";
import SectionTitle from "../SectionTitle.jsx";
import { PrimaryBorderButton } from "../Buttons.jsx";
import NoFindings from "../NoFindings.jsx";
import { useSnackbar } from "../../utils/index.js";

import DeveloperCard from "./DeveloperCard.jsx";

import { techMetrics } from "#utils";
import { updateDevelopersVisibility } from "#api";

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────
const ItemGrid = styled(Grid)(({ theme }) => ({
	padding: theme.spacing(1),
}));

const Divider = styled(MUIDivider)(({ theme }) => ({
	marginTop: theme.spacing(1),
	marginBottom: theme.spacing(1),
	backgroundColor: theme.palette.grey.deep,
}));

const GridContainer = styled(Box)({});
GridContainer.defaultProps = {
	container: true,
	display: "flex",
	direction: "row",
	wrap: "nowrap",
	alignItems: "flex-end",
	justifyContent: "space-between",
};

const GridItem = styled(Box)(() => ({
	display: "flex",
	alignItems: "end",
}));
GridItem.defaultProps = { item: true, xs: 3 };

const StatItem = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(0.5),
	marginRight: theme.spacing(1),
	whiteSpace: "nowrap",
}));

const Label = styled(Typography)(({ theme }) => ({
	fontWeight: theme.typography.fontWeightBold,
	fontSize: "0.875rem",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	lineHeight: "16px",
}));

const RatingStack = styled(Stack)({});
RatingStack.defaultProps = {
	direction: "row",
	flexWrap: "nowrap",
	alignItems: "center",
	spacing: 1,
	sx: { overflowX: "auto", paddingLeft: 0, paddingRight: 0 },
};

const ScrollGridWrapper = styled(Box)(() => ({
	display: "flex",
	flexDirection: "column",
	overflowX: "auto",
}));

// ─── HELPERS ───────────────────────────────────────────────────────────────
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const matchFilter = (dev, filterId, softCheck) => {
	const metricMatch = /^(.+?)&&&level&&&(\d+)$/.exec(filterId);
	if (metricMatch) {
		const [, metricKey, levelStr] = metricMatch;
		const wantLevel = Number(levelStr);
		return (dev.characteristics || []).some(
			(c) => c.label === metricKey
			&& (softCheck ? c.level >= wantLevel : c.level === wantLevel),
		);
	}

	if ((dev.languages || []).some((l) => l.label === filterId)) return true;
	if ((dev.frameworks || []).some((f) => f.label === filterId)) return true;
	return false;
};

const SortSelect = styled(FormControl)(({ theme }) => ({
	minWidth: theme.spacing(25),
}));

// ─── COMPONENT ────────────────────────────────────────────────────────────
const TeamDevelopersSection = ({ developersCardsContent, isLoading, mutateDevelopers }) => {
	const { error } = useSnackbar();
	const [filters, setFilters] = useState([]);
	const [shortComparator, setShortComparator] = useState("");
	const navigate = useNavigate();
	const [showAll, setShowAll] = useState(false);

	// Filtered developers
	const allShortComparators = useMemo(() => {
		const labelSet = new Set();
		for (const { frameworks = [], languages = [], characteristics = [] } of developersCardsContent) {
			for (const { label } of frameworks) labelSet.add(label);
			for (const { label } of languages) labelSet.add(label);
			for (const { label } of characteristics) labelSet.add(label);
		}

		return labelSet;
	}, [developersCardsContent]);

	// Build dynamic filterTree with disabled flags
	const filterTree = useMemo(() => {
		// 1) Metrics
		const charMax = developersCardsContent.reduce((acc, { characteristics = [] }) => {
			for (const { label, level = 0 } of characteristics) {
				acc[label] = Math.max(acc[label] || 0, level);
			}

			return acc;
		}, {});
		const metricFilters = Object.entries(charMax)
			.filter(([key]) => techMetrics.has(key))
			.map(([key, maxLevel]) => ({
				id: key,
				label: capitalize(key),
				disabled: false,
				children: Array.from({ length: maxLevel }, (_, i) => {
					const fid = `${key}&&&level&&&${i + 1}`;
					// disabled if applying this filter yields no devs
					const disabled = !developersCardsContent.some((dev) => [
						...filters,
						...(Array.isArray(fid) ? fid : [fid]),
					].every((f) => matchFilter(dev, f)));
					return {
						id: fid,
						label: `Level ${i + 1}`,
						disabled,
					};
				}),
			}));

		// 2) Languages
		const langSet = new Set();
		for (const { languages = [] } of developersCardsContent) { for (const { label } of languages) langSet.add(label); }

		const languagesFilter = {
			id: "languages",
			label: "Languages",
			disabled: false,
			children: [...langSet].map((label) => {
				const disabled = !developersCardsContent.some((dev) => [
					...filters,
					...(Array.isArray(label) ? label : [label]),
				].every((f) => matchFilter(dev, f)));
				return { id: label, label, disabled };
			}),
		};

		// 3) Frameworks
		const fwSet = new Set();
		for (const { frameworks = [] } of developersCardsContent) { for (const { label } of frameworks) fwSet.add(label); }

		const frameworksFilter = {
			id: "frameworks",
			label: "Frameworks",
			disabled: false,
			children: [...fwSet].map((label) => {
				const disabled = !developersCardsContent.some((dev) => [
					...filters,
					...(Array.isArray(label) ? label : [label]),
				].every((f) => matchFilter(dev, f)));
				return { id: label, label, disabled };
			}),
		};

		return [
			...metricFilters,
			languagesFilter,
			frameworksFilter,
		];
	}, [developersCardsContent, filters]);

	const filteredDeveloperStats = useMemo(() => {
		if (filters.length === 0) return developersCardsContent;
		return developersCardsContent.filter((dev) => filters.every((fid) => matchFilter(dev, fid, true)));
	}, [developersCardsContent, filters]);

	const shortedDeveloperStats = useMemo(() => {
		const arr = [...filteredDeveloperStats];
		if (!shortComparator) return arr;

		// Metric?
		if (techMetrics.has(shortComparator)) {
			return arr.sort((a, b) => {
				const aLvl = a.characteristics.find((c) => c.label === shortComparator)?.total
          || 0;
				const bLvl = b.characteristics.find((c) => c.label === shortComparator)?.total
          || 0;
				return bLvl - aLvl;
			});
		}

		// Language?
		if (arr.some((dev) => dev.languages.some((l) => l.label === shortComparator))) {
			return arr.sort((a, b) => {
				const aScore = a.languages.find((l) => l.label === shortComparator)?.score || 0;
				const bScore = b.languages.find((l) => l.label === shortComparator)?.score || 0;
				return bScore - aScore;
			});
		}

		// Framework?
		if (arr.some((dev) => dev.frameworks.some((f) => f.label === shortComparator))) {
			return arr.sort((a, b) => {
				const aScore = a.frameworks.find((f) => f.label === shortComparator)?.score || 0;
				const bScore = b.frameworks.find((f) => f.label === shortComparator)?.score || 0;
				return bScore - aScore;
			});
		}

		return arr;
	}, [filteredDeveloperStats, shortComparator]);

	const orderedDeveloperStats = useMemo(() => {
		const visible = [];
		const hidden = [];
		for (const dev of shortedDeveloperStats) {
			((dev.visible ?? true) ? visible : hidden).push(dev); // default undefined -> visible
		}

		return showAll ? [...visible, ...hidden] : visible;
	}, [shortedDeveloperStats, showAll]);

	return (
		<SectionTitle
			title="Developers"
			isLoading={isLoading}
			customToolbar={(
				<Box display="flex" gap={2}>
					<FilterSelect
						label="Filter"
						options={filterTree}
						selected={filters}
						placeholder="Select filters…"
						onChange={setFilters}
					/>
					<SortSelect variant="outlined" size="small">
						<Select
							displayEmpty
							labelId="shotby-label"
							id="shotby-select"
							value={shortComparator}
							renderValue={(value) => (value === ""
								? <em>{"Sort by…"}</em>
								: value)}
							onChange={(e) => setShortComparator(e.target.value)}
						>
							<MenuItem value="">
								<em>{"Sort by…"}</em>
							</MenuItem>
							{[...allShortComparators].map((name) => (
								<MenuItem key={name} value={name}>
									{name}
								</MenuItem>
							))}
						</Select>
					</SortSelect>
				</Box>
			)}
		>
			<Grid container>
				{orderedDeveloperStats.map((dev, i) => (
					<ItemGrid key={`${dev.username}_${i}`} item sm={12} md={12} lg={6} xl={4}>
						<DeveloperCard
							avatarSrc={dev.avatar}
							headerTitle={dev.username}
							visible={dev.visible}
							subHeaderTitle={dev.role}
							bottomBarFirstTitle="Current Workload: "
							bottomBarFirstTitleValue={1}
							bottomBarSecondTitle="Total Projects involved:"
							bottomBarSecondTitleValue={dev.workload.projects}
							pointsBurned={dev.workload.pointsBurned}
							pointsTotal={dev.workload.pointsTotal}
							actionFunction={async (setTo) => {
								try {
									await mutateDevelopers(async (p) => {
										await updateDevelopersVisibility(dev._id, setTo);

										const newDevelopers = [...p];
										const found = newDevelopers.find((e) => e._id === dev._id);
										if (found) found.visible = setTo;
										return newDevelopers;
									});
								} catch {
									error();
								}
							}}
							onClick={() => navigate(dev._id)}
						>
							{/* This code will render the CardContent of the card */}
							<>
								{(() => {
									const metricsMap = dev?.characteristics.map((metric) => {
										const m = {};
										const { label, level, png, total } = metric;
										m[label.toLowerCase()] = { level, png, total };

										return m;
									});
									return (
										<>
											<Divider />
											<ScrollGridWrapper>
												<GridContainer>
													{[...techMetrics].map((key) => (
														<GridItem key={key}>
															<Label>
																{capitalize(key)}
																{":"}
															</Label>
															<Image
																src={metricsMap[key]?.png}
																alt={key}
																width="16px"
																height="16px"
																style={{ objectFit: "contain" }}
															/>
														</GridItem>
													))}
												</GridContainer>
											</ScrollGridWrapper>
											<Divider />
											<RatingStack>
												{dev.languages.length > 0 ? (
													dev.languages.map(({ label, score }) => (
														<StatItem key={label}>
															<Label>
																{label}
																{":"}
															</Label>
															<Rating
																readOnly
																sx={{ color: (t) => t.palette.secondary.main }}
																value={score}
																size="small"
															/>
														</StatItem>
													))
												) : (
													<NoFindings
														isRow
														text="No Languages Found"
														isCongrats={false}
														congratsVariant="caption"
														logoVariant="caption"
													/>
												)}
											</RatingStack>
											<Divider />
											<RatingStack>
												{dev.frameworks.length > 0 ? (
													dev.frameworks.map(({ label, score }) => (
														<StatItem key={label}>
															<Label>
																{label}
																{":"}
															</Label>
															<Rating
																readOnly
																sx={{ color: (t) => t.palette.secondary.main }}
																value={score}
																size="small"
															/>
														</StatItem>
													))
												) : (
													<NoFindings
														isRow
														text="No Frameworks Found"
														isCongrats={false}
														congratsVariant="caption"
														logoVariant="caption"
													/>
												)}
											</RatingStack>
										</>
									);
								})()}
							</>
						</DeveloperCard>
					</ItemGrid>
				))}
				{/* Only render the “Show more” button if there are more than 2 blocks */}
				{shortedDeveloperStats.some((dev) => !dev.visible) && (
					<Box textAlign="center" width="100%" mt={2}>
						<PrimaryBorderButton
							title={showAll ? "Show less" : "Show more"}
							width="100%"
							onClick={() => setShowAll((p) => !p)}
						/>
					</Box>
				)}
			</Grid>
		</SectionTitle>
	);
};

TeamDevelopersSection.propTypes = {
	developersCardsContent: PropTypes.arrayOf(PropTypes.shape({
		username: PropTypes.string.isRequired,
		avatar: PropTypes.string,
		role: PropTypes.string,
		characteristics: PropTypes.arrayOf(PropTypes.shape({
			label: PropTypes.string.isRequired,
			level: PropTypes.number.isRequired,
		})),
		languages: PropTypes.arrayOf(PropTypes.shape({
			label: PropTypes.string.isRequired,
		})),
		frameworks: PropTypes.arrayOf(PropTypes.shape({
			label: PropTypes.string.isRequired,
		})),
		workload: PropTypes.string,
		totalProjects: PropTypes.number,
	})).isRequired,
	isLoading: PropTypes.bool,
	mutateDevelopers: PropTypes.func,
};

TeamDevelopersSection.defaultProps = {
	isLoading: false,
};

export default memo(TeamDevelopersSection);
