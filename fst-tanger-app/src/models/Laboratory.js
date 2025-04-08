/**
 * Models related to laboratory management
 * Based on the UML activity diagram
 */

/**
 * Class representing a Laboratory entity
 */
export class Laboratory {
  constructor(id, name, description, encadrant_id) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.encadrant_id = encadrant_id;
    this.materials = [];
    this.projects = [];
    this.sessions = [];
  }

  static fromDb(laboratoryDb) {
    return new Laboratory(
      laboratoryDb.id,
      laboratoryDb.name,
      laboratoryDb.description,
      laboratoryDb.encadrant_id
    );
  }

  toDb() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      encadrant_id: this.encadrant_id
    };
  }
}

/**
 * Class representing a Laboratory Session entity
 */
export class LaboratorySession {
  constructor(id, laboratory_id, date, startTime, endTime, titre, description) {
    this.id = id;
    this.laboratory_id = laboratory_id;
    this.date = date;
    this.startTime = startTime;
    this.endTime = endTime;
    this.titre = titre;
    this.description = description;
    this.reservations = [];
    this.status = 'Pending'; // Pending, Approved, Rejected
  }

  /**
   * Verifies if the session is available for reservation
   * @returns {boolean} true if the session is available
   */
  verifierDisponibilite() {
    // Check if the session is not already fully booked
    return this.reservations.length < this.capacity && this.status !== 'Rejected';
  }

  /**
   * Creates a new laboratory session
   * @param {string} userId - ID of the user creating the session
   * @returns {Object} - Session creation result
   */
  creerSession(userId) {
    if (!userId) {
      return { success: false, message: "User ID is required" };
    }
    
    this.created_by = userId;
    this.status = 'Pending';
    this.created_at = new Date();
    
    return {
      success: true,
      message: "Session created successfully",
      session: this
    };
  }
}

/**
 * Class representing a Project in the laboratory
 */
export class LaboratoryProject {
  constructor(id, laboratory_id, name, description, start_date, end_date, status) {
    this.id = id;
    this.laboratory_id = laboratory_id;
    this.name = name;
    this.description = description;
    this.start_date = start_date;
    this.end_date = end_date;
    this.status = status || 'Planning'; // Planning, In Progress, Completed, Cancelled
    this.researchers = [];
    this.documents = [];
  }

  /**
   * Creates a new research project
   * @returns {Object} - Project creation result
   */
  creerNouveauProjet() {
    // Validate required fields
    if (!this.name || !this.laboratory_id) {
      return { success: false, message: "Project name and laboratory ID are required" };
    }
    
    this.created_at = new Date();
    
    return {
      success: true,
      message: "Project created successfully",
      project: this
    };
  }

  /**
   * Assigns researchers to the project
   * @param {Array} researcherIds - Array of researcher IDs
   * @returns {Object} - Assignment result
   */
  assignerChercheurs(researcherIds) {
    if (!Array.isArray(researcherIds) || researcherIds.length === 0) {
      return { success: false, message: "Valid researcher IDs are required" };
    }
    
    this.researchers = [...this.researchers, ...researcherIds];
    
    return {
      success: true,
      message: "Researchers assigned successfully",
      researchers: this.researchers
    };
  }

  /**
   * Starts the research process
   * @returns {Object} - Process initiation result
   */
  commencerProcessusDeRecherche() {
    if (this.status !== 'Planning') {
      return { success: false, message: "Project must be in Planning status to start research" };
    }
    
    this.status = 'In Progress';
    this.research_started_at = new Date();
    
    return {
      success: true,
      message: "Research process started successfully"
    };
  }

  /**
   * Finalizes the research project
   * @param {string} conclusion - Research conclusion
   * @returns {Object} - Finalization result
   */
  finaliserRecherche(conclusion) {
    if (this.status !== 'In Progress') {
      return { success: false, message: "Project must be in progress to finalize" };
    }
    
    if (!conclusion) {
      return { success: false, message: "Research conclusion is required" };
    }
    
    this.status = 'Completed';
    this.conclusion = conclusion;
    this.completed_at = new Date();
    
    return {
      success: true,
      message: "Research finalized successfully"
    };
  }

