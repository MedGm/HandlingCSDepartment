import Dexie from 'dexie';

/**
 * Database schema for FST Tanger Departmental Management System
 * Based on UML class diagram
 */
class FSTTDatabase extends Dexie {
  constructor() {
    super('FSTT_GenieInfo2'); // Creating a new database to avoid schema conflicts
    
    // Database schema definition
    this.version(1).stores({
      personnes: '++id, nom, email',
      enseignants: 'id, appogee, specialite',
      etudiants: 'id, appogee, prenom, dateNaissance, adresse',
      sallesCoursLabo: 'id, nomSalle, capacite, disponibilite',
      demandesReservation: '++id, dateDemande, dateReservation, statut, enseignant_id, salle_id, administration_id',
      incidentsTechniques: '++id, description, dateSoumission, statut, priorite, enseignant_id, technicien_id, administration_id',
      cours: 'code, titre, semestre, annee',
      chapitres: '++id, titre, contenu, cours_code',
      seances: '++id, date, duree, salle, type, cours_code',
      evaluations: '++id, type, date, matiere, note, cours_code, etudiant_id',
      notes: '++id, valeur, coefficient, evaluation_id, etudiant_id',
      absences: '++id, date, motif, justifiee, etudiant_id, cours_code',
      inscriptions: '++id, dateInscription, statut, etudiant_id, formation_code',
      formations: 'code, intitule, duree',
      
      // Enhanced stages table for internship management
      stages: '++id, dateDebut, dateFin, entreprise, sujet, etudiant_id, statut, rapportSoumis, dateSoutenance, note',
      
      // New tables for internship management
      rapportsStage: '++id, stage_id, etudiant_id, titre, contenu, date_soumission, statut',
      evaluationsStage: '++id, stage_id, etudiant_id, note, commentaire, date_evaluation, statut',
      activitesStage: '++id, stage_id, etudiant_id, activite, date, statut',
      convocationsSoutenance: '++id, stage_id, date_convocation, jury, date_soutenance',
      diplomesDelivres: '++id, stage_id, etudiant_id, date_delivrance, numero_diplome',
      
      deliberations: '++id, date, statut, administration_id',
      laboratoires: '++id, encadrant_id',
      chefDeLabo: 'id',
      personnels: 'id, specialite, laboratoire_id',
      projets: '++id, nom, personnel, encadrant, chef_labo_id',
      materiels: '++id, nom, type, quantite, chef_labo_id',
      emploiDuTemps: '[idSession+jour+intervalle], idSession, jour, intervalle, utilisateur_id, chef_labo_id',
      administration: 'id',
      techniciens: 'id, specialite',
      chefDepartement: 'id',
      coordinateurs: 'id',
      enseignantsCours: '[enseignant_id+cours_code]',
      etudiantsNotes: '[etudiant_id+note_id]',
      personnelsProjets: '[personnel_id+projet_id]',
      deliberationsAbsences: '[deliberation_id+absence_id]',
      deliberationsEvaluations: '[deliberation_id+evaluation_id]',
      metadata: 'key'
    });

    // Define relationships and collections
    this.personnes = this.table('personnes');
    this.enseignants = this.table('enseignants');
    this.etudiants = this.table('etudiants');
    this.sallesCoursLabo = this.table('sallesCoursLabo');
    this.demandesReservation = this.table('demandesReservation');
    this.incidentsTechniques = this.table('incidentsTechniques');
    this.cours = this.table('cours');
    this.chapitres = this.table('chapitres');
    this.seances = this.table('seances');
    this.evaluations = this.table('evaluations');
    this.notes = this.table('notes');
    this.absences = this.table('absences');
    this.inscriptions = this.table('inscriptions');
    this.formations = this.table('formations');
    
    // Define relationships for new tables
    this.stages = this.table('stages');
    this.rapportsStage = this.table('rapportsStage');
    this.evaluationsStage = this.table('evaluationsStage');
    this.activitesStage = this.table('activitesStage');
    this.convocationsSoutenance = this.table('convocationsSoutenance');
    this.diplomesDelivres = this.table('diplomesDelivres');
    
    this.deliberations = this.table('deliberations');
    this.laboratoires = this.table('laboratoires');
    this.chefDeLabo = this.table('chefDeLabo');
    this.personnels = this.table('personnels');
    this.projets = this.table('projets');
    this.materiels = this.table('materiels');
    this.emploiDuTemps = this.table('emploiDuTemps');
    this.administration = this.table('administration');
    this.techniciens = this.table('techniciens');
    this.chefDepartement = this.table('chefDepartement');
    this.coordinateurs = this.table('coordinateurs');
    this.enseignantsCours = this.table('enseignantsCours');
    this.etudiantsNotes = this.table('etudiantsNotes');
    this.personnelsProjets = this.table('personnelsProjets');
    this.deliberationsAbsences = this.table('deliberationsAbsences');
    this.deliberationsEvaluations = this.table('deliberationsEvaluations');
    this.metadata = this.table('metadata');
  }

