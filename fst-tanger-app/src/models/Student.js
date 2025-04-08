import db from '../utils/db';

/**
 * Models related to student management
 * Based on the UML class diagram
 */

/**
 * Class representing an Absence entity
 */
export class Absence {
  constructor(id, date, motif, justifiee, etudiant_id, cours_code) {
    this.id = id;
    this.date = date;
    this.motif = motif;
    this.justifiee = justifiee;
    this.etudiant_id = etudiant_id;
    this.cours_code = cours_code;
  }

  static fromDb(absenceDb) {
    return new Absence(
      absenceDb.id,
      absenceDb.date,
      absenceDb.motif,
      absenceDb.justifiee,
      absenceDb.etudiant_id,
      absenceDb.cours_code
    );
  }

  toDb() {
    return {
      id: this.id,
      date: this.date,
      motif: this.motif,
      justifiee: this.justifiee,
      etudiant_id: this.etudiant_id,
      cours_code: this.cours_code
    };
  }

  /**
   * Justify an absence with a reason
   * @param {String} justificatif - Justification for the absence
   * @returns {Boolean} True if the absence was successfully justified
   */
  justifierAbsence(justificatif) {
    if (justificatif && justificatif.trim()) {
      this.justifiee = true;
      this.motif = justificatif;
      return true;
    }
    return false;
  }

  /**
   * Get absence details
   * @returns {Object} Absence details
   */
  consulterAbsence() {
    return {
      id: this.id,
      date: this.date,
      motif: this.motif,
      justifiee: this.justifiee,
      etudiant_id: this.etudiant_id,
      cours_code: this.cours_code
    };
  }
  
  /**
   * Process absence justification request
   * @param {Boolean} approved - Whether the justification is approved
   * @param {String} comment - Optional comment from the approver
   * @param {String} approverId - ID of the person approving the justification
   * @returns {Object} Result of the processing
   */
  traiterJustificationAbsence(approved, comment = '', approverId) {
    const result = {
      id: this.id,
      processDate: new Date(),
      approverId: approverId,
      comment: comment,
      success: approved
    };
    
    if (approved) {
      this.justifiee = true;
      result.status = 'justified';
    } else {
      result.status = 'rejected';
    }
    
    return result;
  }
}

/**
 * Class representing an Inscription entity
 */
export class Inscription {
  constructor(id, dateInscription, statut, etudiant_id, formation_code) {
    this.id = id;
    this.dateInscription = dateInscription;
    this.statut = statut;
    this.etudiant_id = etudiant_id;
    this.formation_code = formation_code;
  }

  static fromDb(inscriptionDb) {
    return new Inscription(
      inscriptionDb.id,
      inscriptionDb.dateInscription,
      inscriptionDb.statut,
      inscriptionDb.etudiant_id,
      inscriptionDb.formation_code
    );
  }

  toDb() {
    return {
      id: this.id,
      dateInscription: this.dateInscription,
      statut: this.statut,
      etudiant_id: this.etudiant_id,
      formation_code: this.formation_code
    };
  }

  /**
   * Create a new registration record
   * @returns {Object} The created registration data
   */
  creerInscription() {
    // Set the date to current date if not already set
    if (!this.dateInscription) {
      this.dateInscription = new Date();
    }
    
    return {
      ...this.toDb(),
      dateModification: new Date()
    };
  }

  /**
   * Create a student file based on the registration
   * @returns {Object} New student file data
   */
  creerDossier() {
    return {
      inscription_id: this.id,
      etudiant_id: this.etudiant_id,
      formation_code: this.formation_code,
      documents: [],
      dateCreation: new Date(),
      statut: 'Créé'
    };
  }
  
  /**
   * Update the registration status
   * @param {String} nouveauStatut - New status (En attente, Acceptée, Refusée, Complétée)
   * @returns {Boolean} True if the status was successfully updated
   */
  mettreAJourStatut(nouveauStatut) {
    const statutsValides = ['En attente', 'Acceptée', 'Refusée', 'Complétée'];
    if (statutsValides.includes(nouveauStatut)) {
      this.statut = nouveauStatut;
      return true;
    }
    return false;
  }
  
