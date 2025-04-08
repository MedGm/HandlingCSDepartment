import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import db from '../utils/db';
import './Incidents.css';

const Incidents = () => {
  const { t } = useTranslation();
  const { currentUser, hasRole, ROLES } = useAuth();
  
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  
  // Modal states
  const [showModal, setShowModal] = useState({
    reportIncident: false,
    viewIncident: false,
    resolveIncident: false,
    checkStatus: false
  });
  
  // Selected incident for operations
  const [selectedIncident, setSelectedIncident] = useState(null);
  
  // Form data for reporting a new incident
  const [formData, setFormData] = useState({
    description: '',
    priorite: 'Moyenne',
    localisation: '',
    typeIncident: 'Matériel' // Matériel, Logiciel, Réseau, Autre
  });
  
  // Resolution data for technicians
  const [resolutionData, setResolutionData] = useState({
    solution: '',
    dateResolution: new Date().toISOString().split('T')[0],
    commentaire: ''
  });

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        let incidentsData = [];
        
        if (hasRole(ROLES.TECHNICIEN)) {
          // Technicians see incidents assigned to them and unassigned incidents
          incidentsData = await db.incidentsTechniques.toArray();
          incidentsData = incidentsData.filter(incident => 
            incident.technicien_id === currentUser.id || !incident.technicien_id
          );
        } else if (hasRole(ROLES.ENSEIGNANT)) {
          // Teachers see only incidents they reported
          incidentsData = await db.incidentsTechniques
            .where('enseignant_id')
            .equals(currentUser.id)
            .toArray();
        } else if (hasRole([ROLES.CHEF_DEPARTEMENT, ROLES.ADMIN, ROLES.COORDINATEUR])) {
          // Admins and department heads see all incidents
          incidentsData = await db.incidentsTechniques.toArray();
        } else {
          // Secretariat sees all incidents
          incidentsData = await db.incidentsTechniques.toArray();
        }
        
        // Get personnel details to show names
        const enhancedIncidents = await Promise.all(incidentsData.map(async (incident) => {
          // Get reporter name
          let reporterName = "Inconnu";
          if (incident.enseignant_id) {
            try {
              const teacher = await db.personnes.get(incident.enseignant_id);
              if (teacher) {
                const firstName = teacher.prenom || '';
                const lastName = teacher.nom || '';
                reporterName = `${firstName} ${lastName}`.trim() || "Inconnu";
              }
            } catch (error) {
              console.error('Error fetching reporter details:', error);
            }
          }
          
          // Get technician name if assigned
          let technicianName = "Non assigné";
          if (incident.technicien_id) {
            try {
              const tech = await db.personnes.get(incident.technicien_id);
              if (tech) {
                const firstName = tech.prenom || '';
                const lastName = tech.nom || '';
                technicianName = `${firstName} ${lastName}`.trim() || "Inconnu";
              }
            } catch (error) {
              console.error('Error fetching technician details:', error);
            }
          }
          
          return {
            ...incident,
            reporterName,
            technicianName
          };
        }));
        
        setIncidents(enhancedIncidents);
        
      } catch (error) {
        console.error('Error fetching incidents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
  }, [currentUser, hasRole, ROLES]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle resolution form changes
  const handleResolutionChange = (e) => {
    const { name, value } = e.target;
    setResolutionData({
      ...resolutionData,
      [name]: value
    });
  };

  // Filter incidents based on search term and status
  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = 
      incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (incident.reporterName && incident.reporterName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (incident.technicianName && incident.technicianName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filter === 'all') {
      return matchesSearch;
    }
    
    return matchesSearch && incident.statut.toLowerCase() === filter;
  });
  
  // Submit a new incident - Flow from "Soumettre un incident technique" sequence diagram
  const handleSubmitIncident = async (e) => {
    e.preventDefault();
    
    try {
      const newIncident = {
        description: formData.description,
        typeIncident: formData.typeIncident,
        localisation: formData.localisation,
        dateSoumission: new Date(),
        statut: 'Soumis', // Initial status
        priorite: formData.priorite,
        enseignant_id: currentUser.id,
        technicien_id: null // Not assigned yet
      };
      
      // Add the incident to the database
      const id = await db.incidentsTechniques.add(newIncident);
      
      // Add to the incidents list with the ID
      setIncidents([...incidents, { 
        ...newIncident, 
        id,
        reporterName: `${currentUser.prenom} ${currentUser.nom}`,
        technicianName: "Non assigné"
      }]);
      
      // Show success message and close modal
      alert(t('incidents.reportSuccessful'));
      setShowModal({...showModal, reportIncident: false});
      
      // Reset form data
      setFormData({
        description: '',
        priorite: 'Moyenne',
        localisation: '',
        typeIncident: 'Matériel'
      });
      
    } catch (error) {
      console.error('Error submitting incident:', error);
      alert(t('incidents.reportError'));
    }
  };
  
  // Assign incident to technician - Flow from sequence diagrams
  const handleAssignIncident = async (incident, technicianId = currentUser.id) => {
    try {
      // Update the incident status and assign technician
      await db.incidentsTechniques.update(incident.id, {
        statut: 'Assigné',
        technicien_id: technicianId
      });
      
      // Update in the UI
      setIncidents(incidents.map(inc => 
        inc.id === incident.id 
          ? { 
              ...inc, 
              statut: 'Assigné', 
              technicien_id: technicianId,
              technicianName: `${currentUser.prenom} ${currentUser.nom}`
            } 
          : inc
      ));
      
      alert(t('incidents.assignmentSuccessful'));
      
    } catch (error) {
      console.error('Error assigning incident:', error);
      alert(t('incidents.assignmentError'));
    }
  };
  
  // Update incident status to "In Progress" - Flow from sequence diagrams
  const handleUpdateStatus = async (incident, newStatus) => {
    try {
      // Update the incident status
      await db.incidentsTechniques.update(incident.id, {
        statut: newStatus
      });
      
      // Update in the UI
      setIncidents(incidents.map(inc => 
        inc.id === incident.id 
          ? { ...inc, statut: newStatus } 
          : inc
      ));
      
      alert(t('incidents.statusUpdateSuccessful'));
      
    } catch (error) {
      console.error('Error updating incident status:', error);
      alert(t('incidents.statusUpdateError'));
    }
  };
  
  // Resolve an incident - Flow from "Résoudre l'incident" sequence diagram
  const handleResolveIncident = async (e) => {
    e.preventDefault();
    
    try {
      if (!selectedIncident) return;
      
      // Update the incident with resolution information
      await db.incidentsTechniques.update(selectedIncident.id, {
        statut: 'Résolu',
        solution: resolutionData.solution,
        dateResolution: resolutionData.dateResolution,
        commentaire: resolutionData.commentaire
      });
      
      // Update in the UI
      setIncidents(incidents.map(inc => 
        inc.id === selectedIncident.id 
          ? { 
              ...inc, 
              statut: 'Résolu',
              solution: resolutionData.solution,
              dateResolution: resolutionData.dateResolution,
              commentaire: resolutionData.commentaire
            } 
          : inc
      ));
      
      // Close modal and show success message
      setShowModal({...showModal, resolveIncident: false});
      alert(t('incidents.resolutionSuccessful'));
      
      // Reset resolution data
      setResolutionData({
        solution: '',
        dateResolution: new Date().toISOString().split('T')[0],
        commentaire: ''
      });
      
    } catch (error) {
      console.error('Error resolving incident:', error);
      alert(t('incidents.resolutionError'));
    }
  };
  
  // Close incident - Final step in sequence diagrams
  const handleCloseIncident = async (incident) => {
    try {
      // Update the incident status to closed
      await db.incidentsTechniques.update(incident.id, {
        statut: 'Clôturé'
      });
      
      // Update in the UI
      setIncidents(incidents.map(inc => 
        inc.id === incident.id 
          ? { ...inc, statut: 'Clôturé' } 
          : inc
      ));
      
      alert(t('incidents.incidentClosed'));
      
    } catch (error) {
      console.error('Error closing incident:', error);
      alert(t('incidents.closingError'));
    }
  };

  if (loading) {
    return <div className="fstt-loading ns">{t('common.loading')}</div>;
  }

  return (
    <div className="fstt-incidents ns">
      <h1>{t('incidents.title')}</h1>
      
      <div className="fstt-incidents-controls">
        <div className="fstt-search">
          <input
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="fstt-filter">
          <label htmlFor="status-filter">{t('incidents.status')}:</label>
          <select 
            id="status-filter" 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">{t('common.all')}</option>
            <option value="soumis">{t('incidents.statusPending')}</option>
            <option value="assigné">{t('incidents.statusAssigned')}</option>
            <option value="en cours">{t('incidents.statusInProgress')}</option>
            <option value="résolu">{t('incidents.statusResolved')}</option>
            <option value="clôturé">{t('incidents.statusClosed')}</option>
          </select>
        </div>
      </div>
      
      <div className="fstt-incidents-list">
        {filteredIncidents.length > 0 ? (
          <table className="fstt-table">
            <thead>
              <tr>
                <th>{t('incidents.id')}</th>
                <th>{t('incidents.description')}</th>
                <th>{t('incidents.priority')}</th>
                <th>{t('incidents.status')}</th>
                <th>{t('incidents.reporter')}</th>
                <th>{t('incidents.technician')}</th>
                <th>{t('incidents.date')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map(incident => (
                <tr key={incident.id}>
                  <td>{incident.id}</td>
                  <td>{incident.description}</td>
                  <td>
                    <span className={`fstt-badge priority-${incident.priorite.toLowerCase()}`}>
                      {incident.priorite}
                    </span>
                  </td>
                  <td>
                    <span className={`fstt-badge status-${incident.statut.toLowerCase().replace(' ', '-')}`}>
                      {incident.statut}
                    </span>
                  </td>
                  <td>{incident.reporterName}</td>
                  <td>{incident.technicianName}</td>
                  <td>{new Date(incident.dateSoumission).toLocaleDateString()}</td>
                  <td className="fstt-incident-actions">
                    <button className="fstt-btn"
                      onClick={() => {
                        setSelectedIncident(incident);
                        setShowModal({ ...showModal, viewIncident: true });
                      }}>
                      {t('common.view')}
                    </button>
                    
                    {/* Technical Team actions */}
                    {hasRole([ROLES.CHEF_DEPARTEMENT, ROLES.ADMIN]) && incident.statut === 'Soumis' && (
                      <button className="fstt-btn fstt-btn-primary"
                        onClick={() => handleAssignIncident(incident)}>
                        {t('incidents.assign')}
                      </button>
                    )}
                    
                    {/* Technician actions */}
                    {hasRole(ROLES.TECHNICIEN) && incident.statut === 'Assigné' && incident.technicien_id === currentUser.id && (
                      <button className="fstt-btn fstt-btn-primary"
                        onClick={() => handleUpdateStatus(incident, 'En cours')}>
                        {t('incidents.startWork')}
                      </button>
                    )}
                    
                    {hasRole(ROLES.TECHNICIEN) && incident.statut === 'En cours' && incident.technicien_id === currentUser.id && (
                      <button className="fstt-btn fstt-btn-success"
                        onClick={() => {
                          setSelectedIncident(incident);
                          setShowModal({ ...showModal, resolveIncident: true });
                        }}>
                        {t('incidents.resolve')}
                      </button>
                    )}
                    
                    {/* Reporting Teacher actions */}
                    {hasRole(ROLES.ENSEIGNANT) && incident.enseignant_id === currentUser.id && incident.statut === 'Résolu' && (
                      <button className="fstt-btn fstt-btn-success"
                        onClick={() => handleCloseIncident(incident)}>
                        {t('incidents.close')}
                      </button>
                    )}
                    
                    {/* Admin can close any incident */}
                    {hasRole([ROLES.CHEF_DEPARTEMENT, ROLES.ADMIN]) && incident.statut === 'Résolu' && (
                      <button className="fstt-btn fstt-btn-success"
                        onClick={() => handleCloseIncident(incident)}>
                        {t('incidents.close')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="fstt-empty">{t('common.noData')}</p>
        )}
      </div>
      
      {/* Button to report new incidents - for teachers */}
      {hasRole(ROLES.ENSEIGNANT) && (
        <div className="fstt-incidents-actions">
          <button className="fstt-btn fstt-btn-primary"
            onClick={() => setShowModal({...showModal, reportIncident: true})}>
            {t('incidents.reportIncident')}
          </button>
        </div>
      )}
      
      {/* Modal for Reporting an Incident */}
      {showModal.reportIncident && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <div className="fstt-modal-header">
              <h3>{t('incidents.reportIncident')}</h3>
              <button className="fstt-modal-close" onClick={() => setShowModal({...showModal, reportIncident: false})}>×</button>
            </div>
            
            <form onSubmit={handleSubmitIncident} className="fstt-modal-body">
              <div className="fstt-form-group">
                <label htmlFor="description">{t('incidents.description')}</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="3"
                />
              </div>
              
              <div className="fstt-form-group">
                <label htmlFor="typeIncident">{t('incidents.type')}</label>
                <select
                  id="typeIncident"
                  name="typeIncident"
                  value={formData.typeIncident}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Matériel">Matériel</option>
                  <option value="Logiciel">Logiciel</option>
                  <option value="Réseau">Réseau</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              
              <div className="fstt-form-group">
                <label htmlFor="localisation">{t('incidents.location')}</label>
                <input
                  type="text"
                  id="localisation"
                  name="localisation"
                  value={formData.localisation}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="fstt-form-group">
                <label htmlFor="priorite">{t('incidents.priority')}</label>
                <select
                  id="priorite"
                  name="priorite"
                  value={formData.priorite}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Basse">{t('incidents.lowPriority')}</option>
                  <option value="Moyenne">{t('incidents.mediumPriority')}</option>
                  <option value="Haute">{t('incidents.highPriority')}</option>
                </select>
              </div>
              
              <div className="fstt-form-actions">
                <button 
                  type="button" 
                  className="fstt-btn" 
                  onClick={() => setShowModal({...showModal, reportIncident: false})}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="fstt-btn fstt-btn-primary">
                  {t('common.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal for Viewing Incident Details */}
      {showModal.viewIncident && selectedIncident && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <div className="fstt-modal-header">
              <h3>{t('incidents.details')}</h3>
              <button className="fstt-modal-close" onClick={() => setShowModal({...showModal, viewIncident: false})}>×</button>
            </div>
            
            <div className="fstt-modal-body">
              <div className="fstt-incident-detail">
                <div className="fstt-detail-item">
                  <span className="fstt-detail-label">{t('incidents.id')}:</span>
                  <span className="fstt-detail-value">{selectedIncident.id}</span>
                </div>
                
                <div className="fstt-detail-item">
                  <span className="fstt-detail-label">{t('incidents.description')}:</span>
                  <span className="fstt-detail-value">{selectedIncident.description}</span>
                </div>
                
                <div className="fstt-detail-item">
                  <span className="fstt-detail-label">{t('incidents.type')}:</span>
                  <span className="fstt-detail-value">{selectedIncident.typeIncident || 'Non spécifié'}</span>
                </div>
                
                <div className="fstt-detail-item">
                  <span className="fstt-detail-label">{t('incidents.location')}:</span>
                  <span className="fstt-detail-value">{selectedIncident.localisation || 'Non spécifié'}</span>
                </div>
                
                <div className="fstt-detail-item">
                  <span className="fstt-detail-label">{t('incidents.priority')}:</span>
                  <span className={`fstt-badge priority-${selectedIncident.priorite.toLowerCase()}`}>
                    {selectedIncident.priorite}
                  </span>
                </div>
                
                <div className="fstt-detail-item">
                  <span className="fstt-detail-label">{t('incidents.status')}:</span>
                  <span className={`fstt-badge status-${selectedIncident.statut.toLowerCase().replace(' ', '-')}`}>
                    {selectedIncident.statut}
                  </span>
                </div>
                
                <div className="fstt-detail-item">
                  <span className="fstt-detail-label">{t('incidents.submissionDate')}:</span>
                  <span className="fstt-detail-value">
                    {new Date(selectedIncident.dateSoumission).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="fstt-detail-item">
                  <span className="fstt-detail-label">{t('incidents.reporter')}:</span>
                  <span className="fstt-detail-value">{selectedIncident.reporterName}</span>
                </div>
                
                <div className="fstt-detail-item">
                  <span className="fstt-detail-label">{t('incidents.technician')}:</span>
                  <span className="fstt-detail-value">{selectedIncident.technicianName}</span>
                </div>
                
                {selectedIncident.solution && (
                  <>
                    <div className="fstt-detail-item">
                      <span className="fstt-detail-label">{t('incidents.resolution')}:</span>
                      <span className="fstt-detail-value">{selectedIncident.solution}</span>
                    </div>
                    
                    {selectedIncident.dateResolution && (
                      <div className="fstt-detail-item">
                        <span className="fstt-detail-label">{t('incidents.resolutionDate')}:</span>
                        <span className="fstt-detail-value">
                          {new Date(selectedIncident.dateResolution).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </>
                )}
                
                {selectedIncident.commentaire && (
                  <div className="fstt-detail-item">
                    <span className="fstt-detail-label">{t('incidents.comments')}:</span>
                    <span className="fstt-detail-value">{selectedIncident.commentaire}</span>
                  </div>
                )}
              </div>
              
              <div className="fstt-form-actions mt-4">
                <button 
                  className="fstt-btn"
                  onClick={() => setShowModal({...showModal, viewIncident: false})}
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for Resolving an Incident */}
      {showModal.resolveIncident && selectedIncident && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <div className="fstt-modal-header">
              <h3>{t('incidents.resolveIncident')}</h3>
              <button className="fstt-modal-close" onClick={() => setShowModal({...showModal, resolveIncident: false})}>×</button>
            </div>
            
            <form onSubmit={handleResolveIncident} className="fstt-modal-body">
              <div className="fstt-form-group">
                <label htmlFor="solution">{t('incidents.resolution')}</label>
                <textarea
                  id="solution"
                  name="solution"
                  value={resolutionData.solution}
                  onChange={handleResolutionChange}
                  required
                  rows="3"
                  placeholder={t('incidents.resolutionPlaceholder')}
                />
              </div>
              
              <div className="fstt-form-group">
                <label htmlFor="dateResolution">{t('incidents.resolutionDate')}</label>
                <input
                  type="date"
                  id="dateResolution"
                  name="dateResolution"
                  value={resolutionData.dateResolution}
                  onChange={handleResolutionChange}
                  required
                />
              </div>
              
              <div className="fstt-form-group">
                <label htmlFor="commentaire">{t('incidents.comments')}</label>
                <textarea
                  id="commentaire"
                  name="commentaire"
                  value={resolutionData.commentaire}
                  onChange={handleResolutionChange}
                  rows="2"
                  placeholder={t('incidents.commentsPlaceholder')}
                />
              </div>
              
              <div className="fstt-form-actions">
                <button 
                  type="button" 
                  className="fstt-btn" 
                  onClick={() => setShowModal({...showModal, resolveIncident: false})}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="fstt-btn fstt-btn-success">
                  {t('incidents.submitResolution')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Incidents;
