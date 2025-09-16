import { useMemo, useCallback } from "react";
import { Box, LinearProgress, MenuItem, TextField, Typography } from "@mui/material";
import {
	DataGrid,
	gridClasses,
	GridToolbarColumnsButton,
	GridToolbarContainer,
	GridToolbarQuickFilter,
	gridFilteredSortedRowIdsSelector,
	gridVisibleColumnDefinitionsSelector,
	useGridApiContext,
	GridToolbarExportContainer,
	GridCsvExportMenuItem,
	GridToolbarFilterButton,
} from "@mui/x-data-grid";
import { ArrowDownward, ArrowUpward, FilterAlt } from "@mui/icons-material";
import { shallow } from "zustand/shallow";
import queryString from "query-string";
import { useNavigate, useLocation } from "react-router-dom";

import { isFuzzyMatch, MUTATION_DELAY_IN_MS, useLocalStorage } from "../utils/index.js";

import NoDataAvailable from "./NoDataAvailable.jsx";

const pageSizeOptions = [5, 10, 50, 100];

const getJson = (apiRef) => {
	const filteredSortedRowIds = gridFilteredSortedRowIdsSelector(apiRef);
	const visibleColumnsDefinition = gridVisibleColumnDefinitionsSelector(apiRef);
	return JSON.stringify(
		filteredSortedRowIds.map((id) => {
			const row = {};
			for (const { field } of visibleColumnsDefinition.filter((col) => !col.disableExport)) {
				row[field] = apiRef.current.getCellParams(id, field).formattedValue;
			}

			return row;
		}),
		null,
		2,
	);
};

const exportBlob = (blob, filename) => {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url));
};

const JsonExportMenuItem = ({ hideMenu }) => {
	const apiRef = useGridApiContext();
	return (
		<MenuItem
			onClick={() => {
				const blob = new Blob([getJson(apiRef)], { type: "application/json" });
				exportBlob(blob, `${document.title}.json`);
				hideMenu?.();
			}}
		>
			{"Download as JSON"}
		</MenuItem>
	);
};

const ExcelExportMenuItem = ({ hideMenu }) => {
	const apiRef = useGridApiContext();
	return (
		<MenuItem
			onClick={async () => {
				const { utils, writeFile } = await import("xlsx");
				const ws = utils.json_to_sheet(JSON.parse(getJson(apiRef)));
				const wb = utils.book_new();
				utils.book_append_sheet(wb, ws);
				writeFile(wb, `${document.title}.xlsx`);
				hideMenu?.();
			}}
		>
			{"Download as EXCEL"}
		</MenuItem>
	);
};

const ColumnSortedDescendingIcon = (props) => <ArrowDownward sx={{ color: "white !important" }} {...props} />;
const ColumnSortedAscendingIcon = (props) => <ArrowUpward sx={{ color: "white !important" }} {...props} />;
const ColumnHeaderFilterIconButton = ({ counter }) => (counter ? <FilterAlt sx={{ color: "white !important", fontSize: "small" }} /> : null);

// Toolbar now accepts `showQuickFilter` to control the search input visibility
const Toolbar = ({ extraOptions, addFilterButton, showQuickFilter = true, color }) => (
	<GridToolbarContainer
		sx={{
			borderRadius: (t) => `${t.shape.borderRadius}px`,
			boxShadow: (t) => `${t.shadows[1]} !important`,
			borderBottomLeftRadius: 0,
			borderBottomRightRadius: 0,
			justifyContent: "space-between",
		}}
	>
		<Box>
			<GridToolbarColumnsButton sx={{ color }} />
			{addFilterButton && <GridToolbarFilterButton sx={{ color }} />}
			{extraOptions}
			<GridToolbarExportContainer sx={{ color }}>
				<GridCsvExportMenuItem options={{ getRowsToExport: ({ apiRef }) => gridFilteredSortedRowIdsSelector(apiRef), delimiter: ";" }} />
				<JsonExportMenuItem />
				<ExcelExportMenuItem />
			</GridToolbarExportContainer>
		</Box>
		{showQuickFilter && <GridToolbarQuickFilter debounceMs={MUTATION_DELAY_IN_MS} />}
	</GridToolbarContainer>
);

