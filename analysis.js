// --- Data Analysis & Visualization Module for MHZ Tools ---

let analysisState = {
    dataset: [],        // Original loaded rows
    cleanedDataset: [], // Active rows that can be mutated
    columns: [],        // Column headers
    columnTypes: {},    // Column types: 'numeric' or 'categorical'
    currentPage: 1,
    pageSize: 10,
    selectedDupeRows: new Set(), // Set of duplicate row indices
    outlierIndices: new Set()    // Set of outlier row indices
};

function initAnalysisModule() {
    setupAnalysisEvents();
    syncWorkspaceVisibility();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalysisModule);
} else {
    initAnalysisModule();
}

function setupAnalysisEvents() {
    const dropZone = document.getElementById('analysis-drop-zone');
    const fileInput = document.getElementById('analysis-file-input');
    const selectFileBtn = document.getElementById('btn-select-analysis-file');
    const loadRawBtn = document.getElementById('btn-load-raw-data');
    const loadDemoBtn = document.getElementById('btn-load-demo-data');
    const rawInput = document.getElementById('analysis-raw-input');
    const searchInput = document.getElementById('analysis-search-input');
    
    // Pagination buttons
    document.getElementById('btn-prev-page').addEventListener('click', () => {
        if (analysisState.currentPage > 1) {
            analysisState.currentPage--;
            renderPreviewTable();
        }
    });
    
    document.getElementById('btn-next-page').addEventListener('click', () => {
        const totalRows = getFilteredRows().length;
        if (analysisState.currentPage * analysisState.pageSize < totalRows) {
            analysisState.currentPage++;
            renderPreviewTable();
        }
    });

    // Dropzone triggers
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', (e) => {
            if (e.target !== fileInput) fileInput.click();
        });
        
        dropZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }

    if (selectFileBtn && fileInput) {
        selectFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }

    // Load Buttons
    if (loadRawBtn) {
        loadRawBtn.addEventListener('click', () => {
            const val = rawInput.value.trim();
            if (!val) {
                alert('Please paste some CSV or JSON data first.');
                return;
            }
            parseAndLoadData(val);
        });
    }

    if (loadDemoBtn) {
        loadDemoBtn.addEventListener('click', () => {
            loadSampleDataset();
        });
    }

    // Search preview
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                analysisState.currentPage = 1;
                renderPreviewTable();
            }, 200);
        });
    }

    // Cleaning triggers
    document.getElementById('btn-highlight-dupes').addEventListener('click', highlightDuplicates);
    document.getElementById('btn-remove-dupes').addEventListener('click', removeDuplicates);
    document.getElementById('btn-remove-invalid').addEventListener('click', removeMissingAndInvalid);
    document.getElementById('btn-standardize-text').addEventListener('click', applyTextStandardization);
    document.getElementById('btn-detect-outliers').addEventListener('click', detectOutliers);
    document.getElementById('btn-fix-outliers').addEventListener('click', fixOutliers);

    // Chi-Square trigger
    document.getElementById('btn-run-chi-test').addEventListener('click', runChiSquareTest);
    
    // Pair Plot trigger (inside chi-square results area)
    document.getElementById('btn-show-pairplot').addEventListener('click', runPairPlot);

    // Visualization triggers
    document.getElementById('plot-type-select').addEventListener('change', updatePlotSelectors);
    document.getElementById('btn-render-plot').addEventListener('click', renderSelectedPlot);
    
    // Chart Popup Modal triggers
    const btnCloseChartModal = document.getElementById('btn-chart-modal-close');
    if (btnCloseChartModal) btnCloseChartModal.addEventListener('click', closeChartModal);

    const btnDownloadChartModal = document.getElementById('btn-chart-modal-download');
    if (btnDownloadChartModal) {
        btnDownloadChartModal.addEventListener('click', () => {
            const img = document.getElementById('chart-modal-img');
            if (!img || !img.src) return;
            const a = document.createElement('a');
            a.href = img.src;
            a.download = 'chart_visualization_' + Date.now() + '.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

    const modalOverlay = document.getElementById('chart-popup-modal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeChartModal();
        });
    }

    // Export triggers
    setupExportEvents();
}

// --- Dataset Load & Parse ---

function handleFileSelect(file) {
    const reader = new FileReader();
    const label = document.getElementById('analysis-file-name-label');
    
    label.textContent = `Reading: ${file.name}`;
    
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    reader.onload = function(e) {
        if (isExcel) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
                
                if (json.length === 0) {
                    alert("The Excel worksheet is empty.");
                    label.textContent = 'Drag & Drop CSV, JSON, or Excel (.xlsx) files here';
                    return;
                }
                
                parseAndLoadData(JSON.stringify(json), file.name);
            } catch (err) {
                alert(`Error parsing Excel workbook: ${err.message}`);
                label.textContent = 'Drag & Drop CSV, JSON, or Excel (.xlsx) files here';
            }
        } else {
            parseAndLoadData(e.target.result, file.name);
        }
    };
    reader.onerror = function() {
        alert('Error reading file.');
        label.textContent = 'Drag & Drop CSV, JSON, or Excel (.xlsx) files here';
    };
    
    if (isExcel) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

function parseAndLoadData(rawContent, filename = "Pasted Content") {
    rawContent = rawContent.trim();
    let rows = [];
    
    try {
        if (rawContent.startsWith('[') || rawContent.startsWith('{')) {
            // Try parsing as JSON
            const parsed = JSON.parse(rawContent);
            rows = Array.isArray(parsed) ? parsed : [parsed];
        } else {
            // Parse as CSV
            rows = parseCSV(rawContent);
        }
    } catch (err) {
        alert(`Parsing error: ${err.message}. Please check data formatting.`);
        return;
    }
    
    if (rows.length === 0) {
        alert("The parsed dataset is empty. Check headers and rows.");
        return;
    }
    
    // Set up state
    analysisState.dataset = rows;
    analysisState.cleanedDataset = JSON.parse(JSON.stringify(rows)); // deep copy
    
    // Extract columns
    analysisState.columns = Object.keys(rows[0]);
    
    // Auto detect types
    autoDetectColumnTypes();
    
    // Clear highlights
    analysisState.selectedDupeRows.clear();
    analysisState.outlierIndices.clear();
    document.getElementById('outlier-alert-info').textContent = 'No outlier scans performed yet.';
    document.getElementById('chi-results-area').classList.add('hidden');
    // Update labels & UI lists
    analysisState.currentPage = 1;
    updateWorkspaceUI();
    

    
    // Scroll view to import status block smoothly
    const statusBlock = document.getElementById('analysis-import-status');
    if (statusBlock) statusBlock.scrollIntoView({ behavior: 'smooth' });
}

// Robust CSV parser to handle values with quotes, commas, and line breaks
function parseCSV(text) {
    let lines = [];
    let row = [""];
    lines.push(row);
    let i = 0;
    let inQuotes = false;

    for (let c = 0; c < text.length; c++) {
        let char = text[c];
        let nextChar = text[c + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                row[i] += '"'; // doubled quote inside quote
                c++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',') {
            if (inQuotes) {
                row[i] += ',';
            } else {
                row.push("");
                i++;
            }
        } else if (char === '\r' || char === '\n') {
            if (inQuotes) {
                row[i] += char;
            } else {
                if (char === '\r' && nextChar === '\n') {
                    c++;
                }
                row = [""];
                lines.push(row);
                i = 0;
            }
        } else {
            row[i] += char;
        }
    }
    
    // Filter out trailing empty row
    lines = lines.filter(r => r.length > 1 || r[0] !== "");
    
    if (lines.length < 2) return [];
    
    const headers = lines[0].map(h => h.trim());
    const dataObjects = [];
    
    for (let r = 1; r < lines.length; r++) {
        const rowData = lines[r];
        // Skip rows with unequal column count or completely empty
        if (rowData.length !== headers.length) continue;
        
        const obj = {};
        for (let col = 0; col < headers.length; col++) {
            obj[headers[col]] = rowData[col].trim();
        }
        dataObjects.push(obj);
    }
    
    return dataObjects;
}

// Auto detect data types: if 80% of values are numbers, column is numeric
function autoDetectColumnTypes() {
    analysisState.columnTypes = {};
    analysisState.columns.forEach(col => {
        let numericCount = 0;
        let nonNullCount = 0;
        
        analysisState.dataset.forEach(row => {
            const val = row[col];
            if (val !== undefined && val !== null && val !== '') {
                nonNullCount++;
                if (!isNaN(Number(val))) {
                    numericCount++;
                }
            }
        });
        
        if (nonNullCount > 0 && (numericCount / nonNullCount) >= 0.8) {
            analysisState.columnTypes[col] = 'numeric';
        } else {
            analysisState.columnTypes[col] = 'categorical';
        }
    });
}

// --- UI Sync & Controls ---

function updateWorkspaceUI() {
    const cols = analysisState.columns;
    
    // Update summary counts
    updateDatasetMetadata();
    
    // Sync placeholders and active sections
    syncWorkspaceVisibility();
    
    // Column Badge types list
    const badgeContainer = document.getElementById('analysis-column-list');
    badgeContainer.innerHTML = '';
    
    cols.forEach(col => {
        const type = analysisState.columnTypes[col];
        
        const badge = document.createElement('div');
        badge.className = 'col-badge';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'col-name';
        nameSpan.textContent = col;
        
        const select = document.createElement('select');
        select.className = 'col-type-select';
        select.innerHTML = `
            <option value="numeric" ${type === 'numeric' ? 'selected' : ''}>NUM</option>
            <option value="categorical" ${type === 'categorical' ? 'selected' : ''}>CAT</option>
        `;
        
        select.addEventListener('change', (e) => {
            analysisState.columnTypes[col] = e.target.value;
            // Re-sync options and plots
            syncSelectors();
            
            const statsTab = document.getElementById('analysis-stats');
            if (statsTab && statsTab.classList.contains('active')) {
                calculateSummaryStatistics();
            }
            renderSelectedPlot();
        });
        
        badge.appendChild(nameSpan);
        badge.appendChild(select);
        badgeContainer.appendChild(badge);
    });
    
    syncSelectors();
    renderPreviewTable();
    
    const statsTab = document.getElementById('analysis-stats');
    if (statsTab && statsTab.classList.contains('active')) {
        calculateSummaryStatistics();
    }
}

