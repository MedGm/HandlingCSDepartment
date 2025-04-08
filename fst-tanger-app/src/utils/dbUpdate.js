import db from './db';

/**
 * Updates the database schema to support laboratory features
 * This should be run once when the app initializes
 * @returns {Promise<boolean>} - true if successful
 */
export const updateDbSchema = async () => {
  try {
    // Check if we need to update the schema
    const metadata = await db.metadata.get('schema_version');
    const currentVersion = metadata?.value || '1.0';
    
    // If we're already at the required version, no need to update
    if (currentVersion === '1.1') {
      console.log('Database schema already up to date');
      return true;
    }
    
    console.log(`Updating database schema from ${currentVersion} to 1.1`);
    
    // Begin a transaction for atomicity
    return await db.transaction('rw', 
      db.laboratoires, 
      db.chefDeLabo, 
      db.sessions, 
      db.reservationsLabo,
      db.materiels, 
      db.projetsLabo,
      db.chercheurs,
      db.documents,
      db.metadata, 
      async () => {
      
      // Ensure all tables exist
      // Note: These should match the schema defined in db.js
      // We're just showing the update logic here
      
      // Create sample data if needed for testing
      if ((await db.laboratoires.count()) === 0) {
        console.log('Adding sample laboratory data');
        await addSampleLaboratoryData();
      }
      
      // Update schema version
      await db.metadata.put({ key: 'schema_version', value: '1.1' });
      
      console.log('Database schema updated to 1.1');
      return true;
    });
  } catch (error) {
    console.error('Error updating database schema:', error);
    return false;
  }
};

/**
 * Adds sample laboratory data for testing
 */
const addSampleLaboratoryData = async () => {
  // Add laboratories
  const laboIds = await db.laboratoires.bulkAdd([
    { name: 'Labo 1 - Informatique', description: 'Laboratoire d\'informatique', encadrant_id: 11 },
    { name: 'Labo 2 - Réseaux', description: 'Laboratoire de réseaux', encadrant_id: 12 },
    { name: 'Labo 3 - IA', description: 'Laboratoire d\'intelligence artificielle', encadrant_id: 13 }
  ]);
  
  // Add laboratory chiefs
  await db.chefDeLabo.bulkAdd([
    { id: 11, laboratoire_id: 1 },
    { id: 12, laboratoire_id: 2 },
    { id: 13, laboratoire_id: 3 }
  ]);
  
  // Add materials
  const materialIds = await db.materiels.bulkAdd([
    { nom: 'Ordinateur Dell', type: 'Informatique', quantite: 10, chef_labo_id: 11, status: 'Available', laboratoire_id: 1 },
    { nom: 'Routeur Cisco', type: 'Réseau', quantite: 5, chef_labo_id: 12, status: 'Available', laboratoire_id: 2 },
    { nom: 'GPU NVIDIA', type: 'IA', quantite: 3, chef_labo_id: 13, status: 'Available', laboratoire_id: 3 },
    { nom: 'Imprimante 3D', type: 'Fabrication', quantite: 1, chef_labo_id: 11, status: 'Available', laboratoire_id: 1 }
  ]);
  
  // Add projects
  const projectIds = await db.projetsLabo.bulkAdd([
    { 
      nom: 'Projet IA Santé', 
      personnel: 'Équipe recherche 1', 
      encadrant: 13, 
      chef_labo_id: 13,
      description: 'Application d\'IA dans le domaine de la santé',
      start_date: new Date(),
      end_date: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months
      status: 'In Progress'
    },
    { 
      nom: 'Développement système embarqué', 
      personnel: 'Équipe recherche 2', 
      encadrant: 11, 
      chef_labo_id: 11,
      description: 'Système embarqué pour l\'agriculture de précision',
      start_date: new Date(),
      end_date: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000), // 3 months
      status: 'Planning'
    }
  ]);
  
  // Add sessions
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  await db.sessions.bulkAdd([
    { 
      laboratoire_id: 1, 
      date: today, 
      startTime: '09:00', 
      endTime: '12:00', 
      titre: 'Session programmation', 
      description: 'Cours de programmation avancée',
      status: 'Approved'
    },
    { 
      laboratoire_id: 2, 
      date: today, 
      startTime: '14:00', 
      endTime: '17:00', 
      titre: 'Session réseaux', 
      description: 'Configuration de réseaux',
      status: 'Approved'
    },
    { 
      laboratoire_id: 3, 
      date: nextWeek, 
      startTime: '10:00', 
      endTime: '13:00', 
      titre: 'Session IA', 
      description: 'Introduction au deep learning',
      status: 'Pending'
    }
  ]);
  
  // Add reservations
  await db.reservationsLabo.bulkAdd([
    { 
      user_id: 201, 
      resource_type: 'Session', 
      resource_id: 1, 
      start_date: today, 
      end_date: today, 
      status: 'Approved' 
    },
    { 
      user_id: 202, 
      resource_type: 'Material', 
      resource_id: 1, 
      start_date: today, 
      end_date: nextWeek, 
      status: 'Pending' 
    }
  ]);
  
  console.log('Sample laboratory data added successfully');
};
