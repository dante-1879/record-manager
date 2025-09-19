# Business Record Manager

A web-based application to manage and analyze business transactions from CSV files. Track outstanding balances between bills and credits with trial balance-style reporting.

## Features

- **Multiple File Format Support**: 
  - Separate CSV files for bills and credits
  - Single combined CSV file with transaction types
  - Excel files (.xlsx/.xls) with multiple sheets
- **Flexible Column Detection**: Automatically detects columns for company names and amounts
- **Smart Search**: Search by company name with partial matching
- **Trial Balance View**: Shows bill amounts, credit amounts, and running balances
- **Summary Analytics**: Displays total bills, credits, and net balance
- **Company-wise Analysis**: Groups transactions by company with individual summaries
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

1. Open `index.html` in your web browser
2. Upload your files using one of these options:
   - **Separate Files**: Upload bills CSV and credits CSV separately
   - **Combined CSV**: Upload single CSV with both transaction types
   - **Excel File**: Upload .xlsx/.xls file with separate sheets
3. Use the search function to find records by company name
4. View detailed transaction history and balance analysis

## File Upload Options

### Option 1: Separate CSV Files
Upload two separate CSV files:
- **Bills/Invoices CSV**: Contains records of bills/invoices issued
- **Credits/Payments CSV**: Contains records of payments received

### Option 2: Combined CSV File  
Upload a single CSV file containing both transaction types with:
- **Type Column**: Must include a column indicating transaction type
- **Supported Type Values**: "Invoice", "Bill", "Payment", "Credit", etc.

### Option 3: Excel File (Multiple Sheets)
Upload an Excel file (.xlsx or .xls) with separate sheets:
- **Bills Sheet**: Named like "Bills", "Invoices", "Inv", etc.
- **Credits Sheet**: Named like "Credits", "Payments", "Pay", etc.

## CSV File Format

Your CSV files should contain at least two columns:

### Supported Column Names
- **Company Names**: `name`, `company`, `client`, `vendor`, `supplier`
- **Amounts**: `total`, `amount`, `sum`, `value`, `price`

### Example CSV Structure
```csv
Name,Description,Total,Date
ABC Company,Invoice #001,1500.00,2024-01-15
XYZ Corp,Service Fee,750.00,2024-01-20
ABC Company,Invoice #002,2000.00,2024-01-25
```

## How It Works

1. **Upload Files**: The application parses CSV files and extracts company names and amounts
2. **Search**: Enter a company name to find all related transactions
3. **Analysis**: View transactions in trial balance format:
   - Bills are shown as negative amounts (money owed to you)
   - Credits are shown as positive amounts (money received)
   - Running balance shows the current outstanding amount
4. **Summary**: Get totals and net balance for quick overview

## Balance Calculation

- **Positive Balance**: Company owes you money (more bills than credits)
- **Negative Balance**: You owe the company money (more credits than bills)
- **Zero Balance**: All transactions are settled

## Technical Details

- Pure HTML, CSS, and JavaScript (no external dependencies)
- Client-side CSV parsing for privacy and speed
- Responsive design with mobile support
- Error handling for malformed CSV files

## Usage Tips

- Ensure CSV files have headers in the first row
- Company names don't need to match exactly - partial matches work
- Use consistent naming for companies across both files
- The application handles common CSV formatting (quotes, commas in values)

## File Structure

```
record-manager/
├── index.html              # Main application interface
├── app.js                  # Application logic and file processing
├── README.md               # This documentation
├── sample-bills.csv        # Example bills file
├── sample-credits.csv      # Example credits file
└── sample-combined.csv     # Example combined transactions file
```

## Dependencies

- **SheetJS (XLSX)**: For Excel file processing (loaded via CDN)
- Pure HTML, CSS, and JavaScript for the core application

## Browser Compatibility

Works in all modern browsers including:
- Chrome/Chromium
- Firefox
- Safari
- Edge

No internet connection required - runs completely offline.
