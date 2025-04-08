/**
 * Models related to resource management
 * Based on the UML diagrams and sequence diagrams
 */

/**
 * Class representing a Room/Lab entity
 */
export class Salle {
  constructor(id, nomSalle, capacite, disponibilite = true, type, localisation) {
    this.id = id;
    this.nomSalle = nomSalle;
    this.capacite = capacite;
    this.disponibilite = disponibilite;
    this.type = type || 'Salle de cours'; // Default type
    this.localisation = localisation;
    this.equipement = '';
  }
  
  /**
   * Create Salle instance from database object
   * @param {Object} salleDb - Room data from database 
   * @returns {Salle} Salle instance
   */
  static fromDb(salleDb) {
    const salle = new Salle(
      salleDb.id,
      salleDb.nomSalle,
      salleDb.capacite,
      salleDb.disponibilite,
      salleDb.type,
      salleDb.localisation
    );
    
    if (salleDb.equipement) salle.equipement = salleDb.equipement;
    
    return salle;
  }
  
  /**
   * Convert to database object
   * @returns {Object} Database object
   */
  toDb() {
    return {
      id: this.id,
      nomSalle: this.nomSalle,
      capacite: this.capacite,
      disponibilite: this.disponibilite,
      type: this.type,
      localisation: this.localisation,
      equipement: this.equipement
    };
  }
  
  /**
   * Check if the room is available for a given time period
   * @param {Date} date - Date of reservation
   * @param {String} heureDebut - Start time (HH:MM format)
   * @param {String} heureFin - End time (HH:MM format)
   * @param {Array} existingReservations - List of existing reservations
   * @returns {Boolean} True if the room is available
   */
  verifierDisponibilite(date, heureDebut, heureFin, existingReservations) {
    // If room is marked as unavailable, it's not available for any time
    if (this.disponibilite === false) {
      return false;
    }
    
    // Check for conflicts with existing reservations
    const conflicts = existingReservations.filter(reservation => {
      // Only check reservations for this room
      if (reservation.salle_id !== this.id) return false;
      
      // Only check reservations that are not rejected
      if (reservation.statut === 'Refusée' || reservation.statut === 'Annulée') {
        return false;
      }
      
      // Check if date matches
      const resDate = new Date(reservation.dateReservation).toDateString();
      const reqDate = new Date(date).toDateString();
      if (resDate !== reqDate) return false;
      
      // Check for time overlap
      const requestStart = new Date(`${date}T${heureDebut}`);
      const requestEnd = new Date(`${date}T${heureFin}`);
      const resStart = new Date(`${reservation.dateReservation}T${reservation.heureDebut}`);
      const resEnd = new Date(`${reservation.dateReservation}T${reservation.heureFin}`);
      
      return (
        (requestStart >= resStart && requestStart < resEnd) || // Start during existing reservation
        (requestEnd > resStart && requestEnd <= resEnd) || // End during existing reservation
        (requestStart <= resStart && requestEnd >= resEnd) // Fully encompassing reservation
      );
    });
    
    return conflicts.length === 0;
  }
  
  /**
   * Mark room as unavailable (e.g., for maintenance)
   * @param {String} raison - Reason for unavailability
   * @returns {Object} Updated room data
   */
  marquerIndisponible(raison) {
    this.disponibilite = false;
    
    return {
      id: this.id,
      disponibilite: this.disponibilite,
      raison: raison,
      date: new Date()
    };
  }
  
  /**
   * Mark room as available
   * @returns {Object} Updated room data
   */
  marquerDisponible() {
    this.disponibilite = true;
    
    return {
      id: this.id,
      disponibilite: this.disponibilite,
      date: new Date()
    };
  }
}

/**
 * Class representing a Reservation Request entity
 * Based on the "Soumettre une demande de réservation" sequence diagram
 */
export class DemandeReservation {
  constructor(id, dateDemande, dateReservation, statut, enseignant_id, salle_id) {
    this.id = id;
    this.dateDemande = dateDemande || new Date().toISOString();
    this.dateReservation = dateReservation;
    this.statut = statut || 'En attente';
    this.enseignant_id = enseignant_id;
    this.salle_id = salle_id;
    this.dateDecision = null;
    this.responsable_id = null;
    this.motifRefus = null;
  }
  
