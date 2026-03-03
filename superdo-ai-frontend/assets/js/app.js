$(function () {
    const s = {
        notes: [],
        expenses: [],
        rent: [],
        marriage: [],
        loans: [],
        loanSummary: null,
        sections: [],
        entries: {},
        timer: null,
        authConfig: null
    };

    function toast(m, bad) {
        const c = bad ? "error" : "success";
        const n = $(`<div class="toast ${c}"><div class="toast-indicator"></div><span>${m}</span></div>`);
        $("#toastContainer").append(n);
        setTimeout(() => n.fadeOut(200, () => n.remove()), 2600);
    }

    function call(method, path, body, query) {
        return api.request(method, path, body, query).fail(x => toast(x?.responseJSON?.error || "Request failed", true));
    }

    function needAuth() {
        if (api.getAccessToken()) return true;
        $("#authModal").removeClass("hidden");
        return false;
    }

    function money(v) {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v || 0));
    }

    function section(id) {
        $(".section").removeClass("active");
        $(`#${id}`).addClass("active");
        $(".nav-btn").removeClass("active");
        $(`.nav-btn[data-section='${id}']`).addClass("active");
        $("#sidebar").removeClass("open");
        $("#sidebarOverlay").removeClass("active");
    }

    function req(v, n) {
        if (!v || !String(v).trim()) {
            toast(`${n} is required`, true);
            return null;
        }
        return v;
    }

    function pos(v, n) {
        const x = Number(v);
        if (!v || Number.isNaN(x) || x <= 0) {
            toast(`${n} must be positive`, true);
            return null;
        }
        return x;
    }

    function del(path, cb) {
        if (!confirm("Are you sure?")) return;
        call("DELETE", path).done(() => cb && cb());
    }

    function resolvedPromise() {
        return $.Deferred().resolve().promise();
    }

    const ctx = {
        state: s,
        modules: {},
        toast,
        call,
        needAuth,
        money,
        section,
        req,
        pos,
        del,
        renderDashboard: function () {},
        remind: function () {}
    };

    function loadAll() {
        if (!needAuth()) return;
        const loadNotes = ctx.modules.notes?.loadNotes || resolvedPromise;
        const loadExpenses = ctx.modules.expenses?.loadExpenses || resolvedPromise;
        const loadRent = ctx.modules.rent?.loadRent || resolvedPromise;
        const loadMarriage = ctx.modules.rent?.loadMarriage || resolvedPromise;
        const loadLoans = ctx.modules.loans?.loadLoans || resolvedPromise;
        const loadSections = ctx.modules.custom?.loadSections || resolvedPromise;

        $.when(loadNotes(), loadExpenses(), loadRent(), loadMarriage(), loadLoans(), loadSections()).done(() => {
            ctx.renderDashboard();
            ctx.remind();
        });
    }

    ctx.loadAll = loadAll;

    const modules = window.SuperDoModules || {};
    if (modules.ui?.init) modules.ui.init(ctx);
    if (modules.profile?.init) modules.profile.init(ctx);
    if (modules.backup?.init) modules.backup.init(ctx);
    if (modules.dashboard?.init) modules.dashboard.init(ctx);
    if (modules.notes?.init) modules.notes.init(ctx);
    if (modules.expenses?.init) modules.expenses.init(ctx);
    if (modules.search?.init) modules.search.init(ctx);
    if (modules.rent?.init) modules.rent.init(ctx);
    if (modules.loans?.init) modules.loans.init(ctx);
    if (modules.custom?.init) modules.custom.init(ctx);
    if (modules.auth?.init) modules.auth.init(ctx);
});
