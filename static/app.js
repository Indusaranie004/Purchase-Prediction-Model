// API Configuration
const API_URL = 'http://localhost:5001';

// Global state
let allResults = [];
let pieChart = null;
let pendingPredictions = null; // Store parsed data before analysis

// Logo format fallback - tries different image formats
function tryOtherFormats(img) {
    const formats = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    const currentSrc = img.src;
    const basePath = '/static/logoAni';
    let attemptCount = 0;
    
    const tryNext = () => {
        if (attemptCount < formats.length) {
            img.src = basePath + '.' + formats[attemptCount];
            attemptCount++;
        } else {
            // Try without extension as last resort
            img.src = basePath;
            img.onerror = () => {
                img.style.display = 'none';
            };
        }
    };
    
    img.onerror = tryNext;
    tryNext();
}

// Register Chart.js datalabels plugin
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
}

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadButton = document.getElementById('uploadButton');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const removeFile = document.getElementById('removeFile');
const singleResult = document.getElementById('singleResult');
const batchResults = document.getElementById('batchResults');
const infoIcon = document.getElementById('infoIcon');
const modelTooltip = document.getElementById('modelTooltip');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // File upload
    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    removeFile.addEventListener('click', clearFile);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Analyze button - use event delegation to ensure it works
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'analyzeButton') {
            e.preventDefault();
            handleAnalyze();
        }
    });
    
    // Info icon
    infoIcon.addEventListener('click', toggleTooltip);
    document.addEventListener('click', (e) => {
        if (!infoIcon.contains(e.target) && !modelTooltip.contains(e.target)) {
            modelTooltip.classList.remove('show');
        }
    });
}

function toggleTooltip() {
    modelTooltip.classList.toggle('show');
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    fileName.textContent = file.name;
    fileInfo.style.display = 'flex';
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        try {
            if (file.name.endsWith('.json')) {
                const data = JSON.parse(content);
                handleData(data, file.name);
            } else if (file.name.endsWith('.csv')) {
                parseCSV(content, file.name);
            } else {
                alert('Unsupported file type. Please upload a CSV or JSON file.');
            }
        } catch (error) {
            alert('Error parsing file: ' + error.message);
            console.error('File parsing error:', error);
        }
    };
    reader.readAsText(file);
}

function parseCSV(csvText, filename) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        alert('CSV file is empty');
        return;
    }
    
    // Simple CSV parser that handles quoted fields
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }
    
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
    const data = [];
    
    // Check if first column is ID
    const hasIdColumn = headers[0].toLowerCase().includes('id') || 
                       headers[0].toLowerCase().includes('session');
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
        if (values.length < headers.length) continue;
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        // Generate ID if not present
        if (!hasIdColumn) {
            row['Session_ID'] = `SESSION_${String(i).padStart(3, '0')}`;
        } else {
            row['Session_ID'] = values[0] || `SESSION_${String(i).padStart(3, '0')}`;
        }
        
        data.push(row);
    }
    
    handleData(data, filename);
}

function handleData(data, filename) {
    // Normalize data structure
    const records = Array.isArray(data) ? data : [data];
    
    // Extract features and IDs
    const predictions = records.map((record, index) => {
        const sessionId = record.Session_ID || record.session_id || 
                         record.id || record.ID || 
                         `SESSION_${String(index + 1).padStart(3, '0')}`;
        
        return {
            sessionId: sessionId,
            features: extractFeatures(record)
        };
    });
    
    // Store predictions for later analysis
    pendingPredictions = predictions;
    
    // Show analyze button
    const analyzeSection = document.getElementById('analyzeSection');
    if (analyzeSection) {
        analyzeSection.style.display = 'block';
    }
}

function handleAnalyze() {
    console.log('Analyze button clicked');
    console.log('Pending predictions:', pendingPredictions);
    
    if (!pendingPredictions || pendingPredictions.length === 0) {
        alert('No data to analyze. Please upload a file first.');
        return;
    }
    
    // Make predictions
    if (pendingPredictions.length === 1) {
        makeSinglePrediction(pendingPredictions[0]);
    } else {
        makeBatchPredictions(pendingPredictions);
    }
    
    // Hide analyze button after analysis
    document.getElementById('analyzeSection').style.display = 'none';
}

