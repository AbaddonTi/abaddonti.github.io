let allRecords = [];
let filteredRecords = [];
let uniqueTeams = new Set();
let uniqueEmployees = new Set();
let teamEmployeeMap = {};
let sortColumn = 'Дата';
let sortDirection = 'desc'; 
let profitChart;

const incomeOperations = ['Пересчёт кассы', 'Доход от рефералов'];
const expenseOperations = [
    'Апелляция', 'Аренда недвижимости / ЖКХ', 'Бытовые',
    'Долги', 'Еда', 'Зарплаты', 'Комиссии', 'Логистика', 'Ошибка воркера',
    'Представительские расходы', 'Прочее', 'Расходы на дропов',
    'Сим карты', 'Софт, подписки', 'Техника'
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
        updateExpenseButtons();
        document.getElementById('data-display').innerHTML = 'Нет данных для отображения.';
        filterData(); 
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

    filteredRecords = allRecords.filter(record => {
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

        document.getElementById('data-display').innerHTML = 'Нет данных для отображения.';
        document.getElementById('profit-display').innerHTML = `Общий профит: ${formattedProfitSum} $`;
        document.getElementById('spread-display').innerHTML = `Средний спред: ${spreadAvg.replace('.', ',')} %`;
        document.getElementById('volume-display').innerHTML = `Общий объем: ${formattedVolumeSum} $`;
        document.getElementById('net-income-display').innerHTML = `Чистая прибыль: ${formattedNetIncome} $`;
        document.getElementById('total-expense-display').innerHTML = `Общая сумма трат: ${formattedTotalExpenses} $`;

        const expenseCategoriesHTML = Object.entries(expenseCategorySums).map(([category, sum]) => {
            return `<button class="expense-button" data-category="${category}" onclick="toggleExpense(this)">${category}: ${formatCurrency(sum.toFixed(2))} $</button>`;
        }).join('');
        document.getElementById('expense-buttons').innerHTML = `<div class="expense-buttons-container">${expenseCategoriesHTML}</div>`;

        updateChart(filteredRecords);
    } else {
        document.getElementById('data-display').innerHTML = 'Нет данных для отображения.';
        document.getElementById('profit-display').innerHTML = 'Общий профит: 0.00 $';
        document.getElementById('spread-display').innerHTML = 'Средний спред: 0.00 %';
        document.getElementById('volume-display').innerHTML = 'Общий объем: 0.00 $';
        document.getElementById('net-income-display').innerHTML = 'Чистая прибыль: 0.00 $';
        document.getElementById('total-expense-display').innerHTML = 'Общая сумма трат: 0.00 $';
        document.getElementById('expense-buttons').innerHTML = '';

        updateChart([]);
    }

    updateDataDisplay();
}

function formatCurrency(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatDate(dateString) {
    const date = luxon.DateTime.fromISO(dateString, { zone: 'Europe/Moscow' });
    return date.toFormat('dd.MM.yyyy HH:mm');
}

function toggleExpense(button) {
    button.classList.toggle('active');
    updateDataDisplay();
}

function toggleAllButtons() {
    const buttons = document.querySelectorAll('.expense-button');
    const allActive = [...buttons].every(button => button.classList.contains('active'));
    buttons.forEach(button => {
        if (allActive) {
            button.classList.remove('active');
        } else {
            button.classList.add('active');
        }
    });
    updateDataDisplay();
}

function updateDataDisplay() {
    const activeButtons = document.querySelectorAll('.expense-button.active');
    const activeCategories = [...activeButtons].map(button => button.getAttribute('data-category'));
    const activeFilteredRecords = filteredRecords.filter(record => activeCategories.includes(record['Операция']));

    if (activeFilteredRecords.length > 0) {
        const sortedRecords = sortRecords(activeFilteredRecords);
        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th onclick="sortTable('Дата')">Дата <span class="sort-arrow ${sortColumn === 'Дата' ? (sortDirection === 'asc' ? 'asc' : '') : ''}">▲</span></th>
                        <th onclick="sortTable('Сотрудник')">Сотрудник <span class="sort-arrow ${sortColumn === 'Сотрудник' ? (sortDirection === 'asc' ? 'asc' : '') : ''}">▲</span></th>
                        <th onclick="sortTable('Операция')">Операция <span class="sort-arrow ${sortColumn === 'Операция' ? (sortDirection === 'asc' ? 'asc' : '') : ''}">▲</span></th>
                        <th onclick="sortTable('Сумма')">Сумма <span class="sort-arrow ${sortColumn === 'Сумма' ? (sortDirection === 'asc' ? 'asc' : '') : ''}">▲</span></th>
                        <th onclick="sortTable('Объем')">Объем <span class="sort-arrow ${sortColumn === 'Объем' ? (sortDirection === 'asc' ? 'asc' : '') : ''}">▲</span></th>
                        <th onclick="sortTable('Профит')">Профит <span class="sort-arrow ${sortColumn === 'Профит' ? (sortDirection === 'asc' ? 'asc' : '') : ''}">▲</span></th>
                        <th onclick="sortTable('Спред')">Спред <span class="sort-arrow ${sortColumn === 'Спред' ? (sortDirection === 'asc' ? 'asc' : '') : ''}">▲</span></th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedRecords.map(record => `
                        <tr>
                            <td>${formatDate(record['Дата'])}</td>
                            <td>${record['Сотрудник']}</td>
                            <td>${record['Операция']}</td>
                            <td>${record['Сумма']}</td>
                            <td>${record['Объем']}</td>
                            <td>${record['Профит']}</td>
                            <td>${record['Спред']}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('data-display').innerHTML = tableHTML;
    } else {
        document.getElementById('data-display').innerHTML = 'Нет данных для отображения.';
    }
}

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    updateDataDisplay();
}

function sortRecords(records) {
    return records.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        if (aValue < bValue) {
            return sortDirection === 'asc' ? -1 : 1;
        } else if (aValue > bValue) {
            return sortDirection === 'asc' ? 1 : -1;
        } else {
            return 0;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
});

function initializeChart() {
    const ctx = document.getElementById('profitChart').getContext('2d');
    profitChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Общий профит',
                data: [],
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 1,
                fill: true
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    },
                    title: {
                        display: true,
                        text: 'Дата'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Профит ($)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function updateChart(data) {
    const labels = data.map(record => luxon.DateTime.fromISO(record['Дата'], { zone: 'Europe/Moscow' }).toISO());
    const profits = data.map(record => parseFloat(record['Профит']));
    profitChart.data.labels = labels;
    profitChart.data.datasets[0].data = profits;
    profitChart.update();
}
