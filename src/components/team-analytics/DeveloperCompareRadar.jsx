import { useState, memo, useMemo } from "react";
import PropTypes from "prop-types";
import { Box, MenuItem, Select as MuiSelect, Typography, CircularProgress } from "@mui/material";

import Plot from "../Plot.jsx";
import Card from "../Card.jsx";

const metaData = {
	softSkills: {
		title: "Soft Skills",
		fields: [
			{ label: "Efficiency", path: "softSkills.efficiency" },
			{ label: "Focus", path: "softSkills.focus" },
			{ label: "Innovation", path: "softSkills.innovation" },
			{ label: "Speed", path: "softSkills.speed" },
		],
	},
	characteristics: {
		title: "Characteristics",
		fields: [
			{ label: "Code", path: "characteristics.code" },
			{ label: "Debugging", path: "characteristics.debugging" },
			{ label: "Security", path: "characteristics.security" },
			{ label: "Refactoring", path: "characteristics.refactoring" },
		],
	},
};

// tiny safe getter: getPath(dev, "softSkills.efficiency")
const getPath = (obj, path) => path.split(".").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);

const DeveloperCompareRadar = ({ metrics, isLoading, label }) => {
	const cfg = metaData[label] ?? metaData.characteristics;
	const [selected1, setSelected1] = useState(metrics[0]?._id || "");
	const [selected2, setSelected2] = useState(metrics[1]?._id || "");

	const dev1 = metrics.find((d) => d._id === selected1);
	const dev2 = metrics.find((d) => d._id === selected2);

	const traces = useMemo(() => {
		const members = [dev1, dev2];

		const res = members
			.map((dev, idx) => {
				if (!dev) return null;

				// build r/theta from config
				const theta = cfg.fields.map((f) => f.label);
				const r = cfg.fields.map((f) => {
					const v = Number(getPath(dev, f.path)) || 0; // coerce to number, default 0
					return v;
				});

				const color = idx === 0 ? "orange" : "blue";

				return {
					type: "scatterpolar",
					r,
					theta,
					name: dev.fullName || dev.username || `Member ${idx + 1}`,
					fill: "toself",
					marker: { color },
					line: { color },
					hovertext: r.map((v, i) => `${v} | ${theta[i]}`),
					hoverinfo: "text",
				};
			})
			.filter(Boolean);

		return { res }; // avoid [0,0] range
	}, [dev1, dev2, cfg.fields]);

	const { res: plotTraces } = traces;

	return (
		<Card
			boldHeader
			title={`${cfg.title} Comparison`}
			contentClassName="member-comparison-diagram"
		>
			<Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
				<Box>
					<Typography gutterBottom variant="subtitle2">{"Member 1"}</Typography>
					<MuiSelect
						value={selected1}
						size="small"
						sx={{ minWidth: 160 }}
						onChange={(e) => setSelected1(e.target.value)}
					>
						{metrics.filter((dev) => dev._id !== selected2).map((dev) => (
							<MenuItem key={dev._id} value={dev._id}>
								<Box
									component="span"
									sx={{
										display: "inline-block",
										width: 8,
										height: 8,
										borderRadius: "50%",
										backgroundColor: "orange",
										mr: 1,
									}}
								/>
								{dev.fullName || dev.username}
							</MenuItem>
						))}
					</MuiSelect>
				</Box>

				<Box flex={1} mx={3}>
					{isLoading ? (
						<Box textAlign="center"><CircularProgress size={48} /></Box>
					) : plotTraces.length === 2 ? (
						<Plot
							data={plotTraces}
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
					) : (
						<Typography textAlign="center">{"No developer data available for comparison"}</Typography>
					)}
				</Box>

				<Box>
					<Typography gutterBottom variant="subtitle2">{"Member 2"}</Typography>
					<MuiSelect
						value={selected2}
						size="small"
						sx={{ minWidth: 160 }}
						onChange={(e) => setSelected2(e.target.value)}
					>
						{metrics.filter((dev) => dev._id !== selected1).map((dev) => (
							<MenuItem key={dev._id} value={dev._id}>
								<Box
									component="span"
									sx={{
										display: "inline-block",
										width: 8,
										height: 8,
										borderRadius: "50%",
										backgroundColor: "blue",
										mr: 1,
									}}
								/>
								{dev.fullName || dev.username}
							</MenuItem>
						))}
					</MuiSelect>
				</Box>
			</Box>
		</Card>
	);
};

DeveloperCompareRadar.propTypes = {
	metrics: PropTypes.arrayOf(
		PropTypes.shape({
			_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
			fullName: PropTypes.string,
			username: PropTypes.string,
			// either set can be present; numbers preferred
			softSkills: PropTypes.shape({
				efficiency: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
				focus: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
				innovation: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
				speed: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
			}),
			characteristics: PropTypes.shape({
				code: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
				debugging: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
				security: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
				refactoring: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
			}),
		}),
	),
	isLoading: PropTypes.bool,
	label: PropTypes.oneOf(["softSkills", "characteristics"]),
};

DeveloperCompareRadar.defaultProps = {
	metrics: [],
	isLoading: false,
	label: "characteristics",
};

export default memo(DeveloperCompareRadar);
