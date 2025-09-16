import { useEffect, memo, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import queryString from "query-string";
import { shallow } from "zustand/shallow";
import { Grid, Typography, Chip, Switch, MenuItem, LinearProgress, ListSubheader, Fade } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Warning } from "@mui/icons-material";
import { dequal } from "dequal";
import Cycled from "cycled";
import { numberSmallToLarge } from "@iamnapo/sort";

import useGlobalState from "../../use-global-state.js";
import Tooltip from "../../components/Tooltip.jsx";
import Select from "../../components/Select.jsx";
import GeneralInfoTile from "../../components/GeneralInfoTile.jsx";
import ViolationsTables from "../../components/ViolationsTables.jsx";
import CodeViewer from "../../components/CodeViewer.jsx";
import CodeViewerNavButtons from "../../components/CodeViewerNavButtons.jsx";
import BorderBox from "../../components/BorderBox.jsx";
import BackToFilesButton from "../../components/BackToFilesButton.jsx";
import CycloptGptImage from "../../assets/images/ai_assistant_button.png";

import { POSSIBLE_VIOLATIONS_SEVERITY, capitalize } from "#utils";
import { useFileContent } from "#api";

const filterViolations = (sectionValue, qualityViolations, filteredViolation) => {
	// 1. Category Filter
	if (qualityViolations.Category && sectionValue.category !== qualityViolations.Category) return [];
	// 2. Severity Filter
	if (!qualityViolations[sectionValue.severity]) return [];
	// 3. Specific Violation Filter
	if (filteredViolation?.value && sectionValue.title !== filteredViolation.value) return [];
	return sectionValue;
};

const filterViolationsStats = (sectionValue, qualityViolations) => Object.fromEntries(
	Object.entries(sectionValue).filter(([key]) => qualityViolations[key]),
);

