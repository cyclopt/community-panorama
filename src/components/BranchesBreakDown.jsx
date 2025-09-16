import PropTypes from "prop-types";
import { memo } from "react";
import { Grid, Typography } from "@mui/material";

import Card from "./Card.jsx";
import Plot from "./Plot.jsx";

const BranchesBreakDown = ({ data }) => {
	const branches = {};

	for (const { targetRefName } of data) {
		const branch = targetRefName.replace("refs/heads/", "");
		if (!branches[branch]) branches[branch] = 0;
		branches[branch] += 1;
	}

	const pieData = {};
	for (const [key, value] of Object.entries(branches)) {
		if ((value / data.length) * 100 < 5) {
			if (!pieData?.other) pieData.other = 0;
			pieData.other += value;
		} else {
			pieData[key] = value;
		}
	}

	return (
		<Card title="Target Branches">
			<Grid container>
				<Grid container item flexDirection="row" justifyContent="center" alignItems="center" sm={12} md={6}>
					<Grid item container>
						<Grid item xs={6}><Typography style={{ fontWeight: "600" }}>{"Branches"}</Typography></Grid>
						<Grid item xs={3}><Typography style={{ fontWeight: "600" }}>{"Count"}</Typography></Grid>
						<Grid item xs={3}><Typography style={{ fontWeight: "600" }}>{"Percentage"}</Typography></Grid>
					</Grid>
					{Object.entries(branches).map(([branch, count], i) => (
						<Grid key={`b-${i}`} item container>
							<Grid item xs={6}>{branch}</Grid>
							<Grid item xs={3}>{count}</Grid>
							<Grid item xs={3}>{`${((count / data.length) * 100).toFixed(2)}%`}</Grid>
						</Grid>
					))}
				</Grid>
				<Grid item container justifyContent="center" alignItems="center" sm={12} md={6}>
					<Plot
						data={[{
							labels: Object.keys(pieData),
							values: Object.values(pieData),
							type: "pie",
							name: "Target Branches Breakdown",
							textposition: "outside",
							textinfo: "label+percent",
							sort: false,
							automargin: true,
							marker: {
								line: { color: "#fff", width: 3 },
							},
						}]}
						layout={{ showlegend: false, margin: { t: 40, l: 40, b: 40 } }}
					/>
				</Grid>
			</Grid>
		</Card>
	);
};

BranchesBreakDown.propTypes = {
	data: PropTypes.array,
};

export default memo(BranchesBreakDown);
