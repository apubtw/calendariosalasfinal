(function () {
    const meta = document.querySelector('meta[name="app-version"]');
    const current = meta ? meta.getAttribute("content") : "";
    if (!current || current === "local" || current === "__APP_VERSION__") return;

    const POLL_MS = 60 * 1000;
    let shown = false;

    function showToast() {
        if (shown) return;
        shown = true;

        const toast = document.createElement("div");
        toast.className = "version-toast";
        toast.setAttribute("role", "status");
        toast.innerHTML = `
            <p>Hay una nueva versión del calendario.</p>
            <button type="button">Recargar</button>
        `;
        toast.querySelector("button").addEventListener("click", () => {
            location.reload();
        });
        document.body.appendChild(toast);
    }

    async function check() {
        try {
            const response = await fetch("/version", { cache: "no-store" });
            if (!response.ok) return;
            const data = await response.json();
            if (data.version && data.version !== current) showToast();
        } catch {
            // La siguiente consulta reintenta.
        }
    }

    check();
    setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
    });
})();
