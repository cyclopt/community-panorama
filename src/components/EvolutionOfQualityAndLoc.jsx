import { memo, useMemo, useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { CircularProgress, Switch } from "@mui/material";
import { dateOldToNew } from "@iamnapo/sort";

import { dayjs, percentChange } from "../utils/index.js";

import Plot from "./Plot.jsx";
import Card from "./Card.jsx";

function insertBrTags(text, maxChars = 50, wordLimit = 3) {
	const words = text.split(" ");
	let newString = "";
	let currentCharCount = 0;
	let wordCount = 0;

	for (const word of words) {
		currentCharCount += word.length + 1; // +1 for the space
		wordCount += 1;

		newString += `${word} `;

		if (wordCount >= wordLimit || currentCharCount >= maxChars) {
			newString += "<br>";
			wordCount = 0; // reset word count for every 4 words
			currentCharCount = 0; // reset character count for every 100 characters
		}
	}

	return newString.trim();
}

const EvolutionOfQualityAndLoc = ({ commits, setSelectedCommitNote }) => {
	const plotRef = useRef(null);
	const [isPlotReady, setIsPlotReady] = useState(false);
	const [annotations, setAnnotations] = useState([]);
	const [hovermode, setHovermode] = useState("x");
	const [sawNotes, setSawNotes] = useState(false);
	const modifiedLayout = useMemo(() => ({ annotations }), [annotations]);

	const plotData = useMemo(() => {
		const sortedData = [...(commits ?? [])].sort(dateOldToNew((v) => dayjs(v.authoredAt).toDate()));

		return [{
			x: sortedData.map((e) => `Commit #${e.hash.slice(0, 6)}`),
			y: sortedData.map((e) => e.totalLocAnalyzed),
			hovertext: sortedData.map((e, ind) => (ind > 0 ? `${percentChange(sortedData[ind - 1].totalLocAnalyzed, e.totalLocAnalyzed)} ${sawNotes ? "Click to add Note" : ""}` : "")),
			type: "scatter",
			mode: "lines",
			name: "Lines of Code",
		}, {
			x: sortedData.map((e) => `Commit #${e.hash.slice(0, 6)}`),
			y: sortedData.map((e) => e.overallQualityScore),
			hovertext: sortedData.map((e, ind) => (ind > 0 ? `${percentChange(sortedData[ind - 1].overallQualityScore, e.overallQualityScore)}` : "")),
			type: "scatter",
			mode: "lines",
			name: "Total Quality",
			yaxis: "y2",
			line: { dash: "dot" },
		},
		{ ...(sawNotes
			? { x: sortedData.filter((e) => e.note).map((e) => `Commit #${e.hash.slice(0, 6)}`),
				y: sortedData.filter((e) => e.note).map((e) => e.totalLocAnalyzed),
				type: "scatter",
				mode: "markers",
				name: "Note Marker",
				text: "months",
				hovertext: sawNotes ? "Click to Open/Close" : "",
				showlegend: false,
				marker: { color: "rgba(10, 180, 180, .8)",
					size: 16 } }
			: {}) },
		];
	}, [commits, sawNotes]);

	useEffect(() => {
		if (!isPlotReady) return;
		const plotElement = plotRef.current?.el;
		if (!plotElement) return; // Early return if ref is not attached yet

		const handleClick = (event) => {
			const { points } = event;
			const point = points[0];
			switch (point.fullData.name) {
				case "Total Quality": {
					if (!points || points.length === 0) {
						setAnnotations([]);
					}

					return;
				}

				case "Lines of Code": {
					const commit = commits.find((c) => `Commit #${c.hash.slice(0, 6)}` === point.x);
					setAnnotations([]);
					setSelectedCommitNote({
						hash: commit.hash,
						_id: commit._id,
					});

					break;
				}

				case "Note Marker": {
					const commit = commits.find((c) => `Commit #${c.hash.slice(0, 6)}` === point.x);
					if (commit && !annotations.some((a) => a.commit.hash === commit.hash)) {
						const newAnnotation = {
							x: point.xaxis.d2l(point.x),
							y: point.yaxis.d2l(point.y),
							xref: "x",
							yref: "y",
							ax: 0,
							ay: -80,
							bgcolor: "rgba(255, 255, 255, 0.9)",
							showarrow: true,
							arrowhead: 6,
							arrowsize: 1,
							arrowwidth: 2,
							arrowcolor: "#636363",
							borderwidth: 3,
							borderpad: 4,
							bordercolor: "#c7c7c7",
							text: insertBrTags(commit.note),
							align: "left",
							commit: {
								hash: commit.hash,
								_id: commit._id,
							},
							captureevents: true,
							font: {
								family: "Courier New, monospace",
								size: 16,
								color: "#000dwd",
							},
							opacity: 0.8,
						};
						setAnnotations((prev) => [...prev, newAnnotation]);
					} else {
						setAnnotations((prev) => prev.filter((p) => (p.commit.hash !== commit.hash)));
					}

					break;
				}

				default:
			// Do nothing
			}
		};

		const handleClickannotation = (event) => {
			const commit = commits.find((c) => c.hash === event.annotation.commit.hash);
			setAnnotations([]);
			setSelectedCommitNote({
				hash: commit.hash,
				_id: commit._id,
			});
		};

		if (plotElement.childNodes.length > 0) {
			plotElement.on("plotly_clickannotation", handleClickannotation);

			plotElement.on("plotly_click", handleClick);

			return () => { // eslint-disable-line consistent-return
				if (plotRef.current?.el) { // eslint-disable-line react-hooks/exhaustive-deps
					plotElement.removeAllListeners("plotly_clickannotation");
					plotElement.removeAllListeners("plotly_click");
				}
			};
		}
	}, [annotations, commits, isPlotReady, setSelectedCommitNote]);

	return (
		<Card title="Evolution of Quality and Lines of Code" contentClassName="evolution-of-quality-and-loc-diagram">
			{(commits && plotData) ? (plotData.length > 0 ? (
				<>
					<Plot
						ref={plotRef}
						data={plotData}
						layout={{
							hovermode,
							xaxis: { title: "Commits", showgrid: true, zeroline: false, tickangle: -45, showticklabels: false },
							yaxis: { title: "<b>Lines of Code</b>", showgrid: true, zeroline: false },
							yaxis2: { title: "<b>Total Quality</b>", showgrid: true, zeroline: false, overlaying: "y", side: "right", range: [0, 1] },
							margin: { t: 10, l: 50, b: 30 },
							autosize: true,
							// Disable double-click to reset the legend state
							legend: {
								doubleclick: false,
							},
							...modifiedLayout,
						}}
						onReady={() => { setIsPlotReady(true); }}
					/>
					<button
						type="button"
						style={{
							position: "absolute",
							right: "10px",
							bottom: "10px",
							zIndex: 10,
							border: "none",
							backgroundColor: "#fafafa",
							borderRadius: "3px",
							cursor: "pointer",
							boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
							fontSize: "12px",
						}}
						onClick={() => {
							setSawNotes((p) => !p);
							setHovermode((prevMode) => (prevMode === "closest" ? "x" : "closest"));
							setAnnotations([]);
						}}
					>
						{"Note Mode:"}
						<Switch
							size="small"
							checked={sawNotes}
							inputProps={{ "aria-label": "controlled" }}
						/>
					</button>

				</>
			) : <span>{"No data available!"}</span>) : (<div style={{ display: "flex", justifyContent: "center" }}><CircularProgress color="secondary" /></div>)}
		</Card>
	);
};

EvolutionOfQualityAndLoc.propTypes = {
	commits: PropTypes.array,
	setSelectedCommitNote: PropTypes.func,
};

export default memo(EvolutionOfQualityAndLoc);
