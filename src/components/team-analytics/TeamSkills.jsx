import { memo, useMemo, useState } from "react";
import {
	Grid,
	MenuItem,
	Box,
	FormControl,
	styled,
	Typography,
	CircularProgress,
} from "@mui/material";
import { useParams } from "react-router-dom";
import PropTypes from "prop-types";
import { useTheme } from "@emotion/react";

import Select from "../Select.jsx";
import LegendButtons from "../LegendButtons.jsx";
import SectionTitle from "../SectionTitle.jsx";
import Plot from "../Plot.jsx";
import Card from "../Card.jsx";

import { softSkills as SOFT_SKILLS } from "#utils";
import { useDevelopersSoftSkills } from "#api";

const SortSelect = styled(FormControl)(({ theme }) => ({
	minWidth: theme.spacing(25),
}));

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

const TeamSkills = ({ range }) => {
	const { organizationid } = useParams();
	const [selectedDeveloperId, setSelectedDeveloperId] = useState("");
	const [hiddenColumns, setHiddenColumns] = useState([]);
	const theme = useTheme();

	const {
		softSkills = [],
		isLoading: isLoadingCharacteristics,
	} = useDevelopersSoftSkills(organizationid, range);

	// Find the selected developer row
	const selectedDeveloper = useMemo(
		() => softSkills.find((d) => d._id.toString() === selectedDeveloperId) || null,
		[selectedDeveloperId, softSkills],
	);

	// Aggregate weekly soft skills for the selected developer
	const weeklyData = useMemo(() => {
		if (!selectedDeveloper || !Array.isArray(selectedDeveloper.softSkills)) return [];
		return selectedDeveloper.softSkills;
	}, [selectedDeveloper]);

	// Build one Plotly trace per soft-skill metric
	const traces = useMemo(() => {
		if (weeklyData.length === 0) return [];
		return [...SOFT_SKILLS].map((skillKey) => {
			// x-axis: week start dates
			const x = weeklyData.map((w) => w.weekStart);
			// y-axis: the metric value for that skill
			const y = weeklyData.map((w) => w.metrics[skillKey] || 0);

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
	}, [hiddenColumns, theme.palette, weeklyData]);

	// Plot layout
	const layout = useMemo(() => ({
		title: "Soft Skills Weekly",
		xaxis: { title: "Week Start", type: "date", tickformat: "%b %d" },
		yaxis: {
			title: "Score",
			dtick: 25,
			range: traces.length > 0
				? [0, Math.max(...traces.flatMap((t) => t.y)) * 1.1]
				: [0, 5],
		},
		showlegend: false,
		margin: { t: 50, b: 50 },
	}), [traces]);

	return (
		<SectionTitle
			title="Soft Skills"
			customToolbar={(
				<Box display="flex" gap={2}>
					<SortSelect variant="outlined" size="small">
						<Select
							displayEmpty
							value={selectedDeveloperId}
							renderValue={(val) => (val
								? softSkills.find((d) => d._id.toString() === val)?.username
								: <em>{"Select a developer…"}</em>)}
							onChange={(e) => setSelectedDeveloperId(e.target.value)}
						>
							<MenuItem value="">
								<em>{"Select a developer…"}</em>
							</MenuItem>
							{softSkills.map(({ username, _id }) => (
								<MenuItem key={_id} value={_id.toString()}>
									{username}
								</MenuItem>
							))}
						</Select>
					</SortSelect>
				</Box>
			)}
		>
			<Grid container spacing={2} textAlign="center" m={-1}>
				<Grid item xs={12}>
					<Card title="Skills Evolution" width="100%">
						<LegendButtons data={traces} hiddenColumns={hiddenColumns} setHiddenColumns={setHiddenColumns} />
						{isLoadingCharacteristics ? (
							<CenteredBox>
								<CircularProgress color="secondary" />
							</CenteredBox>
						) : traces.length > 0 ? (
							<PlotWrapper>
								<Plot data={traces} layout={layout} config={{ displayModeBar: false }} />
							</PlotWrapper>
						) : (
							<CenteredBox>
								<Typography variant="body2" color="textSecondary">
									{"Select a developer to view weekly soft skills"}
								</Typography>
							</CenteredBox>
						)}
					</Card>
				</Grid>
			</Grid>
		</SectionTitle>
	);
};

TeamSkills.propTypes = {
	range: PropTypes.object,
};

export default memo(TeamSkills);
