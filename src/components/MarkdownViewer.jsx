import { CircularProgress } from "@mui/material";
import { lazy, Suspense } from "react";

const BaseMarkdownViewer = lazy(() => import("./BaseMarkdownViewer.jsx"));

const MarkdownViewer = (props) => (
	<Suspense fallback={<div style={{ display: "flex", justifyContent: "center" }}><CircularProgress color="secondary" /></div>}>
		<BaseMarkdownViewer {...props} />
	</Suspense>
);

export default MarkdownViewer;
