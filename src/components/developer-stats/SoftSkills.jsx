import { memo, useMemo, useState } from "react";
import { Box, Typography, Grid, styled, CircularProgress, Stack, Switch } from "@mui/material";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";
import { useTheme } from "@emotion/react";
import { QuestionMark } from "@mui/icons-material";

import Plot from "../Plot.jsx";
import LegendButtons from "../LegendButtons.jsx";
import SectionTitle from "../SectionTitle.jsx";
import Tooltip from "../Tooltip.jsx";

import { useDeveloperSoftSkills } from "#api";
import { softSkills as SOFT_SKILLS } from "#utils";

const CenteredBox = styled(Box)(({ theme }) => ({
	marginTop: theme.spacing(2),
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
}));

const PlotWrapper = styled(Box)(() => ({
	width: "100%",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
}));

// ─── UTILS ─────────────────────────────────────────────────────────────────
const ItemBox = styled(Box)(({ theme, editMode }) => ({
	display: "flex",
	flexDirection: "column",
	justifyContent: "space-between",
	width: "100%",
	margin: 1,
	...(editMode
		? {
			padding: theme.spacing(1),
			boxShadow: 1,
			borderRadius: theme.shape.borderRadius,
			border: "1px solid #ccc",
		}
		: {}),
}));

