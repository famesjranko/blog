/**
 * Project-site base path, e.g. `/personal_blog` when served from
 * `https://<user>.github.io/<repo>/`. Empty for a user site or local preview.
 * Set via the `BASE_PATH` environment variable.
 */
function readEnv(name: string): string | undefined {
	return process.env[name];
}

const DEFAULT_SITE_ORIGIN = "https://famesjranko.github.io";

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

/** Produce a canonical URL for feeds and other machine-readable output. */
export function absoluteSiteUrl(path: string): string {
	const raw = (readEnv("SITE_ORIGIN") ?? DEFAULT_SITE_ORIGIN)
		.trim()
		.replace(/\/+$/, "");
	let origin: URL;
	try {
		origin = new URL(raw);
	} catch {
		throw new Error("SITE_ORIGIN must be an absolute HTTP(S) origin");
	}
	if (
		(origin.protocol !== "https:" && origin.protocol !== "http:") ||
		origin.origin !== raw
	) {
		throw new Error("SITE_ORIGIN must contain only an HTTP(S) origin");
	}
	return `${origin.origin}${siteUrl(path)}`;
}
