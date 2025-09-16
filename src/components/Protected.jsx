import PropTypes from "prop-types";
import { Navigate, useLocation } from "react-router-dom";
import queryString from "query-string";

import { jwt } from "../utils/index.js";

const maybeSetToken = (Component) => (props) => {
	const { search } = useLocation();
	const { token } = queryString.parse(search);
	if (token) jwt.setToken(token);
	return <Component {...props} />;
};

const Protected = ({ c }) => {
	const location = useLocation();
	return jwt.isAuthenticated() ? c : <Navigate replace to="/" state={{ from: location }} />;
};

Protected.propTypes = { c: PropTypes.node.isRequired };

export default maybeSetToken(Protected);

