// eslint-disable-next-line no-redeclare
/* global globalThis Int8Array Reflect */

import { lazy, StrictMode, Suspense, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { Route, useLocation, Routes, BrowserRouter as Router, Navigate } from "react-router-dom";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import * as Sentry from "@sentry/browser";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { SWRConfig } from "swr";
import { ErrorBoundary } from "react-error-boundary";
import { Box, CircularProgress, CssBaseline, Grid } from "@mui/material";
import { shallow } from "zustand/shallow";
import "./index.scss";

import useLocalStorage from "./utils/use-local-storage.js";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Protected from "./components/Protected.jsx";
import GuestOnly from "./components/GuestOnly.jsx";
import ErrorFallback from "./components/ErrorFallback.jsx";
import Snackbar from "./components/Snackbar.jsx";
import TourProvider from "./components/TourProvider.jsx";
import JourneyTracker from "./components/JourneyTracker.jsx";
import theme from "./theme.js";

import api, { useKanbanTheme } from "#api";
import { jwt, useDocumentTitle } from "#utils";

const NotFound = lazy(() => import("./screens/NotFound.jsx"));
const Auth = lazy(() => import("./screens/Auth.jsx"));
const SignIn = lazy(() => import("./screens/SignIn.jsx"));
const Projects = lazy(() => import("./screens/Projects.jsx"));
const ProjectsOverview = lazy(() => import("./screens/ProjectsOverview.jsx"));
const Project = lazy(() => import("./screens/Project/index.jsx"));
const User = lazy(() => import("./screens/User.jsx"));
const AddProject = lazy(() => import("./screens/AddProject.jsx"));
const Tasks = lazy(() => import("./screens/Tasks.jsx"));
const Qualities = lazy(() => import("./screens/Qualities.jsx"));
const Quality = lazy(() => import("./screens/Quality/index.jsx"));
const ProjectInfo = lazy(() => import("./screens/ProjectInfo.jsx"));
const ProjectSettings = lazy(() => import("./screens/ProjectSettings.jsx"));
const Digest = lazy(() => import("./screens/Digest.jsx"));
const AddTeam = lazy(() => import("./screens/AddTeam.jsx"));
const Plugins = lazy(() => import("./screens/Plugins/index.jsx"));
const MyKanbanView = lazy(() => import("./screens/MyKanbanView.jsx"));
const OrganizationInfo = lazy(() => import("./screens/OrganizationInfo/index.jsx"));
const Organizations = lazy(() => import("./screens/Organizations.jsx"));
const QualityGateEditor = lazy(() => import("./components/QualityGateEditor.jsx"));
const ProjectQualityGates = lazy(() => import("./screens/ProjectQualityGates.jsx"));
const ProjectsOutlet = lazy(() => import("./screens/ProjectsOutlet.jsx"));

function at(n) {
	n = Math.trunc(n) || 0;
	if (n < 0) n += this.length;
	return n >= 0 || n < this.length ? this[n] : undefined;
}

const TypedArray = Reflect.getPrototypeOf(Int8Array);
for (const C of [Array, String, TypedArray]) {
	Object.defineProperty(C.prototype, "at", {
		value: at,
		writable: true,
		enumerable: false,
		configurable: true,
	});
}

globalThis.global = globalThis;

Sentry.init({
	dsn: import.meta.env.VITE_SENTRY_DSN,
	environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
	ignoreErrors: [
		"ResizeObserver loop limit exceeded",
		"Non-Error promise rejection captured",
	],
	enabled: (import.meta.env.PROD ?? true),
	replaysOnErrorSampleRate: 1,
	integrations: [new Sentry.Replay()],
});
const swrConfig = { revalidateOnFocus: false, shouldRetryOnError: false, fetcher: (url) => api.get(url) };

const App = () => {
	useDocumentTitle("Cyclopt");
	const { pathname } = useLocation();
	const token = jwt.getToken();
	const { userTheme } = useKanbanTheme(token);
	const { setKanbanTheme, setCurrentSprint } = useLocalStorage(useCallback((e) => ({
		setKanbanTheme: e?.setKanbanTheme,
		setCurrentSprint: e?.setCurrentSprint,
	}), []), shallow);

	useEffect(() => {
		setKanbanTheme(userTheme);
	}, [setKanbanTheme, userTheme]);

	useEffect(() => {
		window.scrollTo(0, 0);

		if (!pathname.includes("/project-analytics")) setCurrentSprint(null);
	}, [pathname, setCurrentSprint]);

	useEffect(() => {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.ready.then((registration) => {
				registration.unregister();

				if (caches) {
					caches.keys().then(async (names) => {
						await Promise.all(names.map((name) => caches.delete(name)));
					});
				}
			});
		}
	}, []);

	return (
		<JourneyTracker decodedToken={token ? jwt.decode(token) : null}>
			<StyledEngineProvider injectFirst>
				<CssBaseline />
				<ThemeProvider theme={theme}>
					<ErrorBoundary resetKeys={[window.location.pathname]} FallbackComponent={ErrorFallback}>
						<SWRConfig value={swrConfig}>
							<LocalizationProvider dateAdapter={AdapterDayjs}>
								<TourProvider>
									<Grid style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
										{jwt.isAuthenticated() && (<Header />)}
										<main style={{ zIndex: 0, flexGrow: 1, display: "flex", flexDirection: "column" }}>
											<Suspense
												fallback={(
													<Box sx={{ m: 1, display: "flex", justifyContent: "center" }}>
														<CircularProgress color="secondary" />
													</Box>
												)}
											>
												<Routes>
													<Route index element={<GuestOnly c={<SignIn />} />} />
													<Route path="projects/:projectid" element={<ProjectsOutlet />}>
														<Route index element={<Navigate replace to="overview" />} />
														<Route path="overview" element={<Protected c={<ProjectInfo />} />} />
														<Route path="settings" element={<Protected c={<ProjectSettings />} />} />
														<Route path="quality-analytics/:repoid/*" element={<Protected c={<Quality />} />} />
														<Route path="quality-analytics/*" element={<Protected c={<Qualities />} />} />
														<Route path="quality-gates" element={<Protected c={<ProjectQualityGates />} />} />
														<Route path="quality-gates/add-quality-gate" element={<Protected c={<QualityGateEditor />} />} />
													</Route>
													<Route path="projects/:projectid/project-analytics/*" element={<Protected c={<Project />} />} />
													<Route path="projects/:projectid/plugins/*" element={<Protected c={<Plugins />} />} />
													<Route path="projects" element={<Protected c={<Projects />} />} />
													<Route path="organizations/:organizationid/add-team" element={<Protected c={<AddTeam />} />} />
													<Route path="organizations/:organizationid/quality-gates/add-quality-gate" element={<Protected c={<QualityGateEditor />} />} />
													<Route path="organizations/:organizationid/*" element={<Protected c={<OrganizationInfo />} />} />
													<Route path="organizations" element={<Protected c={<Organizations />} />} />
													<Route path="overview" element={<Protected c={<ProjectsOverview />} />} />
													<Route path="my-kanban" element={<Protected c={<MyKanbanView />} />} />
													<Route path="tasks" element={<Protected c={<Tasks />} />} />
													<Route path="auth" element={<GuestOnly c={<Auth />} />} />
													<Route path="settings" element={<Protected c={<User />} />} />
													<Route path="add" element={<Protected c={<AddProject />} />} />
													<Route path="digest" element={<Protected c={<Digest />} />} />
													<Route path="*" element={<Protected c={<NotFound />} />} />
												</Routes>
											</Suspense>
										</main>
										{(
											!pathname.endsWith("/project-analytics")
									&& !pathname.includes("/kanban")
									&& !pathname.includes("/my-kanban")
									&& !pathname.includes("/sprint")
										) && (<Footer />)}
										<Snackbar />
									</Grid>
								</TourProvider>
							</LocalizationProvider>
						</SWRConfig>
					</ErrorBoundary>
				</ThemeProvider>
			</StyledEngineProvider>
		</JourneyTracker>
	);
};

const container = document.querySelector("#root");
const root = createRoot(container);
root.render(<StrictMode><Router><App /></Router></StrictMode>);
