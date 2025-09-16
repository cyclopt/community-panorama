import PropTypes from "prop-types";
import { Navigate, useLocation } from "react-router-dom";

import { jwt } from "../utils/index.js";

const GuestOnly = ({ c }) => {
	const location = useLocation();
	return jwt.isAuthenticated()
		? <Navigate to="/overview" state={{ from: location }} />
		: c;
};

GuestOnly.propTypes = { c: PropTypes.node.isRequired };

export default GuestOnly;