  /**
   * Create DemandeReservation instance from database object
   * @param {Object} reservationDb - Reservation data from database 
   * @returns {DemandeReservation} DemandeReservation instance
   */
  static fromDb(reservationDb) {
    const reservation = new DemandeReservation(
      reservationDb.id,
      reservationDb.dateDemande,
      reservationDb.dateReservation,
      reservationDb.statut,
      reservationDb.enseignant_id,
      reservationDb.salle_id
    );
    
    // Add additional properties
    reservation.heureDebut = reservationDb.heureDebut;
    reservation.heureFin = reservationDb.heureFin;
    reservation.objet = reservationDb.objet;
    reservation.participants = reservationDb.participants;
    reservation.dateDecision = reservationDb.dateDecision;
    reservation.responsable_id = reservationDb.responsable_id;
    reservation.motifRefus = reservationDb.motifRefus;
    
    return reservation;
  }
  
  /**
   * Convert to database object
   * @returns {Object} Database object
   */
  toDb() {
    return {
      id: this.id,
      dateDemande: this.dateDemande,
      dateReservation: this.dateReservation,
      heureDebut: this.heureDebut,
      heureFin: this.heureFin,
      statut: this.statut,
      enseignant_id: this.enseignant_id,
      salle_id: this.salle_id,
      objet: this.objet,
      participants: this.participants,
      dateDecision: this.dateDecision,
      responsable_id: this.responsable_id,
      motifRefus: this.motifRefus
    };
  }
  
  /**
   * Check room availability for this reservation 
   * @param {Salle} salle - Room to check
   * @param {Array} existingReservations - List of existing reservations
   * @returns {Boolean} True if room is available for the requested time
   */
  verifierDisponibiliteSalle(salle, existingReservations) {
    return salle.verifierDisponibilite(
      this.dateReservation,
      this.heureDebut,
      this.heureFin,
      existingReservations
    );
  }
  
  /**
   * Approve reservation request
   * @param {String} responsableId - ID of the person approving the request
   * @returns {Object} Updated reservation
   */
  approuverDemande(responsableId) {
    this.statut = 'Acceptée';
    this.dateDecision = new Date().toISOString();
    this.responsable_id = responsableId;
    
    return this;
  }
  
  /**
   * Reject reservation request
   * @param {String} responsableId - ID of the person rejecting the request
   * @param {String} motif - Reason for rejection
   * @returns {Object} Updated reservation
   */
  refuserDemande(responsableId, motif = '') {
    this.statut = 'Refusée';
    this.dateDecision = new Date().toISOString();
    this.responsable_id = responsableId;
    this.motifRefus = motif;
    
    return this;
  }
  
  /**
   * Cancel reservation (by the requester)
   * @returns {Object} Updated reservation
   */
  annulerDemande() {
    this.statut = 'Annulée';
    this.dateDecision = new Date().toISOString();
    
    return this;
  }
}

/**
 * Class representing technical equipment or material
 */
export class Materiel {
  constructor(id, nom, type = 'Informatique', etat = 'Disponible', localisation) {
    this.id = id;
    this.nom = nom;
    this.type = type;
    this.etat = etat; // Disponible, En prêt, En maintenance, Hors service
    this.localisation = localisation;
    this.dateAcquisition = null;
    this.derniereMaintenance = null;
  }
  
  /**
   * Create Materiel instance from database object
   * @param {Object} materielDb - Equipment data from database 
   * @returns {Materiel} Materiel instance
   */
  static fromDb(materielDb) {
    const materiel = new Materiel(
      materielDb.id,
      materielDb.nom,
      materielDb.type,
      materielDb.etat,
      materielDb.localisation
    );
    
    if (materielDb.dateAcquisition) materiel.dateAcquisition = materielDb.dateAcquisition;
    if (materielDb.derniereMaintenance) materiel.derniereMaintenance = materielDb.derniereMaintenance;
    
    return materiel;
  }
  
  /**
   * Convert to database object
   * @returns {Object} Database object
   */
  toDb() {
    return {
      id: this.id,
      nom: this.nom,
      type: this.type,
      etat: this.etat,
      localisation: this.localisation,
      dateAcquisition: this.dateAcquisition,
      derniereMaintenance: this.derniereMaintenance
    };
  }
  