const QualityViolations = (props) => {
	const { analysis, repositoryId, projectId } = props;
	const hash = analysis?.repositoryInfo?.hash || "";
	const language = analysis?.language || "";
	const theme = useTheme();
	const navigate = useNavigate();
	const { search, pathname } = useLocation();
	const [fileName, setFileName] = useState(null);
	const filePath = fileName && decodeURIComponent(fileName);
	const [filteredViolation, setFilteredViolation] = useState();
	const { fileContent = "" } = useFileContent(projectId, repositoryId, filePath, hash);
	const editorRef = useRef(null);
	const [showCycloptButton, setShowCycloptButton] = useState(true);

	const violationsColorIcons = {
		Critical: theme.palette.red[900],
		Major: theme.palette.deepOrange[300],
		Minor: theme.palette.yellow[700],
	};

	const { showGlobalLoading, qualityViolations, setQualityViolations } = useGlobalState(useCallback((e) => ({
		showGlobalLoading: e.showGlobalLoading,
		qualityViolations: e.qualityViolations,
		setQualityViolations: e.setQualityViolations,
	}), []), shallow);

	// Apply filtering based on qualityViolations and filteredViolation
	const filteredViolationsInfo = useMemo(() => (
		{
			violations: Object.fromEntries(
				Object.entries(analysis?.violationsInfo?.violations || {}).map(([sectionKey, sectionValue]) => {
					if (typeof sectionValue === "object" && sectionValue !== null) {
						return [sectionKey, filterViolations(sectionValue, qualityViolations, filteredViolation)];
					}

					return [sectionKey, sectionValue];
				}),
			),
			violationsStats: Object.fromEntries(
				Object.entries(analysis?.violationsInfo?.generalStats || {}).map(([sectionKey, sectionValue]) => {
					if (typeof sectionValue === "object" && sectionValue !== null) {
						return [sectionKey, filterViolationsStats(sectionValue, qualityViolations)];
					}

					return [sectionKey, sectionValue];
				}),
			),
		}
	), [analysis?.violationsInfo?.violations, analysis?.violationsInfo?.generalStats, qualityViolations, filteredViolation]);

	useEffect(() => {
		const tempQualityViolations = { ...qualityViolations };
		const parsed = queryString.parse(search);
		const vType = Object.keys(analysis?.violationsInfo?.generalStats || {}).find((e) => e === parsed?.category);
		tempQualityViolations.Category = vType || "";

		if (parsed?.critical == null) {
			parsed.critical = tempQualityViolations.Critical;
		} else if ((parsed?.critical === "false") && tempQualityViolations?.Critical) {
			tempQualityViolations.Critical = false;
		}

		if (parsed?.major == null) {
			parsed.major = tempQualityViolations.Major;
		} else if ((parsed?.major === "false") && tempQualityViolations?.Major) {
			tempQualityViolations.Major = false;
		}

		if (parsed?.minor == null) {
			parsed.minor = tempQualityViolations.Minor;
		} else if ((parsed?.minor === "false") && tempQualityViolations?.Minor) {
			tempQualityViolations.Minor = false;
		}

		if (parsed?.category == null) {
			parsed.category = tempQualityViolations.Category;
		}

		if (!dequal(tempQualityViolations, qualityViolations)) setQualityViolations({ ...tempQualityViolations });
		navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
	}, [analysis?.violationsInfo?.generalStats, search, setQualityViolations, qualityViolations, navigate, pathname]);

	const violationOptions = useMemo(() => {
		const uniqueCategories = [...new Set(Object.values(filteredViolationsInfo?.violations).map((e) => e.category))];
		return uniqueCategories.filter(Boolean).map((el) => ({
			label: el,
			options: Object.values(filteredViolationsInfo.violations)
				.filter((value) => value.category === el)
				.map((ele) => ({ label: ele.title, value: ele.title })),
		}));
	}, [filteredViolationsInfo?.violations]);

	const renderedOptions = useMemo(() => violationOptions.flatMap((category) => [
		<ListSubheader key={`subheader_${category.label}`}>{category.label}</ListSubheader>,
		...category.options.map((option) => {
			const violation = Object.values(filteredViolationsInfo?.violations).find((e) => e.title === option.value);
			const validFilePaths = Array.isArray(violation?.files) ? violation.files : [];
			return (
				<MenuItem
					key={`${category.label}_${option.value}`}
					value={option.value}
					disabled={filePath && !(validFilePaths.some((f) => f.filePath === filePath))}
				>
					<Typography sx={{ display: "flex", alignItems: "center" }}>
						<Warning
							titleAccess={violation?.severity}
							sx={{
								color: violation?.severity === "Critical"
									? theme.palette.red[900]
									: violation?.severity === "Major"
										? theme.palette.deepOrange[300]
										: theme.palette.yellow[700],
							}}
						/>
							&nbsp;
						{option.label}
					</Typography>
				</MenuItem>
			);
		}),
	]), [violationOptions, filteredViolationsInfo?.violations, filePath,
		theme.palette.red, theme.palette.deepOrange, theme.palette.yellow]);

	const violationsSumUp = useMemo(() => {
		const { generalStats = {} } = analysis?.violationsInfo || {};
		if (Object.keys(generalStats).length > 0) {
			// Initialize the accumulator with default values
			const { tempCritical, tempMajor, tempMinor } = Object.values(generalStats).reduce(
				(acc, value) => {
					for (const [key, val] of Object.entries(value)) {
						if (key === "Critical") acc.tempCritical += val;
						if (key === "Major") acc.tempMajor += val;
						if (key === "Minor") acc.tempMinor += val;
					}

					return acc;
				},
				{ tempCritical: 0, tempMajor: 0, tempMinor: 0 },
			);

			return {
				Critical: tempCritical,
				Major: tempMajor,
				Minor: tempMinor,
				Total: tempCritical + tempMajor + tempMinor,
			};
		}

		return { Critical: 0, Major: 0, Minor: 0, Total: 0 }; // Default return if no stats
	}, [analysis?.violationsInfo]);

	useEffect(() => {
		const { violationType, fileName: fN } = queryString.parse(search);
		const vType = Object.values(filteredViolationsInfo?.violations).find((e) => e.title === violationType);

		if (vType) {
			if (filteredViolation?.value !== vType.title) setFilteredViolation({ label: vType.title, value: vType.title });
		} else {
			setFilteredViolation(null);
		}

		if (fN) setFileName(fN);
		else setFileName(null);
	}, [filteredViolation?.value, filteredViolationsInfo?.violations, search]);

	const diagnostics = useMemo(() => {
		const problems = [];

		if (filteredViolationsInfo.violations) {
			const current = Object.entries(filteredViolationsInfo.violations);

			for (const [key, metric] of current) {
				if (typeof metric === "object" && Object.keys(metric).length > 0) {
					for (const violation of metric.files.filter(
						(e) => e.filePath === filePath,
					)) {
						problems.push({
							violation: key,
							line: violation.line,
							value: 1,
							category: metric.category,
							explanation: metric.explanation,
							severity: metric.severity,
							title: metric.title,
							cat: "violations",
							status: "current",
						});
					}
				}
			}
		}

		return new Cycled(problems.sort(numberSmallToLarge((v) => v.line)));
	}, [filteredViolationsInfo.violations, filePath]);

	const getAnnotations = useCallback(
		(view) => [...diagnostics].map(({ explanation, line, severity }) => ({
			message: explanation,
			severity: severity === "Critical" ? "error" : "warning",
			from: view.state.doc.line(line).from,
			to: view.state.doc.line(line).to,
		})),
		[diagnostics],
	);

	return (
		<Grid container direction="row" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
			{(!showGlobalLoading && analysis?.violationsInfo) && (
				<Grid item container direction="row" justifyContent="center" alignItems="stretch" spacing={3} m={-1.5} sx={{ "> .MuiGrid-item": { p: 1.5 } }}>
					<Grid item xs={12}>
						<Grid item display="flex" md={6} xs={12} m={-1} sx={{ justifyContent: { xs: "center", md: "flex-start" } }}>
							{[...POSSIBLE_VIOLATIONS_SEVERITY].map((severity) => {
								const isDisabled = !violationsSumUp[severity];
								return (
									<Grid key={`key_${severity}`} item>
										<Chip
											style={{ backgroundColor: "transparent" }}
											avatar={<Warning style={{ color: violationsColorIcons[severity] }} />}
											label={<Typography color="inherit">{capitalize(severity)}</Typography>}
										/>
										<Tooltip title={`There are no ${severity.toLowerCase()} violations`} disableHoverListener={!isDisabled} titleVariant="body2" placement="top">
											<span>
												<Switch
													checked={!isDisabled && qualityViolations[severity]}
													disabled={isDisabled}
													onChange={() => {
														setQualityViolations({ ...qualityViolations, [severity]: !qualityViolations[severity] });
														const parsed = queryString.parse(search);
														parsed[severity.toLowerCase()] = !qualityViolations[severity];
														navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
													}}
												/>
											</span>
										</Tooltip>
									</Grid>
								);
							})}
						</Grid>
					</Grid>
					<Grid container sx={{ padding: "16px", display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
						{Object.entries(violationsSumUp).map(([key, metric]) => (
							(key === "Total" || (qualityViolations[key] && metric > 0)) && (
								<Grid
									key={key}
									item
									xs={12}
									sm={6}
									md={3}
									sx={{
										padding: "1rem",
										display: "flex",
										justifyContent: "center",
										alignItems: "center",
									}}
								>
									<GeneralInfoTile
										key={key}
										content={key}
										number={Number.parseFloat(metric)}
									/>
								</Grid>
							)
						))}
					</Grid>
					<Grid container sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", pr: "1rem", pl: "1rem" }}>
						<Grid item hidden={!filePath} xs={12} sm="auto" sx={{ flex: "1 1 auto", textAlign: { xs: "center", sm: "left" } }}>
							<BackToFilesButton />
						</Grid>
						<Grid item xs={12} sm="auto" sx={{ ml: "auto", textAlign: { xs: "center", sm: "right" } }}>
							<Select
								size="medium"
								id="violationTypeFilter"
								name="violationTypeFilter"
								value={filteredViolation?.value || ""}
								options={violationOptions}
								sx={{
									width: { xs: "100%", sm: "auto" }, // Full width on small screens
									minWidth: "200px",
									textAlign: "left",
								}}
								onChange={(e) => {
									const currentQueryParams = queryString.parse(search); // Parse the existing query parameters
									const updatedQueryParams = {
										...currentQueryParams, // Spread the current query parameters
										violationType: e.target.value || null, // Add or overwrite the `filePath` parameter
										LS: undefined,
										LE: undefined,
									};
									const updatedUrl = queryString.stringifyUrl({
										url: pathname,
										query: updatedQueryParams,
									});

									navigate(updatedUrl);
								}}
							>
								<MenuItem value="">{"All"}</MenuItem>
								{renderedOptions}
							</Select>
						</Grid>
					</Grid>
					<Grid container hidden={!filePath} sx={{ display: "flex", justifyContent: "space-between", pr: "1rem", pl: "1rem" }}>
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
					<Grid item hidden={!filePath} xs={12}>
						{fileContent ? (
							<BorderBox sx={{ p: 0 }}>
								<CodeViewer
									ref={editorRef}
									renderChatGpt
									handleQueryParams
									value={fileContent}
									getAnnotations={getAnnotations}
									language={(language || "Java").toLowerCase()}
									projectId={projectId}
									repositoryId={repositoryId}
									filePath={filePath}
									hash={hash}
									setShowButton={setShowCycloptButton}
								/>
								<CodeViewerNavButtons
									diagnostics={diagnostics}
									editorRef={editorRef}
								/>
							</BorderBox>
						) : (
							<LinearProgress color="primary" />
						)}
					</Grid>
					<Grid item hidden={filePath} xs={12}>
						{!Object.values(filteredViolationsInfo?.violations).every((value) => value === null) && (
							<ViolationsTables
								violationsData={filteredViolationsInfo?.violations}
							/>
						)}
					</Grid>
				</Grid>
			)}
		</Grid>
	);
};

QualityViolations.propTypes = {
	projectId: PropTypes.string.isRequired,
	repositoryId: PropTypes.string.isRequired,
	analysis: PropTypes.object.isRequired,
};

export default memo(QualityViolations);
