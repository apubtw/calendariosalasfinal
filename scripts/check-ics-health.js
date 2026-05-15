"use strict";

/**
 * Healthcheck HTTP de todas las URLs .ics definidas en config/calendar-config.js.
 * No parsea iCalendar: solo status, método usado y Content-Type.
 *
 * Uso:
 *   npm run check-ics
 *   node scripts/check-ics-health.js --via-server
 *
 * --via-server  Peticiona http://localhost:3000/ics/<sala> (servidor Express debe estar
 *               en marcha). Útil si Office365 bloquea o responde 400 a probes directos.
 */

const axios = require("axios");
const { icsUrls } = require("../config/calendar-config");

const TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 5;
const CONCURRENCY = 4;
const viaServer = process.argv.includes("--via-server");
const serverOrigin = process.env.CALENDAR_SERVER_ORIGIN || "http://localhost:3000";

const axiosBase = {
    timeout: TIMEOUT_MS,
    maxRedirects: MAX_REDIRECTS,
    validateStatus: () => true,
    headers: {
        Accept: "text/calendar,text/plain,*/*;q=0.8",
        "Accept-Language": "es-CL,es;q=0.9,en;q=0.7",
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://outlook.office365.com/owa/",
    },
};

async function probeWithGet(url) {
    const res = await axios.get(url, {
        ...axiosBase,
        responseType: "stream",
    });
    const status = res.status;
    const contentType = res.headers["content-type"] || "(sin header)";
    if (res.data && typeof res.data.destroy === "function") {
        res.data.destroy();
    }
    return { method: "GET", status, contentType };
}

async function probeUrl(url) {
    async function safeGet() {
        try {
            return await probeWithGet(url);
        } catch (err) {
            const code = err.code || "";
            const msg = err.message || String(err);
            return {
                method: "GET",
                status: 0,
                contentType: `${code ? `${code} ` : ""}${msg}`,
            };
        }
    }

    try {
        const head = await axios.head(url, axiosBase);
        if (head.status >= 200 && head.status < 300) {
            return {
                method: "HEAD",
                status: head.status,
                contentType: head.headers["content-type"] || "(sin header)",
            };
        }
        return safeGet();
    } catch {
        return safeGet();
    }
}

function classify(status) {
    if (status === 0) return "FAIL";
    if (status >= 200 && status < 300) return "OK";
    if (status === 401 || status === 403) return "AUTH";
    if (status === 404 || status === 410) return "GONE";
    if (status >= 500) return "SERVER";
    return "FAIL";
}

async function mapPool(items, limit, mapper) {
    const out = new Array(items.length);
    let next = 0;

    async function worker() {
        while (next < items.length) {
            const i = next;
            next += 1;
            out[i] = await mapper(items[i], i);
        }
    }

    const n = Math.min(limit, items.length);
    await Promise.all(Array.from({ length: n }, () => worker()));
    return out;
}

async function main() {
    const entries = Object.entries(icsUrls);
    if (entries.length === 0) {
        console.error("No hay URLs en icsUrls.");
        process.exitCode = 1;
        return;
    }

    const probeEntries = viaServer
        ? entries.map(([name]) => [
              name,
              `${serverOrigin.replace(/\/$/, "")}/ics/${encodeURIComponent(name)}`,
          ])
        : entries;

    if (viaServer) {
        console.log(`Modo --via-server (${serverOrigin})\n`);
    }

    console.log(`Comprobando ${probeEntries.length} feeds ICS (timeout ${TIMEOUT_MS} ms, concurrencia ${CONCURRENCY})...\n`);

    const results = await mapPool(probeEntries, CONCURRENCY, async ([name, url]) =>({
        name,
        url,
        ...(await probeUrl(url)),
    }));

    const label = { OK: "[OK]", AUTH: "[AUTH]", GONE: "[GONE]", SERVER: "[SRV]", FAIL: "[--]" };

    let worst = 0;

    for (const r of results) {
        const bucket = classify(r.status);
        if (bucket !== "OK") worst = 1;
        const flag = label[bucket] || "[--]";
        const line = `${flag} ${r.status}\t${r.method.padEnd(4)}\t${r.name}`;
        console.log(line);
        if (bucket !== "OK") {
            console.log(`        ${r.contentType}`);
            console.log(`        ${r.url}`);
        }
    }

    const summary = results.reduce(
        (acc, r) => {
            acc[classify(r.status)] = (acc[classify(r.status)] || 0) + 1;
            return acc;
        },
        {}
    );

    console.log("\nResumen:");
    Object.keys(summary)
        .sort()
        .forEach((k) => console.log(`  ${k}: ${summary[k]}`));

    process.exitCode = worst;
}

main().catch((err) => {
    console.error("Error en healthcheck:", err.message || err);
    process.exitCode = 1;
});
