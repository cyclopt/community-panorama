import PropTypes from "prop-types";
import { useState, memo, useEffect } from "react";
import { Grid, Typography, LinearProgress } from "@mui/material";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import queryString from "query-string";

import { useSnackbar } from "../utils/index.js";
import { useProject, useOrganization } from "../api/index.js";

import Modal from "./Modal.jsx";
import Card from "./Card.jsx";
import QualityGateForm from "./QualityGateForm.jsx";

const QualityGateEditor = ({
	qualityGateInput = {},
	title = "Add a new Quality Gate",
	isPreviewMode = false,
	open = false,
	setOpen = () => {},
	setCurrentQualityGates = () => {},
	setCurrentSelectedQualityGate = () => {},
	mutateOrgQGs = () => {},
	mutateProjectQGs = () => {},
}) => {
	const { pathname, search } = useLocation();
	const { organizationid, projectid } = useParams();
	const { project = {}, isLoading: isLoadingProject, isError: isErrorProject } = useProject(projectid, false, false, true);
	const { organization = {},
		isLoading: isLoadingOrganization,
		isError: isErrorOrganization,
	} = useOrganization(organizationid, true);

	const navigate = useNavigate();

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isCloseModalDisabled, setIsCloseModalDisabled] = useState(false);
	const { error } = useSnackbar();

	useEffect(() => {
		if (isErrorProject || isErrorOrganization) error();
	}, [error, isErrorProject, isErrorOrganization]);

	useEffect(() => {
		if (organizationid) {
			setIsLoading(isLoadingOrganization);
		} else {
			setIsLoading(isLoadingProject);
		}
	}, [isLoadingOrganization, isLoadingProject, organizationid]);

	const closeModal = () => {
		setOpen(false);
		setCurrentSelectedQualityGate({});
		const parsed = queryString.parse(search);
		const { tab: tab_ } = parsed;
		navigate(queryString.stringifyUrl({ url: pathname, query: { tab: tab_ } }), { replace: true });
	};

	if (Object.keys(qualityGateInput).length > 0) {
		return (
			<Modal
				keepMounted
				disableAreYouSureDialog={isCloseModalDisabled}
				open={open}
				title="Quality Gate"
				onClose={() => {
					closeModal();
				}}
			>
				{
					isUpdating ? (
						<Grid container justifyContent="center" align="center" direction="column" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
							<Grid item>
								<Typography gutterBottom variant="h5" color="primary" mt="1rem">{"Updating your quality gate. Please don’t close this window!"}</Typography>
							</Grid>
							<Grid item><LinearProgress color="primary" /></Grid>
						</Grid>
					) : (
						<QualityGateForm
							qualityGateInput={qualityGateInput}
							project={project}
							organization={organization}
							isLoading={organizationid ? isLoadingOrganization : isLoadingProject}
							isPreviewMode={isPreviewMode}
							setOpen={setOpen}
							setIsUpdating={setIsUpdating}
							setCurrentQualityGates={setCurrentQualityGates}
							setIsCloseModalDisabled={setIsCloseModalDisabled}
							mutateQualityGates={organizationid ? mutateOrgQGs : mutateProjectQGs}
						/>
					)
				}
			</Modal>
		);
	}

	if (pathname.includes("add-quality-gate")) {
		return (
			<div className="container" style={Object.keys(qualityGateInput).length > 0 ? { width: "100%" } : {}}>
				<div className="container" style={{ ...(Object.keys(qualityGateInput).length > 0 ? { padding: "0rem 1.5rem", width: "100%" } : { padding: "3rem 1.5rem" }) }}>
					{!isLoading && (
						<Card title={title}>
							{isSubmitting ? (
								<Grid container justifyContent="center" align="center" direction="column" spacing={2} m={-1} sx={{ "> .MuiGrid-item": { p: 1 } }}>
									<Grid item>
										<Typography gutterBottom variant="h5" color="primary" mt="1rem">{"Creating your quality gate. Please don’t close this window!"}</Typography>
									</Grid>
									<Grid item><LinearProgress color="primary" /></Grid>
								</Grid>
							) : (
								<QualityGateForm
									qualityGateInput={qualityGateInput}
									project={project}
									organization={organization}
									isLoading={organizationid ? isLoadingOrganization : isLoadingProject}
									setCurrentQualityGates={setCurrentQualityGates}
									isSubmitting={isSubmitting}
									setIsSubmitting={setIsSubmitting}
									mutateQualityGates={organizationid ? mutateOrgQGs : mutateProjectQGs}
								/>
							)}
						</Card>
					)}
				</div>
			</div>
		);
	}

	return true;
};

QualityGateEditor.propTypes = {
	open: PropTypes.bool,
	setOpen: PropTypes.func,
	mutateProjectQGs: PropTypes.func,
	mutateOrgQGs: PropTypes.func,
	qualityGateInput: PropTypes.object,
	isPreviewMode: PropTypes.bool,
	title: PropTypes.string,
	setCurrentQualityGates: PropTypes.func,
	setCurrentSelectedQualityGate: PropTypes.func,
};

export default memo(QualityGateEditor);
