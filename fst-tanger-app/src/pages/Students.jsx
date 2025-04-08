import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import db from '../utils/db';
import './Students.css';
import { 
  Inscription, 
  DossierEtudiant, 
  InformationAcademique, 
  Stage, 
  ConsultationInformation 
} from '../models/Student';

const Students = () => {
  const { t } = useTranslation();
  const { hasRole, ROLES, currentUser } = useAuth();
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentFile, setStudentFile] = useState(null);
  const [absences, setAbsences] = useState([]);
  const [academicInfo, setAcademicInfo] = useState(null);
  const [showModal, setShowModal] = useState({
    addStudent: false,
    editStudent: false,
    viewFile: false,
    addDocument: false,
    justifyAbsence: false,
    validateYear: false,
    newInscription: false,
    validateDocuments: false,
    archiveFile: false,
    planDefense: false,
    viewGrades: false,
    submitReport: false,
    authorizeDiploma: false
  });
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    dateNaissance: '',
    adresse: '',
    email: '',
    appogee: '',
    programme: '',
    justification: '',
    document: { type: '', file: null }
  });

  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [currentTab, setCurrentTab] = useState('details');
  const [studentGrades, setStudentGrades] = useState(null);
  const [studentStage, setStudentStage] = useState(null);
  const [inscriptionResult, setInscriptionResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  const [inscriptionForm, setInscriptionForm] = useState({
    etudiantInfo: {
      nom: '',
      prenom: '',
      dateNaissance: '',
      adresse: '',
      email: '',
      telephone: ''
    },
    academicInfo: {
      diplome: '',
      etablissement: '',
      specialite: '',
      anneeObtention: '',
      mention: ''
    },
    documents: [],
    formationCode: ''
  });

  const [documentValidationForm, setDocumentValidationForm] = useState({
    documentId: '',
    isValid: false,
    comment: ''
  });

  const [archiveForm, setArchiveForm] = useState({
    reason: '',
    confirmArchive: false
  });

  const [defenseForm, setDefenseForm] = useState({
    date: '',
    room: '',
    jury: [],
    additionalInfo: ''
  });

  const [reportForm, setReportForm] = useState({
    titre: '',
    contenu: '',
    fichier: null
  });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const studentsData = await db.etudiants.toArray();
        const enhancedStudents = await Promise.all(studentsData.map(async student => {
          const personne = await db.personnes.get(student.id);
          const inscriptions = await db.inscriptions
            .where('etudiant_id')
            .equals(student.id)
            .toArray();
          const formationCodes = inscriptions.map(ins => ins.formation_code).filter(Boolean);
          let formations = [];
          if (formationCodes.length > 0) {
            formations = await db.formations
              .where('code')
              .anyOf(formationCodes)
              .toArray();
          }
          const currentYear = new Date().getFullYear();
          const registrationYear = inscriptions.length > 0 
            ? new Date(inscriptions[0].dateInscription).getFullYear() 
            : currentYear;
          const level = currentYear - registrationYear + 1;
          return {
            ...student,
            ...personne,
            programme: formations.length > 0 ? formations[0].intitule : 'Non inscrit',
            niveau: `${level}ème année`,
            inscriptions
          };
        }));
        setStudents(enhancedStudents);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching students:', error);
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  useEffect(() => {
    const loadStudentFile = async () => {
      if (selectedStudent) {
        try {
          if (!db || !db.dossiers) {
            console.error('Database or dossiers table is not initialized');
            setStudentFile(null);
            setAbsences([]);
            setAcademicInfo({
              etudiant_id: selectedStudent.id,
              formation: selectedStudent.programme,
              niveau: selectedStudent.niveau,
              annee: new Date().getFullYear(),
              statut: 'En cours',
              modules: [],
              notes: {}
            });
            return;
          }

          const dossier = await db.dossiers
            .where('etudiant_id')
            .equals(selectedStudent.id)
            .first();

          const absencesList = db.absences ? 
            await db.absences
              .where('etudiant_id')
              .equals(selectedStudent.id)
              .toArray() : [];

          const academicData = {
            etudiant_id: selectedStudent.id,
            formation: selectedStudent.programme,
            niveau: selectedStudent.niveau,
            annee: new Date().getFullYear(),
            statut: 'En cours',
            modules: [],
            notes: {}
          };
          
          setStudentFile(dossier || null);
          setAbsences(absencesList || []);
          setAcademicInfo(academicData);
        } catch (error) {
          console.error('Error loading student file:', error);
          setStudentFile(null);
          setAbsences([]);
          setAcademicInfo({
            etudiant_id: selectedStudent.id,
            formation: selectedStudent.programme,
            niveau: selectedStudent.niveau,
            annee: new Date().getFullYear(),
            statut: 'En cours',
            modules: [],
            notes: {}
          });
        }
      }
    };
    loadStudentFile();
  }, [selectedStudent]);

  useEffect(() => {
    const loadFormations = async () => {
      try {
        const formationsData = await db.formations.toArray();
        setFormations(formationsData);
      } catch (error) {
        console.error('Error loading formations:', error);
      }
    };
    loadFormations();
  }, []);

  useEffect(() => {
    const loadStudentGrades = async () => {
      if (selectedStudent && currentTab === 'grades') {
        try {
          const grades = await ConsultationInformation.getNotesEtudiant(selectedStudent.id);
          setStudentGrades(grades);
        } catch (error) {
          console.error('Error loading student grades:', error);
          setStudentGrades(null);
        }
      }
    };
    loadStudentGrades();
  }, [selectedStudent, currentTab]);

  useEffect(() => {
    const loadStudentStage = async () => {
      if (selectedStudent && currentTab === 'internships') {
        try {
          if (!db || !db.stages) {
            console.error('Database or stages table is not initialized');
            setStudentStage(null);
            return;
          }

          const stages = await db.stages
            .where('etudiant_id')
            .equals(selectedStudent.id)
            .reverse()
            .sortBy('dateDebut');
            
          if (stages && stages.length > 0) {
            const stageInstance = Stage.fromDb(stages[0]);
            setStudentStage(stageInstance);
          } else {
            setStudentStage(null);
          }
        } catch (error) {
          console.error('Error loading student stage:', error);
          setStudentStage(null);
        }
      }
    };
    loadStudentStage();
  }, [selectedStudent, currentTab]);

  const formatDate = (dateString) => {
    if (!dateString) return t('common.unknown');
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return t('common.unknown');
      }
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return t('common.unknown');
    }
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.nom} ${student.prenom}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return fullName.includes(searchLower) || 
           (student.appogee && student.appogee.toString().includes(searchLower)) ||
           (student.email && student.email.toLowerCase().includes(searchLower));
  });

  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setActiveTab('details');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData({
      ...formData,
      document: {
        ...formData.document,
        file
      }
    });
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    console.log('Adding student:', formData);
    setShowModal({ ...showModal, addStudent: false });
  };

  const handleEditStudent = (e) => {
    e.preventDefault();
    console.log('Editing student:', formData);
    setShowModal({ ...showModal, editStudent: false });
  };

  const handleAddDocument = (e) => {
    e.preventDefault();
    console.log('Adding document:', formData.document);
    setShowModal({ ...showModal, addDocument: false });
  };

  const handleJustifyAbsence = (e) => {
    e.preventDefault();
    console.log('Justifying absence:', formData.justification);
    setShowModal({ ...showModal, justifyAbsence: false });
  };

  const handleValidateYear = (e) => {
    e.preventDefault();
    console.log('Validating year for student:', selectedStudent?.id);
    setShowModal({ ...showModal, validateYear: false });
  };

  const openModal = (modal) => {
    setShowModal({ ...showModal, [modal]: true });
    if (modal === 'addStudent') {
      setFormData({
        nom: '',
        prenom: '',
        dateNaissance: '',
        adresse: '',
        email: '',
        appogee: '',
        programme: ''
      });
    } else if (modal === 'editStudent' && selectedStudent) {
      setFormData({
        nom: selectedStudent.nom || '',
        prenom: selectedStudent.prenom || '',
        dateNaissance: selectedStudent.dateNaissance || '',
        adresse: selectedStudent.adresse || '',
        email: selectedStudent.email || '',
        appogee: selectedStudent.appogee || '',
        programme: selectedStudent.programme || ''
      });
    }
  };

  const closeModal = (modal) => {
    setShowModal({ ...showModal, [modal]: false });
  };

  const handleNewInscription = (e) => {
    e.preventDefault();
    const result = Inscription.creerInscription(
      inscriptionForm.etudiantInfo,
      inscriptionForm.academicInfo,
      inscriptionForm.documents,
      inscriptionForm.formationCode
    );
    setInscriptionResult(result);
    if (result.success) {
      console.log('Created inscription:', result.inscription);
      if (hasRole(ROLES.CHEF_DEPARTEMENT) || hasRole(ROLES.ADMIN)) {
        const dossier = DossierEtudiant.creerDossierEtudiant(
          result.inscription,
          {
            id: currentUser.id,
            nom: currentUser.nom,
            role: currentUser.role
          }
        );
        console.log('Created student file:', dossier);
      }
    }
    setShowModal({ ...showModal, newInscription: false });
  };

  const handleValidateDocument = (e) => {
    e.preventDefault();
    if (!selectedStudent || !studentFile) return;
    const dossier = DossierEtudiant.fromDb(studentFile);
    const result = dossier.validerDocument(
      documentValidationForm.documentId,
      documentValidationForm.isValid,
      documentValidationForm.comment
    );
    if (result.success) {
      console.log('Document validated:', result);
      const updatedDoc = dossier.documents.find(
        d => d.id === documentValidationForm.documentId
      );
      setStudentFile({
        ...studentFile,
        documents: studentFile.documents.map(doc => 
          doc.id === documentValidationForm.documentId ? updatedDoc : doc
        )
      });
    }
    setShowModal({ ...showModal, validateDocuments: false });
  };

  const handleArchiveFile = (e) => {
    e.preventDefault();
    if (!selectedStudent || !studentFile || !archiveForm.confirmArchive) return;
    const dossier = DossierEtudiant.fromDb(studentFile);
    const result = dossier.archiver(
      archiveForm.reason,
      currentUser.id
    );
    if (result.success) {
      console.log('File archived:', result);
      setStudentFile({
        ...studentFile,
        statut: 'Archivé',
        historique: [...studentFile.historique, {
          action: 'archived',
          date: new Date(),
          details: archiveForm.reason,
          user_id: currentUser.id
        }]
      });
    }
    setShowModal({ ...showModal, archiveFile: false });
  };

  const handlePlanDefense = (e) => {
    e.preventDefault();
    if (!selectedStudent || !studentStage) return;
    const result = studentStage.planifierSoutenance(
      new Date(defenseForm.date),
      defenseForm.jury,
      defenseForm.room
    );
    console.log('Defense planned:', result);
    setStudentStage({
      ...studentStage,
      dateSoutenance: new Date(defenseForm.date),
      jury: defenseForm.jury,
      salle: defenseForm.room,
      statut: 'Soutenance planifiée'
    });
    setShowModal({ ...showModal, planDefense: false });
  };

  const handleSubmitReport = (e) => {
    e.preventDefault();
    if (!selectedStudent || !studentStage) return;
    const result = studentStage.soumettreRapport(reportForm);
    console.log('Report submitted:', result);
    setStudentStage({
      ...studentStage,
      rapportSoumis: true,
      statut: 'Rapport soumis'
    });
    setShowModal({ ...showModal, submitReport: false });
  };

  const handleAuthorizeDiploma = (e) => {
    e.preventDefault();
    if (!selectedStudent || !studentStage) return;
    const result = studentStage.autoriserDiplome(
      currentUser.id,
      'Conditions remplies pour l\'obtention du diplôme'
    );
    console.log('Diploma authorized:', result);
    if (result.success) {
      setStudentStage({
        ...studentStage,
        statut: 'Diplôme autorisé'
      });
    }
    setShowModal({ ...showModal, authorizeDiploma: false });
  };

  const handleInscriptionFormChange = (e, section) => {
    const { name, value } = e.target;
    if (section === 'etudiant') {
      setInscriptionForm({
        ...inscriptionForm,
        etudiantInfo: {
          ...inscriptionForm.etudiantInfo,
          [name]: value
        }
      });
    } else if (section === 'academic') {
      setInscriptionForm({
        ...inscriptionForm,
        academicInfo: {
          ...inscriptionForm.academicInfo,
          [name]: value
        }
      });
    } else {
      setInscriptionForm({
        ...inscriptionForm,
        [name]: value
      });
    }
  };

  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    const documentType = e.target.getAttribute('data-document-type');
    if (file) {
      const newDocument = {
        id: Date.now(),
        type: documentType,
        file: file,
        filename: file.name,
        size: file.size,
        uploadDate: new Date()
      };
      const updatedDocuments = inscriptionForm.documents.filter(
        doc => doc.type !== documentType
      );
      setInscriptionForm({
        ...inscriptionForm,
        documents: [...updatedDocuments, newDocument]
      });
    }
  };

  const renderStudentTabs = () => {
    if (!selectedStudent) return null;
    return (
      <div className="fstt-details-tabs">
        <button 
          className={`fstt-tab-btn ${currentTab === 'details' ? 'active' : ''}`}
          onClick={() => setCurrentTab('details')}
        >
          {t('students.details')}
        </button>
        <button 
          className={`fstt-tab-btn ${currentTab === 'file' ? 'active' : ''}`}
          onClick={() => setCurrentTab('file')}
        >
          {t('students.file')}
        </button>
        <button 
          className={`fstt-tab-btn ${currentTab === 'absences' ? 'active' : ''}`}
          onClick={() => setCurrentTab('absences')}
        >
          {t('students.absences')}
        </button>
        <button 
          className={`fstt-tab-btn ${currentTab === 'grades' ? 'active' : ''}`}
          onClick={() => setCurrentTab('grades')}
        >
          {t('students.grades')}
        </button>
        <button 
          className={`fstt-tab-btn ${currentTab === 'internships' ? 'active' : ''}`}
          onClick={() => setCurrentTab('internships')}
        >
          {t('students.internships')}
        </button>
      </div>
    );
  };

  const renderGradesContent = () => {
    if (!studentGrades) {
      return <p className="fstt-empty">{t('students.gradesNotAvailable')}</p>;
    }
    return (
      <div className="fstt-grades-content">
        <div className="fstt-grades-summary">
          <h3>{t('evaluations.average')}: {studentGrades.moyenne || '-'}</h3>
          <div className="fstt-student-progress">
            <div className="fstt-progress-bar">
              <div 
                className="fstt-progress-value" 
                style={{width: `${studentGrades.moyenne * 5}%`}}
              ></div>
            </div>
            <span className="fstt-progress-text">
              {studentGrades.moyenne >= 10 ? t('common.passing') : t('common.failing')}
            </span>
          </div>
        </div>
        {Object.keys(studentGrades.modules).length > 0 ? (
          <table className="fstt-table">
            <thead>
              <tr>
                <th>{t('courses.code')}</th>
                <th>{t('courses.name')}</th>
                <th>{t('evaluations.grade')}</th>
                <th>{t('evaluations.coefficient')}</th>
                <th>{t('courses.status')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(studentGrades.modules).map((module) => (
                <tr key={module.code}>
                  <td>{module.code}</td>
                  <td>{module.nom}</td>
                  <td className={`fstt-grade ${module.moyenne >= 10 ? 'passing' : 'failing'}`}>
                    {module.moyenne.toFixed(2)}
                  </td>
                  <td>{module.coefficient}</td>
                  <td>
                    <span className={`fstt-status ${module.moyenne >= 10 ? 'valid' : 'invalid'}`}>
                      {module.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="fstt-empty">{t('evaluations.noGrades')}</p>
        )}
        {(hasRole(ROLES.ENSEIGNANT) || hasRole(ROLES.CHEF_DEPARTEMENT)) && (
          <div className="fstt-grades-actions">
            <button 
              className="fstt-btn fstt-btn-primary"
              onClick={() => setShowModal({...showModal, viewGrades: true})}
            >
              {t('evaluations.enterGrades')}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderInternshipsContent = () => {
    if (!studentStage) {
      return (
        <div className="fstt-internships-content">
          <p className="fstt-empty">{t('students.internshipsNotAvailable')}</p>
          {(hasRole(ROLES.COORDINATEUR) || hasRole(ROLES.CHEF_DEPARTEMENT)) && (
            <button 
              className="fstt-btn fstt-btn-primary"
              onClick={() => {
                // Logic to add a new internship
              }}
            >
              {t('internships.addNew')}
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="fstt-internships-content">
        <div className="fstt-internship-summary">
          <h3>{t('internships.details')}</h3>
          <div className="fstt-details-grid">
            <div className="fstt-details-item">
              <label>{t('internships.company')}</label>
              <p>{studentStage.entreprise}</p>
            </div>
            <div className="fstt-details-item">
              <label>{t('internships.subject')}</label>
              <p>{studentStage.sujet}</p>
            </div>
            <div className="fstt-details-item">
              <label>{t('internships.startDate')}</label>
              <p>{formatDate(studentStage.dateDebut)}</p>
            </div>
            <div className="fstt-details-item">
              <label>{t('internships.endDate')}</label>
              <p>{formatDate(studentStage.dateFin)}</p>
            </div>
            <div className="fstt-details-item">
              <label>{t('internships.status')}</label>
              <p>
                <span className={`fstt-status ${studentStage.rapportSoumis ? 'valid' : 'pending'}`}>
                  {studentStage.statut}
                </span>
              </p>
            </div>
            <div className="fstt-details-item">
              <label>{t('internships.reportStatus')}</label>
              <p>
                <span className={`fstt-status ${studentStage.rapportSoumis ? 'valid' : 'pending'}`}>
                  {studentStage.rapportSoumis ? t('internships.reportSubmitted') : t('common.pending')}
                </span>
              </p>
            </div>
            {studentStage.dateSoutenance && (
              <div className="fstt-details-item">
                <label>{t('internships.defenseDate')}</label>
                <p>{formatDate(studentStage.dateSoutenance)}</p>
              </div>
            )}
            {studentStage.note && (
              <div className="fstt-details-item">
                <label>{t('internships.grade')}</label>
                <p className={`fstt-grade ${studentStage.note >= 10 ? 'passing' : 'failing'}`}>
                  {studentStage.note}/20
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="fstt-internship-actions">
          {!studentStage.rapportSoumis && (
            <button 
              className="fstt-btn fstt-btn-primary"
              onClick={() => setShowModal({...showModal, submitReport: true})}
            >
              {t('internships.submitReport')}
            </button>
          )}
          {(hasRole(ROLES.COORDINATEUR) || hasRole(ROLES.CHEF_DEPARTEMENT)) && studentStage.rapportSoumis && !studentStage.dateSoutenance && (
            <button 
              className="fstt-btn fstt-btn-primary"
              onClick={() => setShowModal({...showModal, planDefense: true})}
            >
              {t('internships.scheduleDefense')}
            </button>
          )}
          {(hasRole(ROLES.CHEF_DEPARTEMENT)) && studentStage.note && studentStage.note >= 10 && studentStage.statut !== 'Diplôme autorisé' && studentStage.statut !== 'Diplôme remis' && (
            <button 
              className="fstt-btn fstt-btn-success"
              onClick={() => setShowModal({...showModal, authorizeDiploma: true})}
            >
              {t('internships.deliverDiploma')}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="fstt-loading">{t('common.loading')}</div>;
  }

  const isOwnProfile = currentUser && 
                      hasRole(ROLES.ETUDIANT) && 
                      selectedStudent && 
                      currentUser.id === selectedStudent.id;

  return (
    <div className="fstt-students ns">
      <h1>{t('students.title')}</h1>
      {activeTab === 'list' ? (
        <>
          <div className="fstt-students-controls">
            <div className="fstt-search">
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {hasRole(ROLES.CHEF_DEPARTEMENT) && (
              <button 
                className="fstt-btn fstt-btn-primary"
                onClick={() => openModal('addStudent')}
              >
                {t('common.add')}
              </button>
            )}
          </div>
          <div className="fstt-students-list">
            {filteredStudents.length > 0 ? (
              <table className="fstt-table">
                <thead>
                  <tr>
                    <th>{t('students.appogee')}</th>
                    <th>{t('students.name')}</th>
                    <th>{t('students.program')}</th>
                    <th>{t('students.level')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.id}>
                      <td>{student.appogee}</td>
                      <td>{student.nom} {student.prenom}</td>
                      <td>{student.programme}</td>
                      <td>{student.niveau}</td>
                      <td>
                        <button 
                          className="fstt-btn"
                          onClick={() => handleViewStudent(student)}
                        >
                          {t('common.view')}
                        </button>
                        {hasRole(ROLES.CHEF_DEPARTEMENT) && (
                          <>
                            <button 
                              className="fstt-btn fstt-btn-secondary"
                              onClick={() => {
                                setSelectedStudent(student);
                                openModal('editStudent');
                              }}
                            >
                              {t('common.edit')}
                            </button>
                            <button 
                              className="fstt-btn fstt-btn-danger"
                              onClick={() => {
                                if (window.confirm(t('students.deleteConfirmation'))) {
                                  console.log('Deleting student:', student.id);
                                }
                              }}
                            >
                              {t('common.delete')}
                            </button>
                          </>
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
        </>
      ) : activeTab === 'details' && selectedStudent ? (
        <div className="fstt-student-details">
          <div className="fstt-details-header">
            <button 
              className="fstt-btn"
              onClick={() => setActiveTab('list')}
            >
              {t('common.back')}
            </button>
            {renderStudentTabs()}
          </div>
          <div className="fstt-details-content">
            {currentTab === 'details' && (
              <div className="fstt-details-section">
                <h2>{t('students.personalInfo')}</h2>
                <div className="fstt-details-grid">
                  <div className="fstt-details-item">
                    <label>{t('students.name')}</label>
                    <p>{selectedStudent.nom} {selectedStudent.prenom}</p>
                  </div>
                  <div className="fstt-details-item">
                    <label>{t('students.appogee')}</label>
                    <p>{selectedStudent.appogee || t('common.unknown')}</p>
                  </div>
                  <div className="fstt-details-item">
                    <label>{t('students.birthdate')}</label>
                    <p>{formatDate(selectedStudent.dateNaissance)}</p>
                  </div>
                  <div className="fstt-details-item">
                    <label>{t('students.address')}</label>
                    <p>{selectedStudent.adresse || t('common.unknown')}</p>
                  </div>
                  <div className="fstt-details-item">
                    <label>{t('students.email')}</label>
                    <p>{selectedStudent.email || t('common.unknown')}</p>
                  </div>
                </div>
              </div>
            )}
            {currentTab === 'file' && (
              <div className="fstt-file-content">
                {studentFile ? (
                  <>
                    <div className="fstt-file-header">
                      <p><strong>{t('students.fileStatus')}</strong>: {studentFile.statut}</p>
                      <p><strong>{t('students.creationDate')}</strong>: {formatDate(studentFile.dateCreation)}</p>
                    </div>
                    <h3>{t('students.documents')}</h3>
                    {studentFile.documents && studentFile.documents.length > 0 ? (
                      <div className="fstt-documents-grid">
                        {studentFile.documents.map((doc, index) => (
                          <div className="fstt-document-card" key={index}>
                            <div className="fstt-document-icon">
                              <span aria-hidden="true">📄</span>
                            </div>
                            <div className="fstt-document-type">{doc.type}</div>
                            <div className="fstt-document-date">{formatDate(doc.dateAjout)}</div>
                            <span className={`fstt-status ${doc.isValid ? 'valid' : 'pending'}`}>
                              {doc.isValid ? t('students.validated') : t('students.pending')}
                            </span>
                            <div className="fstt-document-actions">
                              <button className="fstt-btn fstt-btn-sm">{t('common.view')}</button>
                              {(hasRole(ROLES.CHEF_DEPARTEMENT) || hasRole(ROLES.COORDINATEUR)) && !doc.isValid && (
                                <button 
                                  className="fstt-btn fstt-btn-success fstt-btn-sm"
                                  onClick={() => {
                                    setDocumentValidationForm({
                                      documentId: doc.id,
                                      isValid: true,
                                      comment: ''
                                    });
                                    setShowModal({ ...showModal, validateDocuments: true });
                                  }}
                                >
                                  {t('students.validate')}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="fstt-empty">{t('students.noDocuments')}</p>
                    )}
                    {(hasRole(ROLES.CHEF_DEPARTEMENT) || hasRole(ROLES.ADMIN)) && (
                      <div className="fstt-file-actions">
                        <button 
                          className="fstt-btn fstt-btn-primary"
                          onClick={() => setShowModal({ ...showModal, addDocument: true })}
                        >
                          {t('students.addDocument')}
                        </button>
                        <button 
                          className="fstt-btn fstt-btn-danger"
                          onClick={() => setShowModal({ ...showModal, archiveFile: true })}
                        >
                          {t('common.archive')}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="fstt-file-missing">
                    <p>{t('students.noFileFound')}</p>
                    {hasRole(ROLES.CHEF_DEPARTEMENT) && (
                      <button 
                        className="fstt-btn fstt-btn-primary"
                        onClick={() => setShowModal({ ...showModal, newInscription: true })}
                      >
                        {t('students.createFile')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {currentTab === 'absences' && (
              <div className="fstt-absences-content">
                {absences.length > 0 ? (
                  <table className="fstt-table">
                    <thead>
                      <tr>
                        <th>{t('students.date')}</th>
                        <th>{t('students.course')}</th>
                        <th>{t('students.justified')}</th>
                        <th>{t('students.reason')}</th>
                        <th>{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {absences.map((absence, index) => (
                        <tr key={index}>
                          <td>{formatDate(absence.date)}</td>
                          <td>{absence.cours_code || t('common.unknown')}</td>
                          <td>
                            <span className={`fstt-status ${absence.justifiee ? 'valid' : 'invalid'}`}>
                              {absence.justifiee ? t('common.yes') : t('common.no')}
                            </span>
                          </td>
                          <td>{absence.motif || '-'}</td>
                          <td>
                            {isOwnProfile && !absence.justifiee && (
                              <button 
                                className="fstt-btn fstt-btn-primary"
                                onClick={() => {
                                  setSelectedStudent(selectedStudent);
                                  openModal('justifyAbsence');
                                }}
                              >
                                {t('students.justify')}
                              </button>
                            )}
                            {(hasRole(ROLES.COORDINATEUR) || hasRole(ROLES.CHEF_DEPARTEMENT)) && (
                              <>
                                {!absence.justifiee ? (
                                  <button 
                                    className="fstt-btn fstt-btn-success"
                                    onClick={() => {
                                      console.log('Approving absence:', absence.id);
                                    }}
                                  >
                                    {t('students.approve')}
                                  </button>
                                ) : (
                                  <button 
                                    className="fstt-btn fstt-btn-danger"
                                    onClick={() => {
                                      console.log('Rejecting absence:', absence.id);
                                    }}
                                  >
                                    {t('students.reject')}
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="fstt-empty">{t('students.noAbsences')}</p>
                )}
              </div>
            )}
            {currentTab === 'grades' && (
              renderGradesContent()
            )}
            {currentTab === 'internships' && (
              renderInternshipsContent()
            )}
          </div>
        </div>
      ) : null}
      {showModal.newInscription && (
        <div className="fstt-modal">
          <div className="fstt-modal-content fstt-modal-lg">
            <h3>{t('students.newInscription')}</h3>
            <form onSubmit={handleNewInscription}>
              <div className="fstt-form-section">
                <h4>{t('students.personalInfo')}</h4>
                <div className="fstt-form-row">
                  <div className="fstt-form-group">
                    <label htmlFor="nom">{t('students.name')}</label>
                    <input
                      type="text"
                      id="nom"
                      name="nom"
                      value={inscriptionForm.etudiantInfo.nom}
                      onChange={(e) => handleInscriptionFormChange(e, 'etudiant')}
                      required
                    />
                  </div>
                  <div className="fstt-form-group">
                    <label htmlFor="prenom">{t('students.firstname')}</label>
                    <input
                      type="text"
                      id="prenom"
                      name="prenom"
                      value={inscriptionForm.etudiantInfo.prenom}
                      onChange={(e) => handleInscriptionFormChange(e, 'etudiant')}
                      required
                    />
                  </div>
                </div>
                <div className="fstt-form-row">
                  <div className="fstt-form-group">
                    <label htmlFor="dateNaissance">{t('students.birthdate')}</label>
                    <input
                      type="date"
                      id="dateNaissance"
                      name="dateNaissance"
                      value={inscriptionForm.etudiantInfo.dateNaissance}
                      onChange={(e) => handleInscriptionFormChange(e, 'etudiant')}
                      required
                    />
                  </div>
                  <div className="fstt-form-group">
                    <label htmlFor="email">{t('students.email')}</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={inscriptionForm.etudiantInfo.email}
                      onChange={(e) => handleInscriptionFormChange(e, 'etudiant')}
                      required
                    />
                  </div>
                </div>
                <div className="fstt-form-row">
                  <div className="fstt-form-group">
                    <label htmlFor="adresse">{t('students.address')}</label>
                    <input
                      type="text"
                      id="adresse"
                      name="adresse"
                      value={inscriptionForm.etudiantInfo.adresse}
                      onChange={(e) => handleInscriptionFormChange(e, 'etudiant')}
                    />
                  </div>
                  <div className="fstt-form-group">
                    <label htmlFor="telephone">{t('profile.phone')}</label>
                    <input
                      type="tel"
                      id="telephone"
                      name="telephone"
                      value={inscriptionForm.etudiantInfo.telephone}
                      onChange={(e) => handleInscriptionFormChange(e, 'etudiant')}
                    />
                  </div>
                </div>
              </div>
              <div className="fstt-form-section">
                <h4>{t('students.academicInfo')}</h4>
                <div className="fstt-form-row">
                  <div className="fstt-form-group">
                    <label htmlFor="diplome">{t('registration.diploma')}</label>
                    <input
                      type="text"
                      id="diplome"
                      name="diplome"
                      value={inscriptionForm.academicInfo.diplome}
                      onChange={(e) => handleInscriptionFormChange(e, 'academic')}
                      required
                    />
                  </div>
                  <div className="fstt-form-group">
                    <label htmlFor="etablissement">{t('registration.institution')}</label>
                    <input
                      type="text"
                      id="etablissement"
                      name="etablissement"
                      value={inscriptionForm.academicInfo.etablissement}
                      onChange={(e) => handleInscriptionFormChange(e, 'academic')}
                      required
                    />
                  </div>
                </div>
                <div className="fstt-form-row">
                  <div className="fstt-form-group">
                    <label htmlFor="specialite">{t('registration.specialization')}</label>
                    <input
                      type="text"
                      id="specialite"
                      name="specialite"
                      value={inscriptionForm.academicInfo.specialite}
                      onChange={(e) => handleInscriptionFormChange(e, 'academic')}
                    />
                  </div>
                  <div className="fstt-form-group">
                    <label htmlFor="anneeObtention">{t('registration.diplomaYear')}</label>
                    <input
                      type="number"
                      id="anneeObtention"
                      name="anneeObtention"
                      value={inscriptionForm.academicInfo.anneeObtention}
                      onChange={(e) => handleInscriptionFormChange(e, 'academic')}
                    />
                  </div>
                </div>
                <div className="fstt-form-row">
                  <div className="fstt-form-group">
                    <label htmlFor="formationCode">{t('students.program')}</label>
                    <select
                      id="formationCode"
                      name="formationCode"
                      value={inscriptionForm.formationCode}
                      onChange={(e) => handleInscriptionFormChange(e)}
                      required
                    >
                      <option value="">{t('common.select')}</option>
                      {formations.map((formation) => (
                        <option key={formation.code} value={formation.code}>
                          {formation.intitule}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="fstt-form-section">
                <h4>{t('students.documents')}</h4>
                <div className="fstt-document-uploads">
                  <div className="fstt-form-group">
                    <label htmlFor="docIdentity">{t('registration.cin')}</label>
                    <input
                      type="file"
                      id="docIdentity"
                      data-document-type="ID"
                      onChange={handleDocumentUpload}
                    />
                    {inscriptionForm.documents.find(doc => doc.type === 'ID') && (
                      <span className="fstt-document-status">
                        {t('registration.documentUploaded')}
                      </span>
                    )}
                  </div>
                  <div className="fstt-form-group">
                    <label htmlFor="docDiploma">{t('registration.diploma')}</label>
                    <input
                      type="file"
                      id="docDiploma"
                      data-document-type="Diplome"
                      onChange={handleDocumentUpload}
                    />
                    {inscriptionForm.documents.find(doc => doc.type === 'Diplome') && (
                      <span className="fstt-document-status">
                        {t('registration.documentUploaded')}
                      </span>
                    )}
                  </div>
                  <div className="fstt-form-group">
                    <label htmlFor="docPhoto">{t('registration.photo')}</label>
                    <input
                      type="file"
                      id="docPhoto"
                      data-document-type="Photo"
                      onChange={handleDocumentUpload}
                    />
                    {inscriptionForm.documents.find(doc => doc.type === 'Photo') && (
                      <span className="fstt-document-status">
                        {t('registration.documentUploaded')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="fstt-form-actions">
                <button
                  type="button"
                  className="fstt-btn"
                  onClick={() => setShowModal({...showModal, newInscription: false})}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="fstt-btn fstt-btn-primary"
                >
                  {t('common.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showModal.validateDocuments && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <h3>{t('students.validateDocument')}</h3>
            <form onSubmit={handleValidateDocument}>
              <div className="fstt-form-group">
                <label htmlFor="validationComment">{t('common.comment')}</label>
                <textarea
                  id="validationComment"
                  name="comment"
                  value={documentValidationForm.comment}
                  onChange={(e) => setDocumentValidationForm({
                    ...documentValidationForm,
                    comment: e.target.value
                  })}
                ></textarea>
              </div>
              <div className="fstt-form-actions">
                <button
                  type="button"
                  className="fstt-btn"
                  onClick={() => setShowModal({...showModal, validateDocuments: false})}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="fstt-btn fstt-btn-danger"
                  onClick={() => {
                    setDocumentValidationForm({
                      ...documentValidationForm,
                      isValid: false
                    });
                    handleValidateDocument();
                  }}
                >
                  {t('common.reject')}
                </button>
                <button
                  type="submit"
                  className="fstt-btn fstt-btn-success"
                >
                  {t('students.validate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showModal.archiveFile && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <h3>{t('common.archive')}</h3>
            <form onSubmit={handleArchiveFile}>
              <div className="fstt-form-group">
                <label htmlFor="archiveReason">{t('common.reason')}</label>
                <textarea
                  id="archiveReason"
                  name="reason"
                  value={archiveForm.reason}
                  onChange={(e) => setArchiveForm({
                    ...archiveForm,
                    reason: e.target.value
                  })}
                  required
                ></textarea>
              </div>
              <div className="fstt-form-group">
                <div className="fstt-setting-checkbox">
                  <input
                    type="checkbox"
                    id="confirmArchive"
                    name="confirmArchive"
                    checked={archiveForm.confirmArchive}
                    onChange={(e) => setArchiveForm({
                      ...archiveForm,
                      confirmArchive: e.target.checked
                    })}
                  />
                  <label htmlFor="confirmArchive">{t('common.confirmAction')}</label>
                </div>
              </div>
              <div className="fstt-form-actions">
                <button
                  type="button"
                  className="fstt-btn"
                  onClick={() => setShowModal({...showModal, archiveFile: false})}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="fstt-btn fstt-btn-danger"
                  disabled={!archiveForm.confirmArchive}
                >
                  {t('common.archive')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
