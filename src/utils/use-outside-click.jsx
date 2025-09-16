import { useCallback, useEffect } from "react";

function useOutsideClick(handleClose, ref) {
	const handleClick = useCallback((event) => {
		if (ref?.current?.contains && !ref.current.contains(event.target)) {
			handleClose();
		}
	}, [handleClose, ref]);

	useEffect(() => {
		document.addEventListener("mouseup", handleClick);

		return () => { document.removeEventListener("mouseup", handleClick); };
	}, [handleClick]);
}

export default useOutsideClick;
