import { memo, useState, useMemo } from "react";
import {
	Box,
	Typography,
	MenuItem,
	Grid,
	styled,
	FormControl,
	Link as MaterialLink,
	CircularProgress,
} from "@mui/material";
import PropTypes from "prop-types";
import { numberSmallToLarge } from "@iamnapo/sort";
import pluralize from "pluralize";
import { Link } from "react-router-dom";

import SectionTitle from "../SectionTitle.jsx";
import DataTable from "../DataTable.jsx";
import Select from "../Select.jsx";

import { softSkills, formatLocalNumber, techMetrics } from "#utils";

const SortSelect = styled(FormControl)(({ theme }) => ({
	minWidth: theme.spacing(25),
}));

const columnFields = [
	"Name",
	"Code",
	"Security",
	"Debugging",
	"Refactoring",
	"Commits",
	"Total skills",
];

const TeamTop5 = ({
	developers,
	isLoadingCharacteristics,
	commitStats,
	isLoadingCommitStats,
}) => {
	const [shortComparator, setShortComparator] = useState("Total skills");
	const sortModel = useMemo(
		() => [{ field: shortComparator, sort: "desc" }],
		[shortComparator],
	);

	const charLabels = useMemo(() => {
		const labelsSet = new Set();
		for (const dev of developers) {
			for (const label of Object.keys(dev.characteristics || {})) {
				if (!softSkills.has(label)) labelsSet.add(label);
			}
		}

		return [...labelsSet];
	}, [developers]);

	const tableColumns = useMemo(
		() => [
			{
				field: "Name",
				width: 200,
				filterable: false,
				sortable: false,
				valueGetter: ({ row }) => row.fullName || row.username || "",
				renderCell: ({ row, value }) => (
					<Box display="flex" alignItems="center" mr="auto">
						<Box ml={1} textAlign="start">
							<MaterialLink
								variant="body1"
								underline="none"
								component={Link}
								to={row._id}
							>
								{value}
							</MaterialLink>
						</Box>
					</Box>
				),
			},
			...[...techMetrics].map((label) => ({
				field: label.charAt(0).toUpperCase() + label.slice(1),
				headerAlign: "center",
				align: "center",
				width: 150,
				sortable: false,
				valueGetter: ({ row }) => row.characteristics?.[label] ?? 0,
				renderCell: ({ value }) => (
					<Typography noWrap variant="body2">
						{formatLocalNumber(Math.ceil(value))}
					</Typography>
				),
			})),
			{
				field: "Commits",
				flex: 2,
				sortable: false,
				getApplyQuickFilterFn: undefined,
				valueGetter: ({ row }) => {
					const idKey = String(row._id || row.id || "");
					const commitsByUser = commitStats.commitsByUser || {};

					return commitsByUser[idKey]?.commits ?? 0;
				},
				renderCell: ({ value, row }) => {
					const idKey = String(row._id || row.id || "");
					const commitsByUser = commitStats.commitsByUser || {};

					return (
						<Grid
							container
							direction="column"
							justifyContent="center"
							alignItems="center"
							px="5%"
						>
							{isLoadingCommitStats ? (
								<Grid item>
									<CircularProgress />
								</Grid>
							) : (
								<>
									<Grid item>
										<Typography>
											{pluralize("commit", formatLocalNumber(value), true)}
										</Typography>
									</Grid>
									<Grid
										item
										container
										justifyContent="center"
										alignItems="center"
									>
										<Grid item xs>
											<Typography sx={{ color: "green.700" }}>
												{`${formatLocalNumber(commitsByUser[idKey]?.additions ?? 0)} ++`}
											</Typography>
										</Grid>
										<Grid item xs>
											<Typography sx={{ color: "red.500" }}>
												{`${formatLocalNumber(commitsByUser[idKey]?.deletions ?? 0)} --`}
											</Typography>
										</Grid>
									</Grid>
								</>
							)}
						</Grid>
					);
				},
			},
			{
				field: "Total skills",
				flex: 1,
				headerAlign: "center",
				align: "center",
				width: 100,
				sortable: false,
				valueGetter: ({ row }) => charLabels.reduce((sum, label) => sum + (Number(row.characteristics?.[label]) || 0), 0),
				sortComparator: numberSmallToLarge((v) => v || 0),
				renderCell: ({ value }) => (
					<Typography noWrap variant="body2">
						{formatLocalNumber(Math.ceil(value))}
					</Typography>
				),
			},
		],
		[charLabels, commitStats?.commitsByUser, isLoadingCommitStats],
	);

	return (
		<SectionTitle
			title="Technical Skills"
			customToolbar={(
				<Box display="flex">
					<SortSelect variant="outlined" size="small">
						<Select
							displayEmpty
							labelId="sort-label"
							id="sort-select"
							value={shortComparator}
							renderValue={(val) => val || <em>{"Select metric…"}</em>}
							onChange={(e) => setShortComparator(e.target.value)}
						>
							<MenuItem value="">
								<em>{"Select metric…"}</em>
							</MenuItem>
							{columnFields.map((name) => (
								<MenuItem key={name} value={name}>
									{name}
								</MenuItem>
							))}
						</Select>
					</SortSelect>
				</Box>
			)}
		>
			<Grid container spacing={2} textAlign="center" m={-1} xs={12}>
				<Grid item xs={12} width="100%">
					<DataTable
						disableSearch
						tableName="developers"
						rows={developers}
						columns={tableColumns}
						loading={isLoadingCharacteristics}
						noRowsLabel="No developers available"
						sortModel={sortModel}
						initialState={{ pagination: { paginationModel: { pageSize: 5, page: 0 } } }}
						addFilterButton={false}
					/>
				</Grid>
			</Grid>
		</SectionTitle>
	);
};

TeamTop5.propTypes = {
	developers: PropTypes.array.isRequired,
	isLoadingCharacteristics: PropTypes.bool,
	commitStats: PropTypes.object,
	isLoadingCommitStats: PropTypes.bool,
};

TeamTop5.defaultProps = {
	isLoadingCharacteristics: false,
	commitStats: {},
	isLoadingCommitStats: false,
};

export default memo(TeamTop5);
