import { lazy, Suspense, forwardRef } from "react";
import PropTypes from "prop-types";
import { CircularProgress } from "@mui/material";

const BasePlot = lazy(async () => {
	const Plotly = await import("plotly.js/lib/core");
	Plotly.setPlotConfig({ logging: false });
	const modules = await Promise.all([
		import("plotly.js/lib/scatter"),
		import("plotly.js/lib/bar"),
		import("plotly.js/lib/pie"),
		import("plotly.js/lib/box"),
		import("plotly.js/lib/scatterpolar"),
	]);
	Plotly.register(modules.map((m) => m.default));
	const createPlotlyComponent = await import("react-plotly.js/factory");
	return { default: createPlotlyComponent.default(Plotly) };
});

const Plot = forwardRef(({ layout, config, onReady, ...props }, ref) => (
	<Suspense fallback={<div style={{ display: "flex", justifyContent: "center" }}><CircularProgress color="secondary" /></div>}>
		<BasePlot
			ref={ref}
			useResizeHandler
			style={{ width: "100%", height: "24rem" }}
			config={{ displayModeBar: false, responsive: true, ...config }}
			layout={{ hovermode: "x", autosize: true, ...layout }}
			{...props}
			onInitialized={() => onReady && onReady()}
		/>
	</Suspense>
));

Plot.propTypes = {
	layout: PropTypes.object,
	config: PropTypes.object,
	onReady: PropTypes.func,
};

Plot.defaultProps = {
	layout: {},
	config: {},
	onReady: () => {},
};

export default Plot;
