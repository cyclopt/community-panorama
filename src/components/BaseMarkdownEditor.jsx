import { useState } from "react";
import PropTypes from "prop-types";
import ReactMdeModule from "react-mde";

import { useSnackbar } from "../utils/index.js";
import { uploadFile } from "../api/index.js";

import MarkdownViewer from "./MarkdownViewer.jsx";

const ReactMde = ReactMdeModule.default ?? ReactMdeModule; // react-mde is deprecated and not ESM

const l18n = {
	write: "Write",
	preview: "Preview",
	uploadingImage: "Uploading file...",
	pasteDropSelect: "Attach files by dragging & dropping, selecting or pasting them.",
};

const BaseMarkdownEditor = (props) => {
	const { task, setTask, loadSuggestions } = props;
	const [selectedTab, setSelectedTab] = useState("write");
	const { error } = useSnackbar();

	async function* save(_, file) {
		try {
			const formData = new FormData();
			formData.append("file", file);

			const { fileUrl } = await uploadFile(task.projectName, formData);
			document.querySelector("[data-testid=text-area]").value += ` ${file.type.startsWith("image/") ? `![${file.name}](${fileUrl})` : `[📎${file.name}](${fileUrl})`}`;

			yield "";
			return true;
		} catch (error_) {
			if (error_.response) {
				const { message } = await error_.response.json();
				error(message);
			} else {
				error();
			}

			return false;
		}
	}

	return (
		<ReactMde
			key={`conditional_react_mde_save_${Boolean(task.projectName)}`}
			suggestionsAutoplace
			classes={{ textArea: ["markdown-body"], suggestionsDropdown: ["suggestions-dropdown"] }}
			value={task.body}
			childProps={{ textArea: { disabled: !task.projectName } }}
			readOnly={!task.projectName}
			selectedTab={selectedTab}
			generateMarkdownPreview={(markdown) => Promise.resolve(<MarkdownViewer content={markdown} />)}
			suggestionTriggerCharacters={["@", "#"]}
			loadSuggestions={loadSuggestions}
			toolbarCommands={[
				["header", "bold", "italic", "strikethrough"],
				["link", "quote", "code"],
				["unordered-list", "ordered-list", "checked-list"],
			]}
			l18n={l18n}
			paste={task.projectName ? { saveImage: save, accept: "", multiple: false } : undefined}
			onChange={(val) => setTask(val)}
			onTabChange={setSelectedTab}
		/>
	);
};

BaseMarkdownEditor.propTypes = {
	task: PropTypes.shape({
		body: PropTypes.string,
		projectName: PropTypes.string,
	}).isRequired,
	setTask: PropTypes.func.isRequired,
	loadSuggestions: PropTypes.func.isRequired,
};

export default BaseMarkdownEditor;
