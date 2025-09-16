import { useCallback, useEffect, useMemo } from "react";
import { Typography, LinearProgress, Grid, ListItem, List, Link as MaterialLink, ListItemAvatar, Avatar, Badge } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Link, useNavigate } from "react-router-dom";
import { dateNewToOld, numberSmallToLarge } from "@iamnapo/sort";
import pluralize from "pluralize";
import { Assignment, AssignmentTurnedIn, PublishedWithChanges } from "@mui/icons-material";

import { useDigest } from "../api/index.js";
import { convertQualityScoreToLetter, dayjs } from "../utils/index.js";
import Card from "../components/Card.jsx";
import useGlobalState from "../use-global-state.js";

const StyledBadge = styled(Badge, { shouldForwardProp: (p) => p !== "dropped" })(({ theme, dropped = true }) => ({
	"& .MuiBadge-badge": {
		backgroundColor: theme.palette[dropped ? "red" : "green"][500],
		color: theme.palette[dropped ? "red" : "green"][500],
		boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
		"&::after": {
			position: "absolute",
			top: 0,
			left: 0,
			width: "100%",
			height: "100%",
			borderRadius: "50%",
			animation: "ripple 1.2s infinite ease-in-out",
			border: "1px solid currentColor",
			content: "\"\"",
		},
	},
	"@keyframes ripple": {
		"0%": {
			transform: "scale(.8)",
			opacity: 1,
		},
		"100%": {
			transform: "scale(2.4)",
			opacity: 0,
		},
	},
}));

const StyledAvatar = styled(Avatar)({
	width: "24px",
	height: "24px",
	backgroundColor: "transparent",
});

