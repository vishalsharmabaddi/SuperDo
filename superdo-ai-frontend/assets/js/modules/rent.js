(function () {
    window.SuperDoModules = window.SuperDoModules || {};

    window.SuperDoModules.rent = {
        init(ctx) {
            let rentModalBound = false;
            let marriageModalBound = false;
            let receiptModalBound = false;
            let currentRentReceiptText = "";
            let currentRentReceiptHtml = "";
            let celebrationFilter = "ALL";
            const RENT_SAMPLE_MIN_ROWS = 120;
            const rentTableState = {
                month: "",
                fromDate: "",
                toDate: "",
                page: 1,
                pageSize: 10
            };
            let rentDemoRows = [];

            function setButtonLoading($btn, loading, label) {
                if (loading) {
                    $btn.data("original-text", $btn.text());
                    $btn.prop("disabled", true).text(label || "Saving...");
                    return;
                }
                const original = $btn.data("original-text");
                $btn.prop("disabled", false).text(original || "Save");
            }

            function parseNonNegative(v, label) {
                const n = Number(v);
                if (String(v).trim() === "" || Number.isNaN(n) || n < 0) {
                    ctx.toast(`${label} cannot be negative`, true);
                    return null;
                }
                return n;
            }

            function ensureModals() {
                if (!$("#rentEditorModal").length) {
                    $("body").append(`
                        <div id="rentEditorModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Rent editor dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h3 id="rentEditorTitle">Add Rent Record</h3>
                                    <button class="modal-close" id="closeRentEditorModal" aria-label="Close rent editor">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </button>
                                </div>
                                <input id="rentAmountInput" type="number" min="0.01" step="0.01" placeholder="Rent amount" aria-label="Rent amount">
                                <input id="rentDueDateInput" type="date" aria-label="Due date">
                                <select id="rentStatusInput" aria-label="Payment status">
                                    <option value="PENDING">PENDING</option>
                                    <option value="PAID">PAID</option>
                                    <option value="OVERDUE">OVERDUE</option>
                                </select>
                                <input id="rentMonthKeyInput" placeholder="Month key (YYYY-MM)" aria-label="Month key">
                                <div class="rent-role-field">
                                    <label for="rentActorRoleInput">You Are</label>
                                    <select id="rentActorRoleInput" aria-label="Select your role in this rent">
                                        <option value="TENANT">Tenant (Payer)</option>
                                        <option value="LANDLORD">Landlord (Receiver)</option>
                                    </select>
                                </div>
                                <div class="rent-role-field">
                                    <label id="rentCounterpartyLabel" for="rentCounterpartyNameInput">Counterparty (Landlord)</label>
                                    <input id="rentCounterpartyNameInput" placeholder="Counterparty name" aria-label="Counterparty name">
                                    <p id="rentRoleHint" class="muted rent-role-hint">Choose your role to auto-adjust payer/receiver mapping.</p>
                                </div>
                                <textarea id="rentNotesInput" rows="3" placeholder="Notes (optional)" aria-label="Rent notes"></textarea>
                                <div class="modal-actions">
                                    <button id="saveRentModalBtn" class="btn-primary" aria-label="Save rent record">Save</button>
                                </div>
                            </div>
                        </div>
                    `);
                }

                if (!$("#marriageEditorModal").length) {
                    $("body").append(`
                        <div id="marriageEditorModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Celebration planner editor dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h3 id="marriageEditorTitle">Add Celebration Item</h3>
                                    <button class="modal-close" id="closeMarriageEditorModal" aria-label="Close celebration planner editor">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </button>
                                </div>
                                <input id="marriageEventNameInput" placeholder="Event name" aria-label="Event name">
                                <select id="marriageEventTypeInput" aria-label="Event type">
                                    <option value="WEDDING">Wedding 💍</option>
                                    <option value="ANNIVERSARY">Anniversary 💖</option>
                                    <option value="BIRTHDAY">Birthday 🎂</option>
                                    <option value="ENGAGEMENT">Engagement 💐</option>
                                    <option value="PARTY">Party 🎉</option>
                                    <option value="OTHER">Other ✨</option>
                                </select>
                                <input id="marriageEventDateInput" type="date" aria-label="Event date">
                                <input id="marriageVenueInput" placeholder="Venue" aria-label="Venue">
                                <input id="marriageVendorNameInput" placeholder="Vendor" aria-label="Vendor">
                                <input id="marriageVendorContactInput" placeholder="Vendor contact" aria-label="Vendor contact">
                                <div class="celebration-finance-grid">
                                    <div class="rent-role-field">
                                        <label for="marriageGuestCountInput">Total Guest Count</label>
                                        <input id="marriageGuestCountInput" type="number" min="0" step="1" placeholder="e.g. 150" aria-label="Total guest count">
                                    </div>
                                    <div class="rent-role-field">
                                        <label for="marriageBudgetInput">Total Budget</label>
                                        <input id="marriageBudgetInput" type="number" min="0" step="0.01" placeholder="e.g. 50000" aria-label="Budget amount">
                                    </div>
                                    <div class="rent-role-field">
                                        <label for="marriageExpenseInput">Amount Spent</label>
                                        <input id="marriageExpenseInput" type="number" min="0" step="0.01" placeholder="e.g. 12000" aria-label="Spent amount">
                                    </div>
                                    <div class="rent-role-field">
                                        <label for="marriageRemainingInput">Remaining Balance</label>
                                        <input id="marriageRemainingInput" type="text" placeholder="Auto-calculated" aria-label="Remaining balance" readonly>
                                    </div>
                                </div>
                                <p class="muted celebration-form-hint">Fill budget and spent to auto-calculate remaining balance.</p>
                                <select id="marriageStatusInput" aria-label="Event status">
                                    <option value="UPCOMING">Upcoming</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="marriageDoneInput">
                                    Mark as completed
                                </label>
                                <textarea id="marriageTimelineInput" rows="3" placeholder="Timeline note (optional)" aria-label="Timeline note"></textarea>
                                <div class="modal-actions">
                                    <button id="saveMarriageModalBtn" class="btn-primary" aria-label="Save planner item">Save</button>
                                </div>
                            </div>
                        </div>
                    `);
                }

                if (!$("#receiptShareModal").length) {
                    $("body").append(`
                        <div id="receiptShareModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Share receipt dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h3>Payment Receipt</h3>
                                    <button class="modal-close" id="closeReceiptShareModal" aria-label="Close receipt dialog">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </button>
                                </div>
                                <div id="receiptCardPreview" class="summary" aria-label="Receipt preview"></div>
                                <div class="modal-actions">
                                    <button id="shareReceiptWhatsAppBtn" class="btn-primary" aria-label="Send receipt via WhatsApp">WhatsApp</button>
                                    <button id="shareReceiptNativeBtn" aria-label="Share receipt">Share</button>
                                    <button id="shareReceiptTelegramBtn" aria-label="Send receipt via Telegram">Telegram</button>
                                    <button id="downloadReceiptPdfBtn" aria-label="Download receipt PDF">PDF</button>
                                    <button id="copyReceiptBtn" aria-label="Copy receipt text">Copy</button>
                                </div>
                            </div>
                        </div>
                    `);
                }
            }

            function bindModalActions() {
                if (!rentModalBound) {
                    $("#closeRentEditorModal").on("click", () => $("#rentEditorModal").addClass("hidden"));
                    $("#saveRentModalBtn").on("click", () => {
                        const $btn = $("#saveRentModalBtn");
                        const id = Number($("#saveRentModalBtn").data("id") || 0);
                        const rentAmount = ctx.pos($("#rentAmountInput").val(), "Rent amount"); if (!rentAmount) return;
                        const dueDate = ctx.req($("#rentDueDateInput").val(), "Due date"); if (!dueDate) return;
                        const paymentStatus = String($("#rentStatusInput").val() || "").toUpperCase();
                        if (!["PAID", "PENDING", "OVERDUE"].includes(paymentStatus)) return ctx.toast("Status invalid", true);
                        const monthKey = ($("#rentMonthKeyInput").val() || dueDate.slice(0, 7)).trim();
                        const actorRole = String($("#rentActorRoleInput").val() || "TENANT").toUpperCase();
                        const counterpartyInput = ($("#rentCounterpartyNameInput").val() || "").trim();
                        const selfName = (getActorName() || "").trim() || "Self";
                        const counterpartyName = counterpartyInput || (actorRole === "TENANT" ? "Landlord" : "Tenant");
                        const tenantName = actorRole === "TENANT" ? selfName : counterpartyName;
                        const landlordName = actorRole === "LANDLORD" ? selfName : counterpartyName;

                        setButtonLoading($btn, true, "Saving...");
                        ctx.call(id ? "PUT" : "POST", id ? `/rent-records/${id}` : "/rent-records", {
                            tenantName,
                            landlordName,
                            rentAmount,
                            dueDate,
                            paymentStatus,
                            monthKey,
                            notes: ($("#rentNotesInput").val() || "").trim()
                        }).done(() => {
                            $("#rentEditorModal").addClass("hidden");
                            ctx.toast("Saved");
                            loadRent().done(ctx.renderDashboard);
                        }).always(() => {
                            setButtonLoading($btn, false);
                        });
                    });
                    rentModalBound = true;
                }

                if (!marriageModalBound) {
                    $("#closeMarriageEditorModal").on("click", () => $("#marriageEditorModal").addClass("hidden"));
                    $("#marriageBudgetInput, #marriageExpenseInput").on("input", updateCelebrationRemaining);
                    $("#marriageDoneInput").on("change", function () {
                        if ($(this).is(":checked")) $("#marriageStatusInput").val("COMPLETED");
                    });
                    $("#marriageStatusInput").on("change", function () {
                        const st = String($(this).val() || "UPCOMING").toUpperCase();
                        $("#marriageDoneInput").prop("checked", st === "COMPLETED");
                    });
                    $("#saveMarriageModalBtn").on("click", () => {
                        const $btn = $("#saveMarriageModalBtn");
                        const id = Number($("#saveMarriageModalBtn").data("id") || 0);
                        const eventName = ctx.req($("#marriageEventNameInput").val().trim(), "Event name"); if (!eventName) return;
                        const eventDate = ctx.req($("#marriageEventDateInput").val(), "Date"); if (!eventDate) return;
                        const budgetAmount = parseNonNegative($("#marriageBudgetInput").val() || "0", "Budget"); if (budgetAmount === null) return;
                        const expenseAmount = parseNonNegative($("#marriageExpenseInput").val() || "0", "Spent"); if (expenseAmount === null) return;
                        const guestCountRaw = String($("#marriageGuestCountInput").val() || "").trim();
                        const guestCount = guestCountRaw === "" ? null : Number(guestCountRaw);
                        if (guestCountRaw !== "" && (!Number.isFinite(guestCount) || guestCount < 0)) {
                            ctx.toast("Guest count cannot be negative", true);
                            return;
                        }
                        const done = $("#marriageDoneInput").is(":checked");
                        const timeline = ($("#marriageTimelineInput").val() || "").trim();

                        setButtonLoading($btn, true, "Saving...");
                        ctx.call(id ? "PUT" : "POST", id ? `/marriage-planner/${id}` : "/marriage-planner", {
                            eventName,
                            eventDate,
                            budgetAmount,
                            expenseAmount,
                            vendorType: ($("#marriageEventTypeInput").val() || "OTHER").trim() || "OTHER",
                            vendorName: ($("#marriageVendorNameInput").val() || "").trim(),
                            vendorContact: ($("#marriageVendorContactInput").val() || "").trim(),
                            venue: ($("#marriageVenueInput").val() || "").trim(),
                            guestCount,
                            status: done ? "COMPLETED" : String($("#marriageStatusInput").val() || "UPCOMING").toUpperCase(),
                            guestName: "",
                            timelineNote: timeline
                        }).done(() => {
                            $("#marriageEditorModal").addClass("hidden");
                            ctx.toast("Saved");
                            loadMarriage().done(ctx.renderDashboard);
                        }).always(() => {
                            setButtonLoading($btn, false);
                        });
                    });
                    marriageModalBound = true;
                }

                if (!receiptModalBound) {
                    $("#closeReceiptShareModal").on("click", () => $("#receiptShareModal").addClass("hidden"));

                    $("#shareReceiptWhatsAppBtn").on("click", () => {
                        const text = (currentRentReceiptText || "").trim();
                        if (!text) return ctx.toast("Nothing to share", true);
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
                    });

                    $("#shareReceiptTelegramBtn").on("click", () => {
                        const text = (currentRentReceiptText || "").trim();
                        if (!text) return ctx.toast("Nothing to share", true);
                        window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
                    });

                    $("#shareReceiptNativeBtn").on("click", async () => {
                        const text = (currentRentReceiptText || "").trim();
                        if (!text) return ctx.toast("Nothing to share", true);

                        if (!navigator.share) {
                            ctx.toast("Native share not supported on this browser", true);
                            return;
                        }

                        try {
                            await navigator.share({
                                title: "SuperDo AI - Rent Receipt",
                                text
                            });
                        } catch (err) {
                            if (err && err.name !== "AbortError") ctx.toast("Share failed", true);
                        }
                    });

                    $("#copyReceiptBtn").on("click", async () => {
                        const text = (currentRentReceiptText || "").trim();
                        if (!text) return ctx.toast("Nothing to copy", true);

                        try {
                            if (navigator.clipboard?.writeText) {
                                await navigator.clipboard.writeText(text);
                            } else {
                                const ta = document.createElement("textarea");
                                ta.value = text;
                                document.body.appendChild(ta);
                                ta.select();
                                document.execCommand("copy");
                                ta.remove();
                            }
                            ctx.toast("Receipt copied");
                        } catch {
                            ctx.toast("Copy failed", true);
                        }
                    });

                    $("#downloadReceiptPdfBtn").on("click", () => {
                        if (!currentRentReceiptHtml) return ctx.toast("Nothing to export", true);
                        exportReceiptPdf(currentRentReceiptHtml, "rent-receipt");
                    });

                    receiptModalBound = true;
                }

                $(document).on("click", "#rentEditorModal", function (e) {
                    if (e.target === this) $("#rentEditorModal").addClass("hidden");
                });
                $(document).on("click", "#marriageEditorModal", function (e) {
                    if (e.target === this) $("#marriageEditorModal").addClass("hidden");
                });
                $(document).on("click", "#receiptShareModal", function (e) {
                    if (e.target === this) $("#receiptShareModal").addClass("hidden");
                });
            }

            function rentStatus(row) {
                if (String(row.paymentStatus || "").toUpperCase() === "PAID") return "PAID";
                if (row.dueDate && row.dueDate < new Date().toISOString().slice(0, 10)) return "OVERDUE";
                return "PENDING";
            }

            function updateCelebrationRemaining() {
                const budgetRaw = String($("#marriageBudgetInput").val() || "").trim();
                const spentRaw = String($("#marriageExpenseInput").val() || "").trim();
                if (!budgetRaw && !spentRaw) {
                    $("#marriageRemainingInput").val("");
                    return;
                }
                const budget = Number(budgetRaw || 0);
                const spent = Number(spentRaw || 0);
                const remaining = budget - spent;
                $("#marriageRemainingInput").val(ctx.money(remaining));
            }

            function normalizeCelebrationType(v) {
                const raw = String(v || "").toUpperCase().trim();
                if (["WEDDING", "ANNIVERSARY", "BIRTHDAY", "ENGAGEMENT", "PARTY", "OTHER"].includes(raw)) return raw;
                return "OTHER";
            }

            function celebrationTypeMeta(type) {
                const map = {
                    WEDDING: { label: "Wedding", emoji: "💍", cls: "wedding" },
                    ANNIVERSARY: { label: "Anniversary", emoji: "💖", cls: "anniversary" },
                    BIRTHDAY: { label: "Birthday", emoji: "🎂", cls: "birthday" },
                    ENGAGEMENT: { label: "Engagement", emoji: "💐", cls: "engagement" },
                    PARTY: { label: "Party", emoji: "🎉", cls: "party" },
                    OTHER: { label: "Other", emoji: "✨", cls: "other" }
                };
                return map[normalizeCelebrationType(type)] || map.OTHER;
            }

            function normalizeCelebrationStatus(row) {
                if (String(row.status || "").toUpperCase() === "COMPLETED") return "COMPLETED";
                if (String(row.status || "").toUpperCase() === "IN_PROGRESS") return "IN_PROGRESS";
                if (String(row.timelineNote || "").toUpperCase().startsWith("DONE:")) return "COMPLETED";
                const today = new Date().toISOString().slice(0, 10);
                if (row.eventDate && row.eventDate < today) return "IN_PROGRESS";
                return "UPCOMING";
            }

            function countdownText(v, status) {
                if (!v || status !== "UPCOMING") return "";
                const target = new Date(v);
                const now = new Date();
                target.setHours(0, 0, 0, 0);
                now.setHours(0, 0, 0, 0);
                const days = Math.ceil((target - now) / 86400000);
                if (days > 1) return `${days} days left`;
                if (days === 1) return "1 day left";
                if (days === 0) return "Today";
                return "";
            }

            function getActorName() {
                try {
                    const profile = JSON.parse(localStorage.getItem("superdo_profile") || "{}");
                    const n = String(profile?.name || "").trim();
                    return n || "Self";
                } catch {
                    return "Self";
                }
            }

            function applyActorRoleUi(role, counterpartyName) {
                const actorRole = String(role || "TENANT").toUpperCase() === "LANDLORD" ? "LANDLORD" : "TENANT";
                const counterpartyLabel = actorRole === "TENANT" ? "Counterparty (Landlord)" : "Counterparty (Tenant)";
                const counterpartyPlaceholder = actorRole === "TENANT" ? "Landlord name" : "Tenant name";
                const hint = actorRole === "TENANT"
                    ? "You are paying rent to landlord."
                    : "You are receiving rent from tenant.";

                $("#rentCounterpartyLabel").text(counterpartyLabel);
                $("#rentCounterpartyNameInput").attr("placeholder", counterpartyPlaceholder);
                $("#rentRoleHint").text(hint);
                $("#rentActorRoleInput").val(actorRole);
                if (typeof counterpartyName === "string") $("#rentCounterpartyNameInput").val(counterpartyName);
            }

            function escHtml(v) {
                return String(v == null ? "" : v)
                    .replaceAll("&", "&amp;")
                    .replaceAll("<", "&lt;")
                    .replaceAll(">", "&gt;")
                    .replaceAll('"', "&quot;");
            }

            function normalizeDate(v) {
                const d = new Date(v);
                if (Number.isNaN(d.getTime())) return "";
                return d.toISOString().slice(0, 10);
            }

            function normalizeMonthKey(row) {
                if (row.monthKey && /^\d{4}-\d{2}$/.test(row.monthKey)) return row.monthKey;
                if (row.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(row.dueDate)) return row.dueDate.slice(0, 7);
                return "";
            }

            function normalizeRentRows(rows, isSample) {
                return (rows || []).map((row, i) => {
                    const dueDate = normalizeDate(row.dueDate);
                    const monthKey = normalizeMonthKey({ ...row, dueDate });
                    return {
                        ...row,
                        id: Number(row.id || 0),
                        dueDate,
                        monthKey,
                        paymentStatus: String(row.paymentStatus || "").toUpperCase(),
                        _sample: Boolean(isSample),
                        _key: `${isSample ? "demo" : "live"}-${row.id || i}`
                    };
                });
            }

            function createDemoRentRows(count) {
                const today = new Date();
                const statuses = ["PAID", "PENDING", "OVERDUE"];
                const tenants = ["Aarav", "Neha", "Rohit", "Priya", "Ishaan", "Kiran", "Anaya", "Kabir"];
                const landlords = ["Sharma", "Mehta", "Patel", "Khan", "Singh", "Verma", "Gupta", "Reddy"];
                const rows = [];

                for (let i = 0; i < count; i++) {
                    const d = new Date(today.getFullYear(), today.getMonth() - (i % 20), (i % 27) + 1);
                    const dueDate = d.toISOString().slice(0, 10);
                    const monthKey = dueDate.slice(0, 7);
                    const rentAmount = 900 + ((i * 37) % 2200);
                    const paymentStatus = statuses[i % statuses.length];
                    rows.push({
                        id: -(i + 1),
                        tenantName: `${tenants[i % tenants.length]} ${i + 1}`,
                        landlordName: `${landlords[i % landlords.length]} Estates`,
                        rentAmount,
                        dueDate,
                        paymentStatus,
                        monthKey,
                        notes: i % 6 === 0 ? "Auto-generated sample row for UI testing" : "",
                        _sample: true
                    });
                }
                return normalizeRentRows(rows, true);
            }

            function getEffectiveRentRows() {
                const liveRows = normalizeRentRows(ctx.state.rent, false);
                if (liveRows.length) return liveRows;
                if (!rentDemoRows.length) rentDemoRows = createDemoRentRows(RENT_SAMPLE_MIN_ROWS);
                return rentDemoRows;
            }

            function filterRentRows(rows) {
                const m = rentTableState.month;
                const from = rentTableState.fromDate;
                const to = rentTableState.toDate;

                return rows.filter(row => {
                    if (m && row.monthKey !== m) return false;
                    if (from && (!row.dueDate || row.dueDate < from)) return false;
                    if (to && (!row.dueDate || row.dueDate > to)) return false;
                    return true;
                }).sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""));
            }

            function buildPaginationTokens(current, total) {
                if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
                const tokens = [1];
                if (current > 3) tokens.push("ellipsis-left");
                for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) tokens.push(p);
                if (current < total - 2) tokens.push("ellipsis-right");
                tokens.push(total);
                return tokens;
            }

            function renderRentFilters(pageSizeValue, totalRawRows, usingSampleData) {
                const sampleTag = usingSampleData ? `<span class="badge warning rent-demo-badge">Sample dataset (${totalRawRows} rows)</span>` : "";
                return `
                    <div class="rent-table-toolbar">
                        <div class="rent-filter-group">
                            <label for="rentMonthFilter">Month</label>
                            <input id="rentMonthFilter" type="month" value="${escHtml(rentTableState.month)}" aria-label="Filter by month">
                        </div>
                        <div class="rent-filter-group">
                            <label for="rentDateFromFilter">Date From</label>
                            <input id="rentDateFromFilter" type="date" value="${escHtml(rentTableState.fromDate)}" aria-label="Filter date from">
                        </div>
                        <div class="rent-filter-group">
                            <label for="rentDateToFilter">Date To</label>
                            <input id="rentDateToFilter" type="date" value="${escHtml(rentTableState.toDate)}" aria-label="Filter date to">
                        </div>
                        <div class="rent-filter-group rent-page-size-group">
                            <label for="rentItemsPerPage">Items / page</label>
                            <select id="rentItemsPerPage" aria-label="Items per page">
                                <option value="5" ${pageSizeValue === 5 ? "selected" : ""}>5</option>
                                <option value="10" ${pageSizeValue === 10 ? "selected" : ""}>10</option>
                                <option value="25" ${pageSizeValue === 25 ? "selected" : ""}>25</option>
                                <option value="50" ${pageSizeValue === 50 ? "selected" : ""}>50</option>
                            </select>
                        </div>
                        <div class="rent-toolbar-actions">
                            <button id="rentClearFiltersBtn" type="button">Clear Filters</button>
                            ${sampleTag}
                        </div>
                    </div>
                `;
            }

            function renderRentPagination(currentPage, totalPages) {
                if (totalPages <= 1) {
                    return `<div class="rent-pagination rent-pagination-compact"><span class="muted">Single page</span></div>`;
                }

                const tokens = buildPaginationTokens(currentPage, totalPages);
                const pageButtons = tokens.map(t => {
                    if (typeof t === "string") return `<span class="rent-page-ellipsis" aria-hidden="true">...</span>`;
                    const active = t === currentPage ? "active" : "";
                    return `<button class="rent-page-btn ${active}" data-page="${t}" aria-label="Go to page ${t}">${t}</button>`;
                }).join("");

                return `
                    <div class="rent-pagination" aria-label="Rent pagination">
                        <button class="rent-nav-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>Previous</button>
                        <div class="rent-page-numbers">${pageButtons}</div>
                        <button class="rent-nav-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}>Next</button>
                    </div>
                `;
            }

            function renderRent() {
                const rows = getEffectiveRentRows();
                const usingSampleData = rows.length > 0 && rows.every(r => r._sample);
                const filteredRows = filterRentRows(rows);

                const pageSize = Number(rentTableState.pageSize) || 10;
                const total = filteredRows.length;
                const totalPages = Math.max(1, Math.ceil(total / pageSize));
                if (rentTableState.page > totalPages) rentTableState.page = totalPages;
                const page = Math.max(1, rentTableState.page);
                const start = total ? ((page - 1) * pageSize) + 1 : 0;
                const end = total ? Math.min(page * pageSize, total) : 0;
                const pageRows = filteredRows.slice(start ? start - 1 : 0, end);

                const toolbarHtml = renderRentFilters(pageSize, rows.length, usingSampleData);
                const summaryHtml = `<div class="rent-results-summary">Showing ${start} to ${end} of ${total} total results</div>`;
                const paginationHtml = renderRentPagination(page, totalPages);

                const bodyHtml = pageRows.map(r => {
                    const st = rentStatus(r);
                    const cls = st === "PAID" ? "success" : st === "OVERDUE" ? "danger" : "warning";
                    const rowTag = r._sample ? `<span class="badge">Sample</span>` : "";
                    const payerName = r.payerDisplayName || r.tenantName || "-";
                    const receiverName = r.receiverDisplayName || r.landlordName || "-";
                    const receiptBtn = st === "PAID" && !r._sample ? `<button class="share-rent-receipt" data-id="${r.id}">Receipt</button>` : "";
                    const actionButtons = r._sample
                        ? `<button type="button" class="rent-sample-action" disabled title="Sample data row">Read-only</button>`
                        : `<button class="edit-rent" data-id="${r.id}">Edit</button><button class="del-rent" data-id="${r.id}">Delete</button>`;
                    return `
                        <tr>
                            <td><strong>${escHtml(r.monthKey || "-")}</strong><div class="muted">${escHtml(r.notes || "-")}</div></td>
                            <td>${escHtml(payerName)}</td>
                            <td>${escHtml(receiverName)}</td>
                            <td>${ctx.money(r.rentAmount)}</td>
                            <td>${escHtml(r.dueDate || "-")}</td>
                            <td><span class="badge ${cls}">${st}</span> ${rowTag}</td>
                            <td class="rent-actions-cell">${receiptBtn}${actionButtons}</td>
                        </tr>
                    `;
                }).join("");

                const emptyHtml = `
                    <div class="empty-state">
                        <p>No records match these filters.</p>
                        <button id="rentClearFiltersEmptyBtn" type="button">Reset Filters</button>
                    </div>
                `;

                const tableHtml = `
                    <div class="rent-table-shell">
                        ${toolbarHtml}
                        ${summaryHtml}
                        <div class="rent-table-wrap">
                            ${total ? `
                                <table class="rent-table" aria-label="Rent records data table">
                                    <thead>
                                        <tr>
                                            <th>Month</th>
                                            <th>Payer (Tenant)</th>
                                            <th>Receiver (Landlord)</th>
                                            <th>Amount</th>
                                            <th>Due Date</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>${bodyHtml}</tbody>
                                </table>
                            ` : emptyHtml}
                        </div>
                        ${paginationHtml}
                    </div>
                `;

                $("#rentList").html(tableHtml);
            }

            function renderMarriage() {
                const rows = ctx.state.marriage.map(m => {
                    const status = normalizeCelebrationStatus(m);
                    const typeMeta = celebrationTypeMeta(m.vendorType);
                    const budget = Number(m.budgetAmount || 0);
                    const spent = Number(m.expenseAmount || 0);
                    const progress = budget > 0 ? Math.min(100, Math.max(0, Math.round((spent / budget) * 100))) : 0;
                    return { ...m, _status: status, _typeMeta: typeMeta, _budget: budget, _spent: spent, _progress: progress };
                });

                const completed = rows.filter(r => r._status === "COMPLETED").length;
                const total = rows.length;
                const topProgress = total ? Math.round((completed / total) * 100) : 0;
                const filters = [
                    ["ALL", "All"],
                    ["UPCOMING", "Upcoming"],
                    ["COMPLETED", "Completed"]
                ].map(([key, label]) => `<button class="celebration-filter-btn ${celebrationFilter === key ? "active" : ""}" data-filter="${key}">${label}</button>`).join("");

                $("#marriageSummary").html(`
                    <div class="celebration-summary-shell">
                        <div class="celebration-summary-row">
                            <strong>Overall Progress</strong>
                            <span>${completed}/${total} completed</span>
                        </div>
                        <div class="celebration-progress-track"><div class="celebration-progress-fill" style="width:${topProgress}%"></div></div>
                        <div class="celebration-filter-row">${filters}</div>
                    </div>
                `);

                const filtered = rows.filter(r => {
                    if (celebrationFilter === "ALL") return true;
                    if (celebrationFilter === "UPCOMING") return r._status !== "COMPLETED";
                    if (celebrationFilter === "COMPLETED") return r._status === "COMPLETED";
                    return true;
                });

                const html = filtered.map(m => {
                    const countdown = countdownText(m.eventDate, m._status);
                    const completedCls = m._status === "COMPLETED" ? "celebration-completed" : "";
                    const statusCls = m._status === "COMPLETED" ? "success" : m._status === "IN_PROGRESS" ? "warning" : "badge-upcoming";
                    const remaining = m._budget - m._spent;
                    const venue = m.venue || "-";
                    const guestCount = Number(m.guestCount || 0);
                    return `
                        <article class="item celebration-card ${completedCls}">
                            <div class="item-row">
                                <h3>${escHtml(m.eventName || "-")}</h3>
                                <div class="celebration-badge-group">
                                    <span class="badge celebration-type ${m._typeMeta.cls}">${m._typeMeta.emoji} ${m._typeMeta.label}</span>
                                    <span class="badge ${statusCls}">${m._status.replace("_", " ")}</span>
                                </div>
                            </div>
                            <p class="celebration-meta-line">📅 ${escHtml(m.eventDate || "-")} ${countdown ? `• ⏳ ${escHtml(countdown)}` : ""}</p>
                            <p class="celebration-meta-line">📍 ${escHtml(venue)} • 👥 ${guestCount} guests</p>
                            <p class="celebration-meta-line">🏢 ${escHtml(m.vendorName || "-")} ${m.vendorContact ? `• ☎ ${escHtml(m.vendorContact)}` : ""}</p>
                            <div class="celebration-budget-row">
                                <span>Budget ${ctx.money(m._budget)}</span>
                                <span>Spent ${ctx.money(m._spent)} • Remaining ${ctx.money(remaining)}</span>
                            </div>
                            <div class="celebration-budget-track"><div class="celebration-budget-fill" style="width:${m._progress}%"></div></div>
                            ${m.timelineNote ? `<p class="muted">${escHtml(m.timelineNote)}</p>` : ""}
                            <div class="item-actions"><button class="edit-marriage" data-id="${m.id}">Edit</button><button class="del-marriage" data-id="${m.id}">Delete</button></div>
                        </article>
                    `;
                }).join("");

                $("#marriageList").html(html || `<div class="empty-state celebration-empty-state"><p>No celebration items yet. Start planning your special moments.</p><button id="emptyAddMarriage">Create Celebration Item</button></div>`);
            }

            function loadRent() {
                return ctx.call("GET", "/rent-records").done(r => {
                    ctx.state.rent = r || [];
                    rentTableState.page = 1;
                    renderRent();
                });
            }

            function loadMarriage() {
                return ctx.call("GET", "/marriage-planner").done(r => {
                    ctx.state.marriage = r || [];
                    renderMarriage();
                });
            }

            function upRent(id) {
                if (!ctx.needAuth()) {
                    ctx.toast("Please sign in to add or edit rent records", true);
                    return;
                }
                const o = ctx.state.rent.find(x => x.id === id) || {};
                $("#rentEditorTitle").text(id ? "Edit Rent Record" : "Add Rent Record");
                $("#rentAmountInput").val(o.rentAmount || "");
                $("#rentDueDateInput").val(o.dueDate || new Date().toISOString().slice(0, 10));
                $("#rentStatusInput").val(String(o.paymentStatus || "PENDING").toUpperCase());
                $("#rentMonthKeyInput").val(o.monthKey || (o.dueDate ? o.dueDate.slice(0, 7) : new Date().toISOString().slice(0, 7)));
                const selfName = getActorName().trim().toLowerCase();
                let actorRole = "TENANT";
                if (String(o.landlordName || "").trim().toLowerCase() === selfName || (o.payerPartyId && !o.receiverPartyId)) {
                    actorRole = "LANDLORD";
                }
                const counterpartyName = actorRole === "TENANT"
                    ? (o.receiverDisplayName || o.landlordName || "")
                    : (o.payerDisplayName || o.tenantName || "");
                applyActorRoleUi(actorRole, counterpartyName);
                $("#rentNotesInput").val(o.notes || "");
                $("#saveRentModalBtn").data("id", id || 0);
                $("#rentEditorModal").removeClass("hidden");
            }

            function upMarriage(id) {
                if (!ctx.needAuth()) return;
                const o = ctx.state.marriage.find(x => x.id === id) || {};
                $("#marriageEditorTitle").text(id ? "Edit Celebration Item" : "Add Celebration Item");
                $("#marriageEventNameInput").val(o.eventName || "");
                $("#marriageEventTypeInput").val(normalizeCelebrationType(o.vendorType));
                $("#marriageEventDateInput").val(o.eventDate || new Date().toISOString().slice(0, 10));
                $("#marriageVenueInput").val(o.venue || "");
                $("#marriageVendorNameInput").val(o.vendorName || "");
                $("#marriageVendorContactInput").val(o.vendorContact || "");
                $("#marriageGuestCountInput").val(id ? (o.guestCount ?? "") : "");
                $("#marriageBudgetInput").val(id ? (o.budgetAmount ?? "") : "");
                $("#marriageExpenseInput").val(id ? (o.expenseAmount ?? "") : "");
                const normalized = normalizeCelebrationStatus(o);
                $("#marriageStatusInput").val(normalized);
                $("#marriageDoneInput").prop("checked", normalized === "COMPLETED");
                $("#marriageTimelineInput").val(String(o.timelineNote || "").replace(/^DONE:\s*/i, "").trim());
                updateCelebrationRemaining();
                $("#saveMarriageModalBtn").data("id", id || 0);
                $("#marriageEditorModal").removeClass("hidden");
            }

            function exportRentPdf() {
                const w = window.open("", "_blank");
                if (!w) return ctx.toast("Popup blocked", true);
                w.document.write(`<html><head><title>Rent Records</title></head><body><h1>Rent Records</h1>${ctx.state.rent.map(r => `<p>${r.monthKey || "-"} | ${r.dueDate || "-"} | ${r.paymentStatus || "-"} | ${ctx.money(r.rentAmount)}</p>`).join("")}</body></html>`);
                w.document.close();
                w.focus();
                w.print();
                ctx.toast("Rent PDF print opened");
            }

            function formatDateText(v) {
                if (!v) return "-";
                const d = new Date(v);
                if (Number.isNaN(d.getTime())) return v;
                return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
            }

            function shortHash(text) {
                let h = 2166136261;
                for (let i = 0; i < text.length; i++) {
                    h ^= text.charCodeAt(i);
                    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
                }
                return (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
            }

            function buildRentReceiptPayload(r) {
                const paidDate = formatDateText(r.updatedAt || r.dueDate);
                const receiptNo = `SDR-${String(r.id || "X").padStart(4, "0")}-${(r.monthKey || "N/A").replace("-", "")}`;
                const st = rentStatus(r);
                const hashInput = [
                    receiptNo,
                    st,
                    r.tenantName || "",
                    r.landlordName || "",
                    r.monthKey || "",
                    Number(r.rentAmount || 0).toFixed(2),
                    r.dueDate || "",
                    r.notes || ""
                ].join("|");
                const integrityCode = shortHash(hashInput);

                const text =
`RENT PAYMENT RECEIPT
Receipt No: ${receiptNo}
Status: ${st}
Integrity: ${integrityCode}

Payer (Tenant): ${r.payerDisplayName || r.tenantName || "-"}
Receiver (Landlord): ${r.receiverDisplayName || r.landlordName || "-"}
Month: ${r.monthKey || "-"}
Amount: ${ctx.money(r.rentAmount)}
Due Date: ${formatDateText(r.dueDate)}
Paid Date: ${st === "PAID" ? paidDate : "-"}
Notes: ${r.notes || "-"}

Generated by SuperDo AI`;

                const html =
`<div style="display:grid;gap:8px;font-size:14px;line-height:1.45;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong style="font-size:16px;">RENT PAYMENT RECEIPT</strong>
        <span class="badge success">${escHtml(st)}</span>
    </div>
    <div><strong>Receipt No:</strong> ${escHtml(receiptNo)}</div>
    <div><strong>Integrity:</strong> ${escHtml(integrityCode)}</div>
    <div><strong>Payer (Tenant):</strong> ${escHtml(r.payerDisplayName || r.tenantName || "-")}</div>
    <div><strong>Receiver (Landlord):</strong> ${escHtml(r.receiverDisplayName || r.landlordName || "-")}</div>
    <div><strong>Month:</strong> ${escHtml(r.monthKey || "-")}</div>
    <div><strong>Amount:</strong> ${escHtml(ctx.money(r.rentAmount))}</div>
    <div><strong>Due Date:</strong> ${escHtml(formatDateText(r.dueDate))}</div>
    <div><strong>Paid Date:</strong> ${escHtml(st === "PAID" ? paidDate : "-")}</div>
    <div><strong>Notes:</strong> ${escHtml(r.notes || "-")}</div>
    <div class="muted" style="margin-top:4px;">Generated by SuperDo AI</div>
</div>`;

                return { text, html };
            }

            function openReceiptShare(id) {
                const r = ctx.state.rent.find(x => x.id === id);
                if (!r) return ctx.toast("Rent record not found", true);
                const payload = buildRentReceiptPayload(r);
                currentRentReceiptText = payload.text;
                currentRentReceiptHtml = payload.html;
                $("#receiptCardPreview").html(payload.html);
                $("#receiptShareModal").removeClass("hidden");
            }

            function exportReceiptPdf(receiptHtml, baseName) {
                const w = window.open("", "_blank");
                if (!w) return ctx.toast("Popup blocked", true);

                w.document.write(`
                    <html>
                        <head>
                            <title>${baseName}</title>
                            <style>
                                body { font-family: Arial, sans-serif; margin: 24px; color: #0d1f26; }
                                h1 { margin: 0 0 14px; font-size: 20px; }
                                .muted { color: #64748b; }
                                .badge { border: 1px solid #10b981; color: #059669; border-radius: 9999px; padding: 2px 8px; font-size: 11px; font-weight: bold; }
                            </style>
                        </head>
                        <body>
                            <h1>SuperDo AI Receipt</h1>
                            ${receiptHtml}
                        </body>
                    </html>
                `);
                w.document.close();
                w.focus();
                w.print();
                ctx.toast("PDF print dialog opened");
            }

            ctx.modules.rent = { loadRent, loadMarriage, rentStatus };
            ensureModals();
            bindModalActions();
            applyActorRoleUi("TENANT");
            // Render table shell immediately so Rent Manager is never a blank screen
            // while the user is signed out or before data fetch completes.
            renderRent();

            $("#addRentBtn").on("click", () => upRent());
            $("#addMarriageBtn").on("click", () => upMarriage());
            $("#exportRentPdfBtn").on("click", exportRentPdf);
            $(document).on("click", "#emptyAddRent", () => upRent());
            $(document).on("click", "#emptyAddMarriage", () => upMarriage());
            $(document).on("change", "#rentActorRoleInput", function () {
                applyActorRoleUi($(this).val() || "TENANT", "");
            });
            $(document).on("change", "#rentMonthFilter", function () {
                rentTableState.month = String($(this).val() || "");
                rentTableState.page = 1;
                renderRent();
            });
            $(document).on("change", "#rentDateFromFilter", function () {
                rentTableState.fromDate = String($(this).val() || "");
                rentTableState.page = 1;
                renderRent();
            });
            $(document).on("change", "#rentDateToFilter", function () {
                rentTableState.toDate = String($(this).val() || "");
                rentTableState.page = 1;
                renderRent();
            });
            $(document).on("change", "#rentItemsPerPage", function () {
                const v = Number($(this).val() || 10);
                rentTableState.pageSize = [5, 10, 25, 50].includes(v) ? v : 10;
                rentTableState.page = 1;
                renderRent();
            });
            $(document).on("click", "#rentClearFiltersBtn, #rentClearFiltersEmptyBtn", function () {
                rentTableState.month = "";
                rentTableState.fromDate = "";
                rentTableState.toDate = "";
                rentTableState.page = 1;
                renderRent();
            });
            $(document).on("click", ".rent-page-btn, .rent-nav-btn", function () {
                if ($(this).is(":disabled")) return;
                const p = Number($(this).data("page") || 1);
                if (!p || p < 1) return;
                rentTableState.page = p;
                renderRent();
            });
            $(document).on("click", ".edit-rent", function () { upRent(Number($(this).data("id"))); });
            $(document).on("click", ".del-rent", function () { ctx.del(`/rent-records/${Number($(this).data("id"))}`, () => loadRent().done(ctx.renderDashboard)); });
            $(document).on("click", ".share-rent-receipt", function () { openReceiptShare(Number($(this).data("id"))); });
            $(document).on("click", ".edit-marriage", function () { upMarriage(Number($(this).data("id"))); });
            $(document).on("click", ".del-marriage", function () { ctx.del(`/marriage-planner/${Number($(this).data("id"))}`, () => loadMarriage().done(ctx.renderDashboard)); });
            $(document).on("click", ".celebration-filter-btn", function () {
                celebrationFilter = String($(this).data("filter") || "ALL");
                renderMarriage();
            });
        }
    };
})();
