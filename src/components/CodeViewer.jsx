import { CircularProgress } from "@mui/material";
import { forwardRef, lazy, Suspense } from "react";

const BaseCodeViewer = lazy(() => import("./BaseCodeViewer.jsx"));

const CodeViewer = forwardRef((props, ref) => (
	<Suspense fallback={<div style={{ display: "flex", justifyContent: "center" }}><CircularProgress color="secondary" /></div>}>
		<BaseCodeViewer ref={ref} {...props} />
	</Suspense>
));

export default CodeViewer;
