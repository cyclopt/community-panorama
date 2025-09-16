import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import ky from "ky";
import queryString from "query-string";
import constructUrl from "@iamnapo/construct-url";

import { jwt, levelThresholds } from "#utils";

const kyInstance = ky.extend({
	timeout: false,
	prefixUrl: constructUrl(import.meta.env.VITE_MAIN_SERVER_URL),
	retry: {
		statusCodes: [401, 408, 413, 429, 502, 503, 504],
		limit: 2,
		methods: ["get", "post", "put", "head", "delete", "options", "trace"],
	},
	hooks: {
		beforeRequest: [(request) => {
			const token = jwt.getToken();
			const refreshToken = jwt.getRToken();
			if (token) request.headers.set("x-access-token", token);
			if (refreshToken) request.headers.set("x-refresh-token", refreshToken);
		}],
	},
	...(import.meta.env.VITE_SENTRY_ENVIRONMENT === "develop" ? { cache: "no-store" } : {}), // This disables caching
});

const rootApi = kyInstance.extend({
	hooks: {
		beforeRetry: [
			async ({ request: { method }, error }) => {
				if (error?.response?.status === 401) {
					const res = await kyInstance.extend({ throwHttpErrors: false, retry: 0 }).get("api/refresh");
					if (res.status === 401) {
						jwt.destroyTokens();
						window.location.href = "/";
					} else {
						const { token } = await res.json();
						jwt.setToken(token);
					}
				} else if (method === "POST") {
					throw error;
				}
			},
		],
	},
});

const api = {
	get: (path, searchParams) => rootApi.get(path, { searchParams: queryString.stringify(searchParams) }).json(),
	post: (path, json, searchParams) => rootApi.post(path, { json, searchParams }).json(),
	put: (path, json, searchParams) => rootApi.put(path, { json, searchParams }).json(),
	patch: (path, json, searchParams) => rootApi.patch(path, { json, searchParams }).json(),
	delete: (path, json, searchParams) => rootApi.delete(path, { json, searchParams }).json(),
};

export default api;

const is = (data, error) => ({ isLoading: !error && !data, isError: Boolean(error) });

// * ----------------------------------- GET Requests using SWR -----------------------------------

export const useProjects = (shouldTry = true, includeHidden = true) => {
	const url = "api/panorama/projects/";
	const { data, error, mutate } = useSWR(shouldTry
		? [url, includeHidden] : null, () => api.get(url, { includeHidden }));
	return { projects: data, ...is(data, error), mutate };
};

export const useProjectsAnalytics = () => {
	const url = "api/panorama/projects/analytics";
	const { data, error, mutate } = useSWR(url);
	return { projectsAnalytics: data, ...is(data, error), mutate };
};

export const useProjectSprintFlowDiagram = (pId, sId) => {
	const url = `api/panorama/projects/${pId}/overviews/sprint-flow-diagram/`;
	const { data, error, mutate } = useSWR([url, sId], () => api.get(url, { sprintId: sId }));
	return { overview: data?.map((el) => [el[0], new Map(el[1])]), ...is(data, error), mutate };
};

export const useProjectOverallFlowDiagram = (pId, sId) => {
	const url = `api/panorama/projects/${pId}/overviews/overall-flow-diagram/`;
	const { data, error, mutate } = useSWR([url, sId], () => api.get(url, { sprintId: sId }));
	return { overview: data?.map((el) => [el[0], new Map(el[1])]), ...is(data, error), mutate };
};

export const useProjectWorkDownBreakTime = (pId, sId) => {
	const url = `api/panorama/projects/${pId}/overviews/worktime-breakdown/`;
	const { data, error, mutate } = useSWR([url, sId], () => api.get(url, { sprintId: sId }));
	return { overview: { columns: new Map(data?.columns), labels: new Map(data?.labels) }, ...is(data, error), mutate };
};

export const useProjectVelocity = (pId, sId, columns) => {
	const url = `api/panorama/projects/${pId}/overviews/velocity/`;
	const { data, error, mutate } = useSWR([url, sId, ...columns], () => api.get(url, { columns, sprintId: sId }));
	return { overview: data, ...is(data, error), mutate };
};

export const useProjectOverview6 = (pId) => {
	const url = `api/panorama/projects/${pId}/overviews/6/`;
	const { data, error, mutate } = useSWR(url);
	return { overview: data, ...is(data, error), mutate };
};

export const useProjectOverview7 = (pId) => {
	const url = `api/panorama/projects/${pId}/overviews/7/`;
	const { data, error, mutate } = useSWR(url);
	return { overview: data?.map((el) => [el[0], new Map(el[1])]), ...is(data, error), mutate };
};

export const useProjectOverview5ForMember = (pId, memberUsername) => {
	const url = `api/panorama/projects/${pId}/overviews/5-member`;
	const { data, error, mutate } = useSWR(memberUsername ? [url, memberUsername] : null, () => api.get(url, { memberUsername }));
	return { overview: data, ...is(data, error), mutate };
};

export const useProjectOverview6ForMember = (pId, memberUsername) => {
	const url = `api/panorama/projects/${pId}/overviews/6-member`;
	const { data, error, mutate } = useSWR(memberUsername ? [url, memberUsername] : null, () => api.get(url, { memberUsername }));
	return { overview: data, ...is(data, error), mutate };
};

export const useMemberMetrics = (pId, mId) => {
	const url = `api/panorama/projects/${pId}/team/${mId}/`;
	const { data, error, mutate } = useSWR(url);
	return { metrics: data, ...is(data, error), mutate };
};

export const useTeamMetrics = (pId) => {
	const url = `api/panorama/projects/${pId}/team-metrics/`;
	const { data, error, mutate } = useSWR(url);
	return { metrics: data, ...is(data, error), mutate };
};

export const useTeamMembers = (pId) => {
	const url = `api/panorama/projects/${pId}/team/`;
	const { data, error, mutate } = useSWR(url);
	return { members: data, ...is(data, error), mutate };
};

export const useDigest = (from) => {
	const url = "api/panorama/users/digest/";
	const { data, error, mutate } = useSWR([url, from], () => api.get(url, { from }));
	return { digest: data, ...is(data, error), mutate };
};

export const useProject = (pId, attachCsProjects = false, attachSummary = false, conditionallyFetched = false) => {
	const url = `api/panorama/projects/${pId}/`;
	const { data, error, mutate } = useSWR(conditionallyFetched
		? pId ? [url, attachCsProjects, attachSummary] : null : [url, attachCsProjects, attachSummary], () => api.get(url, {
		...(attachCsProjects ? { attachCsProjects } : {}),
		...(attachSummary ? { attachSummary } : {}),
	}));
	return { project: data, ...is(data, error), mutate };
};

export const useProjectSubscription = (pId) => {
	const url = `api/panorama/projects/${pId}/subscription`;
	const { data, error, mutate, isValidating } = useSWR(pId ? url : null);
	return { subscription: data, ...is(data, error), isLoading: isValidating || (!error && !data), mutate };
};

export const useProjectIntegrations = (pId) => {
	const url = `api/panorama/projects/${pId}/integrations`;
	const { data, error, mutate, isValidating } = useSWR(url);
	return { integrations: data, ...is(data, error), isLoading: isValidating || (!error && !data), mutate };
};

export const useProjectSprints = (pid, showAll = false) => {
	const url = `api/panorama/projects/${pid}/sprints/`;
	const { data, error, mutate } = useSWR([url, showAll], () => api.get(url, { ...(showAll ? { showAll } : {}) }));
	return { sprints: data, ...is(data, error), mutate };
};

export const useProjectTasks = (pId, includeClosed = true) => {
	const url = `api/panorama/projects/${pId}/tasks/`;

	const { data, error, mutate } = useSWR([url, includeClosed], () => api.get(url, { includeClosed }));
	return { tasks: data, ...is(data, error), mutate };
};

export const useProjectSprintTasks = (pId) => {
	const url = `api/panorama/projects/${pId}/tasks/sprints/`;
	const { data, error, mutate } = useSWR(url);
	return { tasks: data, ...is(data, error), mutate };
};

export const useProjectEpics = (pId, includeClosed = true) => {
	const url = `api/panorama/projects/${pId}/epics/`;
	const { data, error, mutate } = useSWR([url, includeClosed], () => api.get(url, { includeClosed }));
	return { epics: data, ...is(data, error), mutate };
};

export const useUserTasks = (timeFrame, pId) => {
	const url = "api/panorama/users/tasks/";
	const { data, error, mutate } = useSWR([url, timeFrame, pId], () => api.get(url, { timeFrame, project: pId }));
	return { tasks: data, ...is(data, error), mutate };
};

export const useTaskComments = (pid, iid) => {
	const url = `api/panorama/projects/${pid}/tasks/${iid}/comments`;
	const { data, error, mutate } = useSWR(iid ? [url] : null, () => api.get(url));
	return { comments: data?.map((e) => ({ ...e, updatedAt: new Date(e.updatedAt) })), ...is(data, error), mutate };
};

export const useUserProjects = () => {
	const url = "api/panorama/users/projects/";
	const { data, error, mutate } = useSWR(url);
	return { projects: data, ...is(data, error), mutate };
};

