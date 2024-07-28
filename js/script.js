let allRecords = [];
let filteredRecords = [];
let uniqueTeams = new Set();
let uniqueEmployees = new Set();
let teamEmployeeMap = {};
let sortColumn = 'Дата';
let sortDirection = 'desc';

const incomeOperations = ['Пересчёт кассы', 'Доход от рефералов'];
const expenseOperations = [
    'Апелляция', 'Аренда недвижимости / ЖКХ', 'Бытовые',
    'Долги', 'Еда', 'Зарплаты', 'Комиссии', 'Логистика', 'Ошибка воркера',
    'Представительские расходы', 'Прочее', 'Расходы на дропов',
    'Сим карты', 'Софт, подписки', 'Техника'
];
const summaryOperations = ['Общий профит', 'Средний спред', 'Общий объем', 'Чистая прибыль', 'Общая сумма трат'];

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
        updateSummaryButtons();
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

function updateSummaryButtons() {
    const summaryButtonsHTML = summaryOperations.map(operation => {
        return `<button class="summary-button" data-category="${operation}" onclick="toggleSummary(this)">${operation}</button>`;
    }).join('');
    document.getElementById('business-summary-buttons').innerHTML = `<div class="summary-buttons-container">${summaryButtonsHTML}</div>`;
}

function updateExpenseButtons() {
    const expenseButtonsHTML = expenseOperations.map(operation => {
        return `<button class="expense-button" data-category="${operation}" onclick="toggleExpense(this)">${operation}</button>`;
    }).join('');
    document.getElementById('expense-buttons').innerHTML = `<div class="expense-buttons-container">${expenseButtonsHTML}</div>`;
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

    updateDataDisplay();
}

function formatCurrency(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatDate(dateString) {
    const date = luxon.DateTime.fromISO(dateString, { zone: 'Europe/Moscow' });
    return date.toFormat('dd.MM.yyyy HH:mm');
}

function toggleSummary(button) {
    button.classList.toggle('active');
    updateDataDisplay();
}

function toggleExpense(button) {
    button.classList.toggle('active');
    updateDataDisplay();
}

function toggleAllBusinessButtons() {
    const buttons = document.querySelectorAll('.summary-button');
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

function toggleAllExpenseButtons() {
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
    const activeSummaryButtons = document.querySelectorAll('.summary-button.active');
    const activeSummaryCategories = [...activeSummaryButtons].map(button => button.getAttribute('data-category'));
    const activeExpenseButtons = document.querySelectorAll('.expense-button.active');
    const activeExpenseCategories = [...activeExpenseButtons].map(button => button.getAttribute('data-category'));
    const activeFilteredRecords = filteredRecords.filter(record => activeExpenseCategories.includes(record['Операция']));

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
