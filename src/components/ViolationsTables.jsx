import { useMemo } from "react";
import PropTypes from "prop-types";
import { Table, TableBody, TableContainer, Typography } from "@mui/material";

import ViolationsDiffTable from "./ViolationsOverviewTable.jsx"; // Import your ViolationsDiffTable component
import NoFindings from "./NoFindings.jsx"; // Import your ViolationsDiffTable component

import { POSSIBLE_VIOLATIONS_SEVERITY } from "#utils";

const ViolationsTables = ({ violationsData, page, rowsPerPage }) => {
	// Prepare data for each severity level
	const violationsBySeverity = useMemo(() => [...POSSIBLE_VIOLATIONS_SEVERITY].reduce((acc, severity) => {
		const data = { added: [], removed: [], current: [] };

		// Current Violations
		const current = Object.entries(violationsData).filter(
			([, violation]) => violation.severity === severity,
		);

		// eslint-disable-next-line no-unused-vars
		const currentList = current.map(([_, violation]) => {
			const fileInfo = violation.files.reduce((fi, file) => {
				if (!fi[file.filePath]) fi[file.filePath] = [];
				fi[file.filePath].push({ startLine: file.line });
				return fi;
			}, {});

			return {
				finding: violation.title,
				severity: violation.severity,
				fileInfo,
			};
		});

		data.current = currentList;

		acc[severity] = data;
		return acc;
	}, {}), [violationsData]);

	// Determine if there are any violations to display
	const hasAnyViolations = useMemo(() => [...POSSIBLE_VIOLATIONS_SEVERITY].some((severity) => {
		const data = violationsBySeverity[severity];
		return data.current.length > 0;
	}), [violationsBySeverity]);

	if (!hasAnyViolations) {
		return (<NoFindings text="No current violations found." />);
	}

	return (
		<>
			{[...POSSIBLE_VIOLATIONS_SEVERITY].map((severity) => {
				const data = violationsBySeverity[severity];

				// Skip rendering if there are no violations for this severity
				if (data.current.length === 0) {
					return null;
				}

				return (
					<TableContainer
						key={severity}
						sx={{ marginBottom: 4, borderRadius: "1rem", border: 1, padding: 2 }}
					>
						<Typography variant="h6" sx={{ paddingBottom: 2 }}>
							{`Severity: ${severity}`}
						</Typography>
						<Table>
							<TableBody>
								{(
									data.current.length > 0 ? (
										<ViolationsDiffTable
											type="current"
											rows={data.current}
											page={page}
											rowsPerPage={rowsPerPage}
										/>
									) : (
										<Typography variant="body2" color="textSecondary" align="center">
											{`No current violations for severity: ${severity}.`}
										</Typography>
									)
								)}
							</TableBody>
						</Table>
					</TableContainer>
				);
			})}
		</>
	);
};

ViolationsTables.propTypes = {
	violationsData: PropTypes.shape({
		current: PropTypes.object,
		introduced: PropTypes.object,
		removed: PropTypes.object,
	}).isRequired,
	page: PropTypes.number,
	rowsPerPage: PropTypes.number,
};

ViolationsTables.defaultProps = {
	page: 0,
	rowsPerPage: 10,
};

export default ViolationsTables;