  /**
   * Publishes a research article
   * @param {Object} articleData - Article details
   * @returns {Object} - Publication result
   */
  publierArticle(articleData) {
    if (this.status !== 'Completed') {
      return { success: false, message: "Research must be completed before publishing" };
    }
    
    if (!articleData || !articleData.title || !articleData.content) {
      return { success: false, message: "Article title and content are required" };
    }
    
    const article = {
      ...articleData,
      project_id: this.id,
      published_at: new Date()
    };
    
    this.publications = this.publications || [];
    this.publications.push(article);
    
    return {
      success: true,
      message: "Article published successfully",
      article
    };
  }
}

/**
 * Class representing Material in the laboratory
 */
export class LaboratoryMaterial {
  constructor(id, laboratory_id, name, type, quantity, status) {
    this.id = id;
    this.laboratory_id = laboratory_id;
    this.name = name;
    this.type = type;
    this.quantity = quantity;
    this.status = status || 'Available'; // Available, Reserved, In Use, Maintenance
    this.reservations = [];
  }

  /**
   * Reserves material for use
   * @param {string} userId - ID of the user reserving the material
   * @param {Date} startDate - Start date of reservation
   * @param {Date} endDate - End date of reservation
   * @returns {Object} - Reservation result
   */
  reserverMateriel(userId, startDate, endDate) {
    if (!userId || !startDate || !endDate) {
      return { success: false, message: "User ID, start date, and end date are required" };
    }
    
    if (this.status === 'Maintenance') {
      return { success: false, message: "Material is currently under maintenance" };
    }
    
    if (this.quantity <= 0) {
      return { success: false, message: "No quantity available for reservation" };
    }
    
    const reservation = {
      id: Date.now(), // Simple ID generation
      material_id: this.id,
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      status: 'Pending',
      created_at: new Date()
    };
    
    this.reservations.push(reservation);
    
    return {
      success: true,
      message: "Material reservation request submitted",
      reservation
    };
  }

  /**
   * Approves a material usage request
   * @param {string} reservationId - ID of the reservation to approve
   * @returns {Object} - Approval result
   */
  approuverDemandesMateriel(reservationId) {
    const reservationIndex = this.reservations.findIndex(r => r.id === reservationId);
    
    if (reservationIndex === -1) {
      return { success: false, message: "Reservation not found" };
    }
    
    if (this.quantity <= 0) {
      return { success: false, message: "No quantity available for approval" };
    }
    
    this.reservations[reservationIndex].status = 'Approved';
    this.reservations[reservationIndex].approved_at = new Date();
    this.quantity -= 1; // Decrease available quantity
    
    return {
      success: true,
      message: "Material request approved successfully"
    };
  }

  /**
   * Requests an alternative for unavailable material
   * @param {string} userId - ID of the user requesting alternative
   * @param {string} comment - Comment explaining the need
   * @returns {Object} - Alternative request result
   */
  demanderAlternative(userId, comment) {
    if (!userId) {
      return { success: false, message: "User ID is required" };
    }
    
    const request = {
      id: Date.now(),
      material_id: this.id,
      user_id: userId,
      comment: comment || "Request for alternative material",
      status: 'Pending',
      created_at: new Date()
    };
    
    this.alternative_requests = this.alternative_requests || [];
    this.alternative_requests.push(request);
    
    return {
      success: true,
      message: "Alternative material request submitted",
      request
    };
  }
}

/**
 * Class representing a Reservation in the laboratory
 */
export class LaboratoryReservation {
  constructor(id, user_id, resource_type, resource_id, start_date, end_date, status) {
    this.id = id;
    this.user_id = user_id;
    this.resource_type = resource_type; // 'Session', 'Material'
    this.resource_id = resource_id;
    this.start_date = start_date;
    this.end_date = end_date;
    this.status = status || 'Pending'; // Pending, Approved, Rejected, Completed
  }

