/**
 * Models related to course management
 * Following the UML class diagram and sequence diagrams
 */

/**
 * Class representing a Course entity
 */
export class Cours {
  constructor(code, titre, semestre, annee, description, formation_code, credits) {
    this.code = code;
    this.titre = titre;
    this.semestre = semestre;
    this.annee = annee;
    this.description = description;
    this.formation_code = formation_code;
    this.credits = credits;
    this.chapitres = [];
    this.seances = [];
    this.devoirs = [];
  }

  static fromDb(courseDb) {
    return new Cours(
      courseDb.code,
      courseDb.titre,
      courseDb.semestre,
      courseDb.annee,
      courseDb.description,
      courseDb.formation_code,
      courseDb.credits
    );
  }

  toDb() {
    return {
      code: this.code,
      titre: this.titre,
      semestre: this.semestre,
      annee: this.annee,
      description: this.description,
      formation_code: this.formation_code,
      credits: this.credits
    };
  }

  /**
   * Add a chapter to the course
   * @param {Object} chapitre - Chapter data
   * @returns {Object} The created chapter
   */
  ajouterChapitre(chapitre) {
    // Ensure chapter has an ID and creation date
    if (!chapitre.id) {
      chapitre.id = Date.now().toString();
    }
    if (!chapitre.date_creation) {
      chapitre.date_creation = new Date();
    }
    chapitre.cours_code = this.code;
    
    this.chapitres.push(chapitre);
    return chapitre;
  }
  
  /**
   * Update a chapter
   * @param {String} chapitreId - Chapter ID
   * @param {Object} updates - Update data
   * @returns {Object} Updated chapter
   */
  modifierChapitre(chapitreId, updates) {
    const index = this.chapitres.findIndex(chapitre => chapitre.id === chapitreId);
    if (index === -1) {
      throw new Error('Chapter not found');
    }
    
    const updatedChapitre = {
      ...this.chapitres[index],
      ...updates,
      date_modification: new Date()
    };
    
    this.chapitres[index] = updatedChapitre;
    return updatedChapitre;
  }
  
  /**
   * Remove a chapter
   * @param {String} chapitreId - Chapter ID
   * @returns {Boolean} True if successful
   */
  supprimerChapitre(chapitreId) {
    const initialLength = this.chapitres.length;
    this.chapitres = this.chapitres.filter(chapitre => chapitre.id !== chapitreId);
    return this.chapitres.length < initialLength;
  }
  
  /**
   * Plan a session for the course (as per Flow 3 in sequence diagram)
   * @param {Object} seance - Session data
   * @param {String} enseignantId - Teacher ID
   * @returns {Object} Created session with status
   */
  planifierSeance(seance, enseignantId) {
    if (!seance.id) {
      seance.id = Date.now().toString();
    }
    if (!seance.date_creation) {
      seance.date_creation = new Date();
    }
    seance.cours_code = this.code;
    seance.enseignant_id = enseignantId;
    
    // Set initial status as pending, will be confirmed by coordinator
    seance.statut = 'pending';
    
    this.seances.push(seance);
    return seance;
  }
  
  /**
   * Confirm a session (as coordinator)
   * @param {String} seanceId - Session ID
   * @returns {Object} Updated session
   */
  confirmerSeance(seanceId) {
    const index = this.seances.findIndex(seance => seance.id === seanceId);
    if (index === -1) {
      throw new Error('Session not found');
    }
    
    const updatedSeance = {
      ...this.seances[index],
      statut: 'confirmed',
      date_confirmation: new Date()
    };
    
    this.seances[index] = updatedSeance;
    return updatedSeance;
  }
  
  /**
   * Add homework to the course (as per Flow 4 in sequence diagram)
   * @param {Object} devoir - Homework data
   * @param {String} enseignantId - Teacher ID
   * @returns {Object} Created homework
   */
  ajouterDevoir(devoir, enseignantId) {
    if (!devoir.id) {
      devoir.id = Date.now().toString();
    }
    if (!devoir.date_creation) {
      devoir.date_creation = new Date();
    }
    devoir.cours_code = this.code;
    devoir.enseignant_id = enseignantId;
    
    this.devoirs.push(devoir);
    return devoir;
  }
  
  /**
   * Update homework
   * @param {String} devoirId - Homework ID
   * @param {Object} updates - Update data
   * @returns {Object} Updated homework
   */
  modifierDevoir(devoirId, updates) {
    const index = this.devoirs.findIndex(devoir => devoir.id === devoirId);
    if (index === -1) {
      throw new Error('Homework not found');
    }
    
    const updatedDevoir = {
      ...this.devoirs[index],
      ...updates,
      date_modification: new Date()
    };
    
    this.devoirs[index] = updatedDevoir;
    return updatedDevoir;
  }
  
  /**
   * Remove homework
   * @param {String} devoirId - Homework ID
   * @returns {Boolean} True if successful
   */
  supprimerDevoir(devoirId) {
    const initialLength = this.devoirs.length;
    this.devoirs = this.devoirs.filter(devoir => devoir.id !== devoirId);
    return this.devoirs.length < initialLength;
  }
}

/**
 * Class representing a Chapter entity
 */
export class Chapitre {
  constructor(id, titre, contenu, ordre, cours_code) {
    this.id = id;
    this.titre = titre;
    this.contenu = contenu;
    this.ordre = ordre;
    this.cours_code = cours_code;
    this.date_creation = new Date();
  }
  
  static fromDb(chapitreDb) {
    const chapitre = new Chapitre(
      chapitreDb.id,
      chapitreDb.titre,
      chapitreDb.contenu,
      chapitreDb.ordre,
      chapitreDb.cours_code
    );
    
    if (chapitreDb.date_creation) {
      chapitre.date_creation = chapitreDb.date_creation;
    }
    
    if (chapitreDb.date_modification) {
      chapitre.date_modification = chapitreDb.date_modification;
    }
    
    return chapitre;
  }
  
