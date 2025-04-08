import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import db from '../utils/db';
import './Deliberations.css';

/**
 * Deliberations page component
 * Implements the academic deliberation process after evaluations
 * Based on the UML sequence diagram for Délibération
 */
const Deliberations = () => {
  const { t } = useTranslation();
  const { currentUser, hasRole, ROLES } = useAuth();
  
  // State variables
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsData, setStudentsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ show: false, message: '', type: '' });
  const [filter, setFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState('S1');
  
  // Modals
  const [showModal, setShowModal] = useState({
    confirmValidation: false,
    confirmNV: false,
    suggestRetake: false,
  });
  
  // Selected student for operations
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Load courses based on user role
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        
        let coursesData = [];
        
        if (hasRole(ROLES.CHEF_DEPARTEMENT) || hasRole(ROLES.COORDINATEUR)) {
          coursesData = await db.cours.toArray();
        } else if (hasRole(ROLES.ENSEIGNANT)) {
          try {
            await db.enseignantsCours.toArray();
            
            const teacherCourses = await db.enseignantsCours
              .where('enseignant_id')
              .equals(currentUser.id)
              .toArray();
            
            if (teacherCourses && teacherCourses.length > 0) {
              const courseCodes = teacherCourses.map(tc => tc.cours_code);
              
              if (courseCodes.length > 0) {
                coursesData = await db.cours
                  .where('code')
                  .anyOf(courseCodes)
                  .toArray();
              }
            }
          } catch (error) {
            coursesData = await db.cours.toArray();
          }
        }
        
        setCourses(coursesData);
        setLoading(false);
      } catch (error) {
        setFeedback({
          show: true,
          message: t('common.error') + ': ' + error.message,
          type: 'error'
        });
        setLoading(false);
      }
    };
    
    loadCourses();
  }, [currentUser, hasRole, ROLES, t]);
  
  // Load course details and students when a course is selected
  useEffect(() => {
    const loadCourseDetails = async () => {
      if (!selectedCourse) return;
      
      try {
        setLoading(true);
        
        const course = await db.cours.get(selectedCourse);
        setCourseDetails(course);
        
        if (!course) {
          setFeedback({
            show: true,
            message: t('deliberations.courseNotFound'),
            type: 'error'
          });
          setLoading(false);
          return;
        }
        
        const studentsData = [];
        let enrolledStudentIds = [];
        
        try {
          const allStudents = await db.etudiants.toArray();
          
          if (allStudents.length > 0) {
            enrolledStudentIds = allStudents.map(student => student.id);
          }
          
          const inscriptions = await db.inscriptions.toArray();
          
          if (inscriptions.length > 0 && course.formation_code) {
            const formationInscriptions = inscriptions.filter(ins => 
              ins.formation_code === course.formation_code
            );
            
            if (formationInscriptions.length > 0) {
              enrolledStudentIds = formationInscriptions.map(ins => ins.etudiant_id);
            }
          } else if (course && !course.formation_code) {
            const courseCodeParts = course.code.split('-');
            if (courseCodeParts.length >= 2) {
              const inferredFormationCode = `${courseCodeParts[0]}-${courseCodeParts[1]}`;
              
              const matchingInscriptions = inscriptions.filter(ins => 
                ins.formation_code === inferredFormationCode
              );
              
              if (matchingInscriptions.length > 0) {
                enrolledStudentIds = matchingInscriptions.map(ins => ins.etudiant_id);
              }
            }
          }
        } catch (error) {
          console.warn("Error loading inscriptions:", error);
        }
        
        const uniqueIds = [...new Set(enrolledStudentIds)];
        
        for (const id of uniqueIds) {
          try {
            const student = await db.etudiants.get(id);
            if (student) {
              const person = await db.personnes.get(id);
              if (person) {
                studentsData.push({
                  id: student.id,
                  appogee: student.appogee,
                  nom: person.nom || '',
                  prenom: student.prenom || ''
                });
              }
            }
          } catch (err) {
            console.warn(`Error fetching student ${id}:`, err);
          }
        }
        
        setStudents(studentsData);
        
        const evaluationsData = await db.evaluations
          .where('cours_code')
          .equals(selectedCourse)
          .toArray();
        
        const studentsGradesData = {};
        
        for (const student of studentsData) {
          studentsGradesData[student.id] = {
            student,
            grades: {},
            absences: [],
            moyenne: 0,
            status: 'pending',
            canValidate: false,
          };
        }
        
        for (const evaluation of evaluationsData) {
          const grades = await db.notes
            .where('evaluation_id')
            .equals(evaluation.id)
            .toArray();
          
          for (const grade of grades) {
            if (studentsGradesData[grade.etudiant_id]) {
              studentsGradesData[grade.etudiant_id].grades[evaluation.id] = {
                ...grade,
                coefficient: evaluation.coefficient || 1,
                type: evaluation.type
              };
            }
          }
        }
        
        try {
          const absencesData = await db.absences
            .where('cours_code')
            .equals(selectedCourse)
            .toArray();
          
          for (const absence of absencesData) {
            if (studentsGradesData[absence.etudiant_id]) {
              studentsGradesData[absence.etudiant_id].absences.push(absence);
            }
          }
        } catch (err) {
          console.warn("Error loading absences:", err);
        }
        
        for (const studentId in studentsGradesData) {
          const studentData = studentsGradesData[studentId];
          let totalPoints = 0;
          let totalCoeff = 0;
          
          for (const evalId in studentData.grades) {
            const grade = studentData.grades[evalId];
            totalPoints += grade.valeur * grade.coefficient;
            totalCoeff += grade.coefficient;
          }
          
          if (totalCoeff > 0) {
            studentData.moyenne = parseFloat((totalPoints / totalCoeff).toFixed(2));
          }
          
          const unjustifiedAbsences = studentData.absences.filter(a => !a.justifiee).length || 0;
          studentData.canValidate = studentData.moyenne >= 10 && unjustifiedAbsences <= 3;
          
          try {
            await db.createTableIfNotExists('deliberations', 
              '++id, etudiant_id, cours_code, date, resultat, commentaire');
              
            const deliberation = await db.deliberations
              .where('etudiant_id')
              .equals(studentId)
              .and(d => d.cours_code === selectedCourse)
              .first();
              
            if (deliberation) {
              studentData.status = deliberation.resultat;
              studentData.deliberation = deliberation;
            }
          } catch (error) {
            console.warn('Error checking deliberation status:', error);
          }
        }
        
        setStudentsData(studentsGradesData);
        setLoading(false);
      } catch (error) {
        setFeedback({
          show: true,
          message: t('common.error') + ': ' + error.message,
          type: 'error'
        });
        setLoading(false);
      }
    };
    
    loadCourseDetails();
  }, [selectedCourse, t]);
  
  // Filter students by status
  const filteredStudents = Object.values(studentsData).filter(studentData => {
    if (filter === 'all') return true;
    return studentData.status === filter;
  });
  
  // Helper to format dates
  const formatDate = (date) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString();
    } catch (e) {
      return date?.toString() || '';
    }
  };
  
  // Validate a course for a student
  const validateCourse = async (studentId) => {
    try {
      const studentData = studentsData[studentId];
      
      if (!studentData) {
        setFeedback({
          show: true,
          message: t('deliberations.studentNotFound'),
          type: 'error'
        });
        return;
      }
      
      try {
        await db.createTableIfNotExists('deliberations', 
          '++id, etudiant_id, cours_code, date, resultat, commentaire');
      } catch (error) {
        console.error('Error creating deliberations table:', error);
      }
      
      let deliberationId = null;
      try {
        const existingDeliberation = await db.deliberations
          .where('etudiant_id')
          .equals(studentId)
          .and(d => d.cours_code === selectedCourse)
          .first();
          
        if (existingDeliberation) {
          deliberationId = existingDeliberation.id;
        }
      } catch (error) {
        console.warn('Error checking for existing deliberation:', error);
      }
      
      const deliberationData = {
        etudiant_id: studentId,
        cours_code: selectedCourse,
        date: new Date(),
        resultat: 'validated',
        commentaire: 'Validation ordinaire',
        moyenne: studentData.moyenne,
        session: selectedSession
      };
      
      if (deliberationId) {
        await db.deliberations.update(deliberationId, deliberationData);
      } else {
        await db.deliberations.add(deliberationData);
      }
      
      setStudentsData({
        ...studentsData,
        [studentId]: {
          ...studentData,
          status: 'validated'
        }
      });
      
      setFeedback({
        show: true,
        message: t('deliberations.courseValidatedSuccess'),
        type: 'success'
      });
      
      setShowModal({ ...showModal, confirmValidation: false });
      setSelectedStudent(null);
    } catch (error) {
      setFeedback({
        show: true,
        message: t('common.error') + ': ' + error.message,
        type: 'error'
      });
    }
  };
  
  // Mark a course as not validated for a student
  const invalidateCourse = async (studentId) => {
    try {
      const studentData = studentsData[studentId];
      
      if (!studentData) {
        setFeedback({
          show: true,
          message: t('deliberations.studentNotFound'),
          type: 'error'
        });
        return;
      }
      
      try {
        await db.createTableIfNotExists('deliberations', 
          '++id, etudiant_id, cours_code, date, resultat, commentaire');
      } catch (error) {
        console.error('Error creating deliberations table:', error);
      }
      
      let deliberationId = null;
      try {
        const existingDeliberation = await db.deliberations
          .where('etudiant_id')
          .equals(studentId)
          .and(d => d.cours_code === selectedCourse)
          .first();
          
        if (existingDeliberation) {
          deliberationId = existingDeliberation.id;
        }
      } catch (error) {
        console.warn('Error checking for existing deliberation:', error);
      }
      
      const deliberationData = {
        etudiant_id: studentId,
        cours_code: selectedCourse,
        date: new Date(),
        resultat: 'not_validated',
        commentaire: 'Non validé',
        moyenne: studentData.moyenne,
        session: selectedSession
      };
      
      if (deliberationId) {
        await db.deliberations.update(deliberationId, deliberationData);
      } else {
        await db.deliberations.add(deliberationData);
      }
      
      setStudentsData({
        ...studentsData,
        [studentId]: {
          ...studentData,
          status: 'not_validated'
        }
      });
      
      setFeedback({
        show: true,
        message: t('deliberations.courseInvalidatedSuccess'),
        type: 'success'
      });
      
      setShowModal({ ...showModal, confirmNV: false });
      setSelectedStudent(null);
    } catch (error) {
      setFeedback({
        show: true,
        message: t('common.error') + ': ' + error.message,
        type: 'error'
      });
    }
  };
  
  // Suggest retake for a student
  const suggestRetake = async (studentId, suggestion) => {
    try {
      const studentData = studentsData[studentId];
      
      if (!studentData) {
        setFeedback({
          show: true,
          message: t('deliberations.studentNotFound'),
          type: 'error'
        });
        return;
      }
      
      console.log(`Suggesting ${suggestion} for student ${studentId} in course ${selectedCourse}`);
      
      setFeedback({
        show: true,
        message: t('deliberations.suggestionSent'),
        type: 'success'
      });
      
      setShowModal({ ...showModal, suggestRetake: false });
      setSelectedStudent(null);
    } catch (error) {
      setFeedback({
        show: true,
        message: t('common.error') + ': ' + error.message,
        type: 'error'
      });
    }
  };
  
  // Mass validation for all eligible students
  const validateAllEligible = async () => {
    try {
      try {
        await db.createTableIfNotExists('deliberations', 
          '++id, etudiant_id, cours_code, date, resultat, commentaire');
      } catch (error) {
        console.error('Error creating deliberations table:', error);
      }
      
      const updatedStudentData = { ...studentsData };
      let countValidated = 0;
      let countInvalidated = 0;
      
      for (const studentId in studentsData) {
        const studentData = studentsData[studentId];
        
        if (studentData.canValidate) {
          await db.deliberations.add({
            etudiant_id: studentId,
            cours_code: selectedCourse,
            date: new Date(),
            resultat: 'validated',
            commentaire: 'Validation ordinaire',
            moyenne: studentData.moyenne,
            session: selectedSession
          });
          
          updatedStudentData[studentId] = {
            ...studentData,
            status: 'validated'
          };
          
          countValidated++;
        } else if (studentData.status === 'pending') {
          await db.deliberations.add({
            etudiant_id: studentId,
            cours_code: selectedCourse,
            date: new Date(),
            resultat: 'not_validated',
            commentaire: 'Moyenne insuffisante ou absences excessive',
            moyenne: studentData.moyenne,
            session: selectedSession
          });
          
          updatedStudentData[studentId] = {
            ...studentData,
            status: 'not_validated'
          };
          
          countInvalidated++;
        }
      }
      
      setStudentsData(updatedStudentData);
      
      setFeedback({
        show: true,
        message: t('deliberations.massValidationSuccess', {
          validated: countValidated,
          invalidated: countInvalidated
        }),
        type: 'success'
      });
    } catch (error) {
      setFeedback({
        show: true,
        message: t('common.error') + ': ' + error.message,
        type: 'error'
      });
    }
  };
  
  if (loading && !courses.length) {
    return <div className="fstt-loading">{t('common.loading')}</div>;
  }
  
  return (
    <div className="fstt-deliberations">
      <h1>{t('deliberations.title')}</h1>
      
      {feedback.show && (
        <div className={`fstt-feedback fstt-feedback-${feedback.type}`}>
          {feedback.message}
        </div>
      )}
      
      <div className="fstt-deliberations-container">
        <div className="fstt-deliberations-sidebar">
          <h3>{t('courses.title')}</h3>
          
          {courses.length > 0 ? (
            <ul className="fstt-deliberations-courses">
              {courses.map(course => (
                <li 
                  key={course.code} 
                  className={selectedCourse === course.code ? 'active' : ''}
                  onClick={() => setSelectedCourse(course.code)}
                >
                  <div className="fstt-deliberations-course-info">
                    <span className="fstt-course-code">{course.code}</span>
                    <span className="fstt-course-title">{course.titre}</span>
                    <span className="fstt-course-semester">{course.semestre}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : loading ? (
            <div className="fstt-loading-indicator">{t('common.loading')}</div>
          ) : (
            <div className="fstt-empty-list">{t('deliberations.noCourses')}</div>
          )}
        </div>
        
        <div className="fstt-deliberations-content">
          {selectedCourse && courseDetails ? (
            <>
              <div className="fstt-deliberations-header">
                <h2>{courseDetails.titre}</h2>
                <div className="fstt-course-info">
                  <span>{t('courses.code')}: {courseDetails.code}</span>
                  <span>{t('courses.semester')}: {courseDetails.semestre}</span>
                  <span>{t('courses.year')}: {courseDetails.annee}</span>
                </div>
              </div>
              
              <div className="fstt-deliberations-controls">
                <div className="fstt-deliberations-filters">
                  <div className="fstt-filter-group">
                    <label>{t('deliberations.session')}:</label>
                    <select 
                      value={selectedSession} 
                      onChange={(e) => setSelectedSession(e.target.value)}
                    >
                      <option value="S1">S1</option>
                      <option value="S2">S2</option>
                      <option value="Rattrapages">Rattrapages</option>
                    </select>
                  </div>
                  
                  <div className="fstt-filter-group">
                    <label>{t('deliberations.status')}:</label>
                    <select 
                      value={filter} 
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">{t('common.all')}</option>
                      <option value="pending">{t('deliberations.statusPending')}</option>
                      <option value="validated">{t('deliberations.statusValidated')}</option>
                      <option value="not_validated">{t('deliberations.statusNotValidated')}</option>
                    </select>
                  </div>
                </div>
                
                {hasRole([ROLES.COORDINATEUR, ROLES.CHEF_DEPARTEMENT]) && (
                  <div className="fstt-deliberations-actions">
                    <button 
                      className="fstt-btn fstt-btn-primary"
                      onClick={validateAllEligible}
                    >
                      {t('deliberations.validateAll')}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="fstt-deliberations-list">
                {filteredStudents.length > 0 ? (
                  <table className="fstt-table">
                    <thead>
                      <tr>
                        <th>{t('students.appogee')}</th>
                        <th>{t('students.name')}</th>
                        <th>{t('evaluations.average')}</th>
                        <th>{t('deliberations.absences')}</th>
                        <th>{t('deliberations.status')}</th>
                        <th>{t('deliberations.decisions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(studentData => (
                        <tr key={studentData.student.id}>
                          <td>{studentData.student.appogee}</td>
                          <td>{studentData.student.nom} {studentData.student.prenom}</td>
                          <td className={`fstt-grade ${studentData.moyenne >= 10 ? 'passing' : 'failing'}`}>
                            {studentData.moyenne}
                          </td>
                          <td>
                            {studentData.absences.length} 
                            ({studentData.absences.filter(a => !a.justifiee).length} {t('deliberations.unjustified')})
                          </td>
                          <td>
                            <span className={`fstt-status fstt-status-${studentData.status}`}>
                              {studentData.status === 'pending' && t('deliberations.statusPending')}
                              {studentData.status === 'validated' && t('deliberations.statusValidated')}
                              {studentData.status === 'not_validated' && t('deliberations.statusNotValidated')}
                            </span>
                          </td>
                          <td>
                            {studentData.status === 'pending' && (
                              <>
                                {studentData.canValidate ? (
                                  <button 
                                    className="fstt-btn fstt-btn-success fstt-btn-sm"
                                    onClick={() => {
                                      setSelectedStudent(studentData.student.id);
                                      setShowModal({ ...showModal, confirmValidation: true });
                                    }}
                                  >
                                    {t('deliberations.validate')}
                                  </button>
                                ) : (
                                  <button 
                                    className="fstt-btn fstt-btn-danger fstt-btn-sm"
                                    onClick={() => {
                                      setSelectedStudent(studentData.student.id);
                                      setShowModal({ ...showModal, confirmNV: true });
                                    }}
                                  >
                                    {t('deliberations.nv')}
                                  </button>
                                )}
                                
                                <button 
                                  className="fstt-btn fstt-btn-secondary fstt-btn-sm"
                                  onClick={() => {
                                    setSelectedStudent(studentData.student.id);
                                    setShowModal({ ...showModal, suggestRetake: true });
                                  }}
                                >
                                  {t('evaluations.suggestRetake')}
                                </button>
                              </>
                            )}
                            
                            {studentData.status !== 'pending' && studentData.deliberation && (
                              <div className="fstt-deliberation-date">
                                {formatDate(studentData.deliberation.date)}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="fstt-empty">{t('deliberations.noStudents')}</div>
                )}
              </div>
            </>
          ) : (
            <div className="fstt-select-course-prompt">
              <h3>{t('deliberations.selectCoursePrompt')}</h3>
              <p>{t('deliberations.instructionText')}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      
      {/* Confirm Validation Modal */}
      {showModal.confirmValidation && selectedStudent && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <h3>{t('deliberations.confirmValidation')}</h3>
            <p>{t('deliberations.confirmValidationText')}</p>
            
            <div className="fstt-student-info">
              <p><strong>{t('students.name')}:</strong> {studentsData[selectedStudent]?.student.nom} {studentsData[selectedStudent]?.student.prenom}</p>
              <p><strong>{t('evaluations.average')}:</strong> {studentsData[selectedStudent]?.moyenne}</p>
              <p><strong>{t('deliberations.absences')}:</strong> {studentsData[selectedStudent]?.absences.length} ({studentsData[selectedStudent]?.absences.filter(a => !a.justifiee).length} {t('deliberations.unjustified')})</p>
            </div>
            
            <div className="fstt-modal-actions">
              <button 
                className="fstt-btn" 
                onClick={() => setShowModal({...showModal, confirmValidation: false})}
              >
                {t('common.cancel')}
              </button>
              <button 
                className="fstt-btn fstt-btn-success" 
                onClick={() => validateCourse(selectedStudent)}
              >
                {t('deliberations.validate')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirm Non-Validation Modal */}
      {showModal.confirmNV && selectedStudent && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <h3>{t('deliberations.confirmNV')}</h3>
            <p>{t('deliberations.confirmNVText')}</p>
            
            <div className="fstt-student-info">
              <p><strong>{t('students.name')}:</strong> {studentsData[selectedStudent]?.student.nom} {studentsData[selectedStudent]?.student.prenom}</p>
              <p><strong>{t('evaluations.average')}:</strong> {studentsData[selectedStudent]?.moyenne}</p>
              <p><strong>{t('deliberations.absences')}:</strong> {studentsData[selectedStudent]?.absences.length} ({studentsData[selectedStudent]?.absences.filter(a => !a.justifiee).length} {t('deliberations.unjustified')})</p>
            </div>
            
            <div className="fstt-modal-actions">
              <button 
                className="fstt-btn" 
                onClick={() => setShowModal({...showModal, confirmNV: false})}
              >
                {t('common.cancel')}
              </button>
              <button 
                className="fstt-btn fstt-btn-danger" 
                onClick={() => invalidateCourse(selectedStudent)}
              >
                {t('deliberations.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Suggest Retake Modal */}
      {showModal.suggestRetake && selectedStudent && (
        <div className="fstt-modal">
          <div className="fstt-modal-content">
            <h3>{t('deliberations.suggestOption')}</h3>
            <p>{t('deliberations.suggestOptionText')}</p>
            
            <div className="fstt-student-info">
              <p><strong>{t('students.name')}:</strong> {studentsData[selectedStudent]?.student.nom} {studentsData[selectedStudent]?.student.prenom}</p>
              <p><strong>{t('evaluations.average')}:</strong> {studentsData[selectedStudent]?.moyenne}</p>
            </div>
            
            <div className="fstt-suggestion-options">
              <button 
                className="fstt-btn fstt-btn-primary" 
                onClick={() => suggestRetake(selectedStudent, 'retake')}
              >
                {t('evaluations.suggestRetake')}
              </button>
              <button 
                className="fstt-btn fstt-btn-warning" 
                onClick={() => suggestRetake(selectedStudent, 'repeat')}
              >
                {t('evaluations.suggestRepeat')}
              </button>
            </div>
            
            <div className="fstt-modal-actions">
              <button 
                className="fstt-btn" 
                onClick={() => setShowModal({...showModal, suggestRetake: false})}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deliberations;
