import level1 from "../../assets/images/developer-stats/B-1.png";
import level2 from "../../assets/images/developer-stats/B-2.png";
import level3 from "../../assets/images/developer-stats/B-3.png";
import level4 from "../../assets/images/developer-stats/B-4.png";
import level5 from "../../assets/images/developer-stats/B-5.png";

const characteristicsThresholds = [
	{ png: level1, threshHold: 10_000, endColor: "#806954", startingColor: "#4878A1" },
	{ png: level2, threshHold: 10_000, endColor: "#4878A1", startingColor: "#DE3E70" },
	{ png: level3, threshHold: 10_000, endColor: "#DE3E70", startingColor: "#6B7F8A" },
	{ png: level4, threshHold: 10_000, endColor: "#6B7F8A", startingColor: "#FCC200" },
	{ png: level5, threshHold: 10_000, endColor: "#FCC200", startingColor: "#FCC200" },
];

export default characteristicsThresholds;
