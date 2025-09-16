import { useState, useEffect, memo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import queryString from "query-string";

import { jwt, useSnackbar } from "../utils/index.js";
import api from "../api/index.js";

const Auth = () => {
	const location = useLocation();
	const { error: error_ } = useSnackbar();
	const [redirectTo, setRedirectTo] = useState("/overview");

	useEffect(() => {
		try {
			setRedirectTo((p) => JSON.parse(sessionStorage.getItem("redirectTo")) || p);
			sessionStorage.removeItem("redirectTo");
		} catch { /** empty */ }
	}, []);

	const [state, setState] = useState({ user: null, error: null });
	const [error, setError] = useState(queryString.parse(location.search)?.error || null);

	useEffect(() => {
		(async () => {
			try {
				const { token, rToken, error: err } = queryString.parse(location.search);
				if (error) {
					setError(err);
				} else {
					if (token) jwt.setToken(token);
					if (rToken) jwt.setRToken(rToken);
					const usr = await api.get("api/panorama/users/attempt-auth/");

					setState({ user: usr });
				}
			} catch (error__) {
				console.log(error__);
				error_();
			}
		})();
	}, [error, error_, location.search]);

	if (error) return (<Navigate replace to="/" state={{ error }} />);
	if (!state.user) return <div />;
	return state.user.ok ? <Navigate replace to={redirectTo} /> : <Navigate replace to="/" />;
};

export default memo(Auth);
