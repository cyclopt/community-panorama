import { Typography, Grid, Link as MaterialLink, ListItem, ListItemIcon, Box } from "@mui/material";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { styled } from "@mui/material/styles";

const IconWrap = styled(Box)(({ theme }) => ({
	borderRadius: theme.shape.borderRadius,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	marginRight: "1rem",
	flexShrink: 0,
	"& img": {
		objectFit: "contain",
		width: 24,
		height: 24,
	},
}));

const ComponentOverviewItem = ({
	component,
	icon,
	message,
	link,
	projectOrRepository,
	qualityGatesLinkComponent,
	avatarsComponent,
	imageSrc,
}) => (
	<Grid container direction="column" justifyContent="center" alignItems="left" sx={{ height: "100%", pb: "0.5rem", pr: "1rem" }}>
		<ListItem sx={{ p: 0, display: "flex", alignItems: "flex-start" }}>
			<IconWrap>
				{imageSrc ? (
					<img src={imageSrc} alt={`${message} icon`} />
				) : (
					<ListItemIcon sx={{ minWidth: "1.25rem", pr: "0.5rem" }}>
						{icon}
					</ListItemIcon>
				)}
			</IconWrap>
			<Typography variant="body1" sx={{ display: "inline" }}>
				<span style={{ paddingRight: "0.5rem" }}>{projectOrRepository}</span>
				<MaterialLink
					component={Link}
					underline="none"
					to={link}
					style={{ fontWeight: "bold", paddingRight: "0.5rem" }}
				>
					{component.name}
				</MaterialLink>
				{qualityGatesLinkComponent}
				<span>{message}</span>
				{avatarsComponent}
			</Typography>

		</ListItem>
	</Grid>
);

ComponentOverviewItem.propTypes = {
	component: PropTypes.object,
	icon: PropTypes.object,
	message: PropTypes.string,
	link: PropTypes.string,
	projectOrRepository: PropTypes.string,
	imageSrc: PropTypes.string,
	qualityGatesLinkComponent: PropTypes.node,
	avatarsComponent: PropTypes.node,
};

export default ComponentOverviewItem;
