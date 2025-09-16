import { useCallback, useState, memo, useEffect, useMemo, useRef } from "react";
import { styled, useTheme } from "@mui/material/styles";
import {
	AppBar,
	Toolbar,
	Menu,
	MenuItem,
	IconButton,
	Button,
	Paper,
	Breadcrumbs,
	Typography,
	Avatar,
	Box,
	Grid,
	Dialog,
	DialogTitle,
	DialogContent,
} from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
	ExpandMore,
	ViewList as ViewListIcon,
	DoneAll,
	AccountCircle,
	MoreVert as MoreIcon,
	Home as HomeIcon,
	Close,
	Warning,
} from "@mui/icons-material";
import { shallow } from "zustand/shallow";
import { dateNewToOld } from "@iamnapo/sort";
import { Image } from "mui-image";
import queryString from "query-string";
import { useTour } from "@reactour/tour";

import { capitalize, jwt, addProjectSteps } from "../utils/index.js";
import cycloptLogo from "../assets/images/cyclopt_logo_with_text_white.svg";
import useGlobalState from "../use-global-state.js";
import { useProjects, useOrganizations, checkForNotification, postNotificationView } from "../api/index.js";
import projectsIcon from "../assets/images/projects.png";
import qualityIcon from "../assets/images/quality.png";
import settingsIcon from "../assets/images/settings.png";

import InfoButton from "./InfoButton.jsx";
import SelectOrganization from "./SelectOrganization.jsx";

const styles = {
	grow: {
		flexBasis: "auto",
		elevation: 0,
	},
	sectionDesktop: {
		display: {
			xs: "none",
			md: "flex",
		},
	},
	sectionMobile: {
		display: {
			xs: "flex",
			md: "none",
		},
	},
	root: {
		width: "100%",
		px: 0,
		py: 1,
		borderRadius: "0px",
		bgcolor: "#ccd9e2",
	},
	icon: {
		mr: 0.5,
		width: 20,
		height: 20,
	},
	expanded: {
		bgcolor: "transparent",
	},
	innerSmallAvatar: {
		color: "common.black",
		fontSize: "inherit",
	},
	anchorOriginBottomRightCircular: {
		".MuiBadge-anchorOriginBottomRightCircular": {
			right: 0,
			bottom: 0,
		},
	},
	avatar: {
		width: "30px",
		height: "30px",
		background: "white",
	},
	iconButton: {
		p: "3px 6px",
	},
	menuItemButton: {
		width: "100%",
		bgcolor: "grey.light",
		"&:hover": {
			bgcolor: "grey.dark",
		},
	},
	menuItemCreateButton: {
		width: "100%",
		bgcolor: "primary.main",
		"&:hover": {
			bgcolor: "primary.main",
		},
	},
	menuItemViewAll: {
		width: "100%",
		bgcolor: "secondary.main",
		"&:hover": {
			bgcolor: "secondary.main",
		},
	},
	grey: {
		color: "grey.500",
	},
};

const NotificationIcons = (color) => ({
	warning: <Warning sx={{ color, marginRight: "10px" }} />,
});

