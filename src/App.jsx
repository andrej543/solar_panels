import React, { useState, useEffect, useRef } from 'react';
import SearchBar from './components/SearchBar';
import SolarPanelInfo from './components/SolarPanelInfo';
import PdokMap from './components/PdokMap';
import { loadSpreadsheetFromUrl } from './utils/spreadsheetReader';
import { geocodeAddress } from './utils/geocoding';
import './App.css';

// Default coordinates
const DEFAULT_LAT = 52.166705;
const DEFAULT_LON = 5.519060;

function App() {
  const [address, setAddress] = useState('');
  const [solarPanelData, setSolarPanelData] = useState(null);
  const [coordinates, setCoordinates] = useState({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [spreadsheetData, setSpreadsheetData] = useState({});
  const [editedValues, setEditedValues] = useState({});
  const searchBarRef = useRef(null);

  // Load spreadsheet from public folder on mount
  useEffect(() => {
    const loadDefaultSpreadsheet = async () => {
      try {
        // Try to load CSV from public folder first
        const data = await loadSpreadsheetFromUrl('/solar_panels.csv');
        setSpreadsheetData(data);
        console.log(`Loaded ${Object.keys(data).length} addresses into memory`);
      } catch (err) {
        console.error('Error loading CSV:', err);
        // If CSV fails, try XLSX
        try {
          const data = await loadSpreadsheetFromUrl('/solar_panels.xlsx');
          setSpreadsheetData(data);
          console.log(`Loaded ${Object.keys(data).length} addresses into memory`);
        } catch (err2) {
          console.error('Error loading XLSX:', err2);
          console.log('No default spreadsheet found in public folder');
        }
      }
    };
    loadDefaultSpreadsheet();
  }, []);

  const handleSearch = async (searchAddress) => {
    setLoading(true);
    setError(null);
    setAddress(searchAddress);
    setSolarPanelData(null);

    // Check if data is loaded
    if (Object.keys(spreadsheetData).length === 0) {
      setError('Solar panel data is still loading. Please wait a moment and try again.');
      setLoading(false);
      return;
    }

    // Try to geocode the address (for map display), but don't fail if it doesn't work
    try {
      const coords = await geocodeAddress(searchAddress);
      setCoordinates(coords);
    } catch (geocodeErr) {
      console.warn('Geocoding failed, but continuing with solar panel lookup:', geocodeErr);
      // Keep default coordinates or previous coordinates
    }

    // Look up solar panel data (this is the main functionality)
    try {
      // Helper function to normalize address (remove punctuation, extra spaces, lowercase)
      const normalizeAddress = (addr) => {
        return addr
          .replace(/^["']|["']$/g, '') // Remove quotes
          .toLowerCase()
          .replace(/[.,;:]/g, ' ') // Replace punctuation with spaces
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim();
      };

      // Helper function to extract street name and number
      const extractStreetAndNumber = (addr) => {
        const normalized = normalizeAddress(addr);
        // Try to match: street name + number (with optional letter suffix)
        const match = normalized.match(/^([a-z\s]+?)\s+(\d+[a-z]*)/);
        if (match) {
          return {
            street: match[1].trim().replace(/\s+/g, ''),
            number: match[2].toLowerCase().replace(/\s+/g, '')
          };
        }
        // Fallback: try to find number anywhere
        const numberMatch = normalized.match(/(\d+[a-z]*)/);
        if (numberMatch) {
          const number = numberMatch[1].toLowerCase();
          const street = normalized.replace(number, '').trim().replace(/\s+/g, '');
          return { street, number };
        }
        return { street: normalized.replace(/\s+/g, ''), number: '' };
      };

      // Helper function for fuzzy string matching (Levenshtein-like)
      const fuzzyMatch = (str1, str2, threshold = 0.8) => {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        // Check if strings are very similar
        if (longer.includes(shorter) || shorter.includes(longer)) {
          return shorter.length / longer.length;
        }
        
        // Simple character-based similarity
        let matches = 0;
        const shorterSet = new Set(shorter.split(''));
        for (const char of longer) {
          if (shorterSet.has(char)) matches++;
        }
        const similarity = matches / Math.max(longer.length, shorter.length);
        
        return similarity >= threshold;
      };

      // Normalize search address
      let normalizedSearchAddress = normalizeAddress(searchAddress);
      
      // Try exact match first
      let data = spreadsheetData[normalizedSearchAddress];
      
      // If no exact match, try more flexible matching
      if (!data) {
        const searchStreetNum = extractStreetAndNumber(searchAddress);
        
        // Score matches and find the best one
        let bestMatch = null;
        let bestScore = 0;
        
        Object.keys(spreadsheetData).forEach(key => {
          const keyStreetNum = extractStreetAndNumber(key);
          let score = 0;
          
          // If we have street and number from search
          if (searchStreetNum.street && searchStreetNum.number) {
            // Exact street + number match (highest priority)
            if (keyStreetNum.street === searchStreetNum.street && 
                keyStreetNum.number === searchStreetNum.number) {
              score = 1.0;
            }
            // Street matches, number matches (normalized)
            else if (keyStreetNum.street === searchStreetNum.street && 
                     keyStreetNum.number.replace(/\s+/g, '') === searchStreetNum.number.replace(/\s+/g, '')) {
              score = 0.95;
            }
            // Street matches, number is similar
            else if (keyStreetNum.street === searchStreetNum.street && 
                     keyStreetNum.number && searchStreetNum.number) {
              // Check if numbers are similar (e.g., "6" vs "6b")
              if (keyStreetNum.number.includes(searchStreetNum.number) || 
                  searchStreetNum.number.includes(keyStreetNum.number)) {
                score = 0.9;
              } else {
                score = 0.7; // Street matches but number doesn't
              }
            }
            // Fuzzy street match with number match
            else if (fuzzyMatch(keyStreetNum.street, searchStreetNum.street, 0.7) &&
                     keyStreetNum.number === searchStreetNum.number) {
              score = 0.85;
            }
            // Fuzzy street match
            else if (fuzzyMatch(keyStreetNum.street, searchStreetNum.street, 0.7)) {
              score = 0.6;
            }
          }
          // If we only have street name (no number or number not found)
          else if (searchStreetNum.street) {
            // Exact street match
            if (keyStreetNum.street === searchStreetNum.street) {
              score = 0.8;
            }
            // Fuzzy street match
            else if (fuzzyMatch(keyStreetNum.street, searchStreetNum.street, 0.7)) {
              score = 0.6;
            }
            // Street contains search or search contains street
            else if (keyStreetNum.street.includes(searchStreetNum.street) ||
                     searchStreetNum.street.includes(keyStreetNum.street)) {
              score = 0.5;
            }
          }
          
          // Fallback: check if normalized strings are similar
          if (score === 0) {
            const normalizedKey = normalizeAddress(key);
            if (normalizedKey.includes(normalizedSearchAddress) || 
                normalizedSearchAddress.includes(normalizedKey)) {
              const shorter = normalizedSearchAddress.length < normalizedKey.length 
                ? normalizedSearchAddress 
                : normalizedKey;
              const longer = normalizedSearchAddress.length >= normalizedKey.length 
                ? normalizedSearchAddress 
                : normalizedKey;
              if (shorter.length > 5) {
                score = shorter.length / longer.length;
              }
            }
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = key;
          }
        });
        
        // Use match if score is above threshold
        if (bestMatch && bestScore >= 0.5) {
          data = spreadsheetData[bestMatch];
          console.log(`Matched "${normalizedSearchAddress}" to "${bestMatch}" (score: ${bestScore.toFixed(2)})`);
        }
      } else {
        console.log(`Exact match found for: ${normalizedSearchAddress}`);
      }

      if (data) {
        setSolarPanelData(data);
        setError(null); // Clear any previous errors
        // Reset edited values when new address is searched
        setEditedValues({});
      } else {
        setError('No solar panel data found for this address');
        console.log('Searched for:', normalizedSearchAddress);
        console.log('Total addresses loaded:', Object.keys(spreadsheetData).length);
        console.log('Sample addresses:', Object.keys(spreadsheetData).slice(0, 5));
      }
    } catch (err) {
      setError('Failed to look up solar panel data: ' + err.message);
      console.error('Solar panel lookup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-main">
            <h1 className="app-title">Solar Panel Finder</h1>
            <p className="app-subtitle">Search for addresses and view solar panel data</p>
          </div>
          <div className="header-logo">
            <a href="/" className="logo-link">Spenat Labs</a>
          </div>
        </div>
      </header>

      <div className="main-container">
        <div className="search-section">
          <SearchBar ref={searchBarRef} onSearch={handleSearch} loading={loading} />
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        <div className="content-container">
          <div className="info-panel">
            <SolarPanelInfo 
              data={solarPanelData} 
              address={address} 
              loading={loading} 
              onFocusSearch={() => searchBarRef.current?.focus()}
              editedValues={editedValues}
              onEditValue={(field, value) => {
                setEditedValues(prev => {
                  const newValues = { ...prev, [field]: value };
                  
                  // Recalculate derived values based on formulas
                  if (solarPanelData) {
                    // Get current values (edited or original)
                    const panels = parseFloat(solarPanelData.panels || 0);
                    
                    // Get avg solar panel output (edited or original)
                    const avgOutput = parseFloat(newValues.avgSolarPanelOutput !== undefined && newValues.avgSolarPanelOutput !== '' 
                      ? newValues.avgSolarPanelOutput 
                      : (solarPanelData.avgSolarPanelOutput || 0));
                    
                    // Get kWh/kWp/year_NL (edited or original)
                    const kwhPerKwp = parseFloat(newValues.kwhPerKwpPerYear !== undefined && newValues.kwhPerKwpPerYear !== ''
                      ? newValues.kwhPerKwpPerYear
                      : (solarPanelData.kwhPerKwpPerYear || 0));
                    
                    // Get availability factor (edited or original, convert to percentage number)
                    let availabilityFactor = 0;
                    if (newValues.availabilityFactor !== undefined && newValues.availabilityFactor !== '') {
                      availabilityFactor = parseFloat(newValues.availabilityFactor);
                    } else {
                      const origFactor = solarPanelData.availabilityFactor;
                      if (typeof origFactor === 'string' && origFactor.includes('%')) {
                        availabilityFactor = parseFloat(origFactor.replace('%', ''));
                      } else if (typeof origFactor === 'number') {
                        availabilityFactor = origFactor < 1 ? origFactor * 100 : origFactor;
                      }
                    }
                    
                    // Formula 1: kWp = (Number of solar panels × Avg solar panel output) / 1000
                    let currentKwp = parseFloat(newValues.kwp || solarPanelData.kwp || 0);
                    if (field === 'avgSolarPanelOutput' && panels > 0 && avgOutput > 0) {
                      currentKwp = (panels * avgOutput) / 1000;
                      newValues.kwp = currentKwp.toFixed(2);
                    }
                    
                    // Formula 2: Annual output = kWp × kWh/kWp/year_NL × (Availability factor / 100)
                    // Recalculate if any of the inputs change
                    if (currentKwp > 0 && kwhPerKwp > 0 && availabilityFactor > 0) {
                      if (field === 'avgSolarPanelOutput' || field === 'kwhPerKwpPerYear' || field === 'availabilityFactor') {
                        const calculatedAnnualOutput = currentKwp * kwhPerKwp * (availabilityFactor / 100);
                        newValues.annualOutput = Math.round(calculatedAnnualOutput);
                      }
                    }
                  }
                  
                  return newValues;
                });
              }}
            />
          </div>
          <div className="map-panel">
            <PdokMap address={address} coordinates={coordinates} />
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <p className="disclaimer">
            Estimates are approximate and based on aerial/satellite imagery and other third-party information. No legal responsibility is assumed for accuracy or timeliness. Copyright © Spenat Labs Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

