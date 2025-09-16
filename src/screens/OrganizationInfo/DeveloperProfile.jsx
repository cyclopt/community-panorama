import { memo, useState, useCallback, useEffect } from "react";
import { Container, Grid, Box, Typography, Switch, styled } from "@mui/material";
import { useParams } from "react-router-dom";
import { QueryStats } from "@mui/icons-material";

import LanguagesAndFrameworks from "../../components/developer-stats/LanguagesAndFrameworks.jsx";
import InvolvedRepositories from "../../components/developer-stats/InvolvedRepositories.jsx";
import PersonasCharacteristics from "../../components/developer-stats/PersonasCharacteristics.jsx";
import SoftSkills from "../../components/developer-stats/SoftSkills.jsx";
import Activity from "../../components/developer-stats/Activity.jsx";
import BasicTrends from "../../components/developer-stats/BasicTrends.jsx";
import DeveloperBasicInfo from "../../components/developer-stats/DeveloperBasicInfo.jsx";
import { PinkBackgroundButton } from "../../components/Buttons.jsx";
import RangeSelector from "../../components/RangeSelector.jsx";
import useGlobalState from "../../use-global-state.js";

import { jwt, useSnackbar, getStatusLabel } from "#utils";
import { useDeveloperInfo, updateDeveloperInfo, useDeveloperHistoryStatus, updateDeveloperHistory, useDevActivityAndTrends, updateDeveloperKeys } from "#api";

const ViewToggleContainer = styled(Grid)(({ theme }) => ({
	margin: theme.spacing(1),
	justifyContent: "right",
	alignItems: "center",
}));

const pusher = (idx, arr, id) => {
	if (idx === -1) {
		arr.push(id);
		return;
	}

	arr.splice(idx, 1);
};

const ButtonsBox = styled(Box)(({ theme }) => ({
	marginBottom: theme.spacing(2),
	display: "flex",
	flexDirection: "row-reverse",
	gap: theme.spacing(1),
	alignItems: "flex-start",
}));

