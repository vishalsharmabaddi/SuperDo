(function () {
  window.SuperDoModules = window.SuperDoModules || {};

  window.SuperDoModules.custom = {
    init(ctx) {
      const FIELD_TYPES = ["text", "number", "dropdown", "checkbox", "radio", "date", "file", "textarea"];
      const AVATAR_GRADIENTS = [
        'linear-gradient(135deg,#0d9488,#14b8a6)',
        'linear-gradient(135deg,#3b82f6,#6366f1)',
        'linear-gradient(135deg,#f59e0b,#ef4444)',
        'linear-gradient(135deg,#8b5cf6,#ec4899)',
        'linear-gradient(135deg,#14b8a6,#3b82f6)',
        'linear-gradient(135deg,#059669,#0d9488)',
        'linear-gradient(135deg,#6366f1,#8b5cf6)',
        'linear-gradient(135deg,#ec4899,#f59e0b)',
      ];
      const TAG_COLORS = ['cs-tag-teal','cs-tag-blue','cs-tag-amber','cs-tag-red','cs-tag-purple','cs-tag-pink','cs-tag-indigo','cs-tag-green'];

      const ui = {};
      let sectionDraft = { id: 0, name: "", fields: [] };
      let fieldEditId = null;
      let activeSectionId = 0;
      let activeEntryId = 0;
      let entryDraft = {};
      let pendingFiles = {};
      const previewStore = {};
      let previewSeq = 0;

      // ── Core helpers ───────────────────────────────────────
      function apiCall(method, path, body) {
        return api.request(method, path, body).fail(xhr => {
          ctx.toast(xhr?.responseJSON?.error || "Request failed", true);
        });
      }

      function parseJson(raw, fallback) {
        try { return JSON.parse(raw || ""); } catch (_) { return fallback; }
      }

      function nowIso() { return new Date().toISOString(); }

      function actor() {
        try {
          const p = JSON.parse(localStorage.getItem("superdo_profile") || "{}");
          return p?.name || p?.email || "Current User";
        } catch (_) { return "Current User"; }
      }

      function isFile(v) {
        return v && typeof v === "object" && typeof v.name === "string" && typeof v.size === "number";
      }

      function isImageFile(v) {
        if (!isFile(v)) return false;
        return String(v.type || "").startsWith("image/") || String(v.dataUrl || "").startsWith("data:image/");
      }

      function cachePreviewData(dataUrl) {
        const id = `preview_${++previewSeq}`;
        previewStore[id] = dataUrl;
        return id;
      }

      function dataUrlToBlob(dataUrl) {
        const parts = String(dataUrl || "").split(",");
        if (parts.length < 2) throw new Error("Invalid data URL");
        const mime = (parts[0].match(/data:(.*?);base64/i) || [])[1] || "application/octet-stream";
        const binary = atob(parts.slice(1).join(","));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
      }

      function escapeHtml(v) {
        return String(v ?? "")
          .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
      }

      function timeAgo(iso) {
        const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
      }

      function normalizeField(f, i) {
        return {
          id: String(f.id || f.name || `field_${i + 1}`).toLowerCase().replace(/[^a-z0-9_]+/g, "_"),
          name: String(f.name || `Field ${i + 1}`),
          type: FIELD_TYPES.includes(String(f.type || "").toLowerCase()) ? String(f.type).toLowerCase() : "text",
          required: Boolean(f.required),
          options: Array.isArray(f.options) ? f.options.map(x => String(x).trim()).filter(Boolean) : [],
          condition: f.condition?.fieldId ? { fieldId: String(f.condition.fieldId), equals: String(f.condition.equals || "") } : null
        };
      }

      function getSchema(section) {
        const s = parseJson(section?.schemaJson, { fields: [] });
        const fields = Array.isArray(s.fields) ? s.fields : [];
        return { fields: fields.map(normalizeField) };
      }

      function getUi(sectionId) {
        if (!ui[sectionId]) ui[sectionId] = { q: "", sort: "newest", fileOnly: false, page: 1, pageSize: 8 };
        return ui[sectionId];
      }

      function visible(field, values) {
        if (!field.condition || !field.condition.fieldId) return true;
        return String(values[field.condition.fieldId] ?? "") === String(field.condition.equals ?? "");
      }

      // ── Avatar helpers ─────────────────────────────────────
      function avatarInitials(d, schema) {
        for (const f of schema.fields) {
          if (f.type === 'text') {
            const v = String(d[f.id] || '').trim();
            if (v) {
              const words = v.split(/\s+/);
              return words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : v.slice(0, 2).toUpperCase();
            }
          }
        }
        return '??';
      }

      // ── Card builder ───────────────────────────────────────
      function buildCard(r, schema, secId, idx) {
        const d = parseJson(r.dataJson, {});
        const activity = Array.isArray(d._activity) ? d._activity : [];
        const lastAct  = activity[activity.length - 1];
        const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
        const initials = avatarInitials(d, schema);

        // Tags from select/radio/checkbox values
        const tags = schema.fields
          .filter(f => ['dropdown','radio','checkbox'].includes(f.type))
          .filter(f => d[f.id] !== undefined && d[f.id] !== '' && d[f.id] !== false)
          .slice(0, 3)
          .map((f, ti) => {
            const val = f.type === 'checkbox' ? f.name : String(d[f.id]);
            return `<span class="cs-tag ${TAG_COLORS[ti % TAG_COLORS.length]}">${escapeHtml(val)}</span>`;
          }).join('');

        // Field rows
        const visibleFields = schema.fields.filter(f => f.type !== 'file' && visible(f, d));
        const fileFields    = schema.fields.filter(f => f.type === 'file' && isFile(d[f.id]));

        function makeFieldRow(f) {
          const v = d[f.id];
          if (v === undefined || v === null || v === '') return '';
          if (f.type === 'checkbox') return `<div class="cs-field-row"><span class="cs-field-key">${escapeHtml(f.name)}</span><span class="cs-field-val">${v ? '<span class="cs-tag cs-tag-green">Yes</span>' : '<span class="cs-tag cs-tag-red">No</span>'}</span></div>`;
          if (f.type === 'dropdown' || f.type === 'radio') return `<div class="cs-field-row"><span class="cs-field-key">${escapeHtml(f.name)}</span><span class="cs-field-val"><span class="cs-badge-val">${escapeHtml(String(v))}</span></span></div>`;
          const sv = String(v);
          return `<div class="cs-field-row"><span class="cs-field-key">${escapeHtml(f.name)}</span><span class="cs-field-val">${escapeHtml(sv.slice(0, 90))}${sv.length > 90 ? '…' : ''}</span></div>`;
        }

        function makeFileRow(f) {
          const v = d[f.id];
          const previewId = v.dataUrl ? cachePreviewData(v.dataUrl) : '';
          const previewBtn = previewId ? `<button type="button" class="cs-file-preview-btn custom-file-preview" data-preview-id="${previewId}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View</button>` : '';
          const imgTag = isImageFile(v) && v.dataUrl ? `<img src="${v.dataUrl}" alt="${escapeHtml(v.name)}" class="cs-card-img">` : '';
          return `<div class="cs-field-row cs-file-row"><span class="cs-field-key">${escapeHtml(f.name)}</span><span class="cs-field-val cs-file-val"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>${escapeHtml(v.name)} ${previewBtn}</span></div>${imgTag}`;
        }

        const PREVIEW_LIMIT = 3;
        const previewRows = visibleFields.slice(0, PREVIEW_LIMIT).map(makeFieldRow).filter(Boolean).join('');
        const extraFields  = visibleFields.slice(PREVIEW_LIMIT);
        const extraHtml    = extraFields.map(makeFieldRow).filter(Boolean).join('') + fileFields.map(makeFileRow).join('');
        const hasExtra     = extraHtml.trim().length > 0;
        const extraCount   = extraFields.length + fileFields.length;

        const dateStr = new Date(r.updatedAt || r.createdAt || Date.now())
          .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

        return `
          <article class="cs-card" data-id="${r.id}" data-section="${secId}">
            <div class="cs-card-header">
              <div class="cs-avatar" style="background:${gradient}">${escapeHtml(initials)}</div>
              <div class="cs-card-title-wrap">
                <span class="cs-card-title">Entry #${r.id}</span>
                ${tags ? `<div class="cs-card-tags">${tags}</div>` : ''}
              </div>
              <span class="cs-date-chip">${dateStr}</span>
            </div>
            <div class="cs-card-body">
              ${previewRows || '<p class="cs-empty-fields">No field values</p>'}
              ${hasExtra ? `
                <div class="cs-overflow-rows hidden" data-id="${r.id}">
                  ${extraHtml}
                </div>
                <button class="cs-expand-btn" data-id="${r.id}" data-expanded="false">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  Show ${extraCount} more field${extraCount > 1 ? 's' : ''}
                </button>` : ''}
            </div>
            <div class="cs-card-footer">
              <div class="cs-card-actions">
                <button class="cs-edit-btn edit-entry" data-section="${secId}" data-id="${r.id}">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                <button class="cs-del-btn del-entry" data-section="${secId}" data-id="${r.id}">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6"/></svg>
                  Delete
                </button>
              </div>
            </div>
          </article>`;
      }

      // ── Pagination ─────────────────────────────────────────
      function buildPagination(page, totalPages, secId) {
        if (totalPages <= 1) return '';
        const nums = [];
        for (let i = 1; i <= totalPages; i++) {
          if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) nums.push(i);
          else if (nums[nums.length - 1] !== '...') nums.push('...');
        }
        const btns = nums.map(n =>
          n === '...'
            ? `<span class="cs-pg-ellipsis">…</span>`
            : `<button class="cs-pg-btn ${n === page ? 'cs-pg-active' : ''} custom-pg-num" data-id="${secId}" data-page="${n}">${n}</button>`
        ).join('');
        return `
          <div class="cs-pagination">
            <button class="cs-pg-btn cs-pg-nav custom-prev" data-id="${secId}" ${page <= 1 ? 'disabled' : ''} aria-label="Previous">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            ${btns}
            <button class="cs-pg-btn cs-pg-nav custom-next" data-id="${secId}" ${page >= totalPages ? 'disabled' : ''} aria-label="Next">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>`;
      }

      // ── Toolbar ────────────────────────────────────────────
      function buildToolbar(sec, state, filteredCount) {
        const ps   = state.pageSize || 8;
        const from = filteredCount ? Math.min((state.page - 1) * ps + 1, filteredCount) : 0;
        const to   = Math.min(state.page * ps, filteredCount);
        const sortOpts = [['newest','Newest First'],['oldest','Oldest First']]
          .map(([v,l]) => `<option value="${v}" ${state.sort === v ? 'selected' : ''}>${l}</option>`).join('');
        const pgOpts = [8,12,25,50]
          .map(n => `<option value="${n}" ${ps === n ? 'selected' : ''}>${n}</option>`).join('');

        return `
          <div class="cs-toolbar">
            <div class="cs-toolbar-left">
              <div class="cs-search-wrap">
                <input class="cs-search custom-q" data-id="${sec.id}" value="${escapeHtml(state.q)}" placeholder="Search entries…" aria-label="Search">
              </div>
              <select class="cs-select custom-sort" data-id="${sec.id}" aria-label="Sort">${sortOpts}</select>
              <label class="cs-toggle-label">
                <input type="checkbox" class="custom-file cs-toggle-cb" data-id="${sec.id}" ${state.fileOnly ? 'checked' : ''}>
                <span>Files only</span>
              </label>
            </div>
            <div class="cs-toolbar-right">
              <span class="cs-count-text">${filteredCount > 0 ? `${from}–${to} of ` : ''}<strong>${filteredCount}</strong> entr${filteredCount === 1 ? 'y' : 'ies'}</span>
              <div class="cs-pagesize-wrap">
                <select class="cs-select custom-page-size" data-id="${sec.id}" aria-label="Per page">${pgOpts}</select>
                <span>/ page</span>
              </div>
              <div class="cs-export-wrap" data-id="${sec.id}">
                <button class="cs-export-trigger" data-id="${sec.id}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  Export
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="cs-export-menu hidden" data-id="${sec.id}">
                  <button class="cs-export-item custom-export-csv" data-id="${sec.id}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/></svg>
                    Export CSV
                  </button>
                  <button class="cs-export-item custom-export-json" data-id="${sec.id}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
                    Export JSON
                  </button>
                  <button class="cs-export-item custom-export-pdf" data-id="${sec.id}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          </div>`;
      }

      // ── Section header ─────────────────────────────────────
      function buildSectionHeader(sec, total) {
        return `
          <div class="cs-section-header">
            <div class="cs-section-title-row">
              <div class="cs-section-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              </div>
              <h3 class="cs-section-name">${escapeHtml(sec.name)}</h3>
              <span class="cs-entry-count">${total} entr${total === 1 ? 'y' : 'ies'}</span>
            </div>
            <div class="cs-section-actions">
              <button class="cs-add-btn add-entry" data-id="${sec.id}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                Add Entry
              </button>
              <button class="cs-sec-btn edit-section" data-id="${sec.id}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <button class="cs-sec-btn cs-sec-danger del-section" data-id="${sec.id}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6"/></svg>
                Delete
              </button>
            </div>
          </div>`;
      }

      // ── Main render ────────────────────────────────────────
      function renderSections() {
        if (!ctx.state.sections.length) {
          $("#customSectionsList").html(`
            <div class="cs-global-empty">
              <div class="cs-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              </div>
              <h3>No custom sections yet</h3>
              <p>Create your first section to organize any data with fully custom fields — text, dates, files, dropdowns and more.</p>
              <button id="emptyAddSection" class="btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                Create Your First Section
              </button>
            </div>`);
          return;
        }

        const html = ctx.state.sections.map(sec => {
          const state  = getUi(sec.id);
          const schema = getSchema(sec);
          const ps     = state.pageSize || 8;
          let rows     = ctx.state.entries[sec.id] || [];

          // Filter
          rows = rows.filter(r => {
            const d = parseJson(r.dataJson, {});
            if (state.q && !JSON.stringify(d).toLowerCase().includes(state.q.toLowerCase())) return false;
            if (state.fileOnly && !Object.values(d).some(isFile)) return false;
            return true;
          });

          // Sort
          rows.sort((a, b) => {
            const at = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bt = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return state.sort === 'oldest' ? at - bt : bt - at;
          });

          const total       = (ctx.state.entries[sec.id] || []).length;
          const filtered    = rows.length;
          const totalPages  = Math.max(1, Math.ceil(filtered / ps));
          if (state.page > totalPages) state.page = totalPages;
          const pageRows    = rows.slice((state.page - 1) * ps, state.page * ps);

          let cardsHtml;
          if (filtered === 0) {
            cardsHtml = `
              <div class="cs-empty-state">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <p>${state.q || state.fileOnly ? 'No entries match your filters.' : 'No entries yet — add your first one above.'}</p>
                ${state.q || state.fileOnly ? `<button class="cs-clear-btn custom-clear-filters" data-id="${sec.id}">Clear Filters</button>` : ''}
              </div>`;
          } else {
            const cards = pageRows.map((r, i) => buildCard(r, schema, sec.id, (state.page - 1) * ps + i));
            cardsHtml = `<div class="cs-cards-grid">${cards.join('')}</div>`;
          }

          return `
            <div class="cs-section-wrap">
              ${buildSectionHeader(sec, total)}
              ${buildToolbar(sec, state, filtered)}
              ${cardsHtml}
              ${buildPagination(state.page, totalPages, sec.id)}
            </div>`;
        }).join('');

        $("#customSectionsList").html(html);
      }

      // ── Load from API ──────────────────────────────────────
      function loadSections() {
        return apiCall("GET", "/custom-sections").done(r => {
          ctx.state.sections = r || [];
          ctx.state.entries  = {};
          ctx.state.sections.forEach(sec =>
            apiCall("GET", `/custom-sections/${sec.id}/entries`).done(e => {
              ctx.state.entries[sec.id] = e || [];
              renderSections();
            })
          );
          renderSections();
        });
      }

      // ── Export ─────────────────────────────────────────────
      function exportData(sectionId, format) {
        const sec  = ctx.state.sections.find(x => x.id === sectionId);
        if (!sec) return;
        const rows = ctx.state.entries[sectionId] || [];
        const base = sec.name.replace(/\s+/g, "_").toLowerCase();

        if (format === 'json') {
          const blob = new Blob([JSON.stringify({ section: sec, entries: rows.map(r => ({ ...r, data: parseJson(r.dataJson, {}) })), exportedAt: nowIso() }, null, 2)], { type: "application/json;charset=utf-8" });
          const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${base}-${new Date().toISOString().slice(0,10)}.json` });
          a.click(); URL.revokeObjectURL(a.href);
          return ctx.toast("JSON exported");
        }

        if (format === 'csv') {
          const lines = rows.map(r => `"${r.id}","${r.createdAt || ""}","${r.updatedAt || ""}","${String(JSON.stringify(parseJson(r.dataJson, {}))).replaceAll('"', '""')}"`);
          const blob  = new Blob([["id,createdAt,updatedAt,data", ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
          const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${base}-${new Date().toISOString().slice(0,10)}.csv` });
          a.click(); URL.revokeObjectURL(a.href);
          return ctx.toast("CSV exported");
        }

        if (format === 'pdf') {
          if (!rows.length) return ctx.toast('No data to export', true);
          const schema = getSchema(sec);
          const headers = ['#', ...schema.fields.map(f => f.name), 'Created'].map(h => `<th>${escapeHtml(h)}</th>`).join('');
          const tRows   = rows.map(r => {
            const d = parseJson(r.dataJson, {});
            const cells = schema.fields.map(f => {
              const v = d[f.id];
              if (v === undefined || v === null || v === '') return '<td>—</td>';
              if (isFile(v)) return `<td>${escapeHtml(v.name)}</td>`;
              if (typeof v === 'boolean') return `<td>${v ? 'Yes' : 'No'}</td>`;
              return `<td>${escapeHtml(String(v).slice(0, 100))}</td>`;
            }).join('');
            return `<tr><td>${r.id}</td>${cells}<td>${new Date(r.createdAt || Date.now()).toLocaleDateString()}</td></tr>`;
          }).join('');
          const win = window.open('', '_blank');
          if (!win) return ctx.toast('Allow pop-ups to export PDF', true);
          win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(sec.name)}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;font-size:12px;color:#111;padding:32px}h1{font-size:18px;font-weight:700;margin-bottom:4px}.sub{color:#666;font-size:11px;margin-bottom:20px}table{width:100%;border-collapse:collapse}th{background:#f3f4f6;text-align:left;padding:8px 10px;border-bottom:2px solid #d1d5db;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#555}td{padding:7px 10px;border-bottom:1px solid #f0f0f0}.foot{margin-top:20px;font-size:10px;color:#aaa;text-align:right}@media print{body{padding:16px}}</style></head><body><h1>${escapeHtml(sec.name)}</h1><div class="sub">Exported ${rows.length} entries · ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div><table><thead><tr>${headers}</tr></thead><tbody>${tRows}</tbody></table><div class="foot">SuperDo — Custom Sections</div><script>window.onload=function(){window.print()}<\/script></body></html>`);
          win.document.close();
          ctx.toast('PDF ready');
        }
      }

      // ── Modal builders (unchanged) ─────────────────────────
      function ensureModals() {
        if (!$("#customSectionModal").length) {
          $("body").append(`
            <div id="customSectionModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Custom section dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h3 id="customSectionTitle">Create Section</h3>
                  <button class="modal-close" id="closeCustomSectionModal" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
                <input id="customSectionNameInput" placeholder="Section name" aria-label="Section name">
                <div class="item">
                  <div class="item-row"><strong>Fields</strong><button id="addCustomFieldBtn" type="button">Add Field</button></div>
                  <div id="customFieldList"></div>
                </div>
                <div class="modal-actions"><button id="saveCustomSectionBtn" class="btn-primary">Save</button></div>
              </div>
            </div>`);
        }

        if (!$("#customFieldModal").length) {
          $("body").append(`
            <div id="customFieldModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Field dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h3 id="customFieldTitle">Add Field</h3>
                  <button class="modal-close" id="closeCustomFieldModal" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
                <input id="customFieldNameInput" placeholder="Field name" aria-label="Field name">
                <select id="customFieldTypeInput" aria-label="Field type"></select>
                <label class="checkbox-label"><input type="checkbox" id="customFieldRequiredInput"> Required</label>
                <textarea id="customFieldOptionsInput" rows="3" placeholder="Options for dropdown/radio (one per line)" aria-label="Field options"></textarea>
                <select id="customFieldConditionFieldInput" aria-label="Condition field"><option value="">No condition</option></select>
                <input id="customFieldConditionValueInput" placeholder="Condition value" aria-label="Condition value">
                <div class="modal-actions"><button id="saveCustomFieldBtn" class="btn-primary">Save Field</button></div>
              </div>
            </div>`);
        }

        if (!$("#customEntryModal").length) {
          $("body").append(`
            <div id="customEntryModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Entry dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h3 id="customEntryTitle">Add Entry</h3>
                  <button class="modal-close" id="closeCustomEntryModal" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
                <div id="customEntryFields"></div>
                <div class="modal-actions"><button id="saveCustomEntryBtn" class="btn-primary">Save Entry</button></div>
              </div>
            </div>`);
        }
      }

      function renderFieldList() {
        const html = sectionDraft.fields.map(f => `
          <article class="item">
            <div class="item-row"><h3>${escapeHtml(f.name)}</h3><span class="badge">${f.type}</span></div>
            <p class="muted">${f.required ? "Required" : "Optional"}${f.condition ? ` | if ${escapeHtml(f.condition.fieldId)} = ${escapeHtml(f.condition.equals)}` : ""}</p>
            <div class="item-actions">
              <button class="edit-custom-field" data-id="${f.id}">Edit</button>
              <button class="del-custom-field" data-id="${f.id}">Delete</button>
            </div>
          </article>`).join("");
        $("#customFieldList").html(html || "<p class='muted'>No fields. Add at least one.</p>");
      }

      function openSectionModal(section) {
        if (section) {
          const sc = getSchema(section);
          sectionDraft = { id: section.id, name: section.name || "", fields: sc.fields };
          $("#customSectionTitle").text("Edit Section");
        } else {
          sectionDraft = { id: 0, name: "My Section", fields: [{ id: "title", name: "Title", type: "text", required: true, options: [], condition: null }] };
          $("#customSectionTitle").text("Create Section");
        }
        $("#customSectionNameInput").val(sectionDraft.name);
        renderFieldList();
        $("#customSectionModal").removeClass("hidden");
      }

      function openFieldModal(id) {
        fieldEditId = id || null;
        const f = sectionDraft.fields.find(x => x.id === id) || { id: `field_${Date.now()}`, name: "", type: "text", required: false, options: [], condition: null };
        $("#customFieldTitle").text(id ? "Edit Field" : "Add Field");
        $("#customFieldNameInput").val(f.name);
        $("#customFieldTypeInput").val(f.type);
        $("#customFieldRequiredInput").prop("checked", f.required);
        $("#customFieldOptionsInput").val((f.options || []).join("\n"));
        const opts = [`<option value="">No condition</option>`].concat(sectionDraft.fields.filter(x => x.id !== f.id).map(x => `<option value="${x.id}">${escapeHtml(x.name)}</option>`));
        $("#customFieldConditionFieldInput").html(opts.join("")).val(f.condition?.fieldId || "");
        $("#customFieldConditionValueInput").val(f.condition?.equals || "");
        $("#customFieldModal").removeClass("hidden");
      }

      function renderEntryForm(section, values) {
        const sc   = getSchema(section);
        const html = sc.fields.map(f => {
          if (!visible(f, values)) return "";
          const req = f.required ? "required" : "";
          const v   = values[f.id];
          const label = `<label for="entry_${f.id}">${escapeHtml(f.name)}${f.required ? " *" : ""}</label>`;
          if (f.type === "text")     return `<div class="item">${label}<input id="entry_${f.id}" data-field="${f.id}" data-type="${f.type}" value="${escapeHtml(v || "")}" ${req}></div>`;
          if (f.type === "number")   return `<div class="item">${label}<input id="entry_${f.id}" data-field="${f.id}" data-type="${f.type}" type="number" value="${escapeHtml(v || "")}" ${req}></div>`;
          if (f.type === "date")     return `<div class="item">${label}<input id="entry_${f.id}" data-field="${f.id}" data-type="${f.type}" type="date" value="${escapeHtml(v || "")}" ${req}></div>`;
          if (f.type === "textarea") return `<div class="item">${label}<textarea id="entry_${f.id}" data-field="${f.id}" data-type="${f.type}" rows="3" ${req}>${escapeHtml(v || "")}</textarea></div>`;
          if (f.type === "checkbox") return `<div class="item"><label class="checkbox-label"><input id="entry_${f.id}" data-field="${f.id}" data-type="${f.type}" type="checkbox" ${v ? "checked" : ""}> ${escapeHtml(f.name)}</label></div>`;
          if (f.type === "dropdown") return `<div class="item">${label}<select id="entry_${f.id}" data-field="${f.id}" data-type="${f.type}" ${req}><option value="">Select...</option>${(f.options || []).map(o => `<option value="${escapeHtml(o)}" ${String(v || "") === String(o) ? "selected" : ""}>${escapeHtml(o)}</option>`).join("")}</select></div>`;
          if (f.type === "radio")    return `<div class="item">${label}${(f.options || []).map(o => `<label class="checkbox-label"><input type="radio" name="entry_radio_${f.id}" data-field="${f.id}" data-type="${f.type}" value="${escapeHtml(o)}" ${String(v || "") === String(o) ? "checked" : ""}> ${escapeHtml(o)}</label>`).join("")}</div>`;
          if (f.type === "file") {
            const p = pendingFiles[f.id];
            const pending    = p ? `<p class="muted">Selected: ${escapeHtml(p.name)} (${p.size} bytes)</p>` : "";
            const imagePreview = isImageFile(v) ? `<p><img src="${v.dataUrl}" alt="${escapeHtml(v.name)}" style="max-width:180px;max-height:120px;border-radius:8px;border:1px solid var(--border)"></p>` : "";
            const linkPreview  = isFile(v) && v.dataUrl ? `<button type="button" class="custom-file-preview" data-preview-id="${cachePreviewData(v.dataUrl)}">Preview</button>` : "";
            const preview      = isFile(v) ? `<p class="muted">File: ${escapeHtml(v.name)} (${v.size} bytes) ${linkPreview}</p>${imagePreview}` : "";
            return `<div class="item">${label}<input id="entry_${f.id}" data-field="${f.id}" data-type="${f.type}" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt">${pending}${preview}</div>`;
          }
          return "";
        }).join("");
        $("#customEntryFields").html(html || "<p class='muted'>No fields</p>");
      }

      function collectEntry(section) {
        const sc  = getSchema(section);
        const out = { ...entryDraft };
        sc.fields.forEach(f => {
          if (!visible(f, out)) return;
          if (f.type === "radio") { out[f.id] = $(`input[name='entry_radio_${f.id}']:checked`).val() || ""; return; }
          const $el = $(`#entry_${f.id}`);
          if (!$el.length) return;
          if (f.type === "checkbox") out[f.id] = $el.is(":checked");
          else if (f.type === "number") out[f.id] = $el.val() === "" ? "" : Number($el.val());
          else if (f.type !== "file") out[f.id] = $el.val();
        });
        return out;
      }

      function readDataUrl(file) {
        return new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
      }

      async function collectFiles(section, out) {
        const sc = getSchema(section);
        for (const f of sc.fields) {
          if (f.type !== "file") continue;
          if (pendingFiles[f.id]) {
            const file = pendingFiles[f.id];
            out[f.id] = { name: file.name, size: file.size, type: file.type || "application/octet-stream", uploadedAt: nowIso(), dataUrl: await readDataUrl(file) };
            out._auto = out._auto || {}; out._auto.lastFileName = file.name; out._auto.lastFileUploadAt = nowIso();
            continue;
          }
          const el = document.getElementById(`entry_${f.id}`);
          if (!el || !el.files || !el.files.length) continue;
          const file = el.files[0];
          out[f.id] = { name: file.name, size: file.size, type: file.type || "application/octet-stream", uploadedAt: nowIso(), dataUrl: await readDataUrl(file) };
          out._auto = out._auto || {}; out._auto.lastFileName = file.name; out._auto.lastFileUploadAt = nowIso();
        }
      }

      function validateEntry(section, out) {
        const sc = getSchema(section);
        for (const f of sc.fields) {
          if (!f.required || !visible(f, out)) continue;
          const v = out[f.id];
          if (v === undefined || v === null || v === "" || (f.type === "file" && !isFile(v))) { ctx.toast(`${f.name} is required`, true); return false; }
        }
        return true;
      }

      function enrichMeta(out, isNew) {
        out._meta = out._meta || {};
        out._activity = Array.isArray(out._activity) ? out._activity : [];
        if (isNew && !out._meta.createdAtLocal) out._meta.createdAtLocal = nowIso();
        out._meta.updatedAtLocal = nowIso();
        out._meta.modifiedBy = actor();
        out._activity.push({ action: isNew ? "created" : "updated", at: nowIso(), by: actor() });
      }

      // ── Boot ───────────────────────────────────────────────
      ensureModals();
      FIELD_TYPES.forEach(t => $("#customFieldTypeInput").append(`<option value="${t}">${t}</option>`));

      // Section CRUD
      $("#addCustomSectionBtn").on("click", () => openSectionModal(null));
      $(document).on("click", "#emptyAddSection", () => openSectionModal(null));
      $(document).on("click", ".edit-section", function () { openSectionModal(ctx.state.sections.find(x => x.id === Number($(this).data("id"))) || null); });
      $(document).on("click", ".del-section", function () { ctx.del(`/custom-sections/${Number($(this).data("id"))}`, () => loadSections().done(ctx.renderDashboard)); });

      // Section modal
      $("#closeCustomSectionModal").on("click", () => $("#customSectionModal").addClass("hidden"));
      $(document).on("click", "#customSectionModal", function (e) { if (e.target === this) $("#customSectionModal").addClass("hidden"); });

      // Field CRUD
      $("#addCustomFieldBtn").on("click", () => openFieldModal(null));
      $(document).on("click", ".edit-custom-field", function () { openFieldModal(String($(this).data("id"))); });
      $(document).on("click", ".del-custom-field", function () { sectionDraft.fields = sectionDraft.fields.filter(f => f.id !== String($(this).data("id"))); renderFieldList(); });

      // Field modal
      $("#closeCustomFieldModal").on("click", () => $("#customFieldModal").addClass("hidden"));
      $(document).on("click", "#customFieldModal", function (e) { if (e.target === this) $("#customFieldModal").addClass("hidden"); });

      $("#saveCustomFieldBtn").on("click", () => {
        const name = ctx.req(("" + ($("#customFieldNameInput").val() || "")).trim(), "Field name"); if (!name) return;
        const type = $("#customFieldTypeInput").val();
        const opts = (("" + ($("#customFieldOptionsInput").val() || "")).split("\n")).map(x => x.trim()).filter(Boolean);
        if ((type === "dropdown" || type === "radio") && !opts.length) return ctx.toast("Options required", true);
        let id = fieldEditId || String(name).toLowerCase().replace(/[^a-z0-9_]+/g, "_");
        if (!fieldEditId && sectionDraft.fields.some(f => f.id === id)) id = `${id}_${Date.now()}`;
        const condField = $("#customFieldConditionFieldInput").val();
        const field = { id, name, type, required: $("#customFieldRequiredInput").is(":checked"), options: opts, condition: condField ? { fieldId: condField, equals: $("#customFieldConditionValueInput").val() || "" } : null };
        const idx = sectionDraft.fields.findIndex(f => f.id === id);
        if (idx >= 0) sectionDraft.fields[idx] = field; else sectionDraft.fields.push(field);
        $("#customFieldModal").addClass("hidden");
        renderFieldList();
      });

      $("#saveCustomSectionBtn").on("click", () => {
        const name = ctx.req(("" + ($("#customSectionNameInput").val() || "")).trim(), "Section name"); if (!name) return;
        if (!sectionDraft.fields.length) return ctx.toast("Add at least one field", true);
        sectionDraft.name = name;
        const payload = { name, schemaJson: JSON.stringify({ fields: sectionDraft.fields }) };
        const route   = sectionDraft.id ? `/custom-sections/${sectionDraft.id}` : "/custom-sections";
        const method  = sectionDraft.id ? "PUT" : "POST";
        apiCall(method, route, payload).done(() => {
          $("#customSectionModal").addClass("hidden");
          ctx.toast(sectionDraft.id ? "Section updated" : "Section created");
          loadSections().done(ctx.renderDashboard);
        });
      });

      // Entry CRUD
      $(document).on("click", ".add-entry", function () {
        const sec = ctx.state.sections.find(x => x.id === Number($(this).data("id")));
        if (!sec) return;
        activeSectionId = sec.id; activeEntryId = 0; entryDraft = {}; pendingFiles = {};
        $("#customEntryTitle").text("Add Entry");
        renderEntryForm(sec, entryDraft);
        $("#customEntryModal").removeClass("hidden");
      });

      $(document).on("click", ".edit-entry", function () {
        const sid = Number($(this).data("section")), id = Number($(this).data("id"));
        const sec = ctx.state.sections.find(x => x.id === sid);
        const row = (ctx.state.entries[sid] || []).find(x => x.id === id);
        if (!sec || !row) return;
        activeSectionId = sid; activeEntryId = id; entryDraft = parseJson(row.dataJson, {}); pendingFiles = {};
        $("#customEntryTitle").text("Edit Entry");
        renderEntryForm(sec, entryDraft);
        $("#customEntryModal").removeClass("hidden");
      });

      $("#closeCustomEntryModal").on("click", () => $("#customEntryModal").addClass("hidden"));
      $(document).on("click", "#customEntryModal", function (e) { if (e.target === this) $("#customEntryModal").addClass("hidden"); });

      $(document).on("input change", "#customEntryFields input, #customEntryFields textarea, #customEntryFields select", function () {
        const sec = ctx.state.sections.find(x => x.id === activeSectionId); if (!sec) return;
        if (String($(this).data("type") || "") === "file") { const fieldId = String($(this).data("field") || ""); pendingFiles[fieldId] = this.files && this.files.length ? this.files[0] : null; return; }
        entryDraft = collectEntry(sec);
        renderEntryForm(sec, entryDraft);
      });

      $("#saveCustomEntryBtn").on("click", async () => {
        const sec = ctx.state.sections.find(x => x.id === activeSectionId); if (!sec) return;
        let out = collectEntry(sec);
        await collectFiles(sec, out);
        if (!validateEntry(sec, out)) return;
        enrichMeta(out, !activeEntryId);
        const payload = { dataJson: JSON.stringify(out) };
        const route   = activeEntryId ? `/custom-sections/${activeSectionId}/entries/${activeEntryId}` : `/custom-sections/${activeSectionId}/entries`;
        apiCall(activeEntryId ? "PUT" : "POST", route, payload).done(() => {
          $("#customEntryModal").addClass("hidden");
          ctx.toast(activeEntryId ? "Entry updated" : "Entry created");
          loadSections().done(ctx.renderDashboard);
        });
      });

      $(document).on("click", ".del-entry", function () {
        ctx.del(`/custom-sections/${Number($(this).data("section"))}/entries/${Number($(this).data("id"))}`, () => loadSections());
      });

      // Search / filters
      let searchTimer;
      $(document).on("input", ".custom-q", function () {
        clearTimeout(searchTimer);
        const id = Number($(this).data("id")), val = $(this).val();
        searchTimer = setTimeout(() => { getUi(id).q = val; getUi(id).page = 1; renderSections(); }, 220);
      });
      $(document).on("change", ".custom-sort", function () { const s = getUi(Number($(this).data("id"))); s.sort = $(this).val(); s.page = 1; renderSections(); });
      $(document).on("change", ".custom-file", function () { const s = getUi(Number($(this).data("id"))); s.fileOnly = $(this).is(":checked"); s.page = 1; renderSections(); });
      $(document).on("change", ".custom-page-size", function () { const s = getUi(Number($(this).data("id"))); s.pageSize = parseInt($(this).val()); s.page = 1; renderSections(); });

      // Pagination
      $(document).on("click", ".custom-prev", function () { const s = getUi(Number($(this).data("id"))); if (s.page > 1) { s.page--; renderSections(); } });
      $(document).on("click", ".custom-next", function () {
        const id = Number($(this).data("id")), s = getUi(id);
        const t = Math.max(1, Math.ceil((ctx.state.entries[id] || []).length / (s.pageSize || 8)));
        if (s.page < t) { s.page++; renderSections(); }
      });
      $(document).on("click", ".custom-pg-num", function () { getUi(Number($(this).data("id"))).page = parseInt($(this).data("page")); renderSections(); });

      // Clear filters
      $(document).on("click", ".custom-clear-filters", function () {
        const s = getUi(Number($(this).data("id")));
        s.q = ""; s.fileOnly = false; s.page = 1;
        renderSections();
      });

      // Export dropdown toggle
      $(document).on("click", ".cs-export-trigger", function (e) {
        e.stopPropagation();
        const id   = $(this).data("id");
        const menu = $(`.cs-export-menu[data-id="${id}"]`);
        $(".cs-export-menu").not(menu).addClass("hidden");
        menu.toggleClass("hidden");
      });
      $(document).on("click", function () { $(".cs-export-menu").addClass("hidden"); });

      // Export actions
      $(document).on("click", ".custom-export-json", function () { exportData(Number($(this).data("id")), 'json'); $(".cs-export-menu").addClass("hidden"); });
      $(document).on("click", ".custom-export-csv",  function () { exportData(Number($(this).data("id")), 'csv');  $(".cs-export-menu").addClass("hidden"); });
      $(document).on("click", ".custom-export-pdf",  function () { exportData(Number($(this).data("id")), 'pdf');  $(".cs-export-menu").addClass("hidden"); });

      // Expand / Collapse cards
      $(document).on("click", ".cs-expand-btn", function () {
        const id       = $(this).data("id");
        const overflow = $(`.cs-overflow-rows[data-id="${id}"]`);
        const expanded = $(this).data("expanded") === true || $(this).attr("data-expanded") === "true";
        if (expanded) {
          overflow.addClass("hidden");
          $(this).attr("data-expanded", "false").html(`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg> Show more fields`);
        } else {
          overflow.removeClass("hidden");
          $(this).attr("data-expanded", "true").html(`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg> Show less`);
        }
      });

      // File preview
      $(document).on("click", ".custom-file-preview", function () {
        const dataUrl = previewStore[String($(this).data("preview-id") || "")];
        if (!dataUrl) return ctx.toast("Preview not available", true);
        try {
          const url = URL.createObjectURL(dataUrlToBlob(dataUrl));
          window.open(url, "_blank", "noopener");
          setTimeout(() => URL.revokeObjectURL(url), 30000);
        } catch (_) { ctx.toast("Unable to open preview", true); }
      });

      ctx.modules.custom = { loadSections };
    }
  };
})();
