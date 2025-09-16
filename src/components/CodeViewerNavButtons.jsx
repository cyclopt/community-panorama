import PropTypes from "prop-types";
import { Button, Zoom, ButtonGroup } from "@mui/material";
import { KeyboardArrowUp, KeyboardArrowDown } from "@mui/icons-material";

const CodeViewerNavButtons = ({ diagnostics, editorRef }) => (
	<Zoom in>
		<ButtonGroup
			disabled={diagnostics.length === 0}
			variant="contained"
			color="secondary"
			sx={{ position: "fixed", bottom: (t) => t.spacing(2), right: (t) => t.spacing(2), zIndex: 10 }}
		>
			<Button
				size="small"
				title="Previous message"
				aria-label="Previous message"
				onClick={() => {
					try {
						const currentDiagnostic = diagnostics.current();
						let nextDiagnostic = diagnostics.previous();
						while (currentDiagnostic.line === nextDiagnostic.line && currentDiagnostic !== nextDiagnostic) {
							nextDiagnostic = diagnostics.previous();
						}

						diagnostics.index = diagnostics.indexOf(nextDiagnostic);

						editorRef.current.view.dispatch({
							selection: { anchor: editorRef.current.state.doc.line(nextDiagnostic.line).from },
							scrollIntoView: true,
						});
						requestAnimationFrame(() => {
							const gutters = [...document.querySelectorAll(".cm-lineNumbers > div.cm-gutterElement")];
							gutters.find((e) => e.textContent === String(currentDiagnostic.line))?.classList?.remove?.("cm-mark");
							gutters.find((e) => e.textContent === String(nextDiagnostic.line))?.classList?.add?.("cm-mark");
						});
					} catch { /** empty */ }
				}}
			>
				<KeyboardArrowUp />
			</Button>
			<Button
				size="small"
				title="Next message"
				aria-label="Next message"
				onClick={() => {
					try {
						const currentDiagnostic = diagnostics.current();
						let nextDiagnostic = diagnostics.next();
						while (currentDiagnostic.line === nextDiagnostic.line && currentDiagnostic !== nextDiagnostic) {
							nextDiagnostic = diagnostics.next();
						}

						diagnostics.index = diagnostics.indexOf(nextDiagnostic);

						editorRef.current.view.dispatch({
							selection: { anchor: editorRef.current.state.doc.line(nextDiagnostic.line).from },
							scrollIntoView: true,
						});
						requestAnimationFrame(() => {
							const gutters = [...document.querySelectorAll(".cm-lineNumbers > div.cm-gutterElement")];
							gutters.find((e) => e.textContent === String(currentDiagnostic.line))?.classList?.remove?.("cm-mark");
							gutters.find((e) => e.textContent === String(nextDiagnostic.line))?.classList?.add?.("cm-mark");
						});
					} catch { /** empty */ }
				}}
			>
				<KeyboardArrowDown />
			</Button>
		</ButtonGroup>
	</Zoom>
);

CodeViewerNavButtons.propTypes = {
	diagnostics: PropTypes.array,
	editorRef: PropTypes.object.isRequired,
};

export default CodeViewerNavButtons;
