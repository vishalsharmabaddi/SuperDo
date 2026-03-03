const DEV_PORTS = ["3000", "5173", "5500"];
const PROD_API  = "https://superdo-backend-latest.onrender.com/api";

const API_BASE = DEV_PORTS.includes(window.location.port)
    ? "http://localhost:8081/api"       // local dev (Live Server / Vite)
    : window.location.protocol === "https:"
        ? PROD_API                      // Netlify (HTTPS)
        : "/api";                       // Docker self-hosted (Nginx proxy)
const CSRF_COOKIE_NAME = "superdo_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";

const api = {
    _accessToken: null,
    _refreshPromise: null,

    setAccessToken(token) {
        this._accessToken = token || null;
        try {
            if (token) {
                sessionStorage.setItem("superdo_access", token);
            } else {
                sessionStorage.removeItem("superdo_access");
            }
        } catch (_) { /* private browsing */ }
    },

    getAccessToken() {
        if (this._accessToken) return this._accessToken;
        try {
            const stored = sessionStorage.getItem("superdo_access");
            if (stored) { this._accessToken = stored; return stored; }
        } catch (_) {}
        return null;
    },

    clearAccessToken() {
        this._accessToken = null;
        try { sessionStorage.removeItem("superdo_access"); } catch (_) {}
    },

    refreshSession() {
        const csrfToken = this.getCookie(CSRF_COOKIE_NAME);
        const headers = csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {};
        if (!this._refreshPromise) {
            this._refreshPromise = $.ajax({
                url: `${API_BASE}/auth/refresh`,
                method: "POST",
                contentType: "application/json",
                dataType: "json",
                xhrFields: { withCredentials: true },
                headers
            }).done((res) => {
                this.setAccessToken(res.accessToken);
            }).always(() => {
                this._refreshPromise = null;
            });
        }
        return this._refreshPromise;
    },

    request(method, path, body, query, allowRetry = true) {
        const deferred = $.Deferred();
        const headers = this.buildHeaders(path);
        $.ajax({
            url: `${API_BASE}${path}`,
            method,
            contentType: "application/json",
            xhrFields: { withCredentials: true },
            headers,
            data: method === "GET" ? query : (body ? JSON.stringify(body) : undefined)
        }).done((res) => {
            deferred.resolve(res);
        }).fail((xhr) => {
            if (xhr.status === 401 && allowRetry) {
                this.refreshSession()
                    .then(() => this.request(method, path, body, query, false))
                    .then((res) => deferred.resolve(res))
                    .fail((refreshErr) => deferred.reject(refreshErr));
                return;
            }
            deferred.reject(xhr);
        });
        return deferred.promise();
    },

    buildHeaders(path) {
        const headers = {};
        if (this._accessToken) {
            headers.Authorization = `Bearer ${this._accessToken}`;
        }
        if (path === "/auth/refresh" || path === "/auth/logout") {
            const csrfToken = this.getCookie(CSRF_COOKIE_NAME);
            if (csrfToken) {
                headers[CSRF_HEADER_NAME] = csrfToken;
            }
        }
        return headers;
    },

    getCookie(name) {
        const prefix = `${name}=`;
        const parts = document.cookie ? document.cookie.split("; ") : [];
        for (const part of parts) {
            if (part.startsWith(prefix)) {
                return decodeURIComponent(part.substring(prefix.length));
            }
        }
        return null;
    }
};
