import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Icons } from '../common/Icons';
import db from '../../utils/db';
import './Sidebar.css';

/**
 * Sidebar navigation component
 * @param {Object} props Component props
 * @param {Boolean} props.isOpen Whether sidebar is open
 * @param {Function} props.closeSidebar Function to close sidebar
 */
const Sidebar = ({ isOpen, closeSidebar }) => {
  const { t } = useTranslation();
  const { currentUser, logout, hasRole, ROLES } = useAuth();
  const [pendingIncidentsCount, setPendingIncidentsCount] = useState(0);
  
  // Ensure we have a safe function to call even if closeSidebar is not provided
  const handleClose = () => {
    console.log('Handle close called');
    if (typeof closeSidebar === 'function') {
      closeSidebar();
    } else {
      console.error('closeSidebar is not a function!');
    }
  };
  
  // Check if user has admin privileges
  const isAdmin = currentUser && (
    hasRole(ROLES.CHEF_DEPARTEMENT) || 
    hasRole(ROLES.ADMIN) || 
    hasRole(ROLES.COORDINATEUR)
  );

  // Check if user has lab access - Updated to include CHEF_DEPARTEMENT
  const hasLabAccess = currentUser && (
    hasRole(ROLES.CHEF_LABO) || 
    hasRole(ROLES.CHERCHEUR) || 
    hasRole(ROLES.ENSEIGNANT) || 
    hasRole(ROLES.ADMIN) ||
    hasRole(ROLES.CHEF_DEPARTEMENT)  // Added CHEF_DEPARTEMENT role
  );

  // Fetch pending incidents count for technicians
  useEffect(() => {
    const fetchPendingIncidents = async () => {
      if (hasRole(ROLES.TECHNICIEN) && db) {
        try {
          // Get incidents with status "En attente" or "Assigné" (not resolved)
          const pendingIncidents = await db.incidents
            .where('status')
            .anyOf(['En attente', 'Assigné'])
            .toArray();
            
          setPendingIncidentsCount(pendingIncidents.length);
        } catch (error) {
          console.error('Error fetching pending incidents:', error);
          setPendingIncidentsCount(0);
        }
      }
    };

    fetchPendingIncidents();
  }, [hasRole, ROLES.TECHNICIEN]);
  
  return (
    <>
      <div className={`fstt-sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose} />
      
      <nav className={`fstt-sidebar ${isOpen ? 'open' : ''} ns`}>
        <div className="fstt-sidebar-header">
          <h2 className="fstt-app-name">{t('department.title')}</h2>

        </div>
        
        <div className="fstt-sidebar-content">
          <div className="fstt-nav">
            <NavLink 
              to="/" 
              className="fstt-nav-item" 
              onClick={handleClose} 
              end
            >
              <span className="fstt-nav-icon"><Icons.Home /></span>
              {t('nav.home')}
            </NavLink>
            
            {currentUser && (
              <NavLink 
                to="/dashboard" 
                className="fstt-nav-item" 
                onClick={handleClose}
              >
                <span className="fstt-nav-icon"><Icons.BarChart /></span>
                {t('nav.dashboard')}
              </NavLink>
            )}
            
            <div className="fstt-nav-category">{t('nav.teaching')}</div>
            
            <NavLink 
              to="/courses" 
              className="fstt-nav-item" 
              onClick={handleClose}
            >
              <span className="fstt-nav-icon"><Icons.Book /></span>
              {t('nav.courses')}
            </NavLink>
            
            <NavLink 
              to="/students" 
              className="fstt-nav-item" 
              onClick={handleClose}
            >
              <span className="fstt-nav-icon"><Icons.Users /></span>
              {t('nav.students')}
            </NavLink>
            
            <NavLink 
              to="/deliberations" 
              className="fstt-nav-item" 
              onClick={handleClose}
            >
              <span className="fstt-nav-icon"><Icons.CheckSquare /></span>
              {t('nav.deliberations')}
            </NavLink>
            
            <div className="fstt-nav-category">{t('nav.management')}</div>
            
            <NavLink 
              to="/resources" 
              className="fstt-nav-item" 
              onClick={handleClose}
            >
              <span className="fstt-nav-icon"><Icons.Monitor /></span>
              {t('nav.resources')}
            </NavLink>
            
            <NavLink 
              to="/incidents" 
              className="fstt-nav-item" 
              onClick={handleClose}
            >
              <span className="fstt-nav-icon"><Icons.AlertTriangle /></span>
              {t('nav.incidents')}
              {hasRole(ROLES.TECHNICIEN) && pendingIncidentsCount > 0 && (
                <span className="fstt-nav-badge">{pendingIncidentsCount}</span>
              )}
            </NavLink>
            
            <NavLink 
              to="/internships" 
              className="fstt-nav-item" 
              onClick={handleClose}
            >
              <span className="fstt-nav-icon"><Icons.Briefcase /></span>
              {t('nav.internships')}
            </NavLink>
            
            {/* Add Laboratory link */}
            {hasLabAccess && (
              <NavLink 
                to="/laboratory" 
                className="fstt-nav-item" 
                onClick={handleClose}
              >
                <span className="fstt-nav-icon"><Icons.Flask /></span>
                {t('laboratory.title')}
              </NavLink>
            )}
            
            {(hasRole(ROLES.ENSEIGNANT) || hasRole(ROLES.CHEF_DEPARTEMENT) || hasRole(ROLES.COORDINATEUR)) && (
              <NavLink 
                to="/evaluations" 
                className="fstt-nav-item" 
                onClick={handleClose}
              >
                <span className="fstt-nav-icon"><Icons.CheckCircle /></span>
                {t('evaluations.title')}
              </NavLink>
            )}
            
            {/* Admin-only sections */}
            {isAdmin && (
              <>
                <div className="fstt-nav-category">{t('nav.admin')}</div>
                
                <NavLink 
                  to="/administration" 
                  className="fstt-nav-item" 
                  onClick={handleClose}
                >
                  <span className="fstt-nav-icon"><Icons.Settings /></span>
                  {t('nav.admin')}
                </NavLink>
                
                <NavLink 
                  to="/users" 
                  className="fstt-nav-item" 
                  onClick={handleClose}
                >
                  <span className="fstt-nav-icon"><Icons.UserPlus /></span>
                  {t('nav.users')}
                </NavLink>
              </>
            )}
          </div>
        </div>
        
        
      </nav>
    </>
  );
};

export default Sidebar;