  /**
   * Verify student eligibility for enrollment
   * @param {Object} criteria - Criteria for eligibility check
   * @returns {Object} Eligibility result with status and message
   */
  verifierEligibilite(criteria = {}) {
    let eligible = true;
    let message = 'Éligible pour l\'inscription';
    
    if (criteria.minGrade && this.moyenneGenerale < criteria.minGrade) {
      eligible = false;
      message = `Moyenne insuffisante (${this.moyenneGenerale} < ${criteria.minGrade})`;
    }
    
    if (criteria.maxAbsences && this.nombreAbsences > criteria.maxAbsences) {
      eligible = false;
      message = `Trop d'absences (${this.nombreAbsences} > ${criteria.maxAbsences})`;
    }
    
    if (criteria.requiredDocuments && criteria.requiredDocuments.length > 0) {
      const missingDocuments = criteria.requiredDocuments.filter(
        doc => !this.documentsPresents || !this.documentsPresents.includes(doc)
      );
      if (missingDocuments.length > 0) {
        eligible = false;
        message = `Documents manquants: ${missingDocuments.join(', ')}`;
      }
    }
    
    return {
      eligible,
      message,
      date: new Date()
    };
  }
  
  /**
   * Validate student documents for enrollment
   * @param {Array} documents - List of documents submitted by the student
   * @returns {Object} Validation result with status and message
   */
  validerDocuments(documents) {
    if (!documents || documents.length === 0) {
      return {
        valid: false,
        message: 'Aucun document fourni',
        date: new Date()
      };
    }
    
    const requiredDocuments = ['ID', 'certificat de scolarité', 'photo d\'identité'];
    const missingDocuments = requiredDocuments.filter(
      doc => !documents.some(d => d.type && d.type.toLowerCase().includes(doc.toLowerCase()))
    );
    
    if (missingDocuments.length > 0) {
      return {
        valid: false,
        message: `Documents manquants: ${missingDocuments.join(', ')}`,
        missingDocuments,
        date: new Date()
      };
    }
    
    const invalidDocuments = documents.filter(doc => doc.isValid === false);
    if (invalidDocuments.length > 0) {
      return {
        valid: false,
        message: `Documents invalides: ${invalidDocuments.map(d => d.type).join(', ')}`,
        invalidDocuments,
        date: new Date()
      };
    }
    
    this.documentsPresents = documents.map(d => d.type);
    
    return {
      valid: true,
      message: 'Tous les documents sont valides',
      date: new Date()
    };
  }
  
  /**
   * Check if a student is eligible for enrollment based on various criteria
   * @param {Object} student - Student data
   * @param {Object} programme - Programme data
   * @returns {Object} Eligibility result with status and message
   */
  static verifierEligibilite(student, programme) {
    let eligible = true;
    let message = 'Éligible pour l\'inscription';
    const reasons = [];
    
    // Check age requirements
    if (student.dateNaissance) {
      const birthYear = new Date(student.dateNaissance).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      
      if (programme.ageMinimum && age < programme.ageMinimum) {
        eligible = false;
        reasons.push(`L'âge minimum requis est ${programme.ageMinimum} ans`);
      }
      
      if (programme.ageMaximum && age > programme.ageMaximum) {
        eligible = false;
        reasons.push(`L'âge maximum autorisé est ${programme.ageMaximum} ans`);
      }
    }
    
    // Check academic requirements
    if (programme.moyenneMinimum && student.moyenne < programme.moyenneMinimum) {
      eligible = false;
      reasons.push(`La moyenne minimale requise est ${programme.moyenneMinimum}`);
    }
    
    // Check prerequisite diplomas
    if (programme.diplomeRequis && student.diplome !== programme.diplomeRequis) {
      eligible = false;
      reasons.push(`Le diplôme requis est ${programme.diplomeRequis}`);
    }
    
    if (!eligible) {
      message = `Non éligible pour l'inscription: ${reasons.join(', ')}`;
    }
    
    return {
      eligible,
      message,
      date: new Date(),
      reasons
    };
  }
  
  /**
   * Process a new student registration
   * @param {Object} studentData - Student personal information
   * @param {Object} academicData - Student academic information
   * @param {Array} documents - Array of submitted documents
   * @param {String} formationCode - Code of the chosen formation/programme
   * @returns {Object} Registration result with status and messages
   */
  static creerInscription(studentData, academicData, documents, formationCode) {
    // Validate required fields
    const requiredPersonalFields = ['nom', 'prenom', 'dateNaissance', 'email'];
    const requiredAcademicFields = ['diplome', 'etablissement'];
    
    const missingPersonalFields = requiredPersonalFields.filter(field => !studentData[field]);
    const missingAcademicFields = requiredAcademicFields.filter(field => !academicData[field]);
    
    if (missingPersonalFields.length > 0 || missingAcademicFields.length > 0) {
      return {
        success: false,
        status: 'incomplet',
        message: 'Informations incomplètes',
        missingFields: [...missingPersonalFields, ...missingAcademicFields]
      };
    }
    
    // Check documents
    const requiredDocuments = ['ID', 'Diplome', 'Photo'];
    const missingDocuments = requiredDocuments.filter(
      doc => !documents.some(d => d.type === doc)
    );
    
    if (missingDocuments.length > 0) {
      return {
        success: false,
        status: 'documents_manquants',
        message: 'Documents manquants',
        missingDocuments
      };
    }
    
    // Create new inscription
    const inscription = {
      dateInscription: new Date(),
      statut: 'En attente',
      formation_code: formationCode,
      etudiant: {
        ...studentData,
        ...academicData
      },
      documents: documents.map(doc => ({
        ...doc,
        dateAjout: new Date(),
        statut: 'En attente'
      }))
    };
    
    return {
      success: true,
      status: 'en_attente',
      message: 'Inscription créée avec succès',
      inscription
    };
  }
  
