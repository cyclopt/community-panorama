import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Typography, Grid, Modal, Box, Card, CardContent, CardHeader, MenuItem, Checkbox, Button, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import prettyMilliseconds from "pretty-ms";

import { dayjs, getWorkdayTime } from "../../utils/index.js";
import Tile from "../../components/Tile.jsx";
import AzureInfoButton from "../../components/AzureInfoButton.jsx";
import ClosedPullRequests from "../../components/ClosedPullRequests.jsx";
import OpenTimePullRequests from "../../components/OpenTimePullRequests.jsx";
import BranchesBreakDown from "../../components/BranchesBreakDown.jsx";
import DataTable from "../../components/DataTable.jsx";
import Select from "../../components/Select.jsx";
import { useAzurePullRequests } from "../../api/index.js";

const workhours = Array.from({ length: 24 }, (_, i) => i);
const strToNum = (str, base = 10) => Number.parseInt(str, base);

const AzurePullRequests = () => {
	const { projectid } = useParams();
	const [open, setOpen] = useState(false);
	const [pullReq, setPullReq] = useState();
	const [timeFrame, setTimeFrame] = useState(2);
	const [workTimeOptions, setWorkTimeOptions] = useState({});
	const [applyButtonActive, setApplyButtonActive] = useState(false);
	const theme = useTheme();
	const { azurePullRequests = [], isLoading } = useAzurePullRequests(projectid, timeFrame);

	const openTimeMap = useMemo(() => new Map(
		azurePullRequests?.map((d) => {
			const ms = getWorkdayTime(d?.creationDate, d?.closedDate, workTimeOptions) || 0;
			return [
				d?.pullRequestId,
				{
					...d,
					stringified: prettyMilliseconds(ms),
					ms,
				},
			];
		}),
	), [azurePullRequests, workTimeOptions]);

	const avg = useMemo(() => Math.floor((azurePullRequests?.reduce(
		(prev, cur) => getWorkdayTime(dayjs(cur?.creationDate), dayjs(cur?.closedDate), workTimeOptions) + prev, 0,
	) || 0) / azurePullRequests.length), [azurePullRequests, workTimeOptions]);

	const handleClick = (id) => {
		const pr = openTimeMap.get(id);
		setPullReq(pr);
		setOpen(true);
	};

	const handleApply = () => {
		setWorkTimeOptions(() => ({
			workHoursStart: strToNum(document.querySelector("#workhour-start").innerHTML || 8),
			workHoursEnd: strToNum(document.querySelector("#workhour-end").innerHTML || 20),
			includeWeekends: document.querySelector("#include-weekends").checked,
		}));
		setTimeFrame(document.querySelector("#time-frame").innerHTML.split(" ")[0] || 2);
		setApplyButtonActive(false);
	};

	const tableColumns = [
		{
			field: "Title",
			minWidth: 250,
			flex: 1,
			align: "left",
			valueGetter: ({ row }) => row.title,
			renderCell: ({ row, value }) => (
				<Box sx={{ display: "flex", alignItems: "center" }}>
					<AzureInfoButton onClick={() => handleClick(row.pullRequestId)} />
					<Typography component="a" style={{ color: "#000000DE" }} onClick={() => handleClick(row.pullRequestId)}>
						{value}
					</Typography>
				</Box>
			),
		},
		{
			field: "Target Branch",
			minWidth: 175,
			flex: 0.5,
			valueGetter: ({ row }) => row.targetRefName.replace("refs/heads/", ""),
		},
		{
			field: "Time Open",
			minWidth: 175,
			flex: 0.3,
			valueGetter: ({ row }) => openTimeMap?.get(row.pullRequestId)?.ms,
			type: "number",
			renderCell: ({ value }) => <Typography>{prettyMilliseconds(value)}</Typography>,
		},
		{
			field: "Closed At",
			minWidth: 180,
			type: "date",
			getApplyQuickFilterFn: undefined,
			valueGetter: ({ row }) => (row?.closedDate ? new Date(row.closedDate) : null),
			renderCell: ({ value }) => (value ? <Typography>{dayjs(value).format("DD MMM YY, hh:mm a")}</Typography> : null),
		},
	];

	return (
		<div className="container">
			<Grid container direction="row" p={2} justifyContent="center" spacing={3} m={-1.5} mt={1} sx={{ "> .MuiGrid-item": { p: 1.5 } }}>
				<Grid item container xs={12} spacing={2}>
					<Grid item container md={3} justifyContent="center" alignItems="center">
						<Grid item xs={12} md={5}>
							<Typography style={{ fontWeight: "600", textAlign: "center" }}>{"Time Frame: "}</Typography>
						</Grid>
						<Grid item xs={12} md={7}>
							<Select id="time-frame" defaultValue="2" style={{ width: "none" }} onChange={() => setApplyButtonActive(true)}>
								<MenuItem value="1">{"1 Month"}</MenuItem>
								<MenuItem value="2">{"2 Months"}</MenuItem>
								<MenuItem value="3">{"3 Months"}</MenuItem>
								<MenuItem value="6">{"6 Months"}</MenuItem>
								<MenuItem value="12">{"12 Months"}</MenuItem>
							</Select>
						</Grid>
					</Grid>
					<Grid item container md={3} justifyContent="center" alignItems="center">
						<Grid item xs={12} md={8}>
							<Typography style={{ fontWeight: "600", textAlign: "center" }}>{"Work Hours Start: "}</Typography>
						</Grid>
						<Grid item xs={12} md={4}>
							<Select id="workhour-start" defaultValue="8" style={{ width: "none" }} onChange={() => setApplyButtonActive(true)}>
								{workhours.map((hour) => (
									<MenuItem key={`${hour}-start`} value={hour}>{hour}</MenuItem>
								))}
							</Select>
						</Grid>
					</Grid>
					<Grid item container md={3} justifyContent="center" alignItems="center">
						<Grid item xs={12} md={8}>
							<Typography style={{ fontWeight: "600", textAlign: "center" }}>{"Work Hours End: "}</Typography>
						</Grid>
						<Grid item xs={12} md={4}>
							<Select id="workhour-end" defaultValue="20" style={{ width: "none" }} onChange={() => setApplyButtonActive(true)}>
								{workhours.map((hour) => (
									<MenuItem key={`${hour}-end`} value={hour}>{hour}</MenuItem>
								))}
							</Select>
						</Grid>
					</Grid>
					<Grid item container md={2} justifyContent="center" alignItems="center">
						<Grid item xs={12} md={10}>
							<Typography style={{ fontWeight: "600", textAlign: "center" }}>{"Include Weekends: "}</Typography>
						</Grid>
						<Grid item xs={12} md={2}>
							<Checkbox id="include-weekends" onChange={() => setApplyButtonActive(true)} />
						</Grid>
					</Grid>
					<Grid item container md={1} justifyContent="center" alignItems="center">
						<Button disabled={!applyButtonActive} variant="contained" onClick={() => handleApply()}>
							{"APPLY"}
						</Button>
					</Grid>
				</Grid>
			</Grid>
			{isLoading ? <div style={{ height: "calc(100vh - 22rem)", display: "flex", alignItems: "center", justifyContent: "center" }}><CircularProgress color="secondary" /></div> : azurePullRequests?.length > 0 ? (
				<>
					<Grid container direction="row" p={2} justifyContent="center" spacing={3} m={-1.5} sx={{ "> .MuiGrid-item": { p: 1.5 } }}>
						<Grid item xs><Tile row={2} title={dayjs(azurePullRequests.at(azurePullRequests.length - 1 || 0)?.closedDate).format("DD/MM/YYYY")} content="completed since" /></Grid>
						<Grid item xs><Tile row={2} number={azurePullRequests.length} content="count" /></Grid>
						<Grid item xs>
							<Tile
								row={2}
								title={prettyMilliseconds(avg || 0, { keepDecimalsOnWholeSeconds: true, secondsDecimalDigits: 0 })}
								content="average time"
							/>
						</Grid>
					</Grid>
					<Grid container spacing={3} p={2}>
						<Grid item xs={12} md={6}>
							<ClosedPullRequests data={azurePullRequests} />
						</Grid>
						<Grid item xs={12} md={6}>
							<OpenTimePullRequests openTimeMap={openTimeMap} data={azurePullRequests} />
						</Grid>
					</Grid>
					<Grid item p={2} pt={1} xs={12}>
						<BranchesBreakDown data={azurePullRequests} />
					</Grid>
					<Grid item container p={2} textAlign="center" xs={12}>
						<Grid item xs={12} style={{ width: "100%" }}>
							<DataTable
								loading={isLoading}
								rows={azurePullRequests}
								columns={tableColumns}
								initialState={{ sorting: { sortModel: [{ field: "Closed At", sort: "desc" }] }, pagination: { paginationModel: { page: 0 } } }}
							/>
						</Grid>
					</Grid>
					<Modal
						open={open}
						style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
						onClose={() => setOpen(false)}
					>
						<Card style={{ width: "80%", maxWidth: "60rem" }}>
							<CardHeader
								title={pullReq?.title || ""}
								style={{ backgroundColor: theme.palette.primary.main, color: "white" }}
							/>
							<CardContent>
								<Grid container flexDirection="row" p={1}>
									<Grid item xs={4} sm={2}>
										<Typography style={{ fontWeight: "600" }}>
											{"Description:"}
										</Typography>
									</Grid>
									<Grid item xs={8} sm={10}>
										<Typography>
											{pullReq?.description}
										</Typography>
									</Grid>
								</Grid>
								<Grid container flexDirection="row" p={1}>
									<Grid item xs={4} sm={2}>
										<Typography style={{ fontWeight: "600" }}>
											{"Source Branch:"}
										</Typography>
									</Grid>
									<Grid item xs={8} sm={10}>
										<Typography>
											{pullReq?.sourceRefName?.replace("refs/heads/", "") || ""}
										</Typography>
									</Grid>
								</Grid>
								<Grid container flexDirection="row" p={1}>
									<Grid item xs={4} sm={2}>
										<Typography style={{ fontWeight: "600" }}>
											{"Target Branch:"}
										</Typography>
									</Grid>
									<Grid item xs={8} sm={10}>
										<Typography>
											{pullReq?.targetRefName?.replace("refs/heads/", "") || ""}
										</Typography>
									</Grid>
								</Grid>
								<Grid container flexDirection="row" p={1}>
									<Grid item xs={4} sm={2}>
										<Typography style={{ fontWeight: "600" }}>
											{"Created At:"}
										</Typography>
									</Grid>
									<Grid item xs={8} sm={10}>
										<Typography>
											{dayjs(pullReq?.creationDate)?.format("dddd, MMMM D, YYYY h:mm A") || ""}
										</Typography>
									</Grid>
								</Grid>
								<Grid container flexDirection="row" p={1}>
									<Grid item xs={4} sm={2}>
										<Typography style={{ fontWeight: "600" }}>
											{"Closed At:"}
										</Typography>
									</Grid>
									<Grid item xs={8} sm={10}>
										<Typography>
											{dayjs(pullReq?.closedDate)?.format("dddd, MMMM D, YYYY h:mm A") || ""}
										</Typography>
									</Grid>
								</Grid>
								<Grid container flexDirection="row" p={1}>
									<Grid item xs={4} sm={2}>
										<Typography style={{ fontWeight: "600" }}>
											{"Time Passed:"}
										</Typography>
									</Grid>
									<Grid item xs={8} sm={10}>
										<Typography>
											{openTimeMap?.get(pullReq?.pullRequestId)?.stringified}
										</Typography>
									</Grid>
								</Grid>
								<Grid container flexDirection="row" p={1}>
									<Grid item xs={4} sm={2}>
										<Typography style={{ fontWeight: "600" }}>
											{"Created By:"}
										</Typography>
									</Grid>
									<Grid item xs={8} sm={10}>
										<Typography>
											{`${pullReq?.createdBy?.displayName || ""} - ${pullReq?.createdBy?.uniqueName || ""}`}
										</Typography>
									</Grid>
								</Grid>
								<Grid container flexDirection="row" p={1}>
									<Grid item xs={4} sm={2}>
										<Typography style={{ fontWeight: "600" }}>
											{"Reviewed By:"}
										</Typography>
									</Grid>
									<Grid container xs={8} sm={10}>
										{pullReq?.reviewers?.map((r, i) => (
											<Grid key={`r-${i}`} item xs={12} pb={1}>
												<Typography>
													{`${r?.displayName || ""} - ${r?.uniqueName || ""}`}
												</Typography>
											</Grid>
										))}
									</Grid>
								</Grid>
							</CardContent>
						</Card>
					</Modal>
				</>
			) : <span>{"No data available!"}</span>}
		</div>
	);
};

export default AzurePullRequests;
