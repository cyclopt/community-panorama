import PropTypes from "prop-types";
import { memo } from "react";
import { Grid, Button, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const LegendButtons = ({ data, hiddenColumns, setHiddenColumns }) => {
	const theme = useTheme();

	return (
		<Grid container item display="flex" flexDirection="row" justifyContent="flex-end">
			{data.map((d, dIndex) => (
				<Grid key={`${d.name}_${dIndex}`} item>
					<Button
						disableRipple
						size="small"
						sx={{
							m: 1,
							mt: 0,
							borderRadius: 0.8,
							borderWidth: 1,
							borderStyle: "solid",
							textTransform: "none",
							fontSize: theme.typography.caption.fontSize,
							display: "flex",
							flexDirection: "row",
							justifyContent: "center",
							alignItems: "center",
							transition: "color 100ms, borderColor 100ms",
							...(hiddenColumns.includes(d.name)
								? { color: theme.palette.cardBackgroundDark.main, borderColor: theme.palette.cardBackgroundDark.main }
								: { borderColor: d.line.color }
							),
						}}
						onClick={() => setHiddenColumns((prev) => {
							const updatedHiddenColumns = [...prev];
							const colIndex = updatedHiddenColumns.indexOf(d.name);
							if (colIndex >= 0) {
								updatedHiddenColumns.splice(colIndex, 1);
							} else { updatedHiddenColumns.push(d.name); }

							return updatedHiddenColumns;
						})}
					>
						<Box
							sx={{
								transition: "background 100ms",
								background: (hiddenColumns.includes(d.name) ? theme.palette.cardBackgroundDark.main : d.line.color),
								height: 16,
								width: 16,
								borderRadius: "100%",
								mr: 1,
							}}
						/>
						{d.name}
					</Button>
				</Grid>
			))}
		</Grid>
	);
};

LegendButtons.propTypes = {
	data: PropTypes.arrayOf(PropTypes.object),
	hiddenColumns: PropTypes.array,
	setHiddenColumns: PropTypes.func,
};

export default memo(LegendButtons);