const DataTable = ({
	tableName,
	rows = [],
	columns = [],
	noRowsLabel = "No data available!",
	color = "primary.main",
	CustomToolbar = Toolbar,
	initialState,
	toolbar,
	addFilterButton = false,
	disableFooter = false,
	disableSearch = false,
	id,
	sx,
	...props
}) => {
	const navigate = useNavigate();
	const { pathname, search } = useLocation();

	const { defaultPageOptions, setDefaultPageOptions } = useLocalStorage(
		useCallback((e) => ({ defaultPageOptions: e.defaultPageOptions, setDefaultPageOptions: e.setDefaultPageOptions }), []),
		shallow,
	);

	const columnsEnhanced = useMemo(
		() => columns.map((column) => ({
			align: "center",
			headerAlign: "center",
			getApplyQuickFilterFn: (searchValue) => ({ value }) => isFuzzyMatch(value, searchValue),
			renderHeader: () => <Typography variant="h6" fontWeight="bold">{column.field}</Typography>,
			renderCell: ({ value }) => <Typography width="100%">{value}</Typography>,
			...column,
		})),
		[columns],
	);

	return (
		<Box
			id={id}
			sx={{
				borderRadius: (t) => `${t.shape.borderRadius}px`,
				boxShadow: (t) => `${t.shadows[1]} !important`,
				width: "100%",
				"& .MuiDataGrid-root--densityStandard .MuiDataGrid-cell": { py: "5px", borderColor: "white" },
				...sx,
			}}
		>
			<DataGrid
				autoHeight
				download
				disableColumnMenu
				disableRowSelectionOnClick
				hideFooter={disableFooter}
				componentsProps={{
					footer: { sx: { justifyContent: "center" } },
				}}
				initialState={{
					...initialState,
					pagination: {
						paginationModel: {
							page: Number(
								queryString.parse(search)[(tableName) ? `${tableName}-tp` : "tp"]
								?? initialState?.pagination?.paginationModel?.page
								?? defaultPageOptions?.page,
							),
							pageSize: queryString.parse(search)[(tableName) ? `${tableName}-tps` : "tps"]
								? pageSizeOptions.includes(
									Number(queryString.parse(search)[(tableName) ? `${tableName}-tps` : "tps"]),
								)
									? Number(queryString.parse(search)[(tableName) ? `${tableName}-tps` : "tps"])
									: 5
								: initialState?.pagination?.paginationModel?.pageSize ?? defaultPageOptions?.pageSize,
						},
					},
				}}
				rows={rows}
				columns={columnsEnhanced}
				pageSizeOptions={pageSizeOptions}
				getRowId={(e) => e.id ?? e._id}
				sortingOrder={["asc", "desc"]}
				columnBuffer={columns.length}
				getRowClassName={({ indexRelativeToCurrentPage }) => (indexRelativeToCurrentPage % 2 === 0 ? "even" : "odd")}
				getRowHeight={() => "auto"}
				getEstimatedRowHeight={() => 100}
				components={{
					ColumnHeaderFilterIconButton,
					ColumnSortedDescendingIcon,
					ColumnSortedAscendingIcon,
					Toolbar: () => (
						<CustomToolbar
							extraOptions={toolbar}
							addFilterButton={addFilterButton}
							color="primary.main"
							showQuickFilter={!disableSearch}
						/>
					),
					LoadingOverlay: LinearProgress,
					NoRowsOverlay: () => <NoDataAvailable text={noRowsLabel} />,
					BaseTextField: (prps) => (
						<TextField
							{...prps}
							InputProps={{ ...prps.InputProps, sx: { color: "primary.main" } }}
							sx={{
								"& .MuiInput-underline": {
									"&:before, &:after": {
										borderBottomColor: (t) => `${t.palette.primary.main} !important`,
									},
								},
							}}
						/>
					),
				}}
				sx={{
					border: "none",
					overflowX: "scroll",
					backgroundColor: "common.white",
					"& .MuiDataGrid-columnHeaders": {
						borderRadius: 0,
						bgcolor: color,
						color: "common.white",
						"& .MuiDataGrid-columnHeader:last-child": {
							"> .MuiDataGrid-columnSeparator": {
								color,
							},
						},
					},
					"& .MuiDataGrid-columnHeaderTitleContainer": {
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					},
					[`& .${gridClasses.cell}`]: {
						whiteSpace: "normal !important",
						wordBreak: "break-all",
					},
					[`& .${gridClasses.row}.even`]: {
						backgroundColor: "var(--card-background-dark)",
						"&:hover, &.Mui-hovered": {
							backgroundColor: "#d7e0e8",
						},
					},
					[`& .${gridClasses.row}.odd`]: {
						backgroundColor: "var(--card-background-light)",
						"&:hover, &.Mui-hovered": {
							backgroundColor: "#d7e0e8",
						},
					},
				}}
				onPaginationModelChange={({ page, pageSize }) => {
					const parsed = queryString.parse(search);
					parsed[(tableName) ? `${tableName}-tp` : "tp"] = page;
					parsed[(tableName) ? `${tableName}-tps` : "tps"] = pageSize;
					navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
					setDefaultPageOptions({ page, pageSize });
				}}
				{...props}
			/>
		</Box>
	);
};

export default DataTable;
