// DeveloperCard.jsx
import { memo, useCallback } from "react";
import PropTypes from "prop-types";
import {
	Card as MUICard,
	CardHeader,
	CardContent as MUICardContent,
	Avatar,
	Typography,
	Box,
	Stack,
	styled,
	CardActionArea,
	IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const GutterTypography = styled(Typography)(({ theme }) => ({
	color: "#fff",
	"& strong": {
		fontWeight: theme.typography.fontWeightBold,
		color: "#fff",
	},
}));

const BottomBar = styled(Box)(({ theme }) => ({
	backgroundColor: theme.palette.grey.deep,
	padding: theme.spacing(0.5),
	display: "flex",
	flexDirection: "column",
	borderTop: `1px solid ${theme.palette.divider}`,
}));

const GridContainer = styled(Box)({});
GridContainer.defaultProps = {
	container: true,
	display: "flex",
	direction: "row",
	wrap: "nowrap",
	alignItems: "flex-end",
	justifyContent: "space-between",
};

const GridItem = styled(Box)(() => ({
	display: "flex",
	alignItems: "end",
}));
GridItem.defaultProps = { item: true, xs: 3 };

const RatingStack = styled(Stack)({});
RatingStack.defaultProps = {
	direction: "row",
	flexWrap: "nowrap",
	alignItems: "center",
	spacing: 1,
	sx: { overflowX: "auto", paddingLeft: 0, paddingRight: 0 },
};

const Header = styled(CardHeader)(({ theme }) => ({
	paddingTop: theme.spacing(1.1),
	paddingBottom: theme.spacing(1),
	"& .MuiAvatar-root": {
		width: theme.spacing(8),
		height: theme.spacing(8),
	},
	"& .MuiTypography-body1": {
		color: theme.palette.pink.main,
	},
}));

const Card = styled(MUICard, {
	shouldForwardProp: (prop) => prop !== "cardHeight",
})(({ theme }) => ({
	margin: theme.spacing(2),
	borderRadius: theme.shape.borderRadius,
	border: `1px solid ${theme.palette.grey.deep}`,
	display: "flex",
	flexDirection: "column",
	height: 270,
}));

const CardContent = styled(MUICardContent)({
	flex: 1,
	paddingTop: 0,
	overflowY: "auto",
	overflowX: "visible",
});

const DeveloperCard = memo(({
	children,
	developerCard = true,
	avatarSrc = null,
	headerTitle = null,
	onClick,
	visible,
	subHeaderTitle = null,
	showVisibleIcon = true,
	bottomBarFirstTitle = null,
	bottomBarFirstTitleValue = null,
	bottomBarSecondTitle = null,
	bottomBarSecondTitleValue = null,
	pointsBurned,
	pointsTotal,
	actionFunction = null,
}) => {
	const handleVisibilityClick = useCallback(async () => {
		await actionFunction();
	}, [actionFunction]);

	return (
		<Card sx={{ cursor: onClick ? "pointer" : "default" }}>
			<CardActionArea
				sx={{
					height: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "stretch",
					textAlign: "inherit",
					cursor: onClick ? "pointer" : "default",
					transition: "filter 150ms ease, opacity 150ms ease, transform 150ms ease",
					...(visible
						? {}
						: {
							opacity: 0.55, // a little faded
							filter: "grayscale(60%)", // slight gray
							"&:hover": { // keep it subdued on hover too
								opacity: 0.6,
								filter: "grayscale(60%)",
								transform: "none",
							},
						}),
				}}
				onClick={onClick}
			>
				<Header
					avatar={avatarSrc ? <Avatar src={avatarSrc}>{headerTitle?.[0]}</Avatar> : ""}
					title={headerTitle ? <Typography variant="h5">{headerTitle}</Typography> : ""}
					subheader={subHeaderTitle ? <Typography variant="body1">{subHeaderTitle}</Typography> : ""}
					action={(
						showVisibleIcon && (
							<IconButton
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation(); // ← stop bubbling to CardActionArea
									handleVisibilityClick(actionFunction); // (optional) toggle instead of passing current
								}}
							>
								{visible ? <Visibility /> : <VisibilityOff sx={{ color: "grey.500" }} />}
							</IconButton>
						)
					)}
				/>
				<CardContent>
					{children}
				</CardContent>
				<BottomBar>
					<GutterTypography variant="caption">
						{bottomBarFirstTitle ?? ""}
						{" "}
						{developerCard ? (
							<>
								<strong>{pointsBurned}</strong>
								{"/"}
								<strong>{pointsTotal}</strong>
							</>
						) : (
							<strong>{bottomBarFirstTitleValue ?? ""}</strong>
						)}

					</GutterTypography>
					<GutterTypography variant="caption">
						{bottomBarSecondTitle ?? ""}
						{" "}
						<strong>{bottomBarSecondTitleValue ?? ""}</strong>
					</GutterTypography>
				</BottomBar>
			</CardActionArea>
		</Card>
	);
});

DeveloperCard.propTypes = {
	children: PropTypes.node.isRequired,
	avatarSrc: PropTypes.string,
	bottomBarFirstTitle: PropTypes.string,
	bottomBarFirstTitleValue: PropTypes.string,
	bottomBarSecondTitle: PropTypes.string,
	bottomBarSecondTitleValue: PropTypes.string,
	pointsBurned: PropTypes.string,
	headerTitle: PropTypes.string,
	subHeaderTitle: PropTypes.string,
	pointsTotal: PropTypes.string,
	onClick: PropTypes.func,
	actionFunction: PropTypes.func,
	visible: PropTypes.bool,
	showVisibleIcon: PropTypes.bool,
	developerCard: PropTypes.bool,
};

DeveloperCard.defaultProps = {
	avatarSrc: "",
	headerTitle: "",
	subHeaderTitle: "",
	bottomBarFirstTitleValue: "",
	bottomBarSecondTitle: "",
	bottomBarSecondTitleValue: "",
	bottomBarFirstTitle: "",
	pointsBurned: "",
	pointsTotal: "",
	showVisibleIcon: true,
	developerCard: true,
	onClick: null,
	visible: true,
	actionFunction: () => {},
};

export default DeveloperCard;
