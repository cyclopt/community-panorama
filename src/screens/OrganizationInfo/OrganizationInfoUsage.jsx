import { useMemo, memo } from "react";
import { Grid, CircularProgress, Typography, Chip, Box } from "@mui/material";
import { Folder } from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { stringAToZInsensitive } from "@iamnapo/sort";

import { dayjs, isFuzzyMatch, prettyMilliseconds } from "../../utils/index.js";
import { useOrganizationUsage } from "../../api/index.js";
import Tile from "../../components/Tile.jsx";
import DataTable from "../../components/DataTable.jsx";
import AnalysesTimeGraph from "../../components/AnalysesTimeGraph.jsx";
import AnalysesCountGraph from "../../components/AnalysesCountGraph.jsx";
import Tooltip from "../../components/Tooltip.jsx";
import Pulse from "../../components/Pulse.jsx";

const OrganizationInfoUsage = () => {
	const { organizationid } = useParams();
	const { repositories = [], isLoading } = useOrganizationUsage(organizationid);
	const { analysesDurations, analysesCount, analysesDuration } = useMemo(() => {
		if (repositories.length === 0) return {};
		const tz = dayjs.tz.guess();

		const analysesDurations_ = {};
		let analysesCount_ = 0;
		let analysesDuration_ = 0;

		const included = new Set();
		for (const repo of repositories) {
			for (const analysis of repo.analyses) {
				if (!included.has(analysis._id)) {
					const createdAt = dayjs(analysis?.createdAt).tz(tz).startOf("day").format();
					const analysisDuration = dayjs(analysis?.updatedAt).diff(analysis.createdAt);

					if (!analysesDurations_[createdAt]) analysesDurations_[createdAt] = [];
					analysesDurations_[createdAt].push(analysisDuration);
					analysesCount_ += 1;
					analysesDuration_ += analysisDuration;
				}
			}
		}

		return {
			analysesDurations: analysesDurations_,
			analysesCount: analysesCount_,
			analysesDuration: analysesDuration_,
		};
	}, [repositories]);

	const tableColumns = useMemo(() => [
		{
			field: "Repository Name",
			minWidth: 200,
			flex: 1,
			align: "left",
			valueGetter: ({ row }) => ({ repository: `${row.owner}/${row.name}`, lastWeekAnalyses: row.lastWeekAnalyses }),
			getApplyQuickFilterFn: (searchValue) => ({ row }) => (
				isFuzzyMatch([row.name, row.owner, row.project.name, row.team.name], searchValue)
			),
			sortComparator: (rowA, rowB) => (
				rowB.lastWeekAnalyses - rowA.lastWeekAnalyses || stringAToZInsensitive()(rowA.repository, rowB.repository)
			),
			renderCell: ({ value, row }) => (
				<Grid container display="flex" flexDirection="column" sx={{ "> .MuiGrid-item": { width: "100%" } }}>
					<Grid container py={0.5} direction="row" alignItems="center">
						{row.lastWeekAnalyses > 0 ? (
							<Tooltip
								title={(
									<Typography variant="caption">
										{"Active Repository!"}
										<br />
										{`${row.lastWeekAnalyses} analyses were made in the last week.`}
									</Typography>
								)}
							>
								<Box sx={{ display: "flex", alignItems: "center" }}><Pulse /></Box>
							</Tooltip>
						) : null}
						<Grid item><Typography>{value.repository}</Typography></Grid>
					</Grid>
					{row.root !== "." && (
						<Grid item container ml={1} display="flex" flexDirection="row" alignItem="center">
							<Grid item mr={1} display="flex" flexDirection="column" justifyContent="center"><Folder sx={{ fontSize: "1rem", color: "grey" }} /></Grid>
							<Grid item><Typography variant="caption">{row.root}</Typography></Grid>
						</Grid>
					)}
					<Grid item container mt={1} display="flex" alignItems="center">
						<Typography variant="caption">{"Project:"}</Typography>
						<Chip label={row.project.name} sx={{ m: 0.5, height: "auto", fontSize: (th) => th.typography.caption }} />
					</Grid>
					<Grid item container display="flex" alignItems="center">
						<Typography variant="caption">{"Team:"}</Typography>
						<Chip variant="outlined" label={row.team.name} sx={{ m: 0.5, height: "auto", fontSize: (th) => th.typography.caption }} />
					</Grid>
				</Grid>
			),
		},
		{
			field: "Language",
			flex: 1,
			maxWidth: 200,
			valueGetter: ({ row }) => row.language,
		},
		{
			field: "Analyses",
			flex: 1,
			align: "right",
			maxWidth: 150,
			type: "number",
			valueGetter: ({ row }) => row.analyses.length,
		},
		{
			field: "Avg. Time",
			flex: 1,
			align: "right",
			maxWidth: 200,
			type: "number",
			valueGetter: ({ row }) => row?.avgAnalysisTime ?? 0,
			sortComparator: (a, b) => (a - b),
			renderCell: ({ value }) => <Typography>{prettyMilliseconds(value)}</Typography>,
		},
		{
			field: "Total Analysis Time",
			flex: 1,
			maxWidth: 200,
			align: "right",
			type: "number",
			valueGetter: ({ row }) => row?.analysesTime ?? 0,
			sortComparator: (a, b) => (a - b),
			renderCell: ({ value }) => <Typography>{prettyMilliseconds(value)}</Typography>,
		},
	], []);

	return (
		<div className="container">
			{isLoading ? <div style={{ height: "calc(100vh - 22rem)", display: "flex", alignItems: "center", justifyContent: "center" }}><CircularProgress color="secondary" /></div>
				: (repositories?.length === 0 ? <span>{"No data available!"}</span> : (
					<>
						<Grid container direction="row" justifyContent="center" spacing={2} m={-1} mb={2} sx={{ "> .MuiGrid-item": { p: 1 } }}>
							<Grid item md xs={6}>
								<Tile row={2} number={analysesCount} content="total analyses" />
							</Grid>
							<Grid item md xs={6}>
								<Tile row={2} title={prettyMilliseconds(analysesDuration)} content="total time analyzed" />
							</Grid>
							<Grid item md xs={6}>
								<Tile row={2} title={prettyMilliseconds(analysesCount ? analysesDuration / analysesCount : 0)} content="mean analysis time" />
							</Grid>
							<Grid item md xs={6}>
								<Tile
									row={2}
									number={analysesCount / 30}
									content="analyses (per day)"
								/>
							</Grid>
						</Grid>
						<Grid item xs={12} md={9} lg={10}>
							<Grid container direction="column" justifyContent="center" spacing={4} m={-2} sx={{ "> .MuiGrid-item": { p: 2 } }}>
								<AnalysesTimeGraph data={analysesDurations} />
							</Grid>
							<Grid container direction="column" justifyContent="center" spacing={4} m={-2} sx={{ "> .MuiGrid-item": { p: 2 } }}>
								<AnalysesCountGraph data={analysesDurations} />
							</Grid>
							<Grid container direction="column" justifyContent="center" spacing={4} m={-2} sx={{ "> .MuiGrid-item": { p: 2 } }}>
								<Grid item xs={12} width="100%">
									<DataTable
										tableName="usageTable"
										rows={repositories}
										loading={isLoading}
										columns={tableColumns}
										initialState={{ sorting: { sortModel: [{ field: "Repository Name", sort: "asc" }] }, pagination: { paginationModel: { page: 0 } } }}
									/>
								</Grid>
							</Grid>
						</Grid>
					</>
				))}
		</div>
	);
};

export default memo(OrganizationInfoUsage);
