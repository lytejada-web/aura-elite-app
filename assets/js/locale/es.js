// assets/js/locale/es.js
(function() {
    if (typeof FullCalendar === 'undefined') {
        console.warn("FullCalendar no detectado. El idioma se cargará cuando esté listo.");
        return;
    }

    FullCalendar.globalLocales.push({
        code: 'es',
        week: { dow: 1, doy: 4 },
        buttonText: {
            prev: 'Ant', next: 'Sig', today: 'Hoy',
            month: 'Mes', week: 'Semana', day: 'Día', list: 'Agenda'
        },
        allDayText: 'Todo el día',
        moreLinkText: 'más',
        noEventsText: 'No hay eventos para mostrar'
    });
})();