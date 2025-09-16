import { memo, useMemo } from "react";
import PropTypes from "prop-types";
import { Card, Divider, Grid, Typography, Box, Tooltip } from "@mui/material";
import { Error as MuiError } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { styled, useTheme } from "@mui/material/styles";
import queryString from "query-string";

import ScoreTypographyAvatar from "./ScoreTypographyAvatar.jsx";

import { formatTileNumber } from "#utils";

// ─── STYLED COMPONENTS ────────────────────────────────────────────────────
const TileGrid = styled(Grid, { shouldForwardProp: (prop) => prop !== "clickable" })(
	({ clickable, theme }) => ({
		cursor: clickable ? "pointer" : "default",
		display: "flex",
		justifyContent: "center",
		transition: "box-shadow 0.3s ease-in-out",
		...(clickable && {
			"&:hover": {
				boxShadow: `${theme.tileShadow}`,
			},
		}),
	}),
);

const TileCard = styled(Card)(() => ({
	width: "100%",
	display: "flex",
	flexDirection: "column",
}));

const HeaderRow = styled(Box)(() => ({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
}));

const IconWrap = styled(Box)(({ theme }) => ({
	borderRadius: theme.shape.borderRadius,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	padding: theme.spacing(1),
	marginRight: theme.spacing(1),
	"& img": {
		objectFit: "contain",
		width: 48,
		height: 48,
	},
}));

const ValueTypography = styled(Typography)(() => ({
	fontWeight: 500,
}));

const DeltaColumn = styled(Box)(() => ({
	display: "flex",
	flexDirection: "column",
	justifyContent: "center",
	marginLeft: "auto",
}));

const DeltaText = styled(Typography, {
	shouldForwardProp: (prop) => prop !== "colorVariant",
})(
	({ colorVariant }) => ({
		color: colorVariant,
		textAlign: "end",
	}),
);

const StyledDivider = styled(Divider)(({ theme }) => ({
	backgroundColor: theme.palette.grey.deep,
	marginTop: theme.spacing(1),
}));

const LabelTypography = styled(Typography)(({ theme, isMainTile }) => ({
	color: isMainTile ? theme.palette.primary.dark : theme.palette.grey.deep,
	textTransform: "capitalize",
	"&::first-letter": {
		textTransform: "uppercase",
	},
}));

const Error = styled(MuiError)(({ theme }) => ({
	width: "20px",
	color: theme.palette.grey.deep,
}));

// ─── INFO TILE COMPONENT ─────────────────────────────────────────────────
const InfoTile = ({
	iconNode,
	imageSrc,
	value,
	increase,
	decrease,
	label,
	redirectTo,
	revertColors,
	isMainTile,
	tooltip,
	adornment,
	percent = false,
	isTime = false,
	...props
}) => {
	const navigate = useNavigate();
	const theme = useTheme();

	const clickable = redirectTo && Object.keys(redirectTo).length > 0;
	const handleClick = () => {
		if (!clickable) return;

		const finalUrl = queryString.stringifyUrl({
			url: redirectTo.url,
			query: redirectTo.query || {},
		});

		navigate(finalUrl);
	};

	const { increaseColor, decreaseColor } = useMemo(() => {
		const inc = theme.palette.error.main;
		const dec = theme.palette.success.main;
		return revertColors
			? { increaseColor: dec, decreaseColor: inc }
			: { increaseColor: inc, decreaseColor: dec };
	}, [revertColors, theme.palette.error.main, theme.palette.success.main]);

	return (
		<TileGrid item xs={12} sm={6} md={3} clickable={clickable} onClick={handleClick} {...props}>
			<TileCard>
				<HeaderRow>
					<Box display="flex" alignItems="center">
						<IconWrap>
							{imageSrc ? (
								<img src={imageSrc} alt={`${label} icon`} />
							) : iconNode || (
								<ScoreTypographyAvatar score={null} />
							)}
						</IconWrap>
						{!iconNode && <ValueTypography variant="h3">{value === 0 ? value : formatTileNumber(value, { percent, isTime, isFewDays: label === "Days Saved (this week)" })}</ValueTypography>}
					</Box>

					<DeltaColumn>
						{increase != null && (
							<DeltaText colorVariant={increaseColor}>
								{"+"}
								{increase}
							</DeltaText>
						)}
						{decrease != null && (
							<DeltaText colorVariant={decreaseColor}>
								{"-"}
								{decrease}
							</DeltaText>
						)}
					</DeltaColumn>

					<Grid direction="column" display="flex" height="100%" alignItems="center" justifyContent="space-between">
						{tooltip && (
							<Tooltip title={<Typography titleVariant="body2">{tooltip}</Typography>} placement="top">
								<Error />
							</Tooltip>
						)}
						{adornment}
					</Grid>
				</HeaderRow>

				<StyledDivider />

				<LabelTypography isMainTile={isMainTile} variant="subtitle1">
					{label}
				</LabelTypography>
			</TileCard>
		</TileGrid>
	);
};

InfoTile.propTypes = {
	iconNode: PropTypes.element,
	imageSrc: PropTypes.string,
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	increase: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	decrease: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	label: PropTypes.string.isRequired,
	redirectTo: PropTypes.object,
	revertColors: PropTypes.bool,
	isMainTile: PropTypes.bool,
	tooltip: PropTypes.string,
	adornment: PropTypes.element,
	percent: PropTypes.bool,
	isTime: PropTypes.bool,
};

export default memo(InfoTile);
