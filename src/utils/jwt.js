import { jwtDecode } from "jwt-decode";

import cookie from "./cookie.js";

const isDevelopmentEnvironment = () => {
	if (typeof window === "undefined" || !window.location) return false;
	const hostname = window.location.hostname.toLowerCase();
	return hostname.includes("localhost") || hostname.includes("development");
};

const getCookieOptions = () => {
	if (isDevelopmentEnvironment()) return { path: "/" };
	return { domain: ".cyclopt.com", path: "/" };
};

const jwt = {
	getToken: () => cookie.get("_cyclopt"),
	getRToken: () => cookie.get("_cyclopt_r"),
	setToken: (token) => {
		if (token) {
			const options = getCookieOptions();
			cookie.set("_cyclopt", token, options);
		}
	},
	setRToken: (token) => {
		if (token) {
			const options = getCookieOptions();
			cookie.set("_cyclopt_r", token, options);
		}
	},
	destroyTokens: () => {
		try {
			cookie.remove("_cyclopt");
			cookie.remove("_cyclopt_r");
		} catch { /* empty */ }

		const options = getCookieOptions();
		cookie.remove("_cyclopt", options);
		cookie.remove("_cyclopt_r", options);
	},
	isAuthenticated: () => {
		const token = cookie.get("_cyclopt");
		return token && token !== "undefined";
	},
	decode: () => {
		const token = cookie.get("_cyclopt");
		if (token) return jwtDecode(token);
		jwt.destroyTokens();
		window.location.href = "/";
		return null;
	},
	maybeDecode: () => {
		const token = cookie.get("_cyclopt");
		if (token) return jwtDecode(token);
		jwt.destroyTokens();
		return null;
	},
};

export default jwt;
