(function () {
    window.SuperDoModules = window.SuperDoModules || {};

    window.SuperDoModules.auth = {
        init(ctx) {
            let googleButtonRendered = false;
            let googleInitAttempts = 0;
            let googleInitTimer = null;
            const GOOGLE_INIT_MAX_ATTEMPTS = 30; // ~6s at 200ms interval

            function isGoogleReady() {
                return !!(window.google && window.google.accounts && window.google.accounts.id);
            }

            function showGoogleUnavailable() {
                $("#googleBtnContainer").html('<button disabled style="opacity:.5">Google unavailable</button>');
            }

            function initGoogleAuth() {
                if (!ctx.state.authConfig?.googleEnabled) {
                    showGoogleUnavailable();
                    return;
                }
                if (!isGoogleReady()) {
                    return;
                }
                if (googleButtonRendered) {
                    return;
                }

                window.google.accounts.id.initialize({
                    client_id: ctx.state.authConfig.googleClientId,
                    callback: function (response) {
                        if (!response.credential) return;
                        ctx.call("POST", "/auth/google", { idToken: response.credential }, null).done(r => {
                            api.setAccessToken(r.accessToken);
                            $("#authModal").addClass("hidden");
                            ctx.loadAll();
                            ctx.toast("Logged in with Google");
                        });
                    }
                });

                window.google.accounts.id.renderButton(
                    document.getElementById("googleBtnContainer"),
                    { theme: "outline", size: "large", width: "100%", text: "continue_with" }
                );
                googleButtonRendered = true;
            }

            function startGoogleInitWatcher() {
                if (!ctx.state.authConfig?.googleEnabled) {
                    showGoogleUnavailable();
                    return;
                }

                $("#googleBtnContainer").html('<button disabled style="opacity:.5">Loading Google...</button>');
                initGoogleAuth();
                if (googleButtonRendered) {
                    return;
                }

                googleInitTimer = window.setInterval(() => {
                    googleInitAttempts += 1;
                    initGoogleAuth();

                    if (googleButtonRendered) {
                        window.clearInterval(googleInitTimer);
                        googleInitTimer = null;
                        return;
                    }

                    if (googleInitAttempts >= GOOGLE_INIT_MAX_ATTEMPTS) {
                        window.clearInterval(googleInitTimer);
                        googleInitTimer = null;
                        showGoogleUnavailable();
                    }
                }, 200);

                const googleScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
                if (googleScript) {
                    googleScript.addEventListener("load", () => initGoogleAuth(), { once: true });
                    googleScript.addEventListener("error", () => showGoogleUnavailable(), { once: true });
                }
            }

            function loadAuthConfig() {
                const deferred = $.Deferred();
                const MAX_RETRIES = 6;
                const RETRY_DELAY_MS = 3000;

                function attempt(retriesLeft) {
                    $.ajax({
                        url: API_BASE + "/auth/config",
                        method: "GET",
                        dataType: "json",
                        xhrFields: { withCredentials: true }
                    }).done(config => {
                        ctx.state.authConfig = config;
                        startGoogleInitWatcher();
                        deferred.resolve();
                    }).fail(() => {
                        if (retriesLeft > 0) {
                            setTimeout(() => attempt(retriesLeft - 1), RETRY_DELAY_MS);
                        } else {
                            showGoogleUnavailable();
                            deferred.reject();
                        }
                    });
                }

                attempt(MAX_RETRIES);
                return deferred.promise();
            }

            function bootstrapSession() {
                // Try sessionStorage token first (survives page refresh)
                const cached = api.getAccessToken();
                if (cached) {
                    // Verify the cached token is still valid with a lightweight call
                    return api.request("GET", "/auth/me", null, null, true)
                        .then(() => ctx.loadAll())
                        .fail(() => {
                            // Token expired/invalid — try cookie-based refresh
                            api.clearAccessToken();
                            return api.refreshSession().done(() => ctx.loadAll());
                        });
                }
                return api.refreshSession().done(() => ctx.loadAll());
            }

            $("#openAuthModal").on("click", () => $("#authModal").removeClass("hidden"));
            $("#closeAuthModal").on("click", () => $("#authModal").addClass("hidden"));
            $("#logoutBtn").on("click", () => {
                api.request("POST", "/auth/logout", {}, null, false).always(() => {
                    api.clearAccessToken();
                    location.reload();
                });
            });

            $("#registerBtn").on("click", () => {
                const fullName = ctx.req($("#fullName").val().trim(), "Full name"); if (!fullName) return;
                const email = ctx.req($("#email").val().trim(), "Email"); if (!email) return;
                const password = ctx.req($("#password").val(), "Password"); if (!password) return;
                ctx.call("POST", "/auth/register", { fullName, email, password }).done(r => {
                    api.setAccessToken(r.accessToken);
                    $("#authModal").addClass("hidden");
                    ctx.loadAll();
                    ctx.toast("Registered");
                });
            });

            $("#loginBtn").on("click", () => {
                const email = ctx.req($("#email").val().trim(), "Email"); if (!email) return;
                const password = ctx.req($("#password").val(), "Password"); if (!password) return;
                ctx.call("POST", "/auth/login", { email, password }).done(r => {
                    api.setAccessToken(r.accessToken);
                    $("#authModal").addClass("hidden");
                    ctx.loadAll();
                    ctx.toast("Logged in");
                });
            });

            loadAuthConfig().always(() => {
                bootstrapSession().fail(() => $("#authModal").removeClass("hidden"));
            });
        }
    };
})();
