import { memo } from "react";
import { Box, Typography, Stack, styled } from "@mui/material";
import { LocationOn, Email, Link as LinkIcon, Person } from "@mui/icons-material";
import { Image } from "mui-image";
import PropTypes from "prop-types";

import EditableText from "./EditableText.jsx";
import Divider from "./Divider.jsx";

const BasicInfoContainer = styled(Box)(({ theme }) => ({
	height: "100%",
	backgroundColor: theme.palette.grey.light,
	display: "flex",
	flexDirection: "column",
	padding: theme.spacing(3),
}));

const AvatarContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	justifyContent: "center",
	margin: theme.spacing(2, 0),
}));

const StyledImage = styled(Image)(({ theme }) => ({
	margin: "auto",
	borderRadius: "50%",
	border: `1px solid ${theme.palette.pink?.main ?? "#e91e63"}`,
	width: "160px",
	height: "160px",
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
	fontWeight: 500,
	marginTop: theme.spacing(1),
	color: theme.palette.primary.main,
}));

const RoleText = styled(Typography)(({ theme }) => ({
	color: theme.palette.pink?.main ?? "#e91e63",
	whiteSpace: "normal",
	overflowWrap: "break-word",
	wordBreak: "break-word",
}));

const InfoRow = styled(Stack)(({ theme }) => ({
	alignItems: "center",
	gap: theme.spacing(1),
	marginTop: theme.spacing(1),
}));

const DeveloperBasicInfo = ({ info, updateInfo, isInEditMode = false }) => {
	const { username, avatar, role, shortBio, address, email, website, fullName } = info;

	return (
		<BasicInfoContainer>
			<AvatarContainer>
				<StyledImage
					src={avatar}
					alt={username}
					title={username}
				/>
			</AvatarContainer>

			<Typography variant="h5" align="center">
				{username}
			</Typography>

			<InfoRow direction="row">
				<RoleText variant="subtitle1">
					<EditableText
						label="role"
						isInEditMode={isInEditMode}
						initialText={role}
						variant="caption"
						onUpdate={updateInfo}
					/>
				</RoleText>
			</InfoRow>

			<EditableText
				dense
				label="shortBio"
				isInEditMode={isInEditMode}
				initialText={shortBio}
				variant="body2"
				onUpdate={updateInfo}
			/>

			<SectionTitle variant="h6">{"Info"}</SectionTitle>
			<Divider />

			<Box>
				<InfoRow direction="row">
					<Person />
					<EditableText
						label="fullName"
						isInEditMode={isInEditMode}
						initialText={fullName}
						variant="caption"
						onUpdate={updateInfo}
					/>
				</InfoRow>

				<InfoRow direction="row">
					<LocationOn />
					<EditableText
						label="address"
						isInEditMode={isInEditMode}
						initialText={address}
						variant="caption"
						onUpdate={updateInfo}
					/>
				</InfoRow>

				<InfoRow direction="row">
					<Email />
					<EditableText
						label="email"
						isInEditMode={isInEditMode}
						initialText={email}
						variant="caption"
						onUpdate={updateInfo}
					/>
				</InfoRow>

				<InfoRow direction="row">
					<LinkIcon />
					<EditableText
						label="website"
						isInEditMode={isInEditMode}
						initialText={website}
						variant="caption"
						onUpdate={updateInfo}
					/>
				</InfoRow>
			</Box>
		</BasicInfoContainer>
	);
};

DeveloperBasicInfo.propTypes = {
	info: PropTypes.shape({
		username: PropTypes.string,
		avatar: PropTypes.string,
		role: PropTypes.string,
		shortBio: PropTypes.string,
		address: PropTypes.string,
		email: PropTypes.string,
		website: PropTypes.string,
		fullName: PropTypes.string,
	}),
	updateInfo: PropTypes.func,
	isInEditMode: PropTypes.bool,
};

export default memo(DeveloperBasicInfo);