export const useAnalysis = (pId, rId, branch, hash, shouldTry = true) => {
	const url = `api/panorama/projects/${pId}/repositories/${rId}/quality`;
	const { data, error, mutate } = useSWR(shouldTry ? [url, branch, hash] : null, () => api.get(url, { branch, hash }));
	return { analysis: data, ...is(data, error), isLoading: !error && !data && shouldTry, mutate };
};

export const useAnalysisPreview = (pId, rId, branch, isProduction) => {
	const url = `api/panorama/projects/${pId}/repositories/${rId}/quality-preview`;
	const { data, error, mutate } = useSWR(isProduction ? null : [url, branch], () => api.get(url, { branch }));
	return { analysis: data, ...is(data, error), mutate };
};

export const useAnalyses = (pId, rId, branch, count = 20) => {
	const url = `api/panorama/projects/${pId}/repositories/${rId}/analyses/`;
	const { data, error, mutate } = useSWR([url, branch, count], () => api.get(url, { branch, count }));
	return { analyses: data, ...is(data, error), mutate };
};

export const useCommits = (pId, rId, branch) => {
	const url = `api/panorama/projects/${pId}/repositories/${rId}/commits/`;
	const { data, error, mutate } = useSWR([url, branch], () => api.get(url, { branch }));
	return { commits: data, ...is(data, error), mutate };
};

export const useCommitNote = (pId, rId, cId) => {
	const url = `api/panorama/projects/${pId}/repositories/${rId}/commits/${cId}/notes`;
	const { data, error, mutate } = useSWR(cId ? [cId] : null, () => api.get(url));
	return { sNote: data, ...is(data, error), mutate };
};

export const useClones = (aId) => {
	const url = `api/panorama/analyses/${aId}/duplicates/`;
	const { data, error, mutate } = useSWR(aId ? url : null);
	return { clones: data, ...is(data, error), mutate };
};

export const useAudits = (aId) => {
	const url = `api/panorama/analyses/${aId}/security/`;
	const { data, error, mutate } = useSWR(aId ? url : null);
	return { audits: data, ...is(data, error), mutate };
};

export const useCompareViolations = (toCommitId, root, language, severity) => {
	const url = "api/panorama/analyses/compare-violations/";
	const { data, error, mutate } = useSWR(
		toCommitId && root && language ? [url, toCommitId, root, language, severity] : null,
		() => api.get(url, { toCommitId, root, language, severity }),
	);

	return {
		violations: {
			added: data?.added ? Object.entries(data.added)
				.flatMap(([sev, violations]) => Object.entries(violations)
					.flatMap(([violation, fileInfo]) => ({ severity: sev, violation, fileInfo }))) : [],
			removed: data?.removed ? Object.entries(data.removed)
				.flatMap(([sev, violations]) => Object.entries(violations)
					.flatMap(([violation, fileInfo]) => ({ severity: sev, violation, fileInfo }))) : [],
		},
		...is(data, error),
		mutate,
	};
};

export const useGitParentCommitHash = (toCommitId, owner, name) => {
	const url = "api/panorama/analyses/git-parent-commit-hash/";
	const { data, error, mutate } = useSWR(
		toCommitId && owner && name ? [url, toCommitId, owner, name] : null,
		() => api.get(url, { toCommitId, owner, name }),
	);

	return { gitParentCommitHash: data, ...is(data, error), mutate };
};

export const useBackendVersion = () => {
	const url = "api/version/";
	const { data, error, mutate } = useSWR(url);
	return { version: data, ...is(data, error), mutate };
};

export const useUserAvailableOwners = () => {
	const url = "api/panorama/users/available-owners/";
	const { data, error, mutate } = useSWR(url);
	return { availableOwners: data, ...is(data, error), mutate };
};

export const useGitRepositories = (publicOnly = false, writeAccess = true) => {
	const url = "api/panorama/users/git-organizations/repositories";
	const { data, error, mutate } = useSWR([url, publicOnly, writeAccess],
		() => api.get(url, { ...(publicOnly ? { publicOnly } : {}), ...(writeAccess ? { writeAccess } : {}) }));
	return { gitRepositories: data, ...is(data, error), mutate };
};

export const useKanbanTheme = (token) => {
	const url = "api/panorama/users/getkanbantheme/";
	const { data, error, mutate } = useSWRImmutable((token) ? [url] : null, () => api.get(url));
	return { userTheme: data, ...is(data, error), mutate };
};

export const useAzurePullRequests = (pId, from) => {
	const url = `api/integrations/azure-pull-requests/${pId}`;
	const { data, error, mutate } = useSWR([url, from], () => api.get(url, { from }));
	return { azurePullRequests: data, ...is(data, error), mutate };
};

