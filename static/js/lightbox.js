// Open article images and diagrams at full size in a modal dialog. The markup
// does not depend on this script: without it, images render as before.
const ZOOMABLE = ".prose img, .prose svg.diagram";

// Build-time id prefix from src/svgInline.ts. A copied diagram re-prefixes
// its ids and every reference to them, so the document keeps unique ids.
const DIAGRAM_ID_PREFIX = /\bsvg-[0-9a-f]{8}-/g;

const dialog = document.createElement("dialog");
dialog.className = "lightbox";
dialog.setAttribute("aria-label", "Full-size image");
const closeButton = document.createElement("button");
closeButton.type = "button";
closeButton.className = "lightbox-close";
closeButton.setAttribute("aria-label", "Close");
closeButton.textContent = "×";
// `prose` scopes the diagram palette in diagrams.css to the copy as well.
const stage = document.createElement("div");
stage.className = "lightbox-stage prose";
dialog.append(closeButton, stage);
document.body.append(dialog);

/** @param {Element} element */
function markZoomable(element) {
	element.classList.add("zoomable");
	element.setAttribute("tabindex", "0");
	element.setAttribute("role", "button");
	element.setAttribute("aria-haspopup", "dialog");
}

/** @param {SVGElement} diagram */
function diagramCopy(diagram) {
	const copy = /** @type {SVGElement} */ (diagram.cloneNode(true));
	for (const element of [copy, ...copy.querySelectorAll("*")]) {
		for (const attribute of element.attributes) {
			attribute.value = attribute.value.replace(
				DIAGRAM_ID_PREFIX,
				"lightbox-$&",
			);
		}
	}
	copy.classList.remove("zoomable");
	copy.removeAttribute("tabindex");
	copy.removeAttribute("aria-haspopup");
	copy.setAttribute("role", "img");
	return copy;
}

/** @param {Element} target */
function enlarged(target) {
	if (target instanceof SVGElement) {
		return diagramCopy(target);
	}
	// The source file, not the column-width rendition the picture chose.
	const image = new Image();
	image.src = target.getAttribute("src") ?? "";
	image.alt = target.getAttribute("alt") ?? "";
	return image;
}

/** @param {Element} target */
function open(target) {
	stage.replaceChildren(enlarged(target));
	stage.classList.toggle("is-diagram", target instanceof SVGElement);
	dialog.showModal();
}

/** @param {EventTarget | null} target */
function zoomableFrom(target) {
	return target instanceof Element ? target.closest(".zoomable") : null;
}

for (const element of document.querySelectorAll(ZOOMABLE)) {
	if (element.closest("a") === null) {
		markZoomable(element);
	}
}

document.addEventListener("click", (event) => {
	const target = zoomableFrom(event.target);
	if (target !== null) {
		open(target);
	}
});

document.addEventListener("keydown", (event) => {
	const target = zoomableFrom(event.target);
	if (target !== null && (event.key === "Enter" || event.key === " ")) {
		event.preventDefault();
		open(target);
	}
});

// Any click inside the open dialog closes it, the image included. The
// dialog restores focus to the element that opened it.
dialog.addEventListener("click", () => {
	dialog.close();
});
