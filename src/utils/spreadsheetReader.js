import * as XLSX from 'xlsx';

/**
 * Reads solar panel data from a spreadsheet file
 * @param {File} file - The spreadsheet file to read
 * @returns {Promise<Object>} - Object mapping addresses to solar panel data
 */
export const readSpreadsheet = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        let workbook;
        const fileName = file.name.toLowerCase();
        
        // Handle CSV files differently
        if (fileName.endsWith('.csv')) {
          const text = e.target.result;
          workbook = XLSX.read(text, { type: 'string', csv: true });
        } else {
          const data = new Uint8Array(e.target.result);
          workbook = XLSX.read(data, { type: 'array' });
        }
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Create a map of address to solar panel data
        const addressMap = {};
        jsonData.forEach((row) => {
          // Normalize address for matching (case-insensitive, remove quotes, trim)
          let rawAddress = row.Address || row.address || '';
          if (typeof rawAddress === 'string') {
            rawAddress = rawAddress.replace(/^["']|["']$/g, '').trim(); // Remove surrounding quotes
          }
          const addressKey = rawAddress.toLowerCase().trim();
          if (addressKey) {
            // Helper function to safely get a value (handles 0 and empty strings)
            const getValue = (...keys) => {
              for (const key of keys) {
                if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                  return row[key];
                }
              }
              return undefined;
            };

            addressMap[addressKey] = {
              panels: getValue('Number of solar panels', 'Number of Solar Panels', 'Panels', 'panels', 'Number of Panels', 'Number of panels'),
              confidenceLevel: getValue('Confidence level (1-10)', 'Confidence Level (1-10)', 'Confidence level', 'confidenceLevel'),
              annualOutput: getValue('Annual output (kWh)', 'Annual Output (kWh)', 'Annual output', 'annualOutput'),
              kwp: getValue('kWp', 'KWp', 'kwp'),
              kwhPerKwpPerYear: getValue('kWh/kWp/year_NL', 'kwhPerKwpPerYear'),
              availabilityFactor: getValue('Availability factor (%)', 'Availability Factor (%)', 'Availability factor', 'availabilityFactor'),
              avgSolarPanelOutput: getValue('Avg solar panel output (Wp)', 'Avg Solar Panel Output (Wp)', 'Avg solar panel output', 'avgSolarPanelOutput'),
              // Legacy fields for backward compatibility
              capacity: getValue('kWp', 'KWp', 'kwp', 'Capacity', 'capacity', 'Total Capacity (kW)'),
              installationDate: getValue('Installation Date', 'Installation date', 'installationDate'),
            };
          }
        });
        
        resolve(addressMap);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    // Use appropriate reading method based on file type
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
};

/**
 * Loads spreadsheet from a URL (for public files)
 * @param {string} url - URL to the spreadsheet file
 * @returns {Promise<Object>} - Object mapping addresses to solar panel data
 */
export const loadSpreadsheetFromUrl = async (url) => {
  try {
    const response = await fetch(url);
    let workbook;
    
    // Handle CSV files differently
    if (url.toLowerCase().endsWith('.csv')) {
      const text = await response.text();
      workbook = XLSX.read(text, { type: 'string', csv: true });
    } else {
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      workbook = XLSX.read(data, { type: 'array' });
    }
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    const addressMap = {};
    let loadedCount = 0;
    jsonData.forEach((row) => {
      // Normalize address for matching (case-insensitive, remove quotes, trim)
      let rawAddress = row.Address || row.address || '';
      if (typeof rawAddress === 'string') {
        rawAddress = rawAddress.replace(/^["']|["']$/g, '').trim(); // Remove surrounding quotes
      }
      const addressKey = rawAddress.toLowerCase().trim();
      if (addressKey) {
        // Helper function to safely get a value (handles 0 and empty strings)
        const getValue = (...keys) => {
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key];
            }
          }
          return undefined;
        };

        addressMap[addressKey] = {
          panels: getValue('Number of solar panels', 'Number of Solar Panels', 'Panels', 'panels', 'Number of Panels', 'Number of panels'),
          confidenceLevel: getValue('Confidence level (1-10)', 'Confidence Level (1-10)', 'Confidence level', 'confidenceLevel'),
          annualOutput: getValue('Annual output (kWh)', 'Annual Output (kWh)', 'Annual output', 'annualOutput'),
          kwp: getValue('kWp', 'KWp', 'kwp'),
          kwhPerKwpPerYear: getValue('kWh/kWp/year_NL', 'kwhPerKwpPerYear'),
          availabilityFactor: getValue('Availability factor (%)', 'Availability Factor (%)', 'Availability factor', 'availabilityFactor'),
          avgSolarPanelOutput: getValue('Avg solar panel output (Wp)', 'Avg Solar Panel Output (Wp)', 'Avg solar panel output', 'avgSolarPanelOutput'),
          // Legacy fields for backward compatibility
          capacity: getValue('kWp', 'KWp', 'kwp', 'Capacity', 'capacity', 'Total Capacity (kW)'),
          installationDate: getValue('Installation Date', 'Installation date', 'installationDate'),
        };
        loadedCount++;
      }
    });
    
    console.log(`Loaded ${loadedCount} addresses from spreadsheet`);
    return addressMap;
  } catch (error) {
    throw new Error(`Failed to load spreadsheet: ${error.message}`);
  }
};