  /**
   * Reset the database by deleting all data, then reinitializing with sample data
   * @param {boolean} initSampleData - Whether to initialize with sample data after reset
   * @returns {Promise<Object>} Result of the operation
   */
  async resetDatabase(initSampleData = true) {
    try {
      console.log('Resetting database...');
      
      // Close current connection
      await this.close();
      
      // Delete the database
      await Dexie.delete('FSTT_GenieInfo2');
      
      // Reopen the database (this will trigger schema creation)
      await this.open();
      
      console.log('Database reset successfully');
      
      // Initialize with sample data if requested
      if (initSampleData) {
        const initData = await import('./initData').then(module => module.default);
        await initData();
      }
      
      return { success: true, message: 'Base de données réinitialisée avec succès' };
    } catch (error) {
      console.error('Error resetting database:', error);
      return { success: false, message: `Erreur lors de la réinitialisation: ${error.message}` };
    }
  }
  
  /**
   * Check if the database has been initialized with data
   * @returns {Promise<boolean>}
   */
  async isDatabaseInitialized() {
    try {
      const personCount = await this.personnes.count();
      return personCount > 0;
    } catch (error) {
      console.error('Error checking database initialization:', error);
      return false;
    }
  }

  // Département constants
  static département = {
    nom: "GÉNIE INFORMATIQUE",
    chef: "Pr.EL BRAK Mohamed",
    contact: "melbrak@uae.ac.ma",
    formations: ["LICENCE", "MASTER", "INGENIERIE", "DOCTORAT"],
    salles: {
      "1ere": ["E01", "E02"],
      "2eme": ["E11", "E12", "E13", "E14", "E15", "E16", "E17", "E18"],
      "3eme": ["E21", "E22", "E23", "E24", "E25", "E26"]
    }
  };
}

// Create and export a singleton instance
const db = new FSTTDatabase();

/**
 * Check if a table exists and create it if needed
 * @param {String} tableName - Table name to check/create
 * @param {Object} schema - Schema definition for the table
 * @returns {Promise<Boolean>} True if table exists or was created
 */
db.ensureTable = async function(tableName, schema) {
  try {
    // Check if table exists
    const tableExists = this.tables.some(table => table.name === tableName);
    
    if (!tableExists) {
      console.log(`Creating ${tableName} table`);
      
      // Close current connection
      await this.close();
      
      // Calculate new version number
      const currentVersion = this.verno || 1;
      const newVersion = currentVersion + 1;
      
      // Create new schema version with the table
      this.version(newVersion).stores({
        [tableName]: schema
      });
      
      // Re-open connection with new schema
      await this.open();
      return true;
    }
    
    return true;
  } catch (error) {
    console.error(`Error ensuring ${tableName} table exists:`, error);
    return false;
  }
};

/**
 * Safely creates a database table if it doesn't exist
 * @param {String} tableName - Name of the table to create
 * @param {String} schema - Table schema definition (Dexie format)
 * @returns {Promise<Boolean>} True if operation succeeded
 */