export const useOrganizations = (isAdmin = false) => {
	const url = "api/panorama/organizations";
	const { data, error, mutate } = useSWR([url, isAdmin], () => api.get(url, { isAdmin }));
	return { organizations: data, ...is(data, error), mutate };
};

export const useOrganization = (oId, conditionallyFetched = false) => {
	const url = `api/panorama/organizations/${oId}`;
	const { data, error, mutate } = useSWR(conditionallyFetched ? oId ? [url] : null : [url], () => api.get(url));
	return { organization: data, ...is(data, error), mutate };
};

export const useOrganizationUsage = (oId) => {
	const url = `api/panorama/organizations/${oId}/usage`;
	const { data, error, mutate } = useSWR(url);
	return { repositories: data, ...is(data, error), mutate };
};

export const useOrganizationQualityGates = (oId) => {
	const url = oId ? `api/panorama/organizations/${oId}/quality-gates/` : null;
	const { data, error, mutate } = useSWR(url);
	return { qualityGates: data, ...is(data, error), mutate };
};

// return failedQualityGates of each project the user is member (either personal or team projects)
// Query parameters: searchProductionBranch, searchStagingBranch
export const useProjectQualityGatesStatus = (oId, pId, shouldFetch = true, searchProductionBranch = true,
	searchStagingBranch = true) => {
	const teamProjectUrl = `api/panorama/organizations/${oId}/quality-gates/projects/${pId}/status`;
	const personalProjectUrl = `api/panorama/users/quality-gates/projects/${pId}/status`;
	const { data, error, mutate } = useSWR(shouldFetch
		? (oId
			? [teamProjectUrl, searchProductionBranch, searchStagingBranch]
			: [personalProjectUrl, searchProductionBranch, searchStagingBranch])
		: null,
	() => api.get(oId ? teamProjectUrl : personalProjectUrl, { searchProductionBranch, searchStagingBranch }));
	return { failedQualityGates: data, ...is(data, error), mutate };
};

// return Quality Gates of a project (team or personal)
export const useProjectQualityGates = (oId, pId, shouldFetch = false) => {
	const personalProjectUrl = `api/panorama/users/quality-gates/projects/${pId}`;
	const teamProjectUrl = `api/panorama/organizations/${oId}/quality-gates/projects/${pId}`;
	const { data, error, mutate } = useSWR(shouldFetch ? (oId ? [teamProjectUrl] : [personalProjectUrl]) : null,
		() => api.get(oId ? teamProjectUrl : personalProjectUrl));
	return { prQualityGates: data, ...is(data, error), mutate };
};

// return Quality Gates that are defined for a whole organization to be executed for all projects
export const useOrganizationRunAllQualityGates = (oId, shouldFetch = false) => {
	const url = `api/panorama/organizations/${oId}/quality-gates/run-all/`;
	const { data, error, mutate } = useSWR(shouldFetch ? (oId ? [url] : null) : null,
		() => api.get(url));
	return { orgQualityGates: data, ...is(data, error), mutate };
};

export const useOrganizationTemplatesQualityGates = (oId) => {
	const url = `api/panorama/organizations/${oId}/quality-gates/templates/`;
	const { data, error, mutate } = useSWR(oId ? [url] : null,
		() => api.get(url));
	return { orgTemplateQualityGates: data, ...is(data, error), mutate };
};

// return the result of a specific Quality Gate for given repository, branch and root
export const useQualityGateResult = (oId, qId, repoId, branch, root, language) => {
	const teamProjectUrl = `api/panorama/organizations/${oId}/quality-gates/${qId}/status`;
	const personalProjectUrl = `api/panorama/users/quality-gates/${qId}/status`;
	const { data, error, mutate } = useSWR(qId && branch
		? [oId ? teamProjectUrl : personalProjectUrl, repoId, branch, root, language]
		: null,
	() => api.get(oId ? teamProjectUrl : personalProjectUrl, { repoId, branch, root, language }));
	return { result: data, ...is(data, error), mutate };
};

export const useFileContent = (pid, rid, filename, hash) => {
	const url = `api/panorama/projects/${pid}/repositories/${rid}/file`;
	const { data, error, mutate } = useSWR(
		filename && hash ? [url, filename, hash] : null,
		() => api.get(url, { filename, hash }),
	);
	return { fileContent: data?.content, ...is(data, error), mutate };
};

export const useUserView = () => {
	const url = "api/panorama/users/view";
	const { data, error, mutate } = useSWR(url);
	return { data, ...is(data, error), mutate };
};

export const useUserFailedQualityGates = (searchProductionBranch = true, searchStagingBranch = true, orgId = null) => {
	const url = "api/panorama/users/quality-gates/failed-quality-gates";
	const { data, error, mutate } = useSWR([url, searchProductionBranch, searchStagingBranch, orgId],
		() => api.get(url, { searchProductionBranch, searchStagingBranch, orgId }));
	return { data, ...is(data, error), mutate };
};

