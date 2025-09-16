import { memo, useMemo } from "react";
import { Box, Typography, Switch, Grid, Stack, styled } from "@mui/material";
import { QuestionMark } from "@mui/icons-material";
import PropTypes from "prop-types";

import Tooltip from "../Tooltip.jsx";
import SectionTitle from "../SectionTitle.jsx";

// ─── UTILS ─────────────────────────────────────────────────────────────────
const colorIds = [true, false];

const groupRepositories = (repositories) => {
	const rawGroups = Object.entries(
		(repositories || []).reduce((acc, { _id, owner, name }) => {
			const key = `${owner}/${name}`;
			(acc[key] ??= []).push(_id);
			return acc;
		}, {}),
	);

	const sorted = rawGroups.sort((a, b) => a[0].localeCompare(b[0]));
	let prevOwner = null;
	let colorIdx = -1;

	return sorted.map(([repo, ids]) => {
		const [owner] = repo.split("/");
		if (owner !== prevOwner) {
			prevOwner = owner;
			colorIdx = (colorIdx + 1) % 2;
		}

		return [repo, ids, colorIds[colorIdx]];
	});
};

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────
const RepoBox = styled(Box)(({ theme, highlight }) => ({
	padding: theme.spacing(1),
	boxShadow: 1,
	borderRadius: theme.shape.borderRadius,
	border: "1px solid #ccc",
	marginTop: theme.spacing(1),
	display: "flex",
	justifyContent: "space-between",
	...(highlight && { backgroundColor: theme.palette.grey.transparent }),
}));

const RepoName = styled(Typography)(() => ({
	wordBreak: "break-word",
}));

const PublicGrid = styled(Grid)(({ theme }) => ({
	paddingLeft: theme.spacing(1),
}));

const PrivateGrid = styled(Grid)(({ theme }) => ({
	position: "relative",
	padding: theme.spacing(0, 2),
	margin: theme.spacing(2, 0),
	"&::before": {
		content: "\"\"",
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
		width: 5,
		background: `linear-gradient(to right, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
	},
}));

// ─── INVOLVED REPOSITORIES COMPONENT ───────────────────────────────────────
const InvolvedRepositories = ({
	repositories = [],
	keysToExclude,
	isInEditMode = false,
	updateKeys,
	isLoading = false,
}) => {
	const excludedIds = useMemo(
		() => keysToExclude?.repositories || [],
		[keysToExclude],
	);

	const allGroups = useMemo(
		() => groupRepositories(repositories),
		[repositories],
	);

	const publicGroups = useMemo(
		() => groupRepositories(
			repositories.filter(
				(r) => !r.isPrivate && !excludedIds.includes(r._id.toString()),
			),
		),
		[repositories, excludedIds],
	);

	const privateGroups = useMemo(
		() => groupRepositories(
			repositories.filter(
				(r) => r.isPrivate && !excludedIds.includes(r._id.toString()),
			),
		),
		[repositories, excludedIds],
	);

	return (
		<SectionTitle
			title="Repositories Involved"
			isLoading={isLoading}
			customToolbar={(
				<Tooltip
					placement="top"
					title={(
						<Box sx={{ textAlign: "left" }}>
							<Typography variant="body2" sx={{ mt: 0.5 }}>
								{"The repositories that were used to calculate the developer’s stats."}
							</Typography>
						</Box>
					)}
				>
					<QuestionMark
						position="end"
						sx={{
							borderRadius: "100%",
							backgroundColor: "primary.main",
							p: (t) => t.spacing(0.5),
							height: (t) => t.spacing(3),
							aspectRatio: "1 / 1",
							minWidth: 0,
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							color: "white",
							"&:hover": { cursor: "pointer", color: "white" },
						}}
					/>
				</Tooltip>
			)}
		>
			{isInEditMode ? (
				allGroups.map(([repo, ids, highlight], idx) => {
					const allExcluded = ids.every((id) => excludedIds.includes(id));
					const disableSwitch = !allExcluded && repositories.length === excludedIds.length + 1;

					return (
						<RepoBox key={idx} highlight={highlight ? 1 : 0}>
							<RepoName>{repo}</RepoName>
							<Stack direction="row-reverse" alignItems="center" spacing={1}>
								<Typography variant="caption">{"Public"}</Typography>
								<Tooltip
									disabled={!disableSwitch}
									title="You must have at least one repository"
								>
									<span>
										<Switch
											size="small"
											checked={!allExcluded}
											disabled={disableSwitch}
											onChange={(e) => updateKeys(e, "repositories", ids)}
										/>
									</span>
								</Tooltip>
							</Stack>
						</RepoBox>
					);
				})
			) : (
				<Grid container spacing={2}>
					<PublicGrid item xs={12} sm={6}>
						<Typography fontWeight="bold">
							{`Public Repositories (${publicGroups.length})`}
						</Typography>
						{publicGroups.map(([repo], idx) => (
							<Typography key={idx} color="secondary">
								{"• "}
								{" "}
								{repo}
							</Typography>
						))}
					</PublicGrid>

					<PrivateGrid item xs={12} sm={6}>
						<Typography fontWeight="bold">
							{`Private Repositories (${privateGroups.length})`}
						</Typography>
						<Typography variant="caption" fontStyle="italic">
							{`This page also displays information sourced from ${privateGroups.length} private repositories.`}
						</Typography>
					</PrivateGrid>
				</Grid>
			)}
		</SectionTitle>
	);
};

InvolvedRepositories.propTypes = {
	repositories: PropTypes.array,
	keysToExclude: PropTypes.shape({
		repositories: PropTypes.array,
	}),
	isInEditMode: PropTypes.bool,
	isLoading: PropTypes.bool,
	updateKeys: PropTypes.func,
};

export default memo(InvolvedRepositories);
