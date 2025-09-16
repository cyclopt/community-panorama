import { useEffect } from "react";

const useDocumentTitle = (title, { resetOnUnmount = true } = {}) => {
	useEffect(() => {
		const previousTitle = document.title;
		document.title = title || previousTitle;

		return () => {
			if (resetOnUnmount) {
				document.title = previousTitle;
			}
		};
	}, [resetOnUnmount, title]);
};

export default useDocumentTitle;