db.createTableIfNotExists = async function(tableName, schema) {
  // Check if table already exists
  const tableExists = this.tables.some(table => table.name === tableName);
  if (tableExists) {
    return true;
  }

  try {
    // Close the database before modifying schema
    await this.close();
    
    // Calculate new version number
    const currentVersion = (this.verno || 1);
    const newVersion = currentVersion + 1;
    
    // Create schema definition
    const schemaDefinition = {};
    schemaDefinition[tableName] = schema;
    
    // Update database with new schema
    this.version(newVersion).stores(schemaDefinition);
    
    // Reopen the database with new schema
    await this.open();
    console.log(`Table '${tableName}' created successfully!`);
    return true;
  } catch (error) {
    console.error(`Error creating table '${tableName}':`, error);
    
    // Try to reopen database even if there was an error
    try {
      if (this.isOpen()) {
        return false;
      }
      await this.open();
    } catch (reopenError) {
      console.error('Error reopening database:', reopenError);
    }
    
    return false;
  }
};

/**
 * Create or update a student file
 * @param {string} etudiantId - ID of the student
 * @returns {Object} The created or updated student file
 */
db.createOrUpdateStudentFile = async function(etudiantId) {
  try {
    // Check if file already exists
    let dossier = await db.dossiers
      .where('etudiant_id')
      .equals(etudiantId)
      .first();
      
    if (!dossier) {
      // Create new file
      const id = Date.now().toString();
      dossier = {
        id,
        etudiant_id: etudiantId,
        dateCreation: new Date(),
        statut: 'En cours',
        documents: [],
        historique: [{
          action: 'creation',
          date: new Date(),
          details: 'Création du dossier étudiant'
        }]
      };
      
      await db.dossiers.add(dossier);
    }
    
    return dossier;
  } catch (error) {
    console.error('Error creating student file:', error);
    throw error;
  }
};

/**
 * Add a document to a student file
 * @param {string} dossierId - ID of the student file
 * @param {Object} document - Document to add
 * @returns {Object} Updated student file
 */
db.addDocumentToFile = async function(dossierId, document) {
  try {
    const dossier = await db.dossiers.get(dossierId);
    if (!dossier) {
      throw new Error('Student file not found');
    }
    
    if (!document.id) document.id = Date.now().toString();
    if (!document.dateAjout) document.dateAjout = new Date();
    document.isValid = false;
    
    dossier.documents = dossier.documents || [];
    dossier.documents.push(document);
    
    dossier.historique = dossier.historique || [];
    dossier.historique.push({
      action: 'document_added',
      document_id: document.id,
      date: new Date(),
      details: `Document ${document.type} ajouté`
    });
    
    await db.dossiers.put(dossier);
    return dossier;
  } catch (error) {
    console.error('Error adding document to file:', error);
    throw error;
  }
};

/**
 * Validate a document in a student file
 * @param {string} dossierId - ID of the student file
 * @param {string} documentId - ID of the document to validate
 * @param {boolean} valid - Whether to validate or reject the document
 * @param {string} comment - Optional comment
 * @returns {Object} Validation result
 */
db.validateDocument = async function(dossierId, documentId, valid, comment = '') {
  try {
    const dossier = await db.dossiers.get(dossierId);
    if (!dossier || !dossier.documents) {
      throw new Error('Student file or documents not found');
    }
    
    const documentIndex = dossier.documents.findIndex(d => d.id === documentId);
    if (documentIndex === -1) {
      throw new Error('Document not found');
    }
    
    dossier.documents[documentIndex].isValid = valid;
    dossier.documents[documentIndex].comment = comment;
    dossier.documents[documentIndex].dateValidation = new Date();
    
    dossier.historique = dossier.historique || [];
    dossier.historique.push({
      action: valid ? 'document_validated' : 'document_rejected',
      document_id: documentId,
      date: new Date(),
      details: comment
    });
    
    await db.dossiers.put(dossier);
    
    return {
      success: true,
      message: valid ? 'Document validé' : 'Document rejeté',
      document: dossier.documents[documentIndex]
    };
  } catch (error) {
    console.error('Error validating document:', error);
    throw error;
  }
};