  /**
   * Validate a student registration based on academic records and documents
   * @param {String} inscriptionId - ID of the inscription to validate
   * @param {String} validatorId - ID of the person validating the inscription
   * @param {Boolean} approved - Whether the inscription is approved
   * @param {String} comment - Optional comment about the decision
   * @returns {Object} Validation result
   */
  static validerInscription(inscriptionId, validatorId, approved, comment = '') {
    const now = new Date();
    
    const result = {
      inscription_id: inscriptionId,
      validator_id: validatorId,
      date: now,
      comment: comment,
      success: true
    };
    
    if (approved) {
      result.status = 'Acceptée';
      result.message = 'Inscription validée avec succès';
    } else {
      result.status = 'Refusée';
      result.message = 'Inscription refusée: ' + comment;
    }
    
    return result;
  }
}

/**
 * Class representing a Student File entity
 */
export class DossierEtudiant {
  constructor(id, etudiant_id, dateCreation, statut) {
    this.id = id;
    this.etudiant_id = etudiant_id;
    this.dateCreation = dateCreation || new Date();
    this.statut = statut || 'En cours';
    this.documents = [];
    this.historique = [];
  }

  static fromDb(dossierDb) {
    const dossier = new DossierEtudiant(
      dossierDb.id,
      dossierDb.etudiant_id,
      dossierDb.dateCreation,
      dossierDb.statut
    );
    
    if (dossierDb.documents) dossier.documents = dossierDb.documents;
    if (dossierDb.historique) dossier.historique = dossierDb.historique;
    
    return dossier;
  }

  toDb() {
    return {
      id: this.id,
      etudiant_id: this.etudiant_id,
      dateCreation: this.dateCreation,
      statut: this.statut,
      documents: this.documents,
      historique: this.historique
    };
  }
  
  /**
   * Add a document to the student file
   * @param {Object} document - Document to add
   * @returns {Object} Updated documents list
   */
  ajouterDocument(document) {
    if (!document.id) document.id = Date.now();
    if (!document.dateAjout) document.dateAjout = new Date();
    
    this.documents.push(document);
    this.historique.push({
      action: 'document_added',
      document_id: document.id,
      date: new Date(),
      details: `Document ${document.type} ajouté`
    });
    
    return this.documents;
  }
  
  /**
   * Validate a document in the student file
   * @param {Number} documentId - ID of the document to validate
   * @param {Boolean} valid - Whether the document is valid
   * @param {String} comment - Optional validation comment
   * @returns {Object} Validation result
   */
  validerDocument(documentId, valid, comment = '') {
    const documentIndex = this.documents.findIndex(d => d.id === documentId);
    if (documentIndex === -1) {
      return {
        success: false,
        message: 'Document non trouvé'
      };
    }
    
    this.documents[documentIndex].isValid = valid;
    this.documents[documentIndex].comment = comment;
    this.documents[documentIndex].dateValidation = new Date();
    
    this.historique.push({
      action: valid ? 'document_validated' : 'document_rejected',
      document_id: documentId,
      date: new Date(),
      details: comment
    });
    
    return {
      success: true,
      message: valid ? 'Document validé' : 'Document rejeté',
      document: this.documents[documentIndex]
    };
  }
  
  /**
   * Archive student file
   * @param {String} reason - Reason for archiving
   * @param {String} archivedById - ID of the person archiving the file
   * @returns {Object} Archive result
   */
  archiver(reason, archivedById) {
    const previousStatus = this.statut;
    this.statut = 'Archivé';
    
    this.historique.push({
      action: 'archived',
      date: new Date(),
      details: reason,
      previousStatus,
      user_id: archivedById
    });
    
    return {
      success: true,
      message: 'Dossier archivé avec succès',
      date: new Date(),
      reason,
      archivedById
    };
  }
  
