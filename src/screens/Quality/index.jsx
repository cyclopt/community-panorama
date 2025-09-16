/* eslint-disable max-len */
import { useState, useCallback, useEffect, memo, useMemo } from "react";
import { Routes, Route, Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
	Tabs,
	Tab,
	Typography,
	LinearProgress,
	Grid,
	Box,
	Link as MaterialLink,
	Autocomplete,
	Popper,
	TextField,
} from "@mui/material";
import { dequal } from "dequal";
import { shallow } from "zustand/shallow";
import {
	Commit,
	Compare,
	Equalizer,
	ErrorOutlineRounded,
	FileCopy,
	InsertDriveFile,
	Pageview,
	TrendingUp,
} from "@mui/icons-material";
import queryString from "query-string";

import useGlobalState from "../../use-global-state.js";
// * -------------------- Import components ---------------------
import ToggleSwitch from "../../components/ToggleSwitch.jsx";
// * ------------------------------------------------------------

// * -------------------- Import Quality Screens ---------------------
import QualityOverview from "./QualityOverview.jsx";
import QualityMetrics from "./QualityMetrics.jsx";
import QualityEvolution from "./QualityEvolution.jsx";
import QualityViolations from "./QualityViolations.jsx";
import QualityFiles from "./QualityFiles.jsx";
import QualityDuplicates from "./QualityDuplicates.jsx";
import QualityCompareCommits from "./QualityCompareCommits.jsx";
import QualityCommits from "./QualityCommits.jsx";
// * -----------------------------------------------------------------

import { jwt, dayjs, useDocumentTitle, constructCommitHref, sortAndPrioritizeBranches } from "#utils";
import { loadQualityMetrics, useProject, updateUserView, useUserView } from "#api";

