import { useLayoutEffect, useState } from "react";
import { TourProvider as ReactTourProvider } from "@reactour/tour";
import PropTypes from "prop-types";
import { Button } from "@mui/material";
import queryString from "query-string";
import { useLocation, useNavigate } from "react-router-dom";

import { updateTourEnd } from "../api/index.js";
import { tourStyles } from "../utils/index.js";

import TourDialog from "./TourDialog.jsx";

// Some steps should not be save in browser history to protect the navigation
const stepsToNotStoreHistory = {
	addProject: [1],
	projectAnalitycs: [],
	qualityAnalitycs: [],
};

const TourProvider = ({ children }) => {
	const [dialogOpen, setDialogOpen] = useState(false);
	const { pathname, search } = useLocation();
	const navigate = useNavigate();
	const [trackingInfo, setTrackingInfo] = useState({ step: 0, tour: "" });

	const [isPageDisabled, setIsPageDisabled] = useState(false);

	useLayoutEffect(() => {
		// // Disable body scroll when the page is disabled
		if (isPageDisabled) {
			document.body.style.overflow = "hidden";
			document.documentElement.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "visible";
			document.documentElement.style.overflow = "visible";
		}
	}, [isPageDisabled]);

	const afterOpen = () => {
		setIsPageDisabled(true);
		const parsed = queryString.parse(search);
		if (parsed.tour === "addProject") {
			parsed.tourStep = Number(parsed.tourStep ?? 0);
			if (parsed.tourStep === 0) {
				navigate(queryString.stringifyUrl({ url: pathname, query: parsed }));
			} else {
				navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
			}
		}
	};

	const radius = 20;
	return (
		<ReactTourProvider
			disableKeyboardNavigation
			disableDotsNavigation
			badgeContent={({ currentStep, totalSteps }) => `${currentStep + 1}/${totalSteps}`}
			// this is for changing tha padding of the highlighted element
			// mask is for changing the area between element and highlighted area
			// popover is for set distance between highlighted element and popover message
			padding={{ mask: 8, popover: [20, 20] }}
			styles={{
				popover: (base) => ({
					...base,
					borderRadius: radius,
					padding: "30px",
					background: "#e9edf2",
					display: "grid",
					gridTemplateRows: "1fr auto",
					gap: "10px",
					alignItems: "start",
					boxSizing: "border-box",
					"--reactour-accent": "#e9edf2",
					maxWidth: "450px",
				}),
				// this is changing the non highlighted area color
				maskWrapper: (base) => ({ ...base, ...tourStyles.maskWrapper, rx: 100, ry: 100 }),

				highlightedArea: (base, { x, y, width, height }) => ({
					...base,
					...tourStyles.highlightedArea,
					x: x - 3,
					y: y - 3,
					width: width + 6,
					height: height + 6,
				}),

				// this is changing the aera of the controls buttons
				controls: (base) => ({
					...base,
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "8px",
					background: "#FFFFFF",
					marginTop: "40px",
					marginBottom: "-30px",
					marginRight: "-30px",
					marginLeft: "-30px",
					borderBottomRightRadius: "18px",
					borderBottomLeftRadius: "18px",
				}),

				badge: (base) => ({ ...base, background: "#00cbc4" }),

			}}
			prevButton={({ currentStep, steps, setCurrentStep }) => (
				<Button
					disabled={steps[currentStep].disablePrev}
					onClick={() => {
						const parsed = queryString.parse(search);
						if (parsed.tour === "addProject") {
							parsed.tourStep = Number(parsed.tourStep) - 1;
							navigate(queryString.stringifyUrl({ url: pathname, query: parsed }));
							if (stepsToNotStoreHistory[steps[0].tourLabel].includes(parsed.tourStep + 1)) {
								navigate(queryString.stringifyUrl({ url: pathname, query: parsed }), { replace: true });
							} else {
								navigate(queryString.stringifyUrl({ url: pathname, query: parsed }));
							}
						} else {
							setCurrentStep((pS) => pS - 1);
						}
					}}
				>
					{"Back"}
				</Button>
			)}
			nextButton={({ currentStep, stepsLength, steps, setIsOpen, setCurrentStep }) => {
				const last = currentStep === stepsLength - 1;
				const parsed = queryString.parse(search);
				const label = parsed.tour;
				return (
					<Button
						disabled={steps[currentStep].disableNext}
						onClick={async () => {
							if (last) {
								setIsOpen(false);
								if (parsed.tour === "addProject") {
									navigate(queryString.stringifyUrl({ url: pathname }), { replace: true });
								}

								await updateTourEnd({ step: currentStep, tour: label });
								setIsOpen(false);
							} else if (parsed.tour === "addProject") {
								parsed.tourStep = Number(parsed.tourStep) + 1;
								const redirectionUrl = queryString.stringifyUrl({ url: pathname, query: parsed });
								if (stepsToNotStoreHistory[label].includes(parsed.tourStep)) {
									navigate(redirectionUrl, { replace: true });
								} else {
									navigate(redirectionUrl);
								}
							} else {
								setCurrentStep((pS) => pS + 1);
							}
						}}
					>
						{last ? "Done!" : "Next"}
					</Button>
				);
			}}
			afterOpen={afterOpen}
			beforeClose={() => {
				setIsPageDisabled(false);
			}}
			onClickClose={({ currentStep }) => {
				const parsed = queryString.parse(search);
				setTrackingInfo({ step: currentStep, tour: parsed.tour });
				setDialogOpen(true);
				setIsPageDisabled(false);
			}}
			onClickMask={() => {
				"Do nothing";
			}}
		>
			{children}
			<TourDialog
				dialogOpen={dialogOpen}
				setDialogOpen={setDialogOpen}
				setIsPageDisabled={setIsPageDisabled}
				trackingInfo={trackingInfo}
			/>
		</ReactTourProvider>
	);
};

TourProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

export default TourProvider;
