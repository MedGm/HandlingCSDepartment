import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import db from '../utils/db';
import './Courses.css';

/**
 * Courses page component
 * Displays and manages courses information
 */
const Courses = () => {
  const { t } = useTranslation();
  const { currentUser, hasRole, ROLES } = useAuth();
  const navigate = useNavigate();
  
  // State variables
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [chapters, setChapters] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [students, setStudents] = useState([]);
  const [feedback, setFeedback] = useState({ show: false, message: '', type: '' });
  
  // Modal states
  const [showModal, setShowModal] = useState({
    addChapter: false,
    editChapter: false,
    deleteChapter: false,
    addSession: false,
    editSession: false,
    deleteSession: false,
    addHomework: false,
    editHomework: false,
    deleteHomework: false,
  });
  
  // Form data for modals
  const [formData, setFormData] = useState({
    chapter: { titre: '', contenu: '', ordre: 1 },
    session: { titre: '', date: '', heure_debut: '', heure_fin: '', type: 'cours', salle: '' },
    homework: { titre: '', description: '', deadline: '', fichiers: [] }
  });
  
  // Selected item for edit/delete operations
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Fetch courses based on user role
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        let coursesData = [];
        
        // Teachers see only their assigned courses
        if (hasRole(ROLES.ENSEIGNANT)) {
          // Get courses assigned to this teacher
          const enseignantCourses = await db.enseignantsCours
            .where('enseignant_id')
            .equals(currentUser.id)
            .toArray();
          
          if (enseignantCourses.length > 0) {
            const coursesCodes = enseignantCourses.map(ec => ec.cours_code);
            coursesData = await db.cours
              .where('code')
              .anyOf(coursesCodes)
              .toArray();
          }
        } 
        // Students see courses they're enrolled in through their programs
        else if (hasRole(ROLES.ETUDIANT)) {
          // Get student's program
          const inscriptions = await db.inscriptions
            .where('etudiant_id')
            .equals(currentUser.id)
            .toArray();
          
          if (inscriptions.length > 0) {
            // For simplicity, just get all courses for now
            // In a real app, you would filter by the program and semester
            coursesData = await db.cours.toArray();
          }
        }
        // Admins see all courses
        else {
          coursesData = await db.cours.toArray();
        }
        
        setCourses(coursesData);
      } catch (error) {
        console.error('Error fetching courses:', error);
        setFeedback({
          show: true,
          message: t('common.error') + ': ' + error.message,
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourses();
  }, [currentUser, hasRole, ROLES, t]);
  
  // Fetch course details when a course is selected
  useEffect(() => {
    const fetchCourseDetails = async () => {
      if (!selectedCourse) return;
      
      try {
        setLoading(true);
        
        // Get the full course data
        const course = await db.cours.get(selectedCourse);
        if (!course) {
          setFeedback({
            show: true,
            message: t('courses.courseNotFound'),
            type: 'error'
          });
          setSelectedCourse(null);
          setLoading(false);
          return;
        }
        
        setCourseDetails(course);
        
        // Get chapters for this course
        const chaptersData = await db.chapitres
          .where('cours_code')
          .equals(selectedCourse)
          .toArray();
        
        setChapters(chaptersData.sort((a, b) => a.ordre - b.ordre));
        
        // Get sessions for this course
        const sessionsData = await db.seances
          .where('cours_code')
          .equals(selectedCourse)
          .toArray();
        
        setSessions(sessionsData.sort((a, b) => new Date(a.date) - new Date(b.date)));
        
        // Get enrolled students
        const studentIds = [];
        const inscriptions = await db.inscriptions.toArray();
        
        // Find students enrolled in this course's formation
        for (const ins of inscriptions) {
          if (ins.formation_code === course.formation_code) {
            studentIds.push(ins.etudiant_id);
          }
        }
        
        // Get student details
        const studentsData = [];
        for (const id of studentIds) {
          const student = await db.etudiants.get(id);
          if (student) {
            const person = await db.personnes.get(id);
            if (person) {
              studentsData.push({
                id: student.id,
                appogee: student.appogee,
                nom: person.nom || '',
                prenom: person.prenom || '',
                email: person.email || ''
              });
            }
          }
        }
        
        setStudents(studentsData);
        
        // Get homeworks for this course - FIX HERE
        try {
          // Create 'devoirs' table if it doesn't exist
          await db.createTableIfNotExists('devoirs', '++id, cours_code, titre, date_creation, deadline, enseignant_id');
          
          // Now we can safely query the table
          const homeworksData = await db.devoirs
            .where('cours_code')
            .equals(selectedCourse)
            .toArray();
          
          setHomeworks(homeworksData || []);
        } catch (error) {
          console.error('Error handling devoirs table:', error);
          setHomeworks([]);
        }
        
      } catch (error) {
        console.error('Error fetching course details:', error);
        setFeedback({
          show: true,
          message: t('courses.errorLoadingCourse'),
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourseDetails();
  }, [selectedCourse, t]);
  
  // Filter and search courses
  const filteredCourses = courses.filter(course => {
    // Apply search term
    const matchesSearch = course.titre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         course.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply filters
    if (filter === 'all') {
      return matchesSearch;
    } else {
      return matchesSearch && course.semestre === filter;
    }
  });
  
  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  // === CHAPTER MANAGEMENT FUNCTIONS ===
  
  // Handle adding a new chapter
  const handleAddChapter = async (e) => {
    e.preventDefault();
    try {
      const { titre, contenu, ordre } = formData.chapter;
      
      if (!titre.trim()) {
        setFeedback({
          show: true,
          message: t('courses.titleRequired'),
          type: 'error'
        });
        return;
      }
      
      const chapterData = {
        id: Date.now().toString(),
        titre,
        contenu: contenu || '',
        cours_code: selectedCourse,
        ordre: parseInt(ordre),
        date_creation: new Date()
      };
      
      await db.chapitres.add(chapterData);
      
      // Update chapters list
      setChapters([...chapters, chapterData].sort((a, b) => a.ordre - b.ordre));
      
      // Reset form and close modal
      setFormData({
        ...formData,
        chapter: { titre: '', contenu: '', ordre: chapters.length + 1 }
      });
      
      setShowModal({ ...showModal, addChapter: false });
      
      setFeedback({
        show: true,
        message: t('courses.chapterAddedSuccess'),
        type: 'success'
      });
    } catch (error) {
      console.error('Error adding chapter:', error);
      setFeedback({
        show: true,
        message: t('courses.chapterAddedError'),
        type: 'error'
      });
    }
  };
  
  // Handle editing a chapter
  const handleEditChapter = async (e) => {
    e.preventDefault();
    try {
      const { id, titre, contenu, ordre } = formData.chapter;
      
      if (!titre.trim()) {
        setFeedback({
          show: true,
          message: t('courses.titleRequired'),
          type: 'error'
        });
        return;
      }
      
      const chapterToUpdate = chapters.find(ch => ch.id === id);
      
      if (chapterToUpdate) {
        const updatedChapter = {
          ...chapterToUpdate,
          titre,
          contenu,
          ordre: parseInt(ordre),
          date_modification: new Date()
        };
        
        await db.chapitres.update(id, updatedChapter);
        
        // Update chapters list
        setChapters(chapters.map(ch => 
          ch.id === id ? updatedChapter : ch
        ).sort((a, b) => a.ordre - b.ordre));
        
        setShowModal({ ...showModal, editChapter: false });
        
        setFeedback({
          show: true,
          message: t('courses.chapterUpdatedSuccess'),
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error editing chapter:', error);
      setFeedback({
        show: true,
        message: t('courses.chapterUpdatedError'),
        type: 'error'
      });
    }
  };
  
  // Handle deleting a chapter
  const handleDeleteChapter = async () => {
    try {
      if (selectedItem && selectedItem.id) {
        await db.chapitres.delete(selectedItem.id);
        
        // Update chapters list
        setChapters(chapters.filter(ch => ch.id !== selectedItem.id));
        
        setShowModal({ ...showModal, deleteChapter: false });
        setSelectedItem(null);
        
        setFeedback({
          show: true,
          message: t('courses.chapterDeletedSuccess'),
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error deleting chapter:', error);
      setFeedback({
        show: true,
        message: t('courses.chapterDeletedError'),
        type: 'error'
      });
    }
  };

  // === SESSION MANAGEMENT FUNCTIONS ===
  
  // Handle adding a new session
  const handleAddSession = async (e) => {
    e.preventDefault();
    try {
      const { titre, date, heure_debut, heure_fin, type, salle } = formData.session;
      
      if (!titre.trim() || !date || !heure_debut || !heure_fin) {
        setFeedback({
          show: true,
          message: t('courses.allFieldsRequired'),
          type: 'error'
        });
        return;
      }
      
      const sessionData = {
        id: Date.now().toString(),
        cours_code: selectedCourse,
        titre,
        date: new Date(date),
        heure_debut,
        heure_fin,
        type,
        salle,
        statut: hasRole(ROLES.COORDINATEUR) ? 'confirmed' : 'pending'
      };
      
      // Implement Flow 3 from sequence diagram - planification des séances
      // Teacher requests a session, Coordinator needs to confirm
      if (hasRole(ROLES.ENSEIGNANT) && !hasRole(ROLES.COORDINATEUR)) {
        console.log('Enseignant requests session planning, notifying coordinator');
        // In a real app, send notification to coordinator
      }
      
      await db.seances.add(sessionData);
      
      // Update sessions list
      setSessions([...sessions, sessionData].sort((a, b) => new Date(a.date) - new Date(b.date)));
      
      // Reset form and close modal
      setFormData({
        ...formData,
        session: { titre: '', date: '', heure_debut: '', heure_fin: '', type: 'cours', salle: '' }
      });
      
      setShowModal({ ...showModal, addSession: false });
      
      setFeedback({
        show: true,
        message: hasRole(ROLES.COORDINATEUR) 
          ? t('courses.sessionAddedSuccess') 
          : t('courses.sessionRequestSent'),
        type: 'success'
      });
    } catch (error) {
      console.error('Error adding session:', error);
      setFeedback({
        show: true,
        message: t('courses.sessionAddedError'),
        type: 'error'
      });
    }
  };
  
  // Handle editing a session
  const handleEditSession = async (e) => {
    e.preventDefault();
    try {
      const { id, titre, date, heure_debut, heure_fin, type, salle } = formData.session;
      
      if (!titre.trim() || !date || !heure_debut || !heure_fin) {
        setFeedback({
          show: true,
          message: t('courses.allFieldsRequired'),
          type: 'error'
        });
        return;
      }
      
      const sessionToUpdate = sessions.find(s => s.id === id);
      
      if (sessionToUpdate) {
        const updatedSession = {
          ...sessionToUpdate,
          titre,
          date: new Date(date),
          heure_debut,
          heure_fin,
          type,
          salle,
          date_modification: new Date()
        };
        
        await db.seances.update(id, updatedSession);
        
        // Update sessions list
        setSessions(sessions.map(s => 
          s.id === id ? updatedSession : s
        ).sort((a, b) => new Date(a.date) - new Date(b.date)));
        
        setShowModal({ ...showModal, editSession: false });
        
        setFeedback({
          show: true,
          message: t('courses.sessionUpdatedSuccess'),
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error editing session:', error);
      setFeedback({
        show: true,
        message: t('courses.sessionUpdatedError'),
        type: 'error'
      });
    }
  };
  
  // Handle deleting a session
  const handleDeleteSession = async () => {
    try {
      if (selectedItem && selectedItem.id) {
        await db.seances.delete(selectedItem.id);
        
        // Update sessions list
        setSessions(sessions.filter(s => s.id !== selectedItem.id));
        
        setShowModal({ ...showModal, deleteSession: false });
        setSelectedItem(null);
        
        setFeedback({
          show: true,
          message: t('courses.sessionDeletedSuccess'),
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setFeedback({
        show: true,
        message: t('courses.sessionDeletedError'),
        type: 'error'
      });
    }
  };

  // === HOMEWORK MANAGEMENT FUNCTIONS ===
  
  // Handle adding a new homework
  const handleAddHomework = async (e) => {
    e.preventDefault();
    try {
      const { titre, description, deadline } = formData.homework;
      
      if (!titre.trim() || !deadline) {
        setFeedback({
          show: true,
          message: t('courses.titleAndDeadlineRequired'),
          type: 'error'
        });
        return;
      }
      
      // Create 'devoirs' table if it doesn't exist
      await db.createTableIfNotExists('devoirs', '++id, cours_code, titre, date_creation, deadline, enseignant_id');
      
      // Implement Flow 4 from sequence diagram - envoi de devoir
      const homeworkData = {
        id: Date.now().toString(),
        cours_code: selectedCourse,
        titre,
        description,
        date_creation: new Date(),
        deadline: new Date(deadline),
        enseignant_id: currentUser.id,
        fichiers: []
      };
      
      // Now we can safely add to the table
      await db.devoirs.add(homeworkData);
      
      // Update homeworks list
      setHomeworks([...homeworks, homeworkData]);
      
      // Reset form and close modal
      setFormData({
        ...formData,
        homework: { titre: '', description: '', deadline: '', fichiers: [] }
      });
      
      setShowModal({ ...showModal, addHomework: false });
      
      // Notify students (in a real app)
      console.log('Notifying students about new homework: ', students);
      
      setFeedback({
        show: true,
        message: t('courses.homeworkAddedSuccess'),
        type: 'success'
      });
    } catch (error) {
      console.error('Error adding homework:', error);
      setFeedback({
        show: true,
        message: t('courses.homeworkAddedError'),
        type: 'error'
      });
    }
  };

  // Handle editing a homework
  const handleEditHomework = async (e) => {
    e.preventDefault();
    try {
      const { id, titre, description, deadline } = formData.homework;
      
      if (!titre.trim() || !deadline) {
        setFeedback({
          show: true,
          message: t('courses.titleAndDeadlineRequired'),
          type: 'error'
        });
        return;
      }
      
      // Ensure table exists
      await db.createTableIfNotExists('devoirs', '++id, cours_code, titre, date_creation, deadline, enseignant_id');
      
      const homeworkToUpdate = homeworks.find(h => h.id === id);
      
      if (homeworkToUpdate) {
        const updatedHomework = {
          ...homeworkToUpdate,
          titre,
          description,
          deadline: new Date(deadline),
          date_modification: new Date()
        };
        
        await db.devoirs.put(updatedHomework);
        
        // Update homeworks list
        setHomeworks(homeworks.map(h => 
          h.id === id ? updatedHomework : h
        ));
        
        setShowModal({ ...showModal, editHomework: false });
        
        setFeedback({
          show: true,
          message: t('courses.homeworkUpdatedSuccess'),
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error editing homework:', error);
      setFeedback({
        show: true,
        message: t('courses.homeworkUpdatedError'),
        type: 'error'
      });
    }
  };

  // Handle deleting a homework
  const handleDeleteHomework = async () => {
    try {
      if (selectedItem && selectedItem.id) {
        // Ensure table exists before attempting to delete
        await db.createTableIfNotExists('devoirs', '++id, cours_code, titre, date_creation, deadline, enseignant_id');
        
        await db.devoirs.delete(selectedItem.id);
        
        // Update homeworks list
        setHomeworks(homeworks.filter(h => h.id !== selectedItem.id));
        
        setShowModal({ ...showModal, deleteHomework: false });
        setSelectedItem(null);
        
        setFeedback({
          show: true,
          message: t('courses.homeworkDeletedSuccess'),
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error deleting homework:', error);
      setFeedback({
        show: true,
        message: t('courses.homeworkDeletedError'),
        type: 'error'
      });
    }
  };

  // === UI HELPER FUNCTIONS ===
  
  // Handle form input changes
  const handleInputChange = (formType, e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [formType]: {
        ...prev[formType],
        [name]: value
      }
    }));
  };
  
  // Open modal for editing
  const openEditModal = (type, item) => {
    setSelectedItem(item);
    
    if (type === 'chapter') {
      setFormData({
        ...formData,
        chapter: {
          id: item.id,
          titre: item.titre || '',
          contenu: item.contenu || '',
          ordre: item.ordre || 1
        }
      });
      setShowModal({ ...showModal, editChapter: true });
    } 
    else if (type === 'session') {
      setFormData({
        ...formData,
        session: {
          id: item.id,
          titre: item.titre || '',
          date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
          heure_debut: item.heure_debut || '',
          heure_fin: item.heure_fin || '',
          type: item.type || 'cours',
          salle: item.salle || ''
        }
      });
      setShowModal({ ...showModal, editSession: true });
    }
    else if (type === 'homework') {
      setFormData({
        ...formData,
        homework: {
          id: item.id,
          titre: item.titre || '',
          description: item.description || '',
          deadline: item.deadline ? new Date(item.deadline).toISOString().split('T')[0] : '',
          fichiers: item.fichiers || []
        }
      });
      setShowModal({ ...showModal, editHomework: true });
    }
  };
  
  // Open modal for deletion confirmation
  const openDeleteModal = (type, item) => {
    setSelectedItem(item);
    
    if (type === 'chapter') {
      setShowModal({ ...showModal, deleteChapter: true });
    } 
    else if (type === 'session') {
      setShowModal({ ...showModal, deleteSession: true });
    }
    else if (type === 'homework') {
      setShowModal({ ...showModal, deleteHomework: true });
    }
  };
  
  // Open modal for adding
  const openAddModal = (type) => {
    if (type === 'chapter') {
      setFormData({
        ...formData,
        chapter: { titre: '', contenu: '', ordre: chapters.length + 1 }
      });
      setShowModal({ ...showModal, addChapter: true });
    } 
    else if (type === 'session') {
      setFormData({
        ...formData,
        session: { titre: '', date: '', heure_debut: '', heure_fin: '', type: 'cours', salle: '' }
      });
      setShowModal({ ...showModal, addSession: true });
    }
    else if (type === 'homework') {
      setFormData({
        ...formData,
        homework: { titre: '', description: '', deadline: '', fichiers: [] }
      });
      setShowModal({ ...showModal, addHomework: true });
    }
  };
  
  // Navigate to evaluations page for this course
  const goToEvaluations = () => {
    navigate(`/evaluations?course=${selectedCourse}`);
  };
  
  // Go to student evaluations
  const goToStudentEvaluations = (studentId) => {
    navigate(`/evaluations?course=${selectedCourse}&student=${studentId}`);
  };
  
  // Clear feedback after delay
  useEffect(() => {
    if (feedback.show) {
      const timer = setTimeout(() => {
        setFeedback({ show: false, message: '', type: '' });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [feedback]);
  
  // Simple loading state
  if (loading && !courses.length) {
    return <div className="fstt-loading">{t('common.loading')}</div>;
  }
  
  return (
    <div className="fstt-courses">
      <h1>{t('courses.title')}</h1>
      
      {feedback.show && (
        <div className={`fstt-feedback fstt-feedback-${feedback.type}`}>
          {feedback.message}
        </div>
      )}
      
      {/* Course List View or Course Detail View */}
      {!selectedCourse ? (
        <>
          {/* Courses List View */}
          <div className="fstt-courses-controls">
            <div className="fstt-search">
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="fstt-filter">
              <label htmlFor="semester-filter">{t('courses.semesterFilter')}</label>
              <select 
                id="semester-filter" 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">{t('common.all')}</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S3">S3</option>
                <option value="S4">S4</option>
                <option value="S5">S5</option>
                <option value="S6">S6</option>
              </select>
            </div>
            
            {/* Only Chef de Département can add courses */}
            {hasRole(ROLES.CHEF_DEPARTEMENT) && (
              <button 
                className="fstt-btn fstt-btn-primary"
                onClick={() => console.log('Add course clicked')}
              >
                {t('common.add')}
              </button>
            )}
          </div>
          
          <div className="fstt-courses-list">
            {filteredCourses.length > 0 ? (
              <div className="fstt-courses-grid">
                {filteredCourses.map(course => (
                  <div key={course.code} className="fstt-course-card">
                    <div className="fstt-course-header">
                      <span className="fstt-course-code">{course.code}</span>
                      <span className="fstt-course-semester">{course.semestre}</span>
                    </div>
                    <h3 className="fstt-course-title">{course.titre}</h3>
                    <div className="fstt-course-footer">
                      <span className="fstt-course-year">{course.annee}</span>
                      <button 
                        className="fstt-btn fstt-btn-sm"
                        onClick={() => setSelectedCourse(course.code)}
                      >
                        {t('common.details')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="fstt-empty">{t('common.noData')}</p>
            )}
          </div>
        </>
      ) : (
        /* Course Detail View */
        <div className="fstt-course-detail">
          <div className="fstt-course-detail-header">
            <button 
              className="fstt-btn fstt-btn-secondary"
              onClick={() => setSelectedCourse(null)}
            >
              {t('common.back')}
            </button>
            
            <div className="fstt-course-info">
              <h2>{courseDetails?.titre} <span className="fstt-course-code">{courseDetails?.code}</span></h2>
              <div className="fstt-course-meta">
                <span>{t('courses.semester')}: {courseDetails?.semestre}</span>
                <span>{t('courses.year')}: {courseDetails?.annee}</span>
              </div>
            </div>
          </div>
          
          {/* Course Tabs */}
          <div className="fstt-course-tabs">
            <button 
              className={`fstt-tab-btn ${activeTab === 'content' ? 'active' : ''}`}
              onClick={() => setActiveTab('content')}
            >
              {t('courses.content')}
            </button>
            <button 
              className={`fstt-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => setActiveTab('sessions')}
            >
              {t('courses.sessions')}
            </button>
            <button 
              className={`fstt-tab-btn ${activeTab === 'homeworks' ? 'active' : ''}`}
              onClick={() => setActiveTab('homeworks')}
            >
              {t('courses.homeworks')}
            </button>
            <button 
              className={`fstt-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              {t('students.title')}
            </button>
            <button 
              className={`fstt-tab-btn ${activeTab === 'evaluations' ? 'active' : ''}`}
              onClick={() => setActiveTab('evaluations')}
            >
              {t('evaluations.title')}
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="fstt-tab-content">
            {/* Content/Chapters Tab */}
            {activeTab === 'content' && (
              <div className="fstt-course-content">
                <div className="fstt-section-header">
                  <h3>{t('courses.chapters')}</h3>
                  {hasRole([ROLES.ENSEIGNANT, ROLES.CHEF_DEPARTEMENT]) && (
                    <button 
                      className="fstt-btn fstt-btn-primary"
                      onClick={() => openAddModal('chapter')}
                    >
                      {t('courses.addChapter')}
                    </button>
                  )}
                </div>
                
                {chapters.length > 0 ? (
                  <div className="fstt-chapters-list">
                    {chapters.map(chapter => (
                      <div key={chapter.id} className="fstt-chapter-item">
                        <div className="fstt-chapter-header">
                          <h4>
                            <span className="fstt-chapter-order">{chapter.ordre}.</span> 
                            {chapter.titre}
                          </h4>
                          
                          {hasRole([ROLES.ENSEIGNANT, ROLES.CHEF_DEPARTEMENT]) && (
                            <div className="fstt-chapter-actions">
                              <button 
                                className="fstt-btn fstt-btn-sm"
                                onClick={() => openEditModal('chapter', chapter)}
                              >
                                {t('common.edit')}
                              </button>
                              <button 
                                className="fstt-btn fstt-btn-danger fstt-btn-sm"
                                onClick={() => openDeleteModal('chapter', chapter)}
                              >
                                {t('common.delete')}
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {chapter.contenu && (
                          <div className="fstt-chapter-content">
                            {chapter.contenu}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="fstt-empty">{t('courses.noChapters')}</p>
                )}
              </div>
            )}
            
            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="fstt-course-sessions">
                <div className="fstt-section-header">
                  <h3>{t('courses.sessions')}</h3>
                  {hasRole([ROLES.ENSEIGNANT, ROLES.COORDINATEUR]) && (
                    <button 
                      className="fstt-btn fstt-btn-primary"
                      onClick={() => openAddModal('session')}
                    >
                      {t('courses.addSession')}
                    </button>
                  )}
                </div>
                
                {sessions.length > 0 ? (
                  <table className="fstt-table">
                    <thead>
                      <tr>
                        <th>{t('courses.date')}</th>
                        <th>{t('courses.time')}</th>
                        <th>{t('courses.title')}</th>
                        <th>{t('courses.type')}</th>
                        <th>{t('courses.room')}</th>
                        <th>{t('courses.status')}</th>
                        <th>{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(session => (
                        <tr key={session.id}>
                          <td>{formatDate(session.date)}</td>
                          <td>{session.heure_debut} - {session.heure_fin}</td>
                          <td>{session.titre}</td>
                          <td>{session.type}</td>
                          <td>{session.salle || '-'}</td>
                          <td>{session.statut || 'pending'}</td>
                          <td>
                            {hasRole([ROLES.ENSEIGNANT, ROLES.COORDINATEUR]) && (
                              <>
                                <button 
                                  className="fstt-btn fstt-btn-sm"
                                  onClick={() => openEditModal('session', session)}
                                >
                                  {t('common.edit')}
                                </button>
                                <button 
                                  className="fstt-btn fstt-btn-danger fstt-btn-sm"
                                  onClick={() => openDeleteModal('session', session)}
                                >
                                  {t('common.delete')}
                                </button>
                                {hasRole(ROLES.COORDINATEUR) && session.statut === 'pending' && (
                                  <button 
                                    className="fstt-btn fstt-btn-success fstt-btn-sm"
                                    onClick={() => {
                                      // Confirm session
                                      const updatedSession = { ...session, statut: 'confirmed' };
                                      db.seances.update(session.id, updatedSession).then(() => {
                                        setSessions(sessions.map(s => 
                                          s.id === session.id ? updatedSession : s
                                        ));
                                        setFeedback({
                                          show: true,
                                          message: t('courses.sessionConfirmed'),
                                          type: 'success'
                                        });
                                      });
                                    }}
                                  >
                                    {t('common.approve')}
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
                  <p className="fstt-empty">{t('courses.noSessions')}</p>
                )}
              </div>
            )}
            
            {/* Homeworks Tab */}
            {activeTab === 'homeworks' && (
              <div className="fstt-course-homeworks">
                <div className="fstt-section-header">
                  <h3>{t('courses.homeworks')}</h3>
                  {hasRole(ROLES.ENSEIGNANT) && (
                    <button 
                      className="fstt-btn fstt-btn-primary"
                      onClick={() => openAddModal('homework')}
                    >
                      {t('courses.addHomework')}
                    </button>
                  )}
                </div>
                
                {homeworks.length > 0 ? (
                  <div className="fstt-homeworks-list">
                    {homeworks.map(homework => (
                      <div key={homework.id} className="fstt-homework-card">
                        <div className="fstt-homework-header">
                          <h4>{homework.titre}</h4>
                          <div className="fstt-homework-meta">
                            <span>{t('courses.deadline')}: {formatDate(homework.deadline)}</span>
                          </div>
                        </div>
                        <div className="fstt-homework-content">
                          <p>{homework.description}</p>
                        </div>
                        <div className="fstt-homework-footer">
                          {hasRole(ROLES.ENSEIGNANT) && (
                            <div className="fstt-homework-actions">
                              <button 
                                className="fstt-btn fstt-btn-sm"
                                onClick={() => openEditModal('homework', homework)}
                              >
                                {t('common.edit')}
                              </button>
                              <button 
                                className="fstt-btn fstt-btn-danger fstt-btn-sm"
                                onClick={() => openDeleteModal('homework', homework)}
                              >
                                {t('common.delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="fstt-empty">{t('courses.noHomeworks')}</p>
                )}
              </div>
            )}
            
            {/* Students Tab */}
            {activeTab === 'students' && (
              <div className="fstt-course-students">
                <div className="fstt-section-header">
                  <h3>{t('courses.enrolledStudents')}</h3>
                </div>
                
                {students.length > 0 ? (
                  <table className="fstt-table">
                    <thead>
                      <tr>
                        <th>{t('students.appogee')}</th>
                        <th>{t('students.name')}</th>
                        <th>{t('students.firstname')}</th>
                        <th>{t('students.email')}</th>
                        {hasRole([ROLES.ENSEIGNANT, ROLES.COORDINATEUR]) && (
                          <th>{t('common.actions')}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student.id}>
                          <td>{student.appogee}</td>
                          <td>{student.nom}</td>
                          <td>{student.prenom}</td>
                          <td>{student.email}</td>
                          {hasRole([ROLES.ENSEIGNANT, ROLES.COORDINATEUR]) && (
                            <td>
                              <button 
                                className="fstt-btn fstt-btn-primary fstt-btn-sm"
                                onClick={() => goToStudentEvaluations(student.id)}
                              >
                                {t('evaluations.grade')}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="fstt-empty">{t('courses.noStudents')}</p>
                )}
              </div>
            )}
            
            {/* Evaluations Tab */}
            {activeTab === 'evaluations' && (
              <div className="fstt-course-evaluations">
                <div className="fstt-section-header">
                  <h3>{t('evaluations.title')}</h3>
                  <button 
                    className="fstt-btn fstt-btn-primary"
                    onClick={goToEvaluations}
                  >
                    {t('evaluations.manageEvaluations')}
                  </button>
                </div>
                
                <p>{t('evaluations.courseEvaluationsDescription')}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Modals */}
      
      {/* Add Chapter Modal */}
      {showModal.addChapter && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <div className="fstt-modal-header">
              <h3>{t('courses.addChapter')}</h3>
              <button 
                className="fstt-modal-close"
                onClick={() => setShowModal({...showModal, addChapter: false})}
              >
                ×
              </button>
            </div>
            <div className="fstt-modal-body">
              <form onSubmit={handleAddChapter}>
                <div className="fstt-form-group">
                  <label htmlFor="chapter-title">{t('courses.chapterTitle')} *</label>
                  <input
                    type="text"
                    id="chapter-title"
                    name="titre"
                    value={formData.chapter.titre}
                    onChange={(e) => handleInputChange('chapter', e)}
                    required
                  />
                </div>
                
                <div className="fstt-form-group">
                  <label htmlFor="chapter-contenu">{t('courses.chapterContent')}</label>
                  <textarea
                    id="chapter-contenu"
                    name="contenu"
                    value={formData.chapter.contenu}
                    onChange={(e) => handleInputChange('chapter', e)}
                    rows="5"
                  />
                </div>
                
                <div className="fstt-form-group">
                  <label htmlFor="chapter-ordre">{t('courses.chapterOrder')} *</label>
                  <input
                    type="number"
                    id="chapter-ordre"
                    name="ordre"
                    value={formData.chapter.ordre}
                    onChange={(e) => handleInputChange('chapter', e)}
                    min="1"
                    required
                  />
                </div>
                
                <div className="fstt-form-actions">
                  <button 
                    type="button" 
                    className="fstt-btn" 
                    onClick={() => setShowModal({...showModal, addChapter: false})}
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="fstt-btn fstt-btn-primary">
                    {t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Other modals (edit/delete chapter, add/edit/delete session, add/edit/delete homework) */}
      {/* Edit Chapter Modal */}
      {showModal.editChapter && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <div className="fstt-modal-header">
              <h3>{t('courses.editChapter')}</h3>
              <button 
                className="fstt-modal-close"
                onClick={() => setShowModal({...showModal, editChapter: false})}
              >
                ×
              </button>
            </div>
            <div className="fstt-modal-body">
              <form onSubmit={handleEditChapter}>
                <div className="fstt-form-group">
                  <label htmlFor="edit-chapter-title">{t('courses.chapterTitle')} *</label>
                  <input
                    type="text"
                    id="edit-chapter-title"
                    name="titre"
                    value={formData.chapter.titre}
                    onChange={(e) => handleInputChange('chapter', e)}
                    required
                  />
                </div>
                
                <div className="fstt-form-group">
                  <label htmlFor="edit-chapter-contenu">{t('courses.chapterContent')}</label>
                  <textarea
                    id="edit-chapter-contenu"
                    name="contenu"
                    value={formData.chapter.contenu}
                    onChange={(e) => handleInputChange('chapter', e)}
                    rows="5"
                  />
                </div>
                
                <div className="fstt-form-group">
                  <label htmlFor="edit-chapter-ordre">{t('courses.chapterOrder')} *</label>
                  <input
                    type="number"
                    id="edit-chapter-ordre"
                    name="ordre"
                    min="1"
                    value={formData.chapter.ordre}
                    onChange={(e) => handleInputChange('chapter', e)}
                    required
                  />
                </div>
                
                <div className="fstt-form-actions">
                  <button 
                    type="button" 
                    className="fstt-btn" 
                    onClick={() => setShowModal({...showModal, editChapter: false})}
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="fstt-btn fstt-btn-primary">
                    {t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Chapter Modal */}
      {showModal.deleteChapter && selectedItem && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <div className="fstt-modal-header">
              <h3>{t('courses.deleteChapter')}</h3>
              <button 
                className="fstt-modal-close"
                onClick={() => setShowModal({...showModal, deleteChapter: false})}
              >
                ×
              </button>
            </div>
            <div className="fstt-modal-body">
              <p>{t('courses.deleteChapterConfirm')}: <strong>{selectedItem.titre}</strong>?</p>
              
              <div className="fstt-form-actions">
                <button 
                  type="button" 
                  className="fstt-btn" 
                  onClick={() => setShowModal({...showModal, deleteChapter: false})}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="button" 
                  className="fstt-btn fstt-btn-danger"
                  onClick={handleDeleteChapter}
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Session Modal */}
      {showModal.addSession && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <div className="fstt-modal-header">
              <h3>{t('courses.addSession')}</h3>
              <button 
                className="fstt-modal-close"
                onClick={() => setShowModal({...showModal, addSession: false})}
              >
                ×
              </button>
            </div>
            <div className="fstt-modal-body">
              <form onSubmit={handleAddSession}>
                <div className="fstt-form-group">
                  <label htmlFor="session-title">{t('courses.sessionTitle')} *</label>
                  <input
                    type="text"
                    id="session-title"
                    name="titre"
                    value={formData.session.titre}
                    onChange={(e) => handleInputChange('session', e)}
                    required
                  />
                </div>
                
                <div className="fstt-form-group">
                  <label htmlFor="session-date">{t('courses.date')} *</label>
                  <input
                    type="date"
                    id="session-date"
                    name="date"
                    value={formData.session.date}
                    onChange={(e) => handleInputChange('session', e)}
                    required
                  />
                </div>
                
                <div className="fstt-form-row">
                  <div className="fstt-form-group">
                    <label htmlFor="session-start">{t('courses.startTime')} *</label>
                    <input
                      type="time"
                      id="session-start"
                      name="heure_debut"
                      value={formData.session.heure_debut}
                      onChange={(e) => handleInputChange('session', e)}
                      required
                    />
                  </div>
                  
                  <div className="fstt-form-group">
                    <label htmlFor="session-end">{t('courses.endTime')} *</label>
                    <input
                      type="time"
                      id="session-end"
                      name="heure_fin"
                      value={formData.session.heure_fin}
                      onChange={(e) => handleInputChange('session', e)}
                      required
                    />
                  </div>
                </div>
                
                <div className="fstt-form-row">
                  <div className="fstt-form-group">
                    <label htmlFor="session-type">{t('courses.type')} *</label>
                    <select
                      id="session-type"
                      name="type"
                      value={formData.session.type}
                      onChange={(e) => handleInputChange('session', e)}
                      required
                    >
                      <option value="cours">{t('courses.sessionTypes.cours')}</option>
                      <option value="tp">{t('courses.sessionTypes.tp')}</option>
                      <option value="td">{t('courses.sessionTypes.td')}</option>
                      <option value="exam">{t('courses.sessionTypes.exam')}</option>
                    </select>
                  </div>
                  
                  <div className="fstt-form-group">
                    <label htmlFor="session-salle">{t('courses.room')}</label>
                    <input
                      type="text"
                      id="session-salle"
                      name="salle"
                      value={formData.session.salle}
                      onChange={(e) => handleInputChange('session', e)}
                    />
                  </div>
                </div>
                
                <div className="fstt-form-actions">
                  <button 
                    type="button" 
                    className="fstt-btn" 
                    onClick={() => setShowModal({...showModal, addSession: false})}
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="fstt-btn fstt-btn-primary">
                    {t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Homework Modal */}
      {showModal.addHomework && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <div className="fstt-modal-header">
              <h3>{t('courses.addHomework')}</h3>
              <button 
                className="fstt-modal-close"
                onClick={() => setShowModal({...showModal, addHomework: false})}
              >
                ×
              </button>
            </div>
            <div className="fstt-modal-body">
              <form onSubmit={handleAddHomework}>
                <div className="fstt-form-group">
                  <label htmlFor="homework-title">{t('courses.homeworkTitle')} *</label>
                  <input
                    type="text"
                    id="homework-title"
                    name="titre"
                    value={formData.homework.titre}
                    onChange={(e) => handleInputChange('homework', e)}
                    required
                  />
                </div>
                
                <div className="fstt-form-group">
                  <label htmlFor="homework-description">{t('courses.description')}</label>
                  <textarea
                    id="homework-description"
                    name="description"
                    value={formData.homework.description}
                    onChange={(e) => handleInputChange('homework', e)}
                    rows="4"
                  />
                </div>
                
                <div className="fstt-form-group">
                  <label htmlFor="homework-deadline">{t('courses.deadline')} *</label>
                  <input
                    type="date"
                    id="homework-deadline"
                    name="deadline"
                    value={formData.homework.deadline}
                    onChange={(e) => handleInputChange('homework', e)}
                    required
                  />
                </div>
                
                <div className="fstt-form-actions">
                  <button 
                    type="button" 
                    className="fstt-btn" 
                    onClick={() => setShowModal({...showModal, addHomework: false})}
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="fstt-btn fstt-btn-primary">
                    {t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;