/**
 * Add or update an absence record
 * @param {Object} absence - Absence data
 * @returns {Object} Created or updated absence record
 */
db.addOrUpdateAbsence = async function(absence) {
  try {
    if (!absence.id) {
      // New absence
      absence.id = Date.now().toString();
      await db.absences.add(absence);
    } else {
      // Update existing absence
      await db.absences.put(absence);
    }
    return absence;
  } catch (error) {
    console.error('Error adding/updating absence:', error);
    throw error;
  }
};

/**
 * Justify an absence
 * @param {string} absenceId - ID of the absence
 * @param {string} motif - Justification reason
 * @param {Object} document - Optional justification document
 * @returns {Object} Updated absence
 */
db.justifyAbsence = async function(absenceId, motif, document = null) {
  try {
    const absence = await db.absences.get(absenceId);
    if (!absence) {
      throw new Error('Absence not found');
    }
    
    absence.motif = motif;
    absence.justifiee = true;
    absence.dateJustification = new Date();
    
    if (document) {
      absence.document = document;
    }
    
    await db.absences.put(absence);
    return absence;
  } catch (error) {
    console.error('Error justifying absence:', error);
    throw error;
  }
};

// Course-related utility functions

/**
 * Get course details along with chapters, sessions, and homework
 * @param {String} courseCode - Course code
 * @returns {Object} Complete course data
 */
db.getCourseWithDetails = async function(courseCode) {
  try {
    const course = await db.cours.get(courseCode);
    if (!course) return null;
    
    // Get chapters for this course
    const chapters = await db.chapitres
      .where('cours_code')
      .equals(courseCode)
      .toArray();
    
    // Get sessions for this course
    const sessions = await db.seances
      .where('cours_code')
      .equals(courseCode)
      .toArray();
    
    // Get homework for this course
    let homework = [];
    try {
      if (db.devoirs) {
        homework = await db.devoirs
          .where('cours_code')
          .equals(courseCode)
          .toArray();
      }
    } catch (error) {
      console.warn('Devoirs table may not exist yet', error);
    }
    
    // Return the complete course object
    return {
      ...course,
      chapitres: chapters.sort((a, b) => a.ordre - b.ordre),
      seances: sessions.sort((a, b) => new Date(a.date) - new Date(b.date)),
      devoirs: homework
    };
  } catch (error) {
    console.error('Error getting course with details:', error);
    throw error;
  }
};

/**
 * Get courses assigned to a teacher
 * @param {String} enseignantId - Teacher ID
 * @returns {Array} Courses assigned to the teacher
 */
db.getTeacherCourses = async function(enseignantId) {
  try {
    const assignedCourses = await db.enseignantsCours
      .where('enseignant_id')
      .equals(enseignantId)
      .toArray();
    
    if (!assignedCourses || !assignedCourses.length) return [];
    
    const courseCodes = assignedCourses.map(ac => ac.cours_code);
    const courses = await db.cours
      .where('code')
      .anyOf(courseCodes)
      .toArray();
    
    return courses;
  } catch (error) {
    console.error('Error getting teacher courses:', error);
    throw error;
  }
};

/**
 * Create or update a chapter for a course
 * @param {Object} chapter - Chapter data
 * @returns {Object} Created or updated chapter
 */
db.createOrUpdateChapter = async function(chapter) {
  try {
    // Check if chapter already exists
    if (chapter.id) {
      const existingChapter = await db.chapitres.get(chapter.id);
      if (existingChapter) {
        // Update existing chapter
        chapter.date_modification = new Date();
        await db.chapitres.update(chapter.id, chapter);
        return chapter;
      }
    }
    
    // Create new chapter
    const id = chapter.id || Date.now().toString();
    const newChapter = {
      ...chapter,
      id,
      date_creation: new Date()
    };
    
    await db.chapitres.add(newChapter);
    return newChapter;
  } catch (error) {
    console.error('Error creating/updating chapter:', error);
    throw error;
  }
};