const Digest = () => {
	const navigate = useNavigate();
	const from = useMemo(() => dayjs().subtract(2, "weeks"), []);
	const { digest = [], isLoading, isError } = useDigest(from.toISOString());
	const setShowNotificationBadge = useGlobalState(useCallback((e) => e.setShowNotificationBadge, []));

	useEffect(() => {
		if (isError) navigate("/projects");
	}, [isError, navigate]);

	useEffect(() => setShowNotificationBadge(false), [setShowNotificationBadge]);

	const taskUpdates = useMemo(() => {
		const res = [];
		for (const [pInd, project] of digest.entries()) {
			for (const [iUCInd, comment] of project.tasksUpdates.commented.entries()) {
				res.push([(
					<ListItem key={`tasksUpdates${pInd}_commented_${iUCInd}`}>
						<Typography>
							{"Task "}
							<MaterialLink
								underline="none"
								component={Link}
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}/project-analytics/management?id=${comment._id}`}
							>
								{comment.title}
							</MaterialLink>
							{" has a new comment by "}
							<MaterialLink
								underline="none"
								component={Link}
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}/project-analytics/collaborators/${comment.author._id}`}
							>
								{comment.author.username}
							</MaterialLink>
							{"."}
						</Typography>
					</ListItem>
				), comment.createdAt]);
			}

			for (const [iUOInd, task] of project.tasksUpdates.opened.entries()) {
				res.push([(
					<ListItem key={`tasksUpdates${pInd}_closed_${iUOInd}`}>
						<Typography>
							<MaterialLink
								underline="none"
								component={Link}
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}/project-analytics/collaborators/${task.openedBy._id}`}
							>
								{task.openedBy.username}
							</MaterialLink>
							{" opened task "}
							<MaterialLink
								component={Link}
								underline="none"
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}/project-analytics/management?id=${task._id}`}
							>
								{task.title}
							</MaterialLink>
							{"."}
						</Typography>
					</ListItem>
				), task.createdAt]);
			}

			for (const [iUCInd, task] of project.tasksUpdates.closed.entries()) {
				res.push([(
					<ListItem key={`tasksUpdates${pInd}_opened_${iUCInd}`}>
						<Typography>
							<MaterialLink
								underline="none"
								component={Link}
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}/project-analytics/collaborators/${task.closedBy._id}`}
							>
								{task.closedBy.username}
							</MaterialLink>
							{" closed task "}
							<MaterialLink
								component={Link}
								underline="none"
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}/project-analytics/management?id=${task._id}`}
							>
								{task.title}
							</MaterialLink>
							{"."}
						</Typography>
					</ListItem>
				), task.closedAt]);
			}
		}

		res.sort(dateNewToOld((v) => new Date(v[1])));
		return res.map((e) => e[0]);
	}, [digest]);

	const nutshell = useMemo(() => {
		const res = [];
		for (const [pInd, project] of digest.entries()) {
			if (
				project.qualityChange
				&& convertQualityScoreToLetter(project.qualityChange.from) !== convertQualityScoreToLetter(project.qualityChange.to)
			) {
				res.push([(
					<ListItem key={`nutshell_qualityChange${pInd}`}>
						<ListItemAvatar sx={{ minWidth: 30 }}>
							<StyledBadge
								overlap="circular"
								anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
								variant="dot"
								dropped={project.qualityChange.from > project.qualityChange.to}
							>
								<StyledAvatar>
									<Assignment color="primary" />
								</StyledAvatar>
							</StyledBadge>
						</ListItemAvatar>
						<Typography>
							{"The quality of project "}
							<MaterialLink
								underline="none"
								component={Link}
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}`}
							>
								{project.name}
							</MaterialLink>
							{` has ${project.qualityChange.from > project.qualityChange.to ? "dropped" : "increased"} from ${
								convertQualityScoreToLetter(project.qualityChange.from)} to ${convertQualityScoreToLetter(project.qualityChange.to)}.`}
						</Typography>
					</ListItem>
				), 0]);
			}

			if (project.tasksUpdates.opened.length > 0) {
				res.push([(
					<ListItem key={`nutshell_opened${pInd}`}>
						<ListItemAvatar sx={{ minWidth: 30 }}>
							<StyledAvatar>
								<AssignmentTurnedIn color="primary" />
							</StyledAvatar>
						</ListItemAvatar>
						<Typography>
							<MaterialLink
								underline="none"
								component={Link}
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}/project-analytics/management`}
							>
								{pluralize("new task", project.tasksUpdates.opened.length, true)}
							</MaterialLink>
							{` ${project.tasksUpdates.opened.length > 1 ? "were" : "was"} opened in project `}
							<MaterialLink
								underline="none"
								component={Link}
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}`}
							>
								{project.name}
							</MaterialLink>
							{"."}
						</Typography>
					</ListItem>
				), 1]);
			}

			if (project.tasksUpdates.closed.length > 0) {
				res.push([(
					<ListItem key={`nutshell_closed${pInd}`}>
						<ListItemAvatar sx={{ minWidth: 30 }}>
							<StyledAvatar>
								<AssignmentTurnedIn color="primary" />
							</StyledAvatar>
						</ListItemAvatar>
						<Typography>
							{"Project "}
							<MaterialLink
								underline="none"
								component={Link}
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}`}
							>
								{project.name}
							</MaterialLink>
							{" has "}
							<MaterialLink
								underline="none"
								component={Link}
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}/project-analytics/management`}
							>
								{pluralize("task", project.tasksUpdates.closed.length, true)}
							</MaterialLink>
							{" closed."}
						</Typography>
					</ListItem>
				), 2]);
			}

			let commits = 0;
			let additions = 0;
			let deletions = 0;
			for (const v of Object.values(project.commitUpdates)) {
				commits += v.commits;
				additions += v.additions;
				deletions += v.deletions;
			}

			if (commits > 0) {
				res.push([(
					<ListItem key={`nutshell_commits${pInd}`}>
						<ListItemAvatar sx={{ minWidth: 30 }}>
							<StyledAvatar>
								<PublishedWithChanges color="primary" />
							</StyledAvatar>
						</ListItemAvatar>
						<Typography>
							{"Project "}
							<MaterialLink
								underline="none"
								component={Link}
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}`}
							>
								{project.name}
							</MaterialLink>
							{" has "}
							<MaterialLink
								underline="none"
								component={Link}
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}/project-analytics/collaborators`}
							>
								{pluralize("new commit", commits, true)}
							</MaterialLink>
							{` with ${pluralize("addition", additions, true)} and  ${pluralize("deletion", deletions, true)}.`}
						</Typography>
					</ListItem>
				), 3]);
			}
		}

		res.sort(numberSmallToLarge((v) => v[1]));
		return res.map((e) => e[0]);
	}, [digest]);

	const commitUpdates = useMemo(() => {
		const res = [];
		for (const [pInd, project] of digest.entries()) {
			for (const [cUInd, entry] of Object.entries(project.commitUpdates).entries()) {
				res.push((
					<ListItem key={`commitUpdates_${pInd}_${cUInd}`}>
						<Typography>
							<MaterialLink
								underline="none"
								component={Link}
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}/project-analytics/collaborators/${entry[1]._id}`}
							>
								{entry[0]}
							</MaterialLink>
							{` has made ${pluralize("commit", entry[1].commits, true)} to project `}
							<MaterialLink
								underline="none"
								component={Link}
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}`}
							>
								{project.name}
							</MaterialLink>
							{"."}
						</Typography>
					</ListItem>
				));
			}
		}

		return res;
	}, [digest]);

	const mentionUpdates = useMemo(() => {
		const res = [];
		for (const [pInd, project] of digest.entries()) {
			for (const [iUMInd, task] of project.tasksUpdates.mentioned.entries()) {
				res.push([(
					<ListItem key={`tasksUpdates${pInd}_mentioned_${iUMInd}`}>
						<Typography>
							{`Mentioned in ${task.isComment ? "a comment of " : ""}task `}
							<MaterialLink
								component={Link}
								underline="none"
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}/project-analytics/management?id=${task._id}`}
							>
								{task.title}
							</MaterialLink>
							{" of project "}
							<MaterialLink
								component={Link}
								underline="none"
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}`}
							>
								{project.name}
							</MaterialLink>
							{" by "}
							<MaterialLink
								component={Link}
								underline="none"
								sx={{ fontWeight: "bold" }}
								to={`/projects/${project._id}/project-analytics/collaborators/${task.mentionedBy._id}`}
							>
								{task.mentionedBy.username}
							</MaterialLink>
							{"."}
						</Typography>
					</ListItem>
				), task.mentionedAt]);
			}
		}

		res.sort(dateNewToOld((v) => new Date(v[1])));
		return res.map((e) => e[0]);
	}, [digest]);

	return (
		<>
			{isLoading && (<LinearProgress color="primary" />)}
			<section style={{ paddingTop: "1rem" }}>
				<div className="container">
					<Typography variant="h4">{"Digest"}</Typography>
					<Typography variant="body2">
						{`Changes since ${from.fromNow()}.`}
					</Typography>
				</div>
			</section>
			<section style={{ paddingTop: "1rem" }}>
				<div className="container">
					<Grid item container direction="row" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }} justifyContent="center" alignItems="stretch">
						<Grid item md xs={12}>
							<Card
								title="In a nutshell"
								tooltip={`Check your most important updates at a glance. Be aware of changes in your project‘s quality
								and check the progress of your tasks.`}
							>
								{nutshell.length > 0
									? (<List dense style={{ maxHeight: "24rem", overflow: "auto" }}>{nutshell}</List>)
									: (<Typography align="center"><em>{"Nothing yet."}</em></Typography>)}
							</Card>
						</Grid>
						<Grid item md xs={12}>
							<Card title="Mentions" tooltip="Find out tasks and comments that you were mentioned in.">
								{mentionUpdates.length > 0
									? (<List dense style={{ maxHeight: "24rem", overflow: "auto" }}>{mentionUpdates}</List>)
									: (<Typography align="center"><em>{"Nothing yet."}</em></Typography>)}
							</Card>
						</Grid>
						<Grid item container direction="row" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }} justifyContent="center" alignItems="stretch">
							<Grid item md xs={12}>
								<Card
									title="Task Updates"
									tooltip="Find out the most recent task updates of your project and check your upcoming current tasks."
								>
									{taskUpdates.length > 0
										? (<List dense style={{ maxHeight: "24rem", overflow: "auto" }}>{taskUpdates}</List>)
										: (<Typography align="center"><em>{"Nothing yet."}</em></Typography>)}
								</Card>
							</Grid>
							<Grid item md xs={12}>
								<Card
									title="Commit Updates"
									tooltip="Get updates on the latest commits of your team and be aware of the progress in each project."
								>
									{commitUpdates.length > 0
										? (<List dense style={{ maxHeight: "24rem", overflow: "auto" }}>{commitUpdates}</List>)
										: (<Typography align="center"><em>{"Nothing yet."}</em></Typography>)}
								</Card>
							</Grid>
						</Grid>
					</Grid>
				</div>
			</section>
		</>
	);
};

export default Digest;