function syncWorkspaceVisibility() {
    const isLoaded = analysisState.dataset.length > 0;
    
    // Status block in Import tab
    const importStatus = document.getElementById('analysis-import-status');
    if (importStatus) {
        if (isLoaded) {
            importStatus.classList.remove('hidden');
            document.getElementById('meta-import-rows').textContent = analysisState.cleanedDataset.length;
            document.getElementById('meta-import-cols').textContent = analysisState.columns.length;
            
            let dupesCount = 0;
            const seen = new Set();
            analysisState.cleanedDataset.forEach(row => {
                const key = JSON.stringify(row);
                if (seen.has(key)) dupesCount++;
                else seen.add(key);
            });
            document.getElementById('meta-import-dupes').textContent = dupesCount;
            
            let missingCount = 0;
            analysisState.cleanedDataset.forEach(row => {
                analysisState.columns.forEach(col => {
                    const val = row[col];
                    if (val === undefined || val === null || val === '') missingCount++;
                });
            });
            document.getElementById('meta-import-missing').textContent = missingCount;
        } else {
            importStatus.classList.add('hidden');
        }
    }
    
    // Toggle active contents vs placeholders on all other tabs
    document.querySelectorAll('.no-data-placeholder').forEach(el => {
        if (isLoaded) el.classList.add('hidden');
        else el.classList.remove('hidden');
    });
    
    document.querySelectorAll('.active-data-content').forEach(el => {
        if (isLoaded) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
}

function updateDatasetMetadata() {
    const dataset = analysisState.cleanedDataset;
    const cols = analysisState.columns;
    
    document.getElementById('meta-total-rows').textContent = dataset.length;
    document.getElementById('meta-total-cols').textContent = cols.length;
    
    // Duplicate calculation
    let dupesCount = 0;
    const seen = new Set();
    dataset.forEach(row => {
        const key = JSON.stringify(row);
        if (seen.has(key)) {
            dupesCount++;
        } else {
            seen.add(key);
        }
    });
    document.getElementById('meta-duplicate-rows').textContent = dupesCount;
    
    // Missing values count
    let missingCount = 0;
    dataset.forEach(row => {
        cols.forEach(col => {
            const val = row[col];
            if (val === undefined || val === null || val === '') {
                missingCount++;
            }
        });
    });
    document.getElementById('meta-missing-vals').textContent = missingCount;
}

function syncSelectors() {
    const cols = analysisState.columns;
    const numericCols = cols.filter(c => analysisState.columnTypes[c] === 'numeric');
    
    // Save current user choices
    const prevCleanText = document.getElementById('clean-text-col').value;
    const prevCleanOutlier = document.getElementById('clean-outlier-col').value;
    
    // Clean Text selector - show all columns
    const cleanTextCol = document.getElementById('clean-text-col');
    cleanTextCol.innerHTML = cols.map(c => `<option value="${c}">${c}</option>`).join('');
    if (cols.includes(prevCleanText)) cleanTextCol.value = prevCleanText;
    
    // Clean Outlier selector - show numeric columns
    const cleanOutlierCol = document.getElementById('clean-outlier-col');
    cleanOutlierCol.innerHTML = numericCols.map(c => `<option value="${c}">${c}</option>`).join('');
    if (numericCols.includes(prevCleanOutlier)) cleanOutlierCol.value = prevCleanOutlier;
    
    // Chi-Square: populate multi-column checkbox picker and hue select
    const chiPicker = document.getElementById('chi-col-checkboxes');
    const chiHueSelect = document.getElementById('chi-hue-col');
    if (chiPicker) {
        // Remember which boxes were checked
        const prevChecked = new Set(
            Array.from(chiPicker.querySelectorAll('input[type=checkbox]:checked')).map(el => el.value)
        );
        chiPicker.innerHTML = cols.map(c => `
            <label class="chi-col-check-label">
                <input type="checkbox" value="${c}" ${prevChecked.has(c) ? 'checked' : ''}> ${c}
            </label>`).join('');
    }
    if (chiHueSelect) {
        const prevHue = chiHueSelect.value;
        chiHueSelect.innerHTML = `<option value="">(none)</option>` +
            cols.map(c => `<option value="${c}" ${c === prevHue ? 'selected' : ''}>${c}</option>`).join('');
    }

    // Visualisation Studio: populate feature checkbox picker and group-by
    const vizPicker = document.getElementById('viz-col-checkboxes');
    const vizGroupCol = document.getElementById('viz-group-col');
    if (vizPicker) {
        const prevVizChecked = new Set(
            Array.from(vizPicker.querySelectorAll('input[type=checkbox]:checked')).map(el => el.value)
        );
        vizPicker.innerHTML = cols.map(c => `
            <label class="chi-col-check-label">
                <input type="checkbox" value="${c}" ${prevVizChecked.has(c) ? 'checked' : ''}> ${c}
            </label>`).join('');
    }
    if (vizGroupCol) {
        const prevGroup = vizGroupCol.value;
        vizGroupCol.innerHTML = `<option value="">(none)</option>` +
            cols.map(c => `<option value="${c}" ${c === prevGroup ? 'selected' : ''}>${c}</option>`).join('');
    }

    // Keep legacy plot-x/y-select in sync for any remaining internal references
    const xSelect = document.getElementById('plot-x-select');
    const ySelect = document.getElementById('plot-y-select');
    if (xSelect) xSelect.innerHTML = cols.map(c => `<option value="${c}">${c}</option>`).join('');
    if (ySelect) ySelect.innerHTML = cols.map(c => `<option value="${c}">${c}</option>`).join('');
}

function updatePlotSelectors() {
    // No-op: legacy function kept so existing callers don't throw
}



// --- Preview Table Logic ---

function getFilteredRows() {
    const dataset = analysisState.cleanedDataset;
    const searchInput = document.getElementById('analysis-search-input');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    if (!query) return dataset;
    
    return dataset.filter(row => {
        return Object.values(row).some(val => {
            return String(val).toLowerCase().includes(query);
        });
    });
}

function renderPreviewTable() {
    const filtered = getFilteredRows();
    const totalRows = filtered.length;
    
    // Page constraints
    const maxPages = Math.ceil(totalRows / analysisState.pageSize) || 1;
    if (analysisState.currentPage > maxPages) {
        analysisState.currentPage = maxPages;
    }
    
    const startIndex = (analysisState.currentPage - 1) * analysisState.pageSize;
    const endIndex = Math.min(startIndex + analysisState.pageSize, totalRows);
    
    // Update pagination labels
    document.getElementById('analysis-table-pagination-info').textContent = 
        totalRows === 0 ? "Showing 0-0 of 0" : `Showing ${startIndex + 1}-${endIndex} of ${totalRows}`;
        
    // Header
    const headerRow = document.getElementById('analysis-table-header');
    headerRow.innerHTML = '<th>#</th>' + analysisState.columns.map(col => `<th>${col}</th>`).join('');
    
    // Body
    const tbody = document.getElementById('analysis-table-body');
    tbody.innerHTML = '';
    
    if (totalRows === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${analysisState.columns.length + 1}" style="text-align: center; color: var(--text-muted);">No records match the active search/dataset state.</td>`;
        tbody.appendChild(tr);
        return;
    }
    
    for (let i = startIndex; i < endIndex; i++) {
        const row = filtered[i];
        
        // Find original row index in analysisState.cleanedDataset to verify matches/duplicates
        const originalIndex = analysisState.cleanedDataset.indexOf(row);
        
        const tr = document.createElement('tr');
        
        // Check highlight classes
        if (analysisState.selectedDupeRows.has(originalIndex)) {
            tr.classList.add('duplicate-row-highlight');
        } else if (analysisState.outlierIndices.has(originalIndex)) {
            tr.classList.add('duplicate-row-highlight'); // Re-use styling for highlight alert
        }
        
        let cellsHTML = `<td>${originalIndex + 1}</td>`;
        
        analysisState.columns.forEach(col => {
            const val = row[col];
            const isNumeric = analysisState.columnTypes[col] === 'numeric';
            const isNull = (val === undefined || val === null || val === '');
            const isInvalidNumber = isNumeric && !isNull && isNaN(Number(val));
            
            if (isNull || isInvalidNumber) {
                cellsHTML += `<td class="invalid-cell-highlight">${isNull ? 'NULL' : val}</td>`;
            } else {
                cellsHTML += `<td>${val}</td>`;
            }
        });
        
        tr.innerHTML = cellsHTML;
        tbody.appendChild(tr);
    }
    
    // Re-draw lucide icons
    if (window.lucide && window.lucide.createIcons) lucide.createIcons();
}

// --- Data Cleaning Implementations ---

// 1. Duplicates
function highlightDuplicates() {
    const dataset = analysisState.cleanedDataset;
    analysisState.selectedDupeRows.clear();
    analysisState.outlierIndices.clear(); // Clear other markers
    
    const seen = new Set();
    
    for (let i = 0; i < dataset.length; i++) {
        const rowStr = JSON.stringify(dataset[i]);
        if (seen.has(rowStr)) {
            analysisState.selectedDupeRows.add(i);
            // Highlight the first match too for visibility
            for (let j = 0; j < i; j++) {
                if (JSON.stringify(dataset[j]) === rowStr) {
                    analysisState.selectedDupeRows.add(j);
                }
            }
        } else {
            seen.add(rowStr);
        }
    }
    
    if (analysisState.selectedDupeRows.size === 0) {
        alert("No duplicate rows found in the current dataset.");
    } else {
        alert(`Pointed out ${analysisState.selectedDupeRows.size} duplicate rows. They are highlighted in orange in the table.`);
    }
    
    renderPreviewTable();
}

async function removeDuplicates() {
    if (analysisState.cleanedDataset.length === 0) return;
    const prevCount = analysisState.cleanedDataset.length;
    const res = await window.electronAPI.runPythonAnalysis('clean_data', analysisState.cleanedDataset, { action: 'remove_duplicates' });
    if (res.success) {
        analysisState.cleanedDataset = JSON.parse(res.output);
        analysisState.selectedDupeRows.clear();
        const newCount = analysisState.cleanedDataset.length;
        const removed = prevCount - newCount;
        updateWorkspaceUI();
        alert(`Duplicate removal complete. Removed ${removed} duplicate row(s). Total dataset size: ${newCount}.`);
    } else {
        alert("Python cleaning failed: " + res.error);
    }
}

// 2. Drop Missing / Invalid

async function removeMissingAndInvalid() {
    if (analysisState.cleanedDataset.length === 0) return;
    const prevCount = analysisState.cleanedDataset.length;
    const res = await window.electronAPI.runPythonAnalysis('clean_data', analysisState.cleanedDataset, { action: 'remove_invalid' });
    if (res.success) {
        analysisState.cleanedDataset = JSON.parse(res.output);
        const newCount = analysisState.cleanedDataset.length;
        const dropped = prevCount - newCount;
        updateWorkspaceUI();
        alert(`Missing/invalid value cleanup complete. Dropped ${dropped} row(s). Total dataset size: ${newCount}.`);
    } else {
        alert("Python cleaning failed: " + res.error);
    }
}

// 3. Text standardization

async function applyTextStandardization() {
    const col = document.getElementById('clean-text-col').value;
    const op = document.getElementById('clean-text-op').value;
    if (!col) {
        alert("No text column selected for standardization.");
        return;
    }
    
    const res = await window.electronAPI.runPythonAnalysis('clean_data', analysisState.cleanedDataset, {
        action: 'standardize_text',
        column: col,
        operation: op
    });
    if (res.success) {
        analysisState.cleanedDataset = JSON.parse(res.output);
        updateWorkspaceUI();
        alert(`Text standardization ('${op}') applied successfully to column '${col}'!`);
    } else {
        alert("Python cleaning failed: " + res.error);
    }
}



// 4. Outliers
let detectedOutlierStats = null;

function detectOutliers() {
    const col = document.getElementById('clean-outlier-col').value;
    const method = document.getElementById('clean-outlier-method').value;
    
    if (!col) {
        alert("No numeric column selected for outlier detection.");
        return;
    }
    
    const dataset = analysisState.cleanedDataset;
    // Extract non-null numeric values
    const numericData = [];
    const validIndices = [];
    
    dataset.forEach((row, idx) => {
        const val = Number(row[col]);
        if (!isNaN(val) && row[col] !== '') {
            numericData.push(val);
            validIndices.push(idx);
        }
    });
    
    if (numericData.length < 3) {
        alert("Insufficient numerical values in column to check for outliers.");
        return;
    }
    
    let lowerBound, upperBound;
    analysisState.outlierIndices.clear();
    analysisState.selectedDupeRows.clear(); // Clear duplicate indicators
    
    if (method === 'iqr') {
        // IQR Method
        const sorted = [...numericData].sort((a, b) => a - b);
        const q1 = quantile(sorted, 0.25);
        const q3 = quantile(sorted, 0.75);
        const iqr = q3 - q1;
        lowerBound = q1 - 1.5 * iqr;
        upperBound = q3 + 1.5 * iqr;
    } else {
        // Z-score Method (3x std dev)
        const mean = calcMean(numericData);
        const stdDev = calcStdDev(numericData, mean);
        lowerBound = mean - 3 * stdDev;
        upperBound = mean + 3 * stdDev;
    }
    
    // Scan dataset
    validIndices.forEach(idx => {
        const val = Number(dataset[idx][col]);
        if (val < lowerBound || val > upperBound) {
            analysisState.outlierIndices.add(idx);
        }
    });
    
    detectedOutlierStats = {
        col: col,
        lower: lowerBound,
        upper: upperBound,
        indices: new Set(analysisState.outlierIndices)
    };
    
    const count = analysisState.outlierIndices.size;
    document.getElementById('outlier-alert-info').innerHTML = 
        `Scanned '${col}': Found <strong>${count}</strong> outliers (Bound: [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]).`;
        
    if (count > 0) {
        alert(`Detected ${count} outlier values in column '${col}'. They are highlighted in orange in the preview table.`);
    } else {
        alert("No outliers detected with the selected method bounds.");
    }
    
    renderPreviewTable();
}

async function fixOutliers() {
    const col = document.getElementById('clean-outlier-col').value;
    const method = document.getElementById('clean-outlier-method').value;
    const action = document.getElementById('clean-outlier-action').value;
    if (!col) return;
    
    const prevCount = analysisState.cleanedDataset.length;
    const res = await window.electronAPI.runPythonAnalysis('clean_data', analysisState.cleanedDataset, {
        action: 'fix_outliers',
        column: col,
        method: method,
        remedy: action
    });
    if (res.success) {
        analysisState.cleanedDataset = JSON.parse(res.output);
        analysisState.outlierIndices.clear();
        detectedOutlierStats = null;
        
        const newCount = analysisState.cleanedDataset.length;
        const diff = prevCount - newCount;
        
        let msg = '';
        if (action === 'delete') {
            msg = `Removed ${diff} outlier row(s) from column '${col}'! Total dataset size is now ${newCount}.`;
        } else if (action === 'clip') {
            msg = `Clipped outliers in column '${col}' to valid bounds [min/max].`;
        } else {
            msg = `Replaced outliers in column '${col}' with column ${action}.`;
        }
        
        document.getElementById('outlier-alert-info').innerHTML = 
            `<span style="color:var(--success-color);">✓ ${msg}</span>`;
        updateWorkspaceUI();
        alert(msg);
    } else {
        alert("Python cleaning failed: " + res.error);
    }
}



// --- Descriptive Statistics ---

async function calculateSummaryStatistics() {
    if (analysisState.cleanedDataset.length === 0) return;
    const tbody = document.getElementById('summary-stats-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;"><i data-lucide="loader" style="animation: spin 1.5s linear infinite; display: inline-block;"></i> Running calculations...</td></tr>`;
    if (window.lucide && window.lucide.createIcons) lucide.createIcons();

    let stats = null;
    if (window.electronAPI && window.electronAPI.runPythonAnalysis) {
        try {
            const res = await window.electronAPI.runPythonAnalysis('summary_stats', analysisState.cleanedDataset, {});
            if (res.success && res.output) {
                stats = JSON.parse(res.output);
            }
        } catch(e) {}
    }

    if (!stats || stats.length === 0) {
        stats = runSummaryStatsJS(analysisState.cleanedDataset);
    }

    tbody.innerHTML = '';
    if (!stats || stats.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No numeric columns available in the current dataset.</td></tr>`;
        return;
    }

    stats.forEach(s => {
        tbody.innerHTML += `
        <tr>
            <td><strong>${s.variable}</strong></td>
            <td class="mono">${s.mean}</td>
            <td class="mono">${s.median}</td>
            <td class="mono">${s.min}</td>
            <td class="mono">${s.max}</td>
            <td class="mono">${s.stdDev}</td>
            <td class="mono">${s.range}</td>
            <td class="mono">${s.count}</td>
        </tr>`;
    });
}

// --- Helper Math Functions ---

function calcMean(arr) {
    if (arr.length === 0) return 0;
    const sum = arr.reduce((acc, v) => acc + v, 0);
    return sum / arr.length;
}

function calcMedian(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return quantile(sorted, 0.5);
}

function calcStdDev(arr, mean) {
    if (arr.length <= 1) return 0;
    const variance = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
}

function quantile(sortedArr, q) {
    const pos = (sortedArr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedArr[base + 1] !== undefined) {
        return sortedArr[base] + rest * (sortedArr[base + 1] - sortedArr[base]);
    } else {
        return sortedArr[base];
    }
}

// --- Chi-Square Test & Contingency Table ---

async function runChiSquareTest() {
    const picker = document.getElementById('chi-col-checkboxes');
    const checked = picker
        ? Array.from(picker.querySelectorAll('input[type=checkbox]:checked')).map(el => el.value)
        : [];

    if (checked.length < 2) {
        alert('Please select at least 2 columns to run the Chi-Square analysis.');
        return;
    }

    const btn = document.getElementById('btn-run-chi-test');
    const origText = btn ? btn.innerHTML : '';
    if (btn) {
        const nPairs = checked.length * (checked.length - 1) / 2;
        btn.innerHTML = `<i data-lucide="loader" style="animation:spin 1.5s linear infinite;display:inline-block;"></i> Running ${nPairs} pair${nPairs===1?'':'s'}...`;
        btn.disabled = true;
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    }

    let results = null;

    // Try Python first
    if (window.electronAPI && window.electronAPI.runPythonAnalysis) {
        try {
            const res = await window.electronAPI.runPythonAnalysis('chi_square', analysisState.cleanedDataset, { cols: checked });
            if (res && res.success && res.output) {
                results = JSON.parse(res.output);
            }
        } catch(e) {}
    }

    // JS fallback
    if (!results) {
        results = runChiSquareJS(analysisState.cleanedDataset, checked);
    }

    if (btn) {
        btn.innerHTML = origText;
        btn.disabled = false;
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    }

    if (!results) {
        alert('Chi-Square calculation failed.');
        return;
    }

    try {
        const { columns, pairs, heatmap } = results;

        // Render p-value heatmap matrix
        const heatmapTable = document.getElementById('chi-heatmap-table');
        heatmapTable.innerHTML = '';
        const headerTr = document.createElement('tr');
        headerTr.innerHTML = '<th style="background:var(--bg-surface-elevated);"></th>' +
            columns.map(c => `<th style="background:var(--bg-surface-elevated);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${c}">${c}</th>`).join('');
        heatmapTable.appendChild(headerTr);

        heatmap.forEach((row, i) => {
            const tr = document.createElement('tr');
            let cells = `<td style="font-weight:600;background:var(--bg-surface-elevated);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${columns[i]}">${columns[i]}</td>`;
            row.forEach(cell => {
                if (cell.pRaw === -1) {
                    cells += `<td style="background:var(--bg-surface-elevated);text-align:center;color:var(--text-dark);">—</td>`;
                } else if (cell.significant) {
                    cells += `<td style="background:rgba(16,185,129,0.18);color:#10b981;text-align:center;font-weight:600;font-family:var(--font-mono);font-size:11px;">${cell.value}</td>`;
                } else {
                    cells += `<td style="background:rgba(239,68,68,0.1);color:#ef4444;text-align:center;font-family:var(--font-mono);font-size:11px;">${cell.value}</td>`;
                }
            });
            tr.innerHTML = cells;
            heatmapTable.appendChild(tr);
        });

        // Render pair detail accordions
        const pairsList = document.getElementById('chi-pairs-list');
        pairsList.innerHTML = '';
        pairs.forEach((pair) => {
            const isSignificant = pair.significant;
            const hasError = !!pair.error;
            const accordion = document.createElement('div');
            accordion.className = 'chi-pair-accordion';
            accordion.style.cssText = `border:1px solid ${isSignificant ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}; border-radius:6px; overflow:hidden;`;

            const badge = hasError
                ? `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(239,68,68,0.15);color:#ef4444;">ERROR</span>`
                : isSignificant
                    ? `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(16,185,129,0.2);color:#10b981;font-weight:700;">SIGNIFICANT</span>`
                    : `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(239,68,68,0.1);color:#ef4444;">NOT SIGNIFICANT</span>`;

            const pInfo = hasError ? '' : `<span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);margin-left:8px;">χ²=${pair.statistic} · df=${pair.dof} · p=${pair.pValue}</span>`;
            const header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;cursor:pointer;background:var(--bg-surface);user-select:none;';
            header.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">${badge}<span style="font-size:12px;font-weight:600;">${pair.colA} × ${pair.colB}</span>${pInfo}</div><i data-lucide="chevron-down" style="width:14px;height:14px;color:var(--text-muted);transition:transform 0.2s;"></i>`;

            const body = document.createElement('div');
            body.style.cssText = 'display:none;padding:12px;background:var(--bg-base);';
            if (hasError) {
                body.innerHTML = `<p style="color:#ef4444;font-size:12px;">Error: ${pair.error}</p>`;
            } else {
                body.innerHTML = `<p style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">${pair.interpretation}</p>`;
                if (pair.headers && pair.matrix) {
                    const tblWrap = document.createElement('div');
                    tblWrap.style.cssText = 'overflow:auto;max-height:160px;border:1px solid var(--border-color);border-radius:4px;';
                    const tbl = document.createElement('table');
                    tbl.className = 'data-table compact-table';
                    tbl.style.cssText = 'font-size:10px;width:100%;';
                    const tHead = document.createElement('tr');
                    tHead.innerHTML = `<th>${pair.colA} \\ ${pair.colB}</th>` + pair.headers.map(h => `<th>${h}</th>`).join('');
                    tbl.appendChild(tHead);
                    pair.matrix.forEach(row => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `<td><strong>${row.rowLabel}</strong></td>` + row.values.map(v => `<td>${v}</td>`).join('');
                        tbl.appendChild(tr);
                    });
                    tblWrap.appendChild(tbl);
                    body.appendChild(tblWrap);
                }
            }
            header.addEventListener('click', () => {
                const isOpen = body.style.display !== 'none';
                body.style.display = isOpen ? 'none' : 'block';
                const chevron = header.querySelector('[data-lucide="chevron-down"]');
                if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
            });
            accordion.appendChild(header);
            accordion.appendChild(body);
            pairsList.appendChild(accordion);
        });

        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
        document.getElementById('chi-results-area').classList.remove('hidden');
    } catch(e) {
        alert('Chi-Square render error: ' + e.message);
    }
}