/**
 * Create or update a session for a course
 * Implements Flow 3 from the sequence diagram where teachers plan sessions
 * and coordinators confirm them
 * 
 * @param {Object} session - Session data
 * @param {Boolean} isCoordinator - Whether the requester is a coordinator
 * @returns {Object} Created or updated session
 */
db.createOrUpdateSession = async function(session, isCoordinator) {
  try {
    // Set session status based on who is creating/updating it
    if (!session.statut) {
      session.statut = isCoordinator ? 'confirmed' : 'pending';
    } else if (isCoordinator) {
      // Coordinators can change status
      session.date_confirmation = new Date();
    }
    
    // Check if session already exists
    if (session.id) {
      const existingSession = await db.seances.get(session.id);
      if (existingSession) {
        // Update existing session
        session.date_modification = new Date();
        await db.seances.update(session.id, session);
        return session;
      }
    }
    
    // Create new session
    const id = session.id || Date.now().toString();
    const newSession = {
      ...session,
      id,
      date_creation: new Date()
    };
    
    await db.seances.add(newSession);
    return newSession;
  } catch (error) {
    console.error('Error creating/updating session:', error);
    throw error;
  }
};

/**
 * Confirm a session (for coordinators)
 * @param {String} sessionId - Session ID
 * @returns {Object} Updated session
 */
db.confirmSession = async function(sessionId) {
  try {
    const session = await db.seances.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const updatedSession = {
      ...session,
      statut: 'confirmed',
      date_confirmation: new Date()
    };
    
    await db.seances.update(sessionId, updatedSession);
    return updatedSession;
  } catch (error) {
    console.error('Error confirming session:', error);
    throw error;
  }
};

/**
 * Create or update homework for a course with proper table checks
 * Implements Flow 4 from the sequence diagram where teachers send homework
 * @param {Object} homework - Homework data
 * @returns {Object} Created or updated homework
 */
db.createOrUpdateHomework = async function(homework) {
  try {
    // Make sure the devoirs table exists
    await this.ensureTable('devoirs', '++id, cours_code, titre, date_creation, deadline, enseignant_id');
    
    // Check if homework already exists
    if (homework.id) {
      try {
        const existingHomework = await this.devoirs.get(homework.id);
        if (existingHomework) {
          // Update existing homework
          homework.date_modification = new Date();
          await this.devoirs.update(homework.id, homework);
          return homework;
        }
      } catch (e) {
        // Table might not be ready yet, continue to create
        console.warn('Error checking for existing homework, will try to create:', e);
      }
    }
    
    // Create new homework
    const id = homework.id || Date.now().toString();
    const newHomework = {
      ...homework,
      id,
      date_creation: new Date()
    };
    
    await this.devoirs.add(newHomework);
    return newHomework;
  } catch (error) {
    console.error('Error creating/updating homework:', error);
    throw error;
  }
};

/**
 * Get students enrolled in a course
 * @param {String} courseCode - Course code
 * @returns {Array} Student information
 */
db.getEnrolledStudents = async function(courseCode) {
  try {
    // Get the course to find its formation
    const course = await db.cours.get(courseCode);
    if (!course) {
      throw new Error('Course not found');
    }
    
    // Find inscriptions for this formation
    const inscriptions = await db.inscriptions
      .where('formation_code')
      .equals(course.formation_code)
      .toArray();
    
    if (!inscriptions || !inscriptions.length) return [];
    
    // Get student IDs
    const studentIds = inscriptions.map(ins => ins.etudiant_id);
    
    // Get student details including personal information
    const studentDetails = [];
    
    for (const id of studentIds) {
      const student = await db.etudiants.get(id);
      if (student) {
        const person = await db.personnes.get(id);
        if (person) {
          studentDetails.push({
            ...student,
            nom: person.nom || '',
            prenom: person.prenom || '',
            email: person.email || ''
          });
        } else {
          studentDetails.push(student);
        }
      }
    }
    
    return studentDetails;
  } catch (error) {
    console.error('Error getting enrolled students:', error);
    throw error;
  }
};

export default db;
