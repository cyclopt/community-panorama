import { useEffect, memo } from "react";
import { styled } from "@mui/material/styles";
import { Grid, Box, Typography, Fab, Link, Zoom, Divider } from "@mui/material";
import clsx from "clsx";
import constructUrl from "@iamnapo/construct-url";
import { useLocation } from "react-router-dom";
import { Image } from "mui-image";

import cycloptLogo from "../assets/images/cyclopt_full.png";
import GitHub from "../assets/images/github.png";
import GitLab from "../assets/images/gitlab.png";
import BitBucket from "../assets/images/bitbucket.png";
import Azure from "../assets/images/azure.png";

const classes = {
	root: "SignIn-root",
	box: "SignIn-box",
	signIn: "SignIn-signIn",
	margin: "SignIn-margin",
	marginCyclopt: "SignIn-margin-cyclopt",
	extendedIcon: "SignIn-extendedIcon",
	boxGrid: "SignIn-boxGrid",
	noPad: "SignIn-noPad",
	subtitle: "SignIn-subtitle",
	subtitleDivider: "SignIn-subtitleDivider",
	link: "SignIn-link",
	paper: "SignIn-paper",
	logo: "SignIn-logo",
};

const StyledGrid = styled(Grid)(({ theme }) => ({
	[`&.${classes.root}`]: {
		margin: theme.spacing(0, -1),
		overflow: "hidden",
		width: "100vw",
		height: "100vh",
	},
	[`& .${classes.signIn}`]: {
		color: theme.palette.grey[700],
	},
	[`& .${classes.margin}`]: {
		margin: theme.spacing(1, 0),
		padding: "0px!important",
		borderRadius: theme.shape.borderRadius,
		borderWidth: theme.spacing(0.2),
		borderStyle: "solid",
		borderColor: theme.palette.primary.main,
		backgroundColor: theme.palette.common.white,
		width: "90px",
		height: "90px",
	},
	[`& .${classes.marginCyclopt}`]: {
		margin: theme.spacing(1, 0),
		borderRadius: theme.shape.borderRadius,
		borderWidth: theme.spacing(0.3),
		borderStyle: "solid",
		borderColor: theme.palette.primary.main,
		backgroundColor: theme.palette.common.white,
		width: "270px",
		height: "45px",
	},
	[`& .${classes.extendedIcon}`]: {
		width: "100%",
	},
	[`& .${classes.boxGrid}`]: {
		marginTop: theme.spacing(1),
		marginBottom: theme.spacing(1),
	},

	[`& .${classes.noPad}`]: {
		padding: "0 !important",
	},

	[`& .${classes.subtitle}`]: {
		color: theme.palette.primary.main,
		fontSize: 16,
	},

	[`& .${classes.subtitleDivider}`]: {
		color: theme.palette.secondary.main,
	},
	[`& .${classes.link}`]: {
		"&:hover": {
			color: theme.palette.primary.dark,
		},
	},
	[`& .${classes.paper}`]: {
		backgroundColor: theme.palette.secondary.main,
		borderRadius: theme.shape.borderRadius,
		boxShadow: theme.shadows[6],
		margin: theme.spacing(1, 0),
	},
	[`& .${classes.logo}`]: {
		width: "50px!important",
	},
}));