export const useUserWeeklyQualityGates = (searchProductionBranch = true, searchStagingBranch = true, orgId = null) => {
	const url = "api/panorama/users/quality-gates/weekly-results";
	const { data, error, mutate } = useSWR([url, searchProductionBranch, searchStagingBranch, orgId],
		() => api.get(url, { searchProductionBranch, searchStagingBranch, orgId }));
	return { data, ...is(data, error), mutate };
};

export const useProjectWeeklyQualityGates = (orgId, prId, shouldFetch = false,
	searchProductionBranch = true, searchStagingBranch = true) => {
	const personalProjectUrl = `api/panorama/users/quality-gates/projects/${prId}/weekly-results`;
	const teamProjectUrl = `api/panorama/organizations/${orgId}/quality-gates/projects/${prId}/weekly-results`;
	const { data, error, mutate } = useSWR(shouldFetch
		? (orgId
			? [teamProjectUrl, searchProductionBranch, searchStagingBranch]
			: [personalProjectUrl, searchProductionBranch, searchStagingBranch])
		: null,
	() => api.get(orgId ? teamProjectUrl : personalProjectUrl, { searchProductionBranch, searchStagingBranch }));
	return { data, ...is(data, error), mutate };
};

export const useSystemChecksResults = (orgId = null) => {
	const url = "api/panorama/system-checks/results";
	const { data, error, mutate } = useSWR([url, orgId],
		() => api.get(url, { orgId }));
	return { data, ...is(data, error), mutate };
};

export const useProjectSystemChecksResults = (prId) => {
	const url = `api/panorama/system-checks/results/${prId}`;
	const { data, error, mutate } = useSWR(url);
	return { projectSystemChecksResults: data, ...is(data, error), mutate };
};

export const useProjectSystemChecks = (prId) => {
	const url = `api/panorama/system-checks/${prId}`;
	const { data, error, mutate } = useSWR(url);
	return { projectSystemChecks: data, ...is(data, error), mutate };
};

export const useProjectsActiveSystemChecks = (orgId = null) => {
	const url = "api/panorama/system-checks/active-categories";
	const { data, error, mutate } = useSWR([url, orgId],
		() => api.get(url, { orgId }));
	return { activeSystemChecksCategories: data, ...is(data, error), mutate };
};

export const useProjectActiveSystemChecks = (prId) => {
	const url = `api/panorama/system-checks/active-categories/${prId}`;
	const { data, error, mutate } = useSWR(url);
	return { activeSystemChecksCategories: data, ...is(data, error), mutate };
};

export const useUserDefaultInfo = (field = "defaultPanoramaOrganization") => {
	const url = "api/panorama/users/defaults";
	const { data, error, mutate } = useSWR(url, () => api.get(url, { field }));
	return { user: data, ...is(data, error), mutate };
};

export const useUsersChatGPTToken = () => {
	const url = "api/panorama/users/chat-gpt";
	const { data, error, mutate } = useSWR(url);
	return { chatGPT: data, ...is(data, error), mutate };
};

export const useRegisterTour = (token, shouldFetch) => {
	const url = "api/panorama/users/tours/register";
	const { data, error, mutate } = useSWR((token && shouldFetch) ? [url] : null, () => api.get(url, { title: "addProject" }));
	return { isTourRegistered: data, ...is(data, error), mutate };
};

// * Developer Profile routes

export const useDevelopersCharacteristics = (oId) => {
	const url = `api/panorama/organizations/${oId}/developer/characteristics`;
	const { data, error, mutate, isValidating } = useSWR([url], () => api.get(
		url,
	));
	return { developers: data, ...is(data, error, isValidating), mutate };
};

export const useDevelopersSoftSkills = (oId, range = null, projectId = null) => {
	const url = `api/panorama/organizations/${oId}/developer/soft-skills`;
	const { data, error, mutate, isValidating } = useSWR(range ? [url, range, projectId] : null, () => api.get(
		url,
		{ range: JSON.stringify(range), projectId },
	));
	return { softSkills: data, ...is(data, error, isValidating), mutate };
};

export const useDevelopersWorkLoad = (oId, range = null, projectId = null) => {
	const url = `api/panorama/organizations/${oId}/developer/workload`;
	const { data, error, mutate, isValidating } = useSWR(range ? [url, projectId, range] : null, () => api.get(
		url,
		{ range: JSON.stringify(range), projectId },
	));
	return { workload: data, ...is(data, error, isValidating), mutate };
};

