import { useEffect, memo, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Typography, Grid, LinearProgress, Box, Chip, Link as MaterialLink } from "@mui/material";
import { Remove } from "@mui/icons-material";
import { Image } from "mui-image";
import pluralize from "pluralize";

import useGlobalState from "../use-global-state.js";
import { isFuzzyMatch, jwt, useSnackbar } from "../utils/index.js";
import { useOrganizations } from "../api/index.js";
import InfoTile from "../components/InfoTile.jsx";
import DataTable from "../components/DataTable.jsx";
import ProjectImage from "../assets/images/tiles/project.png";
import OrganizationImage from "../assets/images/tiles/organization.png";
import TeamsImage from "../assets/images/tiles/teams.png";
import { PrimaryBorderButton } from "../components/Buttons.jsx";

const Organizations = () => {
	const { username, id } = jwt.decode();
	const { error } = useSnackbar();
	const { organizations = [], isError, isLoading } = useOrganizations();
	const { setTeamName, setSelectedOrganization } = useGlobalState(useCallback((e) => ({
		setTeamName: e.setTeamName,
		setSelectedOrganization: e.setSelectedOrganization,
	}), []));

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	const tileInfo = useMemo(() => {
		const info = organizations?.reduce((acc, cur) => {
			acc.teams += cur?.teams?.length ?? 0;

			for (const team of (cur?.teams ?? [])) {
				const role = team.members?.find((m) => m.user === id)?.role;
				if (role === "admin") acc.adminInTeams += 1;

				for (const pr of (team?.projects ?? [])) {
					acc.projects.add(pr);
				}
			}

			if (cur?.members.some((a) => (a.user._id === id && a.role === "admin"))) acc.adminInOrgs += 1;

			return acc;
		}, {
			projects: new Set(),
			adminInOrgs: 0,
			adminInTeams: 0,
			teams: 0,
		});

		return info;
	}, [organizations, id]);

	const tableColumns = useMemo(() => [
		{
			field: "Organization",
			align: "left",
			flex: 1,
			valueGetter: ({ row }) => row.name,
			renderCell: ({ row, value }) => (
				<Box display="flex" ml={1}>
					<MaterialLink
						underline="none"
						component={Link}
						to={`${row._id}`}
						sx={{ mr: 1 }}
						onClick={() => setSelectedOrganization({ _id: row._id, name: value })}
					>
						<Typography>
							{value}
						</Typography>
					</MaterialLink>
				</Box>
			),
		},
		{
			field: "Teams",
			flex: 1,
			sortable: false,
			valueGetter: ({ row }) => row.teams,
			getApplyQuickFilterFn: (searchValue) => ({ value }) => isFuzzyMatch(value.map((e) => e.name).join(", "), searchValue),
			renderCell: ({ value, row }) => (
				<Grid container flexDirection="column" justifyContent="center" alignItems="center">
					{(value?.length > 0)
						? (
							<Grid container display="flex" justifyContent="center" alignItems="center">
								{value.map((v) => (
									<Grid key={`${v.name}_${v._id}`} item m={0.5} flexDirection="row" justifyContent="center" alignItems="center" flexWrap="nowrap">
										<MaterialLink
											underline="none"
											component={Link}
											to={`/organizations/${row._id}/teams/${v._id}`}
											onClick={() => { setTeamName(v.name); setSelectedOrganization({ _id: row._id, name: row.name }); }}
										>
											<Chip clickable size="small" label={v.name} />
										</MaterialLink>
									</Grid>
								))}
							</Grid>
						)
						: <Remove />}
				</Grid>
			),
		},
		{
			field: "Members",
			flex: 1,
			sortable: false,
			valueGetter: ({ row }) => row.members,
			getApplyQuickFilterFn: (searchValue) => ({ value }) => (
				isFuzzyMatch([...new Set(value?.map((v) => v.user.username))], searchValue)
			),
			renderCell: ({ value }) => (
				value.length > 0
					? (
						<Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
							{value?.map(({ user: { username: usrname, avatar, _id } }, ind) => (
								<Image
									key={`${usrname}_${ind}_${_id}`}
									src={avatar}
									alt={usrname}
									title={usrname}
									width="24px"
									height="24px"
									wrapperStyle={{ margin: "0.2rem" }}
									sx={{ borderRadius: "50%" }}
								/>
							))}
						</Box>
					) : <Remove />),
		},
	], [setSelectedOrganization, setTeamName]);

	return (
		<>
			{isLoading && (<LinearProgress color="primary" />)}
			<section style={{ paddingTop: "1rem" }}>
				<div className="container">
					<Typography gutterBottom variant="h4">{`Hi there, ${username || ":-)"}`}</Typography>
					<Box width="100%" mb={3}>
						<Grid container xs={12} sx={{ "> .MuiGrid-item": { p: 1, ":first-child": { pl: 0 }, ":last-child": { pr: 0 } } }}>
							<InfoTile imageSrc={ProjectImage} value={tileInfo?.projects?.size ?? 0} label={`${pluralize("Org", organizations?.length ?? 0)} ${pluralize("Project", (tileInfo?.projects?.size ?? 0))}`} />
							<InfoTile imageSrc={OrganizationImage} value={tileInfo?.adminInOrgs ?? 0} label={`${pluralize("orgs", tileInfo?.adminInOrgs ?? 0)} you’re managing`} />
							<InfoTile imageSrc={TeamsImage} value={tileInfo?.teams ?? 0} label={pluralize("team", tileInfo?.teams ?? 0)} />
							<InfoTile imageSrc={TeamsImage} value={tileInfo?.adminInTeams ?? 0} label={`${pluralize("team", tileInfo?.adminInTeams ?? 0)} you’re managing`} />
						</Grid>
					</Box>
					<Grid container direction="row" justifyContent="flex-end" mb={2}>
						<Grid item mt={1} display="flex" flexDirection="row">
							<Grid mr={1}>
								<PrimaryBorderButton
									variant="outlined"
									component={Link}
									to="/projects"
								>
									{"Projects"}
								</PrimaryBorderButton>
							</Grid>
						</Grid>
					</Grid>
					<DataTable
						rows={organizations}
						loading={isLoading}
						columns={tableColumns}
						noRowsLabel="Not a member of any organization!"
						initialState={{ pagination: { paginationModel: { page: 0 } } }}
					/>
				</div>
			</section>
		</>
	);
};

export default memo(Organizations);