function extractFeatures(record) {
    // Handle both camelCase and snake_case
    const getValue = (key) => {
        return record[key] || 
               record[key.toLowerCase()] ||
               record[key.replace(/_/g, '')] ||
               record[key.replace(/([A-Z])/g, '_$1').toLowerCase()];
    };
    
    const month = getValue('Month') || record.month || 'Jan';
    const visitorType = getValue('VisitorType') || record.visitorType || record.visitor_type || 'New_Visitor';
    const weekend = getValue('Weekend') || record.weekend;
    
    // Normalize month to match model expectations
    const monthMap = {
        'jan': 'Jan', 'january': 'Jan',
        'feb': 'Feb', 'february': 'Feb',
        'mar': 'Mar', 'march': 'Mar',
        'apr': 'Apr', 'april': 'Apr',
        'may': 'May',
        'jun': 'June', 'june': 'June',
        'jul': 'Jul', 'july': 'Jul',
        'aug': 'Aug', 'august': 'Aug',
        'sep': 'Sep', 'september': 'Sep',
        'oct': 'Oct', 'october': 'Oct',
        'nov': 'Nov', 'november': 'Nov',
        'dec': 'Dec', 'december': 'Dec'
    };
    const normalizedMonth = monthMap[month.toLowerCase()] || month;
    
    return {
        Administrative: parseInt(getValue('Administrative') || 0),
        Administrative_Duration: parseFloat(getValue('Administrative_Duration') || 0),
        Informational: parseInt(getValue('Informational') || 0),
        Informational_Duration: parseFloat(getValue('Informational_Duration') || 0),
        ProductRelated: parseInt(getValue('ProductRelated') || 0),
        ProductRelated_Duration: parseFloat(getValue('ProductRelated_Duration') || 0),
        BounceRates: parseFloat(getValue('BounceRates') || 0),
        ExitRates: parseFloat(getValue('ExitRates') || 0),
        PageValues: parseFloat(getValue('PageValues') || 0),
        SpecialDay: parseFloat(getValue('SpecialDay') || 0),
        Month: normalizedMonth,
        OperatingSystems: parseInt(getValue('OperatingSystems') || 1),
        Browser: parseInt(getValue('Browser') || 1),
        Region: parseInt(getValue('Region') || 1),
        TrafficType: parseInt(getValue('TrafficType') || 1),
        VisitorType: (visitorType === 'Returning_Visitor' || visitorType === 'returning_visitor' || visitorType === 'Returning Visitor' || visitorType === 'returning visitor') ? 'Returning_Visitor' : 'New_Visitor',
        Weekend: weekend === true || weekend === 'TRUE' || weekend === 'true' || weekend === '1' || weekend === 1 || weekend === 'True'
    };
}

async function makeSinglePrediction(prediction) {
    try {
        const response = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(prediction.features)
        });
        
        const result = await response.json();
        
        if (result.error) {
            alert('Error: ' + result.error);
            return;
        }
        
        displaySingleResult(result);
    } catch (error) {
        alert('Error making prediction: ' + error.message);
    }
}

async function makeBatchPredictions(predictions) {
    try {
        // Show loading state
        batchResults.style.display = 'grid';
        singleResult.style.display = 'none';
        
        // Make predictions sequentially to avoid overwhelming the API
        allResults = [];
        
        for (const pred of predictions) {
            try {
                const response = await fetch(`${API_URL}/predict`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(pred.features)
                });
                
                const result = await response.json();
                
                if (!result.error) {
                    allResults.push({
                        sessionId: pred.sessionId,
                        prediction: result.prediction,
                        confidence: result.confidence,
                        probabilities: result.probabilities
                    });
                }
            } catch (error) {
                console.error('Error predicting for', pred.sessionId, error);
            }
        }
        
        // Sort by confidence descending
        allResults.sort((a, b) => b.confidence - a.confidence);
        
        displayBatchResults();
    } catch (error) {
        alert('Error making batch predictions: ' + error.message);
    }
}