/** Pure JS chi-square implementation — runs when Python is unavailable */
function runChiSquareJS(dataset, cols) {
    const pairs = [];
    const pMatrix = {};
    for (let i = 0; i < cols.length; i++) {
        pMatrix[cols[i]] = {};
        for (let j = 0; j < cols.length; j++) {
            pMatrix[cols[i]][cols[j]] = { pRaw: i === j ? -1 : null, significant: false, value: i === j ? '—' : '' };
        }
    }

    for (let i = 0; i < cols.length; i++) {
        for (let j = i + 1; j < cols.length; j++) {
            const colA = cols[i], colB = cols[j];
            try {
                const result = chiSquarePair(dataset, colA, colB);
                pairs.push(result);
                pMatrix[colA][colB] = { pRaw: result.pRaw, significant: result.significant, value: result.pValue };
                pMatrix[colB][colA] = { pRaw: result.pRaw, significant: result.significant, value: result.pValue };
            } catch(e) {
                const errPair = { colA, colB, error: e.message, significant: false };
                pairs.push(errPair);
                pMatrix[colA][colB] = { pRaw: 1, significant: false, value: 'ERR' };
                pMatrix[colB][colA] = { pRaw: 1, significant: false, value: 'ERR' };
            }
        }
    }

    const heatmap = cols.map(ci => cols.map(cj => pMatrix[ci][cj]));
    return { columns: cols, pairs, heatmap };
}