const Header = () => {
	const location = useLocation();
	const theme = useTheme();
	const { type = "github", username } = jwt.decode();
	const navigate = useNavigate();
	const {
		name,
		repoName,
		userName,
		fileName,
		// showNotificationBadge,
		teamName,
		selectedOrganization,
		apiTitle,
		notification,
		setNotification,
	} = useGlobalState(useCallback((e) => ({
		name: e.name,
		repoName: e.repoName,
		userName: e.userName,
		fileName: e.fileName,
		showNotificationBadge: e.showNotificationBadge,
		teamName: e.teamName,
		selectedOrganization: e.selectedOrganization,
		apiTitle: e.apiTitle,
		notification: e.notification,
		setNotification: e.setNotification,
	}), []), shallow);
	const [anchorEl, setAnchorEl] = useState(null);
	const [anchorElTasks, setAnchorElTasks] = useState(null);
	const [anchorElProjects, setAnchorElProjects] = useState(null);
	const [anchorElOrganizations, setAnchorElOrganizations] = useState(null);
	const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState(null);
	const { projects = [], mutate: mutateProjects } = useProjects(jwt.getToken(), false);
	const { organizations = [], mutate: mutateOrganizations } = useOrganizations();
	const { setIsOpen, setSteps, setCurrentStep, isOpen, currentStep } = useTour();

	const orgDropdownButton = useRef(null);
	const isMenuOpen = Boolean(anchorEl);
	const isMenuOpenTasks = Boolean(anchorElTasks);
	const isMenuOpenProjects = Boolean(anchorElProjects);
	const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

	const { search } = useLocation();

	const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
	const handleTasksMenuOpen = (event) => setAnchorElTasks(event.currentTarget);
	const handleProjectsMenuOpen = (event) => { mutateProjects(); setAnchorElProjects(event.currentTarget); };
	const handleOrganizationsMenuOpen = (event) => { mutateOrganizations(); setAnchorElOrganizations(event.currentTarget); };
	const handleMobileMenuClose = () => setMobileMoreAnchorEl(null);
	const handleMenuClose = () => { setAnchorEl(null); handleMobileMenuClose(); };
	const handleTasksMenuClose = () => { setAnchorElTasks(null); handleMobileMenuClose(); };
	const handleProjectsMenuClose = () => { setAnchorElProjects(null); handleMobileMenuClose(); };
	const handleOrganizationsMenuClose = () => { setAnchorElOrganizations(null); handleMobileMenuClose(); };
	const handleMobileMenuOpen = (event) => setMobileMoreAnchorEl(event.currentTarget);

	// * ------------------------------------- TOUR HANDLING -------------------------------------

	const memoizedAddProjectSteps = useMemo(() => addProjectSteps(
		username,
		type,
		navigate,
	),
	// eslint-disable-next-line react-hooks/exhaustive-deps
	[type, username]);

	useEffect(() => {
		const parsed = queryString.parse(search);
		if (parsed.tour === "addProject") {
			setSteps(memoizedAddProjectSteps);
			setIsOpen(true);
			if (["0", "1"].includes(parsed.tourStep) && orgDropdownButton.current) {
				mutateOrganizations();
				setAnchorElOrganizations(orgDropdownButton.current);
			} else {
				setAnchorElOrganizations(null);
			}
		} else {
			setIsOpen(false);
		}

		if (parsed.tourStep !== currentStep) {
			setCurrentStep(Number(parsed.tourStep));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search, currentStep, memoizedAddProjectSteps]);

	// * -----------------------------------------------------------------------------------------

	const CrumpLink = styled(Link)(() => ({ display: "flex", color: theme.palette.primary.main }));

	const renderMenu = (
		<>
			<Menu
				keepMounted
				anchorEl={anchorEl}
				anchorOrigin={{ vertical: "top", horizontal: "right" }}
				transformOrigin={{ vertical: "top", horizontal: "right" }}
				open={isMenuOpen}
				onClose={handleMenuClose}
			>
				<MenuItem component={Link} to="/settings" onClick={handleMenuClose}>{"Profile"}</MenuItem>
				<MenuItem onClick={() => {
					handleMenuClose();
					jwt.destroyTokens();
					navigate("/");
				}}
				>
					{"Sign Out"}
				</MenuItem>
			</Menu>
			<Menu
				keepMounted
				anchorEl={anchorElTasks}
				anchorOrigin={{ vertical: "top", horizontal: "right" }}
				transformOrigin={{ vertical: "top", horizontal: "right" }}
				open={isMenuOpenTasks}
				onClose={handleTasksMenuClose}
			>
				<MenuItem
					onClick={() => {
						handleTasksMenuClose();
						navigate("/tasks?assignee=All");
					}}
				>
					{"All Tasks"}
				</MenuItem>
				<MenuItem onClick={() => {
					handleTasksMenuClose();
					const parsed = queryString.parse(location.search);
					parsed.assignee = jwt.decode().username;
					navigate(`/tasks?${queryString.stringify(parsed)}`);
				}}
				>
					{"My Tasks"}
				</MenuItem>
				<MenuItem component={Link} to="/my-kanban" onClick={handleTasksMenuClose}>{"My Kanban"}</MenuItem>
			</Menu>
			<Menu
				keepMounted
				anchorEl={anchorElProjects}
				anchorOrigin={{ vertical: "top", horizontal: "right" }}
				transformOrigin={{ vertical: "top", horizontal: "right" }}
				open={isMenuOpenProjects}
				onClose={handleProjectsMenuClose}
			>
				<MenuItem onClick={handleProjectsMenuClose}>
					<Button component={Link} variant="contained" sx={styles.menuItemViewAll} to="/projects">
						<Typography noWrap sx={{ maxWidth: 250, color: "white" }}>{"View All Projects"}</Typography>
					</Button>
				</MenuItem>
				<MenuItem onClick={handleProjectsMenuClose}>
					<Button component={Link} variant="contained" sx={styles.menuItemCreateButton} to="/add">
						<Typography noWrap sx={{ maxWidth: 250, color: "white" }}>{"Create Project"}</Typography>
					</Button>
				</MenuItem>
				{[...projects]
					.sort(dateNewToOld((v) => (v?.lastCommit
						? new Date(Math.max(new Date(v?.lastCommit), new Date(v?.updatedAt))) : new Date(v?.updatedAt))))
					.map((e) => (
						<MenuItem key={`${e._id}_projectMenu}`} onClick={handleProjectsMenuClose}>
							<Button component={Link} variant="contained" sx={styles.menuItemButton} to={`/projects/${e._id}`}>
								<Typography noWrap sx={{ maxWidth: 250, color: "primary.main" }}>{e.name}</Typography>
							</Button>
							<div style={{ marginLeft: "auto" }}>
								<IconButton component={Link} size="small" sx={{ ...styles.iconButton, ...(!e?.analytics?.project && styles.grey) }} to={e?.analytics?.project ? `/projects/${e._id}/project-analytics` : "#"}>
									<Avatar sx={{ ...styles.avatar }}>
										<Image src={projectsIcon} alt="P" title="Project Analytics" />
									</Avatar>
								</IconButton>
								<IconButton component={Link} size="small" sx={{ ...styles.iconButton, ...(!e?.analytics?.quality && styles.grey) }} to={e?.analytics?.quality ? `/projects/${e._id}/quality-analytics` : "#"}>
									<Avatar sx={{ ...styles.avatar }}>
										<Image src={qualityIcon} alt="Q" title="Quality Analytics" />
									</Avatar>
								</IconButton>
								<IconButton component={Link} size="small" sx={styles.iconButton} to={`/projects/${e._id}/settings`}>
									<Avatar sx={{ ...styles.avatar }}>
										<Image src={settingsIcon} alt="S" title="Project Settings" />
									</Avatar>
								</IconButton>
							</div>
						</MenuItem>
					))}
			</Menu>
			<SelectOrganization
				orgs={organizations}
				anchorElOrganizations={anchorElOrganizations}
				handleOrganizationsMenuClose={() => handleOrganizationsMenuClose()}
				projects={projects}
				mutateOrgs={mutateOrganizations}
				mutateProjects={mutateProjects}
				width="300px"
			/>
		</>
	);

	const renderMobileMenu = (
		<Menu
			keepMounted
			anchorEl={mobileMoreAnchorEl}
			anchorOrigin={{ vertical: "top", horizontal: "right" }}
			transformOrigin={{ vertical: "top", horizontal: "right" }}
			open={isMobileMenuOpen}
			onClose={handleMobileMenuClose}
		>
			<MenuItem onClick={handleTasksMenuOpen}>
				<IconButton color="primary"><DoneAll /></IconButton>
				<p>{"Tasks"}</p>
			</MenuItem>
			<MenuItem onClick={projects.length > 0 ? handleProjectsMenuOpen : () => { handleMobileMenuClose(); navigate("/projects"); }}>
				<IconButton color="primary"><ViewListIcon /></IconButton>
				<p>{"Projects"}</p>
			</MenuItem>
			<MenuItem onClick={handleOrganizationsMenuOpen}>
				<IconButton color="primary"><ViewListIcon /></IconButton>
				<p>{"Organizations"}</p>
			</MenuItem>
			<MenuItem onClick={handleProfileMenuOpen}>
				<IconButton color="primary"><AccountCircle /></IconButton>
				<p>{jwt.decode()?.username || "Account"}</p>
			</MenuItem>
		</Menu>
	);

	const pathnames = location.pathname.split("/").filter(Boolean);
	const crumps = [];
	crumps.push(
		<CrumpLink to="/">
			<HomeIcon sx={styles.icon} />
			{"Home"}
		</CrumpLink>,
	);

	for (const [ind, path] of pathnames.entries()) {
		let text = "...";
		if ([
			"digest",
			"projects",
			"teams",
			"settings",
			"kanban",
			"metrics",
			"evolution",
			"violations",
			"files",
			"duplicates",
			"compare",
			"collaborators",
			"commits",
			"analytics",
			"overview",
			"usage",
			"azure-pull-requests",
			"organizations",
			"recommendations",
		].includes(path)) text = capitalize(path);
		else {
			switch (path) {
				case "team-analytics": {
					text = "Team Analytics";
					break;
				}

				case "add": {
					text = "Add Project";
					break;
				}

				case "add-team": {
					text = "Add Team";
					break;
				}

				case "project-analytics": {
					text = "Project Analytics";
					break;
				}

				case "quality-analytics": {
					text = "Quality Analytics";
					break;
				}

				case "management": {
					text = "Task Management";
					break;
				}

				case "sprints": {
					text = "Sprints";
					break;
				}

				case "sprint-management": {
					text = "Sprint Management";
					break;
				}

				case "workload-analytics": {
					text = "Workload Analytics";
					break;
				}

				case "planner": {
					text = "Planner";
					break;
				}

				case "tasks": {
					text = "Tasks";
					break;
				}

				case "my-kanban": {
					text = "My Kanban";
					break;
				}

				case "cyclopt-ai": {
					text = "CycloptAI";
					break;
				}

				case "add-quality-gate": {
					text = "Add Quality Gate";
					break;
				}

				case "quality-gates": {
					text = "Quality Gates";
					break;
				}

				default:
				// Do nothing
			}
		}

		if (text === "...") {
			if (pathnames[ind - 1] === "projects") text = name || "...";
			else if (pathnames[ind - 1] === "teams") text = teamName || "...";
			else if (pathnames[ind - 1] === "organizations") text = selectedOrganization.name || "...";
			else if (pathnames[ind - 1] === "quality-analytics") text = repoName || "...";
			else if (pathnames[ind - 1] === "collaborators" || pathnames[ind - 1] === "analytics" || pathnames[ind - 1] === "team-analytics") text = userName || "...";
			else if (pathnames[ind - 1] === "files") text = (fileName || "....").slice(1);
			else if (pathnames[ind - 1] === "overview") text = (apiTitle || "...");
		}

		crumps.push(<CrumpLink to={`/${pathnames.slice(0, ind + 1).join("/")}`}>{text}</CrumpLink>);
	}

	const getInfoUrl = (paths, index) => {
		if (paths.length > 0) {
			switch (paths[index]) {
				// Project related pages
				case "settings": {
					return "https://www.cyclopt.com/docs/your-projects/settings";
				}

				case "digest": {
					return "https://www.cyclopt.com/docs/your-projects/digest";
				}

				case "add": {
					return "https://www.cyclopt.com/docs/your-projects/create-your-project";
				}

				case "projects": {
					if (index === paths.length - 1) return "https://www.cyclopt.com/docs/your-projects/projects-overview";
					return "https://www.cyclopt.com/docs/your-projects/project-page";
				}

				// Team related pages
				case "add-team": {
					return "https://www.cyclopt.com/docs/your-teams/create-your-team";
				}

				case "teams": {
					if (index === paths.length - 1) return "https://www.cyclopt.com/docs/your-teams/teams-overview";
					return "https://www.cyclopt.com/docs/team-analytics/analysis-across-projects";
				}

				// Quality related pages
				case "metrics": {
					return "https://www.cyclopt.com/docs/quality-analytics/metrics";
				}

				case "violations": {
					return "https://www.cyclopt.com/docs/quality-analytics/violations";
				}

				case "files": {
					return "https://www.cyclopt.com/docs/quality-analytics/files";
				}

				case "duplicates": {
					return "https://www.cyclopt.com/docs/quality-analytics/duplicates";
				}

				case "compare": {
					return "https://www.cyclopt.com/docs/quality-analytics/compare";
				}

				case "commits": {
					return "https://www.cyclopt.com/docs/quality-analytics/commits";
				}

				case "evolution": {
					return "https://www.cyclopt.com/docs/quality-analytics/evolution";
				}

				case "quality-analytics": {
					if (index === paths.length - 1) return "https://www.cyclopt.com/docs/quality-analytics/quality-at-a-glance";
					return "https://www.cyclopt.com/docs/quality-analytics/overview";
				}

				// Project Analytics related pages
				case "project-analytics":
				case "management": {
					return "https://www.cyclopt.com/docs/project-analytics/task-management";
				}

				case "kanban": {
					return "https://www.cyclopt.com/docs/project-analytics/kanban";
				}

				case "workload-analytics": {
					return "https://www.cyclopt.com/docs/project-analytics/workload-analytics";
				}

				case "collaborators": {
					return "https://www.cyclopt.com/docs/project-analytics/collaborators";
				}

				case "planner": {
					return "https://www.cyclopt.com/docs/project-analytics/planner";
				}

				default: {
					if (index > 0) return getInfoUrl(paths, index - 1);
					return "https://www.cyclopt.com/docs/";
				}
			}
		}

		return "https://www.cyclopt.com/docs/";
	};

	const onNotificationClose = async () => {
		try {
			setNotification(null);
			await postNotificationView(notification.id);
		} catch { /* empty */ }
	};

	useEffect(() => {
		const checkNotification = async () => {
			const userNotification = await checkForNotification();
			if (userNotification) {
				setNotification(userNotification);
			}
		};

		if (setNotification) {
			checkNotification();
		}
	}, [setNotification]);

	return (
		<>
			<AppBar position="static" sx={styles.grow}>
				<Toolbar className="header-container" sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
					<Box component={Link} to="/">
						<Image src={cycloptLogo} alt="Cyclopt" width="10rem" sx={{ my: 1, minWidth: "130px" }} />
					</Box>
					<>
						<Box sx={styles.sectionDesktop}>
							<Button
								ref={orgDropdownButton}
								color="inherit"
								sx={{ textTransform: "none" }}
								disabled={isOpen && currentStep === 0}
								onClick={handleOrganizationsMenuOpen}
							>
								{"Organization "}
								{selectedOrganization.name}
								<ExpandMore />
							</Button>
							<IconButton color="inherit" onClick={handleProfileMenuOpen}><AccountCircle /></IconButton>
						</Box>
						<Box sx={styles.sectionMobile}>
							<IconButton color="inherit" sx={{ "&.MuiButtonBase-root": { pr: 0 } }} onClick={handleMobileMenuOpen}><MoreIcon /></IconButton>
						</Box>
					</>
				</Toolbar>
				<Paper elevation={0} sx={styles.root}>
					<Box className="header-container" display="flex" flexDirection="row" alignItems="center" justifyContent="space-between">
						<Breadcrumbs>{crumps.map((e, ind) => <div key={`crump_${ind}`}>{e}</div>)}</Breadcrumbs>
						<Box display="flex" flexDirection="row" alignItems="center">
							<InfoButton
								redirectionUrl={getInfoUrl(pathnames, pathnames.length - 1)}
								sx={{ mr: 1 }}
							/>
						</Box>
					</Box>
				</Paper>
				{notification?.type === "breadcrumb" && (
					<Grid item width="100%" sx={{ backgroundColor: notification?.severity === "error" ? theme.palette.notifications.error : theme.palette.notifications.warning }}>
						<Box className="header-container" sx={{ display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
							{notification?.icon && NotificationIcons(notification?.severity === "error" ? "white" : "black")[notification?.icon]}
							<Grid
								severity="warning"
								variant="filled"
								sx={{
									padding: "15px",
									borderRadius: "0px",
									width: "80%",
									color: notification?.severity === "error" ? "white" : "black",
									backgroundColor: notification?.severity === "error" ? theme.palette.notifications.error : theme.palette.notifications.warning,
								}}
							>
								<Grid item width="100%">
									<b>{notification?.title}</b>
									<Typography>
										{notification?.message}
									</Typography>
								</Grid>
							</Grid>
							<Grid item sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", width: "20%", padding: "0px 10px", color: notification?.severity === "error" ? "white" : "black" }}>
								{notification?.button && (
									<Button
										variant="outlined"
										component={Link}
										to={notification?.button?.link}
										target="_blank"
										rel="noopener noreferrer"
										size="small"
										sx={{
											height: "30px",
											color: "inherit",
											":hover": {
												color: notification?.severity === "error" ? theme.palette.grey.dark : theme.palette.primary.dark,
												borderColor: notification?.severity === "error" ? theme.palette.grey.dark : theme.palette.primary.dark,
											},
										}}
									>
										{notification?.button?.text}
									</Button>
								)}
								{!notification?.disableClose && (
									<Grid
										item
										sx={{
											marginLeft: "15px",
											borderLeft: notification?.button ? "2px solid" : "0px",
										}}
									>
										<IconButton
											edge="end"
											aria-label="close"
											title="close"
											color="inherit"
											onClick={onNotificationClose}
										>
											<Close />
										</IconButton>
									</Grid>
								)}
							</Grid>
						</Box>
					</Grid>
				)}
			</AppBar>
			{renderMobileMenu}
			{renderMenu}
			{notification?.type === "popup" && (
				<Dialog open onClose={() => setNotification(null)}>
					<DialogTitle
						sx={{
							backgroundColor: notification?.severity === "error" ? theme.palette.notifications.error : theme.palette.notifications.warning,
							color: notification?.severity === "error" ? "white" : "black",
							display: "flex",
							alignItems: "center",
							padding: "10px 20px",
						}}
					>
						{notification?.icon && NotificationIcons(notification?.severity === "error" ? "white" : "black")[notification?.icon]}
						<b>{notification?.title}</b>
						<IconButton
							edge="end"
							aria-label="close"
							title="close"
							color="inherit"
							sx={{ marginLeft: "auto" }}
							onClick={onNotificationClose}
						>
							<Close />
						</IconButton>
					</DialogTitle>
					<DialogContent sx={{ paddingTop: "20px!important", display: "flex", flexDirection: "column" }}>
						<Typography align="justify">
							{notification?.message}
						</Typography>
						{notification?.button && (
							<Button
								component={Link}
								to={notification?.button?.link}
								target="_blank"
								rel="noopener noreferrer"
								size="small"
								sx={{
									height: "30px",
									marginTop: "10px",
									marginLeft: "auto",
									padding: "10px",
									color: theme.palette.primary.main,
									border: `1px solid ${theme.palette.primary.main}`,
									":hover": {
										color: theme.palette.primary.dark,
										borderColor: theme.palette.primary.dark,
									},
								}}
							>
								{notification?.button?.text}
							</Button>
						)}
					</DialogContent>
				</Dialog>
			)}
		</>
	);
};

export default memo(Header);

