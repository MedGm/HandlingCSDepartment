import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
// Import Icons component but we'll use emoji fallbacks
import { Icons } from '../components/common/Icons';
import './Labo.css';

const Labo = () => {
  const { t } = useTranslation();
  const { currentUser, hasRole, ROLES } = useAuth();
  
  // States
  const [projects, setProjects] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [projectFilter, setProjectFilter] = useState('all');
  const [isChefLabo, setIsChefLabo] = useState(false);
  
  // Modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  
  // Form states
  const [currentProject, setCurrentProject] = useState(null);
  const [currentTimeSlot, setCurrentTimeSlot] = useState(null);
  
  useEffect(() => {
    // Check if user is Chef de Labo
    setIsChefLabo(hasRole(ROLES.CHEF_LABO));
    
    // Fetch projects and time slots
    fetchProjects();
    fetchTimeSlots();
  }, [hasRole, ROLES.CHEF_LABO]);
  
  const fetchProjects = () => {
    // Mock data for projects
    const mockProjects = [
      { id: 1, name: 'Smart Agriculture System', status: 'ongoing', description: 'Development of IoT-based agriculture monitoring system', participants: ['John Doe', 'Jane Smith'], startDate: '2023-01-15', endDate: '2023-06-30' },
      { id: 2, name: 'Computer Vision for Security', status: 'finished', description: 'Advanced security system using computer vision and AI', participants: ['Robert Johnson', 'Emily Brown'], startDate: '2022-08-01', endDate: '2023-02-28' },
      { id: 3, name: 'Renewable Energy Optimization', status: 'ongoing', description: 'Algorithms for optimizing renewable energy consumption', participants: ['Michael Wilson', 'Sarah Davis'], startDate: '2023-03-10', endDate: '2023-12-15' },
      { id: 4, name: 'Blockchain Data Management', status: 'dropped', description: 'Secure data management system using blockchain technology', participants: ['David Miller', 'Lisa Anderson'], startDate: '2022-11-20', endDate: '2023-04-30' },
    ];
    
    setProjects(mockProjects);
  };
  
  const fetchTimeSlots = () => {
    // Mock data for time slots
    const mockTimeSlots = [
      { id: 1, date: '2023-10-20', startTime: '09:00', endTime: '12:00', lab: 'Lab A', bookedBy: 'Michael Wilson', project: 'Renewable Energy Optimization' },
      { id: 2, date: '2023-10-21', startTime: '14:00', endTime: '17:00', lab: 'Lab B', bookedBy: 'John Doe', project: 'Smart Agriculture System' },
      { id: 3, date: '2023-10-23', startTime: '10:00', endTime: '13:00', lab: 'Lab A', bookedBy: null, project: null },
      { id: 4, date: '2023-10-24', startTime: '13:00', endTime: '16:00', lab: 'Lab C', bookedBy: null, project: null },
    ];
    
    setTimeSlots(mockTimeSlots);
  };
  
  const handleCreateProject = () => {
    setCurrentProject(null);
    setShowProjectModal(true);
  };
  
  const handleEditProject = (project) => {
    setCurrentProject(project);
    setShowProjectModal(true);
  };
  
  const handleDeleteProject = (projectId) => {
    if (window.confirm(t('labo.confirmDeleteProject', 'Êtes-vous sûr de vouloir supprimer ce projet ?'))) {
      setProjects(projects.filter(project => project.id !== projectId));
    }
  };
  
  const handleCreateTimeSlot = () => {
    setCurrentTimeSlot(null);
    setShowTimeSlotModal(true);
  };
  
  const handleEditTimeSlot = (timeSlot) => {
    setCurrentTimeSlot(timeSlot);
    setShowTimeSlotModal(true);
  };
  
  const handleDeleteTimeSlot = (timeSlotId) => {
    if (window.confirm(t('labo.confirmDeleteTimeSlot', 'Êtes-vous sûr de vouloir supprimer ce créneau ?'))) {
      setTimeSlots(timeSlots.filter(timeSlot => timeSlot.id !== timeSlotId));
    }
  };
  
  const handleRequestTimeSlot = (timeSlot) => {
    setCurrentTimeSlot(timeSlot);
    setShowRequestModal(true);
  };
  
  const handleManageMaterials = () => {
    setShowMaterialModal(true);
  };
  
  const filteredProjects = projectFilter === 'all' 
    ? projects 
    : projects.filter(project => project.status === projectFilter);
  
  return (
    <div className="fstt-labo ns">
      <h1>{t('labo.title', 'Laboratoire')}</h1>
      
      {/* Welcome Section */}
      <div className="fstt-labo-welcome">
        <h2>{t('labo.welcome', 'Bienvenue au Laboratoire')}</h2>
        <p>{t('labo.welcomeMessage', 'Gérez les projets, les créneaux horaires et les équipements du laboratoire.')}</p>
      </div>
      
      {/* Quick Actions */}
      {isChefLabo && (
        <div className="fstt-labo-quick-actions">
          <button className="fstt-btn fstt-btn-primary" onClick={handleCreateProject}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg> 
            {t('labo.newProject', 'Nouveau Projet')}
          </button>
          <button className="fstt-btn fstt-btn-secondary" onClick={handleCreateTimeSlot}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {t('labo.newTimeSlot', 'Nouveau Créneau')}
          </button>
          <button className="fstt-btn fstt-btn-accent" onClick={handleManageMaterials}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
            {t('labo.manageMaterials', 'Gérer les Équipements')}
          </button>
        </div>
      )}
      
      {/* Projects Section */}
      <div className="fstt-labo-section">
        <div className="fstt-labo-section-header">
          <h2>{t('labo.projects', 'Projets')}</h2>
          <div className="fstt-labo-filters">
            <button 
              className={`fstt-labo-filter ${projectFilter === 'all' ? 'active' : ''}`}
              onClick={() => setProjectFilter('all')}
            >
              {t('labo.allProjects', 'Tous les Projets')}
            </button>
            <button 
              className={`fstt-labo-filter ${projectFilter === 'ongoing' ? 'active' : ''}`}
              onClick={() => setProjectFilter('ongoing')}
            >
              {t('labo.ongoingProjects', 'En Cours')}
            </button>
            <button 
              className={`fstt-labo-filter ${projectFilter === 'finished' ? 'active' : ''}`}
              onClick={() => setProjectFilter('finished')}
            >
              {t('labo.finishedProjects', 'Terminés')}
            </button>
            <button 
              className={`fstt-labo-filter ${projectFilter === 'dropped' ? 'active' : ''}`}
              onClick={() => setProjectFilter('dropped')}
            >
              {t('labo.droppedProjects', 'Abandonnés')}
            </button>
          </div>
        </div>
        
        <div className="fstt-labo-projects">
          {filteredProjects.length === 0 ? (
            <div className="fstt-labo-empty">{t('labo.noProjects', 'Aucun projet trouvé')}</div>
          ) : (
            filteredProjects.map(project => (
              <div key={project.id} className="fstt-labo-project-card">
                <div className="fstt-labo-project-header">
                  <h3>{project.name}</h3>
                  <span className={`fstt-labo-status fstt-labo-status-${project.status}`}>
                    {t(`labo.status.${project.status}`, 
                      project.status === 'ongoing' ? 'En cours' : 
                      project.status === 'finished' ? 'Terminé' : 
                      project.status === 'dropped' ? 'Abandonné' : project.status
                    )}
                  </span>
                </div>
                <p className="fstt-labo-project-description">{project.description}</p>
                <div className="fstt-labo-project-details">
                  <div className="fstt-labo-project-dates">
                    <div><strong>{t('labo.startDate', 'Date de début')}:</strong> {project.startDate}</div>
                    <div><strong>{t('labo.endDate', 'Date de fin')}:</strong> {project.endDate}</div>
                  </div>
                  <div className="fstt-labo-project-participants">
                    <strong>{t('labo.participants', 'Participants')}:</strong>
                    <ul>
                      {project.participants.map((participant, index) => (
                        <li key={index}>{participant}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {isChefLabo && (
                  <div className="fstt-labo-project-actions">
                    <button className="fstt-btn fstt-btn-text" onClick={() => handleEditProject(project)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      {t('common.edit', 'Modifier')}
                    </button>
                    <button className="fstt-btn fstt-btn-text fstt-btn-danger" onClick={() => handleDeleteProject(project.id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                      {t('common.delete', 'Supprimer')}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Time Slots Section */}
      <div className="fstt-labo-section">
        <h2>{t('labo.timeSlots', 'Créneaux Horaires')}</h2>
        <div className="fstt-labo-time-slots">
          {timeSlots.length === 0 ? (
            <div className="fstt-labo-empty">{t('labo.noTimeSlots', 'Aucun créneau disponible')}</div>
          ) : (
            <table className="fstt-labo-table">
              <thead>
                <tr>
                  <th>{t('labo.date', 'Date')}</th>
                  <th>{t('labo.time', 'Heure')}</th>
                  <th>{t('labo.lab', 'Laboratoire')}</th>
                  <th>{t('labo.status', 'Statut')}</th>
                  <th>{t('labo.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(slot => (
                  <tr key={slot.id} className={slot.bookedBy ? 'booked' : 'available'}>
                    <td>{slot.date}</td>
                    <td>{slot.startTime} - {slot.endTime}</td>
                    <td>{slot.lab}</td>
                    <td>
                      {slot.bookedBy ? (
                        <span className="fstt-labo-status fstt-labo-status-booked">
                          {t('labo.booked', 'Réservé')} ({slot.project})
                        </span>
                      ) : (
                        <span className="fstt-labo-status fstt-labo-status-available">
                          {t('labo.available', 'Disponible')}
                        </span>
                      )}
                    </td>
                    <td>
                      {isChefLabo ? (
                        <>
                          <button className="fstt-btn fstt-btn-text" onClick={() => handleEditTimeSlot(slot)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            {t('common.edit', 'Modifier')}
                          </button>
                          <button className="fstt-btn fstt-btn-text fstt-btn-danger" onClick={() => handleDeleteTimeSlot(slot.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            {t('common.delete', 'Supprimer')}
                          </button>
                        </>
                      ) : (
                        !slot.bookedBy && (
                          <button className="fstt-btn fstt-btn-text" onClick={() => handleRequestTimeSlot(slot)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            {t('labo.requestTimeSlot', 'Demander Réservation')}
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Modals would be implemented here */}
    </div>
  );
};

export default Labo;