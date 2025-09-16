import { memo } from "react";
import { Button, Typography, Box, styled } from "@mui/material";
import PropTypes from "prop-types";

// ─── STYLED COMPONENT ───────────────────────────────────────────────────────
const StyledButton = styled(Button)(
	({ theme, variantType, bgColor, borderColor, width }) => {
		// Determine base colors based on variantType
		const key = variantType.replace(/(Background|Border)$/, "").toLowerCase();
		const mainColor = theme.palette[key]?.main ?? theme.palette.grey[500];
		const darkColor = theme.palette[key]?.dark ?? theme.palette.grey[700];

		return {
			width,
			textTransform: "none",
			borderWidth: variantType.includes("Border") ? "1px" : 0,
			borderStyle: variantType.includes("Border") ? "solid" : "none",

			// Normal state
			backgroundColor: variantType.includes("Background")
				? bgColor ?? mainColor
				: "transparent",
			color: variantType.includes("Background")
				? theme.palette.common.white
				: bgColor ?? mainColor,
			borderColor: variantType.includes("Border") ? borderColor ?? mainColor : "transparent",
			borderRadius: theme.shape.borderRadius,

			"&:hover": {
				backgroundColor: variantType.includes("Background")
					? darkColor
					: "transparent",
				borderColor: darkColor,
				color: variantType.includes("Background")
					? theme.palette.common.white
					: darkColor,
			},

			// Disabled state (explicit greyed‐out look)
			"&.Mui-disabled": {
				backgroundColor: theme.palette.grey[400],
				borderColor: variantType.includes("Border")
					? theme.palette.grey[400]
					: "transparent",
				color: theme.palette.grey[300],
				cursor: "not-allowed",
			},
		};
	},
);

const ButtonContent = styled(Typography)({
	transform: "scale(0.9)",
	whiteSpace: "nowrap",
});

const ButtonBox = styled(Box)(() => ({
	display: "flex",
	flexDirection: "column",
	alignItems: "flex-start",
}));

// ─── BUTTON FACTORY ─────────────────────────────────────────────────────────
const makeButton = (variantType, colorKey) => {
	const Component = memo(
		({
			id,
			type = "button",
			disabled = false,
			className = "",
			titleClassName = "",
			titleColor,
			size = "medium",
			width,
			startIcon,
			title,
			onClick,
			backgroundColor,
			borderColor,
			buttonLabel,
			children,
			...props
		}) => (
			<ButtonBox sx={{ width, height: "100%" }}>
				<StyledButton
					id={id}
					type={type}
					disabled={disabled}
					className={className}
					variant={variantType.includes("Background") ? "contained" : "outlined"}
					size={size}
					variantType={variantType}
					startIcon={startIcon}
					sx={{ width, height: "100%" }}
					bgColor={backgroundColor}
					borderColor={borderColor}
					color={colorKey}
					onClick={onClick}
					{...props}
				>
					<ButtonContent className={titleClassName} sx={{ color: titleColor }}>
						{title?.toUpperCase() || children}
					</ButtonContent>
				</StyledButton>
				{buttonLabel}
			</ButtonBox>
		),
	);

	Component.propTypes = {
		id: PropTypes.string,
		type: PropTypes.string,
		disabled: PropTypes.bool,
		className: PropTypes.string,
		titleClassName: PropTypes.string,
		titleColor: PropTypes.string,
		size: PropTypes.string,
		width: PropTypes.string,
		startIcon: PropTypes.element,
		title: PropTypes.string.isRequired,
		onClick: PropTypes.func,
		backgroundColor: PropTypes.string,
		borderColor: PropTypes.string,
		buttonLabel: PropTypes.element,
		children: PropTypes.element,
	};

	Component.defaultProps = {
		id: "default-button-id",
		type: "button",
		disabled: false,
		className: "",
		titleClassName: "",
		titleColor: "",
		size: "medium",
		width: undefined,
		startIcon: undefined,
		onClick: undefined,
		backgroundColor: undefined,
		borderColor: undefined,
		buttonLabel: undefined,
		children: null,
	};

	return Component;
};

// ─── EXPORTS ────────────────────────────────────────────────────────────────
export const PrimaryBackgroundButton = makeButton("PrimaryBackground", "primary");
export const PrimaryBorderButton = makeButton("PrimaryBorder", "primary");
export const SecondaryBackgroundButton = makeButton("SecondaryBackground", "secondary");
export const SecondaryBorderButton = makeButton("SecondaryBorder", "secondary");
export const PinkBackgroundButton = makeButton("PinkBackground", "pink");
export const PinkBorderButton = makeButton("PinkBorder", "pink");
export const SuccessBackgroundButton = makeButton("SuccessBackground", "success");
export const ErrorBackgroundButton = makeButton("ErrorBackground", "error");
export const InfoBackgroundButton = makeButton("InfoBackground", "info");
