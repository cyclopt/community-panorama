import { useCallback, useMemo, useEffect, useRef } from "react";
import { Menu, MenuItem, styled, Grid, Select, Typography, Box } from "@mui/material";
import PropTypes from "prop-types";
import { stringAToZInsensitive } from "@iamnapo/sort";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { shallow } from "zustand/shallow";
import queryString from "query-string";
import { useTour } from "@reactour/tour";

import { jwt, addProjectSteps, useSnackbar } from "../utils/index.js";
import useGlobalState from "../use-global-state.js";
import TeamAnalyticsImage from "../assets/images/buttons/team_analytics_button.png";
import SettingsImage from "../assets/images/buttons/settings.png";
import QualityGatesImage from "../assets/images/buttons/quality_gates_button.png";
import QualityAnalyticsImage from "../assets/images/buttons/quality_analytics_button.png";
import OverviewImage from "../assets/images/buttons/overview_button.png";

import Tooltip from "./Tooltip.jsx";
import PrimaryToggleButton from "./PrimaryToggleButton.jsx";
import { PrimaryBorderButton, PinkBackgroundButton } from "./Buttons.jsx";

import { useUserDefaultInfo, setDefaultPanoramaOrganization } from "#api";

const OrgSelect = styled(Select)(({ theme }) => ({
	backgroundColor: theme.palette.grey.dark,
	width: "100% !important",
	borderRadius: theme.shape.borderRadius,
	"& .MuiOutlinedInput-notchedOutline": {
		border: "none",
	},
	"& .MuiSelect-select": {
		padding: theme.spacing(1, 2),
		display: "flex",
		alignItems: "center",
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
}));

const OrganizationsPanel = ({
	orgs,
	mutateOrgs,
	projects,
	mutateProjects,
	anchorElOrganizations,
	handleOrganizationsMenuClose,
	...props
}) => {
	const { type = "github", username } = jwt.decode();
	const { setIsOpen, setSteps, setCurrentStep, isOpen, currentStep } = useTour();
	const { user = {}, isLoading: isUserLoading, isError: isUserError, mutate: userMutate } = useUserDefaultInfo();

	const { search } = useLocation();
	const { error } = useSnackbar();
	const isMenuOpenOrganizations = useMemo(() => Boolean(anchorElOrganizations), [anchorElOrganizations]);
	const { selectedOrganization, setSelectedOrganization } = useGlobalState(useCallback((e) => ({
		setSelectedOrganization: e.setSelectedOrganization,
		selectedOrganization: e.selectedOrganization,
	}), [], shallow));
	const navigate = useNavigate();

	// * -------------------- UPDATE PROJECTS/ORGANIZATIONS WHEN THE MENU OPENS -------------------
	useEffect(() => {
		if (isMenuOpenOrganizations) {
			mutateOrgs();
			mutateProjects();
		}
	}, [isMenuOpenOrganizations, mutateOrgs, mutateProjects]);
	// * ------------------------------------------------------------------------------------------

	useEffect(() => {
		if (isUserError) error();
	}, [error, isUserError]);

	const handleSelect = async (event) => {
		const _id = event.target.value;
		await setDefaultPanoramaOrganization(_id);
		userMutate();
		navigate(`/organizations/${_id}/overview`, { replace: true });
	};

	const organizationProjects = useMemo(
		() => projects.filter((p) => p.parentOrganization?._id === selectedOrganization._id),
		[projects, selectedOrganization._id],
	);

	// * ------------------------------------- TOUR HANDLING -------------------------------------

	const memoizedAddProjectSteps = useMemo(() => addProjectSteps(
		username,
		type,
		navigate,
	),
	// eslint-disable-next-line react-hooks/exhaustive-deps
	[type, username]);

	useEffect(() => {
		const parsed = queryString.parse(search);
		if (parsed.tour === "addProject") {
			setSteps(memoizedAddProjectSteps);
			setIsOpen(true);
		} else {
			setIsOpen(false);
		}

		if (parsed.tourStep !== currentStep) {
			setCurrentStep(Number(parsed.tourStep));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search, currentStep, memoizedAddProjectSteps]);

	// * -----------------------------------------------------------------------------------------

	// * ------------------------------ UPDATE DEFAULT ORGANIZATION ------------------------------

	// Αssign default panorama organization to user if none is set
	const triedSetDefaultRef = useRef(false);
	useEffect(() => {
		if (isUserLoading || isUserError || !orgs?.length) return;
		if (user?.defaultPanoramaOrganization) return;
		if (triedSetDefaultRef.current) return;
		triedSetDefaultRef.current = true;
		(async () => {
			try {
				await setDefaultPanoramaOrganization(orgs[0]._id);
				await userMutate(); // revalidate ONCE after successful set
			} catch {
				// error("Couldn’t set default organization.");
			}
		})();
	}, [isUserError, isUserLoading, orgs, user?.defaultPanoramaOrganization, userMutate]);

	// Update the global variable refering to organization
	useEffect(() => {
		if (isUserLoading || !orgs?.length) return;

		const defaultOrganizationId = user?.defaultPanoramaOrganization;

		const matchingOrganization = orgs.find((org) => org._id === defaultOrganizationId);

		if (!selectedOrganization?.name) {
			if (matchingOrganization) {
				setSelectedOrganization({ _id: defaultOrganizationId, name: matchingOrganization.name });
			} else if (orgs[0]?._id && orgs[0]?.name) {
				setSelectedOrganization({ _id: orgs[0]._id, name: orgs[0].name });
			}
		}
	}, [isUserLoading, orgs, selectedOrganization?.name, setSelectedOrganization, user]);

	// * -----------------------------------------------------------------------------------------

	return (
		<Menu
			keepMounted
			anchorEl={anchorElOrganizations}
			anchorOrigin={{ vertical: "top", horizontal: "right" }}
			transformOrigin={{ vertical: "top", horizontal: "right" }}
			open={isMenuOpenOrganizations}
			onClose={handleOrganizationsMenuClose}
			{...props}
		>
			{orgs.length > 0 && (
				<MenuItem
					key="org_menu"
					disableRipple
					onClick={(e) => e.stopPropagation()}
				>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: "1fr auto auto",
							columnGap: 1, // <-- real gap
							alignItems: "stretch",
							width: "100%",
						}}
					>
						<OrgSelect
							labelId="org-select-label"
							value={selectedOrganization?._id}
							label="Organization"
							width="100%"
							onChange={handleSelect}
						>
							{[...orgs]
								.sort(stringAToZInsensitive((v) => v.name))
								.map((org) => (
									<MenuItem key={org._id} value={org._id}>
										{org.name}
									</MenuItem>
								))}
						</OrgSelect>
						<PrimaryToggleButton
							size="medium"
							imageSources={{ normalSrc: TeamAnalyticsImage }}
							tooltipTitle="Team Analytics"
							sx={{ width: "100%", height: "100%", backgroundColor: (t) => t.palette.grey.dark, border: "1px solid transparent" }}
							component={Link}
							to={`/organizations/${selectedOrganization._id}/team-analytics`}
							onClick={handleOrganizationsMenuClose}
						/>
						<PrimaryToggleButton
							size="medium"
							imageSources={{ normalSrc: OverviewImage }}
							tooltipTitle="Overview"
							sx={{ width: "100%", height: "100%", backgroundColor: (t) => t.palette.grey.dark, border: "1px solid transparent" }}
							component={Link}
							to={`/organizations/${selectedOrganization._id}/overview`}
							onClick={handleOrganizationsMenuClose}
						/>
					</Box>
				</MenuItem>
			)}
			{[...organizationProjects].sort(stringAToZInsensitive((v) => v.name)).map((e) => (
				<MenuItem key={`${e._id}_projectsMenu}`} onClick={handleOrganizationsMenuClose}>
					<Grid container spacing={1}>
						<Grid item xs={8} sm={6}>
							<PrimaryBorderButton component={Link} width="100%" to={`/projects/${e._id}`}>
								<Tooltip title={e.name}>
									<Typography noWrap textAlign="start" sx={{ maxWidth: 100, color: "primary.main" }}>{e.name}</Typography>
								</Tooltip>
							</PrimaryBorderButton>
						</Grid>
						<Grid item xs={4} sm={2}>
							<PrimaryToggleButton
								size="medium"
								width="100%"
								imageSources={{ normalSrc: QualityAnalyticsImage }}
								tooltipTitle="Quality Analytics"
								sx={{ height: "100%" }}
								component={Link}
								to={`/projects/${e._id}/quality-analytics`}
							/>
						</Grid>
						<Grid item xs={6} sm={2}>
							<PrimaryToggleButton
								size="medium"
								width="100%"
								imageSources={{ normalSrc: QualityGatesImage }}
								tooltipTitle="Quality Gates"
								sx={{ height: "100%" }}
								component={Link}
								to={`/projects/${e._id}/quality-gates`}
							/>
						</Grid>
						<Grid item xs={6} sm={2}>
							<PrimaryToggleButton
								size="medium"
								width="100%"
								imageSources={{ normalSrc: SettingsImage }}
								tooltipTitle="Settings"
								sx={{ height: "100%" }}
								component={Link}
								to={`/projects/${e._id}/settings`}
							/>
						</Grid>
					</Grid>
				</MenuItem>
			))}
			<MenuItem sx={{ width: "100%", display: "flex", justifyContent: "center" }} onClick={handleOrganizationsMenuClose}>
				<PinkBackgroundButton
					id="addButton"
					variant="contained"
					onClick={() => {
						const url = isOpen
							? "/add?tour=addProject&tourStep=2"
							: "/add";

						if (isOpen) {
							setCurrentStep((cur) => cur + 1);
						}

						navigate(url, { replace: true });
					}}
				>
					<Typography noWrap sx={{ maxWidth: 250, color: "white" }}>{"Create Project"}</Typography>
				</PinkBackgroundButton>
			</MenuItem>
		</Menu>
	);
};

OrganizationsPanel.propTypes = {
	orgs: PropTypes.array,
	projects: PropTypes.array,
	anchorElOrganizations: PropTypes.string,
	mutateOrgs: PropTypes.func,
	mutateProjects: PropTypes.func,
	onOrgChange: PropTypes.func,
	handleOrganizationsMenuClose: PropTypes.func,
};

export default OrganizationsPanel;
