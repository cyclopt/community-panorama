const overridePlotlyButtons = (plotClass, projectId, setPerPeriod) => {
	const buttons = document.querySelectorAll(`div.${plotClass} g.button`);
	if (buttons.length > 1) {
		const newButton0 = buttons[0].cloneNode(true);
		const newButton1 = buttons[1].cloneNode(true);
		newButton0.addEventListener("click", (e) => {
			if (projectId) {
				setPerPeriod(e.target?.textContent || "week");
				newButton0.children[0].classList.add("selected");
				newButton1.children[0].classList.remove("selected");
			}
		});
		newButton1.addEventListener("click", (e) => {
			if (projectId) {
				setPerPeriod(e.target?.textContent || "month");
				newButton0.children[0].classList.remove("selected");
				newButton1.children[0].classList.add("selected");
			}
		});

		buttons[0].parentNode.replaceChild(newButton0, buttons[0]);
		buttons[1].parentNode.replaceChild(newButton1, buttons[1]);

		if (![...buttons].some((e) => e.children[0].classList.contains("selected"))) {
			newButton0.children[0].classList.add("selected");
		}
	}
};

export default overridePlotlyButtons;
