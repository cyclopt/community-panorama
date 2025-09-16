import { dateNewToOld } from "@iamnapo/sort";
import { Link } from "react-router-dom";
import {
	Box,
	Grid,
	Typography,
	Link as MuiLink,
	IconButton,
	Dialog,
	DialogTitle,
	ListItemAvatar,
	DialogContent,
	Avatar,
	DialogContentText,
	DialogActions,
	Link as MaterialLink,
	Zoom,
	InputAdornment,
	Button,
	ListItemText,
	Input,
	ListItem,
	Modal,
	LinearProgress,
	ButtonGroup,
} from "@mui/material";
import { Image } from "mui-image";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { NoteAdd, Build, Cached, Close, Delete, MenuBook, Security, Edit, Clear, Done, ErrorOutline } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { useImmer } from "use-immer";
import { styled } from "@mui/material/styles";

import useGlobalState from "../../use-global-state.js";
import EvolutionOfQualityAndLoc from "../../components/EvolutionOfQualityAndLoc.jsx";
import CommitTile from "../../components/CommitTile.jsx";
import DataTable from "../../components/DataTable.jsx";
import Tooltip from "../../components/Tooltip.jsx";
import ViolationsDiffModal from "../../components/ViolationsDiffModal.jsx";
import MarkdownViewer from "../../components/MarkdownViewer.jsx";

import { deleteCommit, useCommits, useCompareViolations, useProject, editCommitNote, useCommitNote, useGitParentCommitHash } from "#api";
import { isFuzzyMatch, useSnackbar, dayjs, jwt, useOutsideClick, constructCommitHref } from "#utils";

const classes = {
	author: "note-body",
};

const StyledModal = styled(Modal)(({ theme }) => ({
	[`& .${classes.author}`]: {
		padding: theme.spacing(0.5, 1),
		marginBottom: theme.spacing(1),
		backgroundColor: theme.palette.grey[300],
		borderRadius: theme.shape.borderRadius,
		display: "inline-block",
	},
}));

const getRowClassName = (params) => (params.row.isHeader ? "header-row" : (params.indexRelativeToCurrentPage % 2 === 0 ? "odd" : "even"));

