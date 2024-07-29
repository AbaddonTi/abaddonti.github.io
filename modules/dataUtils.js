export function buildTeamEmployeeMap(records) {
    return records.reduce((map, { 'Команда': team, 'Сотрудник': employee }) => {
        if (!map[team]) {
            map[team] = new Set();
        }
        map[team].add(employee);
        return map;
    }, {});
}

export function filterData(records, { startDate, endDate, selectedTeam, selectedEmployee }) {
    return records.filter(record => {
        const recordDate = luxon.DateTime.fromISO(record['Дата'], { zone: 'Europe/Moscow' });
        const isInDateRange = recordDate >= startDate && recordDate <= endDate;
        const isInTeam = selectedTeam === 'Все' || record['Команда'] === selectedTeam;
        const isInEmployee = selectedEmployee === 'Любой' || record['Сотрудник'] === selectedEmployee;
        return isInDateRange && isInTeam && isInEmployee;
    });
}