  /**
   * Consult student file
   * @returns {Object} File details
   */
  consulterDossier() {
    return {
      id: this.id,
      etudiant_id: this.etudiant_id,
      dateCreation: this.dateCreation,
      statut: this.statut,
      documents: this.documents,
      historique: this.historique
    };
  }
  
  /**
   * Create a new student file based on an inscription
   * @param {Object} inscription - Inscription data
   * @param {Object} creatorInfo - Information about the creator
   * @returns {DossierEtudiant} New student file instance
   */
  static creerDossierEtudiant(inscription, creatorInfo) {
    const dossier = new DossierEtudiant(
      null, // ID will be generated by database
      inscription.etudiant_id,
      new Date(),
      'En cours'
    );
    
    // Initialize with documents from inscription
    if (inscription.documents && Array.isArray(inscription.documents)) {
      dossier.documents = inscription.documents.map(doc => ({
        ...doc,
        dateAjout: new Date(),
        isValid: false
      }));
    }
    
    // Add creation event to history
    dossier.historique.push({
      action: 'creation',
      date: new Date(),
      details: `Dossier créé par ${creatorInfo.nom} (${creatorInfo.role})`,
      user_id: creatorInfo.id
    });
    
    return dossier;
  }
}

/**
 * Class representing academic information for a student
 */
export class InformationAcademique {
  constructor(etudiant_id, formation, niveau, annee, statut) {
    this.etudiant_id = etudiant_id;
    this.formation = formation;
    this.niveau = niveau;
    this.annee = annee;
    this.statut = statut || 'En cours';
    this.modules = [];
    this.notes = {};
    this.absences = [];
  }
  
  /**
   * Consult academic information
   * @returns {Object} Academic information
   */
  consulterInformationsAcademiques() {
    return {
      etudiant_id: this.etudiant_id,
      formation: this.formation,
      niveau: this.niveau,
      annee: this.annee,
      statut: this.statut,
      modules: this.modules,
      nombreAbsences: this.absences.length,
      absencesJustifiees: this.absences.filter(a => a.justifiee).length
    };
  }
  
  /**
   * Consult grades
   * @returns {Object} Student's grades
   */
  consulterNotes() {
    const modules = Object.keys(this.notes);
    
    let totalPoints = 0;
    let totalCoeff = 0;
    
    modules.forEach(module => {
      if (this.notes[module].moyenne !== undefined) {
        const coeff = this.notes[module].coefficient || 1;
        totalPoints += this.notes[module].moyenne * coeff;
        totalCoeff += coeff;
      }
    });
    
    const moyenne = totalCoeff > 0 ? totalPoints / totalCoeff : null;
    
    return {
      etudiant_id: this.etudiant_id,
      notes: this.notes,
      moyenne: moyenne !== null ? parseFloat(moyenne.toFixed(2)) : null,
      reussite: moyenne !== null ? moyenne >= 10 : null
    };
  }
  
  /**
   * Validate academic year
   * @returns {Object} Validation result
   */
  validerAnnee() {
    const grades = this.consulterNotes();
    const absenceInfo = {
      total: this.absences.length,
      justified: this.absences.filter(a => a.justifiee).length,
      unjustified: this.absences.filter(a => !a.justifiee).length
    };
    
    const isSuccessful = grades.moyenne >= 10 && absenceInfo.unjustified <= 3;
    
    this.statut = isSuccessful ? 'Validé' : 'Non validé';
    
    return {
      etudiant_id: this.etudiant_id,
      formation: this.formation,
      niveau: this.niveau,
      annee: this.annee,
      moyenne: grades.moyenne,
      absences: absenceInfo,
      statut: this.statut,
      isSuccessful,
      date: new Date()
    };
  }
  
  /**
   * Track attendance
   * @param {Array} absences - List of absences
   * @returns {Object} Updated absences information
   */
  suiviPresence(absences) {
    this.absences = absences || [];
    
    return {
      etudiant_id: this.etudiant_id,
      totalAbsences: this.absences.length,
      justifiedAbsences: this.absences.filter(a => a.justifiee).length,
      unjustifiedAbsences: this.absences.filter(a => !a.justifiee).length,
      absencesByModule: this.absences.reduce((acc, absence) => {
        const module = absence.cours_code || 'Unknown';
        if (!acc[module]) acc[module] = 0;
        acc[module]++;
        return acc;
      }, {})
    };
  }
  
