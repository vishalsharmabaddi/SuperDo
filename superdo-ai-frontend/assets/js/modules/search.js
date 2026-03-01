(function () {
    window.SuperDoModules = window.SuperDoModules || {};

    window.SuperDoModules.search = {
        init(ctx) {
            function globalSearch(q) {
                if (!ctx.needAuth()) return;
                if (!q) return $("#searchResults").addClass("hidden").empty();
                ctx.call("GET", "/search/global", null, { query: q }).done(r => {
                    const groups = [
                        ["notes", "Notes", x => x.title || x.content || "Note"],
                        ["rentRecords", "Rent", x => `${x.monthKey || "Rent"} - ${x.paymentStatus || ""}`],
                        ["expenses", "Expenses", x => `${x.category || "Category"} - ${x.amount || 0}`],
                        ["marriagePlanner", "Celebrations", x => x.eventName || x.vendorName || "Item"],
                        ["customSections", "Custom Sections", x => x.name || "Section"],
                        ["customEntries", "Custom Entries", x => x.dataJson || "Entry"]
                    ];

                    const html = groups
                        .map(([k, t, f]) => (r[k] || []).length
                            ? `<div class="search-group"><h4>${t} (${r[k].length})</h4>${r[k].slice(0, 5).map(v => `<span class="search-chip">${f(v)}</span>`).join("")}</div>`
                            : "")
                        .join("");

                    $("#searchResults").toggleClass("hidden", !html).html(html || '<p class="muted">No matches found.</p>');
                });
            }

            $("#globalSearch").on("input", function () {
                const q = $(this).val().trim();
                clearTimeout(ctx.state.timer);
                ctx.state.timer = setTimeout(() => globalSearch(q), 300);
            });
        }
    };
})();
