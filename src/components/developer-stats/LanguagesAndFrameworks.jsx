import { memo, useMemo } from "react";
import { Grid, Divider, styled, Box, Typography, useTheme } from "@mui/material";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";
import { QuestionMark } from "@mui/icons-material";

import Tooltip from "../Tooltip.jsx";
import SectionTitle from "../SectionTitle.jsx";

import NoDataFound from "./NoDataFound.jsx";
import LanguageFrameworkCard from "./LanguageFrameworkContent.jsx";

import { useDevLangAndFrame } from "#api";

const CustomDivider = styled(Divider)(({ theme }) => ({
	marginBottom: theme.spacing(1),
	height: "0.5px",
	backgroundColor: "gray",
}));

// ─── LANGUAGES & FRAMEWORKS COMPONENT ─────────────────────────────────────
const LanguagesAndFrameworks = ({ isInEditMode, keysToExclude, updateKeys, range }) => {
	const { developerId, organizationid } = useParams();
	const { data = {}, isLoading } = useDevLangAndFrame(organizationid, developerId, range);
	const theme = useTheme();

	const { languages = [], frameworks = [] } = data;

	const filteredLanguages = useMemo(
		() => (isInEditMode
			? languages
			: languages?.filter(([lang]) => !keysToExclude?.languages?.includes(lang))),
		[languages, keysToExclude?.languages, isInEditMode],
	);

	const filteredFrameworks = useMemo(
		() => (isInEditMode
			? frameworks
			: frameworks?.filter(([fw]) => !keysToExclude?.frameworks?.includes(fw))),
		[frameworks, keysToExclude?.frameworks, isInEditMode],
	);

	const hasData = filteredLanguages.length > 0 || filteredFrameworks.length > 0;
	return (
		<SectionTitle
			isLoading={isLoading}
			noDataMessage={hasData ? null : "languages and frameworks"}
			title="Languages & Frameworks"
			customToolbar={(
				<Tooltip
					placement="top"
					title={(
						<Box sx={{ textAlign: "left" }}>
							<Typography variant="body2" sx={{ mt: 0.5 }}>
								{"The developer’s activity and performance across repositories"}
							</Typography>

							<Box component="ul" sx={{ my: 0.5, m: 0 }}>
								<li style={{ marginTop: 4 }}>
									<i style={{ color: theme.palette.secondary.main }}>{"Score (0–5 ⭐)"}</i>
									{" - A rating that blends code quality, the amount of code shipped, and the variety of repositories the developer worked in."}
								</li>
								<li style={{ marginTop: 4 }}>
									<i style={{ color: theme.palette.secondary.main }}>{"Lines of code"}</i>
									{" - The number of lines of code the developer wrote across all repositories for this language/framework."}
								</li>
								<li style={{ marginTop: 4 }}>
									<i style={{ color: theme.palette.secondary.main }}>{"Average quality (A–F)"}</i>
									{" - The average quality rating for this language/framework. A is best; F is worst."}
								</li>
								<li style={{ marginTop: 4 }}>
									<i style={{ color: theme.palette.secondary.main }}>{"Repositories"}</i>
									{" - The number of repositories the developer used this language/framework in."}
								</li>
							</Box>
						</Box>
					)}
				>
					<QuestionMark
						position="end"
						sx={{
							borderRadius: "100%",
							backgroundColor: "primary.main",
							p: (t) => t.spacing(0.5),
							height: (t) => t.spacing(3),
							aspectRatio: "1 / 1",
							minWidth: 0,
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							color: "white",
							"&:hover": { cursor: "pointer", color: "white" },
						}}
					/>
				</Tooltip>
			)}
		>
			{filteredLanguages.length === 0 ? (
				<NoDataFound value="languages" />
			) : (
				<Grid container>
					{filteredLanguages.map(([language, metaData], idx) => (
						<LanguageFrameworkCard
							key={idx}
							languageOrFrameWork={language}
							score={metaData.score}
							linesOfCode={metaData.linesOfCode}
							averageQuality={metaData.averageQuality}
							numOfRepositories={metaData.numOfRepositories}
							isInEditMode={isInEditMode}
							checked={!keysToExclude?.languages?.includes(language)}
							onChange={(e) => updateKeys(e, "languages", language)}
						/>
					))}
				</Grid>
			)}

			<CustomDivider sx={{ my: 1 }} />

			{filteredFrameworks.length === 0 ? (
				<NoDataFound value="frameworks" />
			) : (
				<Grid container>
					{filteredFrameworks.map(([framework, metaData], idx) => (
						<LanguageFrameworkCard
							key={idx}
							languageOrFrameWork={framework}
							score={metaData.score}
							linesOfCode={metaData.linesOfCode}
							averageQuality={metaData.averageQuality}
							numOfRepositories={metaData.numOfRepositories}
							isInEditMode={isInEditMode}
							checked={!keysToExclude?.frameworks?.includes(framework)}
							onChange={(e) => updateKeys(e, "frameworks", framework)}
						/>
					))}
				</Grid>
			)}
		</SectionTitle>

	);
};

LanguagesAndFrameworks.propTypes = {
	isInEditMode: PropTypes.bool,
	keysToExclude: PropTypes.array,
	updateKeys: PropTypes.func,
	range: PropTypes.object,
};

export default memo(LanguagesAndFrameworks);