function chiSquarePair(dataset, colA, colB) {
    // Build contingency table
    const rowCats = [], colCats = [];
    dataset.forEach(r => {
        const a = String(r[colA] ?? ''), b = String(r[colB] ?? '');
        if (a && !rowCats.includes(a)) rowCats.push(a);
        if (b && !colCats.includes(b)) colCats.push(b);
    });
    rowCats.sort(); colCats.sort();

    const table = rowCats.map(() => colCats.map(() => 0));
    dataset.forEach(r => {
        const a = String(r[colA] ?? ''), b = String(r[colB] ?? '');
        if (!a || !b) return;
        const ri = rowCats.indexOf(a), ci = colCats.indexOf(b);
        if (ri >= 0 && ci >= 0) table[ri][ci]++;
    });

    const rowSums = table.map(row => row.reduce((s,v) => s+v, 0));
    const colSums = colCats.map((_,j) => table.reduce((s,row) => s+row[j], 0));
    const total = rowSums.reduce((s,v) => s+v, 0);
    if (total === 0) throw new Error('No data to analyze');

    let statistic = 0;
    const dof = (rowCats.length - 1) * (colCats.length - 1);
    if (dof <= 0) throw new Error('Insufficient categories (need ≥2 per column)');

    for (let ri = 0; ri < rowCats.length; ri++) {
        for (let ci = 0; ci < colCats.length; ci++) {
            const observed = table[ri][ci];
            const expected = (rowSums[ri] * colSums[ci]) / total;
            if (expected > 0) statistic += Math.pow(observed - expected, 2) / expected;
        }
    }

    // Chi-square p-value approximation using regularized incomplete gamma function
    const pRaw = 1 - chiSquareCDF(statistic, dof);
    const significant = pRaw < 0.05;
    const pValueStr = pRaw < 0.0001 ? '< 0.0001' : pRaw.toFixed(4);
    const interpretation = significant
        ? `Strong evidence of association between "${colA}" and "${colB}" (p=${pValueStr} < 0.05). The two variables are likely NOT independent.`
        : `No significant association detected between "${colA}" and "${colB}" (p=${pValueStr} ≥ 0.05). Variables appear independent.`;

    return {
        colA, colB,
        statistic: statistic.toFixed(4),
        dof,
        pValue: pValueStr,
        pRaw,
        significant,
        interpretation,
        headers: colCats,
        matrix: rowCats.map((rk, ri) => ({ rowLabel: rk, values: colCats.map((_,ci) => table[ri][ci]) }))
    };
}

/** Approximate chi-square CDF using regularized lower incomplete gamma function */
function chiSquareCDF(x, k) {
    if (x <= 0) return 0;
    return lowerIncompleteGamma(k / 2, x / 2) / gamma(k / 2);
}

