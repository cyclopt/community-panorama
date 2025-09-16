import { useState } from "react";
import PropTypes from "prop-types";
import { IconButton, Modal, Box, TableRow, TableFooter,
	TablePagination,
	Paper,
	TableContainer,
	Table as MaterialTable,
	TableCell,
	Typography,
	TableHead,
	TableBody,
	ToggleButtonGroup,
	LinearProgress,
	Link as MuiLink,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { styled } from "@mui/material/styles";

import ViolationsDiffTable from "./ViolationsDiffTable.jsx";

const sortByArray = (array, sortArray, reverse = false) => {
	// Create a map from violation to index for quick lookup
	const indexMap = new Map(sortArray.map((item, index) => [item.violation, index]));
	const maxIndex = sortArray.length;
	// Sort the array based on the index mapping
	return [...array].sort((a, b) => {
		const indexA = indexMap.has(a.violation) ? indexMap.get(a.violation) : maxIndex;
		const indexB = indexMap.has(b.violation) ? indexMap.get(b.violation) : maxIndex;
		return reverse ? indexB - indexA : indexA - indexB;
	});
};

// Custom styled components
const CustomToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
	color: "white",
	"& .MuiToggleButton-root": {
		borderColor: theme.palette.primary.main,
		"&.Mui-selected": {
			color: theme.palette.secondary.main,
		},
	},
}));

// This table is also used for file changes with type differentiating them
const ViolationsDiffModal = ({
	modalOpen, setModalOpen, gitParentCommitHash = null, gitParentCommitHrf = null, violations = {}, isLoading = true,
}) => {
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);
	const [options, setOptions] = useState({
		additions: true,
		deletions: true,
	});

	const addedViolations = violations.added.length > violations.removed.length
		? sortByArray(violations.added, violations.removed)
		: violations.added;
	const removedViolations = violations.removed.length > violations.added.length
		? sortByArray(violations.removed, violations.added)
		: violations.removed;

	const handleChangePage = (_, newPage) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event) => {
		setRowsPerPage(Number.parseInt(event.target.value, 10));
		setPage(0);
	};

	const handleOptions = (newValue) => {
		setOptions((prevOptions) => ({
			additions: newValue === "additions" ? !prevOptions.additions : true,
			deletions: newValue === "deletions" ? !prevOptions.deletions : true,
		}));
	};

	return (
		<Modal
			open={modalOpen}
			style={{ display: "flex", justifyContent: "center", overflowY: "scroll" }}
			onClose={() => { setModalOpen(false); setPage(0); }}
		>
			<Box sx={{ width: "90%", my: 4 }}>
				<TableContainer
					component={Paper}
					sx={{
						borderRadius: (t) => `${t.shape.borderRadius}px !important`,
						boxShadow: (t) => `${t.shadows[4]} !important`,
						borderWidth: 2,
						borderStyle: "solid",
						borderColor: "primary.main",
						width: "100%",
					}}
				>
					<MaterialTable stickyHeader size="small" sx={{ width: "100%" }}>
						<TableHead>
							<TableRow align="start">
								<TableCell
									key="Violations Diff"
									sx={{
										bgcolor: "primary.main",
										color: "common.white",
										display: "flex",
										flexDirection: { xs: "column-revers", sm: "row" }, // Stack vertically on extra-small screens, horizontally on small and larger
										justifyContent: "space-between",
										alignItems: { xs: "flex-end", sm: "center" }, // Align items to the start on small screens, center on others
										flexWrap: "wrap", // Allow items to wrap
									}}
								>
									<Typography
										variant="h6"
										fontWeight="bold"
										alignContent="center"
									>
										{"Violations Diff"}

									</Typography>
									<CustomToggleButtonGroup
										size="small"
										sx={{ justifyContent: "flex-end", width: { xs: "100%", sm: "inherit" }, alignItems: "center", mr: { xs: "0px", sm: "2.5vw" } }}
										value={Object.keys(options).filter((key) => options[key])}
										onChange={handleOptions}
									>
										<Typography variant="body2">{"Show:"}</Typography>
										<Typography
											variant="body2"
											sx={{ cursor: "pointer", color: options.additions ? "white" : "black", mx: "0.25rem" }}
											onClick={() => { handleOptions("additions"); }}
										>
											{"Added"}
										</Typography>
										<Typography
											variant="body2"
											style={{ cursor: "pointer", color: options.deletions ? "white" : "black" }}
											onClick={() => { handleOptions("deletions"); }}
										>
											{"Removed"}
										</Typography>
									</CustomToggleButtonGroup>
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={1}>
										<LinearProgress />
									</TableCell>
								</TableRow>
							)
								: (
									<>
										{options.additions && (
											<ViolationsDiffTable
												isLoading={isLoading}
												rows={addedViolations}
												page={page}
												rowsPerPage={rowsPerPage}
											/>
										)}
										{options.deletions && (
											<ViolationsDiffTable
												deletedViolations
												isLoading={isLoading}
												rows={removedViolations}
												page={page}
												rowsPerPage={rowsPerPage}
											/>
										)}
									</>
								)}
						</TableBody>
						<TableFooter>
							<TableRow style={{ backgroundColor: `var(--card-background-${violations.added.length % 2 ? "light" : "dark"})` }}>
								<TableCell sx={{
									display: "flex",
									flexDirection: { xs: "column-revers", sm: "row" }, // Stack vertically on extra-small screens, horizontally on small and larger
									justifyContent: "space-between",
									alignItems: { xs: "flex-end", sm: "center" }, // Align items to the start on small screens, center on others
									flexWrap: "wrap", // Allow items to wrap
								}}
								>
									<Typography variant="body1">
										{"Parent Commit: "}
										<MuiLink
											underline="none"
											href={gitParentCommitHash ? gitParentCommitHrf : ""}
											target="_blank"
											rel="noopener noreferrer"
										>
											{gitParentCommitHash?.slice(0, 6)}
										</MuiLink>
									</Typography>
									<TablePagination
										rowsPerPageOptions={[5, 10, 50, 100]}
										colSpan={1}
										count={
											violations.added.length > violations.removed.length
												? violations.added.length
												: violations.removed.length
										}
										rowsPerPage={rowsPerPage}
										page={page}
										SelectProps={{ native: true }}
										labelRowsPerPage="Violations per page:"
										onPageChange={handleChangePage}
										onRowsPerPageChange={handleChangeRowsPerPage}
									/>
								</TableCell>
							</TableRow>
						</TableFooter>
						<IconButton
							style={{ color: "white",
								position: "absolute",
								top: "33px",
								right: "5vw",
								zIndex: 2 }}
							onClick={() => { setModalOpen(false); setPage(0); }}
						>
							<Close />
						</IconButton>
					</MaterialTable>
				</TableContainer>
			</Box>
		</Modal>
	);
};

ViolationsDiffModal.propTypes = {
	violations: PropTypes.object,
	setModalOpen: PropTypes.func,
	gitParentCommitHash: PropTypes.string,
	gitParentCommitHrf: PropTypes.string,
	isLoading: PropTypes.bool,
	modalOpen: PropTypes.bool,
};

export default ViolationsDiffModal;