// ─── PERSONAS CHARACTERISTICS COMPONENT ─────────────────────────────────────
const SoftSkills = ({ isInEditMode, keysToExclude, updateKeys, range }) => {
	const { developerId, organizationid } = useParams();
	const { softSkills = [], isLoading } = useDeveloperSoftSkills(organizationid, developerId, range);
	const [hiddenColumns, setHiddenColumns] = useState([]);
	const theme = useTheme();

	const developerSoftskills = useMemo(() => softSkills?.reduce((acc, skill) => {
		const softSkillValues = skill.metrics;
		for (const skillKey in softSkillValues) {
			if (Object.prototype.hasOwnProperty.call(softSkillValues, skillKey)) {
				const numericValue = Number(softSkillValues[skillKey]) || 0;
				acc[skillKey] = (acc[skillKey] || 0) + numericValue;
			}
		}

		return acc;
	}, {
		efficiency: 0,
		focus: 0,
		innovation: 0,
		speed: 0,
	}), [softSkills]);

	const randarTrace = useMemo(() => {
		if (!isInEditMode && keysToExclude?.softSkills?.includes("softSkills-randar")) return [];
		const theta = ["Efficiency", "Focus", "Innovation", "Speed"];
		const r = theta.map((f) => developerSoftskills?.[f.toLowerCase()] || 0);

		return [
			{
				type: "scatterpolar",
				r,
				theta,
				name: "Member",
				fill: "toself",
				marker: { color: "orange" },
				line: { color: "orange" },
				hovertext: r.map((v, i) => `${v} | ${theta[i]}`),
				hoverinfo: "text",
			},
		];
	}, [developerSoftskills, isInEditMode, keysToExclude?.softSkills]);

	const traces = useMemo(() => {
		if (softSkills.length === 0) return [];
		if (!isInEditMode && keysToExclude?.softSkills?.includes("softSkills")) return [];
		return [...SOFT_SKILLS].map((skillKey) => {
			// x-axis: week start dates
			const x = softSkills.map((w) => w.weekStart);
			// y-axis: the metric value for that skill
			const y = softSkills.map((w) => w.metrics[skillKey] || 0);

			const columnName = skillKey.charAt(0).toUpperCase() + skillKey.slice(1);

			return {
				x,
				y,
				mode: "lines+markers",
				name: columnName,
				marker: { size: 6 },
				line: {
					shape: "spline", // use a spline (smooth) interpolation
					smoothing: 2, // controls how “curvy” the line is (0–2)
					color: theme.palette[skillKey]?.main,
				},
				visible: hiddenColumns.includes(columnName) ? "legendonly" : true,
			};
		});
	}, [hiddenColumns, isInEditMode, keysToExclude?.softSkills, softSkills, theme.palette]);

	// Plot layout
	const layout = useMemo(() => ({
		xaxis: { title: "Week Start", type: "date", tickformat: "%b %d" },
		yaxis: {
			title: "Score",
			dtick: 25,
			range: traces.length > 0
				? [0, Math.max(...traces.flatMap((t) => t.y)) * 1.1]
				: [0, 5],
		},
		showlegend: false,
		margin: { t: 0, b: 50 },
	}), [traces]);

	return (
		<SectionTitle
			title="Soft Skills"
			noDataMessage={traces.length > 0 || randarTrace.length > 0 ? null : "soft skills"}
			customToolbar={(
				<Tooltip
					placement="top"
					title={(
						<Box sx={{ textAlign: "left" }}>
							<Typography variant="body2" sx={{ mt: 0.5 }}>
								{"Weekly scores for key soft skills."}
							</Typography>

							<Box component="ul" sx={{ my: 0.5, m: 0 }}>
								<li style={{ marginTop: 4 }}>
									<i style={{ color: theme.palette.secondary.main }}>{"Efficiency"}</i>
									{" - A points-based system for writing qualitative code quickly."}
								</li>
								<li style={{ marginTop: 4 }}>
									<i style={{ color: theme.palette.secondary.main }}>{"Focus"}</i>
									{" - A points-based system for focusing on specific codebases and avoiding context switching."}
								</li>
								<li style={{ marginTop: 4 }}>
									<i style={{ color: theme.palette.secondary.main }}>{"Innovation"}</i>
									{" - A points-based system for adding new features and functionality."}
								</li>
								<li style={{ marginTop: 4 }}>
									<i style={{ color: theme.palette.secondary.main }}>{"Speed"}</i>
									{" - A points-based system for faster fixes of quality issues, based on their severity."}
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
			<Grid container spacing={2} textAlign="center" padding={3}>
				<ItemBox editMode={isInEditMode ? 1 : 0}>
					{isInEditMode && (
						<Stack direction="row-reverse" m={1}>
							<Typography variant="caption">{"Public"}</Typography>
							<Switch
								size="small"
								checked={!keysToExclude.softSkills?.includes("softSkills")}
								color="primary"
								onChange={(e) => updateKeys(e, "softSkills", "softSkills")}
							/>
						</Stack>
					)}

					<Grid container alignItems="center" spacing={1}>
						<LegendButtons data={traces} hiddenColumns={hiddenColumns} setHiddenColumns={setHiddenColumns} />
						{isLoading ? (
							<CenteredBox>
								<CircularProgress color="secondary" />
							</CenteredBox>
						) : traces.length > 0 && (
							<PlotWrapper>
								<Plot data={traces} layout={layout} config={{ displayModeBar: false }} />
							</PlotWrapper>
						)}
					</Grid>
				</ItemBox>
				<ItemBox editMode={isInEditMode ? 1 : 0}>
					{isInEditMode && (
						<Stack direction="row-reverse" m={1}>
							<Typography variant="caption">{"Public"}</Typography>
							<Switch
								size="small"
								checked={!keysToExclude.softSkills?.includes("softSkills-randar")}
								color="primary"
								onChange={(e) => updateKeys(e, "softSkills", "softSkills-randar")}
							/>
						</Stack>
					)}
					<Grid container alignItems="center" spacing={1} marginTop={2}>
						{isLoading ? (
							<CenteredBox>
								<CircularProgress color="secondary" />
							</CenteredBox>
						) : randarTrace.length > 0 && (
							<Plot
								data={randarTrace}
								layout={{
									showlegend: false,
									margin: { t: 30, l: 30, r: 30, b: 30 },
									polar: {
										radialaxis: {
											showticklabels: false,
											ticks: "",
											ticklen: 1,
											showline: false,
											autorange: true,
											nticks: 4,
										},
										angularaxis: {
											showticklabels: true,
											ticks: "",
										},
									},
								}}
							/>
						)}
					</Grid>
				</ItemBox>
			</Grid>
		</SectionTitle>
	);
};

SoftSkills.propTypes = {
	updateKeys: PropTypes.func,
	isInEditMode: PropTypes.bool,
	keysToExclude: PropTypes.shape({
		softSkills: PropTypes.array,
	}),
	range: PropTypes.object,
};

export default memo(SoftSkills);
