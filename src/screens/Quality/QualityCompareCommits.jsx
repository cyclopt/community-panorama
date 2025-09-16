import { useCallback, useMemo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
	Autocomplete,
	Chip,
	CircularProgress,
	Grid,
	IconButton,
	MenuItem,
	Paper,
	Popper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Typography,
	ButtonGroup,
	Grow,
} from "@mui/material";
import { CompareArrows, KeyboardArrowLeft, KeyboardArrowRight } from "@mui/icons-material";
import { styled, useTheme } from "@mui/material/styles";
import clsx from "clsx";
import { useNavigate, useLocation } from "react-router-dom";
import queryString from "query-string";

import Card from "../../components/Card.jsx";
import CommitCompareRadar from "../../components/CommitCompareRadar.jsx";
import { capitalize, metricsInfo, sum, dayjs } from "../../utils/index.js";
import { useAnalysis, useCommits } from "../../api/index.js";
import useGlobalState from "../../use-global-state.js";

const classes = {
	compareButton: "QualityCompareCommits-compareButton",
	diff: "QualityCompareCommits-diff",
	grey: "QualityCompareCommits-grey",
	red: "QualityCompareCommits-red",
	green: "QualityCompareCommits-green",
	paper: "QualityCompareCommits-paper",
	input: "QualityCompareCommits-input",
};

const Root = styled("div")(({ theme }) => ({
	[`& .${classes.compareButton}`]: {
		color: `${theme.palette.primary.main} !important`,
		"> svg": {
			width: theme.typography.h2.fontSize,
			height: theme.typography.h3.fontSize,
		},
	},
	[`& .${classes.diff}`]: {
		fontWeight: "bold",
		padding: theme.spacing(0.5, 0),
		margin: theme.spacing(0, 2),
		color: theme.palette.common.black,
	},
	[`& .${classes.grey}`]: {
		backgroundColor: "transparent !important",
		color: `${theme.palette.common.black} !important`,
	},
	[`& .${classes.red}`]: {
		backgroundColor: theme.palette.red[700],
		color: theme.palette.common.black,
	},
	[`& .${classes.green}`]: {
		backgroundColor: theme.palette.green[700],
		color: theme.palette.common.white,
	},
}));

const tableHeader = (
	<TableRow>
		<TableCell>
			<Typography variant="body2">{""}</Typography>
		</TableCell>
		<TableCell>
			<Typography variant="body2">
				{"1"}
				<sup>{"st"}</sup>
				{" commit"}
				<br />
				<Typography variant="caption">{"“from”"}</Typography>
			</Typography>
		</TableCell>
		<TableCell>
			<Typography variant="body2">
				{"2"}
				<sup>{"nd"}</sup>
				{" commit"}
				<br />
				<Typography variant="caption">{"“to”"}</Typography>
			</Typography>
		</TableCell>
		<TableCell>
			<Typography variant="body2">{"Difference"}</Typography>
		</TableCell>
	</TableRow>
);

const commitsPerPage = 50;

