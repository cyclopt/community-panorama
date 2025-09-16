import Cookie from "js-cookie";

const cookie = Cookie
	.withAttributes({
		sameSite: "lax",
		secure: import.meta.env.PROD ?? true,
		path: "/",
	})
	.withConverter({
		read(value, name) {
			return Cookie.converter.read(value, name);
		},
		write(value, name) {
			return Cookie.converter.write(value, name);
		},
	});

export default cookie;