  toDb() {
    return {
      id: this.id,
      titre: this.titre,
      contenu: this.contenu,
      ordre: this.ordre,
      cours_code: this.cours_code,
      date_creation: this.date_creation,
      date_modification: this.date_modification
    };
  }
}

/**
 * Class representing a Session entity
 */
export class Seance {
  constructor(id, titre, date, heure_debut, heure_fin, type, salle, cours_code, enseignant_id) {
    this.id = id;
    this.titre = titre;
    this.date = date;
    this.heure_debut = heure_debut;
    this.heure_fin = heure_fin;
    this.type = type;
    this.salle = salle;
    this.cours_code = cours_code;
    this.enseignant_id = enseignant_id;
    this.statut = 'pending'; // Default status
    this.date_creation = new Date();
  }
  
  static fromDb(seanceDb) {
    const seance = new Seance(
      seanceDb.id,
      seanceDb.titre,
      seanceDb.date,
      seanceDb.heure_debut,
      seanceDb.heure_fin,
      seanceDb.type,
      seanceDb.salle,
      seanceDb.cours_code,
      seanceDb.enseignant_id
    );
    
    if (seanceDb.statut) {
      seance.statut = seanceDb.statut;
    }
    
    if (seanceDb.date_creation) {
      seance.date_creation = seanceDb.date_creation;
    }
    
    if (seanceDb.date_confirmation) {
      seance.date_confirmation = seanceDb.date_confirmation;
    }
    
    return seance;
  }
  
  toDb() {
    return {
      id: this.id,
      titre: this.titre,
      date: this.date,
      heure_debut: this.heure_debut,
      heure_fin: this.heure_fin,
      type: this.type,
      salle: this.salle,
      cours_code: this.cours_code,
      enseignant_id: this.enseignant_id,
      statut: this.statut,
      date_creation: this.date_creation,
      date_confirmation: this.date_confirmation
    };
  }
  
  /**
   * Check for conflicts with other sessions
   * @param {Array} otherSeances - Other sessions to check against
   * @returns {Boolean} True if there's a conflict
   */
  verifierConflits(otherSeances) {
    for (const other of otherSeances) {
      // Skip comparing with self
      if (other.id === this.id) continue;
      
      // Check if on the same day
      const thisDate = new Date(this.date).toDateString();
      const otherDate = new Date(other.date).toDateString();
      
      if (thisDate !== otherDate) continue;
      
      // Convert time strings to minutes for easier comparison
      const thisStart = timeToMinutes(this.heure_debut);
      const thisEnd = timeToMinutes(this.heure_fin);
      const otherStart = timeToMinutes(other.heure_debut);
      const otherEnd = timeToMinutes(other.heure_fin);
      
      // Check for overlap
      if (
        (thisStart >= otherStart && thisStart < otherEnd) || // This session starts during the other
        (thisEnd > otherStart && thisEnd <= otherEnd) || // This session ends during the other
        (thisStart <= otherStart && thisEnd >= otherEnd) // This session completely contains the other
      ) {
        // If conflicting sessions are in the same room, it's a conflict
        if (this.salle && other.salle && this.salle === other.salle) {
          return true;
        }
      }
    }
    
    return false;
  }
}

/**
 * Class representing a Homework entity
 */
export class Devoir {
  constructor(id, titre, description, deadline, cours_code, enseignant_id) {
    this.id = id;
    this.titre = titre;
    this.description = description;
    this.deadline = deadline;
    this.cours_code = cours_code;
    this.enseignant_id = enseignant_id;
    this.fichiers = [];
    this.date_creation = new Date();
  }
  
  static fromDb(devoirDb) {
    const devoir = new Devoir(
      devoirDb.id,
      devoirDb.titre,
      devoirDb.description,
      devoirDb.deadline,
      devoirDb.cours_code,
      devoirDb.enseignant_id
    );
    
    if (devoirDb.fichiers) {
      devoir.fichiers = devoirDb.fichiers;
    }
    
    if (devoirDb.date_creation) {
      devoir.date_creation = devoirDb.date_creation;
    }
    
    if (devoirDb.date_modification) {
      devoir.date_modification = devoirDb.date_modification;
    }
    
    return devoir;
  }
  
  toDb() {
    return {
      id: this.id,
      titre: this.titre,
      description: this.description,
      deadline: this.deadline,
      cours_code: this.cours_code,
      enseignant_id: this.enseignant_id,
      fichiers: this.fichiers,
      date_creation: this.date_creation,
      date_modification: this.date_modification
    };
  }
  
  /**
   * Add a file attachment to the homework
   * @param {Object} fichier - File data
   * @returns {Array} Updated files list
   */
  ajouterFichier(fichier) {
    if (!fichier.id) {
      fichier.id = Date.now().toString();
    }
    
    fichier.date_ajout = new Date();
    this.fichiers.push(fichier);
    
    return this.fichiers;
  }
  
  /**
   * Remove a file from the homework
   * @param {String} fichierId - File ID
   * @returns {Boolean} True if successful
   */
  supprimerFichier(fichierId) {
    const initialLength = this.fichiers.length;
    this.fichiers = this.fichiers.filter(fichier => fichier.id !== fichierId);
    return this.fichiers.length < initialLength;
  }
}

/**
 * Helper function to convert time string (HH:MM) to minutes
 * @param {String} timeString - Time in format HH:MM
 * @returns {Number} Minutes from midnight
 */
function timeToMinutes(timeString) {
  if (!timeString || typeof timeString !== 'string') return 0;
  
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60) + minutes;
}
