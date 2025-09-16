import { execSync } from "node:child_process";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

const commitHash = execSync("git rev-parse --short HEAD").toString();

export default defineConfig({
	plugins: [react()],
	define: {
		__COMMIT_HASH__: JSON.stringify(commitHash),
	},
	build: {
		rollupOptions: {
			output: {
				entryFileNames: "assets/[name].js",
				chunkFileNames: "assets/[name].js",
				assetFileNames: "assets/[name].[ext]",
			},
		},
	},
});
