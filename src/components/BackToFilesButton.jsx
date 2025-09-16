import PropTypes from "prop-types";
import { Button } from "@mui/material";
import { Reply } from "@mui/icons-material";
import queryString from "query-string";
import { useNavigate, useLocation } from "react-router-dom";

const BackToFilesButton = ({ sx = {}, onClick = () => {} }) => {
	const navigate = useNavigate();
	const { search } = useLocation();
	return (
		<Button
			variant="contained"
			size="medium"
			sx={{
				justifySelf: "flex-start",
				"&:hover": { color: "common.white" },
				width: { xs: "100%", sm: "auto" }, // Full width on small screens
				...sx,
			}}
			startIcon={<Reply />}
			onClick={() => {
				onClick();
				const currentQueryParams = queryString.parse(search);
				const updatedQueryParams = {
					...currentQueryParams,
					fileName: undefined,
					cloneInstance: undefined,
					LS: undefined,
					LE: undefined,
				};
				const updatedUrl = queryString.stringifyUrl({
					url: "",
					query: updatedQueryParams,
				});
				navigate(updatedUrl);
			}}
		>
			{"back to all files"}
		</Button>
	);
};

BackToFilesButton.propTypes = {
	sx: PropTypes.object,
	onClick: PropTypes.func,
};

export default BackToFilesButton;
