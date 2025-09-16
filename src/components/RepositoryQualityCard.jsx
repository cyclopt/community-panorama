import { useCallback, useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { blueGrey } from "@mui/material/colors";
import { Link as MaterialLink, IconButton, Box, Avatar, Button, CircularProgress, Grid, Paper, Typography, Autocomplete, Popper, TextField, Chip } from "@mui/material";
import { ErrorOutline, ExitToApp, FlashOn, Folder, Remove, SettingsInputComponent, Subtitles, Today, GitHub } from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { Link } from "react-router-dom";
import { shallow } from "zustand/shallow";

import { convertQualityScoreToAvatar, getColorForQualityScore, useSnackbar, dayjs, getRepoUrl, sortAndPrioritizeBranches } from "../utils/index.js";
import useGlobalState from "../use-global-state.js";
import { useAnalysisPreview } from "../api/index.js";
import SadFace from "../assets/images/sad_face.png";

import Tooltip from "./Tooltip.jsx";
import Card from "./Card.jsx";
import GitLabIcon from "./GitLabIcon.jsx";
import BitBucketIcon from "./BitBucketIcon.jsx";
import AzureIcon from "./AzureIcon.jsx";

const StyledChipRootButton = styled(Chip)(({ theme }) => ({
	textAlign: "center",
	padding: theme.spacing(1),
	paddingLeft: theme.spacing(2),
	backgroundColor: theme.palette.secondary.main,
	borderTopLeftRadius: 0,
	borderBottomLeftRadius: 0,
	color: "white",
	transition: "opacity 150ms",
	textOverflow: "ellipsis",
	fontSize: "inherit",
	cursor: "default",
	textTransform: "none",
	opacity: "1",
	"&:hover": {
		opacity: "0.95",
	},
	".MuiChip-avatar": {
		color: "white",
		maxHeight: theme.spacing(2.5),
	},
}));

const StyledChip = styled(Chip)(({ theme }) => ({
	backgroundColor: "transparent",
	color: theme.palette.primary.main,
	textOverflow: "ellipsis",
	fontSize: theme.spacing(1.5),
	cursor: "default",
	textTransform: "uppercase",
	"&:hover": {
		backgroundColor: blueGrey[50],
	},
	".MuiChip-avatar": {
		color: theme.palette.primary.main,
		maxHeight: "20px",
	},
}));

const RepositoryQualityCard = ({
	pId,
	repo: {
		language,
		productionBranch,
		branches = [],
		tags = [],
		_id: id,
		name: repoName,
		owner: repoOwner,
		root,
		vcType = "git",
		numberOfBranches,
		numberOfViolations,
		overallQualityScore,
		timeToFixViolations,
		totalAnalyses,
		updatedAt,
	},
	type,
}) => {
	const { error } = useSnackbar();

	const [selectedBranch, setSelectedBranch] = useState(productionBranch);
	const { setRepoName, setBranchName } = useGlobalState(useCallback((e) => ({
		setRepoName: e.setRepoName,
		setBranchName: e.setBranchName,
	}), []), shallow);
	const isProduction = useMemo(() => selectedBranch === productionBranch, [selectedBranch, productionBranch]);
	const { analysis = {}, isLoading: isLoadingDifBranch, isError } = useAnalysisPreview(pId, id, selectedBranch, isProduction);
	const isLoading = useMemo(() => (isProduction ? false : isLoadingDifBranch), [isLoadingDifBranch, isProduction]);

	const analysisPrev = useMemo(() => (
		Object.keys(analysis).length === 0 ? {
			numberOfBranches,
			numberOfViolations,
			overallQualityScore,
			timeToFixViolations,
			totalAnalyses,
			updatedAt,
		} : analysis),
	[analysis, numberOfBranches, numberOfViolations, overallQualityScore, timeToFixViolations, totalAnalyses, updatedAt]);

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	// Separate branches and tags and sort branches based on their name
	// we need to seperate so we don't have dublicates groups
	const { branchesAndTags } = useMemo(() => {
		const filteredTags = branches?.filter((br) => tags?.includes(br));
		const filterBranches = branches?.filter((br) => !tags?.includes(br));
		const sortedBranches = sortAndPrioritizeBranches(filterBranches, productionBranch);
		const sortedTags = filteredTags?.sort() || [];
		const bAT = [...sortedBranches, ...sortedTags];
		return { branchesAndTags: bAT };
	}, [branches, productionBranch, tags]);

	return (
		<Card
			contentStyle={{ padding: 0, flexGrow: "1" }}
			title={(
				<Typography variant="h6" sx={{ color: "common.white", m: 1 }}>
					{`${repoOwner}/${repoName}${root === "." ? "" : `/${root.replace(/^\//, "")}`}`}
					<IconButton
						component={MaterialLink}
						underline="none"
						href={getRepoUrl(type, { owner: repoOwner, name: repoName, root, selectedBranch, vcType })}
						target="_blank"
						rel="noopener noreferrer"
						size="small"
						sx={{ ml: 0.5, color: "white", opacity: "0.7", transition: "opacity 150ms", ":hover": { opacity: "1", color: "white" } }}
					>
						{type === "github"
							? <GitHub style={{ fontSize: "inherit" }} />
							: type === "bitbucket"
								? <BitBucketIcon style={{ fontSize: "inherit" }} />
								: type === "azure"
									? <AzureIcon style={{ fontSize: "inherit" }} />
									: <GitLabIcon style={{ fontSize: "inherit" }} />}
					</IconButton>
				</Typography>
			)}
		>
			<Grid item xs={12} sx={{ height: "100%" }}>
				<Grid container direction="column" justifyContent="center" alignItems="center" sx={{ height: "100%" }}>
					<Grid item container direction="row" alignItems="center" justifyContent="space-between" sx={{ position: "relative", pt: "1rem", pr: "1rem" }} mb={1}>
						{(root === ".") ? <Typography>&nbsp;</Typography> : (
							<Grid item sx={{ maxWidth: "45% !important", pr: 1 }}>
								<Tooltip placement="left" title="Root">
									<StyledChipRootButton avatar={<Folder />} label={root.replace(/^\//, "") || <Remove style={{ fontSize: "inherit" }} />} />
								</Tooltip>
							</Grid>
						)}
						<Grid item sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<Typography variant="body1">
								{"Branch:"}
								&nbsp;
							</Typography>
							<Autocomplete
								disableClearable
								size="small"
								sx={{
									minWidth: "10rem",
								}}
								PopperComponent={({ style, ...props }) => (
									<Popper
										{...props}
										sx={{ ...style, width: "fit-content" }}
										placement="bottom"
									/>
								)}
								renderInput={(params) => (
									<TextField
										{...params}
										variant="outlined"
										placeholder="Select a branch..."
									/>
								)}
								id="branch"
								groupBy={(option) => {
									if (tags.includes(option)) {
										return "Tags";
									}

									return "Branches";
								}}
								options={branchesAndTags}
								value={selectedBranch}
								onChange={(_, e) => {
									setRepoName(repoName);
									setBranchName(e || "");
									setSelectedBranch(e || "");
								}}
							/>
						</Grid>
					</Grid>
					{(!isLoading && Object.keys(analysisPrev).some((k) => analysisPrev[k] === null)) ? (
						<Grid item container direction="column" alignItems="center" justifyContent="center" p={1} sx={{ margin: "auto", flexGrow: "1" }}>
							<Grid item>
								<Avatar
									src={SadFace}
									alt="Sad face"
									sx={{
										height: (t) => t.spacing(7),
										width: (t) => t.spacing(7),
									}}
								/>
							</Grid>
							<Grid item p={1} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
								<Typography variant="h6" sx={{ color: "#d83c84", fontWeight: "600" }}>{"No Analyses for this branch"}</Typography>
								<Typography variant="h6" sx={{ color: "black", fontSize: "1rem", fontWeight: "500" }}>{"Please select another branch"}</Typography>
							</Grid>
						</Grid>
					)
						: (
							<Grid item container direction="row" sx={{ pr: "1rem", pl: "1rem", pb: "1rem" }}>
								<Grid item container direction="column" xs={4} sx={{ ">.MuiGrid-item": { maxWidth: "120%" } }}>
									<Grid item>
										<Tooltip placement="left" title="Main Language">
											<StyledChip
												clickable
												avatar={<Subtitles />}
												label={language || <Remove style={{ fontSize: "inherit" }} />}
											/>
										</Tooltip>
									</Grid>
									<Grid item sx={{ position: "relative" }}>
										<Tooltip placement="left" title="Production Branch">
											<Box>
												<StyledChip
													clickable
													avatar={<FlashOn />}
													label={productionBranch == null ? <CircularProgress size="1rem" />
														: productionBranch || <Remove fontSize="inherit" />}
												/>
											</Box>
										</Tooltip>
									</Grid>
									<Grid item hidden={selectedBranch !== productionBranch}>
										<Tooltip placement="left" title="Branches">
											<StyledChip
												clickable
												avatar={<SettingsInputComponent />}
												label={isLoading ? <CircularProgress size="1rem" />
													: analysisPrev.numberOfBranches || <Remove fontSize="inherit" />}
											/>
										</Tooltip>
									</Grid>
									<Grid item>
										<Tooltip placement="left" title="Violations">
											<StyledChip
												clickable
												avatar={<ErrorOutline />}
												label={isLoading ? <CircularProgress size="1rem" />
													: analysisPrev.numberOfViolations[0] || <Remove style={{ fontSize: "inherit" }} />}
											/>
										</Tooltip>
									</Grid>
									<Grid item>
										<Tooltip placement="left" title="Latest Analysis">
											<StyledChip
												clickable
												avatar={<Today />}
												label={analysisPrev
													? (analysisPrev.updatedAt
														? dayjs(analysisPrev.updatedAt).fromNow()
														: <Remove fontSize="inherit" />)
													: <CircularProgress size="1rem" />}
											/>
										</Tooltip>
									</Grid>
								</Grid>
								<Grid item container xs={4} direction="column" sx={{ margin: "auto" }}>
									<Paper elevation={0}>
										<Typography variant="h3" align="center">
											<Avatar
												sx={{
													width: (t) => t.spacing(10.5),
													height: (t) => t.spacing(10.5),
													bgcolor: analysisPrev?.overallQualityScore ? getColorForQualityScore(analysisPrev.overallQualityScore) : "secondary.main",
													display: "inline-flex",
													fontSize: "inherit",
												}}
											>
												{(() => {
													if (isLoading) return <CircularProgress size="1rem" />;
													const quality = convertQualityScoreToAvatar(analysisPrev.overallQualityScore);
													return quality || <Remove style={{ fontSize: "inherit" }} />;
												})()}
											</Avatar>
										</Typography>
									</Paper>
								</Grid>
								<Grid item xs={4} sx={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
									<Button
										data-cy={repoName}
										component={Link}
										startIcon={<ExitToApp />}
										to={id}
										variant="contained"
										sx={{ "&:hover": { color: "common.white" } }}
										disabled={!analysisPrev?.overallQualityScore}
										color="primary"
										onClick={() => { setRepoName(repoName); setBranchName(selectedBranch); }}
									>
										{"overview"}
									</Button>
								</Grid>
							</Grid>
						)}
				</Grid>
			</Grid>
		</Card>
	);
};

RepositoryQualityCard.propTypes = {
	pId: PropTypes.string.isRequired,
	repo: PropTypes.object,
	type: PropTypes.string,
};

export default RepositoryQualityCard;
