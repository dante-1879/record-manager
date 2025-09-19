class RecordManager {
    constructor() {
        this.billsData = [];
        this.creditsData = [];
        this.billsHeaders = [];
        this.creditsHeaders = [];
        this.init();
    }

    init() {
        // File input handlers
        document.getElementById('billsFile').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0], 'bills');
        });

        document.getElementById('creditsFile').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0], 'credits');
        });

        document.getElementById('excelFile').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0], 'excel');
        });

        // Search handlers
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.performSearch();
        });

        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearResults();
        });

        document.getElementById('clearFilesBtn').addEventListener('click', () => {
            this.clearAllFiles();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToCSV();
        });
    }

    handleFileUpload(file, type) {
        if (!file) return;

        const statusElement = document.getElementById(`${type}Status`);
        statusElement.textContent = 'Loading...';

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let data;
                
                if (type === 'excel') {
                    data = this.parseExcel(e.target.result);
                } else {
                    data = this.parseCSV(e.target.result);
                }
                
                if (type === 'bills') {
                    this.billsData = data;
                    this.billsHeaders = data.length > 0 ? data[0].headers : [];
                    statusElement.textContent = `✅ ${data.length} invoices loaded`;
                } else if (type === 'credits') {
                    this.creditsData = data;
                    this.creditsHeaders = data.length > 0 ? data[0].headers : [];
                    statusElement.textContent = `✅ ${data.length} payments loaded`;
                } else if (type === 'excel') {
                    // Excel data is already processed into bills and credits
                    const totalRecords = this.billsData.length + this.creditsData.length;
                    statusElement.textContent = `✅ ${totalRecords} transactions loaded (${this.billsData.length} invoices, ${this.creditsData.length} payments)`;
                }

                statusElement.style.color = '#27ae60';
                
                // Automatically display all records after file upload
                this.displayAllRecords();
            } catch (error) {
                statusElement.textContent = '❌ Error loading file';
                statusElement.style.color = '#e74c3c';
                console.error('Error parsing file:', error);
            }
        };

        if (type === 'excel') {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    }

    parseCSV(csv) {
        const lines = csv.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim());
        const headersLower = headers.map(h => h.toLowerCase());
        const data = [];

        // Find the name and total columns (flexible column names)
        const nameColumn = this.findColumn(headersLower, ['name', 'company', 'client', 'vendor', 'supplier']);
        const totalColumn = this.findColumn(headersLower, ['total', 'amount', 'sum', 'value', 'price']);

        if (nameColumn === -1 || totalColumn === -1) {
            throw new Error('Could not find Name and Total columns in CSV');
        }

        for (let i = 1; i < lines.length; i++) {
            const row = this.parseCSVRow(lines[i]);
            if (row.length > Math.max(nameColumn, totalColumn)) {
                const name = row[nameColumn].trim();
                const total = parseFloat(row[totalColumn].replace(/[,$]/g, '')) || 0;
                
                if (name && total !== 0) {
                    // Create object with all column data
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = row[index] ? row[index].trim() : '';
                    });

                    data.push({
                        name: name,
                        total: total,
                        headers: headers,
                        rowData: rowData,
                        originalRow: row
                    });
                }
            }
        }

        return data;
    }

    parseExcel(buffer) {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library not loaded. Please refresh the page.');
        }

        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetNames = workbook.SheetNames;

        // Find bills/invoices and credits/payments sheets
        const billsSheet = this.findSheet(sheetNames, ['bill', 'invoice', 'inv']);
        const creditsSheet = this.findSheet(sheetNames, ['credit', 'payment', 'pay', 'receipt']);

        // Clear existing data
        this.billsData = [];
        this.creditsData = [];
        this.billsHeaders = [];
        this.creditsHeaders = [];

        if (billsSheet) {
            const billsWorksheet = workbook.Sheets[billsSheet];
            const billsCSV = XLSX.utils.sheet_to_csv(billsWorksheet);
            this.billsData = this.parseCSV(billsCSV);
            this.billsHeaders = this.billsData.length > 0 ? this.billsData[0].headers : [];
        }

        if (creditsSheet) {
            const creditsWorksheet = workbook.Sheets[creditsSheet];
            const creditsCSV = XLSX.utils.sheet_to_csv(creditsWorksheet);
            this.creditsData = this.parseCSV(creditsCSV);
            this.creditsHeaders = this.creditsData.length > 0 ? this.creditsData[0].headers : [];
        }

        if (!billsSheet && !creditsSheet) {
            throw new Error('Could not find sheets with names containing: bills, invoices, credits, payments');
        }

        return { processed: true };
    }

    findSheet(sheetNames, keywords) {
        for (const keyword of keywords) {
            const sheet = sheetNames.find(name => 
                name.toLowerCase().includes(keyword)
            );
            if (sheet) return sheet;
        }
        return null;
    }

    parseCSVRow(row) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            
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

    findColumn(headers, possibleNames) {
        for (const name of possibleNames) {
            const index = headers.findIndex(h => h.toLowerCase().includes(name));
            if (index !== -1) return index;
        }
        return -1;
    }

    performSearch() {
        const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
        
        if (this.billsData.length === 0 && this.creditsData.length === 0) {
            alert('Please upload at least one file first');
            return;
        }

        if (searchTerm) {
            const results = this.searchRecords(searchTerm);
            this.displayResults(results, searchTerm);
        } else {
            this.displayAllRecords();
        }
    }

    displayAllRecords() {
        if (this.billsData.length === 0 && this.creditsData.length === 0) {
            return;
        }

        // Get all records
        const results = this.searchRecords(''); // Empty search gets all records
        this.currentResults = results; // Store current results for export
        this.displayCompanyTables(results);
    }

    searchRecords(searchTerm) {
        let bills, credits;
        
        if (searchTerm === '') {
            // Get all records
            bills = this.billsData;
            credits = this.creditsData;
        } else {
            // Filter by search term
            bills = this.billsData.filter(record => 
                record.name.toLowerCase().includes(searchTerm)
            );

            credits = this.creditsData.filter(record => 
                record.name.toLowerCase().includes(searchTerm)
            );
        }

        // Combine and organize by company name
        const allRecords = [];
        const companyMap = new Map();

        // Process bills
        bills.forEach(bill => {
            const key = bill.name.toLowerCase();
            if (!companyMap.has(key)) {
                companyMap.set(key, {
                    name: bill.name,
                    bills: [],
                    credits: []
                });
            }
            companyMap.get(key).bills.push(bill);
            allRecords.push({
                name: bill.name,
                type: 'bill',
                amount: this.getTotalColumnValue(bill), // Use specific Total column value
                headers: bill.headers,
                rowData: bill.rowData,
                originalData: bill
            });
        });

        // Process credits
        credits.forEach(credit => {
            const key = credit.name.toLowerCase();
            if (!companyMap.has(key)) {
                companyMap.set(key, {
                    name: credit.name,
                    bills: [],
                    credits: []
                });
            }
            companyMap.get(key).credits.push(credit);
            allRecords.push({
                name: credit.name,
                type: 'credit',
                amount: this.getTotalColumnValue(credit), // Use specific Total column value
                headers: credit.headers,
                rowData: credit.rowData,
                originalData: credit
            });
        });

        return {
            records: allRecords,
            summary: this.calculateSummary(companyMap),
            availableHeaders: this.getAvailableHeaders(),
            companyMap: companyMap
        };
    }

    getAvailableHeaders() {
        const allHeaders = new Set();
        
        // Add bills headers
        this.billsHeaders.forEach(header => allHeaders.add(header));
        
        // Add credits headers
        this.creditsHeaders.forEach(header => allHeaders.add(header));
        
        return Array.from(allHeaders);
    }

    calculateSummary(companyMap) {
        let totalBills = 0;
        let totalCredits = 0;
        const companySummaries = [];

        companyMap.forEach((data, key) => {
            // Only sum from the "Total" column specifically
            const billSum = data.bills.reduce((sum, bill) => {
                const totalValue = this.getTotalColumnValue(bill);
                return sum + totalValue;
            }, 0);
            
            const creditSum = data.credits.reduce((sum, credit) => {
                const totalValue = this.getTotalColumnValue(credit);
                return sum + totalValue;
            }, 0);
            
            const balance = billSum - creditSum; // Bills minus credits (outstanding amount)

            totalBills += billSum;
            totalCredits += creditSum;

            companySummaries.push({
                name: data.name,
                billSum,
                creditSum,
                balance
            });
        });

        return {
            totalBills,
            totalCredits,
            netBalance: totalBills - totalCredits, // Outstanding amount owed to you
            companySummaries
        };
    }

    getTotalColumnValue(record) {
        // Look specifically for "Total" column first, then "Amount" (case insensitive)
        const totalColumn = record.headers.find(header => 
            header.toLowerCase() === 'total' || header.toLowerCase() === 'amount'
        );
        
        if (totalColumn) {
            const value = record.rowData[totalColumn] || '0';
            return parseFloat(value.toString().replace(/[,$]/g, '')) || 0;
        }
        
        // Fallback to the previously detected total column value
        return record.total || 0;
    }

    displayResults(results, searchTerm) {
        this.currentResults = results; // Store current results for export
        const resultsSection = document.getElementById('results');
        const resultsTitle = document.getElementById('resultsTitle');
        const balanceSummary = document.getElementById('balanceSummary');
        const recordsContainer = document.getElementById('recordsContainer');

        if (results.records.length === 0) {
            resultsTitle.textContent = `No records found for "${searchTerm}"`;
            balanceSummary.innerHTML = '';
            recordsContainer.innerHTML = '<div class="no-results">No matching records found. Please check the company name and try again.</div>';
            resultsSection.style.display = 'block';
            return;
        }

        // Update title
        resultsTitle.textContent = `Records for "${searchTerm}" (${results.records.length} transactions)`;

        // Update balance summary
        const summary = results.summary;
        const netBalanceClass = summary.netBalance >= 0 ? 'positive' : 'negative';
        const netBalanceText = summary.netBalance >= 0 ? 
            `+${this.formatCurrency(summary.netBalance)}` : 
            `${this.formatCurrency(summary.netBalance)}`;

        balanceSummary.innerHTML = `
            <div class="balance-item total-bills">
                <div>Total Invoices</div>
                <div>${this.formatCurrency(summary.totalBills)}</div>
            </div>
            <div class="balance-item total-credits">
                <div>Total Payments</div>
                <div>${this.formatCurrency(summary.totalCredits)}</div>
            </div>
            <div class="balance-item net-balance ${netBalanceClass}">
                <div>Outstanding Balance</div>
                <div>${netBalanceText}</div>
            </div>
        `;

        // Get all unique headers from both files
        const allHeaders = results.availableHeaders;
        
        // Create dynamic table based on available columns
        let tableHTML = `
            <table class="records-table">
                <thead>
                    <tr>
                        <th>Type</th>
        `;

        // Add header columns
        allHeaders.forEach(header => {
            tableHTML += `<th>${header}</th>`;
        });

        tableHTML += `
                        <th>Running Balance</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Sort records by company name and then by type (bills first)
        const sortedRecords = results.records.sort((a, b) => {
            const nameCompare = a.name.localeCompare(b.name);
            if (nameCompare !== 0) return nameCompare;
            return a.type === 'bill' ? -1 : 1;
        });

        let runningBalance = 0;
        sortedRecords.forEach(record => {
            // Update running balance (bills are positive - money owed to you, credits are negative - payments received)
            if (record.type === 'bill') {
                runningBalance += record.amount;
            } else {
                runningBalance -= record.amount;
            }

            const balanceClass = runningBalance >= 0 ? 'amount-bill' : 'amount-credit';
            const balanceText = runningBalance >= 0 ? 
                `${this.formatCurrency(runningBalance)}` : 
                `-${this.formatCurrency(Math.abs(runningBalance))}`;

            const typeClass = record.type === 'bill' ? 'amount-bill' : 'amount-credit';
            const typeText = record.type.charAt(0).toUpperCase() + record.type.slice(1);

            tableHTML += `
                <tr>
                    <td class="${typeClass}">${typeText}</td>
            `;

            // Add data for each column
            allHeaders.forEach(header => {
                const value = record.rowData[header] || '-';
                // Highlight amount columns
                const isAmountColumn = header.toLowerCase().includes('amount') || 
                                     header.toLowerCase().includes('total') ||
                                     header.toLowerCase().includes('sum') ||
                                     header.toLowerCase().includes('value') ||
                                     header.toLowerCase().includes('price');
                
                if (isAmountColumn && value !== '-') {
                    const numValue = parseFloat(value.replace(/[,$]/g, ''));
                    if (!isNaN(numValue)) {
                        tableHTML += `<td class="${record.type === 'bill' ? 'amount-bill' : 'amount-credit'}">${this.formatCurrency(numValue)}</td>`;
                    } else {
                        tableHTML += `<td>${value}</td>`;
                    }
                } else {
                    tableHTML += `<td>${value}</td>`;
                }
            });

            tableHTML += `<td class="${balanceClass}">${balanceText}</td></tr>`;
        });

        tableHTML += '</tbody></table>';

        // Add final balance summary
        const finalBalanceClass = runningBalance >= 0 ? 'amount-bill' : 'amount-credit';
        const finalBalanceText = runningBalance >= 0 ? 
            `${this.formatCurrency(runningBalance)}` : 
            `-${this.formatCurrency(Math.abs(runningBalance))}`;
        const balanceStatus = runningBalance > 0 ? 'Outstanding Amount ' : 
                             runningBalance < 0 ? 'Amount ' : 'Fully Settled';

        tableHTML += `
            <div style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 5px solid ${runningBalance >= 0 ? '#e74c3c' : '#27ae60'};">
                <h4 style="margin: 0 0 10px 0; color: #2c3e50;">Final Balance Summary</h4>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.1rem; font-weight: 600;">${balanceStatus}</span>
                    <span class="${finalBalanceClass}" style="font-size: 1.3rem; font-weight: bold;">${finalBalanceText}</span>
                </div>
            </div>
        `;

        // Add company-wise summary if multiple companies
        if (summary.companySummaries.length > 1) {
            tableHTML += `
                <h4 style="margin-top: 30px; margin-bottom: 15px; color: #2c3e50;">Company-wise Summary</h4>
                <table class="records-table">
                    <thead>
                        <tr>
                            <th>Company Name</th>
                            <th>Total Invoices</th>
                            <th>Total Payments</th>
                            <th>Outstanding Balance</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            summary.companySummaries.forEach(company => {
                const balanceClass = company.balance >= 0 ? 'amount-bill' : 'amount-credit';
                const balanceText = company.balance >= 0 ? 
                    `${this.formatCurrency(company.balance)}` : 
                    `-${this.formatCurrency(Math.abs(company.balance))}`;

                tableHTML += `
                    <tr>
                        <td>${company.name}</td>
                        <td class="amount-bill">${this.formatCurrency(company.billSum)}</td>
                        <td class="amount-credit">${this.formatCurrency(company.creditSum)}</td>
                        <td class="${balanceClass}">${balanceText}</td>
                    </tr>
                `;
            });

            tableHTML += '</tbody></table>';
        }

        recordsContainer.innerHTML = tableHTML;
        resultsSection.style.display = 'block';
    }

    displayCompanyTables(results) {
        const resultsSection = document.getElementById('results');
        const resultsTitle = document.getElementById('resultsTitle');
        const balanceSummary = document.getElementById('balanceSummary');
        const recordsContainer = document.getElementById('recordsContainer');

        if (results.records.length === 0) {
            resultsTitle.textContent = 'No records found';
            balanceSummary.innerHTML = '';
            recordsContainer.innerHTML = '<div class="no-results">No records found. Please upload files first.</div>';
            resultsSection.style.display = 'block';
            return;
        }

        // Update title
        const totalCompanies = results.companyMap.size;
        resultsTitle.textContent = `All Records (${results.records.length} transactions from ${totalCompanies} companies)`;

        // Update balance summary
        const summary = results.summary;
        const netBalanceClass = summary.netBalance >= 0 ? 'positive' : 'negative';
        const netBalanceText = summary.netBalance >= 0 ? 
            `+${this.formatCurrency(summary.netBalance)}` : 
            `${this.formatCurrency(summary.netBalance)}`;

        balanceSummary.innerHTML = `
            <div class="balance-item total-bills">
                <div>Total Invoices</div>
                <div>${this.formatCurrency(summary.totalBills)}</div>
            </div>
            <div class="balance-item total-credits">
                <div>Total Payments</div>
                <div>${this.formatCurrency(summary.totalCredits)}</div>
            </div>
            <div class="balance-item net-balance ${netBalanceClass}">
                <div>Outstanding Balance</div>
                <div>${netBalanceText}</div>
            </div>
        `;

        // Create separate table for each company
        let allTablesHTML = '';
        const allHeaders = results.availableHeaders;

        // Sort companies by name
        const sortedCompanies = Array.from(results.companyMap.entries())
            .sort(([a], [b]) => a.localeCompare(b));

        sortedCompanies.forEach(([companyKey, companyData]) => {
            const companyRecords = results.records.filter(r => 
                r.name.toLowerCase() === companyKey
            );

            // Calculate company balance
            const billSum = companyData.bills.reduce((sum, bill) => {
                const totalValue = this.getTotalColumnValue(bill);
                return sum + totalValue;
            }, 0);
            
            const creditSum = companyData.credits.reduce((sum, credit) => {
                const totalValue = this.getTotalColumnValue(credit);
                return sum + totalValue;
            }, 0);
            
            const balance = billSum - creditSum;

            const balanceClass = balance >= 0 ? 'amount-bill' : 'amount-credit';
            const balanceText = balance >= 0 ? 
                `${this.formatCurrency(balance)}` : 
                `-${this.formatCurrency(Math.abs(balance))}`;
            const balanceStatus = balance > 0 ? 'Outstanding' : balance < 0 ? 'Overpaid' : 'Settled';

            allTablesHTML += `
                <div style="margin-bottom: 40px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background: #f8f9fa; padding: 15px; border-bottom: 1px solid #e0e0e0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0; color: #2c3e50;">${companyData.name}</h3>
                            <div style="display: flex; gap: 15px; font-size: 0.9rem;">
                                <span>Invoices: <strong class="amount-bill">${this.formatCurrency(billSum)}</strong></span>
                                <span>Payments: <strong class="amount-credit">${this.formatCurrency(creditSum)}</strong></span>
                                <span>${balanceStatus}: <strong class="${balanceClass}">${balanceText}</strong></span>
                            </div>
                        </div>
                    </div>
                    <table class="records-table" style="margin: 0;">
                        <thead>
                            <tr>
                                <th>Type</th>
            `;

            // Add header columns
            allHeaders.forEach(header => {
                allTablesHTML += `<th>${header}</th>`;
            });

            allTablesHTML += `
                                <th>Running Balance</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            // Sort records by type (bills first) then by date if available
            const sortedRecords = companyRecords.sort((a, b) => {
                const typeCompare = a.type === 'bill' ? -1 : 1;
                if (a.type !== b.type) return typeCompare;
                
                // Try to sort by date if available
                const dateA = a.rowData.Date || a.rowData.date || '';
                const dateB = b.rowData.Date || b.rowData.date || '';
                return dateA.localeCompare(dateB);
            });

            let runningBalance = 0;
            sortedRecords.forEach(record => {
                // Update running balance
                if (record.type === 'bill') {
                    runningBalance += record.amount;
                } else {
                    runningBalance -= record.amount;
                }

                const balanceClass = runningBalance >= 0 ? 'amount-bill' : 'amount-credit';
                const balanceText = runningBalance >= 0 ? 
                    `${this.formatCurrency(runningBalance)}` : 
                    `-${this.formatCurrency(Math.abs(runningBalance))}`;

                const typeClass = record.type === 'bill' ? 'amount-bill' : 'amount-credit';
                const typeText = record.type.charAt(0).toUpperCase() + record.type.slice(1);

                allTablesHTML += `
                    <tr>
                        <td class="${typeClass}">${typeText}</td>
                `;

                // Add data for each column
                allHeaders.forEach(header => {
                    const value = record.rowData[header] || '-';
                    const isAmountColumn = header.toLowerCase().includes('amount') || 
                                         header.toLowerCase().includes('total') ||
                                         header.toLowerCase().includes('sum') ||
                                         header.toLowerCase().includes('value') ||
                                         header.toLowerCase().includes('price');
                    
                    if (isAmountColumn && value !== '-') {
                        const numValue = parseFloat(value.replace(/[,$]/g, ''));
                        if (!isNaN(numValue)) {
                            allTablesHTML += `<td class="${record.type === 'bill' ? 'amount-bill' : 'amount-credit'}">${this.formatCurrency(numValue)}</td>`;
                        } else {
                            allTablesHTML += `<td>${value}</td>`;
                        }
                    } else {
                        allTablesHTML += `<td>${value}</td>`;
                    }
                });

                allTablesHTML += `<td class="${balanceClass}">${balanceText}</td></tr>`;
            });

            allTablesHTML += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        recordsContainer.innerHTML = allTablesHTML;
        resultsSection.style.display = 'block';
    }

    clearAllFiles() {
        // Clear all data
        this.billsData = [];
        this.creditsData = [];
        this.billsHeaders = [];
        this.creditsHeaders = [];

        // Reset file inputs
        document.getElementById('billsFile').value = '';
        document.getElementById('creditsFile').value = '';
        document.getElementById('excelFile').value = '';

        // Reset status messages
        document.getElementById('billsStatus').textContent = 'No file selected';
        document.getElementById('billsStatus').style.color = '#666';
        document.getElementById('creditsStatus').textContent = 'No file selected';
        document.getElementById('creditsStatus').style.color = '#666';
        document.getElementById('excelStatus').textContent = 'No file selected';
        document.getElementById('excelStatus').style.color = '#666';

        // Clear results
        this.clearResults();
    }

    exportToCSV() {
        const results = this.currentResults;
        if (!results || results.records.length === 0) {
            alert('No records to export. Please upload files first.');
            return;
        }

        // Prepare headers
        const allHeaders = results.availableHeaders;
        const csvHeaders = ['Company', 'Type', ...allHeaders.filter(h => h.toLowerCase() !== 'name'), 'Running Balance'];
        
        // Create CSV content
        let csvContent = csvHeaders.join(',') + '\n';

        // Sort all records by company name first, then by type (bills first), then by date
        const sortedRecords = results.records.sort((a, b) => {
            const nameCompare = a.name.localeCompare(b.name);
            if (nameCompare !== 0) return nameCompare;
            
            const typeCompare = a.type === 'bill' ? -1 : 1;
            if (a.type !== b.type) return typeCompare;
            
            // Try to sort by date if available
            const dateA = a.rowData.Date || a.rowData.date || '';
            const dateB = b.rowData.Date || b.rowData.date || '';
            return dateA.localeCompare(dateB);
        });

        let runningBalance = 0;
        let currentCompany = '';
        
        sortedRecords.forEach(record => {
            // Reset running balance when switching to a new company
            if (record.name.toLowerCase() !== currentCompany) {
                runningBalance = 0;
                currentCompany = record.name.toLowerCase();
                
                // Add a separator line for readability (optional)
                if (csvContent !== csvHeaders.join(',') + '\n') {
                    csvContent += '\n';
                }
            }

            // Update running balance
            if (record.type === 'bill') {
                runningBalance += record.amount;
            } else {
                runningBalance -= record.amount;
            }

            // Prepare row data
            const rowData = [
                `"${record.name}"`,
                `"${record.type.charAt(0).toUpperCase() + record.type.slice(1)}"`
            ];

            // Add data columns (skip name since we have Company column)
            allHeaders.forEach(header => {
                if (header.toLowerCase() !== 'name') {
                    const value = record.rowData[header] || '';
                    const cleanValue = String(value).replace(/"/g, '""'); // Escape quotes
                    rowData.push(`"${cleanValue}"`);
                }
            });

            // Add running balance
            const balanceText = runningBalance >= 0 ? 
                runningBalance.toFixed(2) : 
                `-${Math.abs(runningBalance).toFixed(2)}`;
            rowData.push(`"${balanceText}"`);

            csvContent += rowData.join(',') + '\n';
        });

        // Add summary section
        csvContent += '\n\nSUMMARY\n';
        csvContent += `"Total Companies","${results.companyMap.size}"\n`;
        csvContent += `"Total Records","${results.records.length}"\n`;
        csvContent += `"Total Invoices","${results.summary.totalBills.toFixed(2)}"\n`;
        csvContent += `"Total Payments","${results.summary.totalCredits.toFixed(2)}"\n`;
        csvContent += `"Net Outstanding","${results.summary.netBalance.toFixed(2)}"\n`;

        // Add company-wise summary if there are multiple companies
        if (results.summary.companySummaries.length > 1) {
            csvContent += '\n\nCOMPANY SUMMARY\n';
            csvContent += '"Company Name","Total Invoices","Total Payments","Outstanding Balance"\n';
            
            const sortedCompanySummaries = results.summary.companySummaries.sort((a, b) => 
                a.name.localeCompare(b.name)
            );

            sortedCompanySummaries.forEach(company => {
                csvContent += `"${company.name}","${company.billSum.toFixed(2)}","${company.creditSum.toFixed(2)}","${company.balance.toFixed(2)}"\n`;
            });
        }

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `business_transactions_${currentDate}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('Combined CSV exported successfully');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(Math.abs(amount));
    }

    clearResults() {
        document.getElementById('searchInput').value = '';
        document.getElementById('results').style.display = 'none';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new RecordManager();
});
