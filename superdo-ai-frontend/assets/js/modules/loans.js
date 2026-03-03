(function () {
    window.SuperDoModules = window.SuperDoModules || {};

    window.SuperDoModules.loans = {
        init(ctx) {
            let loanModalBound = false;
            let paymentModalBound = false;
            let aiModalBound = false;

            function esc(v) {
                return String(v == null ? "" : v)
                    .replaceAll("&", "&amp;")
                    .replaceAll("<", "&lt;")
                    .replaceAll(">", "&gt;")
                    .replaceAll('"', "&quot;");
            }

            function inr(v) {
                return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
                    .format(Number(v || 0));
            }

            function formatDate(v) {
                if (!v) return "-";
                const d = new Date(v);
                if (Number.isNaN(d.getTime())) return v;
                return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            }

            function formatDueLine(loan) {
                if (!loan.nextDueDate || Number(loan.totalRemaining || 0) <= 0) {
                    return `EMI cleared`;
                }
                const due = new Date(loan.nextDueDate);
                const dueText = Number.isNaN(due.getTime())
                    ? loan.nextDueDate
                    : due.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
                return `EMI Due: ${inr(loan.currentEmiDueAmount || loan.monthlyEmi)} - Due on ${dueText}`;
            }

            function badgeMeta(raw) {
                const badge = String(raw || "UPCOMING").toUpperCase();
                if (badge === "PAID") return { text: "Paid", cls: "loan-badge-paid", icon: "🟢" };
                if (badge === "DUE_TODAY") return { text: "Due Today", cls: "loan-badge-due", icon: "🔴" };
                if (badge.startsWith("DUE_IN_")) {
                    const days = Number(badge.replace("DUE_IN_", "").replace("_DAYS", "")) || 1;
                    return { text: `Due in ${days} day${days === 1 ? "" : "s"}`, cls: "loan-badge-soon", icon: "🟡" };
                }
                if (badge === "OVERDUE") return { text: "Overdue", cls: "loan-badge-overdue", icon: "🔴" };
                return { text: "Upcoming", cls: "loan-badge-soon", icon: "🟡" };
            }

            function ensureModals() {
                if (!$("#loanEditorModal").length) {
                    $("body").append(`
                        <div id="loanEditorModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Loan editor dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h3 id="loanEditorTitle">Add Loan</h3>
                                    <button class="modal-close" id="closeLoanEditorModal" aria-label="Close loan editor">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </button>
                                </div>
                                <input id="loanNameInput" placeholder="Loan Name (e.g. SBI Home Loan)" aria-label="Loan name">
                                <input id="loanLenderInput" placeholder="Bank / Lender Name" aria-label="Lender name">
                                <select id="loanTypeInput" aria-label="Loan type">
                                    <option value="HOME">Home</option>
                                    <option value="CAR">Car</option>
                                    <option value="PERSONAL">Personal</option>
                                    <option value="EDUCATION">Education</option>
                                    <option value="OTHER">Other</option>
                                </select>
                                <input id="loanTotalAmountInput" type="number" min="0.01" step="0.01" placeholder="Total Loan Amount" aria-label="Total loan amount">
                                <input id="loanInterestRateInput" type="number" min="0" step="0.0001" placeholder="Interest Rate (% per annum)" aria-label="Interest rate">
                                <input id="loanTenureInput" type="number" min="1" step="1" placeholder="Tenure (months)" aria-label="Tenure">
                                <input id="loanStartDateInput" type="date" aria-label="Start date">
                                <input id="loanEmiDueDayInput" type="number" min="1" max="28" step="1" placeholder="EMI Due Day (1-28)" aria-label="EMI due day">
                                <div id="loanPreviewMetrics" class="loan-preview-grid"></div>
                                <div class="modal-actions">
                                    <button id="saveLoanModalBtn" class="btn-primary" aria-label="Save loan">Save Loan</button>
                                </div>
                            </div>
                        </div>
                    `);
                }

                if (!$("#loanPaymentModal").length) {
                    $("body").append(`
                        <div id="loanPaymentModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Loan payment dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h3 id="loanPaymentTitle">Log EMI Payment</h3>
                                    <button class="modal-close" id="closeLoanPaymentModal" aria-label="Close loan payment dialog">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </button>
                                </div>
                                <input id="loanPaymentDateInput" type="date" aria-label="Payment date">
                                <input id="loanPaymentAmountInput" type="number" min="0.01" step="0.01" placeholder="Paid amount" aria-label="Paid amount">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="loanPaymentExtraInput">
                                    This includes extra prepayment
                                </label>
                                <textarea id="loanPaymentNoteInput" rows="3" placeholder="Notes (optional)" aria-label="Payment notes"></textarea>
                                <div class="modal-actions">
                                    <button id="saveLoanPaymentBtn" class="btn-primary" aria-label="Save payment">Save Payment</button>
                                </div>
                            </div>
                        </div>
                    `);
                }

                if (!$("#loanAiModal").length) {
                    $("body").append(`
                        <div id="loanAiModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Loan AI quick tools dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h3>Loan AI Quick Tools</h3>
                                    <button class="modal-close" id="closeLoanAiModal" aria-label="Close loan AI tools">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </button>
                                </div>
                                <div class="loan-ai-grid">
                                    <button id="loanAiPaidYearBtn">How much paid this year?</button>
                                    <button id="loanAiCloseFirstBtn">Which loan to close first?</button>
                                </div>
                                <div class="loan-ai-whatif">
                                    <select id="loanAiLoanSelect" aria-label="Loan for what-if calculation"></select>
                                    <input id="loanAiExtraInput" type="number" min="1" step="1" placeholder="Extra monthly payment amount" aria-label="Extra monthly amount">
                                    <button id="loanAiWhatIfBtn" class="btn-primary">Run What-If</button>
                                </div>
                                <div id="loanAiOutput" class="summary"></div>
                            </div>
                        </div>
                    `);
                }
            }

            function previewLoanCalc() {
                const amount = Number($("#loanTotalAmountInput").val() || 0);
                const rate = Number($("#loanInterestRateInput").val() || 0);
                const tenure = Number($("#loanTenureInput").val() || 0);
                const startDate = $("#loanStartDateInput").val();
                const dueDay = Number($("#loanEmiDueDayInput").val() || 5);

                if (!amount || !tenure || tenure < 1) {
                    $("#loanPreviewMetrics").html('<span class="muted">Fill amount, tenure, interest, and dates to preview EMI.</span>');
                    return;
                }

                const r = rate / 1200;
                const emi = r === 0
                    ? amount / tenure
                    : (amount * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1);
                const totalPayable = emi * tenure;
                const totalInterest = totalPayable - amount;
                const endDate = estimateEndDate(startDate, dueDay, tenure);

                $("#loanPreviewMetrics").html(`
                    <div><strong>Monthly EMI</strong><p>${inr(emi)}</p></div>
                    <div><strong>Total Interest</strong><p>${inr(totalInterest)}</p></div>
                    <div><strong>Total Payable</strong><p>${inr(totalPayable)}</p></div>
                    <div><strong>End Date</strong><p>${endDate ? formatDate(endDate.toISOString().slice(0, 10)) : "-"}</p></div>
                `);
            }

            function firstDueDate(startDateStr, dueDay) {
                if (!startDateStr) return null;
                const start = new Date(startDateStr + "T00:00:00");
                if (Number.isNaN(start.getTime())) return null;
                const y = start.getFullYear();
                const m = start.getMonth();
                let due = new Date(y, m, Math.min(dueDay, 28));
                if (start.getDate() > dueDay) due = new Date(y, m + 1, Math.min(dueDay, 28));
                return due;
            }

            function estimateEndDate(startDateStr, dueDay, months) {
                const first = firstDueDate(startDateStr, dueDay);
                if (!first || !months) return null;
                return new Date(first.getFullYear(), first.getMonth() + Math.max(0, months - 1), Math.min(dueDay, 28));
            }

            function renderSummary() {
                const s = ctx.state.loanSummary || {};
                const loans = ctx.state.loans || [];
                const nextLoan = loans
                    .filter(l => l.nextDueDate && Number(l.totalRemaining || 0) > 0)
                    .sort((a, b) => String(a.nextDueDate).localeCompare(String(b.nextDueDate)))[0];

                $("#loanSummary").html(`
                    <article class="card loan-summary-card"><h3>Total Monthly Burden</h3><p class="loan-big-value">${inr(s.totalMonthlyBurden || 0)}</p></article>
                    <article class="card loan-summary-card"><h3>Total Outstanding</h3><p class="loan-big-value">${inr(s.totalOutstanding || 0)}</p></article>
                    <article class="card loan-summary-card"><h3>Next Due Date</h3><p class="loan-big-value">${s.nextUpcomingDueDate ? formatDate(s.nextUpcomingDueDate) : "-"}</p>${nextLoan ? `<small>${esc(nextLoan.loanName)}</small>` : ""}</article>
                    <article class="card loan-summary-card"><h3>Ends Soonest</h3><p class="loan-big-value">${s.endsSoonestDate ? formatDate(s.endsSoonestDate) : "-"}</p>${s.endsSoonestLoanName ? `<small>${esc(s.endsSoonestLoanName)}</small>` : ""}</article>
                `);
            }

            function renderLoans() {
                const loans = ctx.state.loans || [];
                if (!loans.length) {
                    $("#loanList").html(`
                        <div class="empty-state">
                            <p>No loans in this account yet. Add your first loan and start tracking EMIs.</p>
                            <button id="emptyAddLoanBtn">Add Loan</button>
                        </div>
                    `);
                    return;
                }

                const html = loans.map(loan => {
                    const progress = loan.tenureMonths ? Math.min(100, Math.round((Number(loan.emisPaid || 0) / Number(loan.tenureMonths || 1)) * 100)) : 0;
                    const badge = badgeMeta(loan.nextDueBadge);
                    const paymentLog = (loan.payments || []).slice(0, 12).map(p => `
                        <tr>
                            <td>${formatDate(p.paidDate)}</td>
                            <td>${inr(p.amount)}</td>
                            <td>${p.extraPayment ? "Extra" : "EMI"}</td>
                            <td>${esc(p.note || "-")}</td>
                        </tr>
                    `).join("");

                    return `
                        <article class="item loan-card">
                            <div class="item-row loan-card-top">
                                <div>
                                    <h3>${esc(loan.loanName)}</h3>
                                    <p class="muted">${esc(loan.lenderName)} - ${esc(loan.loanType || "OTHER")}</p>
                                </div>
                                <span class="badge ${badge.cls}">${badge.icon} ${esc(badge.text)}</span>
                            </div>

                            <div class="loan-emi-line">${esc(formatDueLine(loan))}</div>
                            ${loan.lastPayment ? `<p class="muted">Paid on ${formatDate(loan.lastPayment.paidDate)} ${inr(loan.lastPayment.amount)}</p>` : '<p class="muted">No EMI payment logged yet.</p>'}

                            <div class="loan-progress-head">
                                <strong>${Number(loan.emisPaid || 0)} of ${Number(loan.tenureMonths || 0)} EMIs paid</strong>
                                <span>${progress}%</span>
                            </div>
                            <div class="progress-track"><div class="progress-bar" style="width:${progress}%"></div></div>

                            <div class="loan-stats-grid">
                                <div><span>Total Paid</span><strong>${inr(loan.totalPaid)}</strong></div>
                                <div><span>Total Remaining</span><strong>${inr(loan.totalRemaining)}</strong></div>
                                <div><span>Months Remaining</span><strong>${Number(loan.monthsRemaining || 0)}</strong></div>
                                <div><span>Est. Closing Date</span><strong>${loan.estimatedClosingDate ? formatDate(loan.estimatedClosingDate) : "-"}</strong></div>
                            </div>

                            <div class="loan-actions-row">
                                <button class="loan-mark-paid-btn btn-primary" data-id="${loan.id}">Mark as Paid</button>
                                <button class="loan-log-payment-btn" data-id="${loan.id}" data-mode="custom">Custom Payment</button>
                                <button class="loan-log-payment-btn" data-id="${loan.id}" data-mode="extra">Add Extra</button>
                                <button class="loan-edit-btn" data-id="${loan.id}">Edit</button>
                                <button class="loan-delete-btn" data-id="${loan.id}">Delete</button>
                            </div>

                            <div class="loan-history-wrap">
                                <h4>Payment History</h4>
                                <div class="loan-history-table-wrap">
                                    <table class="loan-history-table">
                                        <thead><tr><th>Date</th><th>Amount</th><th>Type</th><th>Note</th></tr></thead>
                                        <tbody>${paymentLog || '<tr><td colspan="4" class="muted">No payments yet</td></tr>'}</tbody>
                                    </table>
                                </div>
                            </div>
                        </article>
                    `;
                }).join("");

                $("#loanList").html(html);
            }

            function loadLoans() {
                if (!ctx.needAuth()) return $.Deferred().resolve().promise();
                return $.when(
                    ctx.call("GET", "/loans"),
                    ctx.call("GET", "/loans/summary")
                ).done((loanRes, summaryRes) => {
                    // ctx.call resolves raw payloads (not jqXHR tuple arrays).
                    // Keep a defensive branch for any future jqXHR-style resolution.
                    const loans = Array.isArray(loanRes?.[0]) ? loanRes[0] : (Array.isArray(loanRes) ? loanRes : []);
                    const summary = Array.isArray(summaryRes) && summaryRes.length === 3 && typeof summaryRes[1] === "string"
                        ? summaryRes[0]
                        : summaryRes;
                    ctx.state.loans = loans;
                    ctx.state.loanSummary = summary || null;
                    renderSummary();
                    renderLoans();
                    syncAiLoanOptions();
                });
            }

            function upLoan(id) {
                if (!ctx.needAuth()) return;
                const loan = (ctx.state.loans || []).find(x => x.id === id) || {};
                $("#loanEditorTitle").text(id ? "Edit Loan" : "Add Loan");
                $("#loanNameInput").val(loan.loanName || "");
                $("#loanLenderInput").val(loan.lenderName || "");
                $("#loanTypeInput").val(loan.loanType || "HOME");
                $("#loanTotalAmountInput").val(id ? Number(loan.totalLoanAmount || 0) : "");
                $("#loanInterestRateInput").val(id ? Number(loan.interestRateAnnual || 0) : "");
                $("#loanTenureInput").val(id ? Number(loan.tenureMonths || 0) : "");
                $("#loanStartDateInput").val(loan.startDate || new Date().toISOString().slice(0, 10));
                $("#loanEmiDueDayInput").val(id ? Number(loan.emiDueDay || 5) : 5);
                $("#saveLoanModalBtn").data("id", id || 0);
                previewLoanCalc();
                $("#loanEditorModal").removeClass("hidden");
            }

            function openPaymentModal(loanId, mode) {
                const loan = (ctx.state.loans || []).find(x => x.id === loanId);
                if (!loan) return ctx.toast("Loan not found", true);
                const isExtra = mode === "extra";
                $("#loanPaymentTitle").text(isExtra ? "Add Extra Payment" : "Log EMI Payment");
                $("#loanPaymentDateInput").val(new Date().toISOString().slice(0, 10));
                $("#loanPaymentAmountInput").val(isExtra ? "" : Number(loan.monthlyEmi || 0));
                $("#loanPaymentExtraInput").prop("checked", isExtra);
                $("#loanPaymentNoteInput").val(isExtra ? "Extra payment" : "EMI paid");
                $("#saveLoanPaymentBtn").data("loan-id", loanId);
                $("#loanPaymentModal").removeClass("hidden");
            }

            function submitPayment(loanId, payload) {
                const before = (ctx.state.loans || []).find(x => x.id === loanId);
                return ctx.call("POST", `/loans/${loanId}/payments`, payload).done(() => {
                    loadLoans().done(() => {
                        const after = (ctx.state.loans || []).find(x => x.id === loanId);
                        if (!after || !before) return;
                        const extraPaid = Number(payload.amount || 0) > Number(before.monthlyEmi || 0) || payload.extraPayment;
                        if (!extraPaid) return;

                        const monthGain = Math.max(0, Number(after.monthsSaved || 0) - Number(before.monthsSaved || 0));
                        const interestGain = Math.max(0, Number(after.interestSaved || 0) - Number(before.interestSaved || 0));
                        if (monthGain > 0 || interestGain > 0) {
                            ctx.toast(`Great! You saved ${monthGain} month(s) and approx ${inr(interestGain)} interest.`);
                        }
                    });
                });
            }

            function syncAiLoanOptions() {
                const options = (ctx.state.loans || [])
                    .map(l => `<option value="${l.id}">${esc(l.loanName)} (${inr(l.monthlyEmi)})</option>`)
                    .join("");
                $("#loanAiLoanSelect").html(options || '<option value="">No loans</option>');
            }

            function runPaidThisYear() {
                const year = new Date().getFullYear();
                const total = (ctx.state.loans || []).reduce((sum, loan) => {
                    const paid = (loan.payments || []).reduce((s, p) => {
                        const dt = new Date(p.paidDate);
                        return s + (dt.getFullYear() === year ? Number(p.amount || 0) : 0);
                    }, 0);
                    return sum + paid;
                }, 0);
                $("#loanAiOutput").html(`<strong>${inr(total)}</strong> paid in ${year}.`);
            }

            function runCloseFirst() {
                const target = (ctx.state.loans || [])
                    .filter(l => Number(l.totalRemaining || 0) > 0)
                    .sort((a, b) => Number(b.interestRateAnnual || 0) - Number(a.interestRateAnnual || 0)
                        || Number(b.totalRemaining || 0) - Number(a.totalRemaining || 0))[0];

                if (!target) {
                    $("#loanAiOutput").html("No active loan to analyze.");
                    return;
                }
                $("#loanAiOutput").html(`
                    Close <strong>${esc(target.loanName)}</strong> first.
                    Highest rate: <strong>${Number(target.interestRateAnnual || 0).toFixed(2)}%</strong>
                    with remaining <strong>${inr(target.totalRemaining)}</strong>.
                `);
            }

            function runWhatIf() {
                const loanId = Number($("#loanAiLoanSelect").val() || 0);
                const extra = Number($("#loanAiExtraInput").val() || 0);
                const loan = (ctx.state.loans || []).find(x => x.id === loanId);
                if (!loan) return $("#loanAiOutput").html("Select a loan first.");
                if (extra <= 0) return $("#loanAiOutput").html("Enter a valid extra monthly amount.");

                const remaining = Number(loan.totalRemaining || 0);
                const emi = Number(loan.monthlyEmi || 0);
                if (remaining <= 0 || emi <= 0) return $("#loanAiOutput").html("Loan is already closed.");

                const normalMonths = Number(loan.monthsRemaining || 0);
                const fasterMonths = Math.ceil(remaining / (emi + extra));
                const savedMonths = Math.max(0, normalMonths - fasterMonths);
                const monthlyRate = Number(loan.interestRateAnnual || 0) / 1200;
                const interestSaved = Math.max(0, extra * monthlyRate * (savedMonths * (savedMonths + 1) / 2));

                $("#loanAiOutput").html(`
                    If you pay <strong>${inr(extra)}</strong> extra each month on
                    <strong>${esc(loan.loanName)}</strong>, you may save about
                    <strong>${savedMonths} month(s)</strong> and approximately
                    <strong>${inr(interestSaved)}</strong> in interest.
                `);
            }

            function bindModalActions() {
                if (!loanModalBound) {
                    $("#closeLoanEditorModal").on("click", () => $("#loanEditorModal").addClass("hidden"));
                    $("#loanTotalAmountInput, #loanInterestRateInput, #loanTenureInput, #loanStartDateInput, #loanEmiDueDayInput")
                        .on("input change", previewLoanCalc);

                    $("#saveLoanModalBtn").on("click", () => {
                        const id = Number($("#saveLoanModalBtn").data("id") || 0);
                        const loanName = ctx.req($("#loanNameInput").val(), "Loan name"); if (!loanName) return;
                        const lenderName = ctx.req($("#loanLenderInput").val(), "Lender name"); if (!lenderName) return;
                        const totalLoanAmount = ctx.pos($("#loanTotalAmountInput").val(), "Total loan amount"); if (!totalLoanAmount) return;
                        const interestRateAnnual = Number($("#loanInterestRateInput").val() || 0);
                        if (Number.isNaN(interestRateAnnual) || interestRateAnnual < 0) return ctx.toast("Interest rate is invalid", true);
                        const tenureMonths = Number($("#loanTenureInput").val() || 0);
                        if (!tenureMonths || tenureMonths < 1) return ctx.toast("Tenure must be at least 1 month", true);
                        const startDate = ctx.req($("#loanStartDateInput").val(), "Start date"); if (!startDate) return;
                        const emiDueDay = Number($("#loanEmiDueDayInput").val() || 0);
                        if (!emiDueDay || emiDueDay < 1 || emiDueDay > 28) return ctx.toast("EMI due day must be between 1 and 28", true);

                        ctx.call(id ? "PUT" : "POST", id ? `/loans/${id}` : "/loans", {
                            loanName: String(loanName).trim(),
                            lenderName: String(lenderName).trim(),
                            loanType: String($("#loanTypeInput").val() || "HOME").toUpperCase(),
                            totalLoanAmount,
                            interestRateAnnual,
                            tenureMonths,
                            startDate,
                            emiDueDay
                        }).done(() => {
                            $("#loanEditorModal").addClass("hidden");
                            ctx.toast("Loan saved");
                            loadLoans();
                        });
                    });
                    loanModalBound = true;
                }

                if (!paymentModalBound) {
                    $("#closeLoanPaymentModal").on("click", () => $("#loanPaymentModal").addClass("hidden"));
                    $("#saveLoanPaymentBtn").on("click", () => {
                        const loanId = Number($("#saveLoanPaymentBtn").data("loan-id") || 0);
                        const paidDate = $("#loanPaymentDateInput").val() || new Date().toISOString().slice(0, 10);
                        const amount = ctx.pos($("#loanPaymentAmountInput").val(), "Paid amount"); if (!amount) return;
                        const extraPayment = $("#loanPaymentExtraInput").is(":checked");
                        const note = $("#loanPaymentNoteInput").val().trim();
                        submitPayment(loanId, { paidDate, amount, extraPayment, note }).done(() => {
                            $("#loanPaymentModal").addClass("hidden");
                            ctx.toast("Payment logged");
                        });
                    });
                    paymentModalBound = true;
                }

                if (!aiModalBound) {
                    $("#closeLoanAiModal").on("click", () => $("#loanAiModal").addClass("hidden"));
                    $("#loanAiPaidYearBtn").on("click", runPaidThisYear);
                    $("#loanAiCloseFirstBtn").on("click", runCloseFirst);
                    $("#loanAiWhatIfBtn").on("click", runWhatIf);
                    aiModalBound = true;
                }
            }

            ctx.modules.loans = { loadLoans };
            ensureModals();
            bindModalActions();

            $("#addLoanBtn").on("click", () => upLoan());
            $("#loanAiToolsBtn").on("click", () => {
                syncAiLoanOptions();
                $("#loanAiOutput").html("");
                $("#loanAiModal").removeClass("hidden");
            });

            $(document).on("click", "#emptyAddLoanBtn", () => upLoan());
            $(document).on("click", ".loan-edit-btn", function () { upLoan(Number($(this).data("id"))); });
            $(document).on("click", ".loan-delete-btn", function () {
                const id = Number($(this).data("id"));
                ctx.del(`/loans/${id}`, () => loadLoans());
            });
            $(document).on("click", ".loan-mark-paid-btn", function () {
                const loanId = Number($(this).data("id"));
                submitPayment(loanId, { paidDate: new Date().toISOString().slice(0, 10) }).done(() => {
                    ctx.toast("EMI marked as paid");
                });
            });
            $(document).on("click", ".loan-log-payment-btn", function () {
                openPaymentModal(Number($(this).data("id")), String($(this).data("mode") || "custom"));
            });
        }
    };
})();
