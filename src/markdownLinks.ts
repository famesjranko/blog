export function isExternalLink(href: string): boolean {
	return (
		href.startsWith("http://") ||
		href.startsWith("https://") ||
		href.startsWith("//")
	);
}

function insertAnchorAttribute(anchor: string, attribute: string): string {
	return `${anchor.slice(0, -1)} ${attribute}>`;
}

function secureRel(anchor: string): string {
	const match = anchor.match(/\brel=(["'])([^"']*)\1/i);
	if (match === null) {
		return insertAnchorAttribute(anchor, 'rel="noopener noreferrer"');
	}
	const existing = match[2];
	if (existing === undefined) {
		return anchor;
	}
	const values = existing.split(/\s+/).filter(Boolean);
	const rel = [...new Set([...values, "noopener", "noreferrer"])].join(" ");
	return anchor.replace(match[0], `rel="${rel}"`);
}

export function openExternalHtmlLinks(html: string): string {
	return html.replace(/<a\b[^>]*>/gi, (anchor) => {
		const href = anchor.match(/\bhref=(["'])(.*?)\1/i)?.[2];
		if (href === undefined || !isExternalLink(href)) {
			return anchor;
		}
		const target = /\btarget=(["'])[^"']*\1/i;
		const withTarget = target.test(anchor)
			? anchor.replace(target, 'target="_blank"')
			: insertAnchorAttribute(anchor, 'target="_blank"');
		return secureRel(withTarget);
	});
}