function displaySingleResult(result) {
    singleResult.style.display = 'block';
    batchResults.style.display = 'none';
    
    const predictionText = document.getElementById('predictionText');
    const predictionBadge = document.getElementById('predictionBadge');
    const confidenceValue = document.getElementById('confidenceValue');
    const confidenceBar = document.getElementById('confidenceBar');
    
    predictionText.textContent = result.prediction;
    predictionBadge.className = `prediction-badge ${result.prediction.toLowerCase().replace(' ', '-')}`;
    confidenceValue.textContent = `${(result.confidence * 100).toFixed(2)}%`;
    confidenceBar.style.width = `${result.confidence * 100}%`;
}

function displayBatchResults() {
    batchResults.style.display = 'grid';
    singleResult.style.display = 'none';
    
    // Update statistics
    const total = allResults.length;
    const buyers = allResults.filter(r => r.prediction === 'Buyer').length;
    const nonBuyers = total - buyers;
    
    document.getElementById('totalPredictions').textContent = total;
    document.getElementById('buyerCount').textContent = buyers;
    document.getElementById('buyerPercentage').textContent = `(${((buyers / total) * 100).toFixed(1)}%)`;
    document.getElementById('nonBuyerCount').textContent = nonBuyers;
    document.getElementById('nonBuyerPercentage').textContent = `(${((nonBuyers / total) * 100).toFixed(1)}%)`;
    
    // Update pie chart
    updatePieChart(buyers, nonBuyers);
    
    // Update table
    updateResultsTable();
    
    // Setup download buttons
    document.getElementById('downloadExcel').onclick = () => downloadResults('excel');
    document.getElementById('downloadPDF').onclick = () => downloadResults('pdf');
}

function updatePieChart(buyers, nonBuyers) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    
    if (pieChart) {
        pieChart.destroy();
    }
    
    const total = buyers + nonBuyers;
    const buyerPercent = total > 0 ? ((buyers / total) * 100).toFixed(1) : 0;
    const nonBuyerPercent = total > 0 ? ((nonBuyers / total) * 100).toFixed(1) : 0;
    
    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Buyers', 'Non-Buyers'],
            datasets: [{
                data: [buyers, nonBuyers],
                backgroundColor: ['#4ade80', '#047857'],
                borderColor: ['#22c55e', '#065f46'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 30,
                    right: 30,
                    bottom: 30,
                    left: 30
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#4ade80',
                    borderWidth: 1,
                    padding: 12
                },
                datalabels: {
                    color: function(context) {
                        // Use green for buyers, dark green for non-buyers
                        return context.dataIndex === 0 ? '#4ade80' : '#047857';
                    },
                    font: {
                        size: 16,
                        weight: '700'
                    },
                    formatter: (value, context) => {
                        const label = context.chart.data.labels[context.dataIndex];
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `${label}: ${percentage}%`;
                    },
                    anchor: 'end',
                    align: 'end',
                    offset: 15,
                    clip: false,
                    textStrokeColor: '#121212',
                    textStrokeWidth: 4,
                    textShadowBlur: 8,
                    textShadowColor: '#121212',
                    backgroundColor: function(context) {
                        return context.dataIndex === 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(4, 120, 87, 0.15)';
                    },
                    borderColor: function(context) {
                        return context.dataIndex === 0 ? '#4ade80' : '#047857';
                    },
                    borderRadius: 8,
                    borderWidth: 2,
                    padding: {
                        top: 6,
                        bottom: 6,
                        left: 10,
                        right: 10
                    }
                }
            }
        }
    });
}

