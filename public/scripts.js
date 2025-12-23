import { icsUrls, reservationConfig } from "./calendar-config.js";
let calendar;
let currentEventSource = null;
const parsedEventsCache = new Map();
let lastClickedDate = null;

// =========================
// Helpers globales
// =========================
function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

function fmtHora(d) {
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function fmtFechaHora(d) {
    return d.toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" });
}

function buildOutlookReservationLink({
    roomKey,
    start,
    end
}) {
    const cfg = reservationConfig[roomKey];
    if (!cfg) {
        console.warn("❌ No hay configuración de reserva para:", roomKey);
        return null;
    }

    const base = "https://outlook.office.com/calendar/0/deeplink/compose";

    const params = new URLSearchParams({
        to: cfg.email,
        location: cfg.location
    });

    if (start instanceof Date) {
        params.set("startdt", start.toISOString());
    }

    if (end instanceof Date) {
        params.set("enddt", end.toISOString());
    } else if (start instanceof Date && cfg.defaultDurationMinutes) {
        const autoEnd = new Date(start.getTime() + cfg.defaultDurationMinutes * 60000);
        params.set("enddt", autoEnd.toISOString());
    }

    if (cfg.body) {
        params.set("body", cfg.body);
    }

    return `${base}?${params.toString()}`;
}

// Formateo robusto de fechas ICS
function formatICSDate(dateStr) {
    if (!dateStr) return null;
    dateStr = String(dateStr).trim();

    // YYYYMMDD (all-day)
    if (/^\d{8}$/.test(dateStr)) {
        // Medianoche local
        return new Date(
            `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T00:00:00`
        );
    }

    // YYYYMMDDTHHMMSS con/sin Z
    const dtMatch = dateStr.match(/^(\d{8}T\d{6})(Z)?$/);
    if (dtMatch) {
        const out =
            dateStr.slice(0, 4) + "-" +
            dateStr.slice(4, 6) + "-" +
            dateStr.slice(6, 8) + "T" +
            dateStr.slice(9, 11) + ":" +
            dateStr.slice(11, 13) + ":" +
            dateStr.slice(13, 15) +
            (dtMatch[2] ? "Z" : "");
        return new Date(out);
    }

    // ISO (incluye milisegundos o zona) o con guiones
    if (dateStr.includes("-")) {
        return new Date(dateStr);
    }

    return null;
}

// =========================
// Cache de ICS (MEMORIA + localStorage)
// =========================
const ICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const icsMemoryCache = new Map();

function getCachedICS(room) {
    // 1️⃣ Cache en memoria
    if (icsMemoryCache.has(room)) {
        return icsMemoryCache.get(room);
    }

    // 2️⃣ Cache en localStorage
    const raw = localStorage.getItem(`ics:${room}`);
    if (!raw) return null;

    try {
        const { timestamp, data } = JSON.parse(raw);
        if (Date.now() - timestamp > ICS_CACHE_TTL) return null;

        icsMemoryCache.set(room, data);
        return data;
    } catch {
        return null;
    }
}

function setCachedICS(room, data) {
    icsMemoryCache.set(room, data);
    localStorage.setItem(
        `ics:${room}`,
        JSON.stringify({
            timestamp: Date.now(),
            data
        })
    );
}

// =========================
// Scroll helper
// =========================
function scrollToToday() {
    setTimeout(() => {
        const todayCell = document.querySelector(".fc-daygrid-day.fc-day-today");
        if (todayCell) {
            todayCell.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, 50);
}

function runIdle(fn) {
    if ("requestIdleCallback" in window) {
        window.requestIdleCallback(fn);
    } else {
        setTimeout(fn, 0);
    }
}

function getCachedParsedEvents(room) {
    return parsedEventsCache.get(room) || null;
}

function setCachedParsedEvents(room, events) {
    parsedEventsCache.set(room, events);
}

document.addEventListener("DOMContentLoaded", function () {
    const calendarEl = document.getElementById("calendar");
    const modal = document.getElementById("eventModal");
    const modalClose = document.querySelector(".close");

    function isMobileDevice() {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

    let headerToolbar, footerToolbar;

    if (isMobileDevice()) {
        headerToolbar = {
            left: "dayGridMonth,dayGridWeek,dayGridDay",
            center: "",
            right: "",
        };
        footerToolbar = {
            left: "title",
            center: "prev,today,next",
            right: "",
        };
    } else {
        headerToolbar = {
            left: "dayGridMonth,dayGridWeek,dayGridDay",
            center: "title,prev,today,next",
            right: "",
        };
        footerToolbar = {
            left: "",
            center: "",
            right: "",
        };
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        firstDay: 1,
        initialView: "dayGridMonth",
        locale: "es",
        headerToolbar,
        footerToolbar,
        buttonText: {
            today: "Hoy",
            month: "Mes",
            week: "Sem",
            day: "Día",
        },

        /* ======================
           CLICK EN EVENTO
        ====================== */
        eventClick(info) {

            const { event } = info;

            document.getElementById("modalTitle").textContent =
                event.title || "(sin título)";

            document.getElementById("modalStart").textContent =
                isValidDate(event.start) ? fmtFechaHora(event.start) : "N/A";

            document.getElementById("modalEnd").textContent =
                isValidDate(event.end) ? fmtFechaHora(event.end) : "N/A";

            document.getElementById("modalDescription").textContent =
                event.extendedProps?.description || "Sin descripción";

            document.getElementById("modalLocation").textContent =
                event.extendedProps?.location || "Sin ubicación";

            document.getElementById("modalRequirements").textContent =
                event.extendedProps?.requerimientos || "Sin requerimientos";

            modal.style.display = "block";
        },

        /* ======================
           RENDER EVENTO
        ====================== */
        eventContent(arg) {
            const ev = arg.event;
            const start = ev.start;
            const end = ev.end;

            if (!isValidDate(start)) {
                return { html: `<div style="color:black"><br>${ev.title}</div>` };
            }

            const isAllDay =
                ev.allDay ||
                (
                    !isValidDate(end) ||
                    (
                        start.getHours() === 0 &&
                        start.getMinutes() === 0 &&
                        end?.getHours?.() === 0 &&
                        end?.getMinutes?.() === 0
                    )
                );

            const time = isAllDay ? "Todo el Día" : fmtHora(start);
            const timeEnd =
                !isAllDay && isValidDate(end) ? ` - ${fmtHora(end)}` : "";

            return {
                html: `
                    <div style="color:black;font-size:14px;">
                        <br>${time}${timeEnd}<br>${ev.title}
                    </div>
                `
            };
        },

        /* ======================
           CLICK EN DÍA (RESERVA)
        ====================== */
        dayCellDidMount(info) {
            info.el.style.cursor = "pointer";

            info.el.addEventListener("click", (ev) => {
                // ⛔️ Si el click viene desde un evento → NO reservar
                if (ev.target.closest(".fc-event")) {
                    return;
                }

                const date = info.date;

                const selectedCalendar =
                    document.getElementById("calendarSelector")?.value;

                if (!selectedCalendar) {
                    console.warn("⚠️ No hay sala seleccionada");
                    return;
                }

                const start = new Date(date);
                start.setHours(9, 0, 0, 0);

                const roomKey = selectedCalendar
                    .replace(/ /g, "_")
                    .toUpperCase();

                const link = buildOutlookReservationLink({
                    roomKey,
                    start
                });

                if (link) {
                    window.open(link, "_blank");
                }
            });
        }
    });

    calendar.render();

    /* ======================
       TOOLBAR CUSTOM
    ====================== */
    const toolbar = document.querySelector(".fc-toolbar-chunk:nth-child(3)");

    const texto = document.createElement("span");
    texto.id = "textCampo";
    texto.textContent = "Sala:";

    const select = document.createElement("select");
    select.id = "calendarSelector";

    const reservationButton = document.createElement("button");
    reservationButton.id = "reservationButton";
    reservationButton.textContent = "RESERVA";
    reservationButton.onclick = () => {
        const selectedCalendar = select.value;
        if (!selectedCalendar) return;

        const roomKey = selectedCalendar.replace(/ /g, "_").toUpperCase();

        const link = buildOutlookReservationLink({ roomKey });
        if (link) window.open(link, "_blank");
    };

    select.addEventListener("change", () => {
        if (select.value) loadICS(select.value);
    });

    Object.keys(icsUrls).forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name.replace(/_/g, " ");
        select.appendChild(option);
    });

    toolbar.appendChild(texto);
    toolbar.appendChild(select);
    toolbar.appendChild(reservationButton);

    loadICS(Object.keys(icsUrls)[0]);

    /* ======================
       MODAL
    ====================== */
    modalClose.onclick = () => (modal.style.display = "none");
    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
});

async function loadICS(roomName) {
    try {
        // 1️⃣ Cache ICS (texto)
        const cachedICS = getCachedICS(roomName);
        if (cachedICS) {
            // 2️⃣ Cache de eventos ya parseados
            const parsed = getCachedParsedEvents(roomName);
            if (parsed) {
                displayEvents(parsed);
            } else {
                runIdle(() => parseICS(cachedICS, roomName));
            }
            scrollToToday();
            return;
        }

        // 3️⃣ Fetch solo si no hay cache
        const response = await fetch(`/ics/${roomName}`);
        if (!response.ok) throw new Error("Network error");

        const data = await response.text();

        // 4️⃣ Guardar cache ICS
        setCachedICS(roomName, data);

        // 5️⃣ Parseo async + cache de eventos
        runIdle(() => parseICS(data, roomName));

        scrollToToday();
    } catch (error) {
        console.error("❌ Error cargando ICS:", error);
    }
}

function parseICS(data, roomName) {
    const events = [];
    const lines = data.split(/\r?\n/);
    let currentEvent = null;
    let previousKey = null;

    lines.forEach((line) => {
        if (line.startsWith(" ") && currentEvent && previousKey) {
            // Continuación de línea (folding)
            currentEvent[previousKey] += line.trim();
        }
        else if (line.startsWith("BEGIN:VEVENT")) {
            currentEvent = {};
        }
        else if (line.startsWith("END:VEVENT")) {
            if (
                currentEvent &&
                (currentEvent["DTSTART"] || currentEvent["DTSTART;VALUE=DATE"])
            ) {
                // Detección all-day
                if (
                    currentEvent["DTSTART;VALUE=DATE"] ||
                    currentEvent["X-MICROSOFT-CDO-ALLDAYEVENT"] === "TRUE"
                ) {
                    currentEvent.allDay = true;
                }

                if (currentEvent["RRULE"]) {
                    const recurrenceEvents = generateRecurrenceEvents(currentEvent);
                    events.push(...recurrenceEvents);
                } else {
                    events.push(currentEvent);
                }
            } else {
                console.warn("⚠️ Evento descartado por falta de DTSTART:", currentEvent);
            }
            currentEvent = null;
        }
        else if (currentEvent) {
            const separatorIndex = line.indexOf(":");
            if (separatorIndex === -1) return;

            const key = line.substring(0, separatorIndex);
            const value = line.substring(separatorIndex + 1);

            if (key && value) {
                if (key.includes("TZID")) {
                    const keyParts = key.split(";");
                    currentEvent[keyParts[0]] = value;
                    previousKey = keyParts[0];
                } else {
                    currentEvent[key] = value;
                    previousKey = key;
                }

                if (key === "X-MICROSOFT-CDO-ALLDAYEVENT" && value === "TRUE") {
                    currentEvent.allDay = true;
                }
            }
        }
    });

    // 🔥 Cache de eventos YA parseados
    setCachedParsedEvents(roomName, events);

    // Render directo
    displayEvents(events);
}

function generateRecurrenceEvents(event) {
    const recurrenceEvents = [];
    const rrule = event["RRULE"];
    const startDate = formatICSDate(event["DTSTART"]);
    const endDate = event["DTEND"] ? formatICSDate(event["DTEND"]) : null;

    if (!isValidDate(startDate)) {
        console.warn("RRULE con DTSTART inválido, se omite:", event);
        return recurrenceEvents;
    }

    const ruleParts = rrule.split(";");
    let frequency = "DAILY",
        interval = 1,
        untilDate = null,
        byDays = [];

    ruleParts.forEach((part) => {
        const [key, value] = part.split("=");
        if (key === "FREQ") frequency = value;
        if (key === "UNTIL") untilDate = formatICSDate(value);
        if (key === "INTERVAL") interval = parseInt(value);
        if (key === "BYDAY") byDays = value.split(",");
    });

    const daysMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
    const startDay = new Date(startDate).getDay();

    // Si no hay BYDAY y es semanal, usa el día del DTSTART
    if (frequency === "WEEKLY" && byDays.length === 0) {
        const inv = Object.entries(daysMap).find(([, v]) => v === startDay);
        if (inv) byDays = [inv[0]];
    }

    let currentDate = new Date(startDate);
    const until = isValidDate(untilDate)
        ? new Date(untilDate)
        : new Date(currentDate.getFullYear() + 1, 0, 1); // 1 año por defecto

    while (currentDate <= until) {
        if (frequency === "DAILY") {
            const newEvent = {
                DTSTART: currentDate.toISOString(),
                DTEND: endDate
                    ? new Date(currentDate.getTime() + (endDate - startDate)).toISOString()
                    : null,
                SUMMARY: event["SUMMARY"],
                LOCATION: event["LOCATION"],
                DESCRIPTION: event["DESCRIPTION"],
            };
            recurrenceEvents.push(newEvent);
            currentDate.setDate(currentDate.getDate() + interval);
            continue;
        }

        if (frequency === "WEEKLY") {
            byDays.forEach((day) => {
                const dayOfWeek = daysMap[day];
                const eventDate = new Date(currentDate);
                eventDate.setDate(
                    currentDate.getDate() + ((dayOfWeek - startDay + 7) % 7)
                );

                if (eventDate <= until && eventDate >= currentDate) {
                    const newEvent = {
                        DTSTART: eventDate.toISOString(),
                        DTEND: endDate
                            ? new Date(eventDate.getTime() + (endDate - startDate)).toISOString()
                            : null,
                        SUMMARY: event["SUMMARY"],
                        LOCATION: event["LOCATION"],
                        DESCRIPTION: event["DESCRIPTION"],
                    };
                    recurrenceEvents.push(newEvent);
                }
            });
            currentDate.setDate(currentDate.getDate() + 7 * interval);
            continue;
        }

        // Soporte mínimo para MONTHLY/YEARLY: cae en DAILY como fallback
        currentDate.setDate(currentDate.getDate() + interval);
    }

    return recurrenceEvents;
}

function debugEventCount(events) {
    console.log(`Total de eventos cargados del archivo ICS: ${events.length}`);

    const displayedEvents = calendar.getEvents();
    console.log(`Total de eventos mostrados en el calendario: ${displayedEvents.length}`);

    if (events.length !== displayedEvents.length) {
        console.warn(
            `Hay una discrepancia entre los eventos cargados (${events.length}) y los eventos mostrados (${displayedEvents.length}).`
        );
    }
}

function mapICSToFullCalendarEvents(events) {
    const fcEvents = [];

    events.forEach((event, index) => {
        try {
            const dtStart = event["DTSTART"] || event["DTSTART;VALUE=DATE"];
            const dtEnd = event["DTEND"] || event["DTEND;VALUE=DATE"];

            if (!dtStart) return;

            const start = formatICSDate(dtStart);
            let end = dtEnd ? formatICSDate(dtEnd) : null;

            if (!isValidDate(start)) return;

            const description = event["SUMMARY"] || "Sin descripción";
            const location = event["LOCATION"] || "Sin ubicación";

            const requerimientos = event["DESCRIPTION"]
                ? cleanRequerimientos(event["DESCRIPTION"])
                : "Sin requerimientos";

            const busyStatus = event["X-MICROSOFT-CDO-BUSYSTATUS"] || "BUSY";
            const classNames = busyStatus === "TENTATIVE" ? ["tentative"] : ["busy"];

            const isAllDay =
                event.allDay === true ||
                event["DTSTART;VALUE=DATE"] !== undefined ||
                event["DTEND;VALUE=DATE"] !== undefined ||
                (/^\d{8}$/.test(dtStart) && (!dtEnd || /^\d{8}$/.test(dtEnd)));

            if (isAllDay && !isValidDate(end)) {
                const tmp = new Date(start);
                tmp.setDate(tmp.getDate() + 1);
                end = tmp;
            }

            fcEvents.push({
                title: description,
                start,
                end: isValidDate(end) ? end : undefined,
                allDay: isAllDay,
                classNames,
                extendedProps: {
                    description,
                    location,
                    requerimientos
                }
            });
        } catch (err) {
            console.error("❌ Error mapeando evento:", event, err);
        }
    });

    return fcEvents;
}

function displayEvents(events) {
    const fcEvents = mapICSToFullCalendarEvents(events);

    if (currentEventSource) {
        currentEventSource.remove();
        currentEventSource = null;
    }

    currentEventSource = calendar.addEventSource(fcEvents);

    debugEventCount(events);
}

function cleanRequerimientos(text) {
    return text
        .replace(/\\,/g, ",")
        .replace(/\\n/g, "\n")
        .replace(/\n/g, "\n")
        .replace(/Microsoft Teams.*?Need help\?.*?(\s|<)/g, "")
        .replace(/Unirse a la reunión ahora<.*?>/g, "")
        .replace(/Id\. de reunión: \d+(?: \d+)+/g, "")
        .replace(/Código de acceso: \w+/g, "")
        .replace(/Para organizadores:.*?Opciones de la reunión/g, "")
        .replace(/Join the meeting now<.*?>/g, "")
        .replace(/Meeting ID:.*?Passcode:.*?\s*/g, "")
        .replace(/Passcode:\s*\w+/g, "")
        .replace(/For organizers:.*?__/g, "")
        .replace(/_{10,}/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/<.*?>/g, "")
        .replace(/\S+@\S+\.\S+/g, "")
        .replace(/No suele recibir correo electrónico de/g, "")
        .replace(/Porqué es esto importante.*?/g, "")
        .replace(/No sienta la ?obligación de.*?laboral\./g, "")
        .replace(/\b[a-zA-Z0-9]{6,}\b/g, function (match) {
            if (/Passcode:/.test(text.substring(0, text.indexOf(match)))) {
                return "";
            }
            return match;
        })
        .replace(/Sent by Microsoft 365.*?Your meeting was found to be out of date and has been automatically updated/g, "")
        .replace(/https:\/\/aka\.ms\/JoinTeamsMeeting\?omkt=es-ES>.*?Meeting/g, "")
        .replace(/ID: \d+(?: \d+)+ For : Meeting/g, "")
        .replace(/No sientala obligación de contestar este mail fuera de horario laboral\./g, "")
        .replace(/Updated meeting details:.*?Location/g, "")
        .replace(/Sent by Microsoft Exchange Online/g, "")
        .replace(/Se le ha reenviado esta solicitud de recurso en directiva para que la apruebe\. Se le ha reenviado esta solicitud para que la apruebe porque el organizador no tiene permiso para reservar este recurso\./g, "")
        .replace(/Nosienta la obligación de contestar este mail fuera de horario laboral./g, "")
        .replace(/Microsoft Teams ¿Necesita ayuda\?/g, "")
        .replace(/Sentby Microsoft 365 Your meeting was found to be out of date and has beenautomatically updated.\?/g, "")
        .replace(/Sent\s?by\s?Microsoft\s?365.*?automatically\s?updated\./g, "")
        .replace(/Requerimientos:\s*/g, "")
        .replace(/"Id\. de reunión: \d+(?: \d+)+ Código de acceso: \w+"/g, "")
        .trim();
}