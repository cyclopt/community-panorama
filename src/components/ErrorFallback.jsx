import { Button, Grid, Typography } from "@mui/material";
import { ArrowBack, Refresh } from "@mui/icons-material";
import { Image } from "mui-image";
import { useNavigate } from "react-router-dom";

import cycloptLogo from "../assets/images/cyclopt.png";

const ErrorFallback = () => {
	const navigate = useNavigate();
	return (
		<Grid
			container
			direction="column"
			alignItems="center"
			sx={{
				position: "absolute",
				top: "50%",
				left: "50%",
				transform: "translate(-50%, -50%)",
			}}
		>
			<Grid item xs={12}>
				<Image src={cycloptLogo} alt="Cyclopt" width="100px" />
			</Grid>
			<Grid item xs={12} mt={2}>
				<Grid container direction="column" spacing={6}>
					<Grid item xs={12}>
						<Typography align="center" variant="h6">
							{"Oops. Something we didn’t expect happened. 🤷"}
						</Typography>
					</Grid>
					<Grid item xs={12}>
						<Grid container spacing={2} justifyContent="center">
							<Grid item>
								<Button size="small" startIcon={<ArrowBack />} variant="outlined" onClick={() => { navigate(-1); }}>
									{"Go Back"}
								</Button>
							</Grid>
							<Grid item>
								<Button size="small" startIcon={<Refresh />} variant="contained" onClick={() => navigate(0)}>
									{"Try Again"}
								</Button>
							</Grid>
						</Grid>
					</Grid>
				</Grid>
			</Grid>
		</Grid>
	);
};

export default ErrorFallback;
