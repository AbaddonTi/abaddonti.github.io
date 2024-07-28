let allRecords = [];
let uniqueTeams = new Set();
let uniqueEmployees = new Set();
let teamEmployeeMap = {};

const incomeOperations = ['Пересчёт кассы', 'Доход от рефералов'];
const expenseOperations = [
    'Аренда недвижимости / ЖКХ', 'Зарплаты', 'Ошибка воркера',
    'Перевод (снимаем с счёта)', 'Представительские расходы',
    'Прочее', 'Расходы на дропов', 'Сим карты'
];

grist.ready({
    columns: ['Дата', 'Профит', 'Команда', 'Сотрудник', 'Спред', 'Объем', 'Операция', 'Сумма'],  
    requiredAccess: 'read table'
});

grist.onRecords(function(records, mappings) {
    const mappedRecords = grist.mapColumnNames(records);
    if (mappedRecords) {
        allRecords = mappedRecords;  
        uniqueTeams = new Set(mappedRecords.map(record => record['Команда']));
        teamEmployeeMap = buildTeamEmployeeMap(mappedRecords);
        updateDropdown('team', uniqueTeams, 'Все');
        updateEmployeeDropdown();
        document.getElementById('data-display').innerHTML = 'Данные загружены. Используйте фильтры для фильтрации.';
    } else {
        console.error("Please map all columns correctly");
    }
});

function buildTeamEmployeeMap(records) {
    const map = {};
    records.forEach(record => {
        const team = record['Команда'];
        const employee = record['Сотрудник'];
        if (!map[team]) {
            map[team] = new Set();
        }
        map[team].add(employee);
    });
    return map;
}

function updateDropdown(dropdownId, items, defaultOption) {
    const selectElement = document.getElementById(dropdownId);
    selectElement.innerHTML = `<option value="${defaultOption}">${defaultOption}</option>`;
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.text = item;
        selectElement.add(option);
    });
}

function updateEmployeeDropdown() {
    const selectedTeam = document.getElementById('team').value;
    let employees = new Set();
    if (selectedTeam === 'Все') {
        allRecords.forEach(record => employees.add(record['Сотрудник']));
    } else {
        employees = teamEmployeeMap[selectedTeam] || new Set();
    }
    updateDropdown('employee', employees, 'Любой');
}

function filterData() {
    const startDate = luxon.DateTime.fromISO(document.getElementById('start-date').value, { zone: 'Europe/Moscow' });
    const endDate = luxon.DateTime.fromISO(document.getElementById('end-date').value, { zone: 'Europe/Moscow' });
    const selectedTeam = document.getElementById('team').value;
    const selectedEmployee = document.getElementById('employee').value;

    if (!startDate.isValid || !endDate.isValid) {
        document.getElementById('data-display').innerHTML = 'Пожалуйста, введите корректные начальную и конечную даты.';
        return;
    }

    const filteredRecords = allRecords.filter(record => {
        const recordDate = luxon.DateTime.fromISO(record['Дата'], { zone: 'Europe/Moscow' });
        const isInDateRange = recordDate >= startDate && recordDate <= endDate;
        const isInTeam = selectedTeam === 'Все' || record['Команда'] === selectedTeam;
        const isInEmployee = selectedEmployee === 'Любой' || record['Сотрудник'] === selectedEmployee;
        return isInDateRange && isInTeam && isInEmployee;
    });

    if (filteredRecords.length > 0) {
        const profitSum = filteredRecords.reduce((sum, record) => sum + parseFloat(record['Профит'] || 0), 0).toFixed(2);
        const formattedProfitSum = formatCurrency(profitSum);

        const validSpreadRecords = filteredRecords.filter(record => record['Спред'] !== null);
        const spreadSum = validSpreadRecords.reduce((sum, record) => sum + parseFloat(record['Спред'] || 0), 0);
        const spreadAvg = (spreadSum / validSpreadRecords.length * 100).toFixed(2);

        const volumeSum = filteredRecords.reduce((sum, record) => sum + parseFloat(record['Объем'] || 0), 0).toFixed(2);
        const formattedVolumeSum = formatCurrency(volumeSum);

        let netIncome = 0;
        let totalExpenses = 0;
        const expenseCategorySums = {};

        filteredRecords.forEach(record => {
            const operationText = record['Операция'];
            const amount = parseFloat(record['Сумма'] || 0);

            if (incomeOperations.includes(operationText)) {
                netIncome += amount;
            } else if (expenseOperations.includes(operationText)) {
                netIncome -= amount;
                totalExpenses += amount;

                if (!expenseCategorySums[operationText]) {
                    expenseCategorySums[operationText] = 0;
                }
                expenseCategorySums[operationText] += amount;
            }
        });

        const formattedNetIncome = formatCurrency(netIncome.toFixed(2));
        const formattedTotalExpenses = formatCurrency(totalExpenses.toFixed(2));

        document.getElementById('data-display').innerHTML = filteredRecords.map(record => JSON.stringify(record)).join('\n');
        document.getElementById('profit-display').innerHTML = `Общий профит: ${formattedProfitSum} $`;
        document.getElementById('spread-display').innerHTML = `Средний спред: ${spreadAvg.replace('.', ',')} %`;
        document.getElementById('volume-display').innerHTML = `Общий объем: ${formattedVolumeSum} $`;
        document.getElementById('net-income-display').innerHTML = `Чистая прибыль: ${formattedNetIncome} $`;
        document.getElementById('total-expense-display').innerHTML = `Общая сумма трат: ${formattedTotalExpenses} $`;

        const expenseCategoriesHTML = Object.entries(expenseCategorySums).map(([category, sum]) => {
            return `<div>${category}: ${formatCurrency(sum.toFixed(2))} $</div>`;
        }).join('');
        document.getElementById('expense-categories-display').innerHTML = expenseCategoriesHTML;
    } else {
        document.getElementById('data-display').innerHTML = 'Записи не найдены в указанном диапазоне дат, команды и сотрудника.';
        document.getElementById('profit-display').innerHTML = 'Общий профит: 0.00 $';
        document.getElementById('spread-display').innerHTML = 'Средний спред: 0.00 %';
        document.getElementById('volume-display').innerHTML = 'Общий объем: 0.00 $';
        document.getElementById('net-income-display').innerHTML = 'Чистая прибыль: 0.00 $';
        document.getElementById('total-expense-display').innerHTML = 'Общая сумма трат: 0.00 $';
        document.getElementById('expense-categories-display').innerHTML = '';
    }
}

function formatCurrency(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
