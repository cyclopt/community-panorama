/* eslint-disable max-len */
import { useState, useEffect, memo, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import clsx from "clsx";
import { FormControl, Stack, FormLabel, FormControlLabel, Radio, RadioGroup, Typography, Grid, IconButton, TextField, Tabs, Tab, Switch, Link as MaterialLink, Button, CircularProgress, MenuItem, Box } from "@mui/material";
import { dequal } from "dequal";
import { useNavigate } from "react-router-dom";
import copy from "copy-text-to-clipboard";
import { ContentPaste } from "@mui/icons-material";
import { shallow } from "zustand/shallow";

import PostitKanban from "../assets/images/PostitKanban.png";
import christmasKanban from "../assets/images/ChristmasKanban.png";
import earthKanban from "../assets/images/EarthKanban.png";
import defaultKanban from "../assets/images/DefaultKanban.png";
import vividKanban from "../assets/images/vividKanban.png";
import useLocalStorage from "../utils/use-local-storage.js";
import Tooltip from "../components/Tooltip.jsx";
import Card from "../components/Card.jsx";
import Select from "../components/Select.jsx";

import api, { getCycloptToken, saveUserChatGptToken, deleteUserChatGptToken, useUsersChatGPTToken, getUserNotifications,
	sendReportNow, updateUserEmailNotifications, generateCycloptToken,
	deleteCycloptToken, updateKanbanTheme, verifyChatGptToken,
} from "#api";
import { capitalize, jwt, useSnackbar, dayjs } from "#utils";

const styles = {
	dangerText: {
		m: 1,
		color: "red.500",
	},
	danger: {
		bgcolor: "red.500",
	},
	buttonProgress: {
		color: "primary.main",
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: "-12px",
		marginLeft: "-12px",
	},
	sendNowProgress: {
		color: "common.white",
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: "-12px",
		marginLeft: "-12px",
	},
};

const label = { color: "primary.main" };

const User = () => {
	const navigate = useNavigate();
	const { chatGPT = {}, mutate: mutateChatGPT } = useUsersChatGPTToken();
	const [editChatGptToken, setEditChatGptToken] = useState("");
	const [cycloptToken, setCycloptToken] = useState("");
	const [cycloptTokenWarning, setCycloptTokenWarning] = useState("");
	const [showToken, setShowToken] = useState(false);
	const { type = "github", username, email } = jwt.decode();
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [isValidToken, setIsValidToken] = useState("");
	const [user, setUser] = useState({
		username,
		email,
		notifications: {
			projectParticipation: false,
			taskAssignment: false,
			userMention: false,
			weeklyReports: false,
			reportsAt: ["Monday", "07:00"],
			email,
			poly: {
				platform: "discord",
				webhookUrl: "",
			},
		},
	});
	const [initialUser, setInitialUser] = useState({
		username,
		email,
		notifications: {
			projectParticipation: false,
			taskAssignment: false,
			userMention: false,
			weeklyReports: false,
			reportsAt: ["Monday", "07:00"],
			email,
			poly: {
				platform: "discord",
				webhookUrl: "",
			},
		},
	});
	const [tab, setTab] = useState(0);
	const { success, error } = useSnackbar();

	useEffect(() => {
		(async () => {
			try {
				const notifications = await getUserNotifications();
				setInitialUser((p) => ({ ...p, notifications }));
				setUser((p) => ({ ...p, notifications }));
			} catch { /** empty */ }

			setIsLoading(false);
		})();
	}, []);

	useEffect(() => {
		(async () => {
			try {
				const { token } = await getCycloptToken();
				setCycloptToken(token);
				setCycloptTokenWarning("");
			} catch { /** empty */ }

			setIsLoading(false);
		})();
	}, []);

	const generateToken = useCallback(async (e) => {
		e.preventDefault();
		const { token } = await generateCycloptToken();
		setCycloptToken(token);
		setCycloptTokenWarning("Make sure to copy this token now. You won't be able to see it again!");
		setShowToken(true);
	}, []);

	const deleteToken = useCallback(async (e) => {
		e.preventDefault();
		await deleteCycloptToken();
		setCycloptToken("");
		setCycloptTokenWarning("");
		setShowToken(false);
	}, []);

	const revoke = useCallback(async () => {
		try {
			const usr = await api.delete("api/users/revoke/");
			usr.notifications = {
				projectParticipation: false,
				taskAssignment: false,
				userMention: false,
				weeklyReports: false,
				reportsAt: ["Monday", "07:00"],
				poly: {
					platform: "discord",
					webhookUrl: "",
				},
			};
			setUser(usr);
			success("Grant revoked.");
			jwt.destroyTokens();
			navigate("/");
		} catch (error_) {
			error(`Something went wrong: ${error_.message}`);
		}
	}, [error, navigate, success]);

	const updateEmailNotifications = useCallback(async (e) => {
		e.preventDefault();
		if (!(isLoading || dequal(user, initialUser))) {
			try {
				setIsLoading(true);
				setIsSubmitting(true);
				const emailNotifications = await updateUserEmailNotifications({
					email: user.notifications.email,
					projectParticipation: user.notifications.projectParticipation,
					taskAssignment: user.notifications.taskAssignment,
					userMention: user.notifications.userMention,
					weeklyReports: user.notifications.weeklyReports,
					reportsAt: user.notifications.reportsAt });
				setUser((p) => ({ ...p,
					notifications: { ...p.notifications,
						email: emailNotifications.email,
						projectParticipation: emailNotifications.projectParticipation,
						taskAssignment: emailNotifications.taskAssignment,
						userMention: emailNotifications.userMention,
						weeklyReports: emailNotifications.weeklyReports,
						reportsAt: emailNotifications.reportsAt } }));
				setInitialUser((p) => ({ ...p,
					notifications: { ...p.notifications,
						email: emailNotifications.email,
						projectParticipation: emailNotifications.projectParticipation,
						taskAssignment: emailNotifications.taskAssignment,
						userMention: emailNotifications.userMention,
						weeklyReports: emailNotifications.weeklyReports,
						reportsAt: emailNotifications.reportsAt } }));
				success("Preferences updated.");
			} catch {
				error();
			}

			setIsLoading(false);
			setIsSubmitting(false);
		}
	}, [error, initialUser, isLoading, success, user]);

	const submitSendReportNow = useCallback(async (e) => {
		e.preventDefault();
		try {
			setIsSending(true);
			await sendReportNow(dayjs().subtract(1, "week").startOf("day").toISOString());
			success("Report is being sent to your email.");
		} catch {
			error();
		}

		setIsSending(false);
	}, [error, success]);

	const theme = useTheme();
	const { kanbanTheme, setKanbanTheme } = useLocalStorage(useCallback((e) => ({
		kanbanTheme: e?.kanbanTheme,
		setKanbanTheme: e?.setKanbanTheme,
	}), []), shallow);

	return (
		<div className="container">
			<Grid container direction="column" justifyContent="center" spacing={2} m={-1} pt="1rem" sx={{ "> .MuiGrid-item": { p: 1 } }}>
				<Grid item xs={12} md={3} lg={2}>
					<Tabs value={tab} orientation="horizontal" onChange={(_, newVal) => setTab(newVal)}>
						<Tab label="general" />
						<Tab label="notifications" />
						<Tab label="openapi" />
					</Tabs>
				</Grid>

				<Grid item xs={12} md={9} lg={10} hidden={tab !== 0}>
					<Grid container direction="column" justifyContent="center" sx={{ "> .MuiGrid-item": { p: 2 } }}>
						<Grid item>
							<Card title={`${capitalize(type)} Integration`}>
								<div className="field is-horizontal">
									<div className={clsx("label", "field-label", "is-normal")}>{`${capitalize(type)} Account`}</div>
									<div className="field-body">
										<div className="field">
											<div className="control">
												<input
													required
													disabled
													name="accountName"
													id="accountNameUser"
													className="input"
													type="text"
													value={user.username || ""}
													placeholder="Account username"
												/>
											</div>
										</div>
									</div>
								</div>
								<div className="field is-horizontal">
									<Box className={clsx("label", "field-label", "is-normal")} sx={label}>{"Email Address"}</Box>
									<div className="field-body">
										<div className="field">
											<div className="control">
												<input
													required
													disabled
													name="accountEmail"
													id="accountEmail"
													className="input"
													type="email"
													value={user?.email || ""}
													placeholder="Account email"
												/>
											</div>
										</div>
									</div>
								</div>
								<div className="field is-horizontal">
									<Box className={clsx("label", "field-label", "is-normal")} sx={label}>{`${capitalize(type)} Access Status`}</Box>
									<div className="field-body">
										<div className="field">
											<div className="control">
												<Switch checked onChange={revoke} />
											</div>
											<Typography variant="body2">
												{`Unlinking your ${capitalize(type)} account will not erase any data stored in Cyclopt. It will just revoke your
														grant to Cyclopt for accessing your ${capitalize(type)} account and data. If you sign in again your will grant
														Cyclopt again access your ${capitalize(type)} account and data.`}
											</Typography>
										</div>
									</div>
								</div>
							</Card>
						</Grid>
						<Grid item>
							<Card title="Kanban Theme">
								<FormControl>
									<FormLabel id="demo-controlled-radio-buttons-group" />
									<RadioGroup
										value={kanbanTheme}
										aria-labelledby="demo-controlled-radio-buttons-group"
										name="controlled-radio-buttons-group"
										onChange={(e) => {
											setKanbanTheme(e.target.value);
											updateKanbanTheme(e.target.value);
										}}
									>
										<div className="field is-horizontal" id="kanban-theme-card">
											<div className="field is-vertical">
												<FormControlLabel sx={{ display: "flex", justifyContent: "center" }} value="Default" control={<Radio />} label="Default" labelPlacement="start" />
												<img style={{ width: "95%" }} src={defaultKanban} alt="default kanban theme" />
											</div>
											<div className="field is-vertical">
												<FormControlLabel sx={{ display: "flex", justifyContent: "center" }} value="Christmas" control={<Radio />} label="Christmas" labelPlacement="start" />
												<img style={{ width: "95%" }} src={christmasKanban} alt="default kanban theme" />
											</div>
											<div className="field is-vertical">
												<FormControlLabel sx={{ display: "flex", justifyContent: "center" }} value="Vivid" control={<Radio />} label="Vivid" labelPlacement="start" />
												<img style={{ width: "95%" }} src={vividKanban} alt="default kanban theme" />
											</div>
											<div className="field is-vertical">
												<FormControlLabel sx={{ display: "flex", justifyContent: "center" }} value="Earth" control={<Radio />} label="Earth" labelPlacement="start" />

												<img style={{ width: "95%" }} src={earthKanban} alt="default kanban theme" />
											</div>
											<div className="field is-vertical">
												<FormControlLabel sx={{ display: "flex", justifyContent: "center" }} value="PostIt" control={<Radio />} label="Post It" labelPlacement="start" />
												<img style={{ width: "95%" }} src={PostitKanban} alt="default kanban theme" />
											</div>
										</div>
									</RadioGroup>
								</FormControl>
							</Card>
						</Grid>
						{true
						&& (
							<Grid item>
								<Card title="ChatGPT Token">
									<Grid container direction="column" sx={{ "> .MuiGrid-container": { pb: 2 } }}>
										<Grid container direction="row" alignItems="center">
											<Grid item xs={12} sm={3} md={2} pr={2} display="flex" sx={{ justifyContent: { xs: "flex-start", md: "flex-end" } }}>
												<Typography variant="h7" fontWeight="bold" color="primary">{"ChatGPT Token:"}</Typography>
											</Grid>
											<Grid item xs={12} sm={9} md={10} display="flex" alignItems="center">
												<TextField
													fullWidth
													disabled={chatGPT?.token}
													size="small"
													value={chatGPT?.token || editChatGptToken || ""}
													onChange={(e) => { setEditChatGptToken(e.target.value); setIsValidToken(false); }}
												/>
											</Grid>
										</Grid>
										<Grid item display="flex" direction="row" alignItems="center">
											<Grid item xs={12} sm={3} md={2} pr={2} display="flex" sx={{ justifyContent: { xs: "flex-start", md: "flex-end" } }}>
												<Typography variant="h7" fontWeight="bold" color="primary">{"Available Tokens:"}</Typography>
											</Grid>
										</Grid>
										<Grid item display="flex" alignItems="center">
											<Grid item xs={12} sm={3} md={2} pr={2} display="flex" sx={{ justifyContent: { xs: "flex-start", md: "flex-end" } }}>
												<Typography variant="h7" fontWeight="bold" color="primary">{"Used Tokens:"}</Typography>
											</Grid>
										</Grid>
										<Grid container direction="row-reverse" xs={12}>
											<Stack
												direction="row"
												justifyContent="center"
												alignItems="center"
												spacing={2}
											>
												<Button
													disabled={chatGPT?.token || !isValidToken}
													variant="outlined"
													size="medium"
													type="button"
													onClick={async () => {
														await saveUserChatGptToken(editChatGptToken);
														mutateChatGPT();
														setEditChatGptToken(null);
													}}
												>
													{"Save"}
												</Button>
												<Button
													disabled={!chatGPT?.token}
													variant="contained"
													color="secondary"
													size="medium"
													type="submit"
													style={{ color: theme.palette.common.white }}
													onClick={async () => {
														setEditChatGptToken(null);
														await deleteUserChatGptToken();
														mutateChatGPT();
													}}
												>
													{"Delete"}
												</Button>
												<Button
													disabled={!editChatGptToken}
													variant="contained"
													color="secondary"
													size="medium"
													type="submit"
													style={{ color: theme.palette.common.white }}
													onClick={async () => {
														try {
															await verifyChatGptToken(editChatGptToken);
															setIsValidToken(true);
															success("Token is valid");
														} catch {
															setIsValidToken(false);
															error("Token is not Valid");
														}
													}}
												>
													{"Verify Token"}
												</Button>
											</Stack>
										</Grid>
									</Grid>
								</Card>
							</Grid>
						)}
						<Grid item>
							<Card danger title="Account Deletion">
								<Typography sx={styles.dangerText}>
									{"To completely erase your account and data from our system please send an email to "}
									<strong><MaterialLink underline="none" href="mailto:support@cyclopt.com?subject='Account Deletion">{"support@cyclopt.com"}</MaterialLink></strong>
									{`. We will remove everything within 60 days according to our terms of services and privacy policy and
										unlink your ${capitalize(type)} account.`}
								</Typography>
							</Card>
						</Grid>
					</Grid>
				</Grid>
				<Grid item xs={12} md={9} lg={10} hidden={tab !== 1}>
					<Grid container direction="column" justifyContent="center" sx={{ "> .MuiGrid-item": { p: 2 } }}>
						<Grid item>
							<Card title="Email Notifications">
								<form onSubmit={updateEmailNotifications}>
									<div className="field is-horizontal">
										<Box className={clsx("label", "field-label", "is-normal")} sx={label}>{"Email Address"}</Box>
										<div className="field-body">
											<div className="field">
												<div className="control">
													<input
														required
														name="notificationEmail"
														id="notificationEmail"
														className="input"
														type="email"
														value={user?.notifications?.email || ""}
														placeholder="Notifications email"
														onChange={(e) => setUser((p) => ({
															...p, notifications: { ...p.notifications, email: e.target.value },
														}))}
													/>
												</div>
											</div>
										</div>
									</div>
									<div className="field is-horizontal">
										<Box className={clsx("label", "field-label", "is-normal")} sx={label}>{"Project Participation"}</Box>
										<div className="field-body">
											<div className="field">
												<div className="control">
													<Switch
														disabled={isLoading}
														checked={user.notifications.projectParticipation}
														onChange={() => setUser((p) => ({
															...p,
															notifications: {
																...p.notifications,
																projectParticipation: !p.notifications.projectParticipation,
															},
														}))}
													/>
													<Typography variant="body2">
														{"Enable this to be notified via email whenever you are added to a project."}
													</Typography>
												</div>
											</div>
										</div>
									</div>

									<div className="field is-horizontal">
										<Box className={clsx("label", "field-label", "is-normal")} sx={label}>{"Task Assignment"}</Box>
										<div className="field-body">
											<div className="field">
												<div className="control">
													<Switch
														disabled={isLoading}
														checked={user.notifications.taskAssignment}
														onChange={() => setUser((p) => ({
															...p,
															notifications: {
																...p.notifications,
																taskAssignment: !p.notifications.taskAssignment,
															},
														}))}
													/>
													<Typography variant="body2">
														{"Enable this to be notified via email whenever a task is assigned to you."}
													</Typography>
												</div>
											</div>
										</div>
									</div>

									<div className="field is-horizontal">
										<Box className={clsx("label", "field-label", "is-normal")} sx={label}>{"User Mention"}</Box>
										<div className="field-body">
											<div className="field">
												<div className="control">
													<Switch
														disabled={isLoading}
														checked={user.notifications.userMention}
														onChange={() => setUser((p) => ({
															...p,
															notifications: {
																...p.notifications,
																userMention: !p.notifications.userMention,
															},
														}))}
													/>
													<Typography variant="body2">
														{"Enable this to be notified via email whenever you are mentioned."}
													</Typography>
												</div>
											</div>
										</div>
									</div>

									<div className="field is-horizontal">
										<Box className={clsx("label", "field-label", "is-normal")} sx={label}>{"Weekly Reports"}</Box>
										<div className="field-body">
											<div className="field">
												<div className="control">
													<Switch
														disabled={isLoading}
														checked={user.notifications.weeklyReports}
														onChange={() => setUser((p) => ({
															...p,
															notifications: {
																...p.notifications,
																weeklyReports: !p.notifications.weeklyReports,
															},
														}))}
													/>
													<Typography variant="body2">
														{"Enable this to receive a weekly report on all your projects and tasks. "}
													</Typography>
												</div>
											</div>
										</div>
									</div>
									<div className="field is-horizontal">
										<Box className={clsx("label", "field-label", "is-normal")} sx={label}>{"Send reports every"}</Box>
										<div className="field-body">
											<div className="field">
												<div className="control">
													<Grid container direction="row" spacing={1} m={-0.5} sx={{ "> .MuiGrid-item": { p: 0.5 } }}>
														<Grid item xs={12} sm={3} md={4} lg={3}>
															<Select
																disabled={isLoading}
																id="reportDay"
																value={user.notifications?.reportsAt[0] || ""}
																onChange={(e) => setUser((p) => ({
																	...p,
																	notifications: {
																		...p.notifications,
																		reportsAt: [e.target.value, p.notifications.reportsAt[1]],
																	},
																}))}
															>
																{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
																	(e) => <MenuItem key={`notification_${e}`} value={e}>{e}</MenuItem>,
																)}
															</Select>
														</Grid>
														<Grid item container justifyContent="center" alignItems="center" xs={12} sm={1}>
															<Box sx={{ ...label, fontWeight: 700 }}>{"at"}</Box>
														</Grid>
														<Grid item xs={12} sm={3} md={4} lg={3}>
															<Select
																disabled={isLoading}
																id="reportTime"
																value={user.notifications.reportsAt[1] || ""}
																onChange={(e) => setUser((p) => ({
																	...p,
																	notifications: {
																		...p.notifications,
																		reportsAt: [p.notifications.reportsAt[0], e.target.value],
																	},
																}))}
															>
																{[
																	"00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00",
																	"11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00",
																	"22:00", "23:00"].map(
																	(e) => <MenuItem key={`reportTime_${e}`} value={e}>{e}</MenuItem>,
																)}
															</Select>
														</Grid>
														<Grid item xs={12} sm={3} md={4} lg={3} ml={2} display="flex" justifyContent="center" alignItems="center">
															<Button
																variant="contained"
																color="primary"
																size="medium"
																disabled={isLoading}
																onClick={submitSendReportNow}
															>
																{"Send now"}
																{isSending && <CircularProgress size={24} sx={styles.sendNowProgress} />}
															</Button>
														</Grid>
													</Grid>
												</div>
											</div>
										</div>
									</div>
									<Grid container direction="row" justifyContent="flex-end" alignItems="center" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
										<Button
											variant="contained"
											color="secondary"
											sx={{ color: "common.white" }}
											size="medium"
											type="submit"
											disabled={isLoading || dequal(
												{ ...user,
													notifications: {
														email: user.notifications.email,
														projectParticipation: user.notifications.projectParticipation,
														taskAssignment: user.notifications.taskAssignment,
														userMention: user.notifications.userMention,
														weeklyReports: user.notifications.weeklyReports,
														reportsAt: user.notifications.reportsAt,
													} },
												{ ...initialUser,
													notifications: {
														email: initialUser.notifications.email,
														projectParticipation: initialUser.notifications.projectParticipation,
														taskAssignment: initialUser.notifications.taskAssignment,
														userMention: initialUser.notifications.userMention,
														weeklyReports: initialUser.notifications.weeklyReports,
														reportsAt: initialUser.notifications.reportsAt,
													} },
											)}
										>
											{"Done"}
											{isSubmitting && <CircularProgress size={24} sx={styles.buttonProgress} />}
										</Button>
										<Grid item>
											<Button
												variant="outlined"
												size="medium"
												type="button"
												onClick={() => setUser((p) => ({
													...p,
													notifications: {
														...p.notifications,
														email: initialUser.notifications.email,
														projectParticipation: initialUser.notifications.projectParticipation,
														taskAssignment: initialUser.notifications.taskAssignment,
														userMention: initialUser.notifications.userMention,
														weeklyReports: initialUser.notifications.weeklyReports,
														reportsAt: initialUser.notifications.reportsAt,
													},
												}))}
											>
												{"Reset"}
											</Button>
										</Grid>
									</Grid>
								</form>
							</Card>
						</Grid>
					</Grid>
				</Grid>
				<Grid item xs={12} md={9} lg={10} hidden={tab !== 2}>
					<Grid container direction="column" justifyContent="center" sx={{ "> .MuiGrid-item": { p: 2 } }}>
						<Grid item>
							<Card title="Cyclopt OpenAPI Token">
								<div className="field is-horizontal">
									<div className={clsx("label", "field-label", "is-normal")}>{"OpenAPI Token"}</div>
									<div className="field-body">
										<div className="field">
											<div className="control">
												<TextField
													disabled
													size="small"
													sx={{ width: "90%" }}
													value={cycloptToken || ""}
												/>
												<IconButton
													size="small"
													type="button"
													color="secondary"
													sx={{ ml: "1rem" }}
													disabled={!showToken}
													onClick={() => {
														copy(cycloptToken);
														success("Copied key to clipboard!");
													}}
												>
													<Tooltip title="Copy to clipboard"><ContentPaste /></Tooltip>
												</IconButton>
											</div>
											{cycloptTokenWarning && <Typography sx={styles.dangerText}>{cycloptTokenWarning}</Typography>}
										</div>
									</div>
								</div>
								<div className="buttonField">
									<Button
										className="generateButton"
										variant="contained"
										color="primary"
										size="medium"
										disabled={isLoading}
										style={{ display: (cycloptToken?.length > 0) ? "none" : "block" }}
										onClick={generateToken}
									>
										{"Generate Token"}
									</Button>
									<Button
										className="deleteButton"
										variant="contained"
										color="primary"
										size="medium"
										disabled={isLoading}
										style={{ display: (cycloptToken === "") ? "none" : "block" }}
										onClick={deleteToken}
									>
										{"Delete Token"}
									</Button>
								</div>
							</Card>
						</Grid>
					</Grid>
				</Grid>
			</Grid>
		</div>
	);
};

export default memo(User);
