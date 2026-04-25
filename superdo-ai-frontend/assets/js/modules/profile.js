(function () {
    window.SuperDoModules = window.SuperDoModules || {};

    window.SuperDoModules.profile = {
        init(ctx) {
            const SUPPORT_EMAIL = "satiypropa@gmail.com";
            const $profileMenu = $("#profileQuickMenu");
            const $openProfileBtn = $("#openProfileBtn");
            const $sidebarAvatar = $("#sidebarProfileAvatar");
            const $sidebarFallback = $("#sidebarProfileFallback");
            const $sidebarLetter = $("#sidebarProfileLetter");
            const $profileQuickAvatar = $("#profileQuickAvatar");
            const $profileQuickName = $("#profileQuickName");
            const $profileQuickEmail = $("#profileQuickEmail");
            const $profileModal = $("#profileModal");

            function getProfile() {
                return JSON.parse(localStorage.getItem("superdo_profile") || "{}");
            }

            function setProfile(data) {
                localStorage.setItem("superdo_profile", JSON.stringify(data));
            }

            function getStoredEmail() {
                return (localStorage.getItem("userEmail") || getProfile().email || "").trim();
            }

            function getStoredName() {
                return (localStorage.getItem("userName") || getProfile().name || "").trim();
            }

            function formatNameFromEmail(email) {
                const prefix = (email.split("@")[0] || "").trim();
                if (!prefix) return "";
                return `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}`.slice(0, 10);
            }

            function initSidebarProfile() {
                const email = getStoredEmail();
                const name = getStoredName() || formatNameFromEmail(email);
                const initial = (email.charAt(0) || name.charAt(0) || "U").toUpperCase();
                let $userName = $("#sidebarUserName");

                if (!$userName.length) {
                    $userName = $('<span id="sidebarUserName"></span>');
                    $openProfileBtn.append($userName);
                }

                $sidebarFallback.css("display", "none");
                $sidebarLetter.removeClass("hidden").css({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "15px",
                    color: "#ffffff"
                }).text(initial);

                $sidebarAvatar.css({
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: "0",
                    backgroundImage: "none"
                }).removeClass("has-image");

                $openProfileBtn.css({
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px",
                    borderRadius: "8px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer"
                });

                $userName.css({
                    color: "var(--text)",
                    fontSize: "13px",
                    fontWeight: "500",
                    marginLeft: "8px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100px",
                    display: "block"
                }).text(name || formatNameFromEmail(email) || "Guest");

                $profileQuickAvatar.text(initial);
                $profileQuickName.text(name || formatNameFromEmail(email) || "Guest User");
                $profileQuickEmail.text(email || "Please login first");
            }

            window.initSidebarProfile = initSidebarProfile;

            function updateAvatar(name, imageUrl) {
                const avatar = $("#profileAvatarPreview");
                const letter = (name || "U").trim().charAt(0).toUpperCase();
                avatar.text(letter || "U");
                if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
                    avatar.css("background-image", `url("${imageUrl}")`);
                    avatar.css("color", "transparent");
                } else {
                    avatar.css("background-image", "none");
                    avatar.css("color", "");
                }
            }

            function setIdentity(name, email) {
                const resolvedName = (name || "").trim() || formatNameFromEmail(email || "");
                const resolvedEmail = (email || "").trim();

                $("#profileIdentityName").text(resolvedName || "Not signed in");
                $("#profileIdentityEmail").text(resolvedEmail || "Please login first");
                if (resolvedName) {
                    localStorage.setItem("userName", resolvedName);
                }
                if (resolvedEmail) {
                    localStorage.setItem("userEmail", resolvedEmail);
                }
                initSidebarProfile();
            }

            function loadIdentity() {
                const localProfile = getProfile();
                setIdentity(localProfile.name || "", localProfile.email || "");
                updateAvatar(localProfile.name, localProfile.image);

                return api.request("GET", "/auth/me", null, null, false).done(user => {
                    const fullName = user?.fullName || localProfile.name || "";
                    const email = user?.email || localProfile.email || "";
                    setIdentity(fullName, email);
                    updateAvatar(fullName, localProfile.image);
                    if (user?.email || fullName) {
                        setProfile({
                            name: fullName,
                            image: localProfile.image || "",
                            notifications: localProfile.notifications !== false,
                            phone: localProfile.phone || "",
                            location: localProfile.location || "",
                            rating: localProfile.rating || "",
                            feedback: localProfile.feedback || "",
                            email
                        });
                    }
                }).fail(() => {
                    initSidebarProfile();
                    if (!localProfile.name && !localProfile.email) {
                        $("#profileIdentityName").text("Not signed in");
                        $("#profileIdentityEmail").text("Please login first");
                        updateAvatar("", "");
                    }
                });
            }

            function openSupportMail(subjectPrefix) {
                const rating = ($("#profileRating").val() || "").trim();
                const feedback = ($("#profileFeedback").val() || "").trim();
                const email = ($("#profileIdentityEmail").text() || "").trim();
                const name = ($("#profileName").val() || "").trim() || ($("#profileIdentityName").text() || "").trim();

                if (!feedback) {
                    ctx.toast("Please write a short message first", true);
                    return;
                }

                const lines = [
                    `Name: ${name || "-"}`,
                    `Email: ${email || "-"}`,
                    `Rating: ${rating || "-"}`,
                    "",
                    "Message:",
                    feedback
                ];
                const subject = `${subjectPrefix} - SuperDo AI`;
                const body = encodeURIComponent(lines.join("\n"));
                window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${body}`;
            }

            function openProfileModal() {
                const p = getProfile();
                $("#profileName").val(p.name || getStoredName() || "");
                $("#profilePhone").val(p.phone || "");
                $("#profileLocation").val(p.location || "");
                $("#profileImage").val(p.image || "");
                $("#profileNotify").prop("checked", p.notifications !== false);
                $("#profileRating").val(p.rating || "");
                $("#profileFeedback").val(p.feedback || "");
                loadIdentity();
                $profileModal.removeClass("hidden");
            }

            function getHelpDisplayName() {
                return getStoredName() || formatNameFromEmail(getStoredEmail()) || "there";
            }

            function syncHelpIdentity() {
                $("#profileHelpUserName").text(getHelpDisplayName());
            }

            function syncHelpTopicSearch() {
                const query = ($("#profileHelpSearchInput").val() || "").trim().toLowerCase();
                let visibleCount = 0;
                $("#profileHelpModal .profile-help-topic").each(function () {
                    const keywords = (this.dataset.keywords || "").toLowerCase();
                    const label = $(this).text().toLowerCase();
                    const matches = !query || keywords.includes(query) || label.includes(query);
                    $(this).toggleClass("hidden", !matches);
                    if (matches) {
                        visibleCount += 1;
                    }
                });

                $("#profileHelpNoResults").toggleClass("hidden", visibleCount !== 0);
                $("#profileHelpSearchStatus").text(
                    query
                        ? `${visibleCount} topic${visibleCount === 1 ? "" : "s"} match`
                        : "3 topics available"
                );
            }

            function openHelpDrawer() {
                syncHelpIdentity();
                $("#profileHelpSearchInput").val("");
                $("#profileHelpModal .profile-help-topic").removeClass("hidden");
                $("#profileHelpNoResults").addClass("hidden");
                $("#profileHelpSearchStatus").text("3 topics available");
                $("#profileHelpModal").removeClass("hidden");
            }

            function openSupportMailLink(subject, bodyLines) {
                const body = encodeURIComponent(bodyLines.join("\n"));
                window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${body}`;
            }

            function closeProfileMenu() {
                $profileMenu.addClass("hidden");
                $openProfileBtn.attr("aria-expanded", "false");
            }

            function toggleProfileMenu() {
                const open = $profileMenu.toggleClass("hidden").hasClass("hidden") === false;
                $openProfileBtn.attr("aria-expanded", open ? "true" : "false");
                initSidebarProfile();
                if (open) {
                    loadIdentity();
                }
            }

            $openProfileBtn.on("click", function (event) {
                event.stopPropagation();
                toggleProfileMenu();
                initSidebarProfile();
            });

            $profileMenu.on("click", function (event) {
                event.stopPropagation();
            });

            $("#profileQuickOpenSettings").on("click", () => {
                closeProfileMenu();
                openProfileModal();
                initSidebarProfile();
            });
            $("#profileQuickTheme").on("click", () => {
                closeProfileMenu();
                if ($("#themeToggle").length) {
                    $("#themeToggle").trigger("click");
                } else {
                    window.SuperDoActions?.toggleTheme?.();
                }
                initSidebarProfile();
            });
            $("#profileQuickExport").on("click", () => {
                closeProfileMenu();
                if ($("#exportBackupBtn").length) {
                    $("#exportBackupBtn").trigger("click");
                } else {
                    window.SuperDoActions?.exportBackup?.();
                }
                initSidebarProfile();
            });
            $("#profileQuickLogout").on("click", () => {
                closeProfileMenu();
                initSidebarProfile();
            });

            document.addEventListener("click", (event) => {
                const menu = document.getElementById("profileQuickMenu");
                const button = document.getElementById("openProfileBtn");
                if (!menu || !button) return;
                if (!menu.contains(event.target) && !button.contains(event.target)) {
                    closeProfileMenu();
                }
            });

            $("#closeProfileHelpModal").on("click", () => $("#profileHelpModal").addClass("hidden"));
            $("#profileHelpModal").on("click", (event) => {
                if (event.target === event.currentTarget) {
                    $("#profileHelpModal").addClass("hidden");
                }
            });
            $("#profileHelpEmailBtn").on("click", () => {
                openSupportMailLink("SuperDo Support Request", [
                    "Hello SuperDo Support,",
                    "",
                    "I need help with:"
                ]);
            });
            $("#profileHelpSearchInput").on("input", syncHelpTopicSearch);
            $("#profileHelpOpenSettings").on("click", () => {
                $("#profileHelpModal").addClass("hidden");
                openProfileModal();
            });
            $("#profileHelpOpenBackup").on("click", () => {
                $("#profileHelpModal").addClass("hidden");
                if ($("#exportBackupBtn").length) {
                    $("#exportBackupBtn").trigger("click");
                } else {
                    window.SuperDoActions?.exportBackup?.();
                }
            });
            $("#profileHelpUsageGuide").on("click", () => {
                $("#profileHelpModal").addClass("hidden");
                ctx.toast("Use the left menu to open Notes, Rent, Expenses, Loans, or Custom Sections.");
            });

            $("#closeProfileModal").on("click", () => {
                $profileModal.addClass("hidden");
                initSidebarProfile();
            });

            $("#profileName, #profileImage").on("input", () => {
                updateAvatar($("#profileName").val().trim(), $("#profileImage").val().trim());
            });

            $("#sendFeedbackBtn").on("click", () => openSupportMail("Feedback"));
            $("#requestHelpBtn").on("click", () => openSupportMail("Help Request"));

            $("#saveProfileBtn").on("click", () => {
                const current = getProfile();
                const nextProfile = {
                    name: $("#profileName").val().trim(),
                    phone: $("#profilePhone").val().trim(),
                    location: $("#profileLocation").val().trim(),
                    image: $("#profileImage").val().trim(),
                    notifications: $("#profileNotify").is(":checked"),
                    rating: $("#profileRating").val(),
                    feedback: $("#profileFeedback").val().trim(),
                    email: current.email || getStoredEmail() || ""
                };
                setProfile(nextProfile);
                if (nextProfile.name) {
                    localStorage.setItem("userName", nextProfile.name);
                }
                if (nextProfile.email) {
                    localStorage.setItem("userEmail", nextProfile.email);
                }
                loadIdentity();
                $profileModal.addClass("hidden");
                initSidebarProfile();
                ctx.toast("Profile saved");
            });

            document.addEventListener("DOMContentLoaded", initSidebarProfile);
            initSidebarProfile();
            loadIdentity();
            syncHelpIdentity();
        }
    };
})();
