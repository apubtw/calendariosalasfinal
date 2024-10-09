function parseICS(data) {
    const events = [];
    const lines = data.split(/\r?\n/);
    let currentEvent = null;

    lines.forEach(line => {
        if (line.startsWith('BEGIN:VEVENT')) {
            currentEvent = {};
        } else if (line.startsWith('END:VEVENT')) {
            if (currentEvent) {
                processRecurringEvents(currentEvent, events);
                currentEvent = null;
            }
        } else if (currentEvent) {
            const [key, value] = line.split(':');
            if (key && value) {
                if (key.includes('TZID')) {
                    const keyParts = key.split(';');
                    currentEvent[keyParts[0]] = value;
                } else {
                    currentEvent[key] = value;
                }
            }
        }
    });
    processRecurringEvents(events)
    displayEvents(events);
}

function processRecurringEvents(event, events) {
    const { rrulestr } = require('rrule');

    if (event['RRULE']) {
        const rule = rrulestr(event['RRULE'], { forces: true });
        const eventDates = rule.all(); // Obtiene todas las instancias del evento

        const startDate = new Date(event['DTSTART'].replace(/TZID=[^:]+:/, ''));
        const duration = (new Date(event['DTEND'].replace(/TZID=[^:]+:/, '')) - startDate) || 60 * 60 * 1000; // Duración por defecto 1 hora

        // Genera nuevos eventos para cada instancia y los agrega a la lista
        eventDates.forEach(date => {
            events.push({
                'SUMMARY': event['SUMMARY'],
                'DTSTART': date.toISOString(), // Convierte a formato ISO
                'DTEND': new Date(date.getTime() + duration).toISOString(), // Agregar duración
                'LOCATION': event['LOCATION'],
            });
        });
    } else {
        // Si no es recurrente, simplemente se agrega el evento
        events.push(event);
    }
}

function displayEvents(events) {
    const tableBody = document.querySelector('#eventsTable tbody');
    tableBody.innerHTML = '';

    events.forEach(event => {
        const start = formatDate(event['DTSTART']);
        const end = formatDate(event['DTEND']);
        const description = event['SUMMARY'] || 'Sin descripción';
        const location = event['LOCATION'] || 'Sin ubicación';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${start}</td>
            <td>${end}</td>
            <td>${description}</td>
            <td>${location}</td>
        `;
        tableBody.appendChild(row);
    });
}

function formatDate(icsDate) {
    if (!icsDate) return 'Fecha no disponible';
    const date = new Date(icsDate);
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
    return date.toLocaleString('es-ES', options).replace(',', ''); // Cambiar al formato español
}
