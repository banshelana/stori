import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Installed via --import so the hook is active before any test module
// is loaded.
register("./alias-loader.mjs", pathToFileURL(import.meta.filename));
