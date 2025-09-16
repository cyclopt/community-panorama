import { Typography } from "@mui/material";

const acceptedPatterns = {
	github: "https://github.com/owner/repository",
	bitbucket: "https://bitbucket.org/owner/repository",
	gitlab: "https://gitlab.com/owner/repository",
	azure: "https://dev.azure.com/organization/project/_git/repository",
};

// Helper function to get the accepted format message based on the type
const getAcceptedFormatMessage = (type) => {
	if (acceptedPatterns[type]) return acceptedPatterns[type];
	return "gitlab.example.com/owner/repository";
};

// Assuming 'cookie' comes from props or context
export const AcceptedFormatsComponent = (type) => (
	<Typography variant="body2" color="inherit">
		{"Accepted formats:"}
		<br />
		{`1. ${getAcceptedFormatMessage(type)}`}
		{(type === "azure") ? null : (
			<>
				<br />
				{"2. owner/repository"}
			</>
		)}
	</Typography>
);
