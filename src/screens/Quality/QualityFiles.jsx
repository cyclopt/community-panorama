import { useState, useCallback, useEffect, memo, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import {
	Typography,
	Button,
	Grid,
	Box,
	LinearProgress,
	MenuItem,
	Link as MaterialLink,
	Fade,
} from "@mui/material";
import { LocalFireDepartment, Reply } from "@mui/icons-material";
import queryString from "query-string";
import { dequal } from "dequal";
import Cycled from "cycled";
import { numberSmallToLarge } from "@iamnapo/sort";

import useGlobalState from "../../use-global-state.js";
import CodeViewer from "../../components/CodeViewer.jsx";
import CodeViewerNavButtons from "../../components/CodeViewerNavButtons.jsx";
import DataTable from "../../components/DataTable.jsx";
import Select from "../../components/Select.jsx";
import Tooltip from "../../components/Tooltip.jsx";
import BorderBox from "../../components/BorderBox.jsx";
import { useSnackbar, metricsInfo } from "../../utils/index.js";
import { loadFileContent, loadFilesMetrics } from "../../api/index.js";
import CycloptGptImage from "../../assets/images/ai_assistant_button.png";

const QualityFiles = (props) => {
	const { analysis, repositoryId, projectId } = props;
	const navigate = useNavigate();
	const { filename } = useParams();
	const { search, pathname } = useLocation();
	const [doneFetching, setDoneFetching] = useState(false);
	const [data, setData] = useState([]);
	const [fileViolations, setFileViolations] = useState({});
	const [fileContent, setFileContent] = useState("");
	const [filteredMetric, setFilteredMetric] = useState();
	const [showCycloptButton, setShowCycloptButton] = useState(true);
	const { error } = useSnackbar();
	const setFileName = useGlobalState(useCallback((e) => e.setFileName, []));
	const metricTypes = useMemo(() => (metricsInfo[analysis.language?.toLowerCase()] || metricsInfo.default)
		.map(({ metric, title, howToFix }) => ({ value: metric, label: title, howToFix })), [analysis.language]);
	const filePath = filename && decodeURIComponent(filename);
	const editorRef = useRef(null);

	const diagnostics = useMemo(() => {
		const problems = fileViolations[filePath] || [];
		return new Cycled(problems.filter((e) => {
			if (filteredMetric) return e.violation === filteredMetric.value;
			return e.cat === "metrics";
		}).sort(numberSmallToLarge((v) => v.line)));
	}, [filePath, fileViolations, filteredMetric]);

	const getAnnotations = useCallback((view) => (
		fileContent === "You don’t have permission to view this file."
			? []
			: [...diagnostics].map(({ explanation, line, severity, violation }) => ({
				message: explanation ? `${explanation}.` : metricTypes.find((e) => e.value === violation)?.howToFix,
				severity: severity === "Critical" ? "error" : "warning",
				from: view.state.doc.line(line).from,
				to: view.state.doc.line(line).to,
			}))), [diagnostics, fileContent, metricTypes]);

	useEffect(() => {
		(async () => {
			if (filePath && analysis.commit?.hash) {
				try {
					setFileName(filePath);
					setFileContent("");
					const { content } = await loadFileContent(projectId, repositoryId, filePath, analysis.commit?.hash);
					setFileContent(content);
				} catch {
					error();
				}
			}
		})();
	}, [filePath, projectId, repositoryId, analysis, setFileName, error]);

	useEffect(() => {
		const { metricType } = queryString.parse(search);
		const mType = metricTypes.find((e) => e.label === metricType);

		if (mType) {
			setFilteredMetric(mType);
		} else {
			setFilteredMetric(null);
		}
	}, [JSON.stringify(analysis), metricTypes, search]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		(async () => {
			try {
				if (analysis && analysis.internalId) {
					setDoneFetching(false);
					const metrics = await loadFilesMetrics(analysis._id);
					const files = [];
					for (const [name, fileMetrics] of Object.entries(metrics)) files.push({ name, ...fileMetrics });
					if (!dequal(data, files)) setData(files);
					const fileInfo = {};
					for (const { name } of files) {
						fileInfo[name] = [];
						for (const [key, metric] of Object.entries(analysis.metricsRecommendations)) {
							for (const violation of metric.files.filter((e) => e.filePath === name)) {
								fileInfo[name].push({
									violation: key,
									line: violation.line,
									value: violation.value,
									category: metric.category,
									explanation: metric.explanation,
									cat: "metrics",
								});
							}
						}

						for (const [key, metric] of Object.entries(analysis.violationsInfo.violations)) {
							for (const violation of metric.files.filter((e) => e.filePath === name)) {
								fileInfo[name].push({
									violation: key,
									line: violation.line,
									value: 1,
									category: metric.category,
									explanation: metric.explanation,
									severity: metric.severity,
									title: metric.title,
									cat: "violations",
								});
							}
						}
					}

					if (!dequal(fileViolations, fileInfo)) setFileViolations(fileInfo);
					setDoneFetching(true);
				}
			} catch {
				navigate(-1);
			}
		})();
	}, [JSON.stringify(analysis)]); // eslint-disable-line react-hooks/exhaustive-deps

	const metricTableColumns = useMemo(() => {
		const columns = [
			{
				field: "Hot",
				width: 80,
				valueGetter: ({ row }) => Boolean(analysis.fileChangesUntilNow.find((el) => row.name.endsWith(el[0]))?.[1]),
				renderHeader: () => <Typography variant="h6" display="flex"><LocalFireDepartment /></Typography>,
				renderCell: ({ value }) => (value ? (
					<Box sx={{ ml: 1, alignItems: "center", display: "flex" }}>
						<Tooltip title="Active file! Top 10% of files changed in the last 30 commits.">
							<LocalFireDepartment sx={{ color: "red.500" }} />
						</Tooltip>
					</Box>
				) : ""),
			},
			{
				field: "File Name",
				minWidth: 180,
				flex: 1,
				align: "left",
				valueGetter: ({ row }) => row.name,
				renderCell: ({ value }) => (
					<MaterialLink
						variant="body1"
						underline="none"
						component={Link}
						sx={{ overflow: "auto" }}
						to={queryString.stringifyUrl({ url: `${encodeURIComponent(value)}/`, query: queryString.parse(search) })}
					>
						{value}
					</MaterialLink>
				),
			},
		];
		if (filteredMetric) {
			columns.push({
				field: filteredMetric.label,
				minWidth: 250,
				flex: 1,
				renderHeader: () => (
					<div>
						<Typography variant="h6" fontWeight="bold" whiteSpace="normal" align="center">
							{filteredMetric.label}
						</Typography>
						<Typography variant="h6" fontWeight="bold" whiteSpace="normal" align="center">
							{"(File Average)"}
						</Typography>
					</div>
				),
				valueGetter: ({ row }) => Number(row[filteredMetric.value] || 0).toFixed(2),
				type: "number",
			});
		}

		return columns;
	}, [analysis.fileChangesUntilNow, filteredMetric, search]);

	return (
		<>
			<Grid container>
				<Grid item xs={12}>
					<Grid container direction="row" justifyContent="space-between" alignItems="center" sx={{ "> .MuiGrid-item": { mb: 3, px: 1 } }}>
						<Grid item display="flex" md={6} xs={12} m={-1} sx={{ justifyContent: { xs: "center", md: "flex-start" } }}/* hidden={tabValue !== 1} */>
							<Grid item style={{ display: "flex", alignItems: "start" }} mr={1}>
								<Typography variant="h6" color="primary" sx={{ textAlign: "center" }}>{"Review Audits Regarding:"}</Typography>
							</Grid>
							<Grid item xs={6}>
								<Select
									id="metricType"
									value={filteredMetric?.value || ""}
									onChange={(e) => {
										const metric = metricTypes.find((el) => el.value === e.target.value);
										setFilteredMetric(metric);
										const parsed = queryString.parse(search);
										parsed.metricType = metric?.label || null;
										parsed.violationType = undefined;
										navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
									}}
								>
									<MenuItem value="">{"All"}</MenuItem>
									{metricTypes.map((e, ind) => <MenuItem key={`${e.value}_${ind}`} value={e.value}>{e.label}</MenuItem>)}
								</Select>
							</Grid>
						</Grid>
					</Grid>
				</Grid>
			</Grid>
			<Grid item container direction="column" justifyContent="flex-start">
				<Grid item hidden={!filePath}>
					<Button
						variant="contained"
						size="medium"
						sx={{ justifySelf: "flex-start", "&:hover": { color: "common.white" } }}
						startIcon={<Reply />}
						onClick={() => navigate(-1)}
					>
						{"back to all files"}
					</Button>
				</Grid>
				<Grid item hidden={!filePath} sx={{ display: "flex", justifyContent: "space-between" }}>
					<Grid item display="flex" alignItems="center">
						<Typography style={{ display: "inline-flex" }}>
							{"File:"}
							&nbsp;
						</Typography>
						<Typography color="primary" style={{ display: "inline-flex" }}>
							{filePath}
						</Typography>
					</Grid>
					<Tooltip title="Hightlight part of your code and explore Cyclopt AI Assistant's possibilities">
						<Fade
							in={filePath && showCycloptButton}
							timeout={{ appear: 500, enter: 2500, exit: 500 }}
						>
							<Grid item>
								<img src={CycloptGptImage} style={{ width: "14rem" }} alt="cyclopt-gpt" />
							</Grid>
						</Fade>
					</Tooltip>
				</Grid>
				<Grid item hidden={!filePath} style={{ zIndex: 0, maxWidth: "100%" }}>
					{fileContent ? (
						<BorderBox sx={{ p: 0 }}>
							<CodeViewer
								ref={editorRef}
								renderChatGpt
								value={fileContent}
								getAnnotations={getAnnotations}
								language={(analysis.language || "Java").toLowerCase()}
								projectId={projectId}
								repositoryId={repositoryId}
								filePath={filePath}
								hash={analysis.commit?.hash}
								setShowButton={setShowCycloptButton}
							/>
							<CodeViewerNavButtons diagnostics={diagnostics} editorRef={editorRef} />
						</BorderBox>
					) : (
						<LinearProgress color="primary" />
					)}
				</Grid>
			</Grid>
			<Grid item xs={12}>
				{!filePath && (
					<DataTable
						tableName="metricsTable"
						rows={filteredMetric
							? data.filter((e) => (fileViolations[e.name] || []).some((el) => el.violation === filteredMetric.value))
							: data}
						loading={!doneFetching}
						columns={metricTableColumns}
						getRowId={(e) => e.name}
						initialState={{ pagination: { paginationModel: { page: 0 } } }}
					/>
				)}
			</Grid>
		</>
	);
};

QualityFiles.propTypes = {
	projectId: PropTypes.string.isRequired,
	repositoryId: PropTypes.string.isRequired,
	analysis: PropTypes.object.isRequired,
};

export default memo(QualityFiles);
