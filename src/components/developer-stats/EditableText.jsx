import { memo, useState, useEffect } from "react";
import {
	Stack,
	Typography,
	Input,
	InputAdornment,
	IconButton,
	styled,
} from "@mui/material";
import { Edit, Done, Clear } from "@mui/icons-material";
import PropTypes from "prop-types";

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────
const EditContainer = styled(Stack)(({ theme }) => ({
	flexDirection: "row",
	alignItems: "center",
	gap: theme.spacing(1),
	margin: theme.spacing(1, 0),
}));

const StyledInput = styled(Input)(({ theme }) => ({
	backgroundColor: "rgba(255,255,255,0.9)",
	borderRadius: theme.shape.borderRadius,
	paddingLeft: theme.spacing(1),
	paddingRight: theme.spacing(1),
}));

const RoleText = styled(Typography)(({ theme }) => ({
	color: theme.palette.pink?.main ?? "#e91e63",
	whiteSpace: "normal",
	overflowWrap: "break-word",
	wordBreak: "break-word",
}));

const DisplayText = styled(Typography, {
	shouldForwardProp: (prop) => prop !== "dense",
})(({ theme, dense }) => ({
	color: theme.palette.primary.main,
	whiteSpace: "normal",
	overflowWrap: "break-word",
	wordBreak: "break-word",
	...(dense && {
		lineHeight: "1rem",
		marginTop: theme.spacing(1),
		marginBottom: theme.spacing(1),
	}),
}));

// ─── EDITABLE TEXT COMPONENT ───────────────────────────────────────────────
const EditableText = ({ label, dense, initialText, variant, onUpdate, isInEditMode }) => {
	const [text, setText] = useState(initialText);
	const [editMode, setEditMode] = useState(false);

	useEffect(() => {
		setEditMode(false);
		setText(initialText);
	}, [initialText, isInEditMode]);

	if (isInEditMode) {
		return (
			<EditContainer>
				<StyledInput
					required
					multiline
					disableUnderline
					placeholder={
						label === "fullName"
							? "Full Name"
							: label === "shortBio"
								? "Short Bio"
								: label
					}
					value={text}
					disabled={!editMode}
					endAdornment={(
						<InputAdornment position="end">
							{editMode ? (
								<>
									<IconButton
										disabled={text === initialText || text === ""}
										onClick={() => {
											onUpdate(text, label);
											setEditMode(false);
										}}
									>
										<Done />
									</IconButton>
									<IconButton
										onClick={() => {
											setText(initialText);
											setEditMode(false);
										}}
									>
										<Clear />
									</IconButton>
								</>
							) : (
								<IconButton onClick={() => setEditMode(true)}>
									<Edit />
								</IconButton>
							)}
						</InputAdornment>
					)}
					onChange={(e) => setText(e.target.value)}
				/>
			</EditContainer>
		);
	}

	return label === "role" ? (
		<RoleText variant={variant}>{initialText}</RoleText>
	) : (
		<DisplayText variant={variant} dense={dense}>
			{initialText}
		</DisplayText>
	);
};

EditableText.propTypes = {
	label: PropTypes.string,
	dense: PropTypes.bool,
	initialText: PropTypes.string,
	variant: PropTypes.string,
	onUpdate: PropTypes.func,
	isInEditMode: PropTypes.bool,
};

export default memo(EditableText);