const SignIn = () => {
	const { state } = useLocation();
	const authURL = constructUrl(import.meta.env.VITE_MAIN_SERVER_URL, "api/oauth/login", { redirectTo: window.location.href });

	useEffect(() => {
		try {
			sessionStorage.setItem("redirectTo", JSON.stringify(state?.from || { pathname: "/overview" }));
		} catch { /** */ }
	}, [state]);

	return (
		<StyledGrid container direction="row" justifyContent="center" align="center" className={classes.root}>
			<Grid item md={3} />
			<Grid item container direction="column" justifyContent="center" align="center" md={6} spacing={4} m={-2} sx={{ "> .MuiGrid-item": { p: 2 } }}>
				<Grid item container alignItems="center" justifyContent="center" mt={4}>
					<Box sx={{ minWidth: "130px", width: "45%" }}>
						<Image src={cycloptLogo} alt="Cyclopt" />
					</Box>
				</Grid>
				<Grid item container direction="row" justifyContent="center" align="center" className={classes.boxGrid}>
					<Grid item className={classes.noPad} xs={10} md={10}>
						<Grid container direction="column" justifyContent="center" alignItems="center">
							<Grid container direction="row" justifyContent="space-around" maxWidth={600}>
								<Divider
									className={classes.signIn}
									sx={{
										m: 1.5,
										fontSize: (t) => t.spacing(3),
										width: "100%",
										color: (t) => t.palette.grey[700],
										"&.MuiDivider-root": {
											"&::after": {
												borderColor: (t) => t.palette.grey[700],
											},
											"&::before": {
												borderColor: (t) => t.palette.grey[700],
											},
										},
									}}
								>
									{"Sign in with:"}
								</Divider>
							</Grid>
							<Grid item align="center" width="100%">
								<Grid container direction="row" justifyContent="space-between" maxWidth={600}>
									<Grid item>
										<Zoom in unmountOnExit timeout={700}>
											<Fab
												variant="extended"
												size="large"
												aria-label="Sign in with GitHub"
												title="Sign in with GitHub"
												className={classes.margin}
												component="a"
												href={`${authURL}&type=github`}
												target="_self"
											>
												<Box sx={{ textTransform: "none" }}>
													<Image src={GitHub} alt="GitHub" className={classes.logo} />
													<Typography className={classes.subtitle}>{"GitHub"}</Typography>
												</Box>
											</Fab>
										</Zoom>
									</Grid>
									<Grid item>
										<Zoom in unmountOnExit timeout={700}>
											<Fab
												variant="extended"
												size="large"
												aria-label="Sign in with Gitlab"
												title="Sign in with Gitlab"
												href={`${authURL}&type=gitlab`}
												target="_self"
												className={classes.margin}
											>
												<Box sx={{ textTransform: "none" }}>
													<Image src={GitLab} alt="GitLab" className={classes.logo} />
													<Typography className={classes.subtitle}>{"GitLab"}</Typography>
												</Box>
											</Fab>
										</Zoom>
									</Grid>
									<Grid item>
										<Zoom in unmountOnExit timeout={700}>
											<Fab
												variant="extended"
												size="large"
												aria-label="Sign in with Azure"
												title="Sign in with Azure"
												className={classes.margin}
												component="a"
												href={`${authURL}&type=azure`}
												target="_self"
											>
												<Box sx={{ textTransform: "none" }}>
													<Image src={Azure} alt="Azure" className={classes.logo} />
													<Typography className={classes.subtitle}>{"Azure"}</Typography>
												</Box>
											</Fab>
										</Zoom>
									</Grid>
									<Grid item>
										<Zoom in unmountOnExit timeout={700}>
											<Fab
												variant="extended"
												size="large"
												aria-label="Sign in with BitBucket"
												title="Sign in with BitBucket"
												className={classes.margin}
												component="a"
												href={`${authURL}&type=bitbucket`}
												target="_self"
											>
												<Box sx={{ textTransform: "none" }}>
													<Image src={BitBucket} alt="BitBucket" className={classes.logo} />
													<Typography className={classes.subtitle}>{"Bitbucket"}</Typography>
												</Box>
											</Fab>
										</Zoom>
									</Grid>
								</Grid>
								<Grid container direction="row" justifyContent="space-around" maxWidth={600}>
									<Divider
										className={classes.signIn}
										sx={{
											m: 1.5,
											fontSize: (t) => t.spacing(2),
											width: "100%",
											color: (t) => t.palette.grey[700],
											"&.MuiDivider-root": {
												"&::after": {
													borderColor: (t) => t.palette.grey[700],
												},
												"&::before": {
													borderColor: (t) => t.palette.grey[700],
												},
											},
										}}
									>
										{"OR"}
									</Divider>
								</Grid>
								<Grid item>
									<Zoom in unmountOnExit timeout={700}>
										<Fab
											variant="extended"
											aria-label="Sign in with Cyclopt"
											title="Sign in with Cyclopt"
											className={classes.margin}
											component="a"
											href={`${authURL}&type=cyclopt`}
											target="_self"
											sx={{ width: "270px !important", height: "45px !important" }}
										>
											<Grid container direction="row" justifyContent="center" sx={{ alignItems: "center", textTransform: "none" }}>
												<Typography variant="h6" className={classes.signIn} mr={1}>{"Sign in with:"}</Typography>
												<Image src={cycloptLogo} alt="Cyclopt" width="45%" />
											</Grid>
										</Fab>
									</Zoom>
								</Grid>
							</Grid>
						</Grid>
					</Grid>
				</Grid>
				<Grid item container direction="row" justifyContent="center" spacing={1} m={-0.5} sx={{ "> .MuiGrid-item": { p: 0.5 } }}>
					<Grid item>
						<Link
							variant="h6"
							className={clsx(classes.subtitle, classes.link)}
							href="https://cyclopt.com"
							target="_blank"
							rel="noopener noreferrer"
							underline="none"
						>
							{"About"}
						</Link>
					</Grid>
					<Grid item><Typography className={classes.subtitleDivider}>{"|"}</Typography></Grid>
					<Grid item>
						<Link
							variant="h6"
							href="https://cyclopt.com/blog"
							target="_blank"
							rel="noopener noreferrer"
							className={clsx(classes.subtitle, classes.link)}
							underline="none"
						>
							{"Blog"}
						</Link>
					</Grid>
					<Grid item><Typography className={classes.subtitleDivider}>{"|"}</Typography></Grid>
					<Grid item>
						<Link
							variant="h6"
							href="https://cyclopt.com/tos"
							target="_blank"
							rel="noopener noreferrer"
							className={clsx(classes.subtitle, classes.link)}
							underline="none"
						>
							{"ToS"}
						</Link>
					</Grid>
					<Grid item><Typography className={classes.subtitleDivider}>{"|"}</Typography></Grid>
					<Grid item>
						<Link
							variant="h6"
							href="https://cyclopt.com/privacy"
							target="_blank"
							rel="noopener noreferrer"
							className={clsx(classes.subtitle, classes.link)}
							underline="none"
						>
							{"Privacy"}
						</Link>
					</Grid>
				</Grid>
			</Grid>
			<Grid item md={3} />
		</StyledGrid>
	);
};

export default memo(SignIn);
