document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById('json-file').addEventListener('change', handleFileSelect, false);
    document.getElementById('filter-form').addEventListener('submit', handleFormSubmit, false);
    document.getElementById('add-field-btn').addEventListener('click', addField, false);
    // Attach the new event listener to the "Filter selected columns" button
    document.getElementById('filter-columns-btn').addEventListener('click', handleDownloadFilteredCSV);
});

let data; // This will hold the parsed JSON data
let fieldCount = 0; // Keep track of how many fields have been added


function addField() {
    fieldCount++;
    const fieldsContainer = document.getElementById('fields-container');
    const newFieldGroup = document.createElement('div');
    newFieldGroup.classList.add('form-group');
    newFieldGroup.innerHTML = `
        <label for="field-${fieldCount}">Field ${fieldCount}</label>
        <select class="form-control field-dropdown" id="field-${fieldCount}">
            <!-- Options will be populated based on the JSON file -->
        </select>
        <label for="field-${fieldCount}-value">Field ${fieldCount} value</label>
        <select class="form-control value-dropdown" id="field-${fieldCount}-value">
            <!-- Value options will be populated based on the selected field -->
        </select>
        <div class="form-check form-check-inline">
            <input class="form-check-input" type="radio" name="logical-operand-${fieldCount}" id="and-${fieldCount}" value="AND" checked>
            <label class="form-check-label" for="and-${fieldCount}">AND</label>
        </div>
        <div class="form-check form-check-inline">
            <input class="form-check-input" type="radio" name="logical-operand-${fieldCount}" id="or-${fieldCount}" value="OR">
            <label class="form-check-label" for="or-${fieldCount}">OR</label>
        </div>
    `;
    fieldsContainer.appendChild(newFieldGroup);
    populateDropdownWithField(document.getElementById(`field-${fieldCount}`));

    // Attach event listener to the new field dropdown to update values when a field is selected
    document.getElementById(`field-${fieldCount}`).addEventListener('change', function() {
        populateValueDropdown(this.value, `field-${fieldCount}-value`);
    });
}

function populateDropdownWithField(dropdown) {
    if (dropdown) {
        dropdown.innerHTML = ''; // Clear existing options
        Object.keys(data[0]).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            dropdown.appendChild(option);
        });
    } else {
        console.error('Dropdown element not found!');
    }
}

function populateValueDropdown(selectedField, valueDropdownId) {
    const valueDropdown = document.getElementById(valueDropdownId);
    if (valueDropdown) {
        // Get unique values from the selected field
        const uniqueValues = Array.from(new Set(data.map(item => item[selectedField])))
                                  .sort(); // Sort values if needed
        valueDropdown.innerHTML = ''; // Clear existing options
        uniqueValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            valueDropdown.appendChild(option);
        });
    } else {
        console.error('Value dropdown element not found!');
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
        data = JSON.parse(e.target.result);
        if (data && data.length > 0) {
            populateDropdownWithField(document.getElementById('field-1'));
            // Attach event listener to the new field dropdown to update values when a field is selected
            document.getElementById(`field-1`).addEventListener('change', function() {
                populateValueDropdown(this.value, `field-1-value`);
            });
        }
    };
    
    reader.readAsText(file);
}

function populateDropdown(data) {
    const dropdown = document.getElementById('field-dropdown');
    dropdown.innerHTML = ''; // Clear existing options
    Object.keys(data[0]).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        dropdown.appendChild(option);
    });
}

// This function now only applies filters and updates the table
function handleFormSubmit(event) {
    event.preventDefault();
    const criteria = collectFilterCriteria();
    let filteredData = applyFilters(data, criteria);

    // Update the record count display
    document.getElementById('record-count').textContent = `Filtered records: ${filteredData.length}`;

    // Update the table with top 10 records
    populateTable(filteredData.slice(0, 5));
}

function applyFilters(data, criteria) {
    console.log('Applying filters to data:', criteria); // Check the criteria being applied

    // Start with the full data set
    let query = Enumerable.from(data);

    // Apply AND filters first
    let andFilteredData = query;
    criteria.forEach(function(criterion) {
        if (criterion.operand === 'AND') {
            andFilteredData = andFilteredData.where(function(x) {
                return x[criterion.field].toString().toLowerCase() === criterion.value.toString().toLowerCase();
            });
        }
    });

    // Apply OR filters
    let orFilteredData = Enumerable.from([]);
    criteria.forEach(function(criterion, index) {
        if (criterion.operand === 'OR') {
            let orQuery = query.where(function(x) {
                return x[criterion.field].toString().toLowerCase() === criterion.value.toString().toLowerCase();
            });
            orFilteredData = orFilteredData.union(orQuery);
        }
    });

    // Combine AND and OR results
    let combinedResults = andFilteredData.union(orFilteredData).distinct();

    console.log('Filtered data:', combinedResults.toArray()); // Check the filtered data after all criteria
    return combinedResults.toArray();
}

function collectFilterCriteria() {
    const criteria = [];
    const fieldGroups = document.querySelectorAll('#fields-container .form-group');

    fieldGroups.forEach(group => {
        const fieldSelect = group.querySelector('.field-dropdown');
        const valueSelect = group.querySelector('.value-dropdown');
        const operandRadios = group.querySelectorAll('input[type="radio"]');
        let operandValue;

        operandRadios.forEach(radio => {
            if (radio.checked) {
                operandValue = radio.value;
            }
        });

        if (fieldSelect && valueSelect && operandValue) {
            criteria.push({
                field: fieldSelect.value,
                value: valueSelect.value,
                operand: operandValue
            });
        }
    });

    // console.log('Filter criteria:', criteria); // Add this line
    return criteria;
}

// ... existing JavaScript ...

function populateTable(data) {
    const tableHeader = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');

    // Clear previous table contents
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';

    // Create header row with checkboxes
    const headerRow = document.createElement('tr');
    Object.keys(data[0]).forEach(key => {
        const headerCell = document.createElement('th');
        headerCell.textContent = key;
        headerRow.appendChild(headerCell);

        // Add a checkbox to the header for column selection
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.setAttribute('data-column', key);
        headerCell.appendChild(checkbox);
    });
    tableHeader.appendChild(headerRow);

    // Populate the table body with top 10 records
    data.slice(0, 10).forEach(record => {
        const row = document.createElement('tr');
        Object.values(record).forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });
        tableBody.appendChild(row);
    });
}

// This function now handles the CSV download for the selected columns
function handleDownloadFilteredCSV() {
    const checkboxes = document.querySelectorAll('#table-header th input[type="checkbox"]');
    const selectedColumns = Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.getAttribute('data-column'));

    // Filter the data to only include selected columns
    const columnFilteredData = data.map(record => {
        const filteredRecord = {};
        selectedColumns.forEach(column => {
            filteredRecord[column] = record[column];
        });
        return filteredRecord;
    });

    // Generate and download the CSV file
    let csv = convertToCSV(columnFilteredData);
    downloadCSV(csv);
}

function convertToCSV(data) {
    // Check if data is not null or undefined and is an array
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.error('convertToCSV was passed invalid data:', data);
        return ''; // Return an empty string if data is not valid
    }

    const csvRows = [];
    // Get the headers
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));

    // Loop over the rows
    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

function downloadCSV(csv) {
    // Create a Blob with the CSV content
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'filtered_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}