  /**
   * Validates a reservation request
   * @param {string} validatorId - ID of the validator
   * @param {boolean} isApproved - Whether the reservation is approved
   * @param {string} comment - Optional comment
   * @returns {Object} - Validation result
   */
  validerReservation(validatorId, isApproved, comment = '') {
    if (!validatorId) {
      return { success: false, message: "Validator ID is required" };
    }
    
    this.validator_id = validatorId;
    this.validated_at = new Date();
    this.validation_comment = comment;
    
    if (isApproved) {
      this.status = 'Approved';
      return {
        success: true,
        message: "Reservation approved successfully"
      };
    } else {
      this.status = 'Rejected';
      return {
        success: true,
        message: "Reservation rejected",
        reason: comment
      };
    }
  }

  /**
   * Requests an alternative time slot for rejected reservations
   * @param {Date} newStartDate - New proposed start date
   * @param {Date} newEndDate - New proposed end date
   * @returns {Object} - Alternative request result
   */
  demanderHoraireAlternatif(newStartDate, newEndDate) {
    if (this.status !== 'Rejected') {
      return { success: false, message: "Only rejected reservations can request alternatives" };
    }
    
    if (!newStartDate || !newEndDate) {
      return { success: false, message: "New start and end dates are required" };
    }
    
    const alternativeRequest = {
      original_reservation_id: this.id,
      new_start_date: newStartDate,
      new_end_date: newEndDate,
      status: 'Pending',
      requested_at: new Date()
    };
    
    this.alternative_requests = this.alternative_requests || [];
    this.alternative_requests.push(alternativeRequest);
    
    return {
      success: true,
      message: "Alternative time slot requested",
      alternativeRequest
    };
  }

  /**
   * Receives confirmation of the reservation
   * @returns {Object} - Confirmation details
   */
  recevoirConfirmation() {
    if (this.status !== 'Approved') {
      return { 
        success: false, 
        message: "No confirmation available", 
        status: this.status
      };
    }
    
    return {
      success: true,
      message: "Reservation confirmed",
      details: {
        id: this.id,
        resource_type: this.resource_type,
        resource_id: this.resource_id,
        start_date: this.start_date,
        end_date: this.end_date,
        status: this.status,
        validated_at: this.validated_at,
        validator_id: this.validator_id
      }
    };
  }

  /**
   * Receives alternative proposals for rejected reservations
   * @returns {Array} - List of alternative proposals
   */
  recevoirPropositions() {
    if (!this.alternative_proposals || this.alternative_proposals.length === 0) {
      return { success: false, message: "No alternative proposals available" };
    }
    
    return {
      success: true,
      message: "Alternative proposals retrieved",
      proposals: this.alternative_proposals
    };
  }

  /**
   * Chooses one of the alternative proposals
   * @param {string} proposalId - ID of the chosen proposal
   * @returns {Object} - Selection result
   */
  choisirUneProposition(proposalId) {
    if (!this.alternative_proposals || this.alternative_proposals.length === 0) {
      return { success: false, message: "No alternative proposals available" };
    }
    
    const selectedProposal = this.alternative_proposals.find(p => p.id === proposalId);
    
    if (!selectedProposal) {
      return { success: false, message: "Proposal not found" };
    }
    
    // Update the reservation with the chosen alternative
    this.start_date = selectedProposal.start_date;
    this.end_date = selectedProposal.end_date;
    this.status = 'Approved';
    this.chosen_proposal_id = proposalId;
    this.updated_at = new Date();
    
    return {
      success: true,
      message: "Alternative proposal selected",
      updatedReservation: {
        id: this.id,
        start_date: this.start_date,
        end_date: this.end_date,
        status: this.status,
        chosen_proposal_id: proposalId
      }
    };
  }
}

