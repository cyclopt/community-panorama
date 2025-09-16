import { useState, memo, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { Grid, Typography, MenuItem } from "@mui/material";
import queryString from "query-string";
import { useLocation, useNavigate } from "react-router-dom";

import MetricTile from "../../components/MetricTile.jsx";
import Select from "../../components/Select.jsx";
import { metricsInfo, useSnackbar } from "../../utils/index.js";
import { useAudits } from "../../api/index.js";

const QualityMetrics = (props) => {
	const { analysis, enableTaskButton } = props;
	const [metric, setMetric] = useState("");
	const { error } = useSnackbar();
	const { audits = {}, isError } = useAudits(analysis._id);
	const location = useLocation();
	const navigate = useNavigate();

	const metricInfo = useMemo(() => (analysis._id
		? metricsInfo[analysis?.language?.toLowerCase()] || metricsInfo.default
		: []), [analysis._id, analysis.language]);

	useEffect(() => {
		if (isError) error();
	}, [error, isError]);

	useEffect(() => {
		const parsed = queryString.parse(location.search);
		if (parsed?.category) setMetric(parsed.category);
		else setMetric("");
	}, [location.search]);

	return (
		<Grid container>
			<Grid item xs={12}>
				<Grid container direction="row" justifyContent="flex-end" alignItems="center" sx={{ "> .MuiGrid-item": { mb: 3, px: 1 } }}>
					<Grid item display="flex" md={6} xs={12} m={-1} sx={{ justifyContent: { xs: "center", md: "flex-end" } }}>
						<Grid item style={{ display: "flex", alignItems: "center" }} mr={1}>
							<Typography variant="h6" color="primary">{"Metric Category:"}</Typography>
						</Grid>
						<Grid item xs={6}>
							<Select
								id="metric"
								value={metric}
								onChange={(e) => {
									setMetric(e.target.value);
									const parsed = queryString.parse(location.search);
									parsed.category = e.target.value || undefined;
									navigate(queryString.stringifyUrl({ url: location.pathname, query: parsed }), { replace: true });
								}}
							>
								<MenuItem value="">{"All"}</MenuItem>
								<MenuItem value="Maintainability">{"Maintainability"}</MenuItem>
								<MenuItem value="Readability">{"Readability"}</MenuItem>
								<MenuItem value="Reusability">{"Reusability"}</MenuItem>
								<MenuItem value="Security">{"Security"}</MenuItem>
							</Select>
						</Grid>
					</Grid>
				</Grid>
			</Grid>
			<Grid item container direction="row" justifyContent="center" mt={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
				{metricInfo.map((el, ind) => (
					<Grid
						key={`metric_${ind}_${el.title}`}
						item
						xs={12}
						md={4}
						hidden={
							(el.metric === "MI"
								&& analysis.language?.toLowerCase() === "python"
								&& analysis.metricsScores?.[el.category]?.[el.metric]?.avgValue === 0)
								|| (metric && !el.affects.includes(metric))
						}
					>
						<MetricTile
							title={el.title}
							tooltip={el.explanation}
							content={el.howToFix}
							reason={el.reason}
							value={(["NSP_VIOL", "SECURITY_VIOL"].includes(el.metric) ? audits?.vulnerabilities?.length : analysis.metricsScores?.[el.category]?.[el.metric]?.avgValue) || 0}
							score={(analysis.metricsScores?.[el.category]?.[el.metric]?.avgScore || 0) * 100}
							affects={el.affects}
							threshold={el.threshold}
							numOfFiles={new Set(analysis.metricsRecommendations?.[el.metric]?.files?.map((e) => e.filePath)).size}
							percentageOfCode={analysis?.metricsRecommendations?.[el.metric]?.affectedPercetange || 0}
							moreInfo={["NSP_VIOL", "SECURITY_VIOL"].includes(el.metric) ? audits : null}
							language={analysis?.language?.toLowerCase()}
							enableTaskButton={enableTaskButton || false}
						/>
					</Grid>
				))}
			</Grid>
		</Grid>
	);
};

QualityMetrics.propTypes = {
	analysis: PropTypes.object.isRequired,
	enableTaskButton: PropTypes.bool.isRequired,
};

export default memo(QualityMetrics);