const Quality = () => {
	const navigate = useNavigate();
	const { pathname, search } = useLocation();
	const { projectid, repoid } = useParams();
	const [type, setType] = useState(jwt.decode()?.type);
	const [state, setState] = useState({ repo: null, tableKey: "", analysis: {} });
	const [value, setValue] = useState(() => {
		for (const path of ["overview", "metrics", "evolution", "violations", "files", "duplicates", "compare", "commits"]) {
			if (pathname.includes(path)) return path;
		}

		return "overview";
	});
	const parsedQuery = useMemo(() => queryString.parse(search), [search]);
	const { repoName, branchName, setBranchName, setShowGlobalLoading, setName, setRepoName, showGlobalLoading, shortView, setShortView } = useGlobalState(
		useCallback((e) => ({
			repoName: e.repoName,
			branchName: e.branchName,
			setBranchName: e.setBranchName,
			setShowGlobalLoading: e.setShowGlobalLoading,
			setName: e.setName,
			setRepoName: e.setRepoName,
			showGlobalLoading: e.showGlobalLoading,
			shortView: e.shortView,
			setShortView: e.setShortView,
		}), []),
		shallow,
	);
	const { project = { linkedRepositories: [] }, isLoading, isError } = useProject(projectid);
	const { data: view, isLoading: isLoadingView, isError: isErrorView } = useUserView();

	// Separate branches and tags and sort branches based on their name
	// we need to seperate so we don't have dublicates groups
	const { tags, branchesAndTags } = useMemo(() => {
		if (state.repo) {
			const { branches, tags: repoTags, productionBranch } = state.repo || {};
			const filteredTags = branches?.filter((br) => repoTags?.includes(br));
			const filterBranches = branches?.filter((br) => !repoTags?.includes(br));
			const sortedBranches = sortAndPrioritizeBranches(filterBranches, productionBranch);
			const sortedTags = filteredTags?.sort() || [];
			const bAT = [...sortedBranches, ...sortedTags];
			return { tags: sortedTags, branchesAndTags: bAT };
		}

		return { tags: [], branchesAndTags: [] };
	}, [state.repo]);

	useDocumentTitle(project?.name && `${project.name} · Cyclopt`);

	useEffect(() => {
		if (isError || isErrorView) navigate(-1);
	}, [navigate, isError, isErrorView]);

	useEffect(() => {
		const repo = project.linkedRepositories.find((e) => e._id === repoid);
		const parsed = queryString.parse(search);
		if (parsed?.branch) {
			if (repo && (parsed.branch !== branchName)) {
				setBranchName(parsed.branch);
				setState((p) => ({ ...p, repo }));
			}
		} else if (repo) {
			setBranchName(repoName === repo.name
				? branchName || repo.productionBranch || repo.branches[0]
				: repo.productionBranch || repo.branches[0]);
			setState((p) => ({ ...p, repo }));
		}
	}, [branchName, project.linkedRepositories, repoName, repoid, search, setBranchName]);

	useEffect(() => {
		setValue(() => {
			for (const path of ["overview", "metrics", "evolution", "violations", "files", "duplicates", "compare", "commits"]) {
				if (pathname.includes(path)) return path;
			}

			return "overview";
		});
	}, [pathname]);

	useEffect(() => {
		if (type === "cyclopt") {
			setType(project?.projectType);
		}
	}, [project.projectType, type]);

	useEffect(() => {
		(async () => {
			try {
				if (!isLoading && state.repo && branchName) {
					setShowGlobalLoading(true);
					const analysis = await loadQualityMetrics(project._id, state.repo._id, branchName);
					if (!dequal(state, { ...state, analysis })) setState((p) => ({ ...p, analysis }));
					setName(project.name);
					setRepoName(state.repo.name);
					setShowGlobalLoading(false);
				}
			} catch {
				navigate(-1);
			}
		})();
	}, [isLoading, state.repo, branchName]); // eslint-disable-line react-hooks/exhaustive-deps

	const submitUpdateView = (async () => {
		const newShortView = !shortView; // Compute the new value before updating state

		// valid tabs for each case based on view
		// true: 	short view
		// false:	bigger picture
		const validTabs = {
			true: ["overview", "metrics", "violations", "files", "duplicates", "compare", "commits", "evolution"],
			false: ["overview", "commits", "evolution"],
		};

		setShortView(newShortView);
		const updatedQueryParams = { ...parsedQuery };
		await updateUserView(newShortView);

		// if a tab is in both views keep it as it is
		if (validTabs[newShortView]?.some((tab) => pathname.includes(tab)) && validTabs[!newShortView]?.some((tab) => pathname.includes(tab))) {
			const updatedUrl = queryString.stringifyUrl({
				url: pathname,
				query: updatedQueryParams,
			});
			navigate(updatedUrl);
		} else if (!validTabs[newShortView].includes(pathname)) { 	// If the current tab is not valid in the new view, navigate to a default one
			const updatedUrl = queryString.stringifyUrl({
				url: validTabs[newShortView][0],
			});
			navigate(updatedUrl, { replace: true });
		}
	});

	useEffect(() => {
		const newView = view === "short";
		if (!isLoadingView) setShortView(newView);
	}, [isLoadingView, setShortView, view]);

	if (!state.repo) return (<LinearProgress color="primary" />);

	return (
		<>
			{showGlobalLoading && (<LinearProgress color="primary" />)}
			<section style={{ paddingTop: "1rem" }}>
				<div className="container">
					{state.repo && (
						<Grid container direction="row" alignItems="center" justifyContent="space-between">
							<Typography variant="h4">
								{`${state.repo.name}${(state.repo.root === ".") ? "" : `/${state.repo.root.replace(/^\//, "")}`}`}
							</Typography>
							<Grid item display="flex" alignItems="center" justifyContent="center">
								<ToggleSwitch
									isSwitchEnabled={!shortView}
									isSwitchDisabled={showGlobalLoading}
									enableText="Bigger Picture"
									disableText="Short View"
									handleToggle={async () => { await submitUpdateView(); }}
								/>
							</Grid>
						</Grid>
					)}
				</div>
			</section>
			<div className="container" style={{ flexGrow: "0", margin: "0 auto" }}>
				<Grid container direction="row" alignItems="flex-end">
					<Grid item xs={12} md={12} lg={8} sx={{ borderBottom: 1, borderColor: "divider" }}>
						<Tabs value={value} variant="scrollable" onChange={(_, newValue) => setValue(newValue)}>
							<Tab
								label="overview"
								value="overview"
								to="overview"
								component={Link}
								icon={<Pageview />}
							/>
							{ !shortView
								&& (
									<Tab
										label="metrics"
										value="metrics"
										to="metrics"
										component={Link}
										icon={<Equalizer />}
									/>
								)}
							{ !shortView
								&& (
									<Tab
										label="violations"
										value="violations"
										to="violations"
										component={Link}
										icon={<ErrorOutlineRounded />}
									/>
								)}
							{ !shortView
								&& (
									<Tab
										label="files"
										value="files"
										to="files"
										component={Link}
										icon={<InsertDriveFile />}
									/>
								)}
							{ !shortView
								&& (
									<Tab
										label="duplicates"
										value="duplicates"
										to="duplicates"
										component={Link}
										icon={<FileCopy />}
									/>
								)}
							{ !shortView
								&& (
									<Tab
										label="compare"
										value="compare"
										to="compare"
										component={Link}
										icon={<Compare />}
									/>
								)}
							<Tab
								label="commits"
								value="commits"
								to="commits"
								component={Link}
								icon={<Commit />}
							/>
							<Tab
								label="evolution"
								value="evolution"
								to="evolution"
								component={Link}
								icon={<TrendingUp />}
							/>
						</Tabs>
					</Grid>
					<Grid item container sx={{ p: 1, bgcolor: "grey.light", borderRadius: 1 }} xs={12} md={12} lg={4}>
						<Grid item xs={12} md={12} lg={6} display="flex">
							<Grid container direction="row" justifyContent="center" alignItems="center">
								<Grid item xs={4}>
									<Typography variant="h6" color="primary">{"Branch"}</Typography>
								</Grid>
								<Grid item xs={8}>
									<Autocomplete
										disableClearable
										size="small"
										sx={{
											minWidth: "10rem",
											bgcolor: "white",
											borderRadius: 1,
										}}
										groupBy={(option) => (tags.includes(option) ? "Tags" : "Branches")}
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
										options={branchesAndTags}
										value={branchName}
										onChange={(_, e) => {
											const parsed = queryString.parse(search);
											parsed.branch = e || "";
											navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
											setBranchName(e || "");
										}}
									/>
								</Grid>
							</Grid>
						</Grid>
						<Grid item xs={12} md={12} lg={6}>
							<Box sx={{ alignItems: "center", justifyContent: "center", textAlign: "right" }}>
								{state.analysis?.commit?.hash && (
									<Typography variant="h6" style={{ display: "inline-flex" }}>
										{"Commit: "}
										&nbsp;
										<MaterialLink
											underline="none"
											href={constructCommitHref(type, state.repo, state.analysis.commit.hash)}
											target="_blank"
											rel="noopener noreferrer"
										>
											<Typography variant="h6" style={{ display: "inline-flex" }}>{state.analysis.commit.hash.slice(0, 7)}</Typography>
										</MaterialLink>
									</Typography>
								)}
								{state.analysis.updatedAt && (
									<>
										<Typography variant="body2" style={{ display: "inline-flex" }}>
											{"Latest Analysis:"}
											&nbsp;
										</Typography>
										<Typography color="primary" variant="body2" style={{ display: "inline-flex" }}>
											{dayjs(state.analysis.updatedAt).fromNow()}
										</Typography>
									</>
								)}
							</Box>
						</Grid>
					</Grid>
				</Grid>
			</div>
			<section style={{ padding: "2rem" }}>
				<div className="container">
					<Routes>
						<Route
							index
							path="overview?"
							element={<QualityOverview analysis={state.analysis} projectId={project._id} repositoryId={state.repo._id} />}
						/>
						<Route
							path="metrics"
							element={<QualityMetrics analysis={state.analysis} enableTaskButton={project?.analytics?.project ?? true} />}
						/>
						<Route
							path="evolution"
							element={<QualityEvolution projectId={project._id} repositoryId={state.repo._id} />}
						/>
						<Route
							path="violations"
							element={<QualityViolations analysis={state.analysis} projectId={project._id} repositoryId={state.repo._id}/* enableTaskButton={project?.analytics?.project ?? true} */ />}
						/>
						<Route
							path="files"
							element={<QualityFiles analysis={state.analysis} projectId={project._id} repositoryId={state.repo._id} />}
						/>
						<Route
							path="files/:filename"
							element={<QualityFiles analysis={state.analysis} projectId={project._id} repositoryId={state.repo._id} />}
						/>
						<Route
							path="duplicates"
							element={<QualityDuplicates analysis={state.analysis} projectId={project._id} repositoryId={state.repo._id} />}
						/>
						<Route
							path="compare"
							element={<QualityCompareCommits projectId={project._id} repositoryId={state.repo._id} />}
						/>
						<Route
							path="commits"
							element={<QualityCommits projectId={project._id} repository={state.repo} />}
						/>
					</Routes>
				</div>
			</section>
		</>
	);
};

export default memo(Quality);
