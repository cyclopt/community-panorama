import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import queryString from "query-string";
import PropTypes from "prop-types";
import {
	TableRow,
	TableContainer,
	TableBody,
	TableCell,
	Typography,
	TableHead,
	Table as MuiTable,
	Link as MaterialLink,
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

const infoTypes = {
	current: {
		key: "Violations",
		color: "primary",
		title: "Violations",
	},
	introduced: {
		key: "Violations +++",
		color: "pink",
		title: "Violations Added",
	},
	removed: {
		key: "Violations ---",
		color: "secondary",
		title: "Violations Removed",
	},
};

const ViolationsDiffTable = (props) => {
	const { rows = [], type = "current", page, rowsPerPage } = props;
	const theme = useTheme();
	const { search } = useLocation();
	const [internalExpanded, setInternalExpanded] = useState("");
	const rowsToRender = useMemo(() => (rowsPerPage > 0
		? rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
		: [...rows]
	), [page, rows, rowsPerPage]);

	const handleExpand = (isExpanded, row) => {
		setInternalExpanded(isExpanded ? row.finding : false);
	};

	const renderCell = ({ row }) => (
		<Accordion
			disableGutters
			expanded={internalExpanded === row.finding}
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
						color: ((row.severity === "Critical" || row.severity === "ERROR")
							? theme.palette.red[900]
							: ((row.severity === "Major" || row.severity === "WARNING")
								? theme.palette.deepOrange[300]
								: theme.palette.yellow[700]
							)),
					}}
					/>
				</Tooltip>
			&nbsp;
			&nbsp;
				<Typography fontWeight="bold">{`${row.finding} (${pluralize("time", sum(Object.values(row.fileInfo).flatMap((e) => e.length)), true)})`}</Typography>
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
							{Object.entries(row.fileInfo).map(([file, lines]) => {
								if (row === "headerRow") return null;
								const currentQueryParams = queryString.parse(search);
								let updatedQueryParams = {
									...currentQueryParams,
									fileName: file,
								};
								let updatedUrl = queryString.stringifyUrl({
									url: "",
									query: updatedQueryParams,
								});
								return (
									<TableRow key={`${row[0]}_${file}`}>
										<TableCell component="th" scope="row">
											<MaterialLink
												variant="body1"
												underline="none"
												component={Link}
												sx={{ overflow: "auto", ...(type === "removed" ? { pointerEvents: "none" } : {}) }}
												to={updatedUrl}
											>
												{file}
											</MaterialLink>
										</TableCell>
										<TableCell>
											<Typography align="center">{lines.length}</Typography>
										</TableCell>
										<TableCell>
											<Typography align="right">
												{lines.map((lineObj, idx) => {
													const startLine = lineObj.startLine;
													const endLine = lineObj.endLine;

													// Determine the display text and query parameters based on presence of endLine
													let displayLine;
													updatedQueryParams = { ...currentQueryParams, fileName: file };
													if (endLine && endLine !== startLine) {
														// Range format: LstartLine-endLine
														displayLine = `L${startLine}-${endLine}`;
														updatedQueryParams.LS = startLine; // Highlight start line
														updatedQueryParams.LE = endLine; // Highlight end line
													} else {
														// Single line: LstartLine
														displayLine = `L${startLine}`;
														updatedQueryParams.LS = startLine;
														delete updatedQueryParams.LE; // Ensure no leftover LE param
													}

													updatedUrl = queryString.stringifyUrl({
														url: "",
														query: updatedQueryParams,
													});

													return (
														<React.Fragment key={`${file}_${displayLine}`}>
															<MaterialLink
																variant="body1"
																underline="none"
																component={Link}
																sx={{ overflow: "auto", ...(type === "removed" ? { pointerEvents: "none" } : {}) }}
																to={updatedUrl}
															>
																{displayLine}

															</MaterialLink>
															{idx < lines.length - 2 ? ", " : idx === lines.length - 2 ? " and " : ""}
														</React.Fragment>
													);
												})}
											</Typography>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</MuiTable>
				</TableContainer>
			</AccordionDetails>
		</Accordion>
	);

	return (
		<>
			<TableRow sx={{ backgroundColor: theme.palette[infoTypes[type].color].main }} align="start">
				<TableCell key={infoTypes[type].key}>
					<Typography variant="body4" align="start" ml="1rem" sx={{ color: "common.white" }}>{infoTypes[type].title}</Typography>
				</TableCell>
			</TableRow>
			{rowsToRender.length > 0
				? rowsToRender.map((row, rowInd) => (
					<TableRow
						key={`${infoTypes[type].key}_${rowInd}}`}
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
	type: PropTypes.string,
	page: PropTypes.number,
	rowsPerPage: PropTypes.number,
};

export default ViolationsDiffTable;
