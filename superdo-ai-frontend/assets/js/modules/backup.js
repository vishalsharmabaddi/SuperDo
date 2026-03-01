(function () {
    window.SuperDoModules = window.SuperDoModules || {};

    window.SuperDoModules.backup = {
        init(ctx) {
            function exportBackup() {
                const blob = new Blob([JSON.stringify({
                    exportedAt: new Date().toISOString(),
                    notes: ctx.state.notes,
                    expenses: ctx.state.expenses,
                    rentRecords: ctx.state.rent,
                    marriagePlanner: ctx.state.marriage,
                    customSections: ctx.state.sections,
                    customEntries: ctx.state.entries
                }, null, 2)], { type: "application/json;charset=utf-8;" });
                const u = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = u;
                a.download = `superdo-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(u);
                ctx.toast("Backup exported");
            }

            $("#exportBackupBtn").on("click", exportBackup);
        }
    };
})();
