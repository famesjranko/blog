// Close the native popover before a menu link navigates so a history snapshot
// cannot retain the menu's open state.
const mobileNav = document.querySelector("#mobile-nav");

if (mobileNav instanceof HTMLElement) {
	for (const link of mobileNav.querySelectorAll("a")) {
		link.addEventListener("click", () => {
			mobileNav.hidePopover();
		});
	}
}
