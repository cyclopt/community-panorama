// DuplicatesTables.jsx
import { useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { Grid, Typography, Box } from "@mui/material";
import queryString from "query-string";
import { useNavigate, useLocation } from "react-router-dom";

import DataTable from "./DataTable.jsx";
import NoFindings from "./NoFindings.jsx";

const DuplicatesTables = ({ clonesData }) => {
	const { code_clones: codeClones = [] } = clonesData;

	const { pathname, search } = useLocation();
	const navigate = useNavigate();

	const getTableColumns = useCallback((isClickable) => [
		{
			field: "Files",
			flex: 1,
			renderCell: ({ row }) => (
				<Typography
					disabled
					variant="h6"
					sx={{
						width: "100%",
						...(isClickable ? { cursor: "pointer", "&:hover": { textDecoration: "underline" } } : {}),
						color: "primary.main",
						paddingLeft: "8px",
					}}
					onClick={() => {
						if (isClickable) {
							const parsed = queryString.parse(search);
							parsed.cloneInstance = row.index;
							navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
						}
					}}
				>
					<Box sx={{ whiteSpace: "pre-line", textColor: "red", textAlign: "left", paddingLeft: "8px" }}>
						{row.files.map((f, idx) => (
							<Box
								key={idx}
								component="span"
								sx={{
									color: "inherit", // Use theme colors for consistency
									paddingLeft: "8px",
								}}
							>
								{f.filePath}
								{idx < row.files.length - 1 && <br />}
							</Box>
						))}
					</Box>
				</Typography>
			),
		},
		{
			field: "Lines",
			flex: 0.2,
			sortable: false,
			align: "left",
			valueGetter: ({ row }) => row.clone_loc,
		},
		{
			field: "Instances",
			flex: 0.2,
			sortable: false,
			align: "left",
			valueGetter: ({ row }) => row.clone_instances,
		},
	], [navigate, pathname, search]);

	const introducedCurrentColumns = useMemo(() => getTableColumns(true), [getTableColumns]);

	// Determine if there are any duplicates to display
	const hasAnyDuplicates = useMemo(() => (codeClones.length > 0), [codeClones.length]);

	// Early return if no duplicates exist
	if (!hasAnyDuplicates) {
		return (<NoFindings text="No current duplicates found." />);
	}

	return (
		<Grid container display="flex" direction="column">
			{ codeClones.length > 0 && (
				<Grid
					item
					sx={{
						marginBottom: 4,
						borderRadius: "1rem",
						border: 1,
						borderColor: "divider",
						padding: 2,
						backgroundColor: "background.paper",
					}}
				>
					{
						codeClones.length > 0 ? (
							<DataTable
								rows={codeClones}
								columns={introducedCurrentColumns}
								getRowId={(row) => JSON.stringify(row)}
								initialState={{
									sorting: { sortModel: [{ field: "Instances", sort: "desc" }, { field: "Lines", sort: "desc" }] },
									pagination: { paginationModel: { page: 0 } },
								}}
							/>
						) : (
						// If diff is false but no current duplicates, show a message
							<Typography variant="body2" color="textSecondary" align="center">
								{"No current duplicates"}
							</Typography>
						)
					}
				</Grid>
			)}
		</Grid>
	);
};

DuplicatesTables.propTypes = {
	clonesData: PropTypes.arrayOf(
		PropTypes.shape({
			clone_instances: PropTypes.number.isRequired,
			clone_loc: PropTypes.number.isRequired,
			files: PropTypes.arrayOf(
				PropTypes.shape({
					filePath: PropTypes.string.isRequired,
					start_line: PropTypes.number.isRequired,
					end_line: PropTypes.number.isRequired,
				}),
			).isRequired,
			index: PropTypes.number, // Assuming each clone has an index for unique identification
		}),
	).isRequired,
};

export default DuplicatesTables;
