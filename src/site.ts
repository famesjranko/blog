/**
 * Project-site base path, e.g. `/personal_blog` when served from
 * `https://<user>.github.io/<repo>/`. Empty for a user site or local preview.
 * Set via the `BASE_PATH` environment variable.
 */
function readEnv(name: string): string | undefined {
	return process.env[name];
}

export function basePath(): string {
	const raw = (readEnv("BASE_PATH") ?? "").trim().replace(/\/+$/, "");
	if (raw === "") {
		return "";
	}
	return raw.startsWith("/") ? raw : `/${raw}`;
}

/** Prefix an absolute site path with the base path. */
export function siteUrl(path: string): string {
	const p = path.startsWith("/") ? path : `/${path}`;
	return `${basePath()}${p}`;
}
