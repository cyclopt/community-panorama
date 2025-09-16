import { memo } from "react";
import PropTypes from "prop-types";
import { Button, Chip, Typography, Switch, Radio, Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useImmer } from "use-immer";

import { POSSIBLE_COLUMNS } from "../utils/index.js";

import Modal from "./Modal.jsx";

const SelectKanban = (props) => {
	const { open, onClose, kanban, setKanban } = props;
	const [value, setValue] = useImmer(kanban);

	const ColumnChip = styled(({ label, ...prps }) => (
		<Chip
			variant="outlined"
			color="primary"
			label={<Typography variant="h6">{label}</Typography>}
			{...prps}
		/>
	))(({ theme }) => ({ width: "100%", margin: theme.spacing(0.5) }));

	return (
		<Modal
			keepMounted
			disableAreYouSureDialog
			open={open}
			title="Select kanban model!"
			actions={(
				<>
					<Button
						variant="contained"
						color="secondary"
						size="medium"
						sx={{ color: "common.white" }}
						onClick={() => {
							setKanban(value);
							onClose();
						}}
					>
						{"Apply"}
					</Button>
					<Button variant="outlined" size="medium" type="reset" onClick={onClose}>{"Cancel"}</Button>
				</>
			)}
			onClose={onClose}
		>
			<nav className="columns is-mobile">
				<div className="column" style={{ alignSelf: "flex-end" }}>
					{POSSIBLE_COLUMNS.get("none").map((e, i) => <ColumnChip key={`none_${i}`} label={e} />)}
				</div>
				<div className="column" style={{ alignSelf: "flex-end" }}>
					{POSSIBLE_COLUMNS.get("minimal").map((e, i) => <ColumnChip key={`minimal_${i}`} label={e} />)}
				</div>
				<div className="column" style={{ alignSelf: "flex-end" }}>
					{POSSIBLE_COLUMNS.get("default").map((e, i) => <ColumnChip key={`default_${i}`} label={e} />)}
				</div>
			</nav>
			<nav className="columns is-mobile">
				<div className="column" style={{ alignSelf: "flex-end", paddingBottom: 0, textAlign: "center" }}>
					<Typography variant="h6">{"Without Kanban"}</Typography>
					<Radio name="kanban" checked={value.style === "none"} onChange={() => setValue((p) => { p.style = "none"; })} />
				</div>
				<div className="column" style={{ alignSelf: "flex-end", paddingBottom: 0, textAlign: "center" }}>
					<Typography variant="h6">{"Cyclopt Minimal Kanban"}</Typography>
					<Radio name="kanban" checked={value.style === "minimal"} onChange={() => setValue((p) => { p.style = "minimal"; })} />
				</div>
				<div className="column" style={{ alignSelf: "flex-end", paddingBottom: 0, textAlign: "center" }}>
					<Typography variant="h6">{"Cyclopt Default Kanban"}</Typography>
					<Radio name="kanban" checked={value.style === "default"} onChange={() => setValue((p) => { p.style = "default"; })} />
				</div>
			</nav>
			<nav className="columns is-mobile">
				<div className="column" style={{ alignSelf: "flex-start" }}>
					<Typography align="justify">
						{"Not recommended! Use this model only if you want to keep things very simple. Open tasks and close them when they are completed."}
					</Typography>
				</div>
				<div className="column" style={{ alignSelf: "flex-start" }}>
					<Typography align="justify">
						{`Recommended for individual developers! Add new features in the To Do column, implement them during the next sprint
							(In Progress), and move tasks to Done when completed.`}
					</Typography>
				</div>
				<div className="column" style={{ alignSelf: "flex-start" }}>
					<Typography align="justify" id="default">
						{`Recommended for software teams! Design new features in the Backlog and add them to the next sprint
							(Sprint Planning). Check the current ongoing tasks (In Progress) and those that are implemented (Delivered),
							and move completed tasks to accepted.`}
					</Typography>
				</div>
			</nav>
			<div className="is-divider" />
			<div className="field is-horizontal columns" style={{ alignItems: "center" }}>
				<div className="label is-normal column is-2" style={{ textAlign: "center" }}>{"Create column for \"Archived\" cards"}</div>
				<div className="field-body column is-1">
					<div className="field">
						<div className="control">
							<Switch
								checked={value.hasArchived}
								id="checkbox_switch"
								onChange={() => setValue((p) => { p.hasArchived = !p.hasArchived; })}
							/>
						</div>
					</div>
				</div>
				<Box component="p" className="is-9 column" sx={{ textAlign: "left", color: "primary.main" }}>
					{`We can create an "Archived" column for you, so that you can move there all your old cards, after the features of your
						project are implemented.`}
				</Box>
			</div>
		</Modal>
	);
};

SelectKanban.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	kanban: PropTypes.shape({
		style: PropTypes.string.isRequired,
		hasArchived: PropTypes.bool.isRequired,
	}).isRequired,
	setKanban: PropTypes.func.isRequired,
};

export default memo(SelectKanban);
