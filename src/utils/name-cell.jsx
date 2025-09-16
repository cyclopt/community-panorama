import { Box, Tooltip, Link as MaterialLink, Typography } from "@mui/material";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { People, Person, Sync, PriorityHigh } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import PropTypes from "prop-types";

import { useProjectQualityGatesStatus } from "../api/index.js";

const ProjectQualityGatesCell = ({ row, setName }) => {
	const theme = useTheme();
	const isTeamProject = row.type === "team";
	const { failedQualityGates, isLoading, isError } = useProjectQualityGatesStatus(row?.parentOrganization?._id, row._id);
	const failedQualityGatesNames = [...new Set(failedQualityGates?.map((qG) => qG.qualityGate.name))];

	return (
		<Box sx={{ display: "flex", alignItems: "center" }}>
			{isTeamProject ? (
				<Tooltip title="Team Project">
					<People color="primary" sx={{ mr: 0.5, ...(!row.isShown && { color: "grey.500" }) }} />
				</Tooltip>
			) : (
				<Tooltip title="Personal Project">
					<Person color="secondary" sx={{ mr: 0.5, ...(!row.isShown && { color: "grey.500" }) }} />
				</Tooltip>
			)}
			<MaterialLink
				underline="none"
				component={Link}
				to={`/projects/${row._id}`}
				sx={{ ...(!row.isShown && { color: "grey.500" }) }}
				className={clsx(!row.isShown && "disabled-link")}
				onClick={() => setName(row.name)}
			>
				<Typography>{row.name}</Typography>
			</MaterialLink>
			{ isError ? (
				<Tooltip title="Quality Gates Analysis not found.">
					<PriorityHigh style={{ color: theme.palette.error.main }} />
				</Tooltip>
			) : (
				isLoading ? (
					<Tooltip title="Checking project...">
						<Sync />
					</Tooltip>
				) : (
					failedQualityGatesNames && failedQualityGatesNames.length > 0 && (
						<Tooltip title={(
							<>
								<span>
									{"Quality Gates: "}
								</span>
								<MaterialLink
									underline="none"
									component={Link}
									to={`/projects/${row._id}/quality-gates?tab=1`}
									state={{ failedQualityGates }}
									sx={{ color: theme.palette.error.main, fontWeight: "bold" }}
									onClick={() => setName(row.name)}
								>
									{failedQualityGatesNames.join(", ")}
								</MaterialLink>
								<span>
									{" failed!"}
								</span>
							</>
						)}
						>
							<PriorityHigh style={{ color: theme.palette.error.main }} />
						</Tooltip>
					)
				)
			)}

		</Box>
	);
};

ProjectQualityGatesCell.propTypes = {
	row: PropTypes.object,
	setName: PropTypes.func,
};

export default ProjectQualityGatesCell;