function gamma(n) {
    if (n === 0.5) return Math.sqrt(Math.PI);
    if (n === 1) return 1;
    if (n < 1) return gamma(n + 1) / n;
    // Lanczos approximation
    const g = 7;
    const c = [0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
    let x2 = n - 1;
    let t = x2 + g + 0.5;
    let s = c[0];
    for (let i = 1; i < g + 2; i++) s += c[i] / (x2 + i);
    return Math.sqrt(2 * Math.PI) * Math.pow(t, x2 + 0.5) * Math.exp(-t) * s;
}

function lowerIncompleteGamma(a, x) {
    // Series expansion
    if (x < 0) return 0;
    let sum = 0, term = 1 / a;
    sum = term;
    for (let n = 1; n < 200; n++) {
        term *= x / (a + n);
        sum += term;
        if (Math.abs(term) < 1e-10) break;
    }
    return Math.exp(-x) * Math.pow(x, a) * sum;
}





function openChartModal(title, imageData) {
    if (window.electronAPI && window.electronAPI.openChartWindow) {
        window.electronAPI.openChartWindow(title, imageData);
        return;
    }

    const modal = document.getElementById('chart-popup-modal');
    if (!modal) return;

    const titleEl = document.getElementById('chart-modal-title');
    if (titleEl) titleEl.textContent = title || 'Interactive Visualization Chart';

    const img = document.getElementById('chart-modal-img');
    if (img) img.src = imageData;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    if (window.lucide && window.lucide.createIcons) lucide.createIcons();
}

function closeChartModal() {
    const modal = document.getElementById('chart-popup-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// --- Pair Plot (scatter matrix + KDE diagonal colored by hue column) ---
let _pairplotInFlight = false;

async function runPairPlot() {
    if (_pairplotInFlight) return;
    if (analysisState.cleanedDataset.length === 0) {
        alert('Please load a dataset first.');
        return;
    }

    const hueCol = document.getElementById('chi-hue-col')?.value || '';

    _pairplotInFlight = true;
    const btn = document.getElementById('btn-show-pairplot');
    const origText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = `<i data-lucide="loader" style="animation:spin 1.5s linear infinite;display:inline-block;"></i> Opening Pair Plot Window...`;
        btn.disabled = true;
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    }

    let opened = false;
    if (window.electronAPI && window.electronAPI.runPythonAnalysis) {
        try {
            const res = await window.electronAPI.runPythonAnalysis('pairplot', analysisState.cleanedDataset, { hueCol });
            if (res && res.success && res.output) {
                try {
                    const parsed = typeof res.output === 'string' ? JSON.parse(res.output) : res.output;
                    if (parsed.imageData) {
                        openChartModal('Pair Plot Scatter Matrix', parsed.imageData);
                        opened = true;
                    }
                } catch(e) {}
            }
        } catch(e) {}
    }

    if (!opened) {
        // JS fallback: build scatter matrix from numeric columns
        const numericCols = (analysisState.columns || []).filter(c => analysisState.columnTypes[c] === 'numeric').slice(0, 5);
        if (numericCols.length >= 2) {
            openPlotlyPopup('Pair Plot Scatter Matrix', buildScatterMatrixConfig(numericCols, hueCol));
        } else {
            alert('Need at least 2 numeric columns for a pair plot.');
        }
    }

    _pairplotInFlight = false;
    if (btn) {
        btn.innerHTML = origText;
        btn.disabled = false;
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    }
}

function buildScatterMatrixConfig(cols, hueCol) {
    const dataset = analysisState.cleanedDataset;
    const palette = ['#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec4899'];
    const dimensions = cols.map(c => ({
        label: c,
        values: dataset.map(r => Number(r[c]))
    }));
    let trace;
    if (hueCol && analysisState.columns.includes(hueCol)) {
        const groups = [...new Set(dataset.map(r => String(r[hueCol])))];
        trace = {
            type: 'splom',
            dimensions,
            text: dataset.map(r => String(r[hueCol])),
            marker: {
                color: dataset.map(r => groups.indexOf(String(r[hueCol]))),
                colorscale: palette.map((c,i) => [i/(palette.length-1), c]),
                size: 5, opacity: 0.75
            }
        };
    } else {
        trace = { type: 'splom', dimensions, marker: { color: '#10b981', size: 5, opacity: 0.75 } };
    }
    return {
        data: [trace],
        layout: {
            title: { text: 'Pair Plot Scatter Matrix', font: { color: '#0f172a', size: 16 } },
            paper_bgcolor: '#ffffff',
            plot_bgcolor: '#f8fafc',
            font: { color: '#0f172a', family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
            dragmode: 'select',
            width: 900,
            height: 800
        }
    };
}

/** Open a native Electron window with a Plotly chart rendered inside it */
async function openPlotlyPopup(title, chartConfig) {
    if (window.electronAPI && window.electronAPI.openPlotlyWindow) {
        try {
            await window.electronAPI.openPlotlyWindow(title, chartConfig);
            return;
        } catch(e) {}
    }
    // Browser fallback — render into an in-page modal
    const modal = document.getElementById('chart-popup-modal');
    if (!modal) return;
    const titleEl = document.getElementById('chart-modal-title');
    if (titleEl) titleEl.textContent = title;
    const imgEl = document.getElementById('chart-modal-img');
    if (imgEl) imgEl.style.display = 'none';
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

// --- Data Visualisation Renderer (Multi-Chart Grid) — ALL open as popup windows ---

let _plotInFlight = false;

async function renderSelectedPlot() {
    if (_plotInFlight) return;

    const plotType = document.getElementById('plot-type-select').value;
    const groupCol = document.getElementById('viz-group-col')?.value || '';

    const picker = document.getElementById('viz-col-checkboxes');
    const selectedCols = picker
        ? Array.from(picker.querySelectorAll('input[type=checkbox]:checked')).map(el => el.value)
        : [];

    if (analysisState.cleanedDataset.length === 0) return;

    if (plotType !== 'heatmap' && plotType !== 'boxplot' && selectedCols.length === 0) {
        alert('Please select at least one feature to plot.');
        return;
    }
    if (plotType === 'scatter' && selectedCols.length !== 2) {
        alert('Scatter plot needs exactly 2 features selected (X and Y).');
        return;
    }

    _plotInFlight = true;
    const btn = document.getElementById('btn-render-plot');
    const origText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = `<i data-lucide="loader" style="animation:spin 1.5s linear infinite;display:inline-block;"></i> Opening Chart Window...`;
        btn.disabled = true;
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    }

    try {
        // Try Python first for high-quality PNG
        let chartRendered = false;
        if (window.electronAPI && window.electronAPI.runPythonAnalysis) {
            try {
                const res = await window.electronAPI.runPythonAnalysis('plot', analysisState.cleanedDataset, {
                    plotType, cols: selectedCols, groupCol,
                    colX: selectedCols[0] || '', colY: selectedCols[1] || ''
                });
                if (res && res.success && res.output) {
                    const parsed = typeof res.output === 'string' ? JSON.parse(res.output) : res.output;
                    if (parsed && parsed.imageData) {
                        openChartModal(`${plotType.charAt(0).toUpperCase()+plotType.slice(1)} Chart`, parsed.imageData);
                        chartRendered = true;
                    }
                }
            } catch(e) {}
        }

        // JS Plotly fallback — opens in native popup window
        if (!chartRendered) {
            const config = buildPlotlyChartConfig(plotType, selectedCols, groupCol);
            if (config) {
                await openPlotlyPopup(`${plotType.charAt(0).toUpperCase()+plotType.slice(1)} Chart`, config);
            }
        }
    } finally {
        _plotInFlight = false;
        if (btn) {
            btn.innerHTML = origText;
            btn.disabled = false;
            if (window.lucide && window.lucide.createIcons) lucide.createIcons();
        }
    }
}

/**
 * Builds a Plotly {data, layout} config object from the dataset.
 * This gets sent to the native popup window via IPC.
 */
function buildPlotlyChartConfig(plotType, cols, groupCol) {
    const dataset = analysisState.cleanedDataset;
    const palette = ['#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
    const baseLayout = {
        paper_bgcolor: '#ffffff',
        plot_bgcolor: '#f8fafc',
        font: { color: '#0f172a', family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
        legend: { bgcolor: '#ffffff', bordercolor: '#e2e8f0', borderwidth: 1 },
        margin: { l: 55, r: 20, t: 50, b: 55 }
    };

    const numericCols = (analysisState.columns || []).filter(c => analysisState.columnTypes[c] === 'numeric');

    if (plotType === 'histogram') {
        const col = cols[0];
        let traces;
        if (groupCol && analysisState.columns.includes(groupCol)) {
            const groups = {};
            dataset.forEach(r => {
                const g = String(r[groupCol] ?? 'N/A');
                const v = Number(r[col]);
                if (!isNaN(v)) { if (!groups[g]) groups[g] = []; groups[g].push(v); }
            });
            traces = Object.keys(groups).map((g,i) => ({
                x: groups[g], type: 'histogram', name: g,
                marker: { color: palette[i % palette.length] }, opacity: 0.75
            }));
        } else {
            traces = [{ x: dataset.map(r=>Number(r[col])).filter(v=>!isNaN(v)),
                type:'histogram', name:col, marker:{color:'#10b981'}, opacity:0.85 }];
        }
        return { data: traces, layout: { ...baseLayout, title:{text:`Histogram — ${col}`},
            barmode: groupCol ? 'overlay' : undefined,
            xaxis:{title:{text:col},gridcolor:'#e2e8f0',zerolinecolor:'#cbd5e1'}, yaxis:{title:{text:'Count'},gridcolor:'#e2e8f0',zerolinecolor:'#cbd5e1'} } };
    }

    if (plotType === 'scatter') {
        const [colX, colY] = cols;
        let traces;
        if (groupCol && analysisState.columns.includes(groupCol)) {
            const groups = {};
            dataset.forEach(r => {
                const g = String(r[groupCol] ?? 'N/A');
                if (!groups[g]) groups[g] = {x:[],y:[]};
                groups[g].x.push(Number(r[colX])); groups[g].y.push(Number(r[colY]));
            });
            traces = Object.keys(groups).map((g,i) => ({
                x:groups[g].x, y:groups[g].y, mode:'markers', type:'scatter', name:g,
                marker:{color:palette[i%palette.length], size:8}
            }));
        } else {
            traces = [{x:dataset.map(r=>Number(r[colX])), y:dataset.map(r=>Number(r[colY])),
                mode:'markers', type:'scatter', name:`${colX} vs ${colY}`,
                marker:{color:'#10b981', size:8} }];
        }
        return { data: traces, layout: { ...baseLayout, title:{text:`${colX} × ${colY}`},
            xaxis:{title:{text:colX},gridcolor:'#e2e8f0',zerolinecolor:'#cbd5e1'}, yaxis:{title:{text:colY},gridcolor:'#e2e8f0',zerolinecolor:'#cbd5e1'} } };
    }

    if (plotType === 'boxplot') {
        const col = cols[0] || numericCols[0];
        if (!col) return null;
        let traces;
        if (groupCol && analysisState.columns.includes(groupCol)) {
            const groups = {};
            dataset.forEach(r => {
                const g = String(r[groupCol] ?? 'N/A');
                const v = Number(r[col]);
                if (!isNaN(v)) { if (!groups[g]) groups[g]=[]; groups[g].push(v); }
            });
            traces = Object.keys(groups).map((g,i) => ({
                y:groups[g], type:'box', name:g, marker:{color:palette[i%palette.length]}, boxpoints:'suspectedoutliers'
            }));
        } else {
            traces = [{ y:dataset.map(r=>Number(r[col])).filter(v=>!isNaN(v)),
                type:'box', name:col, marker:{color:'#10b981'}, boxpoints:'suspectedoutliers' }];
        }
        return { data: traces, layout: { ...baseLayout, title:{text:`Box & Whisker — ${col}`},
            yaxis:{title:{text:col},gridcolor:'#e2e8f0',zerolinecolor:'#cbd5e1'} } };
    }

    if (plotType === 'heatmap') {
        if (numericCols.length < 2) return null;
        const matrix = numericCols.map(ci => numericCols.map(cj => {
            const a = dataset.map(r=>Number(r[ci])).filter(v=>!isNaN(v));
            const b = dataset.map(r=>Number(r[cj])).filter(v=>!isNaN(v));
            return pearsonCorrelation(a, b);
        }));
        return { data: [{z:matrix, x:numericCols, y:numericCols, type:'heatmap',
            colorscale:[[0,'#ef4444'],[0.5,'#f1f5f9'],[1,'#10b981']], zmin:-1, zmax:1}],
            layout: { ...baseLayout, title:{text:'Pearson Correlation Heatmap'},
                xaxis:{gridcolor:'#e2e8f0'}, yaxis:{gridcolor:'#e2e8f0'} } };
    }

    if (plotType === 'bar') {
        const col = cols[0];
        let traces;
        if (groupCol && analysisState.columns.includes(groupCol)) {
            const groups = {}, categories = new Set();
            dataset.forEach(r => {
                const g = String(r[groupCol]??'N/A'), c = String(r[col]??'N/A');
                categories.add(c);
                if (!groups[g]) groups[g]={};
                groups[g][c] = (groups[g][c]||0)+1;
            });
            const cats = [...categories].sort();
            traces = Object.keys(groups).map((g,i) => ({
                x:cats, y:cats.map(c=>groups[g][c]||0), type:'bar', name:g,
                marker:{color:palette[i%palette.length]}
            }));
        } else {
            const counts = {};
            dataset.forEach(r => { const v=String(r[col]??'N/A'); counts[v]=(counts[v]||0)+1; });
            const labels = Object.keys(counts).sort();
            traces = [{x:labels, y:labels.map(l=>counts[l]), type:'bar', marker:{color:'rgba(16,185,129,0.85)'}}];
        }
        return { data: traces, layout: { ...baseLayout, title:{text:`Bar Chart — ${col}`},
            xaxis:{title:{text:col},gridcolor:'#e2e8f0',zerolinecolor:'#cbd5e1'}, yaxis:{title:{text:'Count'},gridcolor:'#e2e8f0',zerolinecolor:'#cbd5e1'},
            barmode: groupCol ? 'group' : undefined } };
    }

    if (plotType === 'line') {
        const col = cols[0];
        let traces;
        if (groupCol && analysisState.columns.includes(groupCol)) {
            const groups = {};
            dataset.forEach((r,idx) => {
                const g=String(r[groupCol]??'N/A'), v=Number(r[col]);
                if (!groups[g]) groups[g]={x:[],y:[]};
                groups[g].x.push(idx); groups[g].y.push(isNaN(v)?null:v);
            });
            traces = Object.keys(groups).map((g,i) => ({
                x:groups[g].x, y:groups[g].y, mode:'lines', type:'scatter', name:g,
                line:{color:palette[i%palette.length]}
            }));
        } else {
            traces = [{x:dataset.map((_,i)=>i), y:dataset.map(r=>{ const v=Number(r[col]); return isNaN(v)?null:v; }),
                mode:'lines', type:'scatter', name:col, line:{color:'#10b981',width:2}}];
        }
        return { data: traces, layout: { ...baseLayout, title:{text:`Line Chart — ${col}`},
            xaxis:{title:{text:'Row Index'},gridcolor:'#e2e8f0',zerolinecolor:'#cbd5e1'}, yaxis:{title:{text:col},gridcolor:'#e2e8f0',zerolinecolor:'#cbd5e1'} } };
    }

    if (plotType === 'std-dev' || plotType === 'distribution' || plotType === 'normal') {
        const col = cols[0] || numericCols[0];
        if (!col) return null;
        const values = dataset.map(r => Number(r[col])).filter(v => !isNaN(v));
        if (values.length < 3) return null;
        const mean = calcMean(values);
        const sd = calcStdDev(values, mean);
        if (sd === 0) return null;
        const pdf = x => (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / sd, 2));
        const xMin = mean - 4 * sd, xMax = mean + 4 * sd;
        const xPts = [], yPts = [];
        const steps = 200;
        for (let i = 0; i <= steps; i++) {
            const x = xMin + i * (xMax - xMin) / steps;
            xPts.push(x);
            yPts.push(pdf(x));
        }

        // Shaded areas for 1, 2, 3 std-dev
        const x1 = [], y1 = [];
        const x2 = [], y2 = [];
        const x3 = [], y3 = [];
        for (let i = 0; i <= steps; i++) {
            const x = xPts[i], y = yPts[i];
            if (x >= mean - sd && x <= mean + sd) { x1.push(x); y1.push(y); }
            if (x >= mean - 2 * sd && x <= mean + 2 * sd) { x2.push(x); y2.push(y); }
            if (x >= mean - 3 * sd && x <= mean + 3 * sd) { x3.push(x); y3.push(y); }
        }

        const traces = [
            {
                x: [mean - 3 * sd, ...x3, mean + 3 * sd],
                y: [0, ...y3, 0],
                fill: 'tozeroy',
                type: 'scatter',
                mode: 'none',
                name: '±3σ (99.7%)',
                fillcolor: 'rgba(196, 78, 82, 0.15)'
            },
            {
                x: [mean - 2 * sd, ...x2, mean + 2 * sd],
                y: [0, ...y2, 0],
                fill: 'tozeroy',
                type: 'scatter',
                mode: 'none',
                name: '±2σ (95.4%)',
                fillcolor: 'rgba(221, 132, 82, 0.25)'
            },
            {
                x: [mean - sd, ...x1, mean + sd],
                y: [0, ...y1, 0],
                fill: 'tozeroy',
                type: 'scatter',
                mode: 'none',
                name: '±1σ (68.2%)',
                fillcolor: 'rgba(76, 114, 176, 0.35)'
            },
            {
                x: xPts,
                y: yPts,
                type: 'scatter',
                mode: 'lines',
                name: 'Normal Curve',
                line: { color: '#4c72b0', width: 2.5 }
            }
        ];

        return {
            data: traces,
            layout: {
                ...baseLayout,
                title: { text: `Normal Dist & Std Dev — ${col}` },
                xaxis: { title: { text: col }, gridcolor: '#e0e0e0', zerolinecolor: '#cbd5e1' },
                yaxis: { title: { text: 'Density' }, gridcolor: '#e0e0e0', zerolinecolor: '#cbd5e1' },
                shapes: [
                    {
                        type: 'line',
                        x0: mean,
                        y0: 0,
                        x1: mean,
                        y1: pdf(mean),
                        line: { color: '#495057', width: 1.5, dash: 'dash' }
                    }
                ]
            }
        };
    }

    return null;
}

/** @deprecated — kept for any legacy calls but no longer used for in-page rendering */
function renderPlotlyChartJS(plotType, cols, groupCol) {
    const config = buildPlotlyChartConfig(plotType, cols, groupCol);
    if (!config) { alert('Cannot build chart: insufficient data or unsupported plot type.'); return; }
    const title = `${plotType.charAt(0).toUpperCase()+plotType.slice(1)} Chart`;
    openPlotlyPopup(title, config);
}

/** @deprecated */
function createChartWrapper(title, size) {
    const div = document.createElement('div');
    div.className = `viz-chart-card ${size === 'full' ? 'viz-chart-full' : 'viz-chart-half'}`;
    div.innerHTML = `<div class="viz-chart-title">${title}</div><div class="viz-chart-canvas" style="width:100%;height:340px;"></div>`;
    return div;
}



// 1. Normal Distribution & Standard Deviation shading
function renderNormalDistributionPlot(col, layout, container) {
    const dataset = analysisState.cleanedDataset;
    const values = dataset.map(row => Number(row[col])).filter(val => !isNaN(val) && val !== null);
    if (values.length < 3) {
        container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding-top:100px;">Not enough numeric data to calculate distribution curve.</div>';
        return;
    }
    
    const mean = calcMean(values);
    const stdDev = calcStdDev(values, mean);
    
    if (stdDev === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding-top:100px;">Variance is zero. Cannot draw standard deviation curve.</div>';
        return;
    }
    
    // Normal PDF function
    const pdf = (x) => (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    
    // Generate data points
    const xPoints = [];
    const yPoints = [];
    const minX = mean - 4 * stdDev;
    const maxX = mean + 4 * stdDev;
    const steps = 150;
    const delta = (maxX - minX) / steps;
    
    for (let i = 0; i <= steps; i++) {
        const x = minX + i * delta;
        xPoints.push(x);
        yPoints.push(pdf(x));
    }
    
    // Traces for regions to shadow standard deviations
    // Region +/- 1 sigma (68.2%)
    const x1 = [], y1 = [];
    // Region +/- 2 sigma (95.4%)
    const x2 = [], y2 = [];
    // Region +/- 3 sigma (99.7%)
    const x3 = [], y3 = [];
    
    for (let i = 0; i <= steps; i++) {
        const x = xPoints[i];
        const y = yPoints[i];
        
        if (x >= mean - stdDev && x <= mean + stdDev) {
            x1.push(x); y1.push(y);
        }
        if (x >= mean - 2 * stdDev && x <= mean + 2 * stdDev) {
            x2.push(x); y2.push(y);
        }
        if (x >= mean - 3 * stdDev && x <= mean + 3 * stdDev) {
            x3.push(x); y3.push(y);
        }
    }
    
    // Setup traces
    const traces = [
        {
            x: xPoints,
            y: yPoints,
            type: 'scatter',
            mode: 'lines',
            name: 'Normal Fit',
            line: { color: '#34d399', width: 3 }
        },
        // Traces for shading
        {
            x: [mean - stdDev, ...x1, mean + stdDev],
            y: [0, ...y1, 0],
            fill: 'tozeroy',
            type: 'scatter',
            mode: 'none',
            name: '±1 Std Dev (68.2%)',
            fillcolor: 'rgba(16, 185, 129, 0.25)' // Bright green
        },
        {
            x: [mean - 2 * stdDev, ...x2, mean + 2 * stdDev],
            y: [0, ...y2, 0],
            fill: 'tozeroy',
            type: 'scatter',
            mode: 'none',
            name: '±2 Std Dev (95.4%)',
            fillcolor: 'rgba(245, 158, 11, 0.15)' // Orange/Yellow
        },
        {
            x: [mean - 3 * stdDev, ...x3, mean + 3 * stdDev],
            y: [0, ...y3, 0],
            fill: 'tozeroy',
            type: 'scatter',
            mode: 'none',
            name: '±3 Std Dev (99.7%)',
            fillcolor: 'rgba(239, 68, 68, 0.1)' // Red
        }
    ];
    
    // Sort traces so larger areas are drawn in the back
    const layeredTraces = [traces[3], traces[2], traces[1], traces[0]];
    
    const lyt = Object.assign({}, layout, {
        title: { text: `Normal Distribution — ${col}` },
        xaxis: Object.assign({}, layout.xaxis, { title: { text: col } }),
        yaxis: Object.assign({}, layout.yaxis, { title: { text: 'Probability Density' } }),
        shapes: [
            { type: 'line', x0: mean, y0: 0, x1: mean, y1: pdf(mean), line: { color: '#ffffff', width: 1.5, dash: 'dash' } },
            { type: 'line', x0: mean + stdDev, y0: 0, x1: mean + stdDev, y1: pdf(mean + stdDev), line: { color: '#a7f3d0', width: 1, dash: 'dot' } },
            { type: 'line', x0: mean - stdDev, y0: 0, x1: mean - stdDev, y1: pdf(mean - stdDev), line: { color: '#a7f3d0', width: 1, dash: 'dot' } }
        ]
    });
    Plotly.newPlot(container, layeredTraces, lyt, { responsive: true, displayModeBar: false });
}

// 2. Box Plot
function renderBoxPlot(col, groupCol, container, layout) {
    const dataset = analysisState.cleanedDataset;
    const lyt = Object.assign({}, layout, {
        title: { text: `Box & Whisker — ${col}` },
        yaxis: Object.assign({}, layout.yaxis, { title: { text: col } })
    });

    let traces;
    if (groupCol && analysisState.columns.includes(groupCol)) {
        const groups = {};
        dataset.forEach(row => {
            const g = String(row[groupCol] ?? 'N/A');
            const v = Number(row[col]);
            if (!isNaN(v)) { if (!groups[g]) groups[g] = []; groups[g].push(v); }
        });
        const palette = ['#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
        traces = Object.keys(groups).map((g, i) => ({
            y: groups[g], type: 'box', name: g,
            marker: { color: palette[i % palette.length] },
            boxpoints: 'suspectedoutliers'
        }));
    } else {
        const values = dataset.map(row => Number(row[col])).filter(v => !isNaN(v));
        traces = [{ y: values, type: 'box', name: col, marker: { color: '#10b981' }, boxpoints: 'suspectedoutliers', fillcolor: 'rgba(16,185,129,0.15)', line: { color: '#10b981', width: 2 } }];
    }
    Plotly.newPlot(container, traces, lyt, { responsive: true, displayModeBar: false });
}

// 3a. Heatmap wrapper (called from grid)
function renderHeatmapChart(container, layout) { renderCorrelationHeatmap(layout, container); }

// 3b. Correlation Heatmap
function renderCorrelationHeatmap(layout, container) {
    const dataset = analysisState.cleanedDataset;
    const cols = analysisState.columns;
    const numericCols = cols.filter(c => analysisState.columnTypes[c] === 'numeric');
    
    if (numericCols.length < 2) {
        container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding-top:100px;">Requires at least 2 numerical variables to compute correlation heatmap.</div>';
        return;
    }
    
    // Map numerical column values
    const columnData = {};
    numericCols.forEach(col => {
        columnData[col] = dataset.map(row => Number(row[col])).filter(val => !isNaN(val));
    });
    
    // Pearson correlation computation matrix
    const matrix = [];
    for (let i = 0; i < numericCols.length; i++) {
        const row = [];
        for (let j = 0; j < numericCols.length; j++) {
            const colA = numericCols[i];
            const colB = numericCols[j];
            
            const arrA = dataset.map(r => Number(r[colA]));
            const arrB = dataset.map(r => Number(r[colB]));
            
            // Clean pairs of (a, b) where neither is NaN/empty
            const cleanA = [], cleanB = [];
            for (let k = 0; k < arrA.length; k++) {
                if (!isNaN(arrA[k]) && !isNaN(arrB[k]) && dataset[k][colA] !== '' && dataset[k][colB] !== '') {
                    cleanA.push(arrA[k]);
                    cleanB.push(arrB[k]);
                }
            }
            
            if (cleanA.length < 2) {
                row.push(0);
                continue;
            }
            
            row.push(pearsonCorrelation(cleanA, cleanB));
        }
        matrix.push(row);
    }
    
    const trace = {
        z: matrix,
        x: numericCols,
        y: numericCols,
        type: 'heatmap',
        colorscale: [
            [0, '#ef4444'],    // Negative correlation (-1 = strong red)
            [0.5, '#0c150e'],  // No correlation (0 = dark surface bg)
            [1, '#10b981']     // Positive correlation (1 = strong green)
        ],
        zmin: -1,
        zmax: 1,
        ygap: 2,
        xgap: 2
    };
    
    layout.title = { text: 'Numerical Pearson Correlation Matrix' };
    layout.xaxis.title.text = '';
    layout.yaxis.title.text = '';
    layout.margin.b = 80;
    
    Plotly.newPlot(container, [trace], layout, { responsive: true, displayModeBar: false });
}

function pearsonCorrelation(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, v, idx) => sum + (v * y[idx]), 0);
    const sumX2 = x.reduce((sum, v) => sum + (v * v), 0);
    const sumY2 = y.reduce((sum, v) => sum + (v * v), 0);
    
    const num = (n * sumXY) - (sumX * sumY);
    const den = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
    
    if (den === 0) return 0;
    return num / den;
}

// 4. Histogram
function renderHistogram(col, groupCol, container, layout) {
    const dataset = analysisState.cleanedDataset;
    const lyt = Object.assign({}, layout, {
        title: { text: `Histogram — ${col}` },
        barmode: groupCol ? 'overlay' : undefined,
        xaxis: Object.assign({}, layout.xaxis, { title: { text: col } }),
        yaxis: Object.assign({}, layout.yaxis, { title: { text: 'Count' } })
    });

    let traces;
    if (groupCol && analysisState.columns.includes(groupCol)) {
        const groups = {};
        dataset.forEach(row => {
            const g = String(row[groupCol] ?? 'N/A');
            const v = Number(row[col]);
            if (!isNaN(v)) { if (!groups[g]) groups[g] = []; groups[g].push(v); }
        });
        const palette = ['#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
        traces = Object.keys(groups).map((g, i) => ({
            x: groups[g], type: 'histogram', name: g,
            marker: { color: palette[i % palette.length] }, opacity: 0.7
        }));
    } else {
        const values = dataset.map(row => Number(row[col])).filter(v => !isNaN(v));
        traces = [{ x: values, type: 'histogram', name: col, marker: { color: '#10b981', line: { color: '#0c150e', width: 1 } }, opacity: 0.85 }];
    }
    Plotly.newPlot(container, traces, lyt, { responsive: true, displayModeBar: false });
}

// 5. Scatter Plot
function renderScatterChart(colX, colY, groupCol, container, layout) {
    const dataset = analysisState.cleanedDataset;
    const lyt = Object.assign({}, layout, {
        title: { text: `${colX} × ${colY}` },
        xaxis: Object.assign({}, layout.xaxis, { title: { text: colX } }),
        yaxis: Object.assign({}, layout.yaxis, { title: { text: colY } })
    });
    let traces;
    if (groupCol && analysisState.columns.includes(groupCol)) {
        const groups = {};
        dataset.forEach(row => {
            const g = String(row[groupCol] ?? 'N/A');
            if (!groups[g]) groups[g] = { x: [], y: [] };
            groups[g].x.push(row[colX]);
            groups[g].y.push(Number(row[colY]));
        });
        const palette = ['#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
        traces = Object.keys(groups).map((g, i) => ({
            x: groups[g].x, y: groups[g].y, mode: 'markers', type: 'scatter', name: g,
            marker: { color: palette[i % palette.length], size: 7, line: { color: '#060b07', width: 1 } }
        }));
    } else {
        traces = [{ x: dataset.map(r => r[colX]), y: dataset.map(r => Number(r[colY])), mode: 'markers', type: 'scatter', marker: { color: '#10b981', size: 7, line: { color: '#060b07', width: 1 } } }];
    }
    Plotly.newPlot(container, traces, lyt, { responsive: true, displayModeBar: false });
}

// Legacy alias
function renderScatterPlot(colX, colY, layout, container) { renderScatterChart(colX, colY, '', container, layout); }

// 6. Bar Chart — counts of a single column (with optional group-by)
function renderBarChart(col, groupCol, container, layout) {
    const dataset = analysisState.cleanedDataset;
    const lyt = Object.assign({}, layout, {
        title: { text: `Bar Chart — ${col}` },
        xaxis: Object.assign({}, layout.xaxis, { title: { text: col } }),
        yaxis: Object.assign({}, layout.yaxis, { title: { text: 'Count' } })
    });
    const palette = ['#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
    let traces;
    if (groupCol && analysisState.columns.includes(groupCol)) {
        // Grouped bar: for each group value, count occurrences of each col category
        const groups = {};
        const categories = new Set();
        dataset.forEach(row => {
            const g = String(row[groupCol] ?? 'N/A');
            const c = String(row[col] ?? 'N/A');
            categories.add(c);
            if (!groups[g]) groups[g] = {};
            groups[g][c] = (groups[g][c] || 0) + 1;
        });
        const cats = [...categories].sort();
        traces = Object.keys(groups).map((g, i) => ({
            x: cats, y: cats.map(c => groups[g][c] || 0),
            type: 'bar', name: g, marker: { color: palette[i % palette.length] }
        }));
        lyt.barmode = 'group';
    } else {
        const counts = {};
        dataset.forEach(row => { const v = String(row[col] ?? 'N/A'); counts[v] = (counts[v] || 0) + 1; });
        const labels = Object.keys(counts).sort();
        traces = [{ x: labels, y: labels.map(l => counts[l]), type: 'bar', marker: { color: 'rgba(16,185,129,0.75)', line: { color: '#10b981', width: 1.5 } } }];
    }
    Plotly.newPlot(container, traces, lyt, { responsive: true, displayModeBar: false });
}

// 7. Line Chart — values of a single column by row index (with optional group-by)
function renderLineChart(col, groupCol, container, layout) {
    const dataset = analysisState.cleanedDataset;
    const lyt = Object.assign({}, layout, {
        title: { text: `Line Chart — ${col}` },
        xaxis: Object.assign({}, layout.xaxis, { title: { text: 'Row Index' } }),
        yaxis: Object.assign({}, layout.yaxis, { title: { text: col } })
    });
    const palette = ['#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
    let traces;
    if (groupCol && analysisState.columns.includes(groupCol)) {
        const groups = {};
        dataset.forEach((row, idx) => {
            const g = String(row[groupCol] ?? 'N/A');
            const v = Number(row[col]);
            if (!groups[g]) groups[g] = { x: [], y: [] };
            groups[g].x.push(idx);
            groups[g].y.push(isNaN(v) ? null : v);
        });
        traces = Object.keys(groups).map((g, i) => ({
            x: groups[g].x, y: groups[g].y,
            type: 'scatter', mode: 'lines+markers', name: g,
            line: { color: palette[i % palette.length], width: 2 },
            marker: { color: palette[i % palette.length], size: 5 }
        }));
    } else {
        const y = dataset.map(row => { const v = Number(row[col]); return isNaN(v) ? null : v; });
        traces = [{ x: dataset.map((_, i) => i), y, type: 'scatter', mode: 'lines+markers', line: { color: '#10b981', width: 2 }, marker: { color: '#34d399', size: 5 } }];
    }
    Plotly.newPlot(container, traces, lyt, { responsive: true, displayModeBar: false });
}

// --- Sample Datasets (Demo Mode) ---

function loadSampleDataset() {
    // Generate a demo dataset of 55 incident logs
    const demo = [];
    const departments = ["Finance", "HR", "Sales", "IT Infrastructure", "R&D", "Legal"];
    const severities = ["Low", "Medium", "High", "Critical"];
    
    for (let i = 0; i < 55; i++) {
        // Introduce duplicate explicitly
        if (i === 6) {
            demo.push(JSON.parse(JSON.stringify(demo[5])));
            continue;
        }
        
        let age = Math.round(20 + Math.random() * 45); // 20 - 65
        let salary = Math.round(30000 + Math.random() * 90000); // 30k - 120k
        let severity = severities[Math.floor(Math.random() * severities.length)];
        let dept = departments[Math.floor(Math.random() * departments.length)];
        let incidents = Math.round(Math.random() * 8); // 0 - 8 incidents
        
        // Introduce outlier age explicitly
        if (i === 10) age = 120;
        if (i === 20) incidents = 45;
        
        // Introduce some blank/invalid values
        let ageVal = String(age);
        let incidentsVal = String(incidents);
        
        if (i === 15) ageVal = ''; 
        if (i === 30) incidentsVal = 'INVALID_NUMBER';
        
        let deptVal = dept;
        if (i === 22) deptVal = "  it infrastructure  ";
        if (i === 35) deptVal = "sales";
        if (i === 42) deptVal = "SALES";
        
        demo.push({
            "User_ID": `USR-${1000 + i}`,
            "Age": ageVal,
            "Salary": String(salary),
            "Department": deptVal,
            "Severity": severity,
            "Incident_Count": incidentsVal
        });
    }
    
    const csvContent = jsonToCsv(demo);
    document.getElementById('analysis-raw-input').value = csvContent;
    parseAndLoadData(csvContent, "Sample Incident logs");
    
    alert("Sample dataset loaded! Includes outliers (e.g. Age 120, Incident_Count 45), duplicates, missing (NULL) values, inconsistent text casing, and non-numeric inputs for testing.");
}

function jsonToCsv(jsonArray) {
    const headers = Object.keys(jsonArray[0]);
    const csvRows = [headers.join(',')];
    
    jsonArray.forEach(obj => {
        const values = headers.map(hdr => {
            const val = String(obj[hdr] || '');
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        });
        csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
}

// --- Exporter Suite ---

function setupExportEvents() {
    const btnExportData = document.getElementById('btn-export-dataset');
    const btnExportReport = document.getElementById('btn-export-report');
    const btnExportPng = document.getElementById('btn-export-chart-png');
    
    if (btnExportData) {
        btnExportData.addEventListener('click', () => {
            const format = document.getElementById('export-data-format').value;
            const data = analysisState.cleanedDataset;
            if (data.length === 0) {
                alert("No dataset loaded to export.");
                return;
            }
            
            const baseName = "cleaned_dataset_" + new Date().toISOString().slice(0, 10);
            if (format === 'csv') {
                const csv = jsonToCsv(data);
                downloadFile(csv, 'text/csv;charset=utf-8;', baseName + '.csv');
            } else if (format === 'json') {
                const json = JSON.stringify(data, null, 2);
                downloadFile(json, 'application/json;charset=utf-8;', baseName + '.json');
            } else if (format === 'xlsx') {
                try {
                    const worksheet = XLSX.utils.json_to_sheet(data);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned Dataset");
                    XLSX.writeFile(workbook, baseName + '.xlsx');
                } catch (e) {
                    alert("Excel export failed: " + e.message);
                }
            }
        });
    }
    
    if (btnExportPng) {
        btnExportPng.addEventListener('click', () => {
            downloadActiveChart();
        });
    }
    
    if (btnExportReport) {
        btnExportReport.addEventListener('click', generateExecutiveReport);
    }
}

function downloadFile(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadActiveChart() {
    alert("To save the chart, please use the 'Save' floppy disk icon at the bottom-left of the Python chart window. This allows you to choose your format (PNG, PDF, SVG) and select the file location.");
}

async function generateExecutiveReport() {
    const incStats = document.getElementById('report-inc-stats').checked;
    const incChi = document.getElementById('report-inc-chi').checked;
    const incCharts = document.getElementById('report-inc-charts').checked;
    
    if (analysisState.dataset.length === 0) {
        alert("No dataset loaded to export.");
        return;
    }
    
    const btn = document.getElementById('btn-export-report');
    const origText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" style="animation: spin 1.5s linear infinite; display: inline-block;"></i> Generating Report & Graphs...`;
    if (window.lucide) if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    
    try {
        const timestamp = new Date().toLocaleString();
        const rowCount = analysisState.cleanedDataset.length;
        const colCount = analysisState.columns.length;
        
        let statsHtml = "";
        if (incStats) {
            const resStats = await window.electronAPI.runPythonAnalysis('summary_stats', analysisState.cleanedDataset, {});
            if (resStats.success) {
                const stats = JSON.parse(resStats.output);
                let trs = "";
                stats.forEach(s => {
                    trs += `
                    <tr>
                        <td><strong>${s.variable}</strong></td>
                        <td>${s.mean}</td>
                        <td>${s.median}</td>
                        <td>${s.min}</td>
                        <td>${s.max}</td>
                        <td>${s.stdDev}</td>
                        <td>${s.range}</td>
                        <td>${s.count}</td>
                    </tr>`;
                });
                statsHtml = `
                <div class="report-card">
                    <h3>Summary Statistics</h3>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Variable</th>
                                <th>Mean</th>
                                <th>Median</th>
                                <th>Min</th>
                                <th>Max</th>
                                <th>Std Dev</th>
                                <th>Range</th>
                                <th>Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trs}
                        </tbody>
                    </table>
                </div>`;
            }
        }
        
        let chiHtml = "";
        if (incChi) {
            const resChi = await window.electronAPI.runPythonAnalysis('chi_square', analysisState.cleanedDataset, { cols: analysisState.columns });
            if (resChi.success) {
                const { columns, pairs, heatmap } = JSON.parse(resChi.output);
                let headTrs = '<tr><th></th>' + columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
                let bodyTrs = heatmap.map((row, i) => {
                    let cells = `<td><strong>${columns[i]}</strong></td>` + row.map(cell => {
                        if (cell.pRaw === -1) return `<td style="color:#6c757d;text-align:center;">—</td>`;
                        const color = cell.significant ? '#10b981' : '#ef4444';
                        return `<td style="color:${color};font-weight:600;font-family:monospace;text-align:center;">${cell.value}</td>`;
                    }).join('');
                    return `<tr>${cells}</tr>`;
                }).join('');

                let pairDetailsHtml = pairs.map(p => {
                    if (p.error) return '';
                    let cTrs = p.matrix ? p.matrix.map(r => `<tr><td><strong>${r.rowLabel}</strong></td>` + r.values.map(v => `<td>${v}</td>`).join('') + '</tr>').join('') : '';
                    let cHead = p.headers ? '<tr><th>' + p.colA + ' \\ ' + p.colB + '</th>' + p.headers.map(h => `<th>${h}</th>`).join('') + '</tr>' : '';
                    return `
                    <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border-color);border-radius:6px;padding:12px;margin-top:12px;">
                        <h4 style="margin:0 0 6px 0;color:var(--primary-color);font-size:13px;">${p.colA} × ${p.colB} — <span style="color:${p.significant ? '#10b981' : '#ef4444'};">${p.significant ? 'SIGNIFICANT (p < 0.05)' : 'NOT SIGNIFICANT (p ≥ 0.05)'}</span> (p=${p.pValue}, χ²=${p.statistic}, df=${p.dof})</h4>
                        <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.4;">${p.interpretation}</p>
                        ${cHead ? `<table class="report-table contingency-table">${cHead}${cTrs}</table>` : ''}
                    </div>`;
                }).join('');

                chiHtml = `
                <div class="report-card">
                    <h3>Chi-Square Independence Test & Pairwise Matrix</h3>
                    <div style="margin-bottom:15px;overflow-x:auto;">
                        <strong>Pairwise p-Value Matrix:</strong>
                        <table class="report-table contingency-table" style="margin-top:8px;">
                            ${headTrs}
                            ${bodyTrs}
                        </table>
                    </div>
                    ${pairDetailsHtml}
                </div>`;
            }
        }
        
        let chartsHtml = "";
        if (incCharts) {
            let imgUrls = [];
            const colX = document.getElementById('plot-x-select')?.value || '';
            const resImg = await window.electronAPI.runPythonAnalysis('report_images', analysisState.cleanedDataset, { colX });
            if (resImg.success) {
                imgUrls = JSON.parse(resImg.output);
            }
            
            if (imgUrls.length > 0) {
                let plots = "";
                imgUrls.forEach(img => {
                    plots += `
                    <div class="plot-container">
                        <h4>${img.title}</h4>
                        <img src="${img.data}" />
                    </div>`;
                });
                chartsHtml = `
                <div class="report-card">
                    <h3>Embedded Plots & Visualizations</h3>
                    ${plots}
                </div>`;
            } else {
                chartsHtml = `
                <div class="report-card">
                    <h3>Visualizations</h3>
                    <p class="dim">No active chart available and no numerical variables found to generate plots.</p>
                </div>`;
            }
        }
        
        const reportContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Executive Data Analysis Report</title>
    <style>
        :root {
            --bg-color: #060b07;
            --surface-color: #0d160f;
            --border-color: #1a3221;
            --primary-color: #10b981;
            --text-color: #e2f1e6;
            --text-muted: #8ca293;
        }
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 40px 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 950px;
            margin: 0 auto;
        }
        .header {
            border-bottom: 2px solid var(--primary-color);
            padding-bottom: 20px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 {
            color: var(--primary-color);
            margin: 0;
            font-size: 28px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .header p {
            color: var(--text-muted);
            margin: 8px 0 0 0;
            font-size: 13px;
        }
        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .meta-box {
            background-color: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 15px;
            text-align: center;
        }
        .meta-box .label {
            display: block;
            font-size: 11px;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .meta-box .value {
            font-size: 20px;
            font-weight: bold;
            color: var(--primary-color);
        }
        .report-card {
            background-color: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 30px;
        }
        .report-card h3 {
            color: var(--primary-color);
            margin-top: 0;
            margin-bottom: 20px;
            border-left: 4px solid var(--primary-color);
            padding-left: 10px;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 15px;
        }
        .report-table th, .report-table td {
            border: 1px solid var(--border-color);
            padding: 10px 12px;
            text-align: left;
        }
        .report-table th {
            background-color: rgba(16, 185, 129, 0.1);
            color: var(--primary-color);
            font-weight: 600;
        }
        .report-table tbody tr:nth-child(even) {
            background-color: rgba(255, 255, 255, 0.02);
        }
        .contingency-table {
            text-align: center;
        }
        .dim {
            color: var(--text-muted);
            font-size: 13px;
        }
        .plot-container {
            text-align: center; 
            margin-top: 25px; 
            border-bottom: 1px solid var(--border-color); 
            padding-bottom: 25px;
        }
        .plot-container h4 {
            color: var(--primary-color);
            margin-bottom: 12px;
            font-size: 15px;
            text-transform: uppercase;
        }
        .plot-container img {
            max-width: 100%; 
            border-radius: 6px; 
            border: 1px solid var(--border-color);
        }
        @media print {
            body {
                background-color: #ffffff;
                color: #000000;
                padding: 0;
            }
            .report-card {
                border: 1px solid #ddd;
                background-color: #fff;
                page-break-inside: avoid;
            }
            .report-table th {
                background-color: #f1f5f9;
                color: #000;
            }
            .header h1, .report-card h3, .plot-container h4 {
                color: #047857;
            }
            .plot-container img {
                border: 1px solid #ddd;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Executive Data Analysis & Report</h1>
            <p>Generated by MHZTools | ${timestamp}</p>
        </div>
        
        <div class="metadata-grid">
            <div class="meta-box">
                <span class="label">Total Records Analyzed</span>
                <span class="value">${rowCount}</span>
            </div>
            <div class="meta-box">
                <span class="label">Variables Analyzed</span>
                <span class="value">${colCount}</span>
            </div>
            <div class="meta-box">
                <span class="label">Missing Imputed</span>
                <span class="value">${document.getElementById('meta-missing-vals').textContent}</span>
            </div>
        </div>
        
        ${statsHtml}
        ${chiHtml}
        ${chartsHtml}
    </div>
</body>
</html>`;
        
        // 1. Trigger local download of report HTML file
        downloadFile(reportContent, 'text/html;charset=utf-8;', "analysis_executive_report_" + new Date().toISOString().slice(0, 10) + ".html");

        // 2. Immediately open the generated report in a standalone pop-up window
        const reportPopUp = window.open('', '_blank', 'width=1050,height=850,scrollbars=yes,resizable=yes');
        if (reportPopUp) {
            reportPopUp.document.write(reportContent);
            reportPopUp.document.close();
        }
    } catch (err) {
        alert("Failed to generate report: " + err.message);
    } finally {
        btn.innerHTML = origText;
        if (window.lucide) if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    }
}


// =====================================================================
// PURE JAVASCRIPT ANALYTICS & PLOTTING FALLBACK ENGINE
// Ensures 100% functionality on fresh devices without Python installed
// =====================================================================

function runSummaryStatsJS(dataset) {
    let results = [];
    if (!dataset || dataset.length === 0) return results;
    const cols = analysisState.columns || Object.keys(dataset[0] || {});
    cols.forEach(col => {
        let nums = dataset.map(r => Number(r[col])).filter(v => !isNaN(v) && v !== null);
        if (nums.length > 0 && nums.length / dataset.length >= 0.5) {
            nums.sort((a, b) => a - b);
            let sum = nums.reduce((a, b) => a + b, 0);
            let mean = sum / nums.length;
            let median = nums.length % 2 === 0 ? (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2 : nums[Math.floor(nums.length / 2)];
            let min = nums[0];
            let max = nums[nums.length - 1];
            let stdDev = 0;
            if (nums.length > 1) {
                let variance = nums.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (nums.length - 1);
                stdDev = Math.sqrt(variance);
            }
            results.push({
                variable: col,
                mean: mean.toFixed(3),
                median: median.toFixed(3),
                min: min.toFixed(3),
                max: max.toFixed(3),
                stdDev: stdDev.toFixed(3),
                range: (max - min).toFixed(3),
                count: nums.length
            });
        }
    });
    return results;
}

function runDataCleaningJS(dataset, action, params) {
    if (!dataset) return [];
    let cleaned = JSON.parse(JSON.stringify(dataset));
    if (action === 'remove_duplicates') {
        let seen = new Set();
        cleaned = cleaned.filter(row => {
            let key = JSON.stringify(row);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    } else if (action === 'fill_missing') {
        const method = (params && params.method) ? params.method : 'mean';
        const cols = analysisState.columns || Object.keys(cleaned[0] || {});
        cols.forEach(col => {
            let nums = cleaned.map(r => Number(r[col])).filter(v => !isNaN(v));
            let fillVal = '0';
            if (nums.length > 0) {
                if (method === 'mean') fillVal = (nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(2);
                else if (method === 'median') {
                    nums.sort((a,b)=>a-b);
                    fillVal = nums[Math.floor(nums.length/2)].toFixed(2);
                }
            }
            cleaned.forEach(row => {
                if (row[col] === undefined || row[col] === null || String(row[col]).trim() === '') {
                    row[col] = fillVal;
                }
            });
        });
    } else if (action === 'remove_invalid') {
        cleaned = cleaned.filter(row => {
            return Object.values(row).some(v => v !== undefined && v !== null && String(v).trim() !== '');
        });
    }
    return cleaned;
}

function calcPearsonCorrJS(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += x[i]; sumY += y[i];
        sumXY += x[i] * y[i];
        sumX2 += x[i] * x[i]; sumY2 += y[i] * y[i];
    }
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return den === 0 ? 0 : Number((num / den).toFixed(3));
}

function renderPlotlyChartJS(plotType, selectedCols, groupCol) {
    const grid = document.getElementById('viz-charts-grid');
    if (!grid) return;
    grid.innerHTML = '<div id="plotly-canvas" style="width:100%; height:460px; background:var(--bg-surface); border-radius:8px; padding:10px;"></div>';

    const dataset = analysisState.cleanedDataset;
    if (!dataset || dataset.length === 0) return;

    const canvas = document.getElementById('plotly-canvas');
    if (typeof Plotly === 'undefined') return;

    if (plotType === 'heatmap') {
        const numericCols = selectedCols.length >= 2 ? selectedCols : (analysisState.columns || []).filter(c => analysisState.columnTypes[c] === 'numeric');
        if (numericCols.length < 2) {
            canvas.innerHTML = '<div style="text-align:center; padding-top:150px; color:var(--text-muted);">Correlation heatmap requires at least 2 numeric columns.</div>';
            return;
        }
        let z = [];
        for (let i = 0; i < numericCols.length; i++) {
            let row = [];
            let valsI = dataset.map(r => Number(r[numericCols[i]])).filter(v => !isNaN(v));
            for (let j = 0; j < numericCols.length; j++) {
                let valsJ = dataset.map(r => Number(r[numericCols[j]])).filter(v => !isNaN(v));
                row.push(calcPearsonCorrJS(valsI, valsJ));
            }
            z.push(row);
        }
        Plotly.newPlot(canvas, [{
            z: z, x: numericCols, y: numericCols, type: 'heatmap', colorscale: 'YlGnBu'
        }], {
            title: 'Pearson Correlation Heatmap',
            margin: { t: 40, b: 40, l: 60, r: 40 }
        });
    } else if (plotType === 'scatter') {
        const cx = selectedCols[0] || analysisState.columns[0];
        const cy = selectedCols[1] || analysisState.columns[1];
        const xVals = dataset.map(r => Number(r[cx]));
        const yVals = dataset.map(r => Number(r[cy]));
        Plotly.newPlot(canvas, [{
            x: xVals, y: yVals, mode: 'markers', type: 'scatter',
            marker: { color: '#059669', size: 8, opacity: 0.7 }
        }], {
            title: `Scatter Plot — ${cx} vs ${cy}`,
            xaxis: { title: cx }, yaxis: { title: cy }
        });
    } else if (plotType === 'histogram' || plotType === 'std-dev') {
        const colsToPlot = selectedCols.length > 0 ? selectedCols : [analysisState.columns[0]];
        const traces = colsToPlot.map(c => ({
            x: dataset.map(r => Number(r[c])).filter(v => !isNaN(v)),
            type: 'histogram', name: c, opacity: 0.6
        }));
        Plotly.newPlot(canvas, traces, { title: 'Histogram Distribution', barmode: 'overlay' });
    } else if (plotType === 'boxplot') {
        const colsToPlot = selectedCols.length > 0 ? selectedCols : (analysisState.columns || []).filter(c => analysisState.columnTypes[c] === 'numeric');
        const traces = colsToPlot.map(c => ({
            y: dataset.map(r => Number(r[c])).filter(v => !isNaN(v)),
            type: 'box', name: c
        }));
        Plotly.newPlot(canvas, traces, { title: 'Box Plot Distribution' });
    } else if (plotType === 'line') {
        const colsToPlot = selectedCols.length > 0 ? selectedCols : [analysisState.columns[0]];
        const traces = colsToPlot.map(c => ({
            y: dataset.map(r => Number(r[c])).filter(v => !isNaN(v)),
            type: 'scatter', mode: 'lines+markers', name: c
        }));
        Plotly.newPlot(canvas, traces, { title: 'Line Graph' });
    } else if (plotType === 'bar') {
        const col = selectedCols[0] || analysisState.columns[0];
        let counts = {};
        dataset.forEach(r => {
            let val = String(r[col] || 'Missing');
            counts[val] = (counts[val] || 0) + 1;
        });
        Plotly.newPlot(canvas, [{
            x: Object.keys(counts), y: Object.values(counts), type: 'bar', marker: { color: '#f59e0b' }
        }], { title: `Bar Chart — ${col}` });
    }
}
