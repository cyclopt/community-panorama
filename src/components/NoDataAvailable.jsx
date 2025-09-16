import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";

const NoDataAvailable = ({ text = "No data available!", sx }) => (
	<Box sx={{
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		height: "100%",
		maxHeight: "20vh",
		p: 1,
		...sx,
	}}
	>
		<svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" viewBox="0 0 566.9 566.9">
			<pattern width="69" height="69" overflow="visible" patternUnits="userSpaceOnUse" viewBox="2.1 -70.9 69 69" />
			<path
				d="m303.3 65.8 108.4 95v303.1H155V65.8h148.3m3.4-21.8H146.1c-7.1 0-12.9 5.8-12.9 12.9v415.9c0 7.1 5.8 12.9 12.9 12.9h274.5c7.1 0 12.9-5.8 12.9-12.9V156.7c0-3.7-1.6-7.2-4.4-9.7l-114-99.8c-2.3-2-5.3-3.2-8.4-3.2z"
				style={{ fill: "#125387" }}
			/>
			<path
				d="m330.3 89.8 51 44.4h-51V89.8m-16.9-42.1c-2.5 0-4.9 2-4.9 4.9v83.6c0 10.9 8.9 19.8 19.8 19.8H424c5.4 0 7.9-6.6 3.8-10.2L316.6 48.9c-1-.8-2.1-1.2-3.2-1.2z"
				style={{ fill: "#125387" }}
			/>
			<path
				fill="#fff"
				d="M482.2 522c-9.3 0-18.6-3.5-25.7-10.6L58.8 113.7c-14.2-14.2-14.2-37.2 0-51.3 14.2-14.2 37.2-14.2 51.3 0L507.9 460c14.2 14.2 14.2 37.2 0 51.3-7.1 7.1-16.4 10.7-25.7 10.7zM84.5 88l397.7 397.7"
			/>
			<path
				fill="#d55498"
				d="M482.2 496.5c-2.8 0-5.6-1.1-7.7-3.2L76.8 95.7c-4.3-4.3-4.3-11.1 0-15.4 4.3-4.3 11.1-4.3 15.4 0L489.9 478c4.3 4.3 4.3 11.1 0 15.4-2.1 2.1-4.9 3.1-7.7 3.1z"
			/>
		</svg>
		<Typography>{text}</Typography>
	</Box>
);

NoDataAvailable.propTypes = { text: PropTypes.string, sx: PropTypes.object };

export default NoDataAvailable;
