
import CommitIcon from "@mui/icons-material/Commit";
import FolderIcon from "@mui/icons-material/Folder";
import UpgradeIcon from "@mui/icons-material/Upgrade";

const getTrendEventProps = (type, item) => {
	const result = { IconComponent: null, primaryText: null };
	if (type === "commits") {
		result.IconComponent = CommitIcon;
		result.primaryText = `${item.name} — ${item.commits} commit${item.commits > 1 ? "s" : ""}`;
		return result;
	}

	if (type === "repo") {
		result.IconComponent = FolderIcon;
		result.primaryText = item.name;
		return result;
	}

	if (type === "characteristics") {
		result.IconComponent = UpgradeIcon;
		result.primaryText = `${item.name} — ${item.count} level${item.count > 1 ? "s" : ""}`;
		return result;
	}

	return result;
};

export default getTrendEventProps;
