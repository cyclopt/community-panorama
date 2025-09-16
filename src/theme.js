import { createTheme } from "@mui/material/styles";
import { red, green, deepOrange, yellow } from "@mui/material/colors";

const theme = createTheme({
	palette: {
		primary: {
			main: "#00426e",
			light: "#005792",
			dark: "#001f33",
		},
		secondary: {
			main: "#00cbc4",
		},

		// Characteristics Soft Skills
		speed: { main: "#3288c3" },
		efficiency: { main: "#afda00" },
		innovation: { main: "#f6bd00" },
		focus: { main: "#D13173" },

		success: { main: "#90cb1b" },
		error: { main: "#ff1a22" },
		warning: {
			main: "#ff9f00",
		},

		info: { main: "#006ba4" },

		pink: { main: "#d53a76" },

		cardHeader: { main: "#00426e" },
		cardBackgroundDark: { main: "#ccd9e2" },
		cardBackgroundLight: { main: "#dfeaf1" },

		buttonPrimary: { main: "#005792" },
		buttonSecondary: { main: "#00cbc4" },

		kanbanBacklog: { main: "#ccd9e2" },
		kanbanSprintPlanning: { main: "#669abe" },
		kanbanInProgress: { main: "#66e0dc" },
		kanbanDelivered: { main: "#e383ab" },
		kanbanAccepted: { main: "#90c56d" },

		workloadBacklog: { main: "#99b3c5" },
		workloadSprintPlanning: { main: "#006ba4" },
		workloadInProgress: { main: "#33d5d0" },
		workloadDelivered: { main: "#da5a8f" },
		workloadAccepted: { main: "#a6d549" },
		workloadArchived: { main: "#cccccc" },

		workloadBacklogDefault: { main: "#99b3c5" },
		workloadSprintPlanningDefault: { main: "#006ba4" },
		workloadInProgressDefault: { main: "#33d5d0" },
		workloadDeliveredDefault: { main: "#da5a8f" },
		workloadAcceptedDefault: { main: "#a6d549" },
		workloadArchivedDefault: { main: "#cccccc" },

		workloadBacklogMonochrome: { main: "#ebf0f3" },
		workloadSprintPlanningMonochrome: { main: "#d2dde5" },
		workloadInProgressMonochrome: { main: "#99b3c5" },
		workloadDeliveredMonochrome: { main: "#668ea8" },
		workloadAcceptedMonochrome: { main: "#33688b" },
		workloadArchivedMonochrome: { main: "#cccccc" },

		workloadBacklogVivid: { main: "#6bb764" },
		workloadSprintPlanningVivid: { main: "#39c0c4" },
		workloadInProgressVivid: { main: "#feda1e" },
		workloadDeliveredVivid: { main: "#f7941d" },
		workloadAcceptedVivid: { main: "#f15c63" },
		workloadArchivedVivid: { main: "#cccccc" },

		workloadBacklogEarth: { main: "#ded9d3" },
		workloadSprintPlanningEarth: { main: "#7f959b" },
		workloadInProgressEarth: { main: "#c99256" },
		workloadDeliveredEarth: { main: "#a5665c" },
		workloadAcceptedEarth: { main: "#eb957c" },
		workloadArchivedEarth: { main: "#cccccc" },

		workloadBacklogPostIt: { main: "#f0f58f" },
		workloadSprintPlanningPostIt: { main: "#a9edf0" },
		workloadInProgressPostIt: { main: "#74ed4a" },
		workloadDeliveredPostIt: { main: "#ffa930" },
		workloadAcceptedPostIt: { main: "#ff32b1" },
		workloadArchivedPostIt: { main: "#cccccc" },

		workloadBacklogChristmas: { main: "#062741" },
		workloadSprintPlanningChristmas: { main: "#BF9E60" },
		workloadInProgressChristmas: { main: "#02733E" },
		workloadDeliveredChristmas: { main: "#BF213E" },
		workloadAcceptedChristmas: { main: "#731224" },
		workloadArchivedChristmas: { main: "#cccccc" },

		epic: { main: "#ff484e" },
		red,
		green,
		deepOrange,
		yellow,
		grey: {
			deep: "#a4abb1",
			dark: "#ccd9e2",
			light: "#dfeaf1",
			transparent: "#f2f7f9",
			soft: "#f5f8fa",
		},

		lowVulnerabilityWarning: { main: "#F8C706" },
		moderateVulnerabilityWarning: { main: "#FE8300" },
		highVulnerabilityWarning: { main: "#F8956C" },
		criticalVulnerabilityWarning: { main: "#C23400" },

		notifications: {
			warning: "#ffc566",
			error: "#800",
			info: "#006ba4",
		},

	},
	tileShadow: "0px 0px 4px -1px rgba(0,0,0,0.2), 0px 0px 5px 0px rgba(0,0,0,0.14), 0px 0px 10px 0px rgba(0,0,0,0.12)",
	popUpsShadows: "0px 5px 5px -3px rgba(0,0,0,0.2), 0px 8px 10px 1px rgba(0,0,0,0.14), 0px 3px 14px 2px rgba(0,0,0,0.12)",
	typography: {
		h6: {
			fontSize: "1.125rem",
		},
		fontFamily: "Commissioner, Helvetica, Arial, sans-serif",
	},
	shape: {
		borderRadius: 5,
	},
	components: {
		MuiButton: {
			defaultProps: {
				disableElevation: true,
			},
			styleOverrides: {
				outlined: {
					border: "1px solid",
				},
			},
		},
		MuiAutocomplete: {
			styleOverrides: {
				popper: {
					boxShadow: "0px 5px 5px -3px rgba(0,0,0,0.2), 0px 8px 10px 1px rgba(0,0,0,0.14), 0px 3px 14px 2px rgba(0,0,0,0.12)",
					borderRadius: "0.5rem",
				},
			},
		},
		MuiPaper: {
			defaultProps: {
				elevation: 0,
			},
		},
		MuiAppBar: {
			defaultProps: {
				elevation: 0,
			},
		},
	},
});

export default theme;
