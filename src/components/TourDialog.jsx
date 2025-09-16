import {
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Zoom,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { LoadingButton } from "@mui/lab";
import PropTypes from "prop-types";
import { useTour } from "@reactour/tour";
import queryString from "query-string";

import { updateTourEnd } from "#api";
import { useSnackbar } from "#utils";

const TourDialog = (props) => {
	const { error } = useSnackbar();
	const { setIsOpen } = useTour();
	const { dialogOpen, setDialogOpen, trackingInfo, setIsPageDisabled } = props;
	const { pathname } = useLocation();
	const navigate = useNavigate();
	return (
		<Dialog keepMounted open={dialogOpen} TransitionComponent={Zoom} style={{ zIndex: 999_991 }}>
			<DialogTitle>
				{"Are you sure you want to leave the tour?"}
			</DialogTitle>
			<DialogContent dividers>
				<DialogContentText>
					{"If you leave tour you will not be able to see tour again"}
				</DialogContentText>
			</DialogContent>
			<DialogActions
				sx={{ justifyContent: "space-between" }}
			>
				<LoadingButton
					variant="contained"
					onClick={async () => {
						try {
							await updateTourEnd(trackingInfo);
							navigate(queryString.stringifyUrl({ url: pathname }));
							setDialogOpen(false);
							setIsOpen(false);
						} catch {
							navigate(queryString.stringifyUrl({ url: pathname }));
							setDialogOpen(false);
							setIsOpen(false);
							error();
						}
					}}
				>
					{"Yes"}
				</LoadingButton>
				<Button
					variant="outlined"
					onClick={() => {
						setDialogOpen(false);
						setIsPageDisabled(true);
					}}
				>
					{"No"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

TourDialog.propTypes = {
	dialogOpen: PropTypes.bool.isRequired,
	setDialogOpen: PropTypes.func,
	setIsPageDisabled: PropTypes.func,
	trackingInfo: PropTypes.object,
};

export default TourDialog;