  /**
   * Check if a student meets requirements to validate academic year
   * @param {Object} criteria - Validation criteria
   * @returns {Object} Validation check result
   */
  checkValidationRequirements(criteria = {}) {
    const grades = this.consulterNotes();
    const absences = this.absences.filter(a => !a.justifiee).length;
    
    const defaultCriteria = {
      minGrade: 10,
      maxUnjustifiedAbsences: 3,
      moduleValidationThreshold: 8
    };
    
    const validationCriteria = { ...defaultCriteria, ...criteria };
    
    // Check modules with failing grades
    const failingModules = [];
    Object.entries(this.notes).forEach(([module, data]) => {
      if (data.moyenne < validationCriteria.moduleValidationThreshold) {
        failingModules.push({
          module,
          grade: data.moyenne
        });
      }
    });
    
    const valid = grades.moyenne >= validationCriteria.minGrade && 
                  absences <= validationCriteria.maxUnjustifiedAbsences &&
                  failingModules.length === 0;
    
    return {
      valid,
      moyenne: grades.moyenne,
      requiredAverage: validationCriteria.minGrade,
      absencesNonJustifiees: absences,
      absenceLimit: validationCriteria.maxUnjustifiedAbsences,
      failingModules,
      moduleThreshold: validationCriteria.moduleValidationThreshold
    };
  }
  
  /**
   * Validate or invalidate student's academic year with detailed assessment
   * @param {Object} validation - Validation parameters
   * @param {Boolean} validation.isValid - Whether the year is considered valid
   * @param {String} validation.validatorId - ID of the validator
   * @param {String} validation.comment - Comment about the validation decision
   * @returns {Object} Validation result record
   */
  validerAnnee(validation) {
    const currentStatus = this.statut;
    this.statut = validation.isValid ? 'Validé' : 'Non validé';
    
    const result = {
      etudiant_id: this.etudiant_id,
      formation: this.formation,
      niveau: this.niveau,
      annee: this.annee,
      statutPrecedent: currentStatus,
      nouveauStatut: this.statut,
      moyenne: this.consulterNotes().moyenne,
      date: new Date(),
      validateur_id: validation.validatorId,
      commentaire: validation.comment || '',
      decision: validation.isValid ? 'Validation' : 'Non validation'
    };
    
    // Add specific actions based on validation
    if (!validation.isValid) {
      if (validation.action === 'redoublement') {
        result.action = 'Redoublement';
      } else if (validation.action === 'exclusion') {
        result.action = 'Exclusion';
      } else if (validation.action === 'rattrapage') {
        result.action = 'Session de rattrapage';
        result.modulesConcernes = validation.modules || [];
      }
    } else {
      result.action = 'Passage au niveau supérieur';
    }
    
    return result;
  }
}

/**
 * Class representing a Stage entity
 */
export class Stage {
  constructor(id, dateDebut, dateFin, entreprise, sujet, etudiant_id) {
    this.id = id;
    this.dateDebut = dateDebut;
    this.dateFin = dateFin;
    this.entreprise = entreprise;
    this.sujet = sujet;
    this.etudiant_id = etudiant_id;
    this.statut = 'En cours'; // Initial status
    this.rapportSoumis = false;
    this.dateSoutenance = null;
    this.note = null;
    this.jury = [];
  }

  static fromDb(stageDb) {
    const stage = new Stage(
      stageDb.id,
      stageDb.dateDebut,
      stageDb.dateFin,
      stageDb.entreprise,
      stageDb.sujet,
      stageDb.etudiant_id
    );
    
    if (stageDb.statut) stage.statut = stageDb.statut;
    if (stageDb.rapportSoumis) stage.rapportSoumis = stageDb.rapportSoumis;
    if (stageDb.dateSoutenance) stage.dateSoutenance = stageDb.dateSoutenance;
    if (stageDb.note) stage.note = stageDb.note;
    if (stageDb.jury) stage.jury = stageDb.jury;
    
    return stage;
  }

  toDb() {
    return {
      id: this.id,
      dateDebut: this.dateDebut,
      dateFin: this.dateFin,
      entreprise: this.entreprise,
      sujet: this.sujet,
      etudiant_id: this.etudiant_id,
      statut: this.statut,
      rapportSoumis: this.rapportSoumis,
      dateSoutenance: this.dateSoutenance,
      note: this.note,
      jury: this.jury
    };
  }

  /**
   * Record internship activities
   * @param {String} activite - Description of the activity
   * @param {Date} date - Date of the activity
   * @returns {Object} Recorded internship activity
   */
  realiserStage(activite, date = new Date()) {
    return {
      stage_id: this.id,
      etudiant_id: this.etudiant_id,
      activite,
      date,
      statut: 'Réalisé'
    };
  }
  