function updateResultsTable() {
    const tbody = document.getElementById('resultsTableBody');
    const tableInfo = document.getElementById('tableInfo');
    const topResults = allResults.slice(0, 10);
    
    tableInfo.textContent = `Showing top 10 of ${allResults.length} results`;
    
    tbody.innerHTML = topResults.map(result => {
        const isBuyer = result.prediction === 'Buyer';
        const badgeClass = isBuyer ? 'buyer' : 'non-buyer';
        const barClass = isBuyer ? 'buyer' : 'non-buyer';
        const confidencePercent = (result.confidence * 100).toFixed(2);
        
        return `
            <tr>
                <td>${result.sessionId}</td>
                <td><span class="table-badge ${badgeClass}">${result.prediction}</span></td>
                <td>
                    <div class="confidence-cell">
                        <span class="confidence-percent">${confidencePercent}%</span>
                        <div class="table-confidence-bar">
                            <div class="table-confidence-bar-fill ${barClass}" style="width: ${confidencePercent}%"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function downloadResults(fileType) {
    // Create data for download - only the three columns we want
    const downloadData = allResults.map(result => ({
        'Session ID': result.sessionId,
        'Prediction': result.prediction,
        'Confidence': `${(result.confidence * 100).toFixed(2)}%`
    }));
    
    // Get current date
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    if (fileType === 'excel') {
        // Download as Excel
        const wb = XLSX.utils.book_new();
        
        // Create array of arrays - header info then data
        const excelData = [
            ['BuyLyticsAI'], // Row 1
            ['Purchase Predictions Report'], // Row 2
            [`Generated: ${dateStr}`], // Row 3
            [], // Row 4 - empty
            ['Session ID', 'Prediction', 'Confidence'], // Row 5 - column headers
        ];
        
        // Add data rows - only the 3 columns we want
        downloadData.forEach(row => {
            excelData.push([
                row['Session ID'],
                row['Prediction'],
                row['Confidence']
            ]);
        });
        
        // Create worksheet from the complete data
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        // Set column widths - only 3 columns
        ws['!cols'] = [
            { wch: 20 }, // Column A - Session ID
            { wch: 15 }, // Column B - Prediction
            { wch: 15 }  // Column C - Confidence
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Predictions');
        XLSX.writeFile(wb, 'shopping_predictions.xlsx');
    } else if (fileType === 'pdf') {
        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header with black background
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, 210, 40, 'F');
        
        // BuyLyticsAI text in white - larger and bold
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text('BuyLyticsAI', 10, 18);
        
        // Purchase Predictions Report text in white - below BuyLyticsAI
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Purchase Predictions Report', 10, 26);
        
        // Generated date in white - smaller text below
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Generated: ${dateStr}`, 10, 34);
        
        // Reset text color to black for content
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        
        // Table headers - start below the black header
        let y = 50;
        doc.setFont(undefined, 'bold');
        doc.text('Session ID', 10, y);
        doc.text('Prediction', 70, y);
        doc.text('Confidence', 130, y);
        y += 8;
        
        // Draw line under header
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(10, y, 200, y);
        y += 5;
        
        // Table content
        doc.setFont(undefined, 'normal');
        downloadData.forEach((row, index) => {
            // Check if we need a new page
            if (y > 270) {
                doc.addPage();
                y = 20;
                // Redraw header on new page
                doc.setFont(undefined, 'bold');
                doc.text('Session ID', 10, y);
                doc.text('Prediction', 70, y);
                doc.text('Confidence', 130, y);
                y += 8;
                doc.line(10, y, 200, y);
                y += 5;
                doc.setFont(undefined, 'normal');
            }
            
            doc.text(row['Session ID'], 10, y);
            doc.text(row['Prediction'], 70, y);
            doc.text(row['Confidence'], 130, y);
            y += 8;
        });
        
        doc.save('shopping_predictions.pdf');
    }
}

function clearFile() {
    fileInput.value = '';
    fileInfo.style.display = 'none';
    document.getElementById('analyzeSection').style.display = 'none';
    singleResult.style.display = 'none';
    batchResults.style.display = 'none';
    allResults = [];
    pendingPredictions = null;
    if (pieChart) {
        pieChart.destroy();
        pieChart = null;
    }
}