export const useDevelopersCommitStats = (oId, range = null, projectId = null) => {
	const url = `api/panorama/organizations/${oId}/developer/commit-stats`;
	const { data, error, mutate, isValidating } = useSWR(range ? [url, range, projectId] : null, () => api.get(
		url,
		{ range: JSON.stringify(range), projectId },
	));
	return { commitStats: data, ...is(data, error, isValidating), mutate };
};

export const useDevelopersLanguagesAndFrameworks = (oId, range = null, projectId = null) => {
	const url = `api/panorama/organizations/${oId}/developer/languages-frameworks`;
	const { data, error, mutate, isValidating } = useSWR(range ? [url, range, projectId] : null, () => api.get(
		url,
		{ range: JSON.stringify(range), projectId },
	));
	return { languagesAndFrameworks: data, ...is(data, error, isValidating), mutate };
};

export const useDeveloperInfo = (oId, userId) => {
	const url = `api/panorama/organizations/${oId}/developer/${userId}`;
	const { data, error, mutate, isValidating } = useSWR([url], () => api.get(url));
	return { developer: data, ...is(data, error, isValidating), mutate };
};

export const useDevCharacteristics = (oId, userId, selectedMonth) => {
	const url = `api/panorama/organizations/${oId}/developer/${userId}/characteristics`;
	const { data, error, mutate, isValidating } = useSWR(
		userId ? [url, selectedMonth] : null, () => api.get(url, { selectedMonth }),
	);
	return { characteristics: data, ...is(data, error, isValidating), mutate };
};

export const useDeveloperSoftSkills = (oId, userId, range = null) => {
	const url = `api/panorama/organizations/${oId}/developer/${userId}/soft-skills`;
	const { data, error, mutate, isValidating } = useSWR(range ? [url, range] : null, () => api.get(
		url,
		{ range: JSON.stringify(range) },
	));
	return { softSkills: data, ...is(data, error, isValidating), mutate };
};

export const useDevLangAndFrame = (oId, userId, range = null) => {
	const url = `api/panorama/organizations/${oId}/developer/${userId}/languages_and_frameworks`;
	const { data, error, mutate, isValidating } = useSWR(
		userId && range ? [url, range] : null, () => api.get(url, { range: JSON.stringify(range) }),
	);// useSWR(url, { isInEditMode });
	return { data, ...is(data, error, isValidating), mutate };
};

export const useDevActivityAndTrends = (oId, userId, range = null) => {
	const url = `api/panorama/organizations/${oId}/developer/${userId}/activity_and_trends`;
	const { data, error, mutate, isValidating } = useSWR(
		userId && range ? [url, range] : null, () => api.get(url, { range: JSON.stringify(range) }),
	);// useSWR(url, { isInEditMode });
	return { activityAndTrends: data, ...is(data, error, isValidating), mutate };
};

export const useDeveloperHistoryStatus = (oId, userId) => {
	const url = `api/panorama/organizations/${oId}/developer/${userId}/status`;
	const { data, error, mutate, isValidating } = useSWR(url);// useSWR(url, { isInEditMode });
	return { status: data, ...is(data, error, isValidating), mutate };
};

export const useDeveloperThresholds = () => {
	const url = "api/thresholds";
	const { data, error, mutate, isValidating } = useSWR(url);
	const thresholds = levelThresholds.map((l, index) => ({ ...l, threshHold: data?.[index].threshHold }));

	return { thresholds, ...is(data, error, isValidating), mutate };
};

// * -------------------------------------------------------------------------------------------

// * ----------------------------------- Simple GET Requests -----------------------------------

export const loadProjects = (includeHidden = true) => api.get("api/panorama/projects/", { includeHidden });
export const loadProjectTaskMetrics = (pid) => api.get(`api/panorama/projects/${pid}/tasks/metrics`);
export const loadProjectEpicMetrics = (pid) => api.get(`api/panorama/projects/${pid}/epics/metrics`);
export const loadQualityMetrics = (pid, rid, branch) => api.get(`api/panorama/projects/${pid}/repositories/${rid}/quality`, { branch });
export const loadRepositoriesMetaData = (pid, _ids, productionBranch) => api.get(`api/panorama/projects/${pid}/repositories-meta-data`, { _ids: JSON.stringify(_ids), productionBranch });
export const loadFilesMetrics = (aid) => api.get(`api/panorama/analyses/${aid}/files`);
export const loadProjectTasks = (pid, includeClosed = true) => api.get(`api/panorama/projects/${pid}/tasks`, { includeClosed });
export const loadProjectSprints = (pid, showAll = false) => api.get(`api/panorama/projects/${pid}/sprints`, { showAll });
export const loadProjectEpics = (pid, includeClosed = true) => api.get(`api/panorama/projects/${pid}/epics`, { includeClosed });
export const loadFileContent = (pid, rid, filename, hash) => api.get(`api/panorama/projects/${pid}/repositories/${rid}/file`, { filename, hash });
export const getUserNotifications = () => api.get("api/panorama/users/notifications");
export const getCycloptToken = () => api.get("api/panorama/users/cyclopt-token/");
export const checkForNotification = () => api.get("api/panorama/users/notification", { application: "panorama" });
export const verifyChatGptToken = (value) => api.get("api/panorama/extensions/chat-gpt/verify-token", { chatGptToken: value });

