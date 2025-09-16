/* eslint-disable max-len */
import { useState, useCallback, useEffect, memo } from "react";
import { Routes, Route, useParams, useLocation, useNavigate } from "react-router-dom";
import { Typography, LinearProgress, Grid } from "@mui/material";
import { shallow } from "zustand/shallow";

import useGlobalState from "../../use-global-state.js";
import { useOrganization } from "../../api/index.js";
import ToggleButtonTabs from "../../components/ToggleButtonTabs.jsx";

import DeveloperProfile from "./DeveloperProfile.jsx";
import TeamAnalytics from "./TeamAnalytics.jsx";
import OrganizationInfoQualityGates from "./OrganizationInfoQualityGates.jsx";
import OrganizationInfoOverview from "./OrganizationInfoOverview.jsx";
import OrganizationInfoUsage from "./OrganizationInfoUsage.jsx";

import { createNavigationTabsConfig } from "#utils";

const findTab = (pathname) => {
	for (const path of ["overview", "settings", "usage", "quality-gates", "team-analytics"]) {
		if (pathname.includes(path)) return path;
	}

	return "overview";
};

const OrganizationInfo = () => {
	const { organizationid } = useParams();
	const { pathname } = useLocation();
	const navigate = useNavigate();

	const [value, setValue] = useState(() => findTab(pathname));
	const { setSelectedOrganization, showGlobalLoading } = useGlobalState(useCallback((e) => ({
		setSelectedOrganization: e.setSelectedOrganization,
		showGlobalLoading: e.showGlobalLoading,
	}), [], shallow));
	// TO DO: subscription, when fetching organization using id get subscriptions from orders
	const { organization = {}, isLoading, isError, mutate } = useOrganization(organizationid);

	useEffect(() => {
		if (isError) navigate("/projects");
	}, [navigate, isError]);

	useEffect(() => {
		if (!isLoading) {
			setSelectedOrganization({ _id: organization._id, name: organization.name });
		}
	}, [isLoading, organization._id, organization.name, setSelectedOrganization]);

	useEffect(() => setValue(() => findTab(pathname)), [pathname]);

	if (!organization._id) return (<LinearProgress color="primary" />);

	return (
		<>
			{showGlobalLoading && (<LinearProgress color="primary" />)}
			<section style={{ paddingTop: "1rem" }}>
				<Grid container className="container" flexDirection="row" alignItems="center" rowSpacing={1}>
					<Grid item>
						<Typography gutterBottom variant="h4">{`Organization: ${organization.name || ""}`}</Typography>
					</Grid>
					<Grid container item direction="row" justifyContent="space-around" alignItems="center" m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
						<Grid item xs={12}>
							<ToggleButtonTabs
								tabs={createNavigationTabsConfig(false, !organization?.showCycloptGuard)}
								defaultValue={value}
								gap={1}
								onChange={(newVal) => setValue(newVal)}
							/>
						</Grid>
					</Grid>
				</Grid>
			</section>
			<section style={{ paddingTop: "1rem" }}>
				<div className="container">
					<Routes>
						<Route index path="overview?" element={<OrganizationInfoOverview organization={organization} />} />
						<Route path="quality-gates" element={<OrganizationInfoQualityGates key={organization._id} organization={organization} mutate={mutate} />} />
						<Route index path="teams" element={<OrganizationInfoOverview organization={organization} />} />
						<Route path="usage" element={<OrganizationInfoUsage key={organization._id} organization={organization} />} />
						<Route path="team-analytics" element={<TeamAnalytics key={organization._id} organization={organization} />} />
						<Route path="team-analytics/:developerId" element={<DeveloperProfile />} />
					</Routes>
				</div>
			</section>
		</>
	);
};

export default memo(OrganizationInfo);
