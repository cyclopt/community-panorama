
import { Typography, Grid, Link as MaterialLink, Avatar, MenuItem, Switch, Box, Select, ListItemText, ListSubheader, LinearProgress } from "@mui/material";
import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import pluralize from "pluralize";
import { Link } from "react-router-dom";

import CongratsImage from "../assets/images/filled_check_box.png";
import EisaiGiaToAna8emaImage from "../assets/images/severities/critical.png";
import { capitalize, getColorForQualityScore, convertQualityScoreToAvatar, constructMessage } from "../utils/index.js";

import ComponentOverviewItem from "./ComponentOverviewItem.jsx";
import SectionTitle from "./SectionTitle.jsx";

const groupedOptions = {
	Attention: [
		{ label: "Characteristics", value: "characteristics", isActive: false, isDisabled: true },
		{ label: "Quality Gates", value: "qualityGates", isActive: false, isDisabled: true },
		{ label: "Violations", value: "violations", isActive: false, isDisabled: true },
		{ label: "Vulnerabilities", value: "vulnerabilities", isActive: false, isDisabled: true },
	],
	OnTrack: [],
};

const OverviewOverallSection = ({
	title, info, activeSystemChecksCategories, isLoading, isLoadingQualityGates, projectId = null }) => {
	const projectOrRepository = projectId ? "Repository" : "Project";
	const linkTemplate = projectId ? `/projects/${projectId}/quality-analytics/` : "/projects/";

	const allOptions = new Set([...activeSystemChecksCategories, "qualityGates"]);
	const updatedGroupedOptions = {
		Attention: groupedOptions.Attention.map((option) => ({
			...option,
			isDisabled: !allOptions.has(option.value),
			isActive: allOptions.has(option.value),
		})),
		OnTrack: groupedOptions.OnTrack,
	};

	const [activeFields, setActiveFields] = useState(
		updatedGroupedOptions.Attention.filter((opt) => opt.isActive).map((option) => option.value),
	);

	const [groupToggles, setGroupToggles] = useState({
		Attention: true,
		OnTrack: true,
	});

	const mentionViolationsComponents = useMemo(() => {
		if (isLoading || !activeFields.includes("violations")) return [];
		return info.filter((component) => component.violationsChecks.length > 0);
	}, [isLoading, info, activeFields]);

	const mentionVulnerabilitiesComponents = useMemo(() => {
		if (isLoading || !activeFields.includes("vulnerabilities")) return [];
		return info.filter((component) => component.vulnerabilitiesChecks.length > 0);
	}, [isLoading, info, activeFields]);

	const mentionCharacteristicsComponents = useMemo(() => {
		if (isLoading || !activeFields.includes("characteristics")) return [];
		return info.filter((component) => component.characteristicsChecks.length > 0);
	}, [isLoading, info, activeFields]);

	const mentionFailedQualityGatesComponents = useMemo(() => {
		if (isLoadingQualityGates || !activeFields.includes("qualityGates")) return [];
		return info.filter((component) => (component.failedQualityGates ?? []).length > 0);
	}, [info, isLoadingQualityGates, activeFields]);

	const mentionOnTrackComponents = useMemo(() => {
		if (isLoading || isLoadingQualityGates || !groupToggles.OnTrack) return [];
		return info.filter((component) => (component?.isOnTrack));
	}, [groupToggles.OnTrack, info, isLoading, isLoadingQualityGates]);

	// check if no components have additional information
	// in that case we show a custom message
	const nothingToShow = useMemo(() => (
		mentionViolationsComponents.length === 0
            && mentionVulnerabilitiesComponents.length === 0
            && mentionCharacteristicsComponents.length === 0
            && mentionFailedQualityGatesComponents.length === 0
			&& mentionOnTrackComponents.length === 0
	),
	[
		mentionViolationsComponents,
		mentionVulnerabilitiesComponents,
		mentionCharacteristicsComponents,
		mentionFailedQualityGatesComponents,
		mentionOnTrackComponents,
	]);

	const toggleItem = (value) => {
		setActiveFields((prev) => (prev.includes(value)
			? prev.filter((v) => v !== value)
			: [...prev, value]));
	};

	const toggleGroup = (group) => {
		const items = updatedGroupedOptions[group].filter((opt1) => !opt1.isDisabled).map((opt2) => opt2.value);
		const willEnableGroup = !groupToggles[group];
		if (items.length > 0) {
			const newSelected = willEnableGroup
				? [...new Set([...activeFields, ...items])]
				: activeFields.filter((v) => !items.includes(v));
			setActiveFields(newSelected);
		}

		setGroupToggles((prev) => ({ ...prev, [group]: willEnableGroup }));
	};

	return (
		<SectionTitle
			isLoading={isLoading}
			noDataMessage={nothingToShow && !isLoadingQualityGates ? "issues detected" : null}
			customToolbar={(
				<Box display="flex" justifyContent="center" alignItems="center" gap={1}>
					{`${title}:`}
					<Select
						multiple
						value={activeFields}
						size="small"
						renderValue={(selectedValues) => selectedValues.map((val) => updatedGroupedOptions.Attention.find((opt) => opt.value === val).label).join(", ")}
						MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
						sx={{ display: "flex", width: "200px" }}
					>
						{Object.entries(updatedGroupedOptions).map(([group, options]) => [
							<ListSubheader
								key={group}
								sx={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									px: 2,
									py: 1,
								}}
							>
								{group}
								<Switch
									edge="end"
									checked={groupToggles[group]}
									onClick={(e) => {
										e.stopPropagation();
										toggleGroup(group);
									}}
								/>
							</ListSubheader>,
							...options.map((option) => (
								<MenuItem key={option.value} value={option.value}>
									<ListItemText primary={option.label} />
									<Switch
										edge="end"
										disabled={option.isDisabled}
										checked={activeFields.includes(option.value)}
										onClick={(e) => {
											e.stopPropagation();
											toggleItem(option.value);
										}}
									/>
								</MenuItem>
							)),
						])}
					</Select>
				</Box>

			)}
		>
			{ isLoadingQualityGates && (<LinearProgress sx={{ "& .MuiLinearProgress-bar": { bgcolor: "black" }, my: "0.5rem" }} />)}
			<Grid sx={{ maxHeight: "300px", overflow: "auto" }}>
				{mentionViolationsComponents.map((component) => (
					<ComponentOverviewItem
						key={`violations-component-${component.name}`}
						component={component}
						link={`${linkTemplate}${component._id}`}
						imageSrc={EisaiGiaToAna8emaImage}
						message={constructMessage(component.violationsChecks, "violation", true, true)}
						projectOrRepository={projectOrRepository}
					/>
				))}

				{mentionVulnerabilitiesComponents.map((component) => (
					<ComponentOverviewItem
						key={`vulnerabilities-component-${component.name}`}
						component={component}
						link={`${linkTemplate}${component._id}`}
						imageSrc={EisaiGiaToAna8emaImage}
						message={constructMessage(component.vulnerabilitiesChecks, "vulnerability", true, true)}
						projectOrRepository={projectOrRepository}
					/>
				))}

				{mentionCharacteristicsComponents.map((component) => (
					<ComponentOverviewItem
						key={`vulnerabilities-component-${component.name}`}
						component={component}
						link={`${linkTemplate}${component._id}`}
						imageSrc={EisaiGiaToAna8emaImage}
						message="quality should be monitored!"
						avatarsComponent={
							component.characteristicsChecks.map(({ metric, value }) => (
								<Grid key={metric} container item sx={{ display: "flex", alignItems: "center", gap: "0.6rem", pt: "0.25rem" }}>
									<Avatar sx={{ bgcolor: getColorForQualityScore(value), width: 30, height: 30, fontSize: "1rem" }}>
										{convertQualityScoreToAvatar(value)}
									</Avatar>
									<Typography>{capitalize(metric.replaceAll(/score|quality/gi, ""))}</Typography>
								</Grid>

							))
						}
						projectOrRepository={projectOrRepository}
					/>
				))}

				{mentionFailedQualityGatesComponents.map((component) => (
					<ComponentOverviewItem
						key={`feedback-repo-${component.name}-quality-gate`}
						link={`${linkTemplate}${component._id}`}
						component={component}
						imageSrc={EisaiGiaToAna8emaImage}
						message={`${pluralize("has", component.failedQualityGates.length)} failed!`}
						projectOrRepository={projectOrRepository}
						qualityGatesLinkComponent={(
							<MaterialLink
								component={Link}
								underline="none"
								state={{
									failedQualityGates: component.failedQualityGates
										.flatMap(({ qualityGate, repositories, productionBranch, stagingBranch }) => repositories
											.map((repo) => ({
												qualityGate: { _id: qualityGate._id, name: qualityGate.name },
												repoId: repo.repoId,
												branch: repo.branch,
												productionBranch,
												stagingBranch,
											}))),
								}}
								style={{ paddingRight: "0.5rem" }}
								to={`/projects/${projectId || component._id}/quality-gates?tab=1`}
							>
								{component.failedQualityGates.length > 2
									? `${component.failedQualityGates.length} Quality Gates`
									: component.failedQualityGates.flatMap((qG) => qG.qualityGate.name).join(", ")}
							</MaterialLink>
						)}
					/>
				))}

				{mentionOnTrackComponents.map((component) => (
					<ComponentOverviewItem
						key={`is-on-track-component-${component.name}`}
						component={component}
						link={`${linkTemplate}${component._id}`}
						imageSrc={CongratsImage}
						message="is on track!"
						projectOrRepository={projectOrRepository}
					/>
				))}
			</Grid>
		</SectionTitle>

	);
};

OverviewOverallSection.propTypes = {
	title: PropTypes.string,
	info: PropTypes.array,
	activeSystemChecksCategories: PropTypes.array,
	isLoading: PropTypes.bool,
	isLoadingQualityGates: PropTypes.bool,
	projectId: PropTypes.string,
};

export default OverviewOverallSection;
