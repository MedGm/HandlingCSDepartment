import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import db from '../utils/db';
import './Resources.css';

/**
 * Resources management page component
 * Handles room reservations and equipment management
 * Implements the sequence diagrams for room reservations
 */
const Resources = () => {
  const { t } = useTranslation();
  const { currentUser, hasRole, ROLES } = useAuth();
  
  // State variables
  const [activeTab, setActiveTab] = useState('rooms');
  const [resources, setResources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState({
    requestReservation: false,
    viewResource: false,
    viewReservation: false,
    manageReservation: false,
    reportIssue: false
  });
  
  // Form data for reservation
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    purpose: '',
    attendees: ''
  });

  // Load resources (rooms) and reservations from the database
  useEffect(() => {
    const loadResourcesData = async () => {
      try {
        setLoading(true);
        
        // Get rooms
        const roomsData = await db.sallesCoursLabo.toArray();
        console.log("Loaded rooms:", roomsData);
        setResources(roomsData || []);
        
        // Get reservations based on user role
        let reservationsData = [];
        
        if (hasRole([ROLES.CHEF_DEPARTEMENT, ROLES.ADMIN, ROLES.COORDINATEUR])) {
          // Admins and coordinators see all reservations
          reservationsData = await db.demandesReservations.toArray();
        } else if (hasRole(ROLES.ENSEIGNANT)) {
          // Teachers see only their own reservations
          reservationsData = await db.demandesReservations
            .where('enseignant_id')
            .equals(currentUser.id)
            .toArray();
        }
        
        console.log("Loaded reservations:", reservationsData);
        
        // Get additional details for reservations
        const enhancedReservations = await Promise.all(reservationsData.map(async (res) => {
          // Get teacher name
          let teacherName = "Inconnu";
          if (res.enseignant_id) {
            const teacher = await db.personnes.get(res.enseignant_id);
            if (teacher) {
              const firstName = teacher.prenom || '';
              const lastName = teacher.nom || '';
              teacherName = `${firstName} ${lastName}`.trim() || "Inconnu";
            }
          }
          
          // Get room name
          let roomName = "Inconnue";
          if (res.salle_id) {
            const room = await db.sallesCoursLabo.get(res.salle_id);
            if (room) {
              roomName = room.nomSalle || room.id;
            }
          }
          
          return {
            ...res,
            teacherName,
            roomName
          };
        }));
        
        setReservations(enhancedReservations || []);
        
        // Load materials if we're a technician or admin
        if (hasRole([ROLES.TECHNICIEN, ROLES.ADMIN])) {
          const materialsData = await db.materiels.toArray();
          console.log("Loaded materials:", materialsData);
          setMaterials(materialsData || []);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching resources:', error);
        setError(t('common.error') + ': ' + error.message);
        setLoading(false);
      }
    };

    loadResourcesData();
  }, [currentUser, hasRole, ROLES, t]);
  
  // Filter resources based on search term and availability
  const filteredResources = resources.filter(resource => {
    const resourceName = resource.nomSalle || resource.id || '';
    const matchesSearch = resourceName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') {
      return matchesSearch;
    } else if (filter === 'available') {
      return matchesSearch && resource.disponibilite !== false;
    } else if (filter === 'unavailable') {
      return matchesSearch && resource.disponibilite === false;
    }
    
    return matchesSearch;
  });
  
  // Filter materials based on search term
  const filteredMaterials = materials.filter(material => {
    const materialName = material.nom || material.id || '';
    return materialName.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Filter reservations based on search term and status
  const filteredReservations = reservations.filter(reservation => {
    const roomName = reservation.roomName || '';
    const teacherName = reservation.teacherName || '';
    const matchesSearch = 
      roomName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      teacherName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString();
    } catch (error) {
      return date;
    }
  };

  // Check if the selected time slot conflicts with existing reservations
  const checkTimeConflict = () => {
    if (!selectedResource || !formData.date || !formData.startTime || !formData.endTime) {
      return false;
    }
    
    const requestedDate = formData.date;
    const requestedStart = new Date(`${formData.date}T${formData.startTime}`).getTime();
    const requestedEnd = new Date(`${formData.date}T${formData.endTime}`).getTime();
    
    // Validate time range
    if (requestedEnd <= requestedStart) {
      return true;
    }
    
    return reservations.some(reservation => {
      // Only consider approved or pending reservations for the same room
      if (
        reservation.salle_id !== selectedResource.id || 
        reservation.statut === 'Refusée'
      ) {
        return false;
      }
      
      // Skip if different date
      const resDate = new Date(reservation.dateReservation).toDateString();
      const reqDate = new Date(requestedDate).toDateString();
      if (resDate !== reqDate) {
        return false;
      }
      
      // Check for time overlap
      const resStart = new Date(`${reservation.dateReservation}T${reservation.heureDebut}`).getTime();
      const resEnd = new Date(`${reservation.dateReservation}T${reservation.heureFin}`).getTime();
      
      return (
        (requestedStart >= resStart && requestedStart < resEnd) || // Start during existing reservation
        (requestedEnd > resStart && requestedEnd <= resEnd) || // End during existing reservation
        (requestedStart <= resStart && requestedEnd >= resEnd) // Fully encompassing reservation
      );
    });
  };

  // Submit reservation request
  const handleSubmitReservation = async (e) => {
    e.preventDefault();
    
    try {
      if (!selectedResource) {
        setError(t('resources.noRoomSelected'));
        return;
      }
      
      // Check for time conflicts
      if (checkTimeConflict()) {
        setError(t('resources.timeConflict'));
        return;
      }
      
      // Create reservation request object
      const newReservation = {
        dateDemande: new Date().toISOString(),
        dateReservation: formData.date,
        heureDebut: formData.startTime,
        heureFin: formData.endTime,
        statut: 'En attente',
        enseignant_id: currentUser.id,
        salle_id: selectedResource.id,
        objet: formData.purpose,
        participants: formData.attendees || ''
      };
      
      // Add to database
      const id = await db.demandesReservations.add(newReservation);
      
      // Add to state with enhanced data
      setReservations([...reservations, {
        ...newReservation,
        id,
        teacherName: `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim(),
        roomName: selectedResource.nomSalle || selectedResource.id
      }]);
      
      // Close modal and reset form
      setShowModal({ ...showModal, requestReservation: false });
      setFormData({
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        purpose: '',
        attendees: ''
      });
      
      // Show success message
      setError({
        type: 'success',
        message: t('resources.reservationRequestSuccess')
      });
      
    } catch (error) {
      console.error('Error submitting reservation request:', error);
      setError({
        type: 'error',
        message: t('resources.reservationRequestError')
      });
    }
  };
  
  // Approve or reject reservation
  const handleReservationDecision = async (approve) => {
    if (!selectedReservation) return;
    
    try {
      const status = approve ? 'Acceptée' : 'Refusée';
      
      // Update reservation in database
      await db.demandesReservations.update(selectedReservation.id, {
        statut: status,
        dateDecision: new Date().toISOString(),
        responsable_id: currentUser.id
      });
      
      // Update in state
      setReservations(reservations.map(res => 
        res.id === selectedReservation.id 
        ? { ...res, statut: status, dateDecision: new Date().toISOString() } 
        : res
      ));
      
      // Close modal
      setShowModal({ ...showModal, manageReservation: false });
      setSelectedReservation(null);
      
      // Show success message
      setError({
        type: 'success',
        message: approve ? t('resources.reservationApproved') : t('resources.reservationRejected')
      });
      
    } catch (error) {
      console.error('Error processing reservation decision:', error);
      setError({
        type: 'error',
        message: t('resources.reservationDecisionError')
      });
    }
  };
  
  // Report an issue with a resource
  const handleReportIssue = async (e) => {
    e.preventDefault();
    
    try {
      // This would be implemented to create a technical incident
      // Similar to the code in Incidents.jsx
      setShowModal({ ...showModal, reportIssue: false });
      setError({
        type: 'success',
        message: t('resources.issueReportedSuccess')
      });
    } catch (error) {
      setError({
        type: 'error',
        message: t('resources.issueReportedError')
      });
    }
  };

  if (loading) {
    return <div className="fstt-loading">{t('common.loading')}</div>;
  }

  return (
    <div className="fstt-resources ns">
      <h1>{t('resources.title')}</h1>
      
      {error && (
        <div className={`fstt-alert fstt-alert-${error.type || 'error'}`}>
          {error.message || error}
          <button 
            onClick={() => setError(null)}
            className="fstt-alert-close"
          >×</button>
        </div>
      )}
      
      <div className="fstt-tabs">
        <button 
          className={`fstt-tab ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
        >
          {t('resources.rooms')}
        </button>
        <button 
          className={`fstt-tab ${activeTab === 'reservations' ? 'active' : ''}`}
          onClick={() => setActiveTab('reservations')}
        >
          {t('resources.reservations')}
        </button>
        {hasRole([ROLES.TECHNICIEN, ROLES.ADMIN]) && (
          <button 
            className={`fstt-tab ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
          >
            {t('resources.materials')}
          </button>
        )}
      </div>
      
      {/* ROOMS TAB */}
      {activeTab === 'rooms' && (
        <>
          <div className="fstt-resources-controls">
            <div className="fstt-search">
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="fstt-filter">
              <label htmlFor="availability-filter">{t('resources.availability')}:</label>
              <select 
                id="availability-filter" 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">{t('common.all')}</option>
                <option value="available">{t('resources.available')}</option>
                <option value="unavailable">{t('resources.unavailable')}</option>
              </select>
            </div>
          </div>
          
          <div className="fstt-resources-list">
            {filteredResources.length > 0 ? (
              <table className="fstt-table">
                <thead>
                  <tr>
                    <th>{t('resources.id')}</th>
                    <th>{t('resources.roomName')}</th>
                    <th>{t('resources.capacity')}</th>
                    <th>{t('resources.availability')}</th>
                    <th>{t('resources.type')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResources.map(resource => (
                    <tr key={resource.id}>
                      <td>{resource.id}</td>
                      <td>{resource.nomSalle}</td>
                      <td>{resource.capacite || '-'}</td>
                      <td>
                        <span className={`fstt-badge ${resource.disponibilite === false ? 'status-unavailable' : 'status-available'}`}>
                          {resource.disponibilite === false ? t('resources.unavailable') : t('resources.available')}
                        </span>
                      </td>
                      <td>{resource.type || '-'}</td>
                      <td>
                        <button 
                          className="fstt-btn"
                          onClick={() => {
                            setSelectedResource(resource);
                            setShowModal({...showModal, viewResource: true});
                          }}
                        >
                          {t('resources.view')}
                        </button>
                        
                        {hasRole([ROLES.ENSEIGNANT, ROLES.COORDINATEUR, ROLES.CHEF_DEPARTEMENT]) && 
                         resource.disponibilite !== false && (
                          <button 
                            className="fstt-btn fstt-btn-primary"
                            onClick={() => {
                              setSelectedResource(resource);
                              setShowModal({...showModal, requestReservation: true});
                            }}
                          >
                            {t('resources.requestReservation')}
                          </button>
                        )}
                        
                        <button 
                          className="fstt-btn fstt-btn-warning"
                          onClick={() => {
                            setSelectedResource(resource);
                            setShowModal({...showModal, reportIssue: true});
                          }}
                        >
                          {t('resources.reportIssue')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="fstt-empty">{t('resources.noRoomsFound')}</div>
            )}
          </div>
        </>
      )}
      
      {/* RESERVATIONS TAB */}
      {activeTab === 'reservations' && (
        <>
          <div className="fstt-resources-controls">
            <div className="fstt-search">
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {hasRole([ROLES.ENSEIGNANT]) && (
              <button 
                className="fstt-btn fstt-btn-primary"
                onClick={() => setActiveTab('rooms')}
              >
                {t('resources.makeReservation')}
              </button>
            )}
          </div>
          
          <div className="fstt-resources-list">
            {filteredReservations.length > 0 ? (
              <table className="fstt-table">
                <thead>
                  <tr>
                    <th>{t('resources.room')}</th>
                    <th>{t('resources.date')}</th>
                    <th>{t('resources.time')}</th>
                    <th>{t('resources.purpose')}</th>
                    <th>{t('resources.requester')}</th>
                    <th>{t('resources.status')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map(reservation => (
                    <tr key={reservation.id}>
                      <td>{reservation.roomName}</td>
                      <td>{formatDate(reservation.dateReservation)}</td>
                      <td>{reservation.heureDebut} - {reservation.heureFin}</td>
                      <td>{reservation.objet || '-'}</td>
                      <td>{reservation.teacherName}</td>
                      <td>
                        <span className={`fstt-badge status-${reservation.statut?.toLowerCase().replace(' ', '-')}`}>
                          {reservation.statut}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="fstt-btn"
                          onClick={() => {
                            setSelectedReservation(reservation);
                            setShowModal({...showModal, viewReservation: true});
                          }}
                        >
                          {t('common.view')}
                        </button>
                        
                        {/* Only admins, department heads, and coordinators can approve/reject reservations */}
                        {hasRole([ROLES.CHEF_DEPARTEMENT, ROLES.ADMIN, ROLES.COORDINATEUR]) && 
                         reservation.statut === 'En attente' && (
                          <button 
                            className="fstt-btn fstt-btn-primary"
                            onClick={() => {
                              setSelectedReservation(reservation);
                              setShowModal({...showModal, manageReservation: true});
                            }}
                          >
                            {t('resources.manage')}
                          </button>
                        )}
                        
                        {/* Teacher can cancel their own pending reservations */}
                        {hasRole([ROLES.ENSEIGNANT]) && 
                         reservation.enseignant_id === currentUser.id && 
                         reservation.statut === 'En attente' && (
                          <button 
                            className="fstt-btn fstt-btn-danger"
                            onClick={() => {
                              if (window.confirm(t('resources.cancelConfirmation'))) {
                                // Logic to cancel the reservation
                                db.demandesReservations.update(reservation.id, {
                                  statut: 'Annulée',
                                  dateDecision: new Date().toISOString()
                                }).then(() => {
                                  setReservations(reservations.map(res => 
                                    res.id === reservation.id 
                                    ? { ...res, statut: 'Annulée', dateDecision: new Date().toISOString() } 
                                    : res
                                  ));
                                  
                                  setError({
                                    type: 'success',
                                    message: t('resources.reservationCancelled')
                                  });
                                });
                              }
                            }}
                          >
                            {t('resources.cancel')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="fstt-empty">{t('resources.noReservations')}</div>
            )}
          </div>
        </>
      )}
      
      {/* MATERIALS TAB */}
      {activeTab === 'materials' && hasRole([ROLES.TECHNICIEN, ROLES.ADMIN]) && (
        <>
          <div className="fstt-resources-controls">
            <div className="fstt-search">
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {hasRole([ROLES.TECHNICIEN, ROLES.ADMIN]) && (
              <button className="fstt-btn fstt-btn-primary">
                {t('resources.addMaterial')}
              </button>
            )}
          </div>
          
          <div className="fstt-resources-list">
            {filteredMaterials.length > 0 ? (
              <table className="fstt-table">
                <thead>
                  <tr>
                    <th>{t('resources.id')}</th>
                    <th>{t('resources.materialName')}</th>
                    <th>{t('resources.type')}</th>
                    <th>{t('resources.status')}</th>
                    <th>{t('resources.location')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map(material => (
                    <tr key={material.id}>
                      <td>{material.id}</td>
                      <td>{material.nom}</td>
                      <td>{material.type || '-'}</td>
                      <td>
                        <span className={`fstt-badge status-${material.etat?.toLowerCase().replace(' ', '-') || 'available'}`}>
                          {material.etat || t('resources.available')}
                        </span>
                      </td>
                      <td>{material.localisation || '-'}</td>
                      <td>
                        <button className="fstt-btn">
                          {t('common.view')}
                        </button>
                        
                        {hasRole([ROLES.TECHNICIEN, ROLES.ADMIN]) && (
                          <button className="fstt-btn fstt-btn-primary">
                            {t('common.edit')}
                          </button>
                        )}
                        
                        <button className="fstt-btn fstt-btn-warning">
                          {t('resources.reportIssue')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="fstt-empty">{t('resources.noMaterials')}</div>
            )}
          </div>
        </>
      )}
      
      {/* MODALS */}
      
      {/* Room Reservation Modal */}
      {showModal.requestReservation && selectedResource && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <div className="fstt-modal-header">
              <h3>{t('resources.requestReservation')}: {selectedResource.nomSalle || selectedResource.id}</h3>
              <button 
                className="fstt-modal-close"
                onClick={() => setShowModal({...showModal, requestReservation: false})}
              >×</button>
            </div>
            
            <form onSubmit={handleSubmitReservation} className="fstt-modal-body">
              <div className="fstt-form-group">
                <label htmlFor="date">{t('resources.date')}</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]} // Can't reserve in the past
                  required
                />
              </div>
              
              <div className="fstt-form-row">
                <div className="fstt-form-group">
                  <label htmlFor="startTime">{t('resources.startTime')}</label>
                  <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="fstt-form-group">
                  <label htmlFor="endTime">{t('resources.endTime')}</label>
                  <input
                    type="time"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              {formData.startTime && formData.endTime && formData.date && checkTimeConflict() && (
                <div className="fstt-form-error">
                  {t('resources.timeConflict')}
                </div>
              )}
              
              <div className="fstt-form-group">
                <label htmlFor="purpose">{t('resources.purpose')}</label>
                <input
                  type="text"
                  id="purpose"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  required
                  placeholder={t('resources.purposePlaceholder')}
                />
              </div>
              
              <div className="fstt-form-group">
                <label htmlFor="attendees">{t('resources.attendees')}</label>
                <textarea
                  id="attendees"
                  name="attendees"
                  value={formData.attendees}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder={t('resources.attendeesPlaceholder')}
                />
              </div>
              
              <div className="fstt-form-actions">
                <button 
                  type="button" 
                  className="fstt-btn" 
                  onClick={() => setShowModal({...showModal, requestReservation: false})}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="fstt-btn fstt-btn-primary"
                  disabled={formData.date && formData.startTime && formData.endTime && checkTimeConflict()}
                >
                  {t('common.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* View Resource Modal */}
      {showModal.viewResource && selectedResource && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <div className="fstt-modal-header">
              <h3>{t('resources.roomDetails')}</h3>
              <button 
                className="fstt-modal-close"
                onClick={() => setShowModal({...showModal, viewResource: false})}
              >×</button>
            </div>
            
            <div className="fstt-modal-body">
              <div className="fstt-resource-details">
                <div className="fstt-detail-group">
                  <label>{t('resources.id')}</label>
                  <p>{selectedResource.id}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.roomName')}</label>
                  <p>{selectedResource.nomSalle || '-'}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.capacity')}</label>
                  <p>{selectedResource.capacite || '-'} {selectedResource.capacite ? t('resources.persons') : ''}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.availability')}</label>
                  <p>
                    <span className={`fstt-badge ${selectedResource.disponibilite === false ? 'status-unavailable' : 'status-available'}`}>
                      {selectedResource.disponibilite === false ? t('resources.unavailable') : t('resources.available')}
                    </span>
                  </p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.type')}</label>
                  <p>{selectedResource.type || '-'}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.location')}</label>
                  <p>{selectedResource.localisation || '-'}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.equipment')}</label>
                  <p>{selectedResource.equipement || '-'}</p>
                </div>
              </div>
              
              <div className="fstt-form-actions">
                <button 
                  className="fstt-btn"
                  onClick={() => setShowModal({...showModal, viewResource: false})}
                >
                  {t('common.close')}
                </button>
                
                {hasRole([ROLES.ENSEIGNANT, ROLES.COORDINATEUR, ROLES.CHEF_DEPARTEMENT]) && 
                 selectedResource.disponibilite !== false && (
                  <button 
                    className="fstt-btn fstt-btn-primary"
                    onClick={() => {
                      setShowModal({...showModal, viewResource: false, requestReservation: true});
                    }}
                  >
                    {t('resources.requestReservation')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* View Reservation Modal */}
      {showModal.viewReservation && selectedReservation && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <div className="fstt-modal-header">
              <h3>{t('resources.reservationDetails')}</h3>
              <button 
                className="fstt-modal-close"
                onClick={() => setShowModal({...showModal, viewReservation: false})}
              >×</button>
            </div>
            
            <div className="fstt-modal-body">
              <div className="fstt-resource-details">
                <div className="fstt-detail-group">
                  <label>{t('resources.room')}</label>
                  <p>{selectedReservation.roomName}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.date')}</label>
                  <p>{formatDate(selectedReservation.dateReservation)}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.time')}</label>
                  <p>{selectedReservation.heureDebut} - {selectedReservation.heureFin}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.requester')}</label>
                  <p>{selectedReservation.teacherName}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.requestDate')}</label>
                  <p>{formatDate(selectedReservation.dateDemande)}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.purpose')}</label>
                  <p>{selectedReservation.objet || '-'}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.attendees')}</label>
                  <p>{selectedReservation.participants || '-'}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.status')}</label>
                  <p>
                    <span className={`fstt-badge status-${selectedReservation.statut?.toLowerCase().replace(' ', '-')}`}>
                      {selectedReservation.statut}
                    </span>
                  </p>
                </div>
                
                {selectedReservation.dateDecision && (
                  <div className="fstt-detail-group">
                    <label>{t('resources.decisionDate')}</label>
                    <p>{formatDate(selectedReservation.dateDecision)}</p>
                  </div>
                )}
              </div>
              
              <div className="fstt-form-actions">
                <button 
                  className="fstt-btn"
                  onClick={() => setShowModal({...showModal, viewReservation: false})}
                >
                  {t('common.close')}
                </button>
                
                {hasRole([ROLES.CHEF_DEPARTEMENT, ROLES.ADMIN, ROLES.COORDINATEUR]) && 
                 selectedReservation.statut === 'En attente' && (
                  <button 
                    className="fstt-btn fstt-btn-primary"
                    onClick={() => {
                      setShowModal({...showModal, viewReservation: false, manageReservation: true});
                    }}
                  >
                    {t('resources.manage')}
                  </button>
                )}
                
                {hasRole([ROLES.ENSEIGNANT]) && 
                 selectedReservation.enseignant_id === currentUser.id && 
                 selectedReservation.statut === 'En attente' && (
                  <button 
                    className="fstt-btn fstt-btn-danger"
                    onClick={() => {
                      if (window.confirm(t('resources.cancelConfirmation'))) {
                        db.demandesReservations.update(selectedReservation.id, {
                          statut: 'Annulée',
                          dateDecision: new Date().toISOString()
                        }).then(() => {
                          setReservations(reservations.map(res => 
                            res.id === selectedReservation.id 
                            ? { ...res, statut: 'Annulée', dateDecision: new Date().toISOString() } 
                            : res
                          ));
                          
                          setShowModal({...showModal, viewReservation: false});
                          
                          setError({
                            type: 'success',
                            message: t('resources.reservationCancelled')
                          });
                        });
                      }
                    }}
                  >
                    {t('resources.cancel')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Manage Reservation Modal */}
      {showModal.manageReservation && selectedReservation && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <div className="fstt-modal-header">
              <h3>{t('resources.manageReservation')}</h3>
              <button 
                className="fstt-modal-close"
                onClick={() => setShowModal({...showModal, manageReservation: false})}
              >×</button>
            </div>
            
            <div className="fstt-modal-body">
              <div className="fstt-resource-details">
                <div className="fstt-detail-group">
                  <label>{t('resources.room')}</label>
                  <p>{selectedReservation.roomName}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.date')}</label>
                  <p>{formatDate(selectedReservation.dateReservation)}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.time')}</label>
                  <p>{selectedReservation.heureDebut} - {selectedReservation.heureFin}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.requester')}</label>
                  <p>{selectedReservation.teacherName}</p>
                </div>
                
                <div className="fstt-detail-group">
                  <label>{t('resources.purpose')}</label>
                  <p>{selectedReservation.objet || '-'}</p>
                </div>
              </div>
              
              <div className="fstt-reservation-decision">
                <h4>{t('resources.decisionRequired')}</h4>
                <p>{t('resources.decisionPrompt')}</p>
                
                <div className="fstt-decision-buttons">
                  <button 
                    className="fstt-btn fstt-btn-success"
                    onClick={() => handleReservationDecision(true)}
                  >
                    {t('resources.approve')}
                  </button>
                  
                  <button 
                    className="fstt-btn fstt-btn-danger"
                    onClick={() => handleReservationDecision(false)}
                  >
                    {t('resources.reject')}
                  </button>
                </div>
              </div>
              
              <div className="fstt-form-actions">
                <button 
                  className="fstt-btn"
                  onClick={() => setShowModal({...showModal, manageReservation: false})}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Report Issue Modal */}
      {showModal.reportIssue && selectedResource && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <div className="fstt-modal-header">
              <h3>{t('resources.reportIssue')}: {selectedResource.nomSalle || selectedResource.id}</h3>
              <button 
                className="fstt-modal-close"
                onClick={() => setShowModal({...showModal, reportIssue: false})}
              >×</button>
            </div>
            
            <form onSubmit={handleReportIssue} className="fstt-modal-body">
              <div className="fstt-form-group">
                <label htmlFor="issueType">{t('resources.issueType')}</label>
                <select id="issueType" name="issueType" required>
                  <option value="">{t('common.select')}</option>
                  <option value="material">{t('resources.issueMaterial')}</option>
                  <option value="software">{t('resources.issueSoftware')}</option>
                  <option value="network">{t('resources.issueNetwork')}</option>
                  <option value="facilities">{t('resources.issueFacilities')}</option>
                  <option value="other">{t('resources.issueOther')}</option>
                </select>
              </div>
              
              <div className="fstt-form-group">
                <label htmlFor="issueDescription">{t('resources.issueDescription')}</label>
                <textarea
                  id="issueDescription"
                  name="issueDescription"
                  rows="3"
                  required
                  placeholder={t('resources.issueDescriptionPlaceholder')}
                ></textarea>
              </div>
              
              <div className="fstt-form-group">
                <label htmlFor="issuePriority">{t('resources.issuePriority')}</label>
                <select id="issuePriority" name="issuePriority" required>
                  <option value="low">{t('resources.priorityLow')}</option>
                  <option value="medium" selected>{t('resources.priorityMedium')}</option>
                  <option value="high">{t('resources.priorityHigh')}</option>
                </select>
              </div>
              
              <div className="fstt-form-actions">
                <button 
                  type="button" 
                  className="fstt-btn" 
                  onClick={() => setShowModal({...showModal, reportIssue: false})}
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
    </div>
  );
};

export default Resources;
