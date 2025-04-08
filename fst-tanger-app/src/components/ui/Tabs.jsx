import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Tab component for use within the Tabs container
 * @param {Object} props Component props
 * @param {ReactNode} props.children Content to display in the tab
 * @param {string} props.id Unique identifier for the tab
 * @param {string} props.label Label displayed in the tab button
 * @param {boolean} props.isActive Whether this tab is currently active
 */
export const Tab = ({ children, id, label, isActive }) => (
  <div 
    role="tabpanel" 
    id={`tab-panel-${id}`}
    aria-labelledby={`tab-${id}`}
    hidden={!isActive}
    className={`fstt-tab-content ${isActive ? 'active' : ''}`}
  >
    {isActive && children}
  </div>
);

Tab.propTypes = {
  children: PropTypes.node.isRequired,
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  isActive: PropTypes.bool
};

/**
 * Tabs container component that manages tab state and renders tab buttons
 * @param {Object} props Component props
 * @param {ReactNode} props.children Tab components to render
 * @param {string} props.activeTab ID of the active tab
 * @param {Function} props.onChange Callback for when the active tab changes
 * @param {string} props.className Additional CSS class for the tabs container
 */
export const Tabs = ({ children, activeTab, onChange, className = '' }) => {
  const [active, setActive] = useState(activeTab || '');
  
  // Update active tab when activeTab prop changes
  useEffect(() => {
    if (activeTab && activeTab !== active) {
      setActive(activeTab);
    }
  }, [activeTab]);
  
  // If no active tab is set but there are children, set the first tab as active
  useEffect(() => {
    if (!active && React.Children.count(children) > 0) {
      const firstTabId = React.Children.toArray(children)[0].props.id;
      setActive(firstTabId);
      
      if (onChange) {
        onChange(firstTabId);
      }
    }
  }, [active, children, onChange]);
  
  // Handle tab click
  const handleTabClick = (tabId) => {
    setActive(tabId);
    
    if (onChange) {
      onChange(tabId);
    }
  };
  
  // Extract tab elements from children
  const tabs = React.Children.toArray(children).filter(
    child => child.type === Tab
  );

  return (
    <div className={`fstt-tabs ${className}`}>
      <div className="fstt-tabs-nav" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.props.id}
            id={`tab-${tab.props.id}`}
            role="tab"
            aria-selected={active === tab.props.id}
            aria-controls={`tab-panel-${tab.props.id}`}
            className={`fstt-tab-button ${active === tab.props.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.props.id)}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      
      {/* Render tabs with isActive prop */}
      {tabs.map((tab) => 
        React.cloneElement(tab, {
          isActive: active === tab.props.id
        })
      )}
    </div>
  );
};

Tabs.propTypes = {
  children: PropTypes.node.isRequired,
  activeTab: PropTypes.string,
  onChange: PropTypes.func,
  className: PropTypes.string
};

export default Tabs;
