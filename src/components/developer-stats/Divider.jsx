
import { Divider as MUIDivider } from "@mui/material";
import { styled } from "@mui/material/styles";

const Divider = styled(MUIDivider)(({ theme }) => ({
	backgroundColor: theme.palette.primary.main,
	marginBottom: theme.spacing(1),
}));

export default Divider;
