(function () {
  "use strict";

  function closeMenu(button, menu) {
    button.setAttribute("aria-expanded", "false");
    button.classList.remove("is-open");
    menu.classList.remove("is-open");
  }

  document.querySelectorAll(".nav-toggle").forEach(function (button) {
    var menuId = button.getAttribute("aria-controls");
    var menu = menuId ? document.getElementById(menuId) : null;

    if (!menu) {
      return;
    }

    button.addEventListener("click", function () {
      var willOpen = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(willOpen));
      button.classList.toggle("is-open", willOpen);
      menu.classList.toggle("is-open", willOpen);
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu(button, menu);
      });
    });
  });
})();
