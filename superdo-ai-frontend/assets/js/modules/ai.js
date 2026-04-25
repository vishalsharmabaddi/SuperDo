(function () {
    window.SuperDoModules = window.SuperDoModules || {};

    window.SuperDoModules.ai = {
        init(ctx) {
            const CHAT_ENDPOINT = `${API_BASE}/chat/message`;
            const $chatToggle = $("#aiChatToggle");
            const $chatWindow = $("#aiChatWindow");
            const $chatMessages = $("#aiChatMessages");
            const $chatInput = $("#aiChatInput");
            const $chatSend = $("#aiChatSend");
            const $chatClose = $("#aiChatClose");
            const $chatModeBadge = $("#aiChatModeBadge");
            let chatBootstrapped = false;

            function getToken() {
                return localStorage.getItem("token") || api.getAccessToken() || "";
            }

            function authHeaders() {
                const token = getToken();
                return token ? {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                } : {
                    "Content-Type": "application/json"
                };
            }

            function ensureWelcomeMessage() {
                if (chatBootstrapped) return;
                chatBootstrapped = true;
                renderEmptyState();
            }

            function renderEmptyState() {
                if ($chatMessages.children().length) return;
                $chatMessages.html('<div class="ai-chat-empty">Ask anything about your work, planning, or tasks.</div>');
            }

            function clearEmptyState() {
                $chatMessages.find(".ai-chat-empty").remove();
            }

            function scrollMessages() {
                const el = $chatMessages.get(0);
                if (el) {
                    el.scrollTop = el.scrollHeight;
                }
            }

            function appendMessage(kind, text, options) {
                clearEmptyState();
                const extraClass = options?.warning ? " is-warning" : "";
                const html = options?.html ? text : $("<div>").text(text).html();
                const $message = $(`<div class="ai-chat-message ${kind}${extraClass}">${html}</div>`);
                $chatMessages.append($message);
                scrollMessages();
                return $message;
            }

            function openChat() {
                ensureWelcomeMessage();
                $chatWindow.removeClass("hidden").addClass("open");
                $chatToggle.attr("aria-expanded", "true");
                window.setTimeout(() => $chatInput.trigger("focus"), 140);
            }

            function closeChat() {
                $chatWindow.removeClass("open");
                $chatToggle.attr("aria-expanded", "false");
                window.setTimeout(() => $chatWindow.addClass("hidden"), 180);
            }

            function setChatMode(label, mode) {
                $chatModeBadge.removeClass("built-in personal-ai").addClass(mode === "personal_ai" ? "personal-ai" : "built-in").text(label || "Built-in Assistant");
            }

            function builtInReply(message) {
                const text = String(message || "").trim().toLowerCase();
                if (!text) {
                    return "Ask about notes, rent, expenses, loans, backup, or how to use SuperDox.";
                }
                if (text.includes("note")) {
                    return "Use General Notes to create, edit, search, and organize quick notes.";
                }
                if (text.includes("rent")) {
                    return "Use Rent Manager to add records, track payment progress, and export rent data as PDF.";
                }
                if (text.includes("expense")) {
                    return "Use Expense Tracker to add entries, review totals, and export CSV or PDF reports.";
                }
                if (text.includes("loan")) {
                    return "Use Loan Manager to track loan entries, balances, and summary information.";
                }
                if (text.includes("backup") || text.includes("export")) {
                    return "Open your profile menu and use Export Backup to download a copy of your SuperDox data.";
                }
                if (text.includes("profile") || text.includes("account")) {
                    return "Open the profile menu at the bottom of the sidebar to update your profile settings.";
                }
                if (text.includes("help") || text.includes("how") || text.includes("use")) {
                    return "Use the left sidebar to switch between Dashboard, Notes, Rent, Celebration Planner, Expenses, Loans, and Custom Sections.";
                }
                return "I can help with Notes, Rent, Expenses, Loans, backup, and profile actions inside SuperDox.";
            }

            function sendMessage() {
                const userMessage = $chatInput.val().trim();
                if (!userMessage) return;

                const token = getToken();
                openChat();
                appendMessage("user", userMessage);
                $chatInput.val("");

                if (!token) {
                    setChatMode("Built-in Assistant", "built_in");
                    appendMessage("assistant", builtInReply(userMessage));
                    return;
                }

                const $thinking = appendMessage("assistant thinking", "Thinking...");
                $chatSend.prop("disabled", true);

                $.ajax({
                    url: CHAT_ENDPOINT,
                    method: "POST",
                    contentType: "application/json",
                    headers: authHeaders(),
                    data: JSON.stringify({ message: userMessage })
                }).done((res) => {
                    $thinking.remove();
                    if (res?.error) {
                        setChatMode("Built-in Assistant", "built_in");
                        appendMessage("assistant", builtInReply(userMessage));
                        return;
                    }
                    setChatMode(res?.modeLabel || "Built-in Assistant", res?.mode || "built_in");
                    if (res?.notice) {
                        appendMessage("assistant", res.notice, { warning: true });
                    }
                    appendMessage("assistant", res?.reply || "No response received.");
                }).fail((xhr) => {
                    $thinking.remove();
                    setChatMode("Built-in Assistant", "built_in");
                    appendMessage("assistant", builtInReply(userMessage));
                }).always(() => {
                    $chatSend.prop("disabled", false);
                    $chatInput.trigger("focus");
                });
            }

            $chatToggle.on("click", () => {
                if ($chatWindow.hasClass("hidden")) {
                    openChat();
                    return;
                }
                closeChat();
            });

            $chatClose.on("click", closeChat);
            $chatSend.on("click", sendMessage);
            $chatInput.on("keydown", (event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                }
            });

            setChatMode("Built-in Assistant", "built_in");
            renderEmptyState();
        }
    };
})();