  /**
   * Submit an internship report
   * @param {String} titre - Report title
   * @param {String} contenu - Report content
   * @returns {Object} Submitted report data
   */
  soumettreLivrable(titre, contenu) {
    this.rapportSoumis = true;
    
    return {
      stage_id: this.id,
      etudiant_id: this.etudiant_id,
      titre,
      contenu,
      date_soumission: new Date(),
      statut: 'Soumis'
    };
  }
  
  /**
   * Present the internship report to jury
   * @returns {Object} Presentation record
   */
  presenterRapport() {
    return {
      stage_id: this.id,
      etudiant_id: this.etudiant_id,
      date_presentation: new Date(),
      statut: 'Présenté'
    };
  }
  
  /**
   * Set the internship defense date
   * @param {Date} date - Defense date
   */
  planifierSoutenance(date) {
    this.dateSoutenance = date;
    return {
      stage_id: this.id,
      date_soutenance: date,
      statut: 'Planifiée'
    };
  }
  
  /**
   * Add jury members for the defense
   * @param {Array} juryMembers - Array of jury member IDs
   */
  convoquerSoutenance(juryMembers) {
    this.jury = juryMembers;
    return {
      stage_id: this.id,
      jury: juryMembers,
      date_convocation: new Date(),
      statut: 'Convoqué'
    };
  }
  
  /**
   * Evaluate student's performance
   * @param {Number} note - Grade for the internship (0-20)
   * @param {String} commentaire - Evaluation comments
   * @returns {Object} Evaluation record
   */
  evaluerPerformance(note, commentaire) {
    if (note < 0 || note > 20) {
      throw new Error('La note doit être comprise entre 0 et 20');
    }
    
    this.note = note;
    
    if (note >= 10) {
      this.statut = 'Validé';
    } else {
      this.statut = 'Non validé';
    }
    
    return {
      stage_id: this.id,
      etudiant_id: this.etudiant_id,
      note,
      commentaire,
      date_evaluation: new Date(),
      statut: this.statut
    };
  }
  
  /**
   * Verify if all conditions are met for diploma issuance
   * @returns {Boolean} True if all conditions are met
   */
  verifierConditions() {
    return this.rapportSoumis && 
           this.dateSoutenance && 
           this.note !== null && 
           this.note >= 10;
  }
  
  /**
   * Update internship status
   * @param {String} nouveauStatut - New status
   * @returns {Object} Status update record
   */
  mettreAJourStatut(nouveauStatut) {
    const statutsValides = [
      'En cours', 
      'Rapport soumis', 
      'Soutenance planifiée', 
      'Soutenance effectuée', 
      'Validé', 
      'Non validé', 
      'Diplôme autorisé', 
      'Diplôme remis'
    ];
    
    if (statutsValides.includes(nouveauStatut)) {
      this.statut = nouveauStatut;
      
      return {
        stage_id: this.id,
        ancien_statut: this.statut,
        nouveau_statut: nouveauStatut,
        date_mise_a_jour: new Date()
      };
    } else {
      throw new Error('Statut non valide');
    }
  }
  
  /**
   * Submit an internship report
   * @param {Object} report - Report data
   * @param {String} report.titre - Report title
   * @param {String} report.contenu - Report content
   * @param {File} report.fichier - Report file
   * @returns {Object} Submitted report data
   */
  soumettreRapport(report) {
    this.rapportSoumis = true;
    this.statut = 'Rapport soumis';
    
    const rapportData = {
      stage_id: this.id,
      etudiant_id: this.etudiant_id,
      titre: report.titre,
      contenu: report.contenu,
      fichier: report.fichier ? report.fichier.name : null,
      date_soumission: new Date(),
      statut: 'Soumis'
    };
    
    return rapportData;
  }
  
  /**
   * Schedule the defense date for the internship
   * @param {Date} date - Defense date
   * @param {Array} jury - Array of jury members
   * @param {String} room - Room for the defense
   * @returns {Object} Defense scheduling data
   */
  planifierSoutenance(date, jury, room) {
    this.dateSoutenance = date;
    this.jury = jury;
    this.salle = room;
    this.statut = 'Soutenance planifiée';
    
    return {
      stage_id: this.id,
      etudiant_id: this.etudiant_id,
      date_soutenance: date,
      jury: jury,
      salle: room,
      statut: 'Planifiée',
      date_planification: new Date()
    };
  }
  
