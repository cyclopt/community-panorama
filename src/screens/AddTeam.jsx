import { useState, useEffect, memo, useMemo } from "react";
import { styled } from "@mui/material/styles";
import { Button, CircularProgress, Grid, Typography, LinearProgress, Box, TextField, Stack } from "@mui/material";
import { useHotkeys } from "react-hotkeys-hook";
import { PriorityHigh } from "@mui/icons-material";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useImmer } from "use-immer";
import deepEqual from "deep-equal";

import { useSnackbar, jwt } from "../utils/index.js";
import Card from "../components/Card.jsx";
import Tooltip from "../components/Tooltip.jsx";
import TeamMembersTable from "../components/TeamMembersTable.jsx";
import { createTeam, validateTeam, useOrganization } from "../api/index.js";

const classes = {
	buttonProgress: "UpdateProject-buttonProgress",
	changeButton: "UpdateProject-changeButton",
	label: "UpdateProject-label",
	list: "UpdateProject-list",
};

const Root = styled("div")(({ theme }) => ({
	[`& .${classes.label}`]: {
		color: theme.palette.primary.main,
	},
	[`& .${classes.list}`]: {
		paddingTop: theme.spacing(1),
		borderWidth: theme.spacing(0.2),
		borderStyle: "solid",
		borderColor: theme.palette.primary.main,
		borderRadius: theme.shape.borderRadius,
		justifyContent: "center",
	},
}));

// NOTE: pass current organizations data to add-team
const AddTeam = () => {
	const { organizationid } = useParams();
	const { organization = {}, isError } = useOrganization(organizationid);
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const { username: viewer } = useMemo(() => jwt.decode(), []);

	const initialTeamMembers = useMemo(() => (organization?.members
		?.filter((m) => m.user.username !== viewer)
		?.map((m) => (
			{ 	...m.user,
				isTeamAdmin: m.role === "admin",
				isAdmin: m.role === "admin",
				isDeleted: !(m.role === "admin"),
			}))
		.sort((m) => (m.isAdmin ? -1 : +1))), [organization?.members, viewer]);

	const [team, setTeam] = useImmer({
		name: "",
		members: [],
	});
	const [submitting, setSubmitting] = useState(false);
	const { error } = useSnackbar();

	const viewerIsAdmin = organization?.members?.find((e) => e.user.username === viewer)?.role === "admin";

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	useEffect(() => {
		setTeam((p) => {
			p.members = initialTeamMembers;
		});
	}, [initialTeamMembers, setTeam]);

	useEffect(() => {
		if (!viewerIsAdmin) {
			const pathSegments = pathname?.split("/");
			pathSegments.pop();
			navigate(pathSegments.join("/") || "/");
		}
	}, [navigate, pathname, viewerIsAdmin]);

	const submitCreateTeam = async (e) => {
		e.preventDefault();

		setSubmitting(true);
		try {
			await validateTeam(organizationid, team);
			const { _id: teamId } = await createTeam(organizationid, team);
			navigate(`/organizations/${organizationid}/teams/${teamId}`);
		} catch (error_) {
			const errorMsg = await error_.response.text() ?? "Oops, something went wrong ";
			error(errorMsg);
		}

		setSubmitting(false);
	};

	useHotkeys(
		"ctrl+enter",
		(e) => {
			submitCreateTeam(e);
		},
		{
			enableOnFormTags: true,
			enabled: !(submitting || !(team?.name)),
		},
	);

	return (
		<Root className="container">
			<div className="container" style={{ padding: "3rem 1.5rem" }}>
				<Card title="Add new Team">
					{submitting ? (
						<Grid container justifyContent="center" align="center" direction="column" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
							<Grid item>
								<Typography gutterBottom variant="h5" color="primary">{"Creating your team. Please don’t close this window!"}</Typography>
							</Grid>
							<Grid item><LinearProgress color="primary" /></Grid>
						</Grid>
					) : (
						<form style={{ margin: "1rem" }} onSubmit={async (e) => { await submitCreateTeam(e); }}>
							<div className="field is-horizontal">
								<Box className="label field-label is-normal" sx={{ color: "primary.main" }}>{"Name:"}</Box>
								<div className="field-body">
									<div className="field">
										<div className="control">
											<TextField
												color="secondary"
												sx={{ width: "100%" }}
												size="small"
												value={team.name}
												placeholder="Team name"
												InputProps={{ ...(team.name ? {} : { endAdornment: <Tooltip title="Field Required"><PriorityHigh color="error" /></Tooltip> }) }}
												onChange={({ target: { value } }) => setTeam((p) => { p.name = value; })}
											/>
										</div>
									</div>
								</div>
							</div>
							<div className="field is-horizontal">
								<div className={clsx("label field-label is-normal", classes.label)}>{"Members:"}</div>
								<div className="field-body">
									<TeamMembersTable
										label="team"
										collaborators={team?.members}
										viewerIsAdmin={viewerIsAdmin}
										viewerAvatar={organization?.members?.find((m) => m.user.username === viewer)?.user?.avatar}
										setTeam={(e) => setTeam(e)}
									/>
								</div>
							</div>
							<Grid container direction="row" justifyContent="flex-end" alignItems="center" mb={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
								<Stack
									direction="row"
									justifyContent="center"
									alignItems="center"
									spacing={2}
								>
									<Button
										variant="outlined"
										size="medium"
										type="button"
										disabled={(team.name === "" && deepEqual(team.members, initialTeamMembers))}
										onClick={() => {
											setTeam((p) => { Object.assign(p, { ...p, name: "", members: initialTeamMembers }); });
										}}
									>
										{"reset"}
									</Button>
									<Button
										variant="contained"
										color="secondary"
										size="medium"
										type="submit"
										sx={{ color: "common.white" }}
										disabled={submitting || !(team?.name)}
									>
										{submitting
											? (<CircularProgress size={24} sx={{ color: "common.white" }} />)
											: "Done"}
									</Button>
								</Stack>

							</Grid>
						</form>
					)}
				</Card>
			</div>
		</Root>
	);
};

export default memo(AddTeam);
