import OverviewHoverImage from "../assets/images/buttons/overview_button_hover.png";
import OverviewImage from "../assets/images/buttons/overview_button.png";
import QualityGateHoverImage from "../assets/images/buttons/quality_gates_button_hover.png";
import QualityGateImage from "../assets/images/buttons/quality_gates_button.png";
import QualityAnalyticsHoverImage from "../assets/images/buttons/quality_analytics_button_hover.png";
import QualityAnalyticsImage from "../assets/images/buttons/quality_analytics_button.png";
import ProjectAnalyticsImage from "../assets/images/buttons/project_button.png";
import ProjectAnalyticsHoverImage from "../assets/images/buttons/project_button_hover.png";
import TeamAnalyticsImage from "../assets/images/buttons/team_analytics_button.png";
import TeamAnalyticsHoverImage from "../assets/images/buttons/team_analytics_button_hover.png";
import SettingsHoverImage from "../assets/images/buttons/settings_hover.png";
import SettingsImage from "../assets/images/buttons/settings.png";

const createNavigationTabsConfig = (
	isProject,
	isCycloptGuardDisabled,
	isProjectAnalyticsDisabled = false,
	isQualityAnalyticsDisabled = false,
) => [
	{
		label: "Overview",
		value: "overview",
		path: "overview",
		imageSources: {
			normalSrc: OverviewImage,
			hoverSrc: OverviewHoverImage,
			activeSrc: OverviewHoverImage,
		},
	},
	...(isProject ? [
		{
			label: "Project Analytics",
			value: "project-analytics",
			path: "./project-analytics",
			disabled: isProjectAnalyticsDisabled,
			tooltip: "Project Analytics are disabled for this project.",
			imageSources: {
				normalSrc: ProjectAnalyticsImage,
				hoverSrc: ProjectAnalyticsHoverImage,
				activeSrc: ProjectAnalyticsHoverImage,
			},
		},
	] : []),
	...(isProject ? [
		{
			label: "Quality Analytics",
			value: "quality-analytics",
			path: "quality-analytics",
			disabled: isQualityAnalyticsDisabled,
			tooltip: "Quality Analytics are disabled for this project.",
			imageSources: {
				normalSrc: QualityAnalyticsImage,
				hoverSrc: QualityAnalyticsHoverImage,
				activeSrc: QualityAnalyticsHoverImage,
			},
		},
	] : []),
	...(isProject ? [] : [
		{
			label: "Team Analytics",
			value: "team-analytics",
			path: "team-analytics",
			imageSources: {
				normalSrc: TeamAnalyticsImage,
				hoverSrc: TeamAnalyticsHoverImage,
				activeSrc: TeamAnalyticsHoverImage,
			},
		},
	]),
	{
		label: "Quality Gates",
		value: "quality-gates",
		path: "quality-gates",
		disabled: isCycloptGuardDisabled,
		tooltip: "Quality Gates are disabled for this project.",
		imageSources: {
			normalSrc: QualityGateImage,
			hoverSrc: QualityGateHoverImage,
			activeSrc: QualityGateHoverImage,
		},
	},
	...(isProject ? [{
		label: "Settings",
		value: "settings",
		path: "settings",
		imageSources: {
			normalSrc: SettingsImage,
			hoverSrc: SettingsHoverImage,
			activeSrc: SettingsHoverImage,
		},
	}] : []),
];

export default createNavigationTabsConfig;
