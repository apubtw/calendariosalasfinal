/**
 * Overlay de carga a pantalla completa. Cuando está oculto no deja nodos en el DOM.
 *
 * Uso:
 *   FormPageLoader.show("Enviando...");
 *   try { await algunaPromesa(); } finally { FormPageLoader.hide(); }
 */
(function formPageLoader(global) {
    let overlayNode = null;

    function buildOverlay(message) {
        const root = document.createElement("div");
        root.className = "form-page-loader";
        root.setAttribute("role", "status");
        root.setAttribute("aria-live", "polite");
        root.setAttribute("aria-busy", "true");

        const spinner = document.createElement("div");
        spinner.className = "form-page-loader__spinner";

        const srOnly = document.createElement("span");
        srOnly.className = "visually-hidden";
        srOnly.textContent = message;
        spinner.appendChild(srOnly);

        const msg = document.createElement("p");
        msg.className = "form-page-loader__message";
        msg.textContent = message;

        root.appendChild(spinner);
        root.appendChild(msg);

        return root;
    }

    function show(message) {
        const text =
            message != null && String(message).trim() !== ""
                ? String(message).trim()
                : "Procesando...";

        hide();
        overlayNode = buildOverlay(text);
        document.body.appendChild(overlayNode);
    }

    function hide() {
        if (overlayNode && overlayNode.parentNode) {
            overlayNode.parentNode.removeChild(overlayNode);
        }
        overlayNode = null;
    }

    function isVisible() {
        return overlayNode !== null;
    }

    const api = { show, hide, isVisible };
    Object.defineProperty(api, "showLoading", {
        get() {
            return overlayNode !== null;
        },
        enumerable: true
    });
    global.FormPageLoader = api;
})(typeof window !== "undefined" ? window : globalThis);

/*
 * Ejemplo: loader al enviar un formulario (async / fetch)
 *
 * const form = document.getElementById("miFormulario");
 * form.addEventListener("submit", async (e) => {
 *   e.preventDefault();
 *   FormPageLoader.show("Enviando...");
 *   try {
 *     const res = await fetch("/api/reserva", { method: "POST", body: new FormData(form) });
 *     if (!res.ok) throw new Error("Error del servidor");
 *   } catch (err) {
 *     console.error(err);
 *   } finally {
 *     FormPageLoader.hide();
 *   }
 * });
 *
 * Ejemplo: simular demora sin formulario
 *
 * FormPageLoader.show("Procesando...");
 * await new Promise((r) => setTimeout(r, 2000));
 * FormPageLoader.hide();
 */