// ─── DEVELOPER PROFILE COMPONENT ───────────────────────────────────────────
const DeveloperProfile = () => {
	const currentUser = jwt.maybeDecode();
	const { developerId, organizationid } = useParams();
	const isViewerTheOwner = developerId === currentUser?.id;
	const [isInEditMode, setIsInEditMode] = useState(false);
	const { error, success } = useSnackbar();
	const [range, setRange] = useState(null);
	const {
		developer = {},
		mutate: mutateDevData,
		isLoading: isLoadingMember,
	} = useDeveloperInfo(organizationid, developerId);
	const { status = "", mutate: mutateStatus } = useDeveloperHistoryStatus(organizationid, developerId);
	const { activityAndTrends = "", isLoading: isLoadingActivityAndTrends } = useDevActivityAndTrends(organizationid, developerId, range);

	const { setUserName } = useGlobalState(useCallback((e) => ({
		setUserName: e.setUserName,
	}), []));

	useEffect(() => {
		if (developerId && !isLoadingMember) setUserName(developer.developerInfo.username);
	}, [developerId, isLoadingMember, developer.developerInfo?.username, setUserName]);

	useEffect(() => {
		const interval = setInterval(() => mutateStatus((prev) => prev), 10_000);
		return () => clearInterval(interval);
	}, [mutateStatus]);

	const handlePrivateViewToggle = useCallback(() => {
		if (!isViewerTheOwner) return;
		setIsInEditMode((prev) => !prev);
	}, [isViewerTheOwner]);

	const updateInfo = useCallback(
		async (text, label) => {
			if (!isViewerTheOwner) return;
			try {
				const { avatar, username, ...info } = developer.developerInfo;
				const developerInfo = { ...info };
				developerInfo[label] = text;

				mutateDevData(
					(prev) => ({
						...prev,
						developerInfo: { avatar, username, ...developerInfo },
					}),
					false,
				);

				await updateDeveloperInfo(organizationid, developerId, developerInfo);
				await mutateDevData();
			} catch {
				error("Update failed");
			}
		},
		[error, isViewerTheOwner, developer, mutateDevData, developerId, organizationid],
	);

	const updateKeys = async (_, label, keyOrKeys) => {
		const keysToExclude = { ...developer.keysToExclude };

		const arr = keysToExclude[label] || [];
		if (Array.isArray(keyOrKeys)) {
			for (const id of keyOrKeys) {
				const idx = arr.indexOf(id);
				pusher(idx, arr, id);
			}
		} else {
			const idx = arr.indexOf(keyOrKeys);
			pusher(idx, arr, keyOrKeys);
		}

		mutateDevData(
			(prev) => ({
				...prev,
				keysToExclude: { ...prev.keysToExclude, ...keysToExclude },
			}),
			false,
		);

		await updateDeveloperKeys(organizationid, developerId, keysToExclude);
		await mutateDevData();
	};

	const handleCalculate = async () => {
		try {
			await updateDeveloperHistory(organizationid, developerId);
			mutateStatus("inprogress", false);
			success("Stats are being calculated");
		} catch {
			error("Something went wrong");
		}
	};

	const handleRangeChange = useCallback(
		({ start, end }) => {
			setRange({ start, end });
		},
		[],
	);

	return (
		<Container sx={{ marginTop: "2rem" }}>
			<Grid container spacing={3}>
				<Grid item xs={12} md={3}>
					<DeveloperBasicInfo
						info={developer.developerInfo || {}}
						isInEditMode={isInEditMode}
						updateInfo={updateInfo}
					/>
				</Grid>
				<Grid item xs={12} sm={9} order={{ xs: 3, md: 2 }}>
					<Box
						display="flex"
						justifyContent="space-between"
						width="100%"
					>
						<RangeSelector
							maxDepth={24}
							onChange={handleRangeChange}
						/>
						{isViewerTheOwner && (
							<Box display="flex" alignItems="center">
								<ViewToggleContainer container>
									<Typography variant="caption">{"Show Public"}</Typography>
									<Switch
										size="small"
										checked={isInEditMode}
										name="privateViewToggle"
										color="secondary"
										onChange={handlePrivateViewToggle}
									/>
									<Typography variant="caption">{"Edit Page"}</Typography>
								</ViewToggleContainer>
							</Box>
						)}
					</Box>
					<LanguagesAndFrameworks
						range={range}
						keysToExclude={developer.keysToExclude}
						isInEditMode={isInEditMode}
						updateKeys={updateKeys}
					/>
					<PersonasCharacteristics
						keysToExclude={developer.keysToExclude}
						isInEditMode={isInEditMode}
						updateKeys={updateKeys}
					/>
					<SoftSkills
						range={range}
						keysToExclude={developer.keysToExclude}
						isInEditMode={isInEditMode}
						updateKeys={updateKeys}
					/>
					<InvolvedRepositories
						isLoading={isLoadingMember || isLoadingActivityAndTrends}
						repositories={activityAndTrends.repositories}
						keysToExclude={developer.keysToExclude}
						isInEditMode={isInEditMode}
						updateKeys={updateKeys}
					/>
					<Activity
						isLoading={isLoadingActivityAndTrends}
						contributionsPerDay={activityAndTrends.contributionsPerDay}
						isInEditMode={isInEditMode}
						keysToExclude={developer.keysToExclude}
						updateKeys={updateKeys}
					/>
					<BasicTrends
						isLoading={isLoadingActivityAndTrends}
						trends={activityAndTrends.trends}
					/>
					{isViewerTheOwner && (
						<Box display="flex" justifyContent="center" padding={2}>
							<ButtonsBox>
								<PinkBackgroundButton
									title="calculate stats"
									startIcon={<QueryStats />}
									disabled={["inprogress", "synced", "noDeveloperStats"].includes(status)}
									buttonLabel={getStatusLabel(status)}
									onClick={handleCalculate}
								/>
							</ButtonsBox>
						</Box>
					)}
				</Grid>
			</Grid>
		</Container>
	);
};

export default memo(DeveloperProfile);