const QualityCompareCommits = (props) => {
	const theme = useTheme();
	const { projectId, repositoryId } = props;
	const branchName = useGlobalState(useCallback((e) => e.branchName, []));
	const { pathname, search } = useLocation();
	const navigate = useNavigate();
	const [firstCommit, setFirstCommit] = useState({ hash: "", page: 0 });
	const [secondCommit, setSecondCommit] = useState({ hash: "", page: 0 });
	const { commits = [], isLoading: isLoadingCommits } = useCommits(projectId, repositoryId, branchName);
	const { analysis: firstAnalysis = {}, isLoading } = useAnalysis(projectId, repositoryId, "", firstCommit?.hash, firstCommit?.hash);
	const { analysis: secondAnalysis = {}, isLoading: isLoading2 } = useAnalysis(projectId, repositoryId, "", secondCommit?.hash, secondCommit?.hash);

	const firstCommitInfo = useMemo(() => commits?.find((e) => e.hash === firstCommit?.hash), [commits, firstCommit]);
	const secondCommitInfo = useMemo(() => commits?.find((e) => e.hash === secondCommit?.hash), [commits, secondCommit]);
	const firstCommitOptions = useMemo(() => commits
		?.slice(firstCommit.page * commitsPerPage, (firstCommit.page + 1) * commitsPerPage)
		?.filter((e) => e.hash !== secondCommit?.hash) || [],
	[commits, firstCommit.page, secondCommit?.hash]);
	const secondCommitOptions = useMemo(() => commits
		?.slice(secondCommit.page * commitsPerPage, (secondCommit.page + 1) * commitsPerPage)
		?.filter((e) => e.hash !== firstCommit?.hash) || [],
	[commits, firstCommit?.hash, secondCommit.page]);
	const metricInfo = useMemo(() => (firstAnalysis._id
		? metricsInfo[firstAnalysis?.language?.toLowerCase()] || metricsInfo.default
		: []), [firstAnalysis]);

	const violationInfo = useMemo(() => Object.keys(firstAnalysis?.violationsInfo?.generalStats || {}), [firstAnalysis]);
	const commitPages = Math.ceil(commits.length / commitsPerPage);

	useEffect(() => {
		const { firstCommitHash, secondCommitHash } = queryString.parse(search);
		if (commits.length > 0) {
			if (firstCommitHash && firstCommit?.hash !== firstCommitHash) {
				setFirstCommit((p) => ({ ...commits.find((c) => c.hash === firstCommitHash), page: p?.page ?? 0 }));
			}

			if (secondCommitHash && secondCommit?.hash !== secondCommitHash) {
				setSecondCommit((p) => ({ ...commits.find((c) => c.hash === secondCommitHash), page: p?.page ?? 0 }));
			}

			if (!secondCommitHash) {
				const firstCommitHashFromList = commits?.[0]?.hash;
				const parsed = queryString.parse(search);
				parsed.secondCommitHash = firstCommitHashFromList;

				navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
			}
		}
	}, [commits, firstCommit, firstCommit?.hash, navigate, pathname, search, secondCommit?.hash, secondCommit.page]);

	return (
		<Root>
			<Grid container justifyContent="center" textAlign="center" alignItems="center" pb={2}>
				<Grid item xs={12}>
					<Typography variant="h6" fontWeight="bold" color="primary">{"Compare Quality of Commits"}</Typography>
				</Grid>
				<Grid item>
					<Autocomplete
						size="small"
						clearIcon={false}
						sx={{ width: "15rem", "& .MuiAutocomplete-popper": { minHeight: "500px" } }}
						PopperComponent={({ style, ...prps }) => (
							<Popper
								{...prps}
								sx={{ ...style, width: "fit-content", maxWidth: "35rem" }}
								placement="bottom"
							>
								{prps.children}
								{!isLoadingCommits && (
									<Grid container direction="row" justifyContent="center" p={1} sx={{ borderRadius: 1, borderTopLeftRadius: 0, borderTopRightRadius: 0, bgcolor: "white", pointerEvents: "auto" }}>
										<ButtonGroup
											variant="contained"
											orientation="horizontal"
											color="secondary"
											sx={{ p: 0, bgcolor: theme.palette.secondary.main }}
											size="small"
										>
											<IconButton
												sx={{ p: 0 }}
												size="small"
												title="Previous page"
												aria-label="Previous page"
												onClick={() => setFirstCommit((p) => ({ ...p, page: (p.page > 0) ? p.page - 1 : p.page }))}
												onMouseDown={(event) => {
													event.stopPropagation();
													event.preventDefault();
												}}
											>
												<KeyboardArrowLeft sx={{ color: "white" }} />
											</IconButton>
											<Typography color="white">
												{`${firstCommit.page + 1}/${commitPages}`}
											</Typography>
											<IconButton
												sx={{ p: 0 }}
												size="small"
												title="Next page"
												aria-label="Next page"
												onClick={() => setFirstCommit((p) => ({ ...p, page: (p.page < commitPages - 1) ? p.page + 1 : p.page }))}
												onMouseDown={(event) => {
													event.stopPropagation();
													event.preventDefault();
												}}
											>
												<KeyboardArrowRight sx={{ color: "white" }} />
											</IconButton>
										</ButtonGroup>
									</Grid>
								)}
							</Popper>
						)}
						value={firstCommit}
						getOptionLabel={(e) => e?.hash ?? ""}
						renderInput={(params) => {
							params.inputProps.value = params.inputProps.value.slice(0, 10);
							return <TextField {...params} variant="outlined" placeholder="1st commit"><Chip /></TextField>;
						}}
						id="firstCommit"
						options={firstCommitOptions}
						renderOption={(prps, e) => (
							<MenuItem {...prps} value={e.hash}>
								<Chip color="primary" label={`#${e.hash.slice(0, 6)}`} sx={{ mr: 1, width: "90px" }} />
								<Typography>{`${e.message.slice(0, 60)}${e.message.length > 60 ? "..." : ""}`}</Typography>
							</MenuItem>
						)}
						renderTags={(tagValue, getTagProps) => (
							<Chip
								color="primary"
								label={`#${tagValue.slice(0, 6)}`}
								sx={{ mr: 1, width: "90px" }}
								{...getTagProps()}
							/>
						)}
						loading={isLoadingCommits}
						onChange={(_, e) => {
							const parsed = queryString.parse(search);
							parsed.firstCommitHash = e?.hash;
							navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
						}}
					/>
				</Grid>
				<Grid item>
					<IconButton disabled classes={{ disabled: classes.compareButton }}>
						<CompareArrows />
					</IconButton>
				</Grid>
				<Grid item>
					<Autocomplete
						size="small"
						sx={{ width: "15rem", borderColor: "red" }}
						clearIcon={false}
						PopperComponent={({ style, ...prps }) => (
							<Popper
								{...prps}
								sx={{ ...style, width: "fit-content", maxWidth: "35rem" }}
								placement="bottom"
							>
								{prps.children}
								{!isLoading && (
									<Grid container direction="row" justifyContent="center" p={1} sx={{ borderRadius: 1, bgcolor: "white", pointerEvents: "auto" }}>
										<ButtonGroup
											variant="contained"
											orientation="horizontal"
											color="secondary"
											sx={{ p: 0, bgcolor: theme.palette.secondary.main }}
											size="small"
										>
											<IconButton
												sx={{ p: 0 }}
												size="small"
												title="Previous page"
												aria-label="Previous page"
												onClick={() => setSecondCommit((p) => ({ ...p, page: p.page > 0 ? p.page - 1 : p.page }))}
												onMouseDown={(event) => {
													event.stopPropagation();
													event.preventDefault();
												}}
											>
												<KeyboardArrowLeft sx={{ color: "white" }} />
											</IconButton>
											<Typography color="white">
												{`${secondCommit.page + 1}/${commitPages}`}
											</Typography>
											<IconButton
												sx={{ p: 0 }}
												size="small"
												title="Next page"
												aria-label="Next page"
												onClick={() => setSecondCommit((p) => ({ ...p, page: (p.page < commitPages - 1) ? p.page + 1 : p.page }))}
												onMouseDown={(event) => {
													event.stopPropagation();
													event.preventDefault();
												}}
											>
												<KeyboardArrowRight sx={{ color: "white" }} />
											</IconButton>
										</ButtonGroup>
									</Grid>
								)}
							</Popper>
						)}
						value={secondCommit}
						getOptionLabel={(e) => e?.hash ?? ""}
						renderInput={(params) => {
							params.inputProps.value = params.inputProps.value.slice(0, 10);
							return <TextField {...params} variant="outlined" placeholder="2nd commit"><Chip /></TextField>;
						}}
						id="secondCommit"
						options={secondCommitOptions}
						renderOption={(prps, e) => (
							<MenuItem {...prps} value={e.hash}>
								<Chip label={`#${e.hash.slice(0, 6)}`} sx={{ mr: 1, width: "90px", bgcolor: "grey.light" }} />
								{`${e.message.slice(0, 60)}${e.message.length > 60 ? "..." : ""}`}
							</MenuItem>
						)}
						renderTags={(tagValue, getTagProps) => (
							<Chip
								color="primary"
								label={`#${tagValue.slice(0, 6)}`}
								sx={{ mr: 1, width: "90px" }}
								{...getTagProps()}
							/>
						)}
						isLoading={isLoadingCommits}
						onChange={(_, e) => {
							const parsed = queryString.parse(search);
							parsed.secondCommitHash = e?.hash;
							navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
						}}
					/>
				</Grid>
			</Grid>
			{isLoadingCommits
				? (
					<Grid item container xs={12} justifyContent="center" alignItems="center" mt={4}>
						<CircularProgress color="secondary" />
					</Grid>
				)
				: (
					<Grow in={!(isLoading || isLoading2) && (firstCommitInfo && secondCommitInfo)}>
						<Grid
							container
							direction="row"
							justifyContent="center"
							alignItems="stretch"
							textAlign="center"
							spacing={2}
							m={-1}
							sx={{ "> .MuiGrid-item": { p: 1 } }}
						>
							<Grid item xs={12} md={6}>
								<Card boldHeader title="Commit Comparison">
									{isLoading || isLoading2
										? <CircularProgress color="secondary" />
										: firstCommitInfo && secondCommitInfo
											? (
												<TableContainer component={Paper} elevation={0}>
													<Table aria-label="characteristics table" size="small">
														<TableHead>
															{tableHeader}
														</TableHead>
														<TableBody>
															<TableRow>
																<TableCell>
																	<Typography variant="body2">{"Hash"}</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">{firstCommitInfo?.hash?.slice(0, 6) || "-"}</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">{secondCommitInfo?.hash?.slice(0, 6) || "-"}</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">{"-"}</Typography>
																</TableCell>
															</TableRow>
															<TableRow>
																<TableCell>
																	<Typography variant="body2">{"Authored at"}</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">
																		{firstCommitInfo?.authoredAt
																			? dayjs(firstCommitInfo.authoredAt).format("DD MMM YY, hh:mm a")
																			: "-"}
																	</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">
																		{secondCommitInfo?.authoredAt
																			? dayjs(secondCommitInfo.authoredAt).format("DD MMM YY, hh:mm a")
																			: "-"}
																	</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">
																		{firstCommitInfo?.authoredAt && secondCommitInfo?.authoredAt
																			? dayjs(secondCommitInfo.authoredAt).from(firstCommitInfo?.authoredAt, true)
																			: "-"}
																	</Typography>
																</TableCell>
															</TableRow>
															<TableRow>
																<TableCell>
																	<Typography variant="body2">{"Lines of Code"}</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">{firstAnalysis?.totalLocAnalyzed || "-"}</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">{secondAnalysis?.totalLocAnalyzed || "-"}</Typography>
																</TableCell>
																<TableCell>
																	{firstAnalysis?.totalLocAnalyzed && secondAnalysis?.totalLocAnalyzed ? (
																		<Typography variant="body2" className={classes.diff}>
																			{`${secondAnalysis?.totalLocAnalyzed <= firstAnalysis?.totalLocAnalyzed ? "" : "+"}${Math.ceil((
																				((secondAnalysis?.totalLocAnalyzed || 0) / (firstAnalysis?.totalLocAnalyzed || 0) - 1) * 100 // eslint-disable-line max-len
																			).toFixed(2)) || 0}%`}
																		</Typography>
																	) : <Typography variant="body2">{"-"}</Typography>}
																</TableCell>
															</TableRow>
															<TableRow>
																<TableCell>
																	<Typography variant="body2">{"Files"}</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">{firstAnalysis?.totalFiles == null ? "-" : firstAnalysis?.totalFiles}</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">{secondAnalysis?.totalFiles == null ? "-" : secondAnalysis?.totalFiles}</Typography>
																</TableCell>
																<TableCell>
																	{firstAnalysis?.totalFiles && secondAnalysis?.totalFiles ? (
																		<Typography variant="body2" className={classes.diff}>
																			{`${secondAnalysis?.totalFiles <= firstAnalysis?.totalFiles ? "" : "+"}${Math.ceil(
																				(((secondAnalysis?.totalFiles || 0) / (firstAnalysis?.totalFiles || 0) - 1) * 100).toFixed(2), // eslint-disable-line  max-len
																			) || 0}%`}
																		</Typography>
																	) : <Typography variant="body2">{"-"}</Typography>}
																</TableCell>
															</TableRow>
															<TableRow>
																<TableCell>
																	<Typography variant="body2">{"Overall Quality"}</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">
																		{firstAnalysis?.overallQualityScore
																			? `${Number.parseFloat(((firstAnalysis?.overallQualityScore || 0) * 100).toFixed(2), 10)}%`
																			: "-"}
																	</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">
																		{secondAnalysis?.overallQualityScore
																			? `${Number.parseFloat(((secondAnalysis?.overallQualityScore || 0) * 100).toFixed(2), 10)}%`
																			: "-"}
																	</Typography>
																</TableCell>
																<TableCell>
																	{firstAnalysis?.overallQualityScore && secondAnalysis?.overallQualityScore ? (
																		<Typography
																			variant="body2"
																			className={clsx(
																				classes.diff,
																				classes[secondAnalysis?.overallQualityScore < firstAnalysis?.overallQualityScore ? "red" : "green"],
																				{
																					[classes.grey]: (Math.ceil(((secondAnalysis?.overallQualityScore || 0)
																				/ (firstAnalysis?.overallQualityScore || 0) - 1) * 100) || 0) === 0,
																				},
																			)}
																		>
																			{`${secondAnalysis?.overallQualityScore <= firstAnalysis?.overallQualityScore ? "" : "+"}${Math.ceil(
																				(((secondAnalysis?.overallQualityScore || 0)
																			/ (firstAnalysis?.overallQualityScore || 0) - 1) * 100).toFixed(2),
																			) || 0}%`}
																		</Typography>
																	) : <Typography variant="body2">{"-"}</Typography>}
																</TableCell>
															</TableRow>
															{["maintainability", "security", "readability", "reusability"].map((e, ind) => {
																const scoreA = firstAnalysis?.characteristics?.[`${e}Score`];
																const scoreB = secondAnalysis?.characteristics?.[`${e}Score`];
																const change = Math.min(
																	Math.ceil(((scoreB / scoreA - 1) * 100).toFixed(2)) || 0, 100,
																);
																return (
																	<TableRow key={`row_${e}_${ind}`}>
																		<TableCell>
																			<Typography variant="body2">{capitalize(e)}</Typography>
																		</TableCell>
																		<TableCell>
																			<Typography variant="body2">
																				{scoreA == null ? "-" : `${Number.parseFloat((scoreA * 100).toFixed(2), 10)}%`}
																			</Typography>
																		</TableCell>
																		<TableCell>
																			<Typography variant="body2">
																				{scoreB == null ? "-" : `${Number.parseFloat((scoreB * 100).toFixed(2), 10)}%`}
																			</Typography>
																		</TableCell>
																		<TableCell>
																			<Typography
																				variant="body2"
																				className={clsx(
																					classes.diff,
																					classes[change < 0 ? "red" : "green"],
																					{ [classes.grey]: change === 0 },
																				)}
																			>
																				{scoreA && scoreB ? `${change <= 0 ? "" : "+"}${change}%` : "-"}
																			</Typography>
																		</TableCell>
																	</TableRow>
																);
															})}
														</TableBody>
													</Table>
												</TableContainer>
											) : (<span>{"No data available!"}</span>
											)}
								</Card>
							</Grid>
							<Grid item xs={12} md={6}>
								<CommitCompareRadar
									commitInfo={firstCommitInfo && secondCommitInfo
										? isLoading || isLoading2
											? null
											: [
												{
													r: [
														firstAnalysis.characteristics?.maintainabilityScore,
														firstAnalysis.characteristics?.securityScore,
														firstAnalysis.characteristics?.readabilityScore,
														firstAnalysis.characteristics?.reusabilityScore,
														firstAnalysis.characteristics?.maintainabilityScore,
													],
													name: `#${firstCommitInfo?.hash?.slice(0, 6)}`,
												},
												{
													r: [
														secondAnalysis.characteristics?.maintainabilityScore,
														secondAnalysis.characteristics?.securityScore,
														secondAnalysis.characteristics?.readabilityScore,
														secondAnalysis.characteristics?.reusabilityScore,
														secondAnalysis.characteristics?.maintainabilityScore,
													],
													name: `#${secondCommitInfo?.hash?.slice(0, 6)}`,
												},
											]
										: []}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<Card boldHeader title="Metrics Comparison" tooltip="Every metric is in a 0-100 scale.">
									{isLoading || isLoading2 ? (
										<CircularProgress color="secondary" />
									) : firstCommitInfo && secondCommitInfo
										? (
											<TableContainer component={Paper} elevation={0}>
												<Table aria-label="characteristics table" size="small">
													<TableHead>
														<TableRow>
															<TableCell>
																<Typography variant="body2">{""}</Typography>
															</TableCell>
															<TableCell>
																<Typography variant="body2">
																	{"1"}
																	<sup>{"st"}</sup>
																	{" commit"}
																	<br />
																	<Typography variant="caption">{"“from”"}</Typography>
																</Typography>
															</TableCell>
															<TableCell>
																<Typography variant="body2">
																	{"2"}
																	<sup>{"nd"}</sup>
																	{" commit"}
																	<br />
																	<Typography variant="caption">{"“to”"}</Typography>
																</Typography>
															</TableCell>
															<TableCell>
																<Typography variant="body2">{" Quality Change"}</Typography>
															</TableCell>
														</TableRow>
													</TableHead>
													<TableBody>
														{metricInfo
															.filter((e) => !["NSP_VIOL", "SECURITY_VIOL"].includes(e.metric))
															.map(({ title, category, metric }, ind) => {
																const scoreA = firstAnalysis?.metricsScores?.[category]?.[metric]?.avgScore;
																const valueA = firstAnalysis?.metricsScores?.[category]?.[metric]?.avgValue;
																const scoreB = secondAnalysis?.metricsScores?.[category]?.[metric]?.avgScore;
																const valueB = secondAnalysis?.metricsScores?.[category]?.[metric]?.avgValue;
																const change = Math.min(Math.ceil(((scoreB / scoreA - 1) * 100).toFixed(2)) || 0, 100);
																return (
																	<TableRow key={`metric_${title}_${ind}`}>
																		<TableCell style={{ textAlign: "left" }}><Typography variant="body2">{title}</Typography></TableCell>
																		<TableCell>
																			<Typography variant="body2">
																				{valueA == null ? "-" : Number.parseFloat(valueA.toFixed(2), 10)}
																			</Typography>
																		</TableCell>
																		<TableCell>
																			<Typography variant="body2">
																				{valueB == null ? "-" : Number.parseFloat(valueB.toFixed(2), 10)}
																			</Typography>
																		</TableCell>
																		<TableCell>
																			<Typography
																				variant="body2"
																				className={clsx(
																					classes.diff,
																					classes[change < 0 ? "red" : "green"],
																					{ [classes.grey]: change === 0 },
																				)}
																			>
																				{scoreA && scoreB ? `${change <= 0 ? "" : "+"}${change}%` : "-"}
																			</Typography>
																		</TableCell>
																	</TableRow>
																);
															})}
													</TableBody>
												</Table>
											</TableContainer>
										) : (<span>{"No data available!"}</span>
										)}
								</Card>
							</Grid>
							<Grid item xs={12} md={6}>
								<Card boldHeader title="Violations Comparison">
									{isLoading || isLoading2 ? (
										<CircularProgress color="secondary" />
									) : firstCommitInfo && secondCommitInfo ? (
										<TableContainer component={Paper} elevation={0}>
											<Table aria-label="characteristics table" size="small">
												<TableHead>
													{tableHeader}
												</TableHead>
												<TableBody>
													<TableRow>
														<TableCell colSpan={4}>
															<Typography className={classes.diff} style={{ color: "black" }}>{"Severity"}</Typography>
														</TableCell>
													</TableRow>
													{["Critical", "Major", "Minor"].map((e, ind) => {
														const genStatsA = Object.values(firstAnalysis?.violationsInfo?.generalStats || []);
														const genStatsB = Object.values(secondAnalysis?.violationsInfo?.generalStats || []);
														const change = Math.min(
															Math.ceil(((sum(genStatsB, e) / sum(genStatsA, e) - 1) * 100).toFixed(2)) || 0, 100,
														);
														return (
															<TableRow key={`violation_group_${e}_${ind}`}>
																<TableCell style={{ textAlign: "left" }}><Typography variant="body2">{e}</Typography></TableCell>
																<TableCell>
																	<Typography variant="body2">
																		{genStatsA.length > 0 ? sum(genStatsA, e) : "-"}
																	</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">
																		{genStatsB.length > 0 ? sum(genStatsB, e) : "-"}
																	</Typography>
																</TableCell>
																<TableCell>
																	<Typography
																		variant="body2"
																		className={clsx(
																			classes.diff,
																			classes[change < 0 ? "green" : "red"],
																			{ [classes.grey]: change === 0 },
																		)}
																	>
																		{genStatsA.length > 0 && genStatsB.length > 0 ? `${change <= 0 ? "" : "+"}${change}%` : "-"}
																	</Typography>
																</TableCell>
															</TableRow>
														);
													})}
													<TableRow>
														<TableCell colSpan={4}>
															<Typography className={classes.diff} style={{ color: "black" }}>{"Categories"}</Typography>
														</TableCell>
													</TableRow>
													{violationInfo.map((el, ind) => {
														const genStatsA = Object.values(firstAnalysis?.violationsInfo?.generalStats?.[el] || []);
														const genStatsB = Object.values(secondAnalysis?.violationsInfo?.generalStats?.[el] || []);
														const change = Math.min(
															Math.ceil(((sum(genStatsB) / sum(genStatsA) - 1) * 100).toFixed(2)) || 0, 100,
														);
														return (
															<TableRow key={`violation_${el}_${ind}`}>
																<TableCell style={{ textAlign: "left" }}><Typography variant="body2">{el}</Typography></TableCell>
																<TableCell>
																	<Typography variant="body2">
																		{genStatsA.length > 0 ? sum(genStatsA) : "-"}
																	</Typography>
																</TableCell>
																<TableCell>
																	<Typography variant="body2">
																		{genStatsB.length > 0 ? sum(genStatsB) : "-"}
																	</Typography>
																</TableCell>
																<TableCell>
																	<Typography
																		variant="body2"
																		className={clsx(
																			classes.diff,
																			classes[change < 0 ? "green" : "red"],
																			{ [classes.grey]: change === 0 },
																		)}
																	>
																		{genStatsA.length > 0 && genStatsB.length > 0 ? `${change <= 0 ? "" : "+"}${change}%` : "-"}
																	</Typography>
																</TableCell>
															</TableRow>
														);
													})}
												</TableBody>
											</Table>
										</TableContainer>
									) : (<span>{"No data available!"}</span>)}
								</Card>
							</Grid>
						</Grid>
					</Grow>
				)}
		</Root>
	);
};

QualityCompareCommits.propTypes = { projectId: PropTypes.string.isRequired, repositoryId: PropTypes.string.isRequired };

export default QualityCompareCommits;
