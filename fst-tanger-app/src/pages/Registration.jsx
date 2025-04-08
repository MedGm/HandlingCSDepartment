import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import db from '../utils/db';
import { useNavigate } from 'react-router-dom';

/**
 * Student Registration component
 * Implements the student registration flow according to UML diagram
 */
const Registration = ({ onBackToLogin }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  // State for controlling the registration flow
  const [step, setStep] = useState(1);
  const [isExternal, setIsExternal] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [selectedFormation, setSelectedFormation] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [documentsComplete, setDocumentsComplete] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    // Personal information
    nom: '',
    prenom: '',
    dateNaissance: '',
    lieuNaissance: '',
    nationalite: '',
    cin: '',
    cne: '',
    adresse: '',
    ville: '',
    telephone: '',
    email: '',
    
    // Academic information
    baccalaureat: {
      serie: '',
      annee: '',
      mention: '',
      etablissement: ''
    },
    diplome: {
      type: '',
      specialite: '',
      etablissement: '',
      annee: '',
      moyenne: ''
    },
    
    // Documents
    documents: {
      cin: null,
      diplome: null,
      releve: null,
      photo: null,
      declaration: null
    }
  });
  
  // Available formations data
  const formations = [
    { 
      id: 'gi', 
      name: 'Génie Informatique', 
      description: 'Formation en développement de logiciels, intelligence artificielle et systèmes distribués.'
    },
    { 
      id: 'gm', 
      name: 'Génie Mécanique', 
      description: 'Formation en conception mécanique, robotique et systèmes automatisés.'
    },
    { 
      id: 'gc', 
      name: 'Génie Civil', 
      description: 'Formation en conception structurale, géotechnique et gestion de projets de construction.'
    },
    { 
      id: 'ge', 
      name: 'Génie Électrique', 
      description: 'Formation en systèmes électriques, électronique et automatisme.'
    }
  ];
  
  // Required documents based on the UML diagram
  const requiredDocuments = [
    { id: 'cin', name: 'Carte d\'identité nationale', required: true },
    { id: 'diplome', name: 'Diplôme ou attestation de réussite', required: true },
    { id: 'releve', name: 'Relevé de notes', required: true },
    { id: 'photo', name: 'Photo d\'identité', required: true },
    { id: 'declaration', name: 'Déclaration sur l\'honneur', required: false }
  ];

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle document uploads
  const handleDocumentChange = (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [name]: files[0]
        }
      }));
    }
  };

  // Check if all required documents are uploaded
  useEffect(() => {
    const complete = requiredDocuments
      .filter(doc => doc.required)
      .every(doc => formData.documents[doc.id]);
    
    setDocumentsComplete(complete);
  }, [formData.documents]);

  // Check eligibility
  const checkEligibility = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // Validate basic form data
      if (!formData.nom || !formData.prenom || !formData.dateNaissance || !formData.email) {
        throw new Error(t('registration.errorMissingFields'));
      }

      // In a real app, we would call an API to check eligibility
      // For demo, check if user has diploma past high school
      const hasDiploma = formData.diplome.type && formData.diplome.annee;
      const isEligible = hasDiploma;
      
      setEligibilityResult({
        eligible: isEligible,
        message: isEligible 
          ? t('registration.eligibleMessage')
          : t('registration.notEligibleMessage')
      });
      
      if (isEligible) {
        setStep(2); // Move to formations selection
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle formation selection
  const selectFormation = (formationId) => {
    setSelectedFormation(formationId);
  };

  // Submit formation choice and move to documents step
  const submitFormationChoice = (e) => {
    e.preventDefault();
    
    if (!selectedFormation) {
      setErrorMessage(t('registration.errorSelectFormation'));
      return;
    }
    
    setStep(3); // Move to documents submission step
    setErrorMessage('');
  };

  // Submit documents and complete registration
  const submitDocuments = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // Check if all required documents are uploaded
      const missingDocs = requiredDocuments
        .filter(doc => doc.required && !formData.documents[doc.id])
        .map(doc => doc.name);
      
      if (missingDocs.length > 0) {
        throw new Error(`${t('registration.errorMissingDocs')}: ${missingDocs.join(', ')}`);
      }
      
      // In a real app, we would upload the documents to a server
      // and create the student account
      
      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create student
      const studentId = Date.now().toString();
      const selectedProgram = formations.find(f => f.id === selectedFormation);
      
      // Create student dossier
      const dossier = {
        id: `dossier_${studentId}`,
        etudiant_id: studentId,
        dateCreation: new Date(),
        statut: 'En attente',
        documents: Object.entries(formData.documents).map(([type, file]) => ({
          id: `doc_${type}_${Date.now()}`,
          type,
          name: file ? file.name : 'Document manquant',
          dateAjout: new Date(),
          isValid: false,
          fileName: file ? file.name : ''
        }))
      };
      
      // In a real app, we would save this to the database
      console.log('Creating student account:', {
        student: {
          id: studentId,
          ...formData,
          programme: selectedProgram?.name
        },
        dossier
      });
      
      // Simulate successful registration
      setRegistrationComplete(true);
      setStep(4);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Render the registration step indicator
  const renderSteps = () => {
    return (
      <ul className="fstt-steps">
        <li className={`fstt-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="fstt-step-icon">1</div>
          <div className="fstt-step-label">{t('registration.stepEligibility')}</div>
        </li>
        <li className={`fstt-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="fstt-step-icon">2</div>
          <div className="fstt-step-label">{t('registration.stepFormation')}</div>
        </li>
        <li className={`fstt-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
          <div className="fstt-step-icon">3</div>
          <div className="fstt-step-label">{t('registration.stepDocuments')}</div>
        </li>
        <li className={`fstt-step ${step >= 4 ? 'active' : ''}`}>
          <div className="fstt-step-icon">4</div>
          <div className="fstt-step-label">{t('registration.stepConfirmation')}</div>
        </li>
      </ul>
    );
  };

  // Render the eligibility form (Step 1)
  const renderEligibilityForm = () => {
    return (
      <form onSubmit={checkEligibility} className="fstt-registration-form">
        <p className="fstt-form-description">{t('registration.eligibilityDescription')}</p>
        
        <div className="fstt-form-section">
          <h4>{t('registration.personalInfo')}</h4>
          <div className="fstt-form-grid">
            <div className="fstt-login-field">
              <label htmlFor="nom">{t('registration.lastname')}*</label>
              <input
                type="text"
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="prenom">{t('registration.firstname')}*</label>
              <input
                type="text"
                id="prenom"
                name="prenom"
                value={formData.prenom}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="dateNaissance">{t('registration.birthdate')}*</label>
              <input
                type="date"
                id="dateNaissance"
                name="dateNaissance"
                value={formData.dateNaissance}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="lieuNaissance">{t('registration.birthplace')}</label>
              <input
                type="text"
                id="lieuNaissance"
                name="lieuNaissance"
                value={formData.lieuNaissance}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="nationalite">{t('registration.nationality')}</label>
              <input
                type="text"
                id="nationalite"
                name="nationalite"
                value={formData.nationalite}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="cin">{t('registration.cin')}</label>
              <input
                type="text"
                id="cin"
                name="cin"
                value={formData.cin}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="cne">{t('registration.cne')}</label>
              <input
                type="text"
                id="cne"
                name="cne"
                value={formData.cne}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="email">{t('registration.email')}*</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="telephone">{t('registration.phone')}</label>
              <input
                type="tel"
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="adresse">{t('registration.address')}</label>
              <input
                type="text"
                id="adresse"
                name="adresse"
                value={formData.adresse}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="ville">{t('registration.city')}</label>
              <input
                type="text"
                id="ville"
                name="ville"
                value={formData.ville}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>
        
        <div className="fstt-form-section">
          <h4>{t('registration.academicInfo')}</h4>
          <div className="fstt-form-grid">
            <div className="fstt-login-field">
              <label htmlFor="baccalaureat.serie">{t('registration.bacType')}*</label>
              <input
                type="text"
                id="baccalaureat.serie"
                name="baccalaureat.serie"
                value={formData.baccalaureat.serie}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="baccalaureat.annee">{t('registration.bacYear')}*</label>
              <input
                type="text"
                id="baccalaureat.annee"
                name="baccalaureat.annee"
                value={formData.baccalaureat.annee}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="baccalaureat.mention">{t('registration.bacGrade')}</label>
              <input
                type="text"
                id="baccalaureat.mention"
                name="baccalaureat.mention"
                value={formData.baccalaureat.mention}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="baccalaureat.etablissement">{t('registration.bacSchool')}</label>
              <input
                type="text"
                id="baccalaureat.etablissement"
                name="baccalaureat.etablissement"
                value={formData.baccalaureat.etablissement}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="diplome.type">{t('registration.diploma')}*</label>
              <select
                id="diplome.type"
                name="diplome.type"
                value={formData.diplome.type}
                onChange={handleInputChange}
                required
              >
                <option value="">{t('common.select')}</option>
                <option value="licence">Licence</option>
                <option value="dut">DUT</option>
                <option value="deust">DEUST</option>
                <option value="master">Master</option>
                <option value="ingenieur">Ingénieur</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="diplome.specialite">{t('registration.specialization')}*</label>
              <input
                type="text"
                id="diplome.specialite"
                name="diplome.specialite"
                value={formData.diplome.specialite}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="diplome.etablissement">{t('registration.institution')}*</label>
              <input
                type="text"
                id="diplome.etablissement"
                name="diplome.etablissement"
                value={formData.diplome.etablissement}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="diplome.annee">{t('registration.diplomaYear')}*</label>
              <input
                type="text"
                id="diplome.annee"
                name="diplome.annee"
                value={formData.diplome.annee}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="fstt-login-field">
              <label htmlFor="diplome.moyenne">{t('registration.gpa')}</label>
              <input
                type="text"
                id="diplome.moyenne"
                name="diplome.moyenne"
                value={formData.diplome.moyenne}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>
        
        {eligibilityResult && (
          <div className={`fstt-login-${eligibilityResult.eligible ? 'success' : 'error'}`}>
            {eligibilityResult.message}
          </div>
        )}
        
        {errorMessage && (
          <div className="fstt-login-error">
            {errorMessage}
          </div>
        )}
        
        <div className="fstt-form-actions">
          <button
            type="button"
            className="fstt-btn fstt-btn-secondary"
            onClick={onBackToLogin}
          >
            {t('common.back')}
          </button>
          
          <button
            type="submit"
            className="fstt-login-button"
            disabled={loading}
          >
            {loading ? t('common.loading') : t('registration.checkEligibility')}
          </button>
        </div>
        
        <div className="fstt-form-footer">
          <p>* {t('registration.requiredFields')}</p>
        </div>
      </form>
    );
  };

  // Render the formation selection form (Step 2)
  const renderFormationSelection = () => {
    return (
      <form onSubmit={submitFormationChoice} className="fstt-registration-form">
        <h3>{t('registration.chooseFormation')}</h3>
        <p className="fstt-form-description">{t('registration.chooseFormationDescription')}</p>
        
        <div className="fstt-form-section">
          <h4>{t('registration.availableFormations')}</h4>
          <div className="fstt-formations-list">
            {formations.map(formation => (
              <div
                key={formation.id}
                className={`fstt-formation-card ${selectedFormation === formation.id ? 'selected' : ''}`}
                onClick={() => selectFormation(formation.id)}
              >
                <h5>{formation.name}</h5>
                <p>{formation.description}</p>
                {selectedFormation === formation.id && (
                  <div className="fstt-formation-selected">
                    <span>✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {errorMessage && (
          <div className="fstt-login-error">
            {errorMessage}
          </div>
        )}
        
        <div className="fstt-form-actions">
          <button
            type="button"
            className="fstt-btn fstt-btn-secondary"
            onClick={() => setStep(1)}
          >
            {t('common.back')}
          </button>
          
          <button
            type="submit"
            className="fstt-login-button"
            disabled={!selectedFormation || loading}
          >
            {loading ? t('common.loading') : t('common.next')}
          </button>
        </div>
      </form>
    );
  };

  // Render the document submission form (Step 3)
  const renderDocumentsForm = () => {
    return (
      <form onSubmit={submitDocuments} className="fstt-registration-form">
        <h3>{t('registration.submitDocuments')}</h3>
        <p className="fstt-form-description">{t('registration.submitDocumentsDescription')}</p>
        
        <div className="fstt-form-section">
          <h4>{t('registration.requiredDocuments')}</h4>
          <div className="fstt-documents-list">
            {requiredDocuments.map(doc => (
              <div 
                key={doc.id} 
                className={`fstt-document-item ${formData.documents[doc.id] ? 'uploaded' : ''}`}
              >
                <div className="fstt-document-icon">
                  {formData.documents[doc.id] ? '📄✓' : '📄'}
                </div>
                <div className="fstt-document-label">
                  {doc.name} {doc.required ? '*' : ''}
                </div>
                <input
                  type="file"
                  id={`doc-${doc.id}`}
                  name={doc.id}
                  className="fstt-document-input"
                  onChange={handleDocumentChange}
                />
                <label 
                  htmlFor={`doc-${doc.id}`} 
                  className="fstt-document-button"
                >
                  {formData.documents[doc.id]
                    ? t('registration.documentUploaded')
                    : t('registration.uploadDocument')}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {errorMessage && (
          <div className="fstt-login-error">
            {errorMessage}
          </div>
        )}
        
        <div className="fstt-form-actions">
          <button
            type="button"
            className="fstt-btn fstt-btn-secondary"
            onClick={() => setStep(2)}
          >
            {t('common.back')}
          </button>
          
          <button
            type="submit"
            className="fstt-login-button"
            disabled={!documentsComplete || loading}
          >
            {loading ? t('common.loading') : t('common.submit')}
          </button>
        </div>
        
        <div className="fstt-form-footer">
          <p>* {t('registration.requiredDocuments')}</p>
        </div>
      </form>
    );
  };

  // Render the confirmation screen (Step 4)
  const renderConfirmation = () => {
    return (
      <div className="fstt-registration-success">
        <div className="fstt-success-icon">✅</div>
        <h3 className="fstt-success-title">{t('registration.registrationSuccess')}</h3>
        <p className="fstt-success-message">
          {t('registration.registrationSuccessMessage')}
        </p>
        <p className="fstt-success-message">
          {t('registration.registrationFollowUp')}
        </p>
        <div className="fstt-form-actions">
          <button
            type="button"
            className="fstt-login-button"
            onClick={onBackToLogin}
          >
            {t('auth.loginButton')}
          </button>
        </div>
      </div>
    );
  };

  // Main render method
  return (
    <div className="fstt-registration-container ns">
      <div className="fstt-login-language">
        <button 
          onClick={() => {
            const newLang = i18n.language === 'fr' ? 'ar' : 'fr';
            i18n.changeLanguage(newLang);
            document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
          }} 
          className="fstt-login-lang-toggle"
        >
          {i18n.language === 'fr' ? 'العربية' : 'Français'}
        </button>
      </div>
      
      <div className="fstt-registration-card">
        <div className="fstt-registration-header">
          <img src="/assets/fstt-logo.png" alt="FSTT Logo" className="fstt-login-logo" onError={(e) => e.target.src = '/favicon.ico'} />
          <h1>{t('registration.title')}</h1>
          
          {renderSteps()}
        </div>
        
        {step === 1 && renderEligibilityForm()}
        {step === 2 && renderFormationSelection()}
        {step === 3 && renderDocumentsForm()}
        {step === 4 && renderConfirmation()}
        
        <div className="fstt-login-footer">
          <p>Faculté des Sciences et Techniques de Tanger &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
};

export default Registration;
