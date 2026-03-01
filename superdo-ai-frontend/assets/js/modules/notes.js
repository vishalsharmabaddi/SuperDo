(function () {
    window.SuperDoModules = window.SuperDoModules || {};

    window.SuperDoModules.notes = {
        init(ctx) {
            let noteModalBound = false;
            let quickAiModalBound = false;
            const noteUi = {
                search: "",
                filter: "ALL",
                sort: "NEWEST"
            };

            const CATEGORY = {
                WORK: { label: "Work", cls: "work" },
                PERSONAL: { label: "Personal", cls: "personal" },
                IDEAS: { label: "Ideas", cls: "ideas" },
                IMPORTANT: { label: "Important", cls: "important" }
            };

            function safe(v) {
                return String(v == null ? "" : v)
                    .replaceAll("&", "&amp;")
                    .replaceAll("<", "&lt;")
                    .replaceAll(">", "&gt;")
                    .replaceAll('"', "&quot;");
            }

            function parseTagsMeta(raw) {
                const input = String(raw || "");
                const catMatch = input.match(/\[\[cat:([A-Z_]+)\]\]/i);
                const pinMatch = input.match(/\[\[pin:(0|1)\]\]/i);
                const category = (catMatch?.[1] || "WORK").toUpperCase();
                const pinned = pinMatch?.[1] === "1";
                const cleaned = input.replace(/\[\[(cat|pin):[^\]]+\]\]/gi, "").trim();
                const tags = cleaned.split(",").map(x => x.trim()).filter(Boolean);
                return {
                    category: Object.prototype.hasOwnProperty.call(CATEGORY, category) ? category : "WORK",
                    pinned,
                    cleanTags: tags.join(", "),
                    tagList: tags
                };
            }

            function composeTags(tagsText, category, pinned) {
                const clean = String(tagsText || "")
                    .split(",")
                    .map(x => x.trim())
                    .filter(Boolean)
                    .join(", ");
                const meta = `[[cat:${category}]] [[pin:${pinned ? 1 : 0}]]`;
                return clean ? `${clean} ${meta}` : meta;
            }

            function normalizeNote(note) {
                const meta = parseTagsMeta(note.tags);
                const sortDate = note.updatedAt || note.createdAt || "";
                return {
                    ...note,
                    _meta: meta,
                    _sortDate: sortDate
                };
            }

            function formatDateTime(v) {
                if (!v) return "-";
                const d = new Date(v);
                if (Number.isNaN(d.getTime())) return v;
                return d.toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                });
            }

            function renderTagChips(value) {
                const chips = String(value || "")
                    .split(",")
                    .map(x => x.trim())
                    .filter(Boolean)
                    .slice(0, 12)
                    .map(t => `<span class="note-chip">#${safe(t)}</span>`)
                    .join("");
                $("#noteTagsPreview").html(chips || '<span class="muted">Tags preview appears here</span>');
            }

            function getFilteredNotes() {
                const q = noteUi.search.trim().toLowerCase();
                const base = ctx.state.notes.map(normalizeNote);
                const filtered = base.filter(n => {
                    if (noteUi.filter === "PINNED" && !n._meta.pinned) return false;
                    if (["WORK", "PERSONAL", "IDEAS"].includes(noteUi.filter) && n._meta.category !== noteUi.filter) return false;
                    if (!q) return true;
                    const hay = [
                        n.title || "",
                        n.content || "",
                        n._meta.cleanTags || "",
                        CATEGORY[n._meta.category].label
                    ].join(" ").toLowerCase();
                    return hay.includes(q);
                });

                const sortFn = {
                    NEWEST: (a, b) => String(b._sortDate).localeCompare(String(a._sortDate)),
                    OLDEST: (a, b) => String(a._sortDate).localeCompare(String(b._sortDate)),
                    AZ: (a, b) => String(a.title || "").localeCompare(String(b.title || ""))
                }[noteUi.sort] || ((a, b) => String(b._sortDate).localeCompare(String(a._sortDate)));

                filtered.sort((a, b) => {
                    if (a._meta.pinned !== b._meta.pinned) return a._meta.pinned ? -1 : 1;
                    return sortFn(a, b);
                });

                return filtered;
            }

            function notesToolbar(total) {
                const tabs = [
                    ["ALL", "All"],
                    ["PINNED", "Pinned"],
                    ["WORK", "Work"],
                    ["PERSONAL", "Personal"],
                    ["IDEAS", "Ideas"]
                ].map(([k, t]) => `<button class="note-filter-btn ${noteUi.filter === k ? "active" : ""}" data-filter="${k}">${t}</button>`).join("");

                return `
                    <div class="notes-topbar">
                        <div class="notes-search-wrap">
                            <input id="noteSearchInput" value="${safe(noteUi.search)}" placeholder="Search notes..." aria-label="Search notes">
                            <span class="notes-search-line"></span>
                        </div>
                        <div class="notes-controls">
                            <div class="notes-filter-tabs">${tabs}</div>
                            <select id="noteSortInput" aria-label="Sort notes">
                                <option value="NEWEST" ${noteUi.sort === "NEWEST" ? "selected" : ""}>Newest</option>
                                <option value="OLDEST" ${noteUi.sort === "OLDEST" ? "selected" : ""}>Oldest</option>
                                <option value="AZ" ${noteUi.sort === "AZ" ? "selected" : ""}>A-Z</option>
                            </select>
                            <span class="notes-count-badge">${total} Notes</span>
                        </div>
                    </div>
                `;
            }

            function noteCard(n) {
                const cat = CATEGORY[n._meta.category];
                const tags = n._meta.tagList.map(t => `<span class="note-tag">#${safe(t)}</span>`).join("");
                const pinnedCls = n._meta.pinned ? "pinned" : "";
                return `
                    <article class="note-card cat-${cat.cls} ${pinnedCls}" tabindex="0">
                        <div class="note-time">${safe(formatDateTime(n.updatedAt || n.createdAt))}</div>
                        <button class="note-pin-btn ${n._meta.pinned ? "active" : ""}" data-id="${n.id}" aria-label="Pin note">Pin</button>
                        <div class="note-meta-row">
                            <span class="note-category-badge ${cat.cls}">${cat.label}</span>
                        </div>
                        <h3>${safe(n.title || "Untitled")}</h3>
                        <p class="note-preview">${safe(n.content || "")}</p>
                        <div class="note-tags-row">${tags || '<span class="muted">No tags</span>'}</div>
                        <div class="note-actions">
                            <div class="note-ai-wrap">
                                <button class="note-ghost-btn note-ai-trigger">AI Tools</button>
                                <div class="note-ai-popover">
                                    <button class="ai-note" data-action="summarize" data-id="${n.id}">AI Summarize</button>
                                    <button class="ai-note" data-action="grammar" data-id="${n.id}">AI Grammar Fix</button>
                                    <button class="ai-note" data-action="action-items" data-id="${n.id}">AI Task Extractor</button>
                                    <button class="ai-note" data-action="suggest-title" data-id="${n.id}">AI Title Generator</button>
                                </div>
                            </div>
                            <button class="note-ghost-btn edit-note" data-id="${n.id}">Edit</button>
                            <button class="note-ghost-btn del-note" data-id="${n.id}">Delete</button>
                        </div>
                    </article>
                `;
            }

            function renderNotes() {
                const rows = getFilteredNotes();
                const toolbar = notesToolbar(rows.length);
                const grid = rows.map(noteCard).join("");
                const empty = `
                    <div class="notes-empty-state">
                        <div class="notes-empty-icon">◌</div>
                        <h3>No notes yet. Start capturing your thoughts.</h3>
                        <button id="emptyAddNote" class="btn-primary">Create First Note</button>
                    </div>
                `;
                $("#notesList").html(`
                    <div class="notes-future-shell">
                        ${toolbar}
                        <div class="notes-grid">
                            ${grid || empty}
                        </div>
                    </div>
                `);
            }

            function loadNotes() {
                return ctx.call("GET", "/notes").done(r => {
                    ctx.state.notes = r || [];
                    renderNotes();
                });
            }

            function upNote(id) {
                if (!ctx.needAuth()) return;
                const o = ctx.state.notes.find(x => x.id === id) || {};
                const meta = parseTagsMeta(o.tags);
                $("#noteEditorTitle").text(id ? "Edit Note" : "Add Note");
                $("#noteTitleInput").val(o.title || "");
                $("#noteContentInput").val(o.content || "");
                $("#noteCategoryInput").val(meta.category);
                $("#noteTagsInput").val(meta.cleanTags || "");
                $("#notePinInput").prop("checked", meta.pinned);
                renderTagChips(meta.cleanTags || "");
                $("#saveNoteModalBtn").data("id", id || 0);
                $("#noteEditorModal").removeClass("hidden");
            }

            function updateNoteRecord(note, overrides) {
                return ctx.call("PUT", `/notes/${note.id}`, {
                    title: overrides.title ?? note.title ?? "Untitled",
                    content: overrides.content ?? note.content ?? "",
                    tags: overrides.tags ?? note.tags ?? ""
                }).done(() => loadNotes().done(ctx.renderDashboard));
            }

            function togglePin(id) {
                if (!ctx.needAuth()) return;
                const note = ctx.state.notes.map(normalizeNote).find(x => x.id === id);
                if (!note) return ctx.toast("Note not found", true);
                const tags = composeTags(note._meta.cleanTags, note._meta.category, !note._meta.pinned);
                updateNoteRecord(note, { tags }).done(() => ctx.toast(!note._meta.pinned ? "Pinned" : "Unpinned"));
            }

            function applyAiResultToNote(note, action, aiText) {
                if (action === "grammar") {
                    if (!confirm("Replace note content with AI grammar result?")) return;
                    updateNoteRecord(note, { content: aiText }).done(() => ctx.toast("Note updated from AI"));
                    return;
                }

                if (action === "suggest-title") {
                    if (!confirm("Replace note title with AI suggestion?")) return;
                    updateNoteRecord(note, { title: aiText }).done(() => ctx.toast("Title updated from AI"));
                    return;
                }

                prompt("AI Result (copy if needed)", aiText);
            }

            function aiForNote(action, id) {
                if (!ctx.needAuth()) return;
                const note = ctx.state.notes.find(x => x.id === id);
                if (!note) return ctx.toast("Note not found", true);
                const content = (note.content || "").trim();
                if (!content) return ctx.toast("Note content is empty", true);

                ctx.call("POST", `/ai/${action}`, { content }).done(res => {
                    const aiText = res?.content || "";
                    if (!aiText) return ctx.toast("AI returned empty result", true);
                    applyAiResultToNote(note, action, aiText);
                });
            }

            function runQuickAi() {
                if (!ctx.needAuth()) return;
                $("#quickAiActionInput").val("summarize");
                $("#quickAiContentInput").val("");
                $("#quickAiModal").removeClass("hidden");
            }

            function ensureModals() {
                if (!$("#noteEditorModal").length) {
                    $("body").append(`
                        <div id="noteEditorModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Note editor dialog">
                            <div class="modal-content note-editor-modal-content">
                                <div class="modal-header">
                                    <h3 id="noteEditorTitle">Add Note</h3>
                                    <button class="modal-close" id="closeNoteEditorModal" aria-label="Close note editor">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </button>
                                </div>
                                <input id="noteTitleInput" placeholder="Note title" aria-label="Note title">
                                <textarea id="noteContentInput" rows="7" placeholder="Write your note..." aria-label="Note content"></textarea>
                                <select id="noteCategoryInput" aria-label="Note category">
                                    <option value="WORK">Work</option>
                                    <option value="PERSONAL">Personal</option>
                                    <option value="IDEAS">Ideas</option>
                                    <option value="IMPORTANT">Important</option>
                                </select>
                                <input id="noteTagsInput" placeholder="Tags (comma separated)" aria-label="Note tags">
                                <div id="noteTagsPreview" class="note-chip-row"></div>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="notePinInput">
                                    Pin this note
                                </label>
                                <div class="modal-actions">
                                    <button id="saveNoteModalBtn" class="btn-primary" aria-label="Save note">Save</button>
                                </div>
                            </div>
                        </div>
                    `);
                }

                if (!$("#quickAiModal").length) {
                    $("body").append(`
                        <div id="quickAiModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="AI quick tools dialog">
                            <div class="modal-content note-ai-modal-content">
                                <div class="modal-header">
                                    <h3>AI Quick Tools</h3>
                                    <button class="modal-close" id="closeQuickAiModal" aria-label="Close AI quick tools dialog">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </button>
                                </div>
                                <select id="quickAiActionInput" aria-label="AI action">
                                    <option value="summarize">Summarize</option>
                                    <option value="grammar">Grammar</option>
                                    <option value="action-items">Action Items</option>
                                    <option value="suggest-title">Suggest Title</option>
                                </select>
                                <textarea id="quickAiContentInput" rows="7" placeholder="Paste note content for AI..." aria-label="Content for AI"></textarea>
                                <div class="modal-actions">
                                    <button id="runQuickAiModalBtn" class="btn-primary" aria-label="Run AI action">Run</button>
                                </div>
                            </div>
                        </div>
                    `);
                }
            }

            function bindModalActions() {
                if (!noteModalBound) {
                    $("#closeNoteEditorModal").on("click", () => $("#noteEditorModal").addClass("hidden"));
                    $("#noteTagsInput").on("input", function () {
                        renderTagChips($(this).val());
                    });
                    $("#saveNoteModalBtn").on("click", () => {
                        const id = Number($("#saveNoteModalBtn").data("id") || 0);
                        const title = ctx.req($("#noteTitleInput").val().trim(), "Title"); if (!title) return;
                        const content = ctx.req($("#noteContentInput").val().trim(), "Content"); if (!content) return;
                        const category = String($("#noteCategoryInput").val() || "WORK");
                        const tagsInput = $("#noteTagsInput").val().trim();
                        const pinned = $("#notePinInput").is(":checked");
                        const tags = composeTags(tagsInput, category, pinned);

                        ctx.call(id ? "PUT" : "POST", id ? `/notes/${id}` : "/notes", { title, content, tags }).done(() => {
                            $("#noteEditorModal").addClass("hidden");
                            ctx.toast("Saved");
                            loadNotes().done(ctx.renderDashboard);
                        });
                    });
                    noteModalBound = true;
                }

                if (!quickAiModalBound) {
                    $("#closeQuickAiModal").on("click", () => $("#quickAiModal").addClass("hidden"));
                    $("#runQuickAiModalBtn").on("click", () => {
                        const action = $("#quickAiActionInput").val();
                        const content = ctx.req($("#quickAiContentInput").val().trim(), "Content"); if (!content) return;
                        ctx.call("POST", `/ai/${action}`, { content }).done(res => {
                            const aiText = res?.content || "";
                            if (!aiText) return ctx.toast("AI returned empty result", true);
                            $("#quickAiModal").addClass("hidden");
                            prompt("AI Result (copy if needed)", aiText);
                        });
                    });
                    quickAiModalBound = true;
                }

                $(document).on("click", "#noteEditorModal", function (e) {
                    if (e.target === this) $("#noteEditorModal").addClass("hidden");
                });
                $(document).on("click", "#quickAiModal", function (e) {
                    if (e.target === this) $("#quickAiModal").addClass("hidden");
                });
            }

            ctx.modules.notes = { loadNotes, upNote };
            ensureModals();
            bindModalActions();

            $("#addNoteBtn").on("click", () => upNote());
            $("#aiQuickToolsBtn").on("click", runQuickAi);
            $(document).on("click", "#emptyAddNote", () => upNote());
            $(document).on("input", "#noteSearchInput", function () {
                noteUi.search = String($(this).val() || "");
                renderNotes();
            });
            $(document).on("change", "#noteSortInput", function () {
                noteUi.sort = String($(this).val() || "NEWEST");
                renderNotes();
            });
            $(document).on("click", ".note-filter-btn", function () {
                noteUi.filter = String($(this).data("filter") || "ALL").toUpperCase();
                renderNotes();
            });
            $(document).on("click", ".note-pin-btn", function () {
                togglePin(Number($(this).data("id")));
            });
            $(document).on("click", ".edit-note", function () { upNote(Number($(this).data("id"))); });
            $(document).on("click", ".del-note", function () {
                ctx.del(`/notes/${Number($(this).data("id"))}`, () => loadNotes().done(ctx.renderDashboard));
            });
            $(document).on("click", ".ai-note", function () {
                aiForNote(String($(this).data("action")), Number($(this).data("id")));
            });
        }
    };
})();