const QualityCommits = (props) => {
	// Destructure props
	const { projectId, repository } = props;

	// Decode user ID and type from JWT
	const { id: userID, type: type_ } = jwt.decode();

	// State management
	const [type, setType] = useState(type_);
	const [selectedCommitNote, setSelectedCommitNote] = useState(false);
	const [modalOpen, setModalOpen] = useState(false);
	const [noteBody, setNoteBody] = useState("");
	const [editNoteBody, setEditNoteBody] = useState(false);

	// Refs
	const ref = useRef(null);

	// Custom hooks
	const { project = { projectType: "github", team: [] } } = useProject(projectId);
	const { team, projectType } = project;
	const branchName = useGlobalState(useCallback((e) => e.branchName, []));
	const { commits = [], isLoading, isError, mutate } = useCommits(projectId, repository._id, branchName);
	const {
		sNote = null,
		isLoading: isLoadingNote,
		isError: isErrorNote,
		mutate: mutateNote,
	} = useCommitNote(projectId, repository._id, selectedCommitNote?._id);
	const [deletedCommitCandidate, setDeletedCommitCandidate] = useImmer({
		commit: null,
		isDeleting: false,
		deleteDialogOpen: false,
	});
	const [toCommitId, setToCommitId] = useState(null);
	const {
		violations = {},
		isLoading: isLoadingViolations,
		isError: isErrorViolations,
	} = useCompareViolations(toCommitId, repository.root, repository.language);
	const { gitParentCommitHash } = useGitParentCommitHash(toCommitId, repository.owner, repository.name);
	const viewer = useMemo(() => ({ ...team?.find((m) => m.user._id === userID).user }), [team, userID]);
	const { success, error } = useSnackbar();

	// Using outside click custom hook
	useOutsideClick(() => { if (selectedCommitNote) setSelectedCommitNote(false); }, ref);

	useEffect(() => {
		if (isError || isErrorNote || isErrorViolations) error();
	}, [error, isError, isErrorNote, isErrorViolations]);

	useEffect(() => {
		setNoteBody(sNote?.body);
	}, [sNote?.body]);

	useEffect(() => {
		mutate();
	}, [branchName, mutate]);

	useEffect(() => {
		if (type === "cyclopt") {
			setType(projectType);
		}
	}, [projectType, type]);

	// Close modal on ESC key press
	useEffect(() => {
		const close = (e) => { if (e.keyCode === 27 && selectedCommitNote) setSelectedCommitNote(false); };

		window.addEventListener("keyup", close);
		return () => window.removeEventListener("keyup", close);
	}, [selectedCommitNote]);

	// Functions to handle commit note updates and deletions
	const submitDeleteCommit = async () => {
		if (!deletedCommitCandidate.commit) return;
		try {
			setDeletedCommitCandidate((p) => { p.isDeleting = true; });
			await deleteCommit(projectId, repository._id, deletedCommitCandidate.commit._id);
			await mutate();
			setDeletedCommitCandidate((p) => { p.isDeleting = false; p.deleteDialogOpen = false; });
			success(`Commit: ${deletedCommitCandidate.commit.hash.slice(0, 6)}, has been deleted!`);
		} catch {
			setDeletedCommitCandidate((p) => { p.isDeleting = false; p.deleteDialogOpen = false; });
			error();
		}
	};

	const onUpdateCommitNote = async (note) => {
		try {
			await editCommitNote(projectId, repository._id, selectedCommitNote?._id, note);
			mutateNote((p) => ({
				...p,
				edits: [
					...note.edits.filter((e) => e.author._id !== userID),
					{ author: viewer, createdAt: new Date() },
				].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) }));
			mutate((p) => p.map((commit) => ((commit._id === selectedCommitNote?._id) ? { ...commit, note: note.body } : commit)));
			success("Note has been updated!");
		} catch {
			error();
		}
	};

	// Table columns configuration
	const tableColumns = useMemo(() => [
		{
			field: "Commit Message",
			minWidth: 200,
			flex: 1,
			align: "left",
			valueGetter: ({ row }) => row.isHeader || row.message,
			getApplyQuickFilterFn: (searchValue) => ({ row }) => isFuzzyMatch(`${row.message} ${row.hash?.slice(0, 6)}`, searchValue),
			sortable: false,
			renderCell: ({ row, value }) => {
				if (row.isHeader) { return null; }

				return (
					<Box sx={{ display: "block", wordWrap: "break-word", whiteSpace: "normal", textAlign: "left", maxHeight: "300px", overflow: "auto" }}>
						<div style={{ overflow: "auto", maxHeight: "20vh" }}>
							<MarkdownViewer
								content={value}
							/>
						</div>
						<Typography variant="caption">
							{"hash: "}
							<MuiLink
								underline="none"
								href={constructCommitHref(type, repository, row.hash)}
								target="_blank"
								rel="noopener noreferrer"
							>
								{row.hash.slice(0, 6)}
							</MuiLink>
							{" | "}
							{`authored: ${dayjs(row.authoredAt).fromNow()}`}
						</Typography>
					</Box>
				);
			},
		},
		{
			field: "Author",
			width: 140,
			sortable: false,
			valueGetter: ({ row }) => {
				if (row.isHeader) { return null; }

				return <Typography>{row.author}</Typography>;
			},
		},
		{
			field: "Quality Characteristics",
			width: 350,
			sortable: false,
			type: "number",
			renderCell: ({ row }) => {
				if (row.isHeader) {
					return (
						<Grid container sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
							<Grid item sm={3} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
								<Tooltip title="Maintainability"><Build sx={{ color: "primary.main" }} /></Tooltip>
							</Grid>
							<Grid item sm={3} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
								<Tooltip title="Security"><Security sx={{ color: "primary.main" }} /></Tooltip>
							</Grid>
							<Grid item sm={3} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
								<Tooltip title="Readability"><MenuBook sx={{ color: "primary.main" }} /></Tooltip>
							</Grid>
							<Grid item sm={3} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
								<Tooltip title="Reusability"><Cached sx={{ color: "primary.main" }} /></Tooltip>
							</Grid>
						</Grid>
					);
				}

				return (
					<Grid container sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
						<Grid item sm={3} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
							<CommitTile
								currentValue={row.characteristics.maintainabilityScore}
								previousValue={row.previousCharacteristics?.maintainabilityScore}
							/>
						</Grid>
						<Grid item sm={3} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
							<CommitTile
								currentValue={row.characteristics.securityScore}
								previousValue={row.previousCharacteristics?.securityScore}
							/>
						</Grid>
						<Grid item sm={3} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
							<CommitTile
								currentValue={row.characteristics.readabilityScore}
								previousValue={row.previousCharacteristics?.readabilityScore}
							/>
						</Grid>
						<Grid item sm={3} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
							<CommitTile
								currentValue={row.characteristics.reusabilityScore}
								previousValue={row.previousCharacteristics?.reusabilityScore}
							/>
						</Grid>
					</Grid>
				);
			},
		},
		{
			field: "Violations",
			width: 300,
			sortable: false,
			type: "number",
			renderCell: ({ row }) => {
				if (row.isHeader) {
					return (
						<Grid container sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
							<Grid item sm={4} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
								<Typography variant="h6" fontWeight="bold" color="primary.main">{"Critical"}</Typography>
							</Grid>
							<Grid item sm={4} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
								<Typography variant="h6" fontWeight="bold" color="primary.main">{"Major"}</Typography>
							</Grid>
							<Grid item sm={4} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
								<Typography variant="h6" fontWeight="bold" color="primary.main">{"Minor"}</Typography>
							</Grid>
						</Grid>
					);
				}

				return (
					<Grid container sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
						<Grid item sm={4} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
							<CommitTile
								severity="Critical"
								currentValue={row.violations?.Critical}
								previousValue={row.previousViolations?.Critical}
							/>
						</Grid>
						<Grid item sm={4} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
							<CommitTile
								severity="Major"
								currentValue={row.violations?.Major}
								previousValue={row.previousViolations?.Major}
							/>
						</Grid>
						<Grid item sm={4} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
							<CommitTile
								severity="Minor"
								currentValue={row.violations?.Minor}
								previousValue={row.previousViolations?.Minor}
							/>
						</Grid>
					</Grid>
				);
			},
		},
		{
			field: "Actions",
			sortable: false,
			width: 250,
			disableExport: true,
			getApplyQuickFilterFn: undefined,
			renderCell: ({ row }) => {
				if (row.isHeader) { return null; }

				return (
					<ButtonGroup variant="outlined" aria-label="Loading button group">
						<IconButton
							title="Violations added/removed based on the parent commit."
							sx={{ color: "primary.main", border: "1px solid" }}
							onClick={() => {
								setToCommitId(row._id);
								setModalOpen(true);
							}}
						>
							<ErrorOutline />
						</IconButton>
						<IconButton
							title="Add note"
							sx={{ color: "primary.main", border: "1px solid", mx: 1 }}
							onClick={() => { setSelectedCommitNote({ _id: row._id, hash: row.hash }); }}
						>
							<NoteAdd />
						</IconButton>
						<IconButton
							title="Hide commit"
							sx={{ color: "primary.main", border: "1px solid" }}
							onClick={() => setDeletedCommitCandidate((p) => { p.commit = row; p.deleteDialogOpen = true; })}
						>
							<Delete />
						</IconButton>
					</ButtonGroup>

				);
			},
		},
	], [repository.name, repository.owner, setDeletedCommitCandidate, type]); 	// eslint-disable-line react-hooks/exhaustive-deps

	// Example of adding a pseudo-header row
	const modifiedRows = useMemo(() => {
		const restCom = [...commits].sort(dateNewToOld((v) => new Date(v.authoredAt)));
		const headerRow = {
			id: "headerRow", // Ensure this ID is unique and won't clash with real data IDs
			isHeader: true, // This is a pseudo-header row
			commitMessage: "Commit Message",
			author: "Author",
			maintainability: "Maintainability", // You can include whatever header labels you need
			security: "Security",
			readability: "Readability",
			reusability: "Reusability",
		// Other fields...
		};
		return [headerRow, ...restCom];
	}, [commits]);

	return (
		<section style={{ paddingTop: "1rem" }}>
			<div className="container">
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<EvolutionOfQualityAndLoc
							commits={isLoading ? null : commits}
							setSelectedCommitNote={(e) => setSelectedCommitNote(e)}
						/>
					</Grid>
					<Grid item xs={12}>
						<DataTable
							rows={modifiedRows}
							loading={isLoading}
							columns={tableColumns}
							getRowClassName={getRowClassName}
							initialState={{
								pagination: {
									paginationModel: {
										page: 0,
										pageSize: 10,
									},
								},
							}}
							experimentalFeatures={{ columnGrouping: true }}
						/>
					</Grid>
				</Grid>
			</div>
			<Dialog
				keepMounted
				open={Boolean(deletedCommitCandidate.deleteDialogOpen)}
				TransitionComponent={Zoom}
				onClose={() => !deletedCommitCandidate.isDeleting && setDeletedCommitCandidate((p) => { p.deleteDialogOpen = false; })}
			>
				<DialogTitle>
					{`Delete commit ${deletedCommitCandidate.commit?.hash?.slice(0, 6)}?`}
				</DialogTitle>
				<DialogContent dividers>
					<DialogContentText>
						{"Deleting the commit will result in permanent data loss. All associated analyses along with their respective data will be deleted."}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<LoadingButton
						autoFocus
						startIcon={<Delete />}
						loading={deletedCommitCandidate.isDeleting}
						loadingPosition="start"
						variant="contained"
						onClick={submitDeleteCommit}
					>
						{"Delete"}
					</LoadingButton>
					<Button
						variant="outlined"
						disabled={deletedCommitCandidate.isDeleting}
						onClick={() => setDeletedCommitCandidate((p) => { p.deleteDialogOpen = false; p.commit = null; })}
					>
						{"Cancel"}
					</Button>
				</DialogActions>
			</Dialog>
			<ViolationsDiffModal
				modalOpen={modalOpen}
				setModalOpen={setModalOpen}
				violations={violations}
				isLoading={isLoadingViolations}
				gitParentCommitHrf={constructCommitHref(type, repository, gitParentCommitHash)}
				gitParentCommitHash={gitParentCommitHash}
			/>
			<StyledModal
				keepMounted
				open={Boolean(selectedCommitNote)}
				style={{ display: "flex", justifyContent: "center", overflowY: "scroll", alignItems: "center" }}
				onClose={() => setModalOpen(false)}
			>
				<Box ref={ref} sx={{ width: "70%", my: 4 }}>
					<ListItem sx={{
						alignItems: "center",
						borderWidth: (t) => t.spacing(0.2),
						borderStyle: "solid",
						backgroundColor: "grey.50",
						borderColor: "secondary.main",
						borderRadius: 1,
					}}
					>
						<ListItemAvatar>
							{ editNoteBody
								? (
									<Avatar
										alt={viewer?.username}
										title={viewer?.username}
										src={viewer?.avatar}
									/>
								)
								:	 (
									<Avatar
										alt={sNote?.edits?.[0]?.author?.username}
										title={sNote?.edits?.[0]?.author?.username}
										src={sNote?.edits?.[0]?.author?.avatar}
									/>
								)}
						</ListItemAvatar>
						<ListItemText
							disableTypography
							primary={(
								<Grid container style={{ display: "flex", justifyContent: "space-between" }}>
									<Grid item className={classes.author}>
										<Grid item container flexDirection="row" justifyContent="flex-start" alignItems="center">
											<Typography variant="h6" style={{ display: "inline-block" }}>
												{ editNoteBody ? viewer?.username : sNote?.edits?.[0]?.author?.username }
											</Typography>
											<Typography variant="body2" component="span">
												{` - ${dayjs(sNote?.createdAt).format("DD MMM YY, h:mm A")}`}
											</Typography>
											{sNote?.edits?.map(({ author: { avatar = "", username = "", _id }, createdAt }) => (
												<Grid key={`avatar_key_${_id}`} item hidden={project.type !== "team"} sx={{ ml: "1rem" }}>
													<MuiLink
														component={Link}
														to={`/projects/${projectId}/project-analytics/collaborators/${_id}`}
													>
														<Image
															src={avatar}
															alt={`${username} - ${dayjs(createdAt).format("DD MMM YY, h:mm A")}`}
															title={`${username} - ${dayjs(createdAt).format("DD MMM YY, h:mm A")}`}
															width="2rem"
															height="2rem"
															sx={{ borderRadius: "50%" }}
														/>
													</MuiLink>
												</Grid>
											))}
										</Grid>
									</Grid>
									<Grid item className={classes.author}>
										<Grid item container flexDirection="row" justifyContent="flex-start" alignItems="center">
											<Typography variant="h6" style={{ display: "inline-flex" }}>
												{"Commit: "}
														&nbsp;
												<MaterialLink
													underline="none"
													href={constructCommitHref(type, repository, selectedCommitNote?.hash)}
													target="_blank"
													rel="noopener noreferrer"
												>
													<Typography variant="h6" style={{ display: "inline-flex" }}>{selectedCommitNote?.hash?.slice(0, 7)}</Typography>
												</MaterialLink>
											</Typography>
										</Grid>
									</Grid>
								</Grid>
							)}
							secondary={isLoadingNote ? <LinearProgress /> : (
								<Input
									required
									disableUnderline
									className="input"
									type="text"
									id="note"
									placeholder="Note"
									readOnly={!editNoteBody}
									value={noteBody}
									endAdornment={(
										<InputAdornment position="end">
											{(editNoteBody
												? (
													<>
														<IconButton
															size="small"
															aria-label="edit comment"
															title="edit comment"
															className="small-icon"
															onClick={() => {
																onUpdateCommitNote({ ...sNote, body: noteBody });
																setEditNoteBody(false);
															}}
														>
															<Done color="secondary" />
														</IconButton>
														<IconButton
															size="small"
															aria-label="cancel"
															title="cancel"
															className="small-icon"
															onClick={() => {
																setNoteBody(sNote?.body);
																setEditNoteBody(false);
															}}
														>
															<Clear color="primary" />
														</IconButton>
													</>
												)
												: (
													<IconButton
														size="small"
														aria-label="edit body"
														title="edit body"
														className="small-icon"
														onClick={() => { setEditNoteBody(true); }}
													>
														<Edit />
													</IconButton>
												))}
										</InputAdornment>
									)}
									onChange={(e) => setNoteBody(e.target.value)}
								/>
							)}
						/>
					</ListItem>
					<IconButton
						style={{
							color: "white",
							position: "absolute",
							top: "3vh",
							right: "1vw",
							".>hover": { backgroundColor: "transparent" },
							zIndex: 2,
						}}
						onClick={() => { setSelectedCommitNote(false); setEditNoteBody(false); }}
					>
						<Close />
					</IconButton>
				</Box>
			</StyledModal>
		</section>
	);
};

export default QualityCommits;