/**
 * Class handling laboratory scheduling and resource management
 */
export class LaboratoryManager {
  constructor() {
    this.sessions = [];
    this.materials = [];
    this.reservations = [];
    this.projects = [];
  }

  /**
   * Synchronizes reservations across the system
   * @returns {Object} - Synchronization result
   */
  synchroniserReservations() {
    // This would typically involve checking for conflicts and updating statuses
    const conflicts = [];
    
    // Check for time overlaps in reservations
    this.reservations.forEach(res1 => {
      this.reservations.forEach(res2 => {
        if (res1.id !== res2.id && 
            res1.resource_id === res2.resource_id &&
            res1.resource_type === res2.resource_type &&
            res1.status === 'Approved' && 
            res2.status === 'Approved') {
          
          // Check for time overlap
          if ((res1.start_date <= res2.end_date && res1.end_date >= res2.start_date)) {
            conflicts.push({
              reservation1: res1.id,
              reservation2: res2.id,
              resource: res1.resource_id,
              type: res1.resource_type
            });
          }
        }
      });
    });
    
    return {
      success: conflicts.length === 0,
      message: conflicts.length === 0 ? 
        "Reservations synchronized successfully" : 
        "Conflicts detected in reservations",
      conflicts
    };
  }

  /**
   * Manages the laboratory schedule
   * @returns {Object} - Schedule management result
   */
  gererEmploiDuTemps() {
    // Organize sessions by day of week
    const schedule = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    };
    
    this.sessions.forEach(session => {
      const date = new Date(session.date);
      const day = date.toLocaleString('en-us', { weekday: 'long' });
      
      if (schedule[day]) {
        schedule[day].push({
          id: session.id,
          title: session.titre,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.status
        });
      }
    });
    
    // Sort sessions by start time
    Object.keys(schedule).forEach(day => {
      schedule[day].sort((a, b) => {
        return a.startTime.localeCompare(b.startTime);
      });
    });
    
