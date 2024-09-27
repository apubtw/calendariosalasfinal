function parseICS(data) {
    const events = [];
    const lines = data.split(/\r?\n/);
    let currentEvent = null;

    lines.forEach(line => {
        if (line.startsWith('BEGIN:VEVENT')) {
            currentEvent = {};
        } else if (line.startsWith('END:VEVENT')) {
            events.push(currentEvent);
            currentEvent = null;
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

    displayEvents(events);
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
    const dateStr = icsDate.replace(/^TZID=[^:]+:/, '');
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(9, 11);
    const minute = dateStr.substring(11, 13);

    return `${day}/${month}/${year} ${hour}:${minute}`;
}
