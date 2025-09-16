import PropTypes from "prop-types";
import { Link as MaterialLink, Grid, Typography, Button, IconButton, Chip, Autocomplete, Popper, TextField, CircularProgress /* useMediaQuery */, Box } from "@mui/material";
import { ExitToApp, Remove, Check, Clear, Cancel, CheckCircle, GitHub, Folder, PriorityHigh } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useTheme, styled } from "@mui/material/styles";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { shallow } from "zustand/shallow";

import { useSnackbar, allMetricOptions, getRepoUrl } from "../utils/index.js";
import useGlobalState from "../use-global-state.js";

import GitLabIcon from "./GitLabIcon.jsx";
import BitBucketIcon from "./BitBucketIcon.jsx";
import AzureIcon from "./AzureIcon.jsx";
import Tooltip from "./Tooltip.jsx";
import Card from "./Card.jsx";

import { useQualityGateResult } from "#api";

const operatorOptions = [
	{ label: "is less than", value: "<" },
	{ label: "is less or equal than", value: "<=" },
	{ label: "is equal", value: "=" },
	{ label: "is equal or greater than", value: ">=" },
	{ label: "is greater than", value: ">" },
];

const Dot = styled("div")(({ theme, active }) => ({
	width: 5,
	height: 5,
	margin: 1,
	marginTop: "0.5rem",
	borderRadius: "50%",
	backgroundColor: active ? theme.palette.primary.main : theme.palette.grey[400],
	transition: "background-color 0.3s ease-in-out",
}));

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

const maxDots = 5;

