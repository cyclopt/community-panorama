import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

const BorderBox = styled(Box)(({ theme }) => theme.unstable_sx({
	p: 1,
	mb: 1,
	borderWidth: (t) => t.spacing(0.2),
	borderStyle: "solid",
	borderColor: "primary.main",
	borderRadius: 1,
}));

export default BorderBox;
