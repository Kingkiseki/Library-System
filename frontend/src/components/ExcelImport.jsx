import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { FiUpload, FiDownload, FiFileText } from 'react-icons/fi';
import { FaFileExcel } from 'react-icons/fa';
import api from '../api';

const ExcelImport = ({ activeCategory, onImportComplete, onClose }) => {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [importStatus, setImportStatus] = useState(null);

  // Smart column mapping - maps Excel columns to our system columns
  const createColumnMapping = (excelHeaders, category) => {
    const mapping = {};
    const systemFields = categoryMappings[category]?.requiredFields || [];
    
    console.log('🔍 Available Excel headers:', excelHeaders);
    console.log('🎯 Target system fields:', systemFields);
    
    // Create flexible mappings for common variations based on your Excel file
    const fieldMappings = {
      'No': [
        'no', 'no.', 'number', '#', 'num', 'item no', 'item number', 'id', 'row'
      ],
      'Collection Type': [
        'collection type', 'collection', 'type', 'format', 'medium', 'material type'
      ],
      'Classification': [
        'classification', 'class', 'category', 'subject', 'genre'
      ],
      'Course Name': [
        'course name', 'course', 'subject', 'department', 'program'
      ],
      'Publication Year': [
        'publication year', 'pub year', 'year', 'date', 'published', 'copyright'
      ],
      'Volumes': [
        'volumes', 'volume', 'vol', 'v', 'vol.', 'volume no', 'vol no', 'qty', 'quantity'
      ],
      'Accession Number': [
        'accession number', 'accession no', 'acc no', 'acc num', 'accession_number', 'number',
        'accession', 'acc_no', 'accno', 'id', 'book id', 'item number'
      ],
      'Date Received': [
        'date received', 'date', 'received date', 'acquisition date', 'date_received',
        'received', 'date acquired', 'purchase date', 'rec date', 'rec_date'
      ],
      'Author': [
        'author', 'authors', 'writer', 'by', 'authored by', 'written by',
        'author name', 'writer name', 'creator', 'contributor'
      ],
      'Book Title': [
        'book title', 'title', 'book name', 'name', 'book_title',
        'title of book', 'book', 'publication title', 'work title'
      ],
      'Edition': [
        'edition', 'ed', 'edn', 'ed.', 'edition no', 'version'
      ],
      'Volume': [
        'volume', 'vol', 'v', 'vol.', 'volume no', 'vol no'
      ],
      'Pages': [
        'pages', 'page', 'pg', 'p', 'page count', 'total pages', 'no of pages'
      ],
      'Publisher': [
        'publisher', 'pub', 'published by', 'publication', 'publishing house',
        'publisher name', 'imprint'
      ],
      'Copyright': [
        'copyright', 'year', 'pub year', 'publication year', 'copyright year',
        'date published', 'publish year', 'yr', 'copyright date', 'copyright/imprint',
        'imprint'
      ],
      'Call Number': [
        'call number', 'call no', 'classification', 'class no', 'call_number',
        'dewey', 'lc number', 'shelf number', 'location'
      ],
      'Gen Ed Prof Ed': [
        'gen.ed./prof.ed.', 'gen ed prof ed', 'gen.ed', 'prof.ed', 'general education',
        'professional education', 'education type', 'gen ed', 'prof ed'
      ],
      'No of Book Copies': [
        'no of book copies', 'no. of book copies', 'copies', 'book copies', 'quantity',
        'qty', 'number of copies', 'copy count', 'total copies'
      ],
      'School Year Semester': [
        'school year semester', 'school year', 'semester', 'year level', 'academic year'
      ]
    };
    
    // Try to match Excel headers to system fields
    systemFields.forEach(systemField => {
      const variations = fieldMappings[systemField] || [];
      
      // Try exact match first (case sensitive)
      let matchedHeader = excelHeaders.find(h => h && h.trim() === systemField);
      
      // Try case-insensitive exact match
      if (!matchedHeader) {
        matchedHeader = excelHeaders.find(h => h && h.toLowerCase().trim() === systemField.toLowerCase());
      }
      
      // Try flexible matching with variations
      if (!matchedHeader) {
        matchedHeader = excelHeaders.find(h => h && 
          variations.some(v => h.toLowerCase().includes(v) || v.includes(h.toLowerCase()))
        );
      }
      
      // Try partial word matching
      if (!matchedHeader) {
        const systemWords = systemField.toLowerCase().split(' ');
        matchedHeader = excelHeaders.find(h => h && 
          systemWords.some(word => h.toLowerCase().includes(word))
        );
      }
      
      // Special case for your exact Excel headers
      if (!matchedHeader) {
        if (systemField === 'Accession Number') {
          matchedHeader = excelHeaders.find(h => h && (h.includes('Accession') || h.includes('Number')));
        } else if (systemField === 'Date Received') {
          matchedHeader = excelHeaders.find(h => h && (h.includes('Date') || h.includes('Received')));
        } else if (systemField === 'Author') {
          matchedHeader = excelHeaders.find(h => h && h.includes('Author'));
        } else if (systemField === 'Book Title') {
          matchedHeader = excelHeaders.find(h => h && (h.includes('Title') || h.includes('Book')));
        } else if (systemField === 'Call Number') {
          matchedHeader = excelHeaders.find(h => h && (h.includes('Call') || h.includes('Number')));
        }
      }
      
      if (matchedHeader) {
        mapping[systemField] = matchedHeader;
        console.log(`✅ Mapped "${systemField}" → "${matchedHeader}"`);
      } else {
        console.log(`❌ No mapping found for "${systemField}"`);
      }
    });
    
    console.log('🔗 Final column mapping:', mapping);
    return mapping;
  };

  // Field mappings for different categories - MATCH EXACTLY what Master List displays
  const categoryMappings = {
    masterlist: {
      requiredFields: ['Accession Number', 'Date Received', 'Author', 'Book Title', 'Call Number'],
      optionalFields: [], // Keep only the 5 fields that Master List actually shows
      sampleData: {
        'Accession Number': '00001',
        'Date Received': '11/18/2025',
        'Author': 'William D. Halsey, et al.',
        'Book Title': 'Collier\'s Encyclopedia 1 Macmillan',
        'Call Number': 'Ref/1990'
      }
    },
    librarycollection: {
      requiredFields: ['School Year Semester', 'No', 'Collection Type', 'Gen Ed Prof Ed', 'Course Name', 'Book Title', 'Author', 'Publication Year', 'No of Book Copies'],
      sampleData: {
        'School Year Semester': 'First Year-First Semester',
        'No': '1',
        'Collection Type': 'Printed',
        'Gen Ed Prof Ed': 'Professional Education',
        'Course Name': 'Introduction to Computing',
        'Book Title': 'Beginner\'s Guide to Typescript Programming',
        'Author': 'Pomperada',
        'Publication Year': '2025',
        'No of Book Copies': '2'
      }
    },
    bookholdings: {
      requiredFields: ['No', 'Collection Type', 'Classification', 'Course Name', 'Book Title', 'Author', 'Publication Year', 'Volumes', 'Accession Number', 'Date Received'],
      sampleData: {
        'No': '1',
        'Collection Type': 'Printed',
        'Classification': 'General Reference',
        'Course Name': '',
        'Book Title': 'Collier\'s Encyclopedia 1 Macmillan',
        'Author': 'William D. Halsely, et al.',
        'Publication Year': '1990',
        'Volumes': '1'
      }
    },
    ebooks: {
      requiredFields: ['Accession Number', 'Date Received', 'Author', 'Book Title', 'Edition', 'Volume', 'Pages', 'Publisher', 'Copyright', 'Call Number'],
      sampleData: {
        'Accession Number': 'EB-0001',
        'Date Received': '11/18/2025',
        'Author': 'W. Eric Wong, Tinghua Ai (editors)',
        'Book Title': 'Emerging Technologies for Information Systems, Computing, and Management',
        'Edition': '4th ed.',
        'Volume': '1339',
        'Pages': '',
        'Publisher': 'Mc-Graw Hill',
        'Copyright': '2013',
        'Call Number': ''
      }
    }
  };

  const currentMapping = categoryMappings[activeCategory];

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                        selectedFile.type === 'application/vnd.ms-excel' || 
                        selectedFile.name.endsWith('.xlsx') || 
                        selectedFile.name.endsWith('.xls'))) {
      setFile(selectedFile);
      parseExcel(selectedFile);
    } else {
      alert('Please select a valid Excel file (.xlsx or .xls)');
    }
  };

  const parseExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { 
          type: 'array', 
          cellDates: true,
          raw: false // Preserve original formatting
        });
        
        // Check all worksheets available
        console.log('📋 Available worksheets:', workbook.SheetNames);
        
        // Get the first worksheet (or look for one with data)
        let worksheetName = workbook.SheetNames[0];
        let worksheet = workbook.Sheets[worksheetName];
        console.log('📄 Using worksheet:', worksheetName);
        
        // Check worksheet range to see total rows
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        console.log('📐 Excel sheet range:', worksheet['!ref']);
        console.log('📊 Total Excel rows in sheet:', range.e.r + 1);
        console.log('📊 Total Excel columns in sheet:', range.e.c + 1);
        
        // Check if there are multiple sheets
        console.log('📋 Total worksheets in file:', workbook.SheetNames.length);
        workbook.SheetNames.forEach((sheetName, index) => {
          const sheet = workbook.Sheets[sheetName];
          if (sheet['!ref']) {
            const sheetRange = XLSX.utils.decode_range(sheet['!ref']);
            console.log(`📄 Sheet ${index + 1} "${sheetName}": ${sheetRange.e.r + 1} rows, ${sheetRange.e.c + 1} columns`);
          }
        });
        
        // Check if we need to use a different sheet
        let bestSheet = worksheet;
        let bestSheetName = worksheetName;
        let maxRows = range.e.r + 1;
        
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          if (sheet['!ref']) {
            const sheetRange = XLSX.utils.decode_range(sheet['!ref']);
            const sheetRows = sheetRange.e.r + 1;
            if (sheetRows > maxRows) {
              maxRows = sheetRows;
              bestSheet = sheet;
              bestSheetName = sheetName;
            }
          }
        });
        
        if (bestSheetName !== worksheetName) {
          console.log(`🔄 Switching to sheet "${bestSheetName}" with ${maxRows} rows`);
          worksheet = bestSheet;
          worksheetName = bestSheetName;
          // Update the range for the new worksheet
          const newRange = XLSX.utils.decode_range(worksheet['!ref']);
          console.log(`📊 New sheet range: ${worksheet['!ref']} (${newRange.e.r + 1} rows)`);
        }
        
        // Try multiple methods to read ALL data from Excel
        let jsonData;
        
        // Method 1: Try reading with no limits
        try {
          jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: false,
            dateNF: 'mm/dd/yyyy',
            blankrows: true, // Include blank rows to avoid missing data
            range: undefined // Explicitly no range limit
          });
          console.log('📊 Method 1 - Read with no limits:', jsonData.length, 'rows');
        } catch (error) {
          console.error('Method 1 failed:', error);
        }
        
        // Method 2: If still too few rows, try reading manually from range
        if (!jsonData || jsonData.length < 1000) {
          try {
            // Force read the entire sheet range
            const fullRange = `A1:${XLSX.utils.encode_cell({r: range.e.r, c: range.e.c})}`;
            console.log('📊 Trying to read full range:', fullRange);
            
            jsonData = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              defval: '',
              raw: false,
              dateNF: 'mm/dd/yyyy',
              range: fullRange,
              blankrows: true
            });
            console.log('📊 Method 2 - Read with explicit range:', jsonData.length, 'rows');
          } catch (error) {
            console.error('Method 2 failed:', error);
          }
        }
        
        // Method 3: Last resort - read without any options
        if (!jsonData || jsonData.length < 1000) {
          try {
            jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            console.log('📊 Method 3 - Basic read:', jsonData.length, 'rows');
          } catch (error) {
            console.error('Method 3 failed:', error);
          }
        }
        
        console.log('🔍 Raw Excel data (first 10 rows):', jsonData.slice(0, 10));
        console.log('📈 Total JSON rows parsed:', jsonData.length);
        
        if (jsonData && jsonData.length > 1) {
          // Find the actual header row - look for your specific headers
          let headerRowIndex = 0;
          let excelHeaders = [];
          
          console.log('🔍 Looking for headers in first 10 rows...');
          
          // Look for the row with actual column names matching your Excel structure
          for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
            const row = jsonData[i];
            console.log(`Row ${i + 1}:`, row);
            
            // Check if this row contains your specific headers
            const rowString = row.join('|').toLowerCase();
            const hasAccession = rowString.includes('accession');
            const hasAuthor = rowString.includes('author');
            const hasTitle = rowString.includes('title') || rowString.includes('book title');
            const hasCall = rowString.includes('call');
            
            console.log(`Row ${i + 1} header check:`, { hasAccession, hasAuthor, hasTitle, hasCall });
            
            if (hasAccession && hasAuthor && hasTitle) {
              headerRowIndex = i;
              excelHeaders = row.map(header => header ? header.toString().trim() : '');
              console.log(`✅ Found headers at row ${i + 1}:`, excelHeaders);
              break;
            }
          }
          
          // If no proper headers found, try a different approach
          if (excelHeaders.length === 0 || excelHeaders.every(h => !h || h.toString().trim() === '')) {
            console.log('⚠️ No proper headers found, trying alternative detection...');
            
            // Look for a row that might be headers based on pattern matching
            for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
              const row = jsonData[i];
              if (row && row.length >= 4) {
                // Check if this looks like a header row (contains text patterns)
                const possibleHeaders = row.map(cell => cell ? cell.toString().trim() : '');
                const hasTextPatterns = possibleHeaders.some(header => 
                  header.length > 3 && 
                  (header.toLowerCase().includes('number') || 
                   header.toLowerCase().includes('author') || 
                   header.toLowerCase().includes('title') ||
                   header.toLowerCase().includes('date') ||
                   header.toLowerCase().includes('call'))
                );
                
                if (hasTextPatterns) {
                  headerRowIndex = i;
                  excelHeaders = possibleHeaders;
                  console.log(`✅ Found headers using pattern matching at row ${i + 1}:`, excelHeaders);
                  break;
                }
              }
            }
            
            // Last resort: use your Excel file structure
            if (excelHeaders.length === 0) {
              console.log('🔧 Using expected Excel structure from your file...');
              headerRowIndex = 0; // Assume first row
              excelHeaders = ['Accession Number', 'Date Received', 'Author', 'Book Title', 'Call Number'];
            }
          }
          
          console.log('📋 Final Excel headers:', excelHeaders);
          console.log('📍 Header row index:', headerRowIndex);
          
          // Create smart column mapping
          const columnMapping = createColumnMapping(excelHeaders, activeCategory);
          console.log('🔄 Column mapping:', columnMapping);
          
          // Extract data starting from after the header row
          const dataStartIndex = headerRowIndex + 1;
          const rawDataRows = jsonData.slice(dataStartIndex);
          console.log('📊 Raw data rows sample:', rawDataRows.slice(0, 3));
          
          console.log(`📊 Total raw rows found: ${rawDataRows.length}`);
          console.log(`🔍 Expected: 5000+ rows, Found: ${rawDataRows.length} rows`);
          console.log(`📊 Raw data sample (rows 1-5):`, rawDataRows.slice(0, 5));
          console.log(`📊 Raw data sample (rows ${rawDataRows.length-5}-${rawDataRows.length}):`, rawDataRows.slice(-5));
          
          const dataRows = rawDataRows.map((row, index) => {
            const originalObj = {};
            const mappedObj = {};
            
            // Store original data using headers as keys
            excelHeaders.forEach((header, colIndex) => {
              const value = row[colIndex];
              originalObj[header] = value || '';
            });
            
            // Only log first few rows to avoid console overload
            if (index < 5) {
              console.log(`📝 Row ${index + 1} original:`, originalObj);
            }
            
            // Create mapped data for our system using column mapping
            Object.entries(columnMapping).forEach(([systemField, excelColumn]) => {
              const value = originalObj[excelColumn] || '';
              mappedObj[systemField] = value;
            });
            
            // If no mapping exists, try direct position mapping for common layouts
            if (Object.keys(columnMapping).length === 0) {
              // Fallback: assume standard order
              const standardFields = ['Accession Number', 'Date Received', 'Author', 'Book Title', 'Edition', 'Volume', 'Pages', 'Publisher', 'Copyright', 'Call Number'];
              standardFields.forEach((field, idx) => {
                if (idx < row.length) {
                  mappedObj[field] = row[idx] || '';
                }
              });
              if (index < 5) {
                console.log('🔄 Used positional mapping for row', index + 1);
              }
            }
            
            // Special handling for missing required fields
            if (!mappedObj['Accession Number'] || mappedObj['Accession Number'].trim() === '') {
              // Generate a unique accession number
              mappedObj['Accession Number'] = `AUTO-${Date.now()}-${index + 1}`;
            }
            
            if (!mappedObj['Date Received'] || mappedObj['Date Received'].trim() === '') {
              // Use current date
              mappedObj['Date Received'] = new Date().toLocaleDateString('en-US');
            }
            
            // Ensure we have the Title mapped correctly
            if (originalObj['Title'] && (!mappedObj['Book Title'] || mappedObj['Book Title'].trim() === '')) {
              mappedObj['Book Title'] = originalObj['Title'];
            }
            
            // Only log first few rows to avoid console overload
            if (index < 5) {
              console.log(`✨ Row ${index + 1} mapped:`, mappedObj);
            }
            
            // Keep unmapped columns as well (for debugging)
            excelHeaders.forEach((header, idx) => {
              if (!Object.values(columnMapping).includes(header) && !mappedObj[header]) {
                mappedObj[`_original_${idx}`] = originalObj[header];
              }
            });
            
            return mappedObj;
          });
          
          // Special processing for Library Collection - detect section headers and assign to books
          let processedDataRows = dataRows;
          if (activeCategory === 'librarycollection') {
            console.log('📚 Processing Library Collection with section headers...');
            let currentSection = '';
            const sectionPatterns = [
              /First Year.*First Semester/i,
              /First Year.*Second Semester/i,
              /Second Year.*First Semester/i,
              /Second Year.*Second Semester/i,
              /Third Year.*First Semester/i,
              /Third Year.*Second Semester/i,
              /Fourth Year.*First Semester/i,
              /Fourth Year.*Second Semester/i
            ];
            
            const sectionNames = [
              'First Year-First Semester',
              'First Year-Second Semester',
              'Second Year-First Semester',
              'Second Year-Second Semester',
              'Third Year-First Semester',
              'Third Year-Second Semester',
              'Fourth Year-First Semester',
              'Fourth Year-Second Semester'
            ];
            
            processedDataRows = dataRows.map((row, index) => {
              // Check if this row is a section header
              const rowText = Object.values(row).join(' ');
              let foundSection = false;
              
              sectionPatterns.forEach((pattern, idx) => {
                if (pattern.test(rowText)) {
                  currentSection = sectionNames[idx];
                  foundSection = true;
                  console.log(`📌 Found section at row ${index + 1}: ${currentSection}`);
                }
              });
              
              // If this is a section header row, mark it for removal
              if (foundSection) {
                return { ...row, _isSectionHeader: true };
              }
              
              // Assign current section to the book
              if (currentSection) {
                return { ...row, 'School Year Semester': currentSection };
              }
              
              return row;
            }).filter(row => !row._isSectionHeader); // Remove section header rows
            
            console.log('📚 Processed Library Collection rows:', processedDataRows.length);
          }
          
          // Very lenient filtering - keep most rows to avoid losing data
          const filteredRows = processedDataRows.filter((row, index) => {
            // Check if row has ANY meaningful data
            const hasAnyData = Object.entries(row).some(([key, val]) => {
              if (key.startsWith('_original_')) return false; // Skip debug fields
              if (!val) return false;
              const str = val.toString().trim();
              // Very permissive - keep anything that looks like data
              return str !== '' && str !== 'undefined' && str !== 'null' && str.length > 0;
            });
            
            // Log filtering decisions for first few and last few rows
            if (index < 10 || index >= dataRows.length - 10) {
              console.log(`Row ${index + 1} filtering:`, hasAnyData ? 'KEEP' : 'SKIP', row);
            }
            
            return hasAnyData;
          });
          
          console.log(`📊 After filtering: ${filteredRows.length} rows (filtered out ${dataRows.length - filteredRows.length} empty rows)`);
          
          if (filteredRows.length < 1000) {
            console.log('⚠️ WARNING: Expected 5000+ rows but only found', filteredRows.length);
            console.log('🔍 This might indicate an issue with Excel parsing or filtering');
          }
          
          setCsvData(filteredRows);
          setPreviewData(filteredRows.slice(0, 5));
          console.log('📊 Final processed data sample:', filteredRows.slice(0, 3));
          console.log('📈 Total data rows to import:', filteredRows.length);
          console.log('🔢 Expected vs Actual: Should be 5000+ rows, got:', filteredRows.length);
        }
      } catch (error) {
        console.error('Excel parsing error:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        alert(`Error parsing Excel file: ${error.message}. Check console for details.`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validateExcelData = () => {
    if (!csvData.length) return { isValid: false, message: 'No data found in Excel file' };
    
    // Check if we have actual data content
    const hasData = csvData.some(row => 
      Object.values(row).some(value => value && value.toString().trim() !== '')
    );
    
    if (!hasData) {
      return { 
        isValid: false, 
        message: 'No valid data found in Excel file. Please make sure your Excel file contains data.' 
      };
    }
    
    console.log('✅ Excel validation passed:', csvData.length, 'rows found');
    return { isValid: true, message: `Excel file validated successfully! Found ${csvData.length} rows of data.` };
  };

  const handleImport = async () => {
    const validation = validateExcelData();
    if (!validation.isValid) {
      alert(validation.message);
      return;
    }

    setIsLoading(true);
    setImportStatus('Importing...');

    try {
      const categoryParam = activeCategory === "masterlist" ? "MasterList" : 
                          activeCategory === "librarycollection" ? "LibraryCollection" :
                          activeCategory === "bookholdings" ? "ListofBookHoldings" : "Ebooks";

      // Process in batches for large files
      const batchSize = 100;
      let totalImported = 0;
      let totalFailed = 0;

      for (let i = 0; i < csvData.length; i += batchSize) {
        const batch = csvData.slice(i, i + batchSize);
        setImportStatus(`Importing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(csvData.length/batchSize)}... (${i + batch.length}/${csvData.length})`);

        try {
          console.log(`📤 Sending batch ${Math.floor(i/batchSize) + 1} data:`, batch.slice(0, 2));
          console.log(`📍 API endpoint: /books/import?category=${categoryParam}`);
          
          const response = await api.post(`/books/import?category=${categoryParam}`, {
            inventoryData: batch
          });

          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} response:`, response.data);
          totalImported += response.data.imported || 0;
          totalFailed += response.data.failed || 0;
        } catch (batchError) {
          console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, batchError);
          console.error(`❌ Error details:`, batchError.response?.data);
          console.error(`❌ Error status:`, batchError.response?.status);
          totalFailed += batch.length;
        }
      }

      setImportStatus(`Import completed! Successfully imported: ${totalImported}, Failed: ${totalFailed}`);
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Import error:', error);
      setImportStatus(`Import failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleExcel = () => {
    const headers = currentMapping.requiredFields;
    const sampleRow = headers.map(header => currentMapping.sampleData[header] || '');
    
    // Create Excel workbook
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeCategory);
    
    // Download the Excel file
    XLSX.writeFile(wb, `${activeCategory}_sample.xlsx`);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Import Excel - {categoryMappings[activeCategory] ? activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1) : ''}
            </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Instructions */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Import Instructions:</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Download the sample Excel template below</li>
            <li>2. Fill in your data following the exact column headers</li>
            <li>3. Save as Excel format (.xlsx)</li>
            <li>4. Upload your Excel file</li>
          </ol>
        </div>

        {/* Required Fields */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-2">Required Excel Columns:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {currentMapping.requiredFields.map((field) => (
              <span key={field} className="text-xs bg-gray-100 px-2 py-1 rounded">
                {field}
              </span>
            ))}
          </div>
        </div>

        {/* Benefits of Excel Import */}
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-400">
          <h4 className="font-semibold text-green-800 mb-2">Excel Import Benefits:</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Preserves original data formatting from your librarian's Excel file</li>
            <li>• Maintains date formats exactly as they appear in Excel</li>
            <li>• No data conversion issues or format changes</li>
            <li>• Handles both .xlsx and .xls file formats</li>
          </ul>
        </div>

        {/* Sample Download */}
        <div className="mb-6">
          <button
            onClick={downloadSampleExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <FaFileExcel />
            Download Sample Excel Template
          </button>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FaFileExcel className="text-green-600" />
            Select Excel File (.xlsx or .xls):
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
        </div>

        {/* Preview */}
        {previewData.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">Preview (First 5 rows):</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    {Object.keys(previewData[0]).map((header) => (
                      <th key={header} className="border border-gray-300 px-2 py-1">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex} className="border border-gray-300 px-2 py-1">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Total rows to import: {csvData.length}
            </p>
          </div>
        )}

        {/* Status */}
        {importStatus && (
          <div className={`mb-4 p-3 rounded ${
            importStatus.includes('Successfully') 
              ? 'bg-green-100 text-green-700' 
              : importStatus.includes('failed')
              ? 'bg-red-100 text-red-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {importStatus}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!csvData.length || isLoading}
            className={`px-4 py-2 rounded text-white ${
              csvData.length && !isLoading
                ? 'bg-teal-600 hover:bg-teal-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <FiUpload className="animate-spin inline mr-2" />
                Importing...
              </>
            ) : (
              <>
                <FiUpload className="inline mr-2" />
                Import Excel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcelImport;