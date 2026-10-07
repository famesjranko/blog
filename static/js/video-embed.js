// Swap a video poster for the provider's player when the reader clicks it.
// The poster is an ordinary link to the provider's page, so it still works
// without this script, and nothing from the provider loads until the reader
// asks for the video.

/** @param {MouseEvent} event */
function opensElsewhere(event) {
	return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

for (const poster of document.querySelectorAll(".video-poster[data-embed]")) {
	poster.addEventListener("click", (event) => {
		const src = poster.getAttribute("data-embed");
		if (
			src === null ||
			!(event instanceof MouseEvent) ||
			opensElsewhere(event)
		) {
			return;
		}
		event.preventDefault();
		const player = document.createElement("iframe");
		player.src = src;
		player.title = poster.querySelector("img")?.alt ?? "Video";
		player.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
		player.allowFullscreen = true;
		poster.replaceWith(player);
		player.focus();
	});
}
