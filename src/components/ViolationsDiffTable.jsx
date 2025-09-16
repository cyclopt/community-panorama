import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import {
	TableRow,
	TableContainer,
	TableBody,
	TableCell,
	Typography,
	TableHead,
	Table as MuiTable,
	AccordionDetails,
	Accordion,
	AccordionSummary as MuiAccordionSummary,
} from "@mui/material";
import { ArrowForwardIosSharp, Warning } from "@mui/icons-material";
import { styled, useTheme } from "@mui/material/styles";
import pluralize from "pluralize";

import NoDataAvailable from "./NoDataAvailable.jsx";
import Tooltip from "./Tooltip.jsx";

import { sum } from "#utils";

const AccordionSummary = styled((props) => (
	<MuiAccordionSummary expandIcon={<ArrowForwardIosSharp sx={{ fontSize: "0.9rem" }} />} {...props} />
))(({ theme }) => ({
	backgroundColor: "#d7e0e8",
	borderRadius: theme.shape.borderRadius,
	flexDirection: "row-reverse",
	"& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
		transform: "rotate(90deg)",
	},
	"& .MuiAccordionSummary-content": {
		marginLeft: theme.spacing(1),
	},
}));

const ViolationsDiffTable = (props) => {
	const { rows = [], deletedViolations = false, page, rowsPerPage } = props;
	const theme = useTheme();
	const [internalExpanded, setInternalExpanded] = useState("");
	const rowsToRender = useMemo(() => (rowsPerPage > 0
		? rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
		: [...rows]
	), [page, rows, rowsPerPage]);

	const handleExpand = (isExpanded, row) => {
		setInternalExpanded(isExpanded ? row.violation : false);
	};

	const renderCell = ({ row }) => (
		<Accordion
			disableGutters
			expanded={internalExpanded === row.violation}
			elevation={0}
			className="accordion"
			sx={{
				"&.Mui-expanded": {
					border: `${theme.spacing(0.25)} solid #d7e0e8`,
					"& .MuiAccordionSummary-root": {
						borderBottomLeftRadius: 0,
						borderBottomRightRadius: 0,
					},
				},
			}}
			onChange={(_, isExpanded) => handleExpand(isExpanded, row)}
		>
			<AccordionSummary>
				<Tooltip title={row.severity}>
					<Warning style={{
						color: (row.severity === "Critical"
							? theme.palette.red[900]
							: (row.severity === "Major" ? theme.palette.deepOrange[300] : theme.palette.yellow[700])),
					}}
					/>
				</Tooltip>
			&nbsp;
			&nbsp;
				<Typography fontWeight="bold">{`${row.violation} (${pluralize("time", sum(Object.values(row.fileInfo).flatMap((e) => e.length)), true)})`}</Typography>
			</AccordionSummary>
			<AccordionDetails>
				<TableContainer>
					<MuiTable size="small">
						<TableHead>
							<TableRow>
								<TableCell>
									<Typography align="left" fontWeight="bold">{"File"}</Typography>
								</TableCell>
								<TableCell>
									<Typography align="center" fontWeight="bold">{"Times"}</Typography>
								</TableCell>
								<TableCell>
									<Typography align="right" fontWeight="bold">{"Lines"}</Typography>
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{Object.entries(row.fileInfo).map(([file, lines]) => (
								<TableRow key={`${row[0]}_${file}`}>
									<TableCell component="th" scope="row">
										<Typography align="left">{file}</Typography>
									</TableCell>
									<TableCell>
										<Typography align="center">{lines.length}</Typography>
									</TableCell>
									<TableCell>
										<Typography align="right">
											{new Intl.ListFormat("en-GB").format(lines.map((e) => `L${e}`))}
										</Typography>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</MuiTable>
				</TableContainer>
			</AccordionDetails>
		</Accordion>
	);

	return (
		<>
			<TableRow sx={{ backgroundColor: theme.palette[deletedViolations ? "secondary" : "pink"].main }} align="start">
				<TableCell key={`Violations ${deletedViolations ? "---" : "+++"}`}>
					<Typography variant="body4" align="start" ml="1rem" sx={{ color: "common.white" }}>{deletedViolations ? "Violations Removed" : "Violations Added"}</Typography>
				</TableCell>
			</TableRow>
			{rowsToRender.length > 0
				? rowsToRender.map((row, rowInd) => (
					<TableRow
						key={`${deletedViolations ? "---" : "+++"}_${rowInd}}`}
						style={{ backgroundColor: `var(--card-background-${rowInd % 2 ? "dark" : "light"})` }}
					>
						<TableCell component="th" scope="row">{renderCell({ row })}</TableCell>
					</TableRow>
				))
				: (
					<TableRow>
						<TableCell colSpan={1}>
							<NoDataAvailable text="No new violations!" />
						</TableCell>
					</TableRow>
				)}
		</>
	);
};

ViolationsDiffTable.propTypes = {
	rows: PropTypes.array,
	deletedViolations: PropTypes.bool,
	page: PropTypes.number,
	rowsPerPage: PropTypes.number,
};

export default ViolationsDiffTable;
