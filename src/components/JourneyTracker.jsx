import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";

import { registerJourney } from "#api";
import { ROUTE_PATTERNS } from "#utils";

const JourneyTracker = ({ decodedToken, children }) => {
	const { pathname } = useLocation();
	const lastPathnameRef = useRef();

	useEffect(() => {
		if (!decodedToken?.customToken && pathname !== lastPathnameRef.current) {
			try {
				const matchingRoute = ROUTE_PATTERNS.find((r) => r.pattern.test(pathname));

				if (matchingRoute?.pageKey && pathname !== "/") {
					const { pageKey, group } = matchingRoute;
					(async () => {
						try {
							await registerJourney({ pageKey, group, metaData: { platform: "panorama" } });
							lastPathnameRef.current = pathname; // Update the ref after successful registration
						} catch {
							// Handle error
						}
					})();
				}
			} catch { /* */ }
		}
	}, [decodedToken, pathname]);

	return children;
};

JourneyTracker.propTypes = {
	children: PropTypes.node.isRequired,
	decodedToken: PropTypes.object,
};

export default JourneyTracker;
