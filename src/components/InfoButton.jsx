import PropTypes from "prop-types";
import { memo } from "react";
import { QuestionMark } from "@mui/icons-material";
import { Button, Box } from "@mui/material";

import Tooltip from "./Tooltip.jsx";

const InfoButton = ({ redirectionUrl, ...props }) => (
	<Box
		{...props}
	>
		<Tooltip title="Info" placement="left">
			<a href={redirectionUrl} target="_blank" rel="noreferrer">
				<Button
					target="_blank"
					variant="contained"
					size="small"
					sx={{
						borderRadius: "100%",
						padding: (t) => t.spacing(1),
						height: (t) => t.spacing(3),
						aspectRatio: "1/1",
						minWidth: "0",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						"&:hover": {
							color: "white",
						},
					}}
				>
					<QuestionMark sx={{ fontSize: 16 }} />
				</Button>
			</a>
		</Tooltip>
	</Box>
);

InfoButton.propTypes = {
	redirectionUrl: PropTypes.string,
	props: PropTypes.object,
};

export default memo(InfoButton);