  /**
   * Record the presentation of the internship report
   * @param {Date} presentationDate - Date of the presentation
   * @param {Array} attendees - List of attendees
   * @returns {Object} Presentation record
   */
  presenterRapport(presentationDate = new Date(), attendees = []) {
    const presentation = {
      stage_id: this.id,
      etudiant_id: this.etudiant_id,
      date_presentation: presentationDate,
      participants: attendees,
      statut: 'Présenté',
      date_enregistrement: new Date()
    };
    
    this.statut = 'Soutenance effectuée';
    
    return presentation;
  }
  
  /**
   * Authorize diploma delivery if all conditions are met
   * @param {String} authorizerId - ID of the person authorizing the diploma
   * @param {String} comment - Optional comment
   * @returns {Object} Authorization result
   */
  autoriserDiplome(authorizerId, comment = '') {
    // Check all requirements
    if (!this.verifierConditions()) {
      return {
        success: false,
        message: 'Les conditions requises pour l\'autorisation du diplôme ne sont pas remplies',
        stage_id: this.id,
        etudiant_id: this.etudiant_id,
        date: new Date()
      };
    }
    
    this.statut = 'Diplôme autorisé';
    
    return {
      success: true,
      message: 'Diplôme autorisé avec succès',
      stage_id: this.id,
      etudiant_id: this.etudiant_id,
      authorizer_id: authorizerId,
      comment: comment,
      date: new Date(),
      statut: this.statut
    };
  }
  
  /**
   * Record diploma delivery to the student
   * @param {String} delivererId - ID of the person delivering the diploma
   * @param {Date} deliveryDate - Date of diploma delivery
   * @returns {Object} Delivery record
   */
  remettreTesDiplome(delivererId, deliveryDate = new Date()) {
    if (this.statut !== 'Diplôme autorisé') {
      return {
        success: false,
        message: 'Le diplôme n\'est pas encore autorisé',
        stage_id: this.id,
        etudiant_id: this.etudiant_id,
        date: new Date()
      };
    }
    
    this.statut = 'Diplôme remis';
    
    return {
      success: true,
      message: 'Diplôme remis avec succès',
      stage_id: this.id,
      etudiant_id: this.etudiant_id,
      deliverer_id: delivererId,
      delivery_date: deliveryDate,
      date_enregistrement: new Date(),
      statut: this.statut
    };
  }
}

/**
 * Class representing an EmploiDuTemps entity
 */
export class EmploiDuTemps {
  constructor(idSession, intervalle, jour, utilisateur_id, chef_labo_id) {
    this.idSession = idSession;
    this.intervalle = intervalle;
    this.jour = jour;
    this.utilisateur_id = utilisateur_id;
    this.chef_labo_id = chef_labo_id;
  }

  static fromDb(emploiDb) {
    return new EmploiDuTemps(
      emploiDb.idSession,
      emploiDb.intervalle,
      emploiDb.jour,
      emploiDb.utilisateur_id,
      emploiDb.chef_labo_id
    );
  }

  toDb() {
    return {
      idSession: this.idSession,
      intervalle: this.intervalle,
      jour: this.jour,
      utilisateur_id: this.utilisateur_id,
      chef_labo_id: this.chef_labo_id
    };
  }
  
  /**
   * Check for schedule conflicts
   * @param {Object} autreEmploi - Another schedule entry to check against
   * @returns {Boolean} True if there's a conflict, false otherwise
   */
  verifierConflit(autreEmploi) {
    return this.jour === autreEmploi.jour && this.intervalle === autreEmploi.intervalle;
  }
}

/**
 * Class for accessing and manipulating student information
 * Based on the "Consultation Informations" use case
 */
export class ConsultationInformation {
  /**
   * Get personal information for a student
   * @param {String} studentId - Student ID
   * @returns {Promise<Object>} Student personal information
   */
  static async getInformationsPersonnelles(studentId) {
    try {
      // Check if db is properly initialized
      if (!db || !db.etudiants || !db.personnes) {
        throw new Error('Database not properly initialized');
      }
      
      // Get the student record
      const etudiant = await db.etudiants.get(studentId);
      if (!etudiant) {
        throw new Error('Étudiant non trouvé');
      }
      
      // Get the person record
      const personne = await db.personnes.get(studentId);
      if (!personne) {
        throw new Error('Informations personnelles non trouvées');
      }
      
      return {
        id: etudiant.id,
        nom: personne.nom,
        prenom: personne.prenom,
        dateNaissance: personne.dateNaissance,
        adresse: personne.adresse,
        email: personne.email,
        telephone: personne.telephone,
        appogee: etudiant.appogee,
        cne: etudiant.cne
      };
    } catch (error) {
      console.error('Error fetching student personal info:', error);
      throw error;
    }
  }
  
