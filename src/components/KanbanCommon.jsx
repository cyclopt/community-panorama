import PropTypes from "prop-types";
import { InputBase, Box, Skeleton, Fade } from "@mui/material";
import { styled, alpha } from "@mui/material/styles";

import { dayjs } from "../utils/index.js";

export const Root = styled("div")(({ theme, cls }) => ({
	[`& .${cls.root}`]: {
		height: theme.spacing(2),
	},
	[`& .${cls.bar}`]: {
		borderRadius: theme.shape.borderRadius,
		backgroundColor: theme.palette.secondary.main,
	},
	[`& .${cls.determinate}`]: {
		borderRadius: theme.shape.borderRadius,
		backgroundColor: theme.palette.grey.transparent,
	},
	[`& .${cls.progressText}`]: {
		position: "absolute",
		top: "50%",
		left: "80%",
		marginTop: theme.spacing(-1.2),
		height: theme.spacing(2),
		marginLeft: theme.spacing(-1.2),
		fontWeight: 500,
	},
	[`& .${cls.caption}`]: {
		wordWrap: "break-word",
		whiteSpace: "normal",
		display: "flex",
		alignItems: "center",
	},
}));

export const Search = styled("div")(({ theme }) => ({
	position: "relative",
	borderRadius: theme.shape.borderRadius,
	backgroundColor: alpha(theme.palette.primary.main, 0.15),
	transition: "background-color 70ms, width 200ms",
	width: "80%",
	"&:hover": {
		backgroundColor: alpha(theme.palette.primary.main, 0.25),
	},
	"&:focus-within": {
		width: "100%",
	},
}));

export const SearchIconWrapper = styled("div")(({ theme }) => ({
	padding: theme.spacing(0, 2),
	height: "100%",
	position: "absolute",
	pointerEvents: "none",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
}));

export const StyledInputBase = styled(InputBase)(({ theme }) => ({
	color: "inherit",
	width: "100%",
	"& .MuiInputBase-input": {
		padding: theme.spacing(1, 1, 1, 0),
		paddingLeft: `calc(1em + ${theme.spacing(4)})`,
	},
}));

export const KanbanCardSkeleton = ({ el = false }) => (
	<Fade
		in={el}
		timeout={500}
	>
		<Box backgroundColor="#ffffff" display="flex" flexDirection="column" borderRadius="1rem" boxShadow={2} mb={2} width="350px">
			<Box display="flex" p={1} alignItems="center" justifySelf="center">
				<Skeleton variant="rounded" animation="wave" width={30} height={30} sx={{ mr: 1 }} />
				<Skeleton variant="rounded" animation="wave" width={30} height={30} sx={{ mr: 1 }} />
				<Skeleton variant="text" animation="wave" width={150} height={20} sx={{ mr: "100px" }} />
				<Skeleton variant="rounded" animation="wave" width={20} height={20} />
			</Box>
			<Skeleton variant="rounded" animation="wave" width="100%" height={2} />
			<Box display="flex" p={1} alignItems="start" justifySelf="center" flexDirection="column">
				<Box display="flex" alignItems="center" justifySelf="center">
					<Skeleton variant="text" animation="wave" width={10} height={20} sx={{ mr: 0.5 }} />
					<Skeleton variant="text" animation="wave" width={40} height={20} />
				</Box>
				<Box display="flex" alignItems="center" justifySelf="center">
					<Skeleton variant="text" animation="wave" width={40} height={20} />
				</Box>
			</Box>
			<Skeleton variant="rounded" animation="wave" width="100%" height={2} />
			<Box display="flex" p={1} alignItems="center" justifySelf="center" justifyContent="space-between">
				<Box display="flex" alignItems="center" justifySelf="center" flexDirection="column" width="40%">
					<Skeleton variant="text" animation="wave" width="90%" height={20} />
					<Skeleton variant="rounded" animation="wave" width="100%" height={20} />
				</Box>
				<Skeleton variant="circular" animation="wave" width={40} height={40} />
			</Box>
		</Box>
	</Fade>
);

KanbanCardSkeleton.propTypes = {
	el: PropTypes.bool,
};

export const timeRangeOptions = [
	{ label: "last day", value: "1 day ago", date: dayjs().startOf("day").subtract(1, "day") },
	{ label: "last week", value: "1 week ago", date: dayjs().startOf("day").subtract(1, "week") },
	{ label: "last 2 weeks", value: "2 weeks ago", date: dayjs().startOf("day").subtract(2, "weeks") },
	{ label: "last month", value: "1 month ago", date: dayjs().startOf("day").subtract(1, "month") },
	{ label: "last 3 months", value: "3 months ago", date: dayjs().startOf("day").subtract(3, "months") },
	{ label: "last 6 months", value: "6 months ago", date: dayjs().startOf("day").subtract(6, "months") },
	{ label: "all", value: "all", date: dayjs().startOf("day").subtract(10, "years") },
];

export const defaultTimeRange = timeRangeOptions[2];
