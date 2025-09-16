import { useState, useEffect, useRef, useCallback } from "react";

import { jwt, useSnackbar } from "#utils";

const throttleRate = 75; // Throttle rate in milliseconds
const delay = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

const useChatGptStream = ({ url = null, query = {} }, setIsUserScrolling) => {
	const [response, setResponse] = useState({ recommendation: "" });
	const { error, success } = useSnackbar();
	const queue = useRef([]);
	const isProcessing = useRef(false);
	const streamEnded = useRef(false);
	const eventSourceRef = useRef(null);

	const processQueue = useCallback(async () => {
		while (queue.current.length > 0) {
			const data = queue.current.shift();
			if (data) {
				setResponse((prev) => ({
					...prev,
					...data,
					recommendation: data.recommendation ? prev.recommendation + data.recommendation : prev.recommendation,
				}));
			}

			await delay(throttleRate);
		}

		if (streamEnded.current) {
			success();
		}

		isProcessing.current = false;
	}, [success]);

	useEffect(() => {
		const cleanup = () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
				eventSourceRef.current = null;
			}

			setIsUserScrolling(false);
			queue.current = []; // Clear the queue
			isProcessing.current = false; // Reset processing state
			streamEnded.current = false; // Reset streamEnded state
		};

		if (!url) {
			setResponse(null);
			cleanup();
			return () => {};
		}

		setResponse((prev) => ({ ...prev, recommendation: "", ...query }));

		const params = new URLSearchParams({
			token: jwt.getToken(),
			...query,
		});

		if (Object.prototype.hasOwnProperty.call(query, "lines")) {
			params.set("lines", JSON.stringify(query.lines));
		}

		const eventSourceUrl = `${import.meta.env.VITE_MAIN_SERVER_URL}/${url}?${params.toString()}`;
		const es = new EventSource(eventSourceUrl);
		eventSourceRef.current = es; // Track the EventSource

		const onMessage = (event) => {
			const data = JSON.parse(event.data);
			queue.current.push(data);
			if (!isProcessing.current) {
				isProcessing.current = true;
				processQueue();
			}
		};

		const onError = (event) => {
			error();
			if (event.currentTarget.readyState === EventSource.CLOSED) {
				// "EventSource connection was closed."
			} else if (event.currentTarget.readyState === EventSource.CONNECTING) {
				// "EventSource connection is reconnecting due to an error."
			} else {
				// "EventSource encountered an error:", event
			}

			es.close();
		};

		const onStreamEnd = () => {
			streamEnded.current = true;
			if (!isProcessing.current) {
				success();
			}

			es.close();
		};

		es.addEventListener("message", onMessage);
		es.addEventListener("error", onError);
		es.addEventListener("stream-end", onStreamEnd);
		es.addEventListener("max_tokens", () => {
			error("Your text was too big");
			es.close();
		});

		// Clean up the EventSource on component unmount
		return () => {
			cleanup();
			es.close();
			es.removeEventListener("message", onMessage);
			es.removeEventListener("error", onError);
			es.removeEventListener("stream-end", onStreamEnd);
			eventSourceRef.current = null; // Reset the EventSource ref
		};
	}, [error, query, success, url, processQueue, setIsUserScrolling]);

	return { response, isLoading: isProcessing.current };
};

export default useChatGptStream;
