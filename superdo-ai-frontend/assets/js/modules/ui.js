(function () {
    window.SuperDoModules = window.SuperDoModules || {};

    window.SuperDoModules.ui = {
        init(ctx) {
            $(".nav-btn").on("click", function () { ctx.section($(this).data("section")); });

            const $content = $(".content");
            if ($content.length) {
                let raf = null;
                let targetX = 50;
                let targetY = 50;
                let lastSparkTs = 0;
                const sparkIntervalMs = 35;

                const spawnFx = (className, clientX, clientY) => {
                    const host = $content.get(0);
                    if (!host) return;

                    const rect = host.getBoundingClientRect();
                    const el = document.createElement("span");
                    el.className = className;
                    el.style.left = `${clientX - rect.left}px`;
                    el.style.top = `${clientY - rect.top}px`;
                    host.appendChild(el);

                    const ttl = className === "cursor-ripple" ? 700 : 470;
                    window.setTimeout(() => el.remove(), ttl);
                };

                const paintCursorGlow = () => {
                    $content.css("--cursor-x", `${targetX}%`);
                    $content.css("--cursor-y", `${targetY}%`);
                    raf = null;
                };

                $content.on("mousemove", e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (!rect.width || !rect.height) return;

                    targetX = ((e.clientX - rect.left) / rect.width) * 100;
                    targetY = ((e.clientY - rect.top) / rect.height) * 100;
                    $content.addClass("cursor-active");

                    const now = performance.now();
                    if (now - lastSparkTs >= sparkIntervalMs) {
                        spawnFx("cursor-spark", e.clientX, e.clientY);
                        lastSparkTs = now;
                    }

                    if (!raf) raf = requestAnimationFrame(paintCursorGlow);
                });

                $content.on("click", e => {
                    spawnFx("cursor-ripple", e.clientX, e.clientY);
                });

                $content.on("mouseleave", () => {
                    $content.removeClass("cursor-active");
                });
            }

            $("#menuToggle").on("click", () => {
                const open = $("#sidebar").toggleClass("open").hasClass("open");
                $("#sidebarOverlay").toggleClass("active", open);
            });

            $("#sidebarOverlay").on("click", () => {
                $("#sidebar").removeClass("open");
                $("#sidebarOverlay").removeClass("active");
            });

            $("#themeToggle").on("click", () => {
                const dark = !$("body").hasClass("dark");
                $("body").toggleClass("dark", dark);
                localStorage.setItem("superdo_theme", dark ? "dark" : "light");
            });

            $(document).on("keydown", e => {
                if (e.ctrlKey && e.key.toLowerCase() === "m") {
                    e.preventDefault();
                    $("#themeToggle").trigger("click");
                }
                if (e.ctrlKey && e.key.toLowerCase() === "k") {
                    e.preventDefault();
                    $("#globalSearch").trigger("focus");
                }
                if (e.altKey && /^[1-7]$/.test(e.key)) {
                    e.preventDefault();
                    const map = { "1": "dashboard", "2": "notes", "3": "rent", "4": "marriage", "5": "expenses", "6": "loans", "7": "custom" };
                    ctx.section(map[e.key]);
                }
            });

            $("body").toggleClass("dark", localStorage.getItem("superdo_theme") === "dark");
        }
    };
})();
