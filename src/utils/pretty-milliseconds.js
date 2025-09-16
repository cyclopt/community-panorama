import prettyMilliseconds from "pretty-ms";

const prettyMilliseconds_ = (s, options) => prettyMilliseconds(s, { secondsDecimalDigits: 0, ...options });

export default prettyMilliseconds_;
