/**
 * JPEG-only WebP sidecar mapping. Pure string transformation, no
 * filesystem access: every internal JPEG under a root-relative path
 * has a same-name `.webp` sidecar by repository invariant (see
 * `npm run images`). PNG, SVG, external, protocol-relative, and
 * relative sources are out of scope and map to `undefined`.
 */
export function isInternalJpeg(src: string): boolean {
	if (src.startsWith("//")) {
		return false;
	}
	if (!src.startsWith("/")) {
		return false;
	}
	const lower = src.toLowerCase();
	return lower.endsWith(".jpg") || lower.endsWith(".jpeg");
}

/**
 * Map an internal JPEG source to its required WebP sidecar.
 * Returns `undefined` for anything out of scope (PNG, SVG, WebP,
 * external, protocol-relative, relative). Never touches the disk.
 */
export function webpSrc(src: string): string | undefined {
	if (!isInternalJpeg(src)) {
		return undefined;
	}
	return src.replace(/\.(jpe?g)$/i, ".webp");
}
