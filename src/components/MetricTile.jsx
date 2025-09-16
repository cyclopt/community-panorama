import { memo, useMemo, useState } from "react";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Typography, Grid, Avatar, Link as MaterialLink, Button, IconButton, Modal, Box } from "@mui/material";
import { Build, Security, MenuBook, Cached, Warning, PostAdd, Close } from "@mui/icons-material";
import queryString from "query-string";
import pluralize from "pluralize";

import { capitalize, POSSIBLE_VULNERABILITIES_SEVERITY } from "../utils/index.js";

import Card from "./Card.jsx";
import Tooltip from "./Tooltip.jsx";
import DataTable from "./DataTable.jsx";
import MarkdownViewer from "./MarkdownViewer.jsx";

function ratingToColor(rating) {
	let color = "Gray";
	if (rating < 20) color = "Tomato";
	else if (rating < 40) color = "Orange";
	else if (rating < 60) color = "Gold";
	else if (rating < 80) color = "YellowGreen ";
	else if (rating <= 100) color = "ForestGreen";
	return color;
}

function ratingToTextColor(color) {
	if (color === "Gold") return "Black";
	return "White";
}

const classes = {
	rating: "MetricTile-rating",
	avatarIcon: "MetricTile-avatarIcon",
	secondaryColor: "MetricTile-secondaryColor",
	affects: "MetricTile-affects",
	content: "MetricTile-content",
};

const StyledCard = styled(Card)(({ theme, rating }) => ({
	[`& .${classes.rating}`]: {
		borderRadius: theme.shape.borderRadius,
		backgroundColor: ratingToColor(rating),
		color: ratingToTextColor(ratingToColor(rating)),
		fontWeight: "bold",
		padding: theme.spacing(1.5),
		width: "25%",
		marginLeft: "auto",
		marginRight: "auto",
	},
	[`& .${classes.avatarIcon}`]: {
		fontSize: theme.typography.h5.fontSize,
		backgroundColor: theme.palette.grey.light,
	},
	[`& .${classes.secondaryColor}`]: {
		color: theme.palette.secondary.main,
	},
	[`& .${classes.affects}`]: {
		marginBottom: theme.spacing(2),
	},
	[`&.${classes.content}`]: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
	},
}));

