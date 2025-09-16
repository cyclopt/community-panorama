import { CircularProgress } from "@mui/material";
import { lazy, Suspense } from "react";

const BaseMarkdownEditor = lazy(() => import("./BaseMarkdownEditor.jsx"));

const MarkdownEditor = (props) => (
	<Suspense fallback={<div style={{ display: "flex", justifyContent: "center" }}><CircularProgress color="secondary" /></div>}>
		<BaseMarkdownEditor {...props} />
	</Suspense>
);

export default MarkdownEditor;