  /**
   * Mark equipment as under maintenance
   * @param {String} raison - Reason for maintenance
   * @returns {Object} Maintenance record
   */
  mettreEnMaintenance(raison) {
    this.etat = 'En maintenance';
    this.derniereMaintenance = new Date().toISOString();
    
    return {
      materiel_id: this.id,
      raison: raison,
      dateDebut: this.derniereMaintenance,
      statut: 'En cours'
    };
  }
  
  /**
   * Mark equipment as out of service
   * @param {String} raison - Reason for being out of service
   * @returns {Object} Updated equipment data
   */
  mettreHorsService(raison) {
    this.etat = 'Hors service';
    
    return {
      materiel_id: this.id,
      raison: raison,
      date: new Date().toISOString(),
      statut: 'Hors service'
    };
  }
  
  /**
   * Mark equipment as available after maintenance/repair
   * @param {String} commentaire - Maintenance comment
   * @returns {Object} Maintenance completion record
   */
  terminerMaintenance(commentaire = '') {
    this.etat = 'Disponible';
    
    return {
      materiel_id: this.id,
      dateFinMaintenance: new Date().toISOString(),
      commentaire: commentaire,
      statut: 'Disponible'
    };
  }
}

/**
 * Class representing a technical incident
 * Based on the "Soumettre un incident technique" sequence diagram
 */
export class IncidentTechnique {
  constructor(id, description, dateSoumission, statut, enseignant_id = null, technicien_id = null) {
    this.id = id;
    this.description = description;
    this.dateSoumission = dateSoumission || new Date().toISOString();
    this.statut = statut || 'Soumis';
    this.enseignant_id = enseignant_id;
    this.technicien_id = technicien_id;
    this.priorite = 'Moyenne';
    this.solution = null;
    this.dateResolution = null;
    this.commentaire = null;
    this.localisation = null;
    this.typeIncident = null;
  }
  
  /**
   * Create IncidentTechnique instance from database object
   * @param {Object} incidentDb - Incident data from database 
   * @returns {IncidentTechnique} IncidentTechnique instance
   */
  static fromDb(incidentDb) {
    const incident = new IncidentTechnique(
      incidentDb.id,
      incidentDb.description,
      incidentDb.dateSoumission,
      incidentDb.statut,
      incidentDb.enseignant_id,
      incidentDb.technicien_id
    );
    
    // Add additional properties
    if (incidentDb.priorite) incident.priorite = incidentDb.priorite;
    if (incidentDb.solution) incident.solution = incidentDb.solution;
    if (incidentDb.dateResolution) incident.dateResolution = incidentDb.dateResolution;
    if (incidentDb.commentaire) incident.commentaire = incidentDb.commentaire;
    if (incidentDb.localisation) incident.localisation = incidentDb.localisation;
    if (incidentDb.typeIncident) incident.typeIncident = incidentDb.typeIncident;
    
    return incident;
  }
  
  /**
   * Convert to database object
   * @returns {Object} Database object
   */
  toDb() {
    return {
      id: this.id,
      description: this.description,
      dateSoumission: this.dateSoumission,
      statut: this.statut,
      enseignant_id: this.enseignant_id,
      technicien_id: this.technicien_id,
      priorite: this.priorite,
      solution: this.solution,
      dateResolution: this.dateResolution,
      commentaire: this.commentaire,
      localisation: this.localisation,
      typeIncident: this.typeIncident
    };
  }
  
  /**
   * Assign incident to a technician
   * @param {String} technicienId - ID of the technician
   * @returns {Object} Updated incident
   */
  assignerTechnicien(technicienId) {
    this.technicien_id = technicienId;
    this.statut = 'Assigné';
    
    return this;
  }
  
  /**
   * Update incident status to "in progress"
   * @returns {Object} Updated incident
   */
  demarrerTraitement() {
    this.statut = 'En cours';
    
    return this;
  }
  
  /**
   * Resolve the incident
   * @param {String} solution - Solution description
   * @param {String} commentaire - Additional comments
   * @returns {Object} Updated incident
   */
  resoudreIncident(solution, commentaire = '') {
    this.statut = 'Résolu';
    this.solution = solution;
    this.dateResolution = new Date().toISOString();
    this.commentaire = commentaire;
    
    return this;
  }
  
  /**
   * Close the incident (after resolution)
   * @returns {Object} Updated incident
   */
  cloturerIncident() {
    this.statut = 'Clôturé';
    
    return this;
  }
}
