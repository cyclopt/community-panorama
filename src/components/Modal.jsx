import { forwardRef, memo, useState } from "react";
import PropTypes from "prop-types";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	IconButton,
	Slide,
	Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";

const Transition = forwardRef((props, ref) => <Slide ref={ref} direction="up" {...props} />);

const Modal = ({ maxWidth = "lg", title, open, disableAreYouSureDialog, onClose, actions, children }) => {
	const [areYouSureDialogOpen, setAreYouSureDialogOpen] = useState(false);

	return (
		<Dialog
			fullWidth
			open={!!open}
			TransitionComponent={Transition}
			maxWidth={maxWidth}
			scroll="body"
			PaperProps={{ sx: { borderRadius: 1, boxShadow: "shadows.4" } }}
			onClose={(_, reason) => reason !== "backdropClick" && onClose()}
		>
			<DialogTitle component="h6" sx={{ bgcolor: "primary.main", boxShadow: (t) => t.tileShadow, m: 0, px: 3, py: 1 }}>
				<Typography sx={{ fontWeight: "bold", color: "common.white" }}>{title}</Typography>
				<IconButton
					size="small"
					sx={{
						position: "absolute",
						right: 8,
						top: 8,
						color: "common.white",
					}}
					onClick={() => (disableAreYouSureDialog ? onClose() : setAreYouSureDialogOpen(true))}
				>
					<Close />
				</IconButton>
			</DialogTitle>
			<DialogContent dividers sx={{ overflowY: "hidden" }}>
				{children}
			</DialogContent>
			{actions && <DialogActions sx={{ p: 3 }}>{actions}</DialogActions>}
			{!disableAreYouSureDialog && (
				<Dialog
					keepMounted
					open={!!areYouSureDialogOpen}
					TransitionComponent={Transition}
					onClose={() => setAreYouSureDialogOpen(false)}
				>
					<DialogTitle>
						{"Are you sure?"}
					</DialogTitle>
					<DialogContent dividers>
						<DialogContentText>
							{"Any changes that were not submitted will be lost."}
						</DialogContentText>
					</DialogContent>
					<DialogActions>
						<Button
							autoFocus
							startIcon={<Close />}
							variant="contained"
							onClick={() => {
								setAreYouSureDialogOpen(false);
								onClose();
							}}
						>
							{"Close"}
						</Button>
						<Button variant="outlined" onClick={() => setAreYouSureDialogOpen(false)}>{"Cancel"}</Button>
					</DialogActions>
				</Dialog>
			)}
		</Dialog>
	);
};

Modal.propTypes = {
	maxWidth: PropTypes.string,
	title: PropTypes.string.isRequired,
	open: PropTypes.bool.isRequired,
	disableAreYouSureDialog: PropTypes.bool,
	onClose: PropTypes.func.isRequired,
	actions: PropTypes.node,
	children: PropTypes.node.isRequired,
};

export default memo(Modal);