const QualityGateStatus = ({
	pId,
	orgId,
	qualityGates,
	repo: {
		productionBranch,
		stagingBranch,
		branches = [],
		_id: id,
		name: repoName,
		owner: repoOwner,
		root,
		language,
		vcType = "git",
	},
	type,
	failedQualityGate,
}) => {
	const [selectedBranch, setSelectedBranch] = useState(failedQualityGate
		? {
			branch: failedQualityGate.branch,
			isProductionBranch: failedQualityGate.productionBranch,
			isStagingBranch: failedQualityGate.stagingBranch,
		}
		: null);
	const [branchOptions, setBranchOptions] = useState([]);
	const [dotsNum, setDotsNum] = useState([]);
	const [selectedQualityGate, setSelectedQualityGate] = useState(failedQualityGate ? failedQualityGate.qualityGate : { _id: null, name: "" });
	const [activeDot, setActiveDot] = useState(0);
	const scrollRef = useRef(null);

	const theme = useTheme();
	const { error } = useSnackbar();

	const { setRepoName, setBranchName } = useGlobalState(useCallback((e) => ({
		setRepoName: e.setRepoName,
		setBranchName: e.setBranchName,
	}), []), shallow);
	// isLoading will return true if
	// -> selectedQualityGate is undefined
	// -> selectedBranch is undefined
	// -> result is undefined
	// result will be {} if no result for the given quality Gate and analysis is found on db
	const { result = {}, isLoading, isError, mutate } = useQualityGateResult(
		orgId,
		selectedQualityGate._id,
		id,
		selectedBranch?.branch,
		root,
		language,
	);

	useEffect(() => {
		const handleScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

			const scrollPos = scrollTop / (scrollHeight - clientHeight);
			const dotIndex = Math.min(Math.floor(scrollPos * dotsNum.length), dotsNum.length - 1); // Assuming 3 dots
			setActiveDot(dotIndex);
		};

		const updateDots = () => {
			const { scrollHeight, clientHeight } = scrollRef.current;
			if (scrollHeight > clientHeight) {
				const numberOfDots = Math.min(Math.floor(scrollHeight / clientHeight) + 1, maxDots);
				const dotsArray = Array.from({ length: numberOfDots }, (_, index) => index);
				setDotsNum(dotsArray);
			} else {
				setDotsNum([]);
			}
		};

		updateDots(); // Initial call to update dots

		const scrollElement = scrollRef.current;
		scrollElement.addEventListener("scroll", handleScroll);
		window.addEventListener("resize", updateDots); // Recalculate on resize for responsive adjustments

		return () => {
			window.removeEventListener("resize", updateDots);
			scrollElement.removeEventListener("scroll", handleScroll);
		};
	}, [dotsNum.length, result.testedConditions?.length]);

	useEffect(() => {
		const selectedQualityGateInfo = qualityGates?.find((gate) => gate._id === selectedQualityGate._id);
		let options = [];
		const isOrgQualityGate = selectedQualityGateInfo?.references?.organizations;
		if (isOrgQualityGate) {
			if (selectedQualityGateInfo?.branches[0] === "all") options.push(...branches.map((br) => ({ branch: br, isProductionBranch: br === productionBranch, isStagingBranch: br === stagingBranch })));
			if (["productionBranch", "stagingBranch"].some((br) => selectedQualityGateInfo?.branches?.includes(br))) {
				const branchMap = new Map();

				if (selectedQualityGateInfo?.branches.includes("productionBranch")) {
					const br = productionBranch;
					branchMap.set(br, {
						branch: br,
						isProductionBranch: true,
						isStagingBranch: false,
					});
				}

				if (selectedQualityGateInfo?.branches.includes("stagingBranch")) {
					const br = stagingBranch;
					if (branchMap.has(br)) {
					// Already added as production, just update flag
						branchMap.get(br).isStagingBranch = true;
					} else {
						branchMap.set(br, {
							branch: br,
							isProductionBranch: false,
							isStagingBranch: true,
						});
					}
				}

				options = [...branchMap.values()];
			}
		} else {
			const repoBranchInfo = selectedQualityGateInfo?.linkedRepositories
				.find((lr) => lr.repoId.toString() === id.toString())?.branches;
			options = [
				...(Array.isArray(repoBranchInfo?.otherBranches) ? repoBranchInfo.otherBranches : []),
				...(repoBranchInfo?.isProductionBranch ? [productionBranch] : []),
				...(repoBranchInfo?.isStagingBranch ? [stagingBranch] : []),
			].map((br) => ({
				branch: br,
				isProductionBranch: br === productionBranch,
				isStagingBranch: br === stagingBranch,
			}));
		}

		// For branches that are both staging and production branch create two different options (break it into two)
		options = options?.flatMap((opt) => {
			if (opt.isProductionBranch && opt.isStagingBranch) {
				return [
					{ branch: opt.branch, isProductionBranch: true, isStagingBranch: false },
					{ branch: opt.branch, isProductionBranch: false, isStagingBranch: true },
				];
			}

			return opt;
		});

		// Sort options based on production/staging branch
		options = options?.sort((a, b) => {
			const aIsProductionOrStaging = a.isProductionBranch || a.isStagingBranch;
			const bIsProductionOrStaging = b.isProductionBranch || b.isStagingBranch;

			if (aIsProductionOrStaging === bIsProductionOrStaging) return 0;
			return aIsProductionOrStaging ? -1 : 1;
		});

		setBranchOptions(options || []);
	}, [branches, productionBranch, stagingBranch, qualityGates, selectedQualityGate]);

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	// when a user updates a qg in overview tab the results are being mutated (new conditions matched )
	useEffect(() => {
		mutate();
	}, [qualityGates, mutate]);

	// create the information tooltip that will let the user know that
	// only metrics avaialble for lanfuage of selected repository will be shown
	const tooltip = useMemo(() => `Only metrics available for ${language} are shown!`, [language]);
	const isDotRoot = root === ".";

	return (
		<Card
			contentStyle={{
				padding: 0,
				flexGrow: "1",
			}}
			title={(
				<Typography variant="h6" sx={{ color: "common.white", m: 1 }}>
					{`${repoOwner}/${repoName}${root === "." ? "" : `/${root.replace(/^\//, "")}`}`}
					<IconButton
						component={MaterialLink}
						underline="none"
						// if no branch is selected navigate to production branch
						href={selectedBranch
							? getRepoUrl(type, { owner: repoOwner, name: repoName, root, selectedBranch: selectedBranch.branch, vcType })
							: getRepoUrl(type, { owner: repoOwner, name: repoName, root, selectedBranch: productionBranch, vcType })}
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
			tooltip={tooltip}
		>
			<Grid item xs={12} sx={{ height: "100%" }}>
				<Grid container direction="column" justifyContent="center" alignItems="center" sx={{ height: "100%" }}>
					<Grid item container direction="row" justifyContent="space-between" sx={{ marginBottom: "auto", position: "relative", pt: "1rem", pr: "1rem" }} mb={1}>
						{isDotRoot ? <Typography>&nbsp;</Typography> : (
							<Grid item sx={{ display: "flex", maxWidth: "45% !important", pr: 1 }}>
								<Tooltip placement="left" title="Root">
									<StyledChipRootButton avatar={<Folder />} label={root.replace(/^\//, "") || <Remove style={{ fontSize: "inherit" }} />} />
								</Tooltip>
							</Grid>
						)}
						<Box container flexDirection={isDotRoot ? "row" : "column"} sx={{ display: "flex", alignContent: "flex-end" }}>
							<Grid item m={1} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<Typography variant="body1">
									{"Quality Gate:"}
								&nbsp;
								</Typography>
								<Autocomplete
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
											placeholder="Select a quality gate..."
										/>
									)}
									id="quality-gate"
									options={qualityGates.map((qG) => qG.name)}
									value={selectedQualityGate.name}
									onChange={(_, e) => {
										if (e === null) {
											setSelectedQualityGate({ _id: null, name: "" });
										} else {
											setSelectedQualityGate({ _id: qualityGates.find((qG) => qG.name === e)._id, name: e });
										}

										setSelectedBranch(null);
									}}
								/>
							</Grid>
							<Grid item m={1} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<Typography variant="body1">
									{"Branch:"}
								&nbsp;
								</Typography>
								<Autocomplete
									size="small"
									disabled={selectedQualityGate._id === null}
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
									options={branchOptions}
									groupBy={(option) => (option.isProductionBranch || option.isStagingBranch ? "Production/Staging" : "Rest")}
									getOptionLabel={(option) => {
										if (option.isProductionBranch) return "Production branch";
										if (option.isStagingBranch) return "Staging branch";
										return option.branch;
									}}
									value={selectedBranch}
									onChange={(_, e) => {
										setRepoName(repoName);
										setBranchName(e || "");
										setSelectedBranch(e);
									}}
								/>
							</Grid>
						</Box>
					</Grid>
					<Grid item container direction="row" sx={{ padding: "1rem" }}>
						<Grid item direction="column" display="flex" justifyContent="center" alignItems="center" xs={4} sx={{ ">.MuiGrid-item": { maxWidth: "120%" } }}>
							{selectedBranch && selectedQualityGate && isLoading ? (
								<CircularProgress size="5rem" />
							) : (
								result.status === "passed" ? (

									<>
										<CheckCircle sx={{ fontSize: "5rem", color: theme.palette.success.main }} />
										<Typography sx={{ color: theme.palette.primary.main, fontWeight: "bold", fontSize: "1.2rem" }}>{"Passed"}</Typography>
									</>
								) : (result.status === "failed") ? (
									<>
										<Cancel sx={{ fontSize: "5rem", color: theme.palette.error.main }} />
										<Typography sx={{ color: theme.palette.primary.main, fontWeight: "bold", fontSize: "1.2rem" }}>{"Failed"}</Typography>
									</>
								) : (
									<>
										<Remove color="action" sx={{ fontSize: "5rem" }} />
										<Typography sx={{ color: theme.palette.primary.main, fontWeight: "bold", fontSize: "1.2rem", textAlign: "center" }}>{"Not Computed"}</Typography>
									</>
								)
							)}
						</Grid>
						<Grid item md={8} xs={8} direction="column">

							<Grid ref={scrollRef} item direction="column" sx={{ display: "flex", pl: "1rem", pb: "1rem", height: "10rem", overflowY: "auto" }}>
								{selectedBranch && selectedQualityGate && isLoading ? (
									<Box display="flex" margin="auto" alignContent="center">
										<CircularProgress size="5rem" />
									</Box>
								) : (
									<Box marginY="auto" display="flex" flexDirection="column">
										{
											selectedQualityGate._id === null ? (
												<Grid item display="flex" width="100%">
													<PriorityHigh style={{ color: theme.palette.red[500] }} />
													<Typography sx={{ color: theme.palette.primary.main, fontWeight: "light" }}>{"No Quality Gate selected!"}</Typography>
												</Grid>
											) : (
												selectedBranch ? (
													Object.keys(result).length > 0 ? (
														result?.testedConditions?.length === 0 ? (
															<Grid item display="flex" width="100%">
																<PriorityHigh style={{ color: theme.palette.red[500] }} />
																<Typography sx={{ color: theme.palette.primary.main, fontWeight: "light" }}>{"No matching conditions to check!"}</Typography>
															</Grid>
														) : (
															result?.testedConditions?.map((item, _id) => (
																<Grid key={_id} item display="flex" sx={{ mb: "1rem", alignItems: "center" }}>
																	{item.status === "passed" ? (
																		<Check sx={{ color: theme.palette.success.main, mr: "0.5rem" }} />
																	) : (
																		<Clear sx={{ color: theme.palette.error.main, mr: "0.5rem" }} />
																	)}
																	<Typography sx={{ color: theme.palette.primary.main, fontWeight: "light", lineHeight: "1rem" }}>
																		{`${item.condition.metric.some((name) => ["LOC", "PHPMETRICS_LOC", "ESCOMP_LOC"].includes(name))
																			? (["Python", "Java", "C#"].includes(language) ? "Class Size In Lines of Code" : "Size in Lines of Code")
																			: allMetricOptions
																				.find((obj) => obj.value.some((element) => item.condition.metric.includes(element))).label
																		}
																		${operatorOptions.find((obj) => obj.value === item.condition.operator).label}
																		${item.condition.threshold}`}
																		<Typography component="span" marginLeft="0.3rem" sx={{ color: theme.palette.secondary.main, fontWeight: "normal", display: "inline-block" }}>
																			{"(Value: "}
																			<span style={{ fontWeight: "bold" }}>
																				{typeof item?.value === "string" ? item.value : Number.parseFloat(item.value?.toFixed(2))}
																			</span>
																			{")"}
																		</Typography>
																	</Typography>
																</Grid>
															))
														)
													) : (
														<Grid item display="flex" width="100%">
															<PriorityHigh style={{ color: theme.palette.red[500] }} />
															<Typography sx={{ color: theme.palette.primary.main, fontWeight: "light" }}>{"No Result found for the selected Quality Gate! Results will be updated on new Analysis!"}</Typography>
														</Grid>
													)
												) : (
													<Grid item display="flex" width="100%">
														<PriorityHigh style={{ color: theme.palette.red[500] }} />
														<Typography sx={{ color: theme.palette.primary.main, fontWeight: "light" }}>{"No Branch selected!"}</Typography>
													</Grid>
												)
											)
										}
									</Box>
								)}
							</Grid>
							<Box display="flex" justifyContent="center" width="100%">
								{dotsNum.map((index) => (
									<Dot key={index} active={activeDot === index} />
								))}
							</Box>
						</Grid>

					</Grid>
					<Grid item container display="flex" justifyContent="flex-end" alignItems="center" sx={{ paddingBottom: "1rem", paddingRight: "1rem" }}>
						<Button
							component={Link}
							startIcon={<ExitToApp />}
							to={`/projects/${pId}/quality-analytics/${id}`}
							variant="contained"
							sx={{ "&:hover": { color: "common.white" } }}
							disabled={false}
							color="primary"
							onClick={() => { setRepoName(repoName); setBranchName(selectedBranch.branch); }}
						>
							{"overview"}
						</Button>
					</Grid>
				</Grid>
			</Grid>

		</Card>
	);
};

QualityGateStatus.propTypes = {
	pId: PropTypes.string.isRequired,
	orgId: PropTypes.string,
	repo: PropTypes.object,
	type: PropTypes.string,
	qualityGates: PropTypes.array,
	failedQualityGate: PropTypes.object,
};

export default QualityGateStatus;
