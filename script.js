let csvData = [];
        let headers = [];
        let charts = {};
        let workbook = null;
        let currentSheet = null;
        let fileType = null;

        // Navigation
        function showPage(pageId) {
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            document.getElementById(pageId).classList.add('active');
            
            event.target.classList.add('active');
        }

        // File upload handling
        const uploadArea = document.getElementById('uploadArea');

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                const extension = file.name.split('.').pop().toLowerCase();
                if (extension === 'csv') {
                    processFile(file, 'csv');
                } else if (extension === 'xlsx' || extension === 'xls') {
                    processFile(file, 'excel');
                } else {
                    showError('Please upload a CSV or Excel file.');
                }
            }
        });

        function handleFile(event, type) {
            const file = event.target.files[0];
            if (file) {
                processFile(file, type);
            }
        }

        function processFile(file, type) {
            fileType = type;
            
            if (type === 'csv') {
                processCsvFile(file);
            } else if (type === 'excel') {
                processExcelFile(file);
            }
        }

        function processCsvFile(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const csv = e.target.result;
                Papa.parse(csv, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    delimitersToGuess: [',', '\t', '|', ';'],
                    complete: function(results) {
                        if (results.errors.length > 0) {
                            showError('Error parsing CSV: ' + results.errors[0].message);
                            return;
                        }
                        
                        csvData = results.data;
                        headers = results.meta.fields.map(h => h.trim());
                        
                        showSuccess(`CSV file uploaded successfully! ${csvData.length} rows and ${headers.length} columns loaded.`);
                        generateAllAnalysis();
                    }
                });
            };
            reader.readAsText(file);
        }

        function processExcelFile(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    workbook = XLSX.read(e.target.result, { type: 'binary' });
                    const sheetNames = workbook.SheetNames;
                    
                    if (sheetNames.length > 1) {
                        showSheetSelector(sheetNames);
                    } else {
                        loadExcelSheet(sheetNames[0]);
                    }
                } catch (error) {
                    showError('Error reading Excel file: ' + error.message);
                }
            };
            reader.readAsBinaryString(file);
        }

        function showSheetSelector(sheetNames) {
            const selector = document.getElementById('sheetSelector');
            selector.style.display = 'block';
            selector.innerHTML = `
                <h3>Select Sheet to Analyze:</h3>
                <div class="filter-grid">
                    ${sheetNames.map(name => `
                        <button class="upload-btn" onclick="loadExcelSheet('${name}')">${name}</button>
                    `).join('')}
                </div>
            `;
        }

        function loadExcelSheet(sheetName) {
            currentSheet = sheetName;
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1, 
                defval: null,
                raw: false
            });
            
            if (jsonData.length === 0) {
                showError('Selected sheet is empty.');
                return;
            }
            
            headers = jsonData[0].map(h => String(h).trim()).filter(h => h);
            csvData = jsonData.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] !== undefined ? row[index] : null;
                });
                return obj;
            }).filter(row => Object.values(row).some(val => val !== null && val !== ''));
            
            // Clean and convert data types
            csvData = csvData.map(row => {
                const cleanRow = {};
                headers.forEach(header => {
                    let value = row[header];
                    if (value !== null && value !== '') {
                        // Try to convert to number if possible
                        const numValue = Number(value);
                        if (!isNaN(numValue) && isFinite(numValue)) {
                            cleanRow[header] = numValue;
                        } else {
                            cleanRow[header] = String(value).trim();
                        }
                    } else {
                        cleanRow[header] = null;
                    }
                });
                return cleanRow;
            });

            document.getElementById('sheetSelector').style.display = 'none';
            showSuccess(`Excel sheet "${sheetName}" loaded successfully! ${csvData.length} rows and ${headers.length} columns processed.`);
            generateAllAnalysis();
        }

        function showError(message) {
            document.getElementById('uploadStatus').innerHTML = `
                <div class="error-message">❌ ${message}</div>
            `;
        }

        function showSuccess(message) {
            document.getElementById('uploadStatus').innerHTML = `
                <div class="success-message">✅ ${message}</div>
            `;
        }

        function generateAllAnalysis() {
            generateOverview();
            generateCharts();
            generateTable();
            generateAnalytics();
            generateInsights();
        }

        function generateOverview() {
            const numericColumns = headers.filter(header => 
                csvData.some(row => typeof row[header] === 'number' && !isNaN(row[header]))
            );

            const textColumns = headers.filter(header => 
                !numericColumns.includes(header)
            );

            const stats = {
                totalRows: csvData.length,
                totalColumns: headers.length,
                numericColumns: numericColumns.length,
                textColumns: textColumns.length,
                missingValues: headers.reduce((sum, header) => 
                    sum + csvData.filter(row => row[header] === null || row[header] === '' || row[header] === undefined).length, 0
                ),
                duplicateRows: csvData.length - new Set(csvData.map(row => JSON.stringify(row))).size,
                completeness: Math.round((1 - (headers.reduce((sum, header) => 
                    sum + csvData.filter(row => row[header] === null || row[header] === '' || row[header] === undefined).length, 0
                ) / (csvData.length * headers.length))) * 100)
            };

            document.getElementById('overviewContent').innerHTML = `
                <h2>Data Overview ${currentSheet ? `- Sheet: ${currentSheet}` : ''}</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalRows.toLocaleString()}</div>
                        <div class="stat-label">Total Rows</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalColumns}</div>
                        <div class="stat-label">Total Columns</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.numericColumns}</div>
                        <div class="stat-label">Numeric Columns</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.textColumns}</div>
                        <div class="stat-label">Text Columns</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.missingValues.toLocaleString()}</div>
                        <div class="stat-label">Missing Values</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.duplicateRows}</div>
                        <div class="stat-label">Duplicate Rows</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.completeness}%</div>
                        <div class="stat-label">Data Completeness</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${fileType.toUpperCase()}</div>
                        <div class="stat-label">File Type</div>
                    </div>
                </div>
                
                <h3>Column Detailed Analysis</h3>
                <div class="chart-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Column Name</th>
                                <th>Data Type</th>
                                <th>Unique Values</th>
                                <th>Missing Values</th>
                                <th>Completeness</th>
                                <th>Sample Values</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${headers.map(header => {
                                const values = csvData.map(row => row[header]).filter(val => val !== null && val !== '' && val !== undefined);
                                const uniqueValues = new Set(values).size;
                                const missingCount = csvData.length - values.length;
                                const completeness = Math.round((values.length / csvData.length) * 100);
                                const dataType = values.length > 0 ? (typeof values[0] === 'number' ? 'Number' : 'Text') : 'Unknown';
                                const sampleValues = [...new Set(values)].slice(0, 3).join(', ');
                                
                                return `
                                    <tr>
                                        <td><strong>${header}</strong></td>
                                        <td>${dataType}</td>
                                        <td>${uniqueValues.toLocaleString()}</td>
                                        <td>${missingCount}</td>
                                        <td>${completeness}%</td>
                                        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${sampleValues}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        function generateCharts() {
            const numericColumns = headers.filter(header => 
                csvData.some(row => typeof row[header] === 'number' && !isNaN(row[header]))
            );

            if (numericColumns.length === 0) {
                document.getElementById('chartsContent').innerHTML = `
                    <div class="no-data">No numeric columns found for visualization</div>
                `;
                return;
            }

            let chartsHtml = '<h2>Data Visualizations</h2>';
            
            // Distribution chart
            chartsHtml += `
                <div class="chart-container">
                    <h3>${numericColumns[0]} - Distribution Analysis</h3>
                    <canvas id="distributionChart" width="400" height="200"></canvas>
                </div>
            `;

            // Multi-line trend chart
            if (numericColumns.length > 1) {
                chartsHtml += `
                    <div class="chart-container">
                        <h3>Multi-Variable Trends</h3>
                        <canvas id="trendChart" width="400" height="200"></canvas>
                    </div>
                `;
            }

            // Correlation heatmap visualization
            if (numericColumns.length >= 2) {
                chartsHtml += `
                    <div class="chart-container">
                        <h3>Correlation Analysis</h3>
                        <canvas id="correlationChart" width="400" height="200"></canvas>
                    </div>
                `;
            }

            document.getElementById('chartsContent').innerHTML = chartsHtml;

            // Generate charts
            setTimeout(() => {
                createDistributionChart(numericColumns[0]);
                if (numericColumns.length > 1) {
                    createTrendChart(numericColumns);
                }
                if (numericColumns.length >= 2) {
                    createCorrelationChart(numericColumns);
                }
            }, 100);
        }

        function createDistributionChart(column) {
            const ctx = document.getElementById('distributionChart')?.getContext('2d');
            if (!ctx) return;

            const values = csvData.map(row => row[column]).filter(val => typeof val === 'number' && !isNaN(val));
            const bins = 20;
            const min = Math.min(...values);
            const max = Math.max(...values);
            const binSize = (max - min) / bins;
            
            const histogram = new Array(bins).fill(0);
            const labels = [];
            
            for (let i = 0; i < bins; i++) {
                const binStart = min + i * binSize;
                const binEnd = min + (i + 1) * binSize;
                labels.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
                
                histogram[i] = values.filter(val => val >= binStart && val < binEnd).length;
            }

            charts.distributionChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: `${column} Distribution`,
                        data: histogram,
                        backgroundColor: 'rgba(102, 126, 234, 0.7)',
                        borderColor: 'rgba(102, 126, 234, 1)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Frequency'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: column
                            }
                        }
                    }
                }
            });
        }

        function createTrendChart(numericColumns) {
            const ctx = document.getElementById('trendChart')?.getContext('2d');
            if (!ctx) return;

            const colors = [
                'rgba(102, 126, 234, 1)',
                'rgba(118, 75, 162, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)'
            ];

            const sampleSize = Math.min(50, csvData.length);
            const sampleData = csvData.slice(0, sampleSize);

            charts.trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sampleData.map((_, i) => `Point ${i + 1}`),
                    datasets: numericColumns.slice(0, 5).map((col, index) => ({
                        label: col,
                        data: sampleData.map(row => row[col]),
                        borderColor: colors[index],
                        backgroundColor: colors[index].replace('1)', '0.1)'),
                        tension: 0.4,
                        fill: false
                    }))
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: 'Values'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        }

        function createCorrelationChart(numericColumns) {
            const ctx = document.getElementById('correlationChart')?.getContext('2d');
            if (!ctx) return;

            // Calculate correlation matrix
            const correlations = [];
            for (let i = 0; i < Math.min(numericColumns.length, 5); i++) {
                for (let j = 0; j < Math.min(numericColumns.length, 5); j++) {
                    const col1 = numericColumns[i];
                    const col2 = numericColumns[j];
                    const corr = calculateCorrelation(col1, col2);
                    correlations.push({
                        x: i,
                        y: j,
                        v: corr
                    });
                }
            }

            // Create a simple scatter plot to represent correlation
            const values1 = csvData.map(row => row[numericColumns[0]]).filter(val => typeof val === 'number');
            const values2 = csvData.map(row => row[numericColumns[1]]).filter(val => typeof val === 'number');
            const scatterData = values1.slice(0, 100).map((val, i) => ({
                x: val,
                y: values2[i] || 0
            }));

            charts.correlationChart = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: `${numericColumns[0]} vs ${numericColumns[1]}`,
                        data: scatterData,
                        backgroundColor: 'rgba(102, 126, 234, 0.6)',
                        borderColor: 'rgba(102, 126, 234, 1)',
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: numericColumns[0]
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: numericColumns[1]
                            }
                        }
                    }
                }
            });
        }

        function calculateCorrelation(col1, col2) {
            const values1 = csvData.map(row => row[col1]).filter(val => typeof val === 'number');
            const values2 = csvData.map(row => row[col2]).filter(val => typeof val === 'number');
            
            if (values1.length !== values2.length || values1.length === 0) return 0;
            
            const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
            const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;
            
            let numerator = 0;
            let sum1 = 0;
            let sum2 = 0;
            
            for (let i = 0; i < values1.length; i++) {
                const diff1 = values1[i] - mean1;
                const diff2 = values2[i] - mean2;
                numerator += diff1 * diff2;
                sum1 += diff1 * diff1;
                sum2 += diff2 * diff2;
            }
            
            const denominator = Math.sqrt(sum1 * sum2);
            return denominator === 0 ? 0 : numerator / denominator;
        }

        function generateTable() {
            const maxRows = 100;
            const displayData = csvData.slice(0, maxRows);
            
            document.getElementById('tableContent').innerHTML = `
                <h2>Interactive Data Table</h2>
                <div class="filter-section">
                    <h3>Filters & Search</h3>
                    <div class="filter-grid">
                        <div class="filter-group">
                            <label>Global Search:</label>
                            <input type="text" id="searchInput" placeholder="Search across all columns..." onkeyup="filterTable()">
                        </div>
                        <div class="filter-group">
                            <label>Column Filter:</label>
                            <select id="columnFilter" onchange="filterTable()">
                                <option value="">All Columns</option>
                                ${headers.map(header => `<option value="${header}">${header}</option>`).join('')}
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Sort by:</label>
                            <select id="sortColumn" onchange="sortTable()">
                                <option value="">No Sorting</option>
                                ${headers.map(header => `<option value="${header}">${header}</option>`).join('')}
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Sort Order:</label>
                            <select id="sortOrder" onchange="sortTable()">
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="chart-container">
                    <p>Showing <span id="rowCount">${Math.min(maxRows, csvData.length)}</span> of ${csvData.length} rows</p>
                    <div style="overflow-x: auto;">
                        <table class="data-table" id="dataTable">
                            <thead>
                                <tr>
                                    ${headers.map(header => `<th style="min-width: 120px;">${header}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody id="tableBody">
                                ${displayData.map(row => `
                                    <tr>
                                        ${headers.map(header => `<td>${row[header] !== null && row[header] !== undefined ? row[header] : ''}</td>`).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="export-section">
                    <button class="export-btn" onclick="exportData('csv')">📥 Export as CSV</button>
                    <button class="export-btn" onclick="exportData('json')">📥 Export as JSON</button>
                    <button class="export-btn" onclick="exportData('excel')">📥 Export as Excel</button>
                </div>
            `;
        }

        function filterTable() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const columnFilter = document.getElementById('columnFilter').value;
            
            let filteredData = csvData;
            
            if (searchTerm) {
                filteredData = filteredData.filter(row => {
                    if (columnFilter) {
                        return String(row[columnFilter] || '').toLowerCase().includes(searchTerm);
                    } else {
                        return headers.some(header => 
                            String(row[header] || '').toLowerCase().includes(searchTerm)
                        );
                    }
                });
            }
            
            updateTableDisplay(filteredData);
        }

        function sortTable() {
            const sortColumn = document.getElementById('sortColumn').value;
            const sortOrder = document.getElementById('sortOrder').value;
            
            if (!sortColumn) {
                updateTableDisplay(csvData);
                return;
            }
            
            const sortedData = [...csvData].sort((a, b) => {
                let aVal = a[sortColumn];
                let bVal = b[sortColumn];
                
                // Handle null/undefined values
                if (aVal === null || aVal === undefined) aVal = '';
                if (bVal === null || bVal === undefined) bVal = '';
                
                // Convert to numbers if both are numeric
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
                }
                
                // String comparison
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
                
                if (sortOrder === 'asc') {
                    return aVal.localeCompare(bVal);
                } else {
                    return bVal.localeCompare(aVal);
                }
            });
            
            updateTableDisplay(sortedData);
        }

        function updateTableDisplay(data) {
            const tableBody = document.getElementById('tableBody');
            const rowCount = document.getElementById('rowCount');
            
            const displayData = data.slice(0, 100);
            rowCount.textContent = displayData.length;
            
            tableBody.innerHTML = displayData.map(row => `
                <tr>
                    ${headers.map(header => `<td>${row[header] !== null && row[header] !== undefined ? row[header] : ''}</td>`).join('')}
                </tr>
            `).join('');
        }

        function generateAnalytics() {
            const numericColumns = headers.filter(header => 
                csvData.some(row => typeof row[header] === 'number' && !isNaN(row[header]))
            );

            if (numericColumns.length === 0) {
                document.getElementById('analyticsContent').innerHTML = `
                    <div class="no-data">No numeric data available for statistical analysis</div>
                `;
                return;
            }

            // Calculate comprehensive statistics
            const analytics = numericColumns.map(column => {
                const values = csvData.map(row => row[column]).filter(val => typeof val === 'number' && !isNaN(val));
                const sorted = [...values].sort((a, b) => a - b);
                const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
                const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
                const std = Math.sqrt(variance);
                
                // Detect outliers using IQR method
                const q1 = sorted[Math.floor(sorted.length * 0.25)];
                const q3 = sorted[Math.floor(sorted.length * 0.75)];
                const iqr = q3 - q1;
                const outliers = values.filter(val => val < (q1 - 1.5 * iqr) || val > (q3 + 1.5 * iqr));
                
                return {
                    column,
                    count: values.length,
                    mean: mean,
                    median: sorted[Math.floor(sorted.length / 2)],
                    mode: getMostFrequent(values),
                    min: Math.min(...values),
                    max: Math.max(...values),
                    std: std,
                    variance: variance,
                    q1: q1,
                    q3: q3,
                    iqr: iqr,
                    outliers: outliers.length,
                    skewness: calculateSkewness(values, mean, std),
                    kurtosis: calculateKurtosis(values, mean, std)
                };
            });

            // Calculate correlation matrix
            const correlationMatrix = [];
            for (let i = 0; i < numericColumns.length; i++) {
                const row = [];
                for (let j = 0; j < numericColumns.length; j++) {
                    const corr = calculateCorrelation(numericColumns[i], numericColumns[j]);
                    row.push(corr);
                }
                correlationMatrix.push(row);
            }

            document.getElementById('analyticsContent').innerHTML = `
                <h2>Advanced Statistical Analysis</h2>
                
                <div class="analysis-section">
                    <h3>Descriptive Statistics</h3>
                    <div class="chart-container">
                        <div style="overflow-x: auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Column</th>
                                        <th>Count</th>
                                        <th>Mean</th>
                                        <th>Median</th>
                                        <th>Mode</th>
                                        <th>Std Dev</th>
                                        <th>Min</th>
                                        <th>Max</th>
                                        <th>Q1</th>
                                        <th>Q3</th>
                                        <th>IQR</th>
                                        <th>Outliers</th>
                                        <th>Skewness</th>
                                        <th>Kurtosis</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${analytics.map(stat => `
                                        <tr>
                                            <td><strong>${stat.column}</strong></td>
                                            <td>${stat.count}</td>
                                            <td>${stat.mean.toFixed(3)}</td>
                                            <td>${stat.median.toFixed(3)}</td>
                                            <td>${stat.mode.toFixed(3)}</td>
                                            <td>${stat.std.toFixed(3)}</td>
                                            <td>${stat.min.toFixed(3)}</td>
                                            <td>${stat.max.toFixed(3)}</td>
                                            <td>${stat.q1?.toFixed(3) || 'N/A'}</td>
                                            <td>${stat.q3?.toFixed(3) || 'N/A'}</td>
                                            <td>${stat.iqr?.toFixed(3) || 'N/A'}</td>
                                            <td>${stat.outliers}</td>
                                            <td>${stat.skewness.toFixed(3)}</td>
                                            <td>${stat.kurtosis.toFixed(3)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                ${numericColumns.length > 1 ? `
                <div class="analysis-section">
                    <h3>Correlation Matrix</h3>
                    <div class="chart-container">
                        <table class="data-table correlation-matrix">
                            <thead>
                                <tr>
                                    <th>Variables</th>
                                    ${numericColumns.map(col => `<th>${col}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${numericColumns.map((col, i) => `
                                    <tr>
                                        <td><strong>${col}</strong></td>
                                        ${correlationMatrix[i].map(corr => {
                                            const absCorr = Math.abs(corr);
                                            const className = absCorr > 0.7 ? 'correlation-high' : 
                                                            absCorr > 0.3 ? 'correlation-medium' : 'correlation-low';
                                            return `<td class="${className}">${corr.toFixed(3)}</td>`;
                                        }).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                ` : ''}

                <div class="analysis-section">
                    <h3>Data Quality Assessment</h3>
                    <div class="analysis-grid">
                        <div class="chart-container">
                            <h4>Completeness by Column</h4>
                            <table class="data-table">
                                <thead>
                                    <tr><th>Column</th><th>Completeness</th><th>Missing</th></tr>
                                </thead>
                                <tbody>
                                    ${headers.map(header => {
                                        const missing = csvData.filter(row => row[header] === null || row[header] === '' || row[header] === undefined).length;
                                        const completeness = Math.round(((csvData.length - missing) / csvData.length) * 100);
                                        return `
                                            <tr>
                                                <td>${header}</td>
                                                <td>${completeness}%</td>
                                                <td>${missing}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="chart-container">
                            <h4>Data Distribution Summary</h4>
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-number">${analytics.filter(a => Math.abs(a.skewness) < 0.5).length}</div>
                                    <div class="stat-label">Normal Distributions</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-number">${analytics.filter(a => a.outliers > 0).length}</div>
                                    <div class="stat-label">Columns with Outliers</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-number">${analytics.reduce((sum, a) => sum + a.outliers, 0)}</div>
                                    <div class="stat-label">Total Outliers</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function getMostFrequent(values) {
            const frequency = {};
            values.forEach(val => {
                frequency[val] = (frequency[val] || 0) + 1;
            });
            
            let maxCount = 0;
            let mode = values[0];
            
            for (const [val, count] of Object.entries(frequency)) {
                if (count > maxCount) {
                    maxCount = count;
                    mode = parseFloat(val);
                }
            }
            
            return mode;
        }

        function calculateSkewness(values, mean, std) {
            if (std === 0) return 0;
            const n = values.length;
            const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / std, 3), 0);
            return (n / ((n - 1) * (n - 2))) * sum;
        }

        function calculateKurtosis(values, mean, std) {
            if (std === 0) return 0;
            const n = values.length;
            const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / std, 4), 0);
            return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
        }

        function generateInsights() {
            const numericColumns = headers.filter(header => 
                csvData.some(row => typeof row[header] === 'number' && !isNaN(row[header]))
            );

            if (numericColumns.length === 0) {
                document.getElementById('insightsContent').innerHTML = `
                    <div class="no-data">No numeric data available for AI insights generation</div>
                `;
                return;
            }

            // Generate automated insights
            const insights = [];
            
            // Data quality insights
            const totalCells = csvData.length * headers.length;
            const missingCells = headers.reduce((sum, header) => 
                sum + csvData.filter(row => row[header] === null || row[header] === '' || row[header] === undefined).length, 0
            );
            const completeness = ((totalCells - missingCells) / totalCells) * 100;
            
            if (completeness < 90) {
                insights.push({
                    type: 'warning',
                    title: 'Data Quality Issue',
                    message: `Your dataset has ${completeness.toFixed(1)}% completeness. Consider cleaning missing values for better analysis.`
                });
            }

            // Outlier insights
            numericColumns.forEach(column => {
                const values = csvData.map(row => row[column]).filter(val => typeof val === 'number' && !isNaN(val));
                const sorted = [...values].sort((a, b) => a - b);
                const q1 = sorted[Math.floor(sorted.length * 0.25)];
                const q3 = sorted[Math.floor(sorted.length * 0.75)];
                const iqr = q3 - q1;
                const outliers = values.filter(val => val < (q1 - 1.5 * iqr) || val > (q3 + 1.5 * iqr));
                
                if (outliers.length > values.length * 0.05) {
                    insights.push({
                        type: 'info',
                        title: 'Outliers Detected',
                        message: `Column "${column}" has ${outliers.length} outliers (${((outliers.length/values.length)*100).toFixed(1)}% of data). Consider investigating these values.`
                    });
                }
            });

            // Correlation insights
            if (numericColumns.length > 1) {
                for (let i = 0; i < numericColumns.length; i++) {
                    for (let j = i + 1; j < numericColumns.length; j++) {
                        const corr = calculateCorrelation(numericColumns[i], numericColumns[j]);
                        if (Math.abs(corr) > 0.7) {
                            insights.push({
                                type: 'success',
                                title: 'Strong Correlation Found',
                                message: `Strong ${corr > 0 ? 'positive' : 'negative'} correlation (${corr.toFixed(3)}) between "${numericColumns[i]}" and "${numericColumns[j]}".`
                            });
                        }
                    }
                }
            }

            // Distribution insights
            numericColumns.forEach(column => {
                const values = csvData.map(row => row[column]).filter(val => typeof val === 'number' && !isNaN(val));
                const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
                const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
                const skewness = calculateSkewness(values, mean, std);
                
                if (Math.abs(skewness) > 1) {
                    insights.push({
                        type: 'info',
                        title: 'Skewed Distribution',
                        message: `Column "${column}" shows ${skewness > 0 ? 'right' : 'left'} skewness (${skewness.toFixed(3)}). Consider data transformation.`
                    });
                }
            });

            // Recommendations
            const recommendations = [
                "Consider creating visualizations for your most important numeric columns",
                "Check for data entry errors in columns with many outliers",
                "Use correlation analysis to identify relationships between variables",
                "Apply appropriate statistical tests based on your data distribution",
                "Consider feature engineering for machine learning applications"
            ];

            document.getElementById('insightsContent').innerHTML = `
                <h2>🤖 AI-Powered Data Insights</h2>
                
                <div class="analysis-section">
                    <h3>Automated Insights</h3>
                    <div class="analysis-grid">
                        ${insights.length > 0 ? insights.map(insight => `
                            <div class="chart-container">
                                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                    <span style="font-size: 20px; margin-right: 10px;">
                                        ${insight.type === 'warning' ? '⚠️' : insight.type === 'success' ? '✅' : 'ℹ️'}
                                    </span>
                                    <h4>${insight.title}</h4>
                                </div>
                                <p>${insight.message}</p>
                            </div>
                        `).join('') : '<div class="chart-container"><p>No specific insights detected. Your data appears to be well-structured!</p></div>'}
                    </div>
                </div>

                <div class="analysis-section">
                    <h3>📊 Data Summary</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-number">${csvData.length.toLocaleString()}</div>
                            <div class="stat-label">Total Records</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${numericColumns.length}</div>
                            <div class="stat-label">Numeric Features</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${completeness.toFixed(1)}%</div>
                            <div class="stat-label">Data Completeness</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${new Set(csvData.map(row => JSON.stringify(row))).size}</div>
                            <div class="stat-label">Unique Records</div>
                        </div>
                    </div>
                </div>

                <div class="analysis-section">
                    <h3>💡 Recommendations</h3>
                    <div class="chart-container">
                        <ul style="list-style-type: none; padding: 0;">
                            ${recommendations.map(rec => `
                                <li style="padding: 10px; margin: 10px 0; background: rgba(102, 126, 234, 0.1); border-radius: 8px; border-left: 4px solid #667eea;">
                                    💡 ${rec}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>

                <div class="analysis-section">
                    <h3>📈 Next Steps</h3>
                    <div class="chart-container">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                            <div style="padding: 15px; background: rgba(40, 167, 69, 0.1); border-radius: 8px;">
                                <h4>🔍 Explore Data</h4>
                                <p>Use the Data Table tab to filter and sort your data interactively</p>
                            </div>
                            <div style="padding: 15px; background: rgba(102, 126, 234, 0.1); border-radius: 8px;">
                                <h4>📊 Visualize</h4>
                                <p>Check the Visualizations tab for charts and trend analysis</p>
                            </div>
                            <div style="padding: 15px; background: rgba(255, 193, 7, 0.1); border-radius: 8px;">
                                <h4>📋 Export</h4>
                                <p>Export your processed data in CSV, JSON, or Excel format</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function exportData(format) {
            if (csvData.length === 0) {
                alert('No data to export!');
                return;
            }

            let content, filename, mimeType;
            
            if (format === 'csv') {
                content = [headers.join(','), ...csvData.map(row => 
                    headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
                )].join('\n');
                filename = 'exported_data.csv';
                mimeType = 'text/csv';
            } else if (format === 'json') {
                content = JSON.stringify(csvData, null, 2);
                filename = 'exported_data.json';
                mimeType = 'application/json';
            } else if (format === 'excel') {
                // Create Excel file using SheetJS
                const ws = XLSX.utils.json_to_sheet(csvData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Data');
                XLSX.writeFile(wb, 'exported_data.xlsx');
                return;
            }

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