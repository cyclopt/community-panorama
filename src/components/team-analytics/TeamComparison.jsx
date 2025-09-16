import { memo } from "react";
import { Grid } from "@mui/material";
import PropTypes from "prop-types";

import SectionTitle from "../SectionTitle.jsx";

import DeveloperCompareRadar from "./DeveloperCompareRadar.jsx";

const TeamComparison = ({
	developers,
	isLoadingCharacteristics,
	developersSoftskills,
	isLoadingSoftskills,
}) => (
	<SectionTitle title="Comparison">
		<Grid container spacing={2} textAlign="center" m={-1} xs={12}>
			<Grid item xs={12} width="100%">
				<DeveloperCompareRadar
					metrics={developers}
					isLoading={isLoadingCharacteristics}
					label="characteristics"
				/>
			</Grid>
			<Grid item xs={12} width="100%">
				<DeveloperCompareRadar
					metrics={developersSoftskills}
					isLoading={isLoadingSoftskills}
					label="softSkills"
				/>
			</Grid>
		</Grid>
	</SectionTitle>
);

TeamComparison.propTypes = {
	developers: PropTypes.array.isRequired,
	developersSoftskills: PropTypes.array.isRequired,
	isLoadingCharacteristics: PropTypes.bool,
	isLoadingSoftskills: PropTypes.bool,
};

TeamComparison.defaultProps = {
	isLoadingCharacteristics: false,
	isLoadingSoftskills: false,
};

export default memo(TeamComparison);