// * -------------------------------------------------------------------------------------------

// * ---------------------------------- Simple POST Requests -----------------------------------

export const submitTaskComment = (pid, iid, body) => api.post(`api/panorama/projects/${pid}/tasks/${iid}/comments`, { body });
export const submitTask = (pid, task) => api.post(`api/panorama/projects/${pid}/tasks`, { ...task });
export const submitEpic = (pid, epic) => api.post(`api/panorama/projects/${pid}/epics`, { ...epic });
export const submitSprint = (pid, sprint) => api.post(`api/panorama/projects/${pid}/sprints`, { ...sprint });
export const checkRepoAccess = (repository, type = "github") => api.post(`api/${type}/validate-access`, { repository });
export const checkRepoModuleAccess = (repository, path, type = "github", vcType = "git") => api.post(`api/${type}/validate-access-module`, { repository, path, vcType });
export const createProject = (project, team) => api.post("api/panorama/projects/", { ...project, collaborators: team?.members });
export const sendReportNow = (from) => api.post("api/panorama/users/send-digest", { from });
export const validateTeam = (oId, team, teamId) => api.post(`api/panorama/organizations/${oId}/teams/validate-team`, { ...team, teamId });
export const createTeam = (oId, team) => api.post(`api/panorama/organizations/${oId}/teams`, { team });
export const postNotificationView = (nId) => api.post(`api/panorama/users/notification/${nId}`, { application: "panorama" });
export const uploadFile = (pId, body) => rootApi.post(`api/panorama/projects/${pId}/upload-file`, { body }).json();
export const generateCycloptToken = () => api.post("api/panorama/users/generate-cyclopt-token/");
export const updateKanbanTheme = (theme) => api.post("api/panorama/users/updatekanbantheme/", { theme });
export const setDefaultPanoramaOrganization = (orgId) => api.post("api/panorama/users/set-default", { orgId, orderId: "", service: "panorama" });

// * Define validate Quality Gate for personal and team projects
export const validateTeamQualityGate = (oId, qualityGate) => api.post(`api/panorama/organizations/${oId}/quality-gates/validate-quality-gate`, { ...qualityGate });
export const validatePersonalQualityGate = (qualityGate) => api.post("api/panorama/users/quality-gates/validate-quality-gate", { ...qualityGate });
export const createOrganizationQualityGate = (oId, qualityGate) => api.post(`api/panorama/organizations/${oId}/quality-gates`, { ...qualityGate });

// * Define create Quality Gate for personal and team projects
export const createTeamProjectQualityGate = (oId, pId, qualityGate) => api.post(`api/panorama/organizations/${oId}/quality-gates/projects/${pId}`, { ...qualityGate });
export const createPersonalProjectQualityGate = (pId, qualityGate) => api.post(`api/panorama/users/quality-gates/projects/${pId}`, { ...qualityGate });

// * Extension - ChatGpt
export const saveUserChatGptToken = (value) => api.post("api/panorama/users/chat-gpt", { chatGptToken: value });

// * Journey Tracker
export const registerJourney = ({ pageKey, group, metaData }) => api.post("api/panorama/users/register-journey", { pageKey, group, metaData });

// *  Developer Stats
export const updateDeveloperHistory = (oId, userId) => api.post(`api/panorama/organizations/${oId}/developer/${userId}/fetch-history`);

// * -------------------------------------------------------------------------------------------

// * ----------------------------------- Simple PUT Requests -----------------------------------

