(function () {
    window.SuperDoModules = window.SuperDoModules || {};

    window.SuperDoModules.dashboard = {
        init(ctx) {
            function renderDashboard() {
                $("#totalNotes").text(ctx.state.notes.length);
                $("#totalExpenses").text(ctx.state.expenses.length);

                const rentStatus = ctx.modules.rent?.rentStatus || (() => "PENDING");
                const due = ctx.state.rent
                    .filter(x => rentStatus(x) !== "PAID")
                    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0];

                $("#rentDue").text(due ? `${ctx.money(due.rentAmount)} (${due.dueDate})` : "$0");
                $("#upcomingEvents").text(ctx.state.marriage.filter(x => x.eventDate && x.eventDate >= new Date().toISOString().slice(0, 10)).length);

                const paid = ctx.state.rent.filter(x => rentStatus(x) === "PAID").length;
                const pct = ctx.state.rent.length ? Math.round((paid / ctx.state.rent.length) * 100) : 0;
                $("#rentProgressBar").css("width", `${pct}%`);
                $("#rentProgressText").text(ctx.state.rent.length ? `${paid}/${ctx.state.rent.length} paid (${pct}%)` : "No rent data yet");

                const monthKey = new Date().toISOString().slice(0, 7);
                const cur = ctx.state.expenses
                    .filter(x => String(x.type).toUpperCase() === "EXPENSE" && String(x.txnDate || "").startsWith(monthKey))
                    .reduce((a, x) => a + Number(x.amount || 0), 0);
                $("#expenseTrend").text(`Current month expense: ${ctx.money(cur)}`);
            }

            function remind() {
                // Disabled noisy login-time reminder toasts by request.
            }

            ctx.renderDashboard = renderDashboard;
            ctx.remind = remind;
            ctx.modules.dashboard = { renderDashboard, remind };
        }
    };
})();