const MetricTile = (props) => {
	const { pathname, search } = useLocation();
	const navigate = useNavigate();
	const { projectid } = useParams();
	const {
		value,
		score,
		moreInfo,
		title = "",
		tooltip = "",
		content = "",
		affects = [],
		threshold = "",
		numOfFiles = 0,
		percentageOfCode = 0,
		reason = "exceed",
		language = "",
		enableTaskButton = true,
	} = props;

	const [open, setOpen] = useState(false);

	const tableColumns = useMemo(() => [
		{
			field: "Severity",
			width: 80,
			valueGetter: ({ row }) => row.severity.toLowerCase(),
			renderHeader: () => <Typography variant="h6" display="flex"><Warning /></Typography>,
			sortComparator: (
				valueA,
				valueB,
			) => [...POSSIBLE_VULNERABILITIES_SEVERITY].indexOf(valueB) - [...POSSIBLE_VULNERABILITIES_SEVERITY].indexOf(valueA),
			renderCell: ({ value: v }) => (
				<Warning
					titleAccess={capitalize(v)}
					sx={{ color: (t) => (t.palette[`${v}VulnerabilityWarning`].main) }}
				/>
			),
		},
		{
			field: "Module",
			minWidth: 170,
			valueGetter: ({ row }) => row.moduleName,
		},
		{
			field: "Recommendation",
			flex: 1,
			sortable: false,
			align: "left",
			valueGetter: ({ row }) => (
				<div style={{ padding: "1rem", overflow: "auto", maxHeight: "25vh" }}>
					<MarkdownViewer
					// ref={markdownViewerRef}
						content={row.recommendation}
					/>
				</div>
			),
		},
		{
			field: "Description",
			flex: 0.5,
			sortable: false,
			align: "left",
			valueGetter: ({ row }) => row.description,
		},
	], []);

	return (
		<StyledCard
			boldHeader
			className={classes.content}
			title={title}
			tooltip={tooltip}
			contentStyle={{ display: "flex", flexDirection: "column", flexGrow: 1 }}
			rating={Number.parseInt(score, 10) || 0}
		>
			<Grid container direction="column" justifyContent="space-between" spacing={2} m={-1} flexGrow={1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
				<Grid item>
					<Typography variant="h6" align="center" className={classes.rating} sx={{ mb: 2.5 }}>
						{Number.parseFloat(value.toFixed(2), 10)}
					</Typography>
					{numOfFiles ? (
						<>
							<Typography align="center">
								<MaterialLink
									underline="none"
									sx={{ fontWeight: "bold" }}
									component={Link}
									to={queryString.stringifyUrl({ url: `/${pathname.split("/").filter(Boolean).slice(0, -1).join("/")}/files`, query: { ...queryString.parse(search), metricType: title } })}
								>
									{pluralize("file", numOfFiles, true)}
								</MaterialLink>
								{` ${reason === "exceed" ? (numOfFiles === 1 ? "exceeds" : "exceed") : numOfFiles === 1 ? "falls below" : "fall below"
								} recommended value (${threshold})`}
							</Typography>
							<Typography align="center" className={classes.affects}>
								{"Affects "}
								<span className={classes.secondaryColor}>{`${percentageOfCode.toFixed(2)}%`}</span>
								{" of source code."}
							</Typography>
						</>
					) : title !== "Security Vulnerabilities of Dependencies" && (
						<Typography align="center">
							{` No files ${reason === "exceed" ? "exceed" : "fall below"} recommended value (${threshold})`}
						</Typography>
					)}
					{moreInfo?.vulnerabilities && !moreInfo.hasDependenciesFile && (
						<Typography variant="body2" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
							<Warning sx={{ color: (t) => t.palette.red[900] }} />
							{`We couldn’t find a ${{
								python: "requirements.txt",
								php: "composer.json",
								java: "pom.xml",
							}[language] || "lock"} file to check for security issues!`}
						</Typography>
					)}
					<br />
					<Typography align="center">{numOfFiles ? content : `Hint: Always ${content.toLowerCase()}`}</Typography>
				</Grid>
				{moreInfo?.vulnerabilities?.length > 0 && (
					<Grid container item justifyContent="center">
						<Button variant="contained" onClick={() => setOpen((p) => !p)}>{"More info"}</Button>
					</Grid>
				)}
				<Grid item sx={{ display: "flex", flexDirection: "row", justifyContent: "flex-end" }}>
					{enableTaskButton ? (
						<IconButton
							disabled={!enableTaskButton}
							color="primary"
							title="Convert to Task"
							onClick={() => navigate(queryString.stringifyUrl({
								url: `/projects/${projectid}/project-analytics/`,
								query: { ...queryString.parse(search), title, body: content },
							}))}
						>
							<PostAdd />
						</IconButton>
					) : (
						<Tooltip title="Project Analytics are not enabled for this project" titleVariant="body2" placement="left">
							<span>
								<IconButton
									disabled={!enableTaskButton}
									color="primary"
									title="Convert to Task"
									onClick={() => navigate(queryString.stringifyUrl({
										url: `/projects/${projectid}/project-analytics/`,
										query: { ...queryString.parse(search), title, body: content },
									}))}
								>
									<PostAdd />
								</IconButton>
							</span>
						</Tooltip>
					)}

					<Box sx={{ flexGrow: 1 }} />
					{affects.map((el, ind) => (
						<Tooltip key={`metric_avatar_${el}_${ind}`} title={el} titleVariant="body2" placement="left">
							<Avatar sx={{ mx: 0.5 }} className={classes.avatarIcon}>
								{el === "Maintainability" && <Build />}
								{el === "Security" && <Security />}
								{el === "Readability" && <MenuBook />}
								{el === "Reusability" && <Cached />}
							</Avatar>
						</Tooltip>
					))}
				</Grid>
			</Grid>
			<Modal
				open={open}
				style={{ display: "flex", justifyContent: "center", overflowY: "scroll" }}
				onClose={() => setOpen(false)}
			>
				<Box sx={{ width: "90%", my: 4 }}>
					<DataTable
						rows={moreInfo?.vulnerabilities}
						columns={tableColumns}
						getRowId={(e) => `${e.moduleName}_${e.recommendation}`}
						initialState={{ sorting: { sortModel: [{ field: "Severity", sort: "asc" }] }, pagination: { paginationModel: { page: 0 } } }}
					/>
					<IconButton
						style={{ color: "white", position: "absolute", top: "0.5%", right: "1%", ".>hover": { backgroundColor: "transparent" } }}
						onClick={() => setOpen(false)}
					>
						<Close />
					</IconButton>
				</Box>
			</Modal>
		</StyledCard>
	);
};

MetricTile.propTypes = {
	title: PropTypes.string,
	tooltip: PropTypes.string,
	value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	score: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	content: PropTypes.string,
	affects: PropTypes.array,
	threshold: PropTypes.string,
	numOfFiles: PropTypes.number,
	percentageOfCode: PropTypes.number,
	reason: PropTypes.string,
	moreInfo: PropTypes.object,
	language: PropTypes.string,
	enableTaskButton: PropTypes.bool,
};

export default memo(MetricTile);