export const updateUserView = (shortView) => api.put("api/panorama/users/view", { shortView });
export const updateTaskComment = (pid, iid, cid, body) => api.put(`api/panorama/projects/${pid}/tasks/${iid}/comments/${cid}`, { body });
export const updateTaskPin = (pid, iid, setTo) => api.put(`api/panorama/projects/${pid}/tasks/${iid}/update-pinned`, { setTo });
export const updateEpicPin = (pid, eid, setTo) => api.put(`api/panorama/projects/${pid}/epics/${eid}/update-pinned`, { setTo });
export const updateTaskSubscription = (pid, iid, setTo) => api.put(`api/panorama/projects/${pid}/tasks/${iid}/update-subscription`, { setTo });
export const updateTaskStatus = (pid, iid, setTo, setToSprintId) => api.put(`api/panorama/projects/${pid}/tasks/${iid}/move-to-column`, { setTo, setToSprintId });
export const updateTask = (pid, iid, task) => api.put(`api/panorama/projects/${pid}/tasks/${iid}`, { ...task });
export const updateEpic = (pid, eid, epic) => api.put(`api/panorama/projects/${pid}/epics/${eid}`, { ...epic });
export const updateSprint = (pid, sid, sprint, propagate) => api.put(`api/panorama/projects/${pid}/sprints/${sid}`, { ...sprint, propagate });
export const updateProject = (pid, project, team) => api.put(`api/panorama/projects/${pid}`, { ...project, collaborators: team?.members });
export const updateProjectVisibility = (pid, setTo) => api.put(`api/panorama/users/visibility/${pid}`, { setTo });
export const updateUserEmailNotifications = (notifications) => api.put("api/panorama/users/notifications/email", { notifications });
export const editCommitNote = (pId, rId, cId, note) => api.put(`api/panorama/projects/${pId}/repositories/${rId}/commits/${cId}/notes`, { note });

// * Quality Gates
export const updateOrganizationQualityGate = (oId, qId, qualityGate, shouldExecuteQualityGate) => api.put(`api/panorama/organizations/${oId}/quality-gates/${qId}`, { ...qualityGate, shouldExecuteQualityGate });
export const updatePersonalProjectQualityGate = (pId, qId, qualityGate, shouldExecuteQualityGate) => api.put(`api/panorama/users/quality-gates/projects/${pId}/${qId}`, { ...qualityGate, shouldExecuteQualityGate });
export const updateTeamProjectQualityGate = (oId, pId, qId, qualityGate, shouldExecuteQualityGate) => api.put(`api/panorama/organizations/${oId}/quality-gates/projects/${pId}/${qId}`, { ...qualityGate, shouldExecuteQualityGate });

// * System checks
export const updateSystemCheck = (scId, systemCheck) => api.put(`api/panorama/system-checks/${scId}`, { ...systemCheck });

// * Tour
export const updateTourEnd = (trInf) => api.put("api/panorama/users/tours/track-end", { ...trInf });

// * Developer Stats
export const updateDeveloperInfo = (oId, userId, developerInfo) => api.put(`api/panorama/organizations/${oId}/developer/${userId}/info`, { developerInfo });
export const updateDeveloperKeys = (oId, userId, keysToExclude) => api.put(`api/panorama/organizations/${oId}/developer/${userId}/update-keys`, { keysToExclude });
export const updateDevelopersVisibility = (devId, setTo) => api.put(`api/panorama/users/visibility/developer/${devId}`, { setTo });

// * -------------------------------------------------------------------------------------------

// * --------------------------------- Simple DELETE Requests ----------------------------------

export const deleteTaskComment = (pid, iid, cid) => api.delete(`api/panorama/projects/${pid}/tasks/${iid}/comments/${cid}`);
export const deleteSprint = (pid, sid, propagate) => api.delete(`api/panorama/projects/${pid}/sprints/${sid}`, { propagate });
export const deleteProject = (pid) => api.delete(`api/panorama/projects/${pid}`);
export const deleteCommit = (pId, rId, cId) => api.delete(`api/panorama/projects/${pId}/repositories/${rId}/commits/${cId}`);
export const deleteCycloptToken = () => api.delete("api/panorama/users/cyclopt-token/");
export const deleteUserChatGptToken = () => api.delete("api/panorama/users/chat-gpt");

// *  Quality Gates
export const deletePersonalQualityGate = (qId) => api.delete(`api/panorama/users/quality-gates/${qId}`);
export const deleteTeamQualityGate = (oId, qId) => api.delete(`api/panorama/organizations/${oId}/quality-gates/${qId}`);

// * -------------------------------------------------------------------------------------------

// * --------------------------------- Simple PATCH Requests ----------------------------------
export const closeTask = (pid, iid) => api.patch(`api/panorama/projects/${pid}/tasks/${iid}/close`);
export const closeTasks = (pid, column) => api.patch(`api/panorama/projects/${pid}/tasks/close`, { column });
export const closeEpic = (pid, eid) => api.patch(`api/panorama/projects/${pid}/epics/${eid}/close`);
export const reopenTask = (pid, iid) => api.patch(`api/panorama/projects/${pid}/tasks/${iid}/reopen`);
export const reopenEpic = (pid, eid) => api.patch(`api/panorama/projects/${pid}/epics/${eid}/reopen`);
export const leaveProject = (pid) => api.patch(`api/panorama/projects/${pid}`);
