
import { memo, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Grid, Typography, Box, CircularProgress, Link } from "@mui/material";
import queryString from "query-string";
import { useLocation } from "react-router-dom";

import { useSnackbar } from "../../utils/index.js";
import GeneralInfoTile from "../../components/GeneralInfoTile.jsx";
import DuplicatesTables from "../../components/DuplicatesTables.jsx";
import BackToFilesButton from "../../components/BackToFilesButton.jsx";
import CodeViewer from "../../components/CodeViewer.jsx";
import BorderBox from "../../components/BorderBox.jsx";
import { loadFileContent, useClones } from "../../api/index.js";

const QualityDuplicates = (props) => {
	const { analysis, repositoryId, projectId } = props;
	const language = analysis?.language || "";
	const { error } = useSnackbar();
	const { search } = useLocation();
	const { clones, isLoading: isClonesLoading, isError } = useClones(analysis._id);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedInstance, setSelectedInstance] = useState("DefaultCloneInstance");
	const [files, setFiles] = useState([]);

	const duplicationTilesMapping = {
		classes_containing_clones: "classes with duplicates",
		duplicate_loc: "duplicate lines of code",
		duplicate_instances: "duplicate instances",
	};

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	useEffect(() => {
		(async () => {
			setIsLoading(true);
			setFiles([]);
			try {
				if (selectedInstance !== "DefaultCloneInstance") {
					const filesWithClones = clones?.code_clones
						.find((c) => Number.parseInt(c.index, 10) === Number.parseInt(selectedInstance, 10))?.files || [];
					const fileInfo = await Promise.all(filesWithClones.map(async (file) => {
						const { content } = await loadFileContent(projectId, repositoryId, file.filePath, analysis.commit?.hash);
						return { path: file.filePath, content, from: file.start_line, to: file.end_line };
					}));
					setFiles(fileInfo);
				}
			} catch {
				error();
			}

			setIsLoading(false);
		})();
	}, [analysis.commit?.hash, clones?.code_clones, error, projectId, repositoryId, selectedInstance]);

	useEffect(() => {
		const parsed = queryString.parse(search);
		if (parsed?.cloneInstance
			&& clones?.code_clones?.length !== 0
			&& parsed?.cloneInstance < clones?.code_clones?.length
			&& parsed?.cloneInstance !== selectedInstance
		) {
			setFiles([]);
			setSelectedInstance(parsed.cloneInstance);
		}
	}, [clones?.code_clones?.length, search, selectedInstance]);

	return (
		<Grid container direction="row" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
			<Grid container direction="column" sx={{ padding: "16px", display: "flex", justifyContent: "center" }}>
				{
					!isClonesLoading && (
						<Grid container direction="row" sx={{ padding: "16px", display: "flex", justifyContent: "center" }}>
							<Grid key="duplicate_code" item xs={12} sm={6} md={3} sx={{ padding: "1rem", display: "flex", justifyContent: "center", alignItems: "center" }}>
								<GeneralInfoTile
									key="duplicate_code"
									percent
									content="duplicate code"
									number={Number.parseFloat((analysis.HighLevelMetrics?.DuplicateCodePct || 0) / 100)}
								/>
							</Grid>
							{Object.entries(clones?.general_info).map(([key, metric]) => (
								<Grid key={key} item xs={12} sm={6} md={3} sx={{ padding: "1rem", display: "flex", justifyContent: "center", alignItems: "center" }}>
									<GeneralInfoTile
										key={key}
										content={duplicationTilesMapping[key]}
										number={Number.parseFloat(metric)}
									/>
								</Grid>
							))}
						</Grid>
					)
				}
				<Grid item hidden={selectedInstance === "DefaultCloneInstance"} xs={12} sm="auto" sx={{ flex: "1 1 auto", textAlign: { xs: "center", sm: "left" } }}>
					<BackToFilesButton
						onClick={() => { setSelectedInstance("DefaultCloneInstance"); }}
					/>
				</Grid>
				<Grid container item flexDirection="row" alignItems="center" justifyContent="center" spacing={1} m={-1}>
					<Grid item>
						<Typography variant="h6" fontWeight="bold" color="primary" sx={{ mr: "1rem" }}>{"Review Clone Instance:"}</Typography>
					</Grid>
					{isLoading || isClonesLoading
						? <CircularProgress />
						:					(
							<Grid item xs={12} hidden={selectedInstance !== "DefaultCloneInstance"}>
								<DuplicatesTables
									clonesData={clones || {}}
								/>
							</Grid>
						)}
				</Grid>
				{files.length > 0 && (
					<Box>
						<Typography fontWeight="bold">{"Involved Files:"}</Typography>
						<Box borderRadius={1} bgcolor="cardBackgroundLight.main" mt={1} mb={2} px={1} pb={1}>
							{files.map((file, ind) => (
								<Typography key={`duplicate_name_${file.path}_${ind}`} pt={1}>
									{`${ind + 1}. `}
									<Link underline="none" href={`#dup-${ind + 1}`}>
										{file.path}
									</Link>
								</Typography>
							))}
						</Box>
					</Box>
				)}
				{files.map((file, ind) => (
					<Grid
						key={`file_editor_${file.path}_${ind}`}
						container
						id={`dup-${ind + 1}`}
						direction="column"
						justifyContent="flex-start"
						spacing={2}
						m={-1}
						mb={1}
						sx={{ "> .MuiGrid-item": { p: 1 } }}
					>
						<Grid item>
							<Typography fontWeight="bold" style={{ display: "inline-flex" }}>
								{"File:"}
							&nbsp;
							</Typography>
							<Typography fontWeight="bold" style={{ display: "inline-flex" }}>
								{file.path}
							</Typography>
						</Grid>
						<Grid item style={{ zIndex: 0, maxWidth: "100%" }}>
							<BorderBox sx={{ p: 0 }}>
								<CodeViewer
									value={file.content}
									language={(language || "Java").toLowerCase()}
									onCreateEditor={(view, state) => {
										view.removeAllFolds();
										view.removeAllMarks();
										const timer = setTimeout(() => {
											try {
												if (file.content !== "You don’t have permission to view this file.") view.addMarks(file.from, file.to);
												view?.fold(1, Math.max(1, Number(file.from) - 5));
												view?.fold(Math.min(Number(file.to) + 5, state.doc.lines), state.doc.lines);
											} catch { /** empty */ }
										}, 1);
										return () => clearTimeout(timer);
									}}
								/>
							</BorderBox>
						</Grid>
					</Grid>
				))}
			</Grid>
		</Grid>
	);
};

QualityDuplicates.propTypes = {
	analysis: PropTypes.object.isRequired,
	projectId: PropTypes.string,
	repositoryId: PropTypes.string,
};

export default memo(QualityDuplicates);
