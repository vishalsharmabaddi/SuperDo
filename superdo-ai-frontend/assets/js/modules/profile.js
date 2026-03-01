(function () {
    window.SuperDoModules = window.SuperDoModules || {};

    window.SuperDoModules.profile = {
        init(ctx) {
            const SUPPORT_EMAIL = "support@superdo.ai";

            function getProfile() {
                return JSON.parse(localStorage.getItem("superdo_profile") || "{}");
            }

            function setProfile(data) {
                localStorage.setItem("superdo_profile", JSON.stringify(data));
            }

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
                $("#profileIdentityName").text(name || "Not signed in");
                $("#profileIdentityEmail").text(email || "Please login first");
            }

            function loadIdentity() {
                const localProfile = JSON.parse(localStorage.getItem("superdo_profile") || "{}");
                setIdentity(localProfile.name || "", localProfile.email || "");
                updateAvatar(localProfile.name, localProfile.image);

                api.request("GET", "/auth/me", null, null, false).done(user => {
                    const fallbackName = localProfile.name || "Current User";
                    setIdentity(user?.fullName || fallbackName, user?.email || "");
                    updateAvatar(user?.fullName || fallbackName, localProfile.image);
                    if (user?.email) {
                        localStorage.setItem("superdo_profile", JSON.stringify({
                            name: localProfile.name || "",
                            image: localProfile.image || "",
                            notifications: localProfile.notifications !== false,
                            phone: localProfile.phone || "",
                            location: localProfile.location || "",
                            email: user.email
                        }));
                    }
                }).fail(() => {
                    if (!localProfile.name && !localProfile.email) {
                        setIdentity("Not signed in", "Please login first");
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

            $("#openProfileBtn").on("click", () => {
                const p = getProfile();
                $("#profileName").val(p.name || "");
                $("#profilePhone").val(p.phone || "");
                $("#profileLocation").val(p.location || "");
                $("#profileImage").val(p.image || "");
                $("#profileNotify").prop("checked", p.notifications !== false);
                $("#profileRating").val(p.rating || "");
                $("#profileFeedback").val(p.feedback || "");
                loadIdentity();
                $("#profileModal").removeClass("hidden");
            });

            $("#closeProfileModal").on("click", () => $("#profileModal").addClass("hidden"));

            $("#profileName, #profileImage").on("input", () => {
                updateAvatar($("#profileName").val().trim(), $("#profileImage").val().trim());
            });

            $("#sendFeedbackBtn").on("click", () => openSupportMail("Feedback"));
            $("#requestHelpBtn").on("click", () => openSupportMail("Help Request"));

            $("#saveProfileBtn").on("click", () => {
                const current = getProfile();
                setProfile({
                    name: $("#profileName").val().trim(),
                    phone: $("#profilePhone").val().trim(),
                    location: $("#profileLocation").val().trim(),
                    image: $("#profileImage").val().trim(),
                    notifications: $("#profileNotify").is(":checked"),
                    rating: $("#profileRating").val(),
                    feedback: $("#profileFeedback").val().trim(),
                    email: current.email || ""
                });
                loadIdentity();
                $("#profileModal").addClass("hidden");
                ctx.toast("Profile saved");
            });
        }
    };
})();
