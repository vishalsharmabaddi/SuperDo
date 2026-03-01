(function () {
    'use strict';
    window.SuperDoModules = window.SuperDoModules || {};

    window.SuperDoModules.expenses = {
        init(ctx) {
            const BUDGET_KEY = 'superdo_monthly_budget';
            const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const CATEGORIES = ['Food','Rent','Shopping','Transport','Health','Entertainment','Other'];
            const FREQ_OPTIONS = ['Daily','Weekly','Monthly'];

            // ── State ──────────────────────────────────────────────────────────
            const now = new Date();
            const expUi = {
                year:     now.getFullYear(),
                month:    now.getMonth(),   // 0-indexed
                category: 'ALL',
                type:     'ALL',
                search:   '',
                page:     1,
                pageSize: 10,
                budget:   parseFloat(localStorage.getItem(BUDGET_KEY) || '0')
            };
            let expenseModalBound = false;

            // ── Helpers ────────────────────────────────────────────────────────
            function safe(v) {
                return String(v == null ? '' : v)
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }

            function fmtDate(v) {
                if (!v) return '-';
                const d = new Date(v + 'T00:00:00');
                if (isNaN(d.getTime())) return v;
                return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
            }

            function monthKey(year, month) {
                return `${year}-${String(month + 1).padStart(2, '0')}`;
            }

            // ── Note encoding – we piggyback name/recurring/freq in the note JSON
            function encodeNote(name, desc, recurring, frequency) {
                return JSON.stringify({
                    n: name || '',
                    d: desc || '',
                    r: Boolean(recurring),
                    f: frequency || ''
                });
            }

            function decodeNote(raw) {
                if (!raw) return { name: '', desc: '', recurring: false, frequency: '' };
                try {
                    const obj = JSON.parse(raw);
                    if (obj && typeof obj === 'object' && 'n' in obj) {
                        return {
                            name:      String(obj.n || ''),
                            desc:      String(obj.d || ''),
                            recurring: Boolean(obj.r),
                            frequency: String(obj.f || '')
                        };
                    }
                } catch (_) { /* plain text note */ }
                return { name: raw, desc: '', recurring: false, frequency: '' };
            }

            // ── Stats ──────────────────────────────────────────────────────────
            function calcStats() {
                const mk = monthKey(expUi.year, expUi.month);
                const monthRows = ctx.state.expenses.filter(e => String(e.txnDate || '').startsWith(mk));
                const totalIncome  = monthRows.filter(e => String(e.type).toUpperCase() === 'INCOME')
                                             .reduce((s, e) => s + Number(e.amount || 0), 0);
                const totalExpense = monthRows.filter(e => String(e.type).toUpperCase() === 'EXPENSE')
                                             .reduce((s, e) => s + Number(e.amount || 0), 0);
                return {
                    totalIncome,
                    totalExpense,
                    totalSavings:    totalIncome - totalExpense,
                    budgetRemaining: expUi.budget - totalExpense
                };
            }

            function renderStats() {
                const st = calcStats();
                const savCls = st.totalSavings >= 0 ? 'exp-stat-success' : 'exp-stat-danger';
                const budPct = expUi.budget > 0 ? st.totalExpense / expUi.budget : 0;
                const budCls = budPct > 0.9 ? 'exp-stat-danger' : budPct > 0.7 ? 'exp-stat-warning' : 'exp-stat-success';

                $('#expenseStats').html(`
                    <div class="exp-stat-card">
                        <div class="exp-stat-icon exp-icon-income">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                        </div>
                        <div class="exp-stat-body">
                            <span class="exp-stat-label">Total Income</span>
                            <span class="exp-stat-value exp-stat-income">${ctx.money(st.totalIncome)}</span>
                        </div>
                    </div>
                    <div class="exp-stat-card">
                        <div class="exp-stat-icon exp-icon-expense">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                        </div>
                        <div class="exp-stat-body">
                            <span class="exp-stat-label">Total Expense</span>
                            <span class="exp-stat-value exp-stat-expense">${ctx.money(st.totalExpense)}</span>
                        </div>
                    </div>
                    <div class="exp-stat-card">
                        <div class="exp-stat-icon exp-icon-savings">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </div>
                        <div class="exp-stat-body">
                            <span class="exp-stat-label">Total Savings</span>
                            <span class="exp-stat-value ${savCls}">${ctx.money(st.totalSavings)}</span>
                        </div>
                    </div>
                    <div class="exp-stat-card">
                        <div class="exp-stat-icon exp-icon-budget">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                        </div>
                        <div class="exp-stat-body">
                            <span class="exp-stat-label">Budget Remaining</span>
                            <span class="exp-stat-value ${budCls}">${ctx.money(st.budgetRemaining)}</span>
                        </div>
                    </div>
                `);
            }

            // ── Budget Section ─────────────────────────────────────────────────
            function renderBudget() {
                const st  = calcStats();
                const pct = expUi.budget > 0 ? Math.min(100, Math.round((st.totalExpense / expUi.budget) * 100)) : 0;
                const barCls = pct > 90 ? 'exp-budget-bar-danger' : pct > 70 ? 'exp-budget-bar-warning' : 'exp-budget-bar-ok';

                $('#expenseBudgetSection').html(`
                    <div class="exp-budget-card">
                        <div class="exp-budget-header">
                            <h4>Monthly Budget — ${MONTHS[expUi.month]} ${expUi.year}</h4>
                            <div class="exp-budget-controls">
                                <input id="monthlyBudgetInput" type="number" min="0" step="0.01"
                                    placeholder="Set monthly budget..." value="${expUi.budget || ''}"
                                    class="exp-budget-input" aria-label="Monthly budget">
                                <button id="saveBudgetBtn" class="btn-primary exp-budget-btn">Save Budget</button>
                            </div>
                        </div>
                        <div class="exp-budget-progress-row">
                            <div class="exp-budget-track">
                                <div class="exp-budget-fill ${barCls}" style="width:${pct}%"></div>
                            </div>
                            <span class="exp-budget-pct">${pct}%</span>
                        </div>
                        <div class="exp-budget-meta">
                            <span>Spent: <strong>${ctx.money(st.totalExpense)}</strong></span>
                            <span>Budget: <strong>${expUi.budget > 0 ? ctx.money(expUi.budget) : 'Not set'}</strong></span>
                            <span>Remaining: <strong class="${st.budgetRemaining < 0 ? 'exp-text-danger' : 'exp-text-success'}">${ctx.money(st.budgetRemaining)}</strong></span>
                        </div>
                    </div>
                `);
            }

            // ── Bar Chart (last 6 months Income vs Expense) ───────────────────
            function buildBarChart() {
                const cols = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(expUi.year, expUi.month - i, 1);
                    cols.push({
                        label: MONTHS[d.getMonth()],
                        key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                    });
                }

                const data = cols.map(c => {
                    const group = ctx.state.expenses.filter(e => String(e.txnDate || '').startsWith(c.key));
                    return {
                        label:   c.label,
                        income:  group.filter(e => e.type === 'INCOME').reduce((s, e) => s + Number(e.amount || 0), 0),
                        expense: group.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + Number(e.amount || 0), 0)
                    };
                });

                const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);

                const bars = data.map(d => {
                    const inH  = Math.round((d.income  / maxVal) * 100);
                    const exH  = Math.round((d.expense / maxVal) * 100);
                    return `
                        <div class="exp-bar-group">
                            <div class="exp-bar-pair">
                                <div class="exp-bar exp-bar-income" style="height:${inH}%"
                                    title="Income: ${ctx.money(d.income)}"></div>
                                <div class="exp-bar exp-bar-expense" style="height:${exH}%"
                                    title="Expense: ${ctx.money(d.expense)}"></div>
                            </div>
                            <span class="exp-bar-label">${d.label}</span>
                        </div>`;
                }).join('');

                return `
                    <div class="exp-chart-card">
                        <h4>Monthly Overview</h4>
                        <div class="exp-chart-legend-row">
                            <span class="exp-legend-dot" style="background:var(--success)"></span>
                            <span class="exp-legend-label">Income</span>
                            <span class="exp-legend-dot" style="background:var(--danger); margin-left:8px"></span>
                            <span class="exp-legend-label">Expense</span>
                        </div>
                        <div class="exp-bar-chart">${bars}</div>
                    </div>`;
            }

            // ── Donut Chart (category breakdown for current month) ─────────────
            function buildDonutChart() {
                const mk    = monthKey(expUi.year, expUi.month);
                const rows  = ctx.state.expenses.filter(e =>
                    String(e.txnDate || '').startsWith(mk) &&
                    String(e.type).toUpperCase() === 'EXPENSE'
                );

                const catMap = {};
                rows.forEach(e => {
                    const k = e.category || 'Other';
                    catMap[k] = (catMap[k] || 0) + Number(e.amount || 0);
                });

                const total   = Object.values(catMap).reduce((s, v) => s + v, 0);
                const sorted  = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
                const COLORS  = ['#0d9488','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#6366f1'];
                const cx = 70, cy = 70, r = 55, ir = 34;

                let cum = 0;
                const segs = sorted.map(([cat, val], i) => {
                    const pct = total > 0 ? val / total : 0;
                    const seg = { cat, val, pct, color: COLORS[i % COLORS.length], start: cum };
                    cum += pct;
                    return seg;
                });

                let paths = '';
                if (segs.length === 0) {
                    paths = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--border)" opacity="0.4"/>`;
                } else {
                    segs.forEach(s => {
                        if (s.pct < 0.004) return;
                        const a1 = s.start * 2 * Math.PI - Math.PI / 2;
                        const a2 = (s.start + s.pct) * 2 * Math.PI - Math.PI / 2;
                        const x1 = cx + r  * Math.cos(a1), y1 = cy + r  * Math.sin(a1);
                        const x2 = cx + r  * Math.cos(a2), y2 = cy + r  * Math.sin(a2);
                        const ix1 = cx + ir * Math.cos(a2), iy1 = cy + ir * Math.sin(a2);
                        const ix2 = cx + ir * Math.cos(a1), iy2 = cy + ir * Math.sin(a1);
                        const lg  = s.pct > 0.5 ? 1 : 0;
                        paths += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${lg} 0 ${ix2} ${iy2} Z" fill="${s.color}" opacity="0.9"/>`;
                    });
                }

                const legend = segs.length ? segs.map(s => `
                    <div class="exp-donut-legend-item">
                        <span class="exp-legend-dot" style="background:${s.color}"></span>
                        <span class="exp-legend-cat">${safe(s.cat)}</span>
                        <span class="exp-legend-pct">${(s.pct * 100).toFixed(1)}%</span>
                        <span class="exp-legend-amt">${ctx.money(s.val)}</span>
                    </div>`).join('') :
                    '<p class="muted" style="font-size:0.8rem;margin:0">No expense data this month</p>';

                return `
                    <div class="exp-chart-card">
                        <h4>Category Breakdown</h4>
                        <div class="exp-donut-wrap">
                            <div class="exp-donut-svg-wrap">
                                <svg width="140" height="140" viewBox="0 0 140 140">
                                    ${paths}
                                    <circle cx="${cx}" cy="${cy}" r="${ir}" fill="var(--surface)"/>
                                    <text x="${cx}" y="${cy - 5}" text-anchor="middle"
                                        font-size="7.5" fill="var(--muted)"
                                        font-family="Space Grotesk, sans-serif">Expenses</text>
                                    <text x="${cx}" y="${cy + 7}" text-anchor="middle"
                                        font-size="8.5" fill="var(--text-2)" font-weight="600"
                                        font-family="Space Grotesk, sans-serif">${total > 0 ? ctx.money(total) : ''}</text>
                                </svg>
                            </div>
                            <div class="exp-donut-legend">${legend}</div>
                        </div>
                    </div>`;
            }

            function renderCharts() {
                $('#expenseCharts').html(buildBarChart() + buildDonutChart());
            }

            // ── Month Tabs ────────────────────────────────────────────────────
            function monthTabsHtml() {
                const tabs = MONTHS.map((m, i) => `
                    <button class="exp-month-tab ${expUi.month === i ? 'active' : ''}" data-month="${i}">${m}</button>
                `).join('');
                return `
                    <div class="exp-month-tabs-wrap">
                        <div class="exp-month-tabs">${tabs}</div>
                        <div class="exp-year-ctrl">
                            <button class="exp-year-btn" id="expYearPrev" aria-label="Previous year">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                            </button>
                            <span class="exp-year-label">${expUi.year}</span>
                            <button class="exp-year-btn" id="expYearNext" aria-label="Next year">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </button>
                        </div>
                    </div>`;
            }

            // ── Filters / Toolbar ──────────────────────────────────────────────
            function toolbarHtml(filteredCount) {
                const catOpts = ['ALL', ...CATEGORIES].map(c =>
                    `<option value="${c}" ${expUi.category === c ? 'selected' : ''}>${c === 'ALL' ? 'All Categories' : c}</option>`
                ).join('');
                const typeOpts = [['ALL','All Types'],['INCOME','Income'],['EXPENSE','Expense']].map(([v, l]) =>
                    `<option value="${v}" ${expUi.type === v ? 'selected' : ''}>${l}</option>`
                ).join('');
                const pgOpts = [10, 25, 50].map(n =>
                    `<option value="${n}" ${expUi.pageSize === n ? 'selected' : ''}>${n}</option>`
                ).join('');

                const from = filteredCount ? Math.min((expUi.page - 1) * expUi.pageSize + 1, filteredCount) : 0;
                const to   = Math.min(expUi.page * expUi.pageSize, filteredCount);

                return `
                    <div class="exp-toolbar">
                        <div class="exp-filters">
                            <div class="exp-search-wrap">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                                <input id="expenseSearch" type="text" value="${safe(expUi.search)}"
                                    placeholder="Search entries..." class="exp-search-input" aria-label="Search expenses">
                            </div>
                            <select id="expenseCategoryFilter" class="exp-filter-select" aria-label="Filter by category">${catOpts}</select>
                            <select id="expenseTypeFilter" class="exp-filter-select" aria-label="Filter by type">${typeOpts}</select>
                        </div>
                        <div class="exp-toolbar-right">
                            <span class="exp-count-text">Showing ${from}–${to} of <strong>${filteredCount}</strong> entries</span>
                            <div class="exp-pagesize-wrap">
                                Show
                                <select id="expensePageSize" class="exp-filter-select exp-pagesize-sel" aria-label="Entries per page">${pgOpts}</select>
                                per page
                            </div>
                        </div>
                    </div>`;
            }

            // ── Entry Row ──────────────────────────────────────────────────────
            function entryRowHtml(e) {
                const decoded   = decodeNote(e.note);
                const typeUp    = String(e.type || '').toUpperCase();
                const typeCls   = typeUp === 'INCOME' ? 'exp-type-income' : 'exp-type-expense';
                const typeLabel = typeUp === 'INCOME' ? 'Income' : 'Expense';
                const amtSign   = typeUp === 'INCOME' ? '+' : '−';
                const name      = decoded.name || e.category || 'Entry';
                const recTag    = decoded.recurring
                    ? `<span class="exp-recurring-tag">${safe(decoded.frequency || 'Recurring')}</span>` : '';

                return `
                    <div class="exp-entry-row">
                        <div class="exp-entry-main">
                            <div class="exp-entry-info">
                                <span class="exp-entry-name">${safe(name)}</span>
                                ${recTag}
                                <span class="exp-entry-date">${fmtDate(e.txnDate)}</span>
                            </div>
                            <div class="exp-entry-meta">
                                <span class="exp-entry-category">${safe(e.category || 'Other')}</span>
                                <span class="exp-entry-type ${typeCls}">${typeLabel}</span>
                                <span class="exp-entry-amount ${typeCls}">${amtSign}${ctx.money(e.amount)}</span>
                            </div>
                        </div>
                        <div class="exp-entry-actions">
                            <button class="exp-edit-btn" data-id="${e.id}" aria-label="Edit entry">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Edit
                            </button>
                            <button class="exp-del-btn" data-id="${e.id}" aria-label="Delete entry">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                Delete
                            </button>
                        </div>
                    </div>`;
            }

            // ── Pagination ─────────────────────────────────────────────────────
            function paginationHtml(total) {
                const pages = Math.ceil(total / expUi.pageSize);
                if (pages <= 1) return '';

                const nums = [];
                for (let i = 1; i <= pages; i++) {
                    if (i === 1 || i === pages || (i >= expUi.page - 2 && i <= expUi.page + 2)) {
                        nums.push(i);
                    } else if (nums[nums.length - 1] !== '...') {
                        nums.push('...');
                    }
                }

                const btns = nums.map(p =>
                    p === '...' ?
                        `<span class="exp-pg-ellipsis">…</span>` :
                        `<button class="exp-pg-btn ${p === expUi.page ? 'active' : ''}" data-page="${p}">${p}</button>`
                ).join('');

                return `
                    <div class="exp-pagination">
                        <button class="exp-pg-btn exp-pg-nav" id="expPgPrev" ${expUi.page <= 1 ? 'disabled' : ''} aria-label="Previous page">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        ${btns}
                        <button class="exp-pg-btn exp-pg-nav" id="expPgNext" ${expUi.page >= pages ? 'disabled' : ''} aria-label="Next page">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </div>`;
            }

            // ── Filtered list ──────────────────────────────────────────────────
            function getFiltered() {
                const mk = monthKey(expUi.year, expUi.month);
                const q  = expUi.search.trim().toLowerCase();

                return ctx.state.expenses.filter(e => {
                    if (!String(e.txnDate || '').startsWith(mk)) return false;
                    if (expUi.category !== 'ALL' &&
                        String(e.category || '').toLowerCase() !== expUi.category.toLowerCase()) return false;
                    if (expUi.type !== 'ALL' &&
                        String(e.type || '').toUpperCase() !== expUi.type) return false;
                    if (q) {
                        const nd  = decodeNote(e.note);
                        const hay = [nd.name, nd.desc, e.category || '', e.type || '', e.txnDate || ''].join(' ').toLowerCase();
                        if (!hay.includes(q)) return false;
                    }
                    return true;
                });
            }

            // ── Main Render ────────────────────────────────────────────────────
            function renderAll() {
                renderStats();
                renderBudget();
                renderCharts();

                const filtered = getFiltered();
                const start    = (expUi.page - 1) * expUi.pageSize;
                const paged    = filtered.slice(start, start + expUi.pageSize);

                let listHtml = '';
                if (paged.length === 0) {
                    listHtml = `
                        <div class="empty-state">
                            <p>No entries found for <strong>${MONTHS[expUi.month]} ${expUi.year}</strong>.<br>
                            Try adjusting the filters or add a new entry.</p>
                        </div>`;
                } else {
                    listHtml = `<div class="exp-entries-list">${paged.map(entryRowHtml).join('')}</div>`;
                }

                $('#expenseList').html(`
                    ${monthTabsHtml()}
                    ${toolbarHtml(filtered.length)}
                    ${listHtml}
                    ${paginationHtml(filtered.length)}
                `);
            }

            // ── Load from API ──────────────────────────────────────────────────
            function loadExpenses() {
                return ctx.call('GET', '/expenses').done(r => {
                    ctx.state.expenses = r || [];
                    expUi.page = 1;
                    renderAll();
                });
            }

            // ── Export CSV ─────────────────────────────────────────────────────
            function exportCsv() {
                if (!ctx.state.expenses.length) { ctx.toast('No data to export', true); return; }
                const header = ['Name', 'Date', 'Amount', 'Category', 'Type', 'Recurring', 'Frequency', 'Notes'];
                const rows   = ctx.state.expenses.map(e => {
                    const nd = decodeNote(e.note);
                    return [
                        `"${nd.name.replace(/"/g, '""')}"`,
                        e.txnDate || '',
                        e.amount  || 0,
                        `"${(e.category || '').replace(/"/g, '""')}"`,
                        e.type    || '',
                        nd.recurring ? 'Yes' : 'No',
                        nd.frequency || '',
                        `"${nd.desc.replace(/"/g, '""')}"`
                    ].join(',');
                });
                const csv  = [header.join(','), ...rows].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href = url;
                a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                ctx.toast('CSV exported');
            }

            // ── Export PDF ─────────────────────────────────────────────────────
            function exportPdf() {
                const filtered = getFiltered();
                if (!filtered.length) { ctx.toast('No data to export', true); return; }

                const st       = calcStats();
                const monthLabel = `${MONTHS[expUi.month]} ${expUi.year}`;
                const filters  = [
                    expUi.category !== 'ALL' ? `Category: ${expUi.category}` : '',
                    expUi.type     !== 'ALL' ? `Type: ${expUi.type}`         : '',
                    expUi.search.trim()       ? `Search: "${expUi.search}"`  : ''
                ].filter(Boolean).join(' | ');

                const rows = filtered.map(e => {
                    const nd      = decodeNote(e.note);
                    const typeUp  = String(e.type || '').toUpperCase();
                    const amtSign = typeUp === 'INCOME' ? '+' : '−';
                    const amtCls  = typeUp === 'INCOME' ? 'color:#059669' : 'color:#dc2626';
                    return `
                        <tr>
                            <td>${nd.name || e.category || '—'}</td>
                            <td>${fmtDate(e.txnDate)}</td>
                            <td>${e.category || '—'}</td>
                            <td>${typeUp === 'INCOME' ? 'Income' : 'Expense'}</td>
                            <td style="text-align:right;font-weight:600;${amtCls}">${amtSign}${ctx.money(e.amount)}</td>
                            <td>${nd.recurring ? (nd.frequency || 'Yes') : '—'}</td>
                            <td>${nd.desc || '—'}</td>
                        </tr>`;
                }).join('');

                const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Expense Report — ${monthLabel}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#111;padding:32px}
  h1{font-size:20px;font-weight:700;margin-bottom:4px}
  .sub{color:#555;font-size:11px;margin-bottom:20px}
  .stats{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}
  .stat{border:1px solid #e5e7eb;border-radius:8px;padding:10px 16px;min-width:130px}
  .stat-label{font-size:10px;color:#777;text-transform:uppercase;letter-spacing:.5px}
  .stat-value{font-size:15px;font-weight:700;margin-top:2px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#f3f4f6;text-align:left;padding:8px 10px;border-bottom:2px solid #d1d5db;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#555}
  td{padding:7px 10px;border-bottom:1px solid #f0f0f0}
  tr:last-child td{border-bottom:none}
  .footer{margin-top:24px;font-size:10px;color:#aaa;text-align:right}
  @media print{body{padding:16px}}
</style>
</head>
<body>
<h1>Expense Report — ${monthLabel}</h1>
<div class="sub">Generated on ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}${filters ? ' &nbsp;·&nbsp; Filters: ' + filters : ''} &nbsp;·&nbsp; ${filtered.length} entries</div>
<div class="stats">
  <div class="stat"><div class="stat-label">Total Income</div><div class="stat-value" style="color:#059669">${ctx.money(st.totalIncome)}</div></div>
  <div class="stat"><div class="stat-label">Total Expense</div><div class="stat-value" style="color:#dc2626">${ctx.money(st.totalExpense)}</div></div>
  <div class="stat"><div class="stat-label">Savings</div><div class="stat-value" style="color:${st.totalSavings>=0?'#059669':'#dc2626'}">${ctx.money(st.totalSavings)}</div></div>
  ${expUi.budget > 0 ? `<div class="stat"><div class="stat-label">Budget Remaining</div><div class="stat-value" style="color:${st.budgetRemaining>=0?'#059669':'#dc2626'}">${ctx.money(st.budgetRemaining)}</div></div>` : ''}
</div>
<table>
  <thead><tr><th>Name</th><th>Date</th><th>Category</th><th>Type</th><th style="text-align:right">Amount</th><th>Recurring</th><th>Notes</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">SuperDo — Expense Tracker</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;

                const win = window.open('', '_blank');
                if (!win) { ctx.toast('Allow pop-ups to download PDF', true); return; }
                win.document.write(html);
                win.document.close();
            }

            // ── Modal ──────────────────────────────────────────────────────────
            function ensureModal() {
                if ($('#expenseEditorModal').length) return;
                $('body').append(`
                    <div id="expenseEditorModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Expense entry editor">
                        <div class="modal-content exp-modal-content">
                            <div class="modal-header">
                                <h3 id="expEditorTitle">Add Entry</h3>
                                <button class="modal-close" id="closeExpEditorModal" aria-label="Close editor">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                            </div>

                            <div class="exp-type-toggle">
                                <button class="exp-type-btn active" data-type="EXPENSE">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                                    Expense
                                </button>
                                <button class="exp-type-btn" data-type="INCOME">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                                    Income
                                </button>
                            </div>

                            <div class="exp-form-grid">
                                <div class="exp-field exp-field-full">
                                    <label>Entry Name</label>
                                    <input id="expNameInput" placeholder="e.g. Grocery shopping, Monthly salary..." aria-label="Entry name">
                                </div>
                                <div class="exp-field">
                                    <label>Amount</label>
                                    <input id="expAmountInput" type="number" min="0.01" step="0.01" placeholder="0.00" aria-label="Amount">
                                </div>
                                <div class="exp-field">
                                    <label>Date</label>
                                    <input id="expDateInput" type="date" aria-label="Date">
                                </div>
                                <div class="exp-field exp-field-full">
                                    <label>Category</label>
                                    <select id="expCategoryInput" aria-label="Category">
                                        ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="exp-recurring-section">
                                <label class="exp-recurring-label">
                                    <span class="exp-recurring-title">Recurring Entry</span>
                                    <label class="exp-toggle-switch">
                                        <input type="checkbox" id="expRecurringToggle" aria-label="Recurring entry">
                                        <span class="exp-toggle-track"></span>
                                    </label>
                                </label>
                                <div id="expFreqSection" class="exp-freq-btns hidden">
                                    ${FREQ_OPTIONS.map(f => `<button type="button" class="exp-freq-btn" data-freq="${f}">${f}</button>`).join('')}
                                </div>
                            </div>

                            <div class="exp-field">
                                <label>Notes <span class="exp-field-opt">(optional)</span></label>
                                <textarea id="expNotesInput" rows="3" placeholder="Any additional details..." aria-label="Notes"></textarea>
                            </div>

                            <div class="modal-actions">
                                <button id="saveExpenseModalBtn" class="btn-primary">Save Entry</button>
                            </div>
                        </div>
                    </div>
                `);
            }

            function bindModal() {
                if (expenseModalBound) return;
                expenseModalBound = true;

                $(document).on('click', '#closeExpEditorModal', () => $('#expenseEditorModal').addClass('hidden'));
                $(document).on('click', '#expenseEditorModal', function (e) { if (e.target === this) $(this).addClass('hidden'); });

                $(document).on('click', '#expenseEditorModal .exp-type-btn', function () {
                    $('#expenseEditorModal .exp-type-btn').removeClass('active');
                    $(this).addClass('active');
                });

                $(document).on('change', '#expRecurringToggle', function () {
                    if ($(this).is(':checked')) {
                        $('#expFreqSection').removeClass('hidden');
                        if (!$('#expenseEditorModal .exp-freq-btn.active').length) {
                            $('#expenseEditorModal .exp-freq-btn').last().addClass('active'); // Monthly default
                        }
                    } else {
                        $('#expFreqSection').addClass('hidden');
                        $('#expenseEditorModal .exp-freq-btn').removeClass('active');
                    }
                });

                $(document).on('click', '#expFreqSection .exp-freq-btn', function () {
                    $('#expFreqSection .exp-freq-btn').removeClass('active');
                    $(this).addClass('active');
                });

                $(document).on('click', '#saveExpenseModalBtn', () => {
                    const id       = Number($('#saveExpenseModalBtn').data('id') || 0);
                    const name     = ctx.req($('#expNameInput').val().trim(), 'Entry name'); if (!name) return;
                    const amount   = ctx.pos($('#expAmountInput').val(), 'Amount');          if (!amount) return;
                    const txnDate  = ctx.req($('#expDateInput').val(), 'Date');              if (!txnDate) return;
                    const category = $('#expCategoryInput').val() || CATEGORIES[0];
                    const type     = $('#expenseEditorModal .exp-type-btn.active').data('type') || 'EXPENSE';
                    const recurring = $('#expRecurringToggle').is(':checked');
                    const frequency = recurring
                        ? ($('#expFreqSection .exp-freq-btn.active').data('freq') || 'Monthly') : '';
                    const desc = $('#expNotesInput').val().trim();
                    const note = encodeNote(name, desc, recurring, frequency);

                    ctx.call(id ? 'PUT' : 'POST', id ? `/expenses/${id}` : '/expenses',
                        { type, category, amount, txnDate, note }
                    ).done(() => {
                        $('#expenseEditorModal').addClass('hidden');
                        ctx.toast('Saved');
                        loadExpenses().done(ctx.renderDashboard);
                    });
                });
            }

            function openForm(id) {
                if (!ctx.needAuth()) return;
                const o       = id ? ctx.state.expenses.find(x => x.id === id) : null;
                const decoded = o ? decodeNote(o.note) : { name: '', desc: '', recurring: false, frequency: '' };
                const type    = o ? String(o.type || 'EXPENSE').toUpperCase() : 'EXPENSE';
                const today   = new Date().toISOString().slice(0, 10);

                $('#expEditorTitle').text(id ? 'Edit Entry' : 'Add Entry');
                $('#expNameInput').val(decoded.name);
                $('#expAmountInput').val(o ? o.amount : '');
                $('#expDateInput').val(o ? o.txnDate : today);
                $('#expCategoryInput').val(o ? (o.category || CATEGORIES[0]) : CATEGORIES[0]);
                $('#expNotesInput').val(decoded.desc);
                $('#expRecurringToggle').prop('checked', decoded.recurring);

                $('#expenseEditorModal .exp-type-btn').removeClass('active');
                $(`#expenseEditorModal .exp-type-btn[data-type="${type}"]`).addClass('active');

                if (decoded.recurring) {
                    $('#expFreqSection').removeClass('hidden');
                    $('#expFreqSection .exp-freq-btn').removeClass('active');
                    const freq = decoded.frequency || 'Monthly';
                    $(`#expFreqSection .exp-freq-btn[data-freq="${freq}"]`).addClass('active');
                    if (!$('#expFreqSection .exp-freq-btn.active').length) {
                        $('#expFreqSection .exp-freq-btn').last().addClass('active');
                    }
                } else {
                    $('#expFreqSection').addClass('hidden');
                    $('#expFreqSection .exp-freq-btn').removeClass('active');
                }

                $('#saveExpenseModalBtn').data('id', id || 0);
                $('#expenseEditorModal').removeClass('hidden');
            }

            // ── Boot ───────────────────────────────────────────────────────────
            ensureModal();
            bindModal();

            // Static button bindings
            $('#addExpenseBtn').on('click', () => openForm());
            $('#exportExpenseCsvBtn').on('click', exportCsv);
            $('#exportExpensePdfBtn').on('click', exportPdf);

            // Budget save
            $(document).on('click', '#saveBudgetBtn', () => {
                const v = parseFloat($('#monthlyBudgetInput').val());
                if (isNaN(v) || v < 0) { ctx.toast('Enter a valid budget amount', true); return; }
                expUi.budget = v;
                localStorage.setItem(BUDGET_KEY, v);
                ctx.toast('Budget saved');
                renderBudget();
                renderStats();
            });

            // Month tabs
            $(document).on('click', '.exp-month-tab', function () {
                expUi.month = parseInt($(this).data('month'));
                expUi.page  = 1;
                renderAll();
            });

            // Year nav
            $(document).on('click', '#expYearPrev', () => { expUi.year--; expUi.page = 1; renderAll(); });
            $(document).on('click', '#expYearNext', () => { expUi.year++; expUi.page = 1; renderAll(); });

            // Filters
            $(document).on('change', '#expenseCategoryFilter', function () {
                expUi.category = $(this).val();
                expUi.page = 1;
                renderAll();
            });
            $(document).on('change', '#expenseTypeFilter', function () {
                expUi.type = $(this).val();
                expUi.page = 1;
                renderAll();
            });

            // Search (debounced)
            let searchTimer;
            $(document).on('input', '#expenseSearch', function () {
                clearTimeout(searchTimer);
                const val = $(this).val();
                searchTimer = setTimeout(() => { expUi.search = val; expUi.page = 1; renderAll(); }, 250);
            });

            // Page size
            $(document).on('change', '#expensePageSize', function () {
                expUi.pageSize = parseInt($(this).val());
                expUi.page = 1;
                renderAll();
            });

            // Pagination
            $(document).on('click', '#expPgPrev', () => { if (expUi.page > 1) { expUi.page--; renderAll(); } });
            $(document).on('click', '#expPgNext', () => { expUi.page++; renderAll(); });
            $(document).on('click', '.exp-pg-btn[data-page]', function () {
                expUi.page = parseInt($(this).data('page'));
                renderAll();
            });

            // Edit / Delete
            $(document).on('click', '.exp-edit-btn', function () { openForm(Number($(this).data('id'))); });
            $(document).on('click', '.exp-del-btn', function () {
                ctx.del(`/expenses/${Number($(this).data('id'))}`, () => loadExpenses().done(ctx.renderDashboard));
            });

            ctx.modules.expenses = { loadExpenses };
        }
    };
})();
