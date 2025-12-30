import React from 'react';
import './SolarPanelInfo.css';

const SolarPanelInfo = ({ data, address, loading, onFocusSearch, editedValues, onEditValue }) => {
  if (loading) {
    return (
      <div className="solar-panel-info">
        <div className="info-placeholder">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="solar-panel-info">
        <div className="info-placeholder" onClick={onFocusSearch} style={{ cursor: 'pointer' }}>
          <p>Enter an address to see solar panel information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="solar-panel-info">
      <h2 className="info-title">Solar Panel Information</h2>
      <div className="info-content">
        <div className="info-item">
          <div className="info-label">Address</div>
          <div className="info-value">{address}</div>
        </div>
        <div className="info-item highlight-item">
          <div className="info-label">Approx. number of solar panels</div>
          <div className="info-value highlight">{data.panels !== undefined && data.panels !== null && data.panels !== '' ? (data.panels === 0 || data.panels === '0' ? 0 : data.panels) : 'N/A'}</div>
        </div>
        {data.confidenceLevel !== undefined && data.confidenceLevel !== null && (
          <div className="info-item">
            <div className="info-label">Confidence Level (1-10)</div>
            <div className="info-value">{data.confidenceLevel}</div>
          </div>
        )}
        {data.annualOutput !== undefined && data.annualOutput !== null && (
          <div className="info-item">
            <div className="info-label">Approx. annual output</div>
            <div className="info-value">{editedValues.annualOutput !== undefined ? editedValues.annualOutput : data.annualOutput} kWh</div>
          </div>
        )}
        {data.kwp !== undefined && data.kwp !== null && data.kwp !== 0 && (
          <div className="info-item">
            <div className="info-label">kWp</div>
            <div className="info-value">{editedValues.kwp !== undefined ? editedValues.kwp : data.kwp}</div>
          </div>
        )}
        {data.kwhPerKwpPerYear !== undefined && data.kwhPerKwpPerYear !== null && (
          <div className="info-item editable-item">
            <div className="info-label">kWh/kWp/year_NL</div>
            <input
              type="number"
              className="info-value editable-input"
              value={editedValues.kwhPerKwpPerYear !== undefined ? editedValues.kwhPerKwpPerYear : data.kwhPerKwpPerYear}
              onChange={(e) => onEditValue('kwhPerKwpPerYear', e.target.value)}
              placeholder={data.kwhPerKwpPerYear}
            />
          </div>
        )}
        {data.availabilityFactor !== undefined && data.availabilityFactor !== null && (() => {
          // Get the raw value (without %) for editing
          const getRawValue = (value) => {
            if (editedValues.availabilityFactor !== undefined) {
              return editedValues.availabilityFactor;
            }
            if (typeof value === 'string' && value.includes('%')) {
              return value.replace('%', '');
            }
            if (typeof value === 'number' && value < 1) {
              return (value * 100).toString();
            }
            return value.toString();
          };

          const rawValue = getRawValue(data.availabilityFactor);
          
          return (
            <div className="info-item editable-item">
              <div className="info-label">Availability Factor</div>
              <div className="editable-input-wrapper">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="info-value editable-input"
                  value={rawValue}
                  onChange={(e) => onEditValue('availabilityFactor', e.target.value)}
                  placeholder={rawValue}
                />
                <span className="input-suffix">%</span>
              </div>
            </div>
          );
        })()}
        {data.avgSolarPanelOutput !== undefined && data.avgSolarPanelOutput !== null && (
          <div className="info-item editable-item">
            <div className="info-label">Avg Solar Panel Output</div>
            <div className="editable-input-wrapper">
              <input
                type="number"
                className="info-value editable-input"
                value={editedValues.avgSolarPanelOutput !== undefined ? editedValues.avgSolarPanelOutput : data.avgSolarPanelOutput}
                onChange={(e) => onEditValue('avgSolarPanelOutput', e.target.value)}
                placeholder={data.avgSolarPanelOutput}
              />
              <span className="input-suffix">Wp</span>
            </div>
          </div>
        )}
        {/* Legacy field for backward compatibility */}
        {data.capacity && !data.kwp && (
          <div className="info-item">
            <div className="info-label">Total Capacity</div>
            <div className="info-value">{data.capacity} kW</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SolarPanelInfo;

