import PropTypes from "prop-types";
import { useState, Suspense, useRef, useEffect } from "react";
import { Button, ButtonGroup, Box, Popper, Fade, ClickAwayListener, MenuItem, MenuList, Grid, Typography, CircularProgress, Divider, Paper, Avatar } from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import LinearProgress from "@mui/material/LinearProgress";
import copy from "copy-text-to-clipboard";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

import { useProjectSubscription } from "../api/index.js";
import CycloptGptImage from "../assets/images/ai_logo.png";
import { useSnackbar, POSSIBLE_LANGUAGES } from "../utils/index.js";

import BaseMarkdownViewer from "./BaseMarkdownViewer.jsx";
import Modal from "./Modal.jsx";

import { useChatGptStream } from "#customHooks";

const CycloptGpt = ({ isLoading, setIsLoading, selectedLines, code, projectId, repositoryId, filePath, hash, language }) => {
	const { subscription = {}, isLoading: isLoadingSubscription, mutate } = useProjectSubscription(projectId);
	const [showCopyButton, setShowCopyButton] = useState(false);
	const [spin, setSpin] = useState(true);
	const [loadingNewAnswer, setLoadingNewAnswer] = useState(false);
	const [currentAction, setCurrentAction] = useState("");
	const [anchorEl, setAnchorEl] = useState(null);
	const [showActions, setShowActions] = useState(false);
	const { success, error } = useSnackbar();
	const availableTokens = subscription?.chatgpt?.tokens;
	const [streamProps, setStreamProps] = useState({});
	const [isUserScrolling, setIsUserScrolling] = useState(false);
	const markdownViewerRef = useRef(null);
	const { response, isLoading: isLoadingGpt } = useChatGptStream(streamProps, setIsUserScrolling);

	const handleUserScrollStart = () => {
		setIsUserScrolling(true);
	};

	useEffect(() => {
		if (isLoadingGpt) {
			window.addEventListener("scroll", handleUserScrollStart);
			window.addEventListener("wheel", handleUserScrollStart);
			window.addEventListener("touchmove", handleUserScrollStart);
		} else {
			window.removeEventListener("scroll", handleUserScrollStart);
			window.removeEventListener("wheel", handleUserScrollStart);
			window.removeEventListener("touchmove", handleUserScrollStart);
		}

		return () => {
			window.removeEventListener("scroll", handleUserScrollStart);
			window.removeEventListener("wheel", handleUserScrollStart);
			window.removeEventListener("touchmove", handleUserScrollStart);
		};
	}, [isLoadingGpt, isUserScrolling]);

	useEffect(() => {
		if (markdownViewerRef.current && !isUserScrolling) {
			markdownViewerRef.current.scrollIntoView({ behavior: "instant", block: "end" });
		}
	}, [isLoadingGpt, isUserScrolling, response, markdownViewerRef]);

	const handleOptionClick = (action) => {
		try {
			setIsLoading(true);
			setShowActions(true);
			setSpin(true);
			setStreamProps(
				{
					url: `api/panorama/extensions/${projectId}/repositories/${repositoryId}/chat-gpt/file/recommendations`,
					query: { filename: filePath, hash, code, action, language, lines: selectedLines, shouldFetchNew: false },
				},
			);
		} catch {
			setStreamProps({});
		}

		mutate();
		setShowActions(false);
		setSpin(false);
		setIsLoading(false);
	};

	const handleReAskClick = (action) => {
		try {
			setLoadingNewAnswer(true);
			setStreamProps(
				{
					url: `api/panorama/extensions/${projectId}/repositories/${repositoryId}/chat-gpt/file/recommendations`,
					query: { filename: filePath, hash, code, action, language, lines: selectedLines, shouldFetchNew: true },
				},
			);
			mutate();
		} catch {
			setStreamProps({});
		}

		setLoadingNewAnswer(false);
	};

	return (
		<Grid hidden={isLoadingSubscription}>
			<Modal
				keepMounted
				disableAreYouSureDialog
				open={!isLoading && response && Boolean(response?.sampleCode)}
				title="Proposed Answer"
				onClose={() => { setStreamProps({}); setShowCopyButton(false); }}
			>
				<Suspense fallback={<div style={{ display: "flex", justifyContent: "center" }}><CircularProgress color="secondary" /></div>}>
					<Box m={1} mb={2} display="flex" justifyContent="flex-end">
						<Box display="flex" p={1} sx={{ border: 1, borderRadius: 1 }}>
							<Box mx={0.5} display="flex" flexDirection="column">
								<Typography textAlign="left" variant="subtitle1">{"Consumed Tokens:"}</Typography>
								<Typography textAlign="left" variant="subtitle1">{"Available Tokens:"}</Typography>
							</Box>
							<Box mx={0.5} display="flex" flexDirection="column">
								<Typography textAlign="right" variant="subtitle1">{response?.usage?.consumedTokens}</Typography>
								<Typography textAlign="right" variant="subtitle1">
									{
										(response?.usage?.previousTokens && response?.usage?.consumedTokens)
											? response.usage.previousTokens - response.usage.consumedTokens
											: 0
									}
								</Typography>
							</Box>
						</Box>
					</Box>
					<Box m={1} mb={2}><BaseMarkdownViewer content={`***Sample Code:***\n\n ${`\`\`\`${response?.language}\n${response?.sampleCode}\n\`\`\``}`} /></Box>
					<Box ref={markdownViewerRef} m={1} my={2} sx={{ position: "relative" }}>
						<BaseMarkdownViewer
							content={`***${response?.action === "comments" ? "Documented Code" : "Explanation"}:***\n\n${response?.recommendation}`}
						/>
						<ButtonGroup
							variant="contained"
							aria-label="outlined button group"
							sx={{
								position: "absolute",
								top: 21,
								right: 0,
							}}
						>
							{showCopyButton && (
								<LoadingButton
									id="chatgpt-response"
									loading={loadingNewAnswer}
									size="small"
									onClick={() => {
										try {
											const regexPattern = new RegExp(`\`\`\`(?:${[...POSSIBLE_LANGUAGES].map((lan) => lan.toLowerCase()).join("|")})([\\s\\S]*?)\`\`\``);
											const textToCopy = response.recommendation.match(regexPattern);
											copy(textToCopy[1], { target: document.querySelector("#chatgpt-response") });
											success("Code Copied");
										} catch {
											try {
												copy(response.recommendation, { target: document.querySelector("#chatgpt-response") });
												success("Code Copied");
											} catch {
												error();
											}
										}
									}}
								>
									<ContentCopyIcon />
								</LoadingButton>
							)}
							<LoadingButton disabled={currentAction === ""} loading={loadingNewAnswer} size="small" sx={{ height: "fit-content" }} onClick={() => handleReAskClick(currentAction)}>
								<RefreshIcon />
							</LoadingButton>
						</ButtonGroup>
						{loadingNewAnswer && <LinearProgress />}
						{ isUserScrolling
							&& (
								<Avatar
									sx={{
										position: "fixed",
										bottom: 10,
										right: "50%",
										backgroundColor: "rgba(255, 255, 255, 0.6)",
									}}
									disabled={currentAction === ""}
									loading={loadingNewAnswer}
									size="small"
									onClick={() => setIsUserScrolling(false)}
								>
									<LoadingButton
										disableRipple
										sx={{
											backgroundColor: "transparent",
											"&.MuiButtonBase-root:hover": {
												backgroundColor: "transparent",
											},
										}}
									>

										<ArrowDownwardIcon />
									</LoadingButton>
								</Avatar>
							)}
					</Box>
				</Suspense>
			</Modal>
			<ClickAwayListener onClickAway={() => { setAnchorEl(null); setShowActions(false); setSpin(false); }}>
				<Box>
					<Popper
						transition
						open={(showActions || isLoading)}
						anchorEl={anchorEl}
						placement="left"
						modifiers={[
							{
								name: "offset",
								options: {
									offset: [0, 15],
								},
							},
						]}
					>
						{({ TransitionProps }) => (
							<Fade {...TransitionProps} timeout={350}>
								<Paper elevation={2}>
									{isLoading ? (
										<Box
											display="flex"
											alignItems="center"
											justifyContent="center"
											sx={{
												borderRadius: 1,
												width: "7rem",
												height: "3rem",
											}}
										>
											<CircularProgress />
										</Box>
									) : (
										<Box>
											{availableTokens > 0
												? (
													<MenuList sx={{ backgroundColor: "white", borderRadius: 1, display: "flex", flexDirection: "column" }}>
														<MenuItem onClick={async () => { await handleOptionClick("comments"); setCurrentAction("comments"); setShowCopyButton(true); }}>
															{"Generate Comments"}
														</MenuItem>
														<Divider width="90%" sx={{ alignSelf: "center" }} />
														<MenuItem onClick={async () => { await handleOptionClick("explain"); setCurrentAction("explain"); }}>
															{"Explain Code"}
														</MenuItem>
													</MenuList>
												) : (
													<MenuList sx={{ backgroundColor: "white", borderRadius: 1, display: "flex", flexDirection: "column" }}>
														<MenuItem sx={{ "&:hover": { bgcolor: "white" } }}>{`You have ${availableTokens} tokens. You need to purchase more`}</MenuItem>
													</MenuList>
												)}
										</Box>
									)}
								</Paper>
							</Fade>
						)}
					</Popper>
					<Box
						sx={{
							visibility: selectedLines ? "visible" : "hidden",
							opacity: selectedLines ? 1 : 0,
							width: "4rem",
							height: "4rem",
							position: "absolute",
							right: "-2rem",
							top: `${((selectedLines ? Math.ceil((selectedLines.to + selectedLines.from) / 2) : 0) * 1.4) - 3}rem`,
							zIndex: 999,
							transition: "all 500ms",
							borderRadius: "100%",
						}}
					>
						<Box
							sx={{
								position: "absolute",
								borderRadius: "100%",
								width: "100%",
								height: "100%",
								backgroundImage: "linear-gradient(#3fb2e8, #eb1770)",
								filter: "blur(2px)",
								...((spin || isLoading) && {
									animation: "rotate linear 1.5s infinite",
								}),
							}}
						/>
						<Button
							size="small"
							variant="text"
							sx={{
								margin: "auto",
								borderRadius: "100%",
								minWidth: "0",
								padding: "4px",
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
							}}
							onClick={(e) => {
								setAnchorEl(e.currentTarget);
								setShowActions((p) => !p);
								setSpin((p) => !p);
							}}
						>
							<img src={CycloptGptImage} style={{ width: "100%", height: "100%" }} alt="cyclopt-gpt" />
						</Button>
					</Box>
				</Box>
			</ClickAwayListener>
		</Grid>
	);
};

CycloptGpt.propTypes = {
	isLoading: PropTypes.bool,
	setIsLoading: PropTypes.func,
	selectedLines: PropTypes.object,
	code: PropTypes.string,
	projectId: PropTypes.string,
	repositoryId: PropTypes.string,
	filePath: PropTypes.string,
	hash: PropTypes.string,
	language: PropTypes.string,
};

export default CycloptGpt;
