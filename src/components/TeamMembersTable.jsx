import { useMemo } from "react";
import PropTypes from "prop-types";
import { IconButton, Avatar, Badge, Grid, Typography, Box, Switch, Grow } from "@mui/material";
import { Add, GitHub } from "@mui/icons-material";

import { jwt } from "../utils/index.js";

import Tooltip from "./Tooltip.jsx";
import AzureIcon from "./AzureIcon.jsx";
import BitBucketIcon from "./BitBucketIcon.jsx";
import GitLabIcon from "./GitLabIcon.jsx";

const TeamMembersTable = ({ collaborators, viewerIsAdmin, viewerAvatar, setTeam, label }) => {
	const { username: viewer, type = "github", email: emailS } = useMemo(() => jwt.decode(), []);

	return (
		<>
			<Grow in={collaborators?.length > 0}>
				<Grid item xs={12} sx={{ display: collaborators?.length > 0 ? "block" : "none" }}>
					<Box mb={1} sx={{ display: "flex", border: 1, borderRadius: "0.5rem", flexFlow: "wrap", flex: "start" }}>
						<Grid
							key={`${viewer}_`}
							container
							p={1}
							xs={12}
							sm={6}
							lg={4}
							direction="row"
							sx={{
								alignItems: "center",
								justifyContent: "center",
								height: "100%",
							}}
						>
							<Grid item xs={1} display="flex" justifyContent="center">
								<Tooltip
									title="That’s you."
								>
									<IconButton
										disableRipple
										disabled
										size="small"
										edge="end"
										color="pink"
									>
										<Add className="remove-collaborator" />
									</IconButton>
								</Tooltip>
							</Grid>
							<Grid
								item
								xs={11}
								sx={{
									display: "flex",
									justifyContent: "space-around",
									alignItems: "center",
									transition: "opacity 200ms",
								}}
							>
								<Grid item xs={2}>
									<Badge
										overlap="circular"
										anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
										badgeContent={(
											<Box
												sx={{
													backgroundColor: "white",
													borderRadius: "50%",
													height: "1rem",
													width: "1rem",
													display: "flex",
													justifyContent: "center",
													alignItems: "center",
												}}
											>
												{type === "github"
													? <GitHub style={{ fontSize: "0.9rem" }} />
													: type === "bitbucket"
														? <BitBucketIcon style={{ fontSize: "0.7rem" }} />
														: type === "azure"
															? <AzureIcon style={{ fontSize: "inherit" }} />
															: <GitLabIcon style={{ fontSize: "inherit" }} />}
											</Box>
										)}
									>
										<Avatar alt="test" sx={{ height: "3rem", width: "3rem" }} src={viewerAvatar} />
									</Badge>
								</Grid>
								<Grid container xs={8} align="start" p={1}>
									<Grid item display="flex" flexDirection="row" justifyContent="space-between" sx={{ width: "100%" }}>
										<Typography style={{ textOverflow: "ellipsis", overflow: "hidden" }}>
											{viewer}
										</Typography>
									</Grid>
									<Grid item display="flex" flexDirection="row" style={{ width: "100%" }}>
										<Typography variant="caption" style={{ textOverflow: "ellipsis", overflow: "hidden" }}>{emailS}</Typography>
									</Grid>
									<Typography variant="caption">
										{`${label === "project" ? "Project" : "Team"} Admin`}
										<Switch
											disabled
											checked={viewerIsAdmin}
											edge="end"
											size="small"
										/>
									</Typography>
								</Grid>
							</Grid>
						</Grid>
						{collaborators?.map((
							{ username, isAdmin, isTeamAdmin, isProjectAdmin, isDeleted, type: mType, email, avatar },
							uIndex,
						) => (
							<Grid
								key={`${username}_${uIndex}`}
								container
								direction="row"
								sx={{
									alignItems: "center",
									justifyContent: "center",
									height: "100%",
								}}
								p={1}
								xs={12}
								sm={6}
								lg={4}
							>
								<Grid item xs={1} display="flex" justifyContent="center">
									<Tooltip
										title={isAdmin ? "Cannot remove organization admin" : isDeleted ? "Add to Project" : "Remove from project"}
									>
										{isAdmin}
										<IconButton
											disableRipple
											edge="end"
											aria-label={collaborators[uIndex]?.isDeleted ? "add" : "delete"}
											title={collaborators[uIndex]?.isDeleted ? "add" : "delete"}
											disabled={!viewerIsAdmin || isAdmin}
											size="small"
											color="pink"
											onClick={() => {
												setTeam((p) => {
													p.members[uIndex].isDeleted = !p.members[uIndex].isDeleted;
												});
											}}
										>
											<Add className={collaborators[uIndex]?.isDeleted ? "add-collaborator" : "remove-collaborator"} />
										</IconButton>
									</Tooltip>
								</Grid>
								<Grid
									item
									xs={11}
									sx={{
										display: "flex",
										justifyContent: "space-around",
										alignItems: "center",
										opacity: (isDeleted) ? 0.7 : 1,
										transition: "opacity 200ms",
									}}
								>
									<Grid item xs={2}>
										<Badge
											overlap="circular"
											anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
											badgeContent={(
												<Box
													sx={{
														backgroundColor: "white",
														borderRadius: "50%",
														height: "1rem",
														width: "1rem",
														display: "flex",
														justifyContent: "center",
														alignItems: "center",
													}}
												>
													{mType === "github"
														? <GitHub style={{ fontSize: "0.9rem" }} />
														: mType === "bitbucket"
															? <BitBucketIcon style={{ fontSize: "0.7rem" }} />
															: mType === "azure"
																? <AzureIcon style={{ fontSize: "inherit" }} />
																: <GitLabIcon style={{ fontSize: "inherit" }} />}
												</Box>
											)}
										>
											<Avatar alt="test" sx={{ height: "3rem", width: "3rem" }} src={avatar} />
										</Badge>
									</Grid>
									<Grid container xs={8} align="start" p={1} sx={{ overflowY: "auto" }}>
										<Grid item display="flex" flexDirection="row" justifyContent="space-between" sx={{ width: "100%" }}>
											<Typography style={{ textOverflow: "ellipsis", overflow: "hidden" }}>
												{username}
											</Typography>
										</Grid>
										<Grid item display="flex" flexDirection="row" style={{ width: "100%" }}>
											<Typography variant="caption" style={{ textOverflow: "ellipsis", overflow: "hidden" }}>{email}</Typography>
										</Grid>
										<Typography variant="caption">
											{`${label === "project" ? "Project" : "Team"} Admin`}
											<Switch
												disabled={isDeleted || !viewerIsAdmin || isAdmin}
												checked={!isDeleted && (isAdmin || (label === "team" ? isTeamAdmin : isProjectAdmin) || false)}
												edge="end"
												size="small"
												onChange={({ target: { checked } }) => {
													setTeam((p) => {
														p.members.find((e) => e.username === username)[`is${label === "project" ? "Project" : "Team"}Admin`] = checked;
													});
												}}
											/>
										</Typography>
									</Grid>
								</Grid>
							</Grid>
						))}
					</Box>
				</Grid>
			</Grow>
			{collaborators?.length <= 0
			&& (
				<Typography variant="caption" sx={{ alignSelf: "center" }}>
					{"There are no other members in this organization"}
				</Typography>
			)}

		</>
	);
};

TeamMembersTable.propTypes = {
	collaborators: PropTypes.array,
	label: PropTypes.string,
	viewerIsAdmin: PropTypes.bool,
	viewerAvatar: PropTypes.string,
	setTeam: PropTypes.func,
};

export default TeamMembersTable;
