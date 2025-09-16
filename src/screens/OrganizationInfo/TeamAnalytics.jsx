import { useEffect, useCallback, useMemo, memo, useState } from "react";
import PropTypes from "prop-types";
import { Grid, Box, MenuItem } from "@mui/material";
import { useParams } from "react-router-dom";

import OrganizationBeat from "../../components/OrganizationBeat.jsx";
import TeamDevelopersSection from "../../components/team-analytics/TeamDevelopersSection.jsx";
import TeamTop5 from "../../components/team-analytics/TeamTop5.jsx";
import TeamComparison from "../../components/team-analytics/TeamComparison.jsx";
import TeamSkills from "../../components/team-analytics/TeamSkills.jsx";
import RangeSelector from "../../components/RangeSelector.jsx";
import Select from "../../components/Select.jsx";

import { useSnackbar, getCharacteristicsProps } from "#utils";
import {
	useDevelopersCharacteristics,
	useDevelopersCommitStats,
	useDevelopersLanguagesAndFrameworks,
	useDeveloperThresholds,
	useDevelopersWorkLoad,
	useDevelopersSoftSkills,
} from "#api";

const TeamAnalytics = ({ organization }) => {
	const { organizationid } = useParams();
	const { error } = useSnackbar();
	const { thresholds = [] } = useDeveloperThresholds();
	const [range, setRange] = useState(null);
	const [projectId, setProjectId] = useState(null);

	const organizationsProjects = organization?.teams?.flatMap((o) => o.projects);

	const {
		developers: rowDevelopers = [],
		isError: isError1,
		isLoading: isLoadingCharacteristics,
		mutate: mutateDevelopers,
	} = useDevelopersCharacteristics(organizationid);

	const {
		softSkills = [],
		isLoading: isLoadingSoftSkills,
	} = useDevelopersSoftSkills(organizationid, range);

	const {
		workload = {},
		isError: isError4,
		isLoading: isLoadingWorkload,
	} = useDevelopersWorkLoad(organizationid, range, projectId);

	const developers = useMemo(() => rowDevelopers.map((devFields) => ({
		...devFields,
		characteristics: Object.fromEntries(Object.entries(devFields?.characteristics || {}).map(([key, val]) => [key, val])),
	})), [rowDevelopers]);

	const developersSoftskills = useMemo(() => softSkills.map((devFields) => ({
		username: devFields.username || "...",
		_id: devFields._id,
		softSkills: devFields.softSkills?.reduce((acc, skill) => {
			const softSkillValues = skill.metrics;
			for (const skillKey in softSkillValues) {
				if (Object.prototype.hasOwnProperty.call(softSkillValues, skillKey)) {
					const numericValue = Number(softSkillValues[skillKey]) || 0;
					acc[skillKey] = (acc[skillKey] || 0) + numericValue;
				}
			}

			return acc;
		}, {
			efficiency: 0,
			focus: 0,
			innovation: 0,
			speed: 0,
		}),
	})), [softSkills]);

	const {
		commitStats = {},
		isError: isError2,
		isLoading: isLoadingCommitStats,
	} = useDevelopersCommitStats(organizationid, range, projectId);

	const {
		languagesAndFrameworks = {},
		isError: isError3,
		isLoading: isLoadingLaFra,
	} = useDevelopersLanguagesAndFrameworks(organizationid, range, projectId);

	useEffect(() => {
		if (isError1 || isError2 || isError3 || isError4) error();
	}, [error, isError1, isError2, isError3, isError4]);

	const developersCardsContent = useMemo(() => {
		const results = developers.map((developer) => {
			const { _id, fullname, username, role, avatar, characteristics, visible } = developer;
			const { languages = [], frameworks = [] } = languagesAndFrameworks[_id] || {};
			return {
				_id,
				username: fullname || username || "...",
				role: role || "...",
				avatar,
				characteristics: Object.entries(characteristics || {}).map(([char, total]) => {
					const { png, level } = getCharacteristicsProps(total, thresholds);
					return { label: char, png, level, total };
				}),
				languages: languages.map(([label, { score }]) => ({ label, score })),
				frameworks: frameworks.map(([label, { score }]) => ({ label, score })),
				workload: workload?.[_id] || {},
				visible,
			};
		});

		return results;
	}, [developers, languagesAndFrameworks, thresholds, workload]);

	const handleRangeChange = useCallback(
		({ start, end }) => {
			setRange({ start, end });
		},
		[],
	);

	return (
		<Grid
			container
			direction="column"
			justifyContent="center"
			alignItems="center"
			spacing={2}
			m={-1}
			sx={{ "> .MuiGrid-item": { p: 1 } }}
		>
			<Box display="flex" flexDirection={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" width="100%">
				<Box width={230}>
					<Select
						displayEmpty
						value={projectId}
						secondary="" // or pass a color variant if you like
						onChange={(e) => setProjectId(e.target.value)}
					>
						<MenuItem value={null}>
							<em>{"All Projects"}</em>
						</MenuItem>
						{organizationsProjects.map((proj) => (
							<MenuItem key={proj._id} value={proj._id}>
								{proj.name}
							</MenuItem>
						))}
					</Select>
				</Box>
				<RangeSelector
					maxDepth={24}
					onChange={handleRangeChange}
				/>
			</Box>
			<OrganizationBeat
				key={`org-beat:${commitStats.commitsByDay?.length}`}
				commitsByDay={commitStats.commitsByDay}
				isLoading={isLoadingCommitStats}
			/>
			<TeamDevelopersSection
				developersCardsContent={developersCardsContent}
				isLoading={isLoadingCharacteristics || isLoadingLaFra || isLoadingWorkload}
				mutateDevelopers={mutateDevelopers}
			/>
			<TeamTop5
				developers={developers}
				isLoadingCharacteristics={isLoadingCharacteristics}
				commitStats={commitStats}
				isLoadingCommitStats={isLoadingCommitStats}
			/>
			<TeamComparison
				developers={developers}
				developersSoftskills={developersSoftskills}
				isLoadingCharacteristics={isLoadingCharacteristics}
				isLoadingSoftskills={isLoadingSoftSkills}
			/>
			<TeamSkills range={range} projectId={projectId} />
		</Grid>
	);
};

TeamAnalytics.propTypes = {
	organization: PropTypes.object,
};

export default memo(TeamAnalytics);
