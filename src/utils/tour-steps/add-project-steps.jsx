import { Button } from "@mui/material";

import { updateTourEnd } from "../../api/index.js";
import theme from "../../theme.js";

import { capitalize } from "#utils";

const tutorialLabel = "addProject";

const addProjectSteps = (
	username,
	type,
	navigate,
) => ([
	{
		step: 0,
		tourLabel: tutorialLabel,
		disableNext: false,
		disablePrev: true,
		content:
	<div>
		<p style={{ marginBottom: "10px" }}>
			{"Hola,"}
			<span style={{ color: theme.palette.secondary.main }}>
				{" "}
				{username}
				{" "}
			</span>
			{" 🙂! Welcome to Cyclopt Panorama!"}
		</p>
		<p>
			{"Ready to "}
			<span style={{ color: theme.palette.secondary.main }}>
				{"dive "}
			</span>
			{"in? Let me show you how to "}
			<span style={{ color: theme.palette.secondary.main }}>
				{"create "}
			</span>
			{"your first "}
			<span style={{ color: theme.palette.primary.main }}>
				{"project "}
			</span>
			{"!"}
		</p>
	</div>,
		position: "center",
		padding: {
			mask: 0,
		},
	},
	{
		step: 1,
		disablePrev: false,
		disableNext: true,
		selector: "#addButton",
		highlightedSelectors: ["#addButton"],
		resizeObservables: ["#addButton"],
		content: (
			<p>
				{"Press the "}
				<span style={{ color: theme.palette.pink.main }}>
					{"\"Create Project\" "}
				</span>
				{"button to "}
				<span style={{ color: theme.palette.secondary.main }}>
					{"create "}
				</span>
				{"your "}
				<span style={{ color: theme.palette.primary.main }}>
					{"project "}
				</span>
			</p>
		),
		position: "bottom",
	},
	{
		step: 2,
		disablePrev: true,
		disableNext: false,
		content: (
			<div>
				<p style={{ marginBottom: "5px" }}>
					{"This is where your project "}
					<span style={{ color: theme.palette.secondary.main }}>
						{"is created"}
					</span>
					{"."}
				</p>
				<p style={{ marginBottom: "10px" }}>
					{"Fill in basic  "}
					<span style={{ color: theme.palette.primary.main }}>
						{"information "}
					</span>
					{"and add your "}
					<span style={{ color: theme.palette.primary.main }}>
						{"repositories "}
					</span>
					{"to get started! ✌️"}
				</p>
			</div>
		),
		position: "center",
		padding: {
			mask: 0,
		},
	},
	{
		step: 3,
		disablePrev: false,
		disableNext: false,
		selector: "#organization",
		highlightedSelectors: ["#organization"],
		resizeObservables: ["#organization"],
		content: (

			<div>
				<p style={{ marginBottom: "10px" }}>
					{"Here, you can "}
					<span style={{ color: theme.palette.secondary.main }}>
						{"select"}
					</span>
					{" the organization to which your new "}
					<span style={{ color: theme.palette.primary.main }}>
						{"project "}
					</span>
					{"will be attached."}
				</p>
			</div>
		),
		padding: {
			mask: 5,
		},

	},
	{
		step: 4,
		disableNext: false,
		disablePrev: false,
		selector: "#add_name",
		content: (
			<p style={{ marginBottom: "10px" }}>
				{"Please "}
				<span style={{ color: theme.palette.secondary.main }}>
					{"provide "}
				</span>
				{"a name for your "}
				<span style={{ color: theme.palette.primary.main }}>
					{"project"}
				</span>
				{"."}
			</p>
		),
		padding: {
			mask: 2,
		},
	},
	{
		step: 5,
		disableNext: false,
		disablePrev: false,
		selector: "#add_description",
		content: (
			<p style={{ marginBottom: "10px" }}>
				{"In this section, you can compose a "}
				<span style={{ color: theme.palette.primary.main }}>
					{"description "}
				</span>
				{"for your project."}
			</p>
		),
		padding: {
			mask: 5,
		},
	},
	{
		step: 6,
		disableNext: false,
		disablePrev: false,
		selector: "#addRepositoryGeneral",
		position: "top",
		content: (
			<div>
				<p style={{ marginBottom: "10px" }}>
					{"Welcome to the "}
					<span style={{ color: theme.palette.primary.main }}>
						{"repository "}
					</span>
					{"section !"}
				</p>
				<p style={{ marginBottom: "10px" }}>
					{"Let's guide you through the two possible ways of "}
					<span style={{ color: theme.palette.secondary.main }}>
						{"adding "}
					</span>
					{"a repository in your project."}
				</p>
			</div>
		),
	},
	{
		step: 7,
		disableNext: false,
		disablePrev: false,
		selector: "#addRepositoryFromPlatform",
		position: "bottom",
		content: (
			<div>
				<p style={{ marginBottom: "10px" }}>
					{"Select a "}
					<span style={{ color: theme.palette.primary.main }}>
						{"repository "}
					</span>
					{"from "}
					<span style={{ color: theme.palette.primary.main }}>
						{capitalize(type)}
					</span>
					{"."}
				</p>
				<ul style={{ paddingLeft: "20px", marginTop: "0" }}>
					<li>
						{"Choose the "}
						<span style={{ color: theme.palette.primary.main }}>
							{capitalize(type)}
						</span>
						{" organization  you want to work with."}
					</li>
					<li>
						{"From the list, select the "}
						<span style={{ color: theme.palette.primary.main }}>
							{"repository"}
						</span>
						{" you’d like to add."}
					</li>
					<li>
						{"Click the "}
						<span style={{ color: theme.palette.pink.main }}>
							{"\"ADD\" "}
						</span>
						{" button to procceed."}
					</li>
				</ul>
			</div>
		),
		padding: {
			mask: [-5, 5, 5, 5],
			popover: 15,
		},
	},
	{
		step: 8,
		disableNext: false,
		disablePrev: false,
		selector: "#addRepositoryFromUrl",
		position: "left",
		content: (
			<div>
				<p style={{ marginBottom: "10px" }}>
					{"Copy a "}
					<span style={{ color: theme.palette.primary.main }}>
						{"repository link "}
					</span>
					{"from "}
					<span style={{ color: theme.palette.primary.main }}>
						{capitalize(type)}
					</span>
					{"."}
				</p>
				<p style={{ marginBottom: "10px" }}>
					{"Click the "}
					<span style={{ color: theme.palette.pink.main }}>
						{"\"ADD\" "}
					</span>
					{" button to procceed."}
				</p>
			</div>
		),
	},
	{
		step: 9,
		disablePrev: false,
		disableNext: false,
		selector: "#doneButton",
		resizeObservables: ["#doneButton"],
		highlightedSelectors: ["doneButton"],
		content: (
			<p>
				{"Please press "}
				<span style={{ color: theme.palette.primary.main }}>
					{"\"Done\" "}
				</span>
				{"to "}
				<span style={{ color: theme.palette.secondary.main }}>
					{"finish"}
				</span>
				{" your project configuration."}
			</p>
		),
		position: "center",
		padding: {
			mask: 4,
		},
	},
	{
		step: 10,
		disablePrev: false,
		disableNext: false,
		content: ({ setIsOpen }) => (
			<>
				<div>
					<p style={{ marginBottom: "5px" }}>
						{"You're now ready to go! 😎"}
					</p>
					<p style={{ marginBottom: "10px" }}>
						{"Hit the button "}
						<span style={{ color: theme.palette.primary.main }}>
							{"\"Navigate to Projects Overview\" "}
						</span>
						{" and explore "}
						<span style={{ color: theme.palette.primary.main }}>
							{"Cyclopt Panorama"}
						</span>
						{"."}
					</p>
				</div>
				<div className="centered-button">
					<Button onClick={async () => {
						navigate("/overview", { replace: true });
						setIsOpen(false);
						await updateTourEnd({ step: 10, tour: tutorialLabel });
					}}
					>
						{"Navigate to Projects Overview"}

					</Button>
				</div>

			</>
		),
		position: "center",
		padding: {
			mask: 0,
		},
	},
]);

export default addProjectSteps;