  /**
   * Get academic information for a student
   * @param {String} studentId - Student ID
   * @returns {Promise<Object>} Student academic information
   */
  static async getInformationsAcademiques(studentId) {
    try {
      // Get most recent inscription for this student
      const inscriptions = await db.inscriptions
        .where('etudiant_id')
        .equals(studentId)
        .reverse()
        .sortBy('dateInscription');
      
      if (!inscriptions || inscriptions.length === 0) {
        throw new Error('Aucune inscription trouvée pour cet étudiant');
      }
      
      const currentInscription = inscriptions[0];
      
      // Get formation details
      const formation = await db.formations
        .get(currentInscription.formation_code);
      
      if (!formation) {
        throw new Error('Formation non trouvée');
      }
      
      // Calculate current level based on inscription date
      const firstInscriptionYear = new Date(inscriptions[inscriptions.length - 1].dateInscription).getFullYear();
      const currentYear = new Date().getFullYear();
      const level = Math.min(currentYear - firstInscriptionYear + 1, formation.duree);
      
      return {
        id: studentId,
        formation: {
          code: formation.code,
          intitule: formation.intitule,
          departement: formation.departement,
          niveau: formation.niveau
        },
        niveau: `${level}${level === 1 ? 'ère' : 'ème'} année`,
        anneeInscription: firstInscriptionYear,
        statut: currentInscription.statut,
        parcours: formation.parcours
      };
    } catch (error) {
      console.error('Error fetching student academic info:', error);
      throw error;
    }
  }
  
  /**
   * Get grade information for a student
   * @param {String} studentId - Student ID
   * @param {Number} academicYear - Academic year (optional)
   * @returns {Promise<Object>} Student grades information
   */
  static async getNotesEtudiant(studentId, academicYear = null) {
    try {
      // Check if db is properly initialized
      if (!db || !db.notes) {
        throw new Error('Database or notes table not properly initialized');
      }
      
      let notesQuery = db.notes.where('etudiant_id').equals(studentId);
      
      if (academicYear) {
        notesQuery = notesQuery.and(note => note.anneeAcademique === academicYear);
      }
      
      const notes = await notesQuery.toArray();
      
      if (!notes || notes.length === 0) {
        return {
          id: studentId,
          notes: [],
          modules: {},
          moyenne: null,
          anneeAcademique: academicYear || 'Toutes'
        };
      }
      
      // Group by module
      const moduleNotes = {};
      let totalPoints = 0;
      let totalCoef = 0;
      
      // Collect all module codes
      const moduleCodes = [...new Set(notes.map(note => note.module_code))];
      
      // Check if db.modules exists
      let modules = [];
      try {
        if (db.modules) {
          modules = await db.modules
            .where('code')
            .anyOf(moduleCodes)
            .toArray();
        }
      } catch (err) {
        console.error('Error fetching modules:', err);
      }
      
      // Create a map for quick access
      const modulesMap = {};
      modules.forEach(module => {
        modulesMap[module.code] = module;
      });
      
      // Process notes by module
      for (const moduleCode of moduleCodes) {
        const moduleNotesList = notes.filter(note => note.module_code === moduleCode);
        const module = modulesMap[moduleCode] || { 
          code: moduleCode, 
          nom: `Module ${moduleCode}`,
          coefficient: 1 
        };
        
        const coefficient = module.coefficient || 1;
        let moduleTotal = 0;
        
        moduleNotesList.forEach(note => {
          moduleTotal += note.valeur * (note.coefficient || 1);
        });
        
        const moduleAverage = moduleNotesList.length > 0 ? 
          moduleTotal / moduleNotesList.length : 0;
        
        moduleNotes[moduleCode] = {
          code: moduleCode,
          nom: module.nom,
          notes: moduleNotesList,
          moyenne: moduleAverage,
          coefficient: coefficient,
          statut: moduleAverage >= 10 ? 'Validé' : 'Non validé'
        };
        
        totalPoints += moduleAverage * coefficient;
        totalCoef += coefficient;
      }
      
      const moyenne = totalCoef > 0 ? totalPoints / totalCoef : null;
      
      return {
        id: studentId,
        notes: notes,
        modules: moduleNotes,
        moyenne: moyenne !== null ? parseFloat(moyenne.toFixed(2)) : null,
        anneeAcademique: academicYear || 'Toutes'
      };
    } catch (error) {
      console.error('Error fetching student grades:', error);
      // Return empty data rather than throwing an error
      return {
        id: studentId,
        notes: [],
        modules: {},
        moyenne: null,
        anneeAcademique: academicYear || 'Toutes'
      };
    }
  }
}
