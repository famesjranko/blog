import { describe, expect, it } from "vitest";
import { hero } from "./hero.js";

const base = { titleLines: ["First", "Second"], standfirst: "Standfirst." };

describe("hero", () => {
	it("renders the wash fallback before the thought-field canvas", () => {
		const html = hero(base);
		expect(html).toContain('class="hero-visual" aria-hidden="true"');
		expect(html.indexOf("hero-visual")).toBeLessThan(
			html.indexOf('data-thought-field aria-hidden="true"'),
		);
	});

	it("renders actions as links in order with no literal separator", () => {
		const html = hero({
			...base,
			actions: [
				{ label: "Home", href: "/" },
				{ label: "Essays", href: "/essays/" },
			],
		});
		expect(html).toContain(
			'<p class="hero-cta"><a href="/">Home</a><a href="/essays/">Essays</a></p>',
		);
	});

	it("omits the action row when there are no actions", () => {
		expect(hero(base)).not.toContain("hero-cta");
		expect(hero({ ...base, actions: [] })).not.toContain("hero-cta");
	});

	it("omits the eyebrow when absent and renders it before the headline", () => {
		expect(hero(base)).not.toContain("hero-eyebrow");
		const html = hero({ ...base, eyebrow: "404" });
		expect(html).toContain('<p class="hero-eyebrow">404</p>');
		expect(html.indexOf("hero-eyebrow")).toBeLessThan(html.indexOf("<h1>"));
	});
});

describe("hero fill", () => {
	it("adds the fill class only when asked to stretch to the footer", () => {
		expect(hero(base)).toContain('<section class="hero" data-hero>');
		expect(hero({ ...base, fill: true })).toContain(
			'<section class="hero hero-fill" data-hero>',
		);
	});
});

describe("hero escaping", () => {
	it("escapes each title line before the break join", () => {
		const html = hero({ ...base, titleLines: ["a < b", "c & d"] });
		expect(html).toContain("<h1>a &lt; b<br>c &amp; d</h1>");
	});

	it("escapes eyebrow, standfirst, action labels and hrefs", () => {
		const html = hero({
			eyebrow: "<e>",
			titleLines: ["t"],
			standfirst: "s & s",
			actions: [{ label: "<l>", href: '/x?"a=1' }],
		});
		expect(html).toContain("&lt;e&gt;");
		expect(html).toContain("s &amp; s");
		expect(html).toContain("&lt;l&gt;");
		expect(html).toContain('href="/x?&quot;a=1"');
		expect(html).not.toContain("<e>");
		expect(html).not.toContain('"/x?"');
	});
});
