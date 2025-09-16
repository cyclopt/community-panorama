import { useEffect, useState } from "react";

function useKeysForSuggestions() {
	const [keyPressed, setKeyPressed] = useState("");
	const downHandler = ({ key }) => ((key === "@" || key === "#") ? (setKeyPressed(key)) : null);

	useEffect(() => {
		// on component mount
		window.addEventListener("keydown", downHandler);

		// on component unmount
		return () => window.removeEventListener("keydown", downHandler);
	}, []);
	return keyPressed;
}

export default useKeysForSuggestions;