    return {
      success: true,
      message: "Schedule generated successfully",
      schedule
    };
  }

  /**
   * Manages laboratory equipment and materials
   * @returns {Object} - Material management result
   */
  gererMateriel() {
    // Group materials by type
    const materialsByType = {};
    
    this.materials.forEach(material => {
      if (!materialsByType[material.type]) {
        materialsByType[material.type] = [];
      }
      
      materialsByType[material.type].push({
        id: material.id,
        name: material.name,
        quantity: material.quantity,
        status: material.status
      });
    });
    
    // Calculate inventory statistics
    const totalItems = this.materials.length;
    const availableItems = this.materials.filter(m => m.status === 'Available').length;
    const reservedItems = this.materials.filter(m => m.status === 'Reserved').length;
    const maintenanceItems = this.materials.filter(m => m.status === 'Maintenance').length;
    
    return {
      success: true,
      message: "Materials inventory retrieved",
      materialsByType,
      statistics: {
        total: totalItems,
        available: availableItems,
        reserved: reservedItems,
        maintenance: maintenanceItems,
        availabilityRate: totalItems > 0 ? (availableItems / totalItems * 100) : 0
      }
    };
  }

  /**
   * Manages research projects
   * @returns {Object} - Project management result
   */
  gererProjets() {
    // Group projects by status
    const projectsByStatus = {
      Planning: [],
      'In Progress': [],
      Completed: [],
      Cancelled: []
    };
    
    this.projects.forEach(project => {
      if (projectsByStatus[project.status]) {
        projectsByStatus[project.status].push({
          id: project.id,
          name: project.name,
          start_date: project.start_date,
          end_date: project.end_date,
          researchers: project.researchers ? project.researchers.length : 0
        });
      }
    });
    
    // Calculate project statistics
    const totalProjects = this.projects.length;
    const activeProjects = this.projects.filter(p => p.status === 'In Progress').length;
    const completedProjects = this.projects.filter(p => p.status === 'Completed').length;
    
    return {
      success: true,
      message: "Projects retrieved successfully",
      projectsByStatus,
      statistics: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        completion_rate: totalProjects > 0 ? (completedProjects / totalProjects * 100) : 0
      }
    };
  }

  /**
   * Supervises research activities
   * @param {string} projectId - ID of the project to supervise
   * @returns {Object} - Supervision result
   */
  encadrerRecherche(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    
    if (!project) {
      return { success: false, message: "Project not found" };
    }
    
    // Check supervision requirements
    const hasResearchers = project.researchers && project.researchers.length > 0;
    const hasDescription = project.description && project.description.length > 0;
    const hasDates = project.start_date && project.end_date;
    
    const supervisionGaps = [];
    
    if (!hasResearchers) supervisionGaps.push("No researchers assigned");
    if (!hasDescription) supervisionGaps.push("Missing project description");
    if (!hasDates) supervisionGaps.push("Missing project dates");
    
    return {
      success: supervisionGaps.length === 0,
      message: supervisionGaps.length === 0 ? 
        "Project supervision is adequate" : 
        "Project supervision has gaps",
      gaps: supervisionGaps,
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        researchers: project.researchers,
        start_date: project.start_date,
        end_date: project.end_date
      }
    };
  }

  /**
   * Performs a global validation of laboratory activities
   * @returns {Object} - Validation result
   */
  validationGlobale() {
    const issues = [];
    
    // Check for sessions without reservations
    const unusedSessions = this.sessions.filter(
      s => !this.reservations.some(
        r => r.resource_type === 'Session' && r.resource_id === s.id
      )
    );
    
    if (unusedSessions.length > 0) {
      issues.push(`${unusedSessions.length} sessions without reservations`);
    }
    
    // Check for materials with low quantities
    const lowStockMaterials = this.materials.filter(m => m.quantity < 2);
    
    if (lowStockMaterials.length > 0) {
      issues.push(`${lowStockMaterials.length} materials with low stock`);
    }
    
    // Check for projects without researchers
    const unmannedProjects = this.projects.filter(
      p => !p.researchers || p.researchers.length === 0
    );
    
    if (unmannedProjects.length > 0) {
      issues.push(`${unmannedProjects.length} projects without researchers`);
    }
    
    return {
      success: issues.length === 0,
      message: issues.length === 0 ? 
        "Global validation successful" : 
        "Global validation found issues",
      issues,
      timestamp: new Date()
    };
  }

  /**
   * Synchronizes resource management across the laboratory
   * @returns {Object} - Synchronization result
   */
  synchroniserGestionRessources() {
    // Update material availability based on reservations
    this.materials.forEach(material => {
      const activeReservations = this.reservations.filter(
        r => r.resource_type === 'Material' && 
             r.resource_id === material.id &&
             r.status === 'Approved' &&
             new Date(r.end_date) >= new Date()
      );
      
      // Update material status based on reservations
      if (activeReservations.length >= material.quantity) {
        material.status = 'Reserved';
      } else if (material.status !== 'Maintenance') {
        material.status = 'Available';
      }
    });
    
    // Update session availability
    this.sessions.forEach(session => {
      const sessionReservations = this.reservations.filter(
        r => r.resource_type === 'Session' && 
             r.resource_id === session.id &&
             r.status === 'Approved'
      );
      
      session.reservations = sessionReservations;
    });
    
    return {
      success: true,
      message: "Resource management synchronized successfully",
      timestamp: new Date()
    };
  }

  /**
   * Handles final synchronization of laboratory data
   * @returns {Object} - Final synchronization result
   */
  synchronisationFinale() {
    const resSync = this.synchroniserReservations();
    const resManagement = this.synchroniserGestionRessources();
    const validation = this.validationGlobale();
    
    return {
      success: resSync.success && resManagement.success && validation.success,
      message: "Final synchronization completed",
      reservationSync: resSync,
      resourceManagement: resManagement,
      validation: validation,
      timestamp: new Date()
    };
  }
}
