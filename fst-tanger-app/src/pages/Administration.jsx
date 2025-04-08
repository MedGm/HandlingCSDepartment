import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import db from '../utils/db';
import './Administration.css';

/**
 * Administration page component
 * Provides administration tools for department management
 */
const Administration = () => {
  const { t } = useTranslation();
  const { currentUser, hasRole, ROLES } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  
  // Material management states
  const [materials, setMaterials] = useState([]);
  const [materialStatus, setMaterialStatus] = useState('checking');
  const [materialRequest, setMaterialRequest] = useState(null);
  
  // Budget management states
  const [budget, setBudget] = useState({
    total: 250000,
    allocated: 210000,
    remaining: 40000
  });
  const [budgetRequest, setBudgetRequest] = useState(null);
  
  // Course planning states
  const [courses, setCourses] = useState([]);
  const [coursePlan, setCoursePlan] = useState({
    conflicts: [],
    status: 'pending'
  });
  
  // Meetings states
  const [meetings, setMeetings] = useState([]);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    agenda: '',
    participants: []
  });

  // Get demo material data
  useEffect(() => {
    if (activeTab === 'materials') {
      // Simulate loading materials data
      setTimeout(() => {
        setMaterials([
          { id: 1, name: 'Ordinateur portable', quantity: 15, available: 5, status: 'available' },
          { id: 2, name: 'Projecteur', quantity: 8, available: 2, status: 'available' },
          { id: 3, name: 'Imprimante 3D', quantity: 2, available: 0, status: 'unavailable' },
          { id: 4, name: 'Serveur de calcul', quantity: 1, available: 0, status: 'maintenance' },
          { id: 5, name: 'Tablettes graphiques', quantity: 10, available: 3, status: 'available' }
        ]);
        setMaterialStatus('checked');
      }, 1000);
    }
  }, [activeTab]);

  // Get demo courses data
  useEffect(() => {
    if (activeTab === 'courses') {
      // Simulate loading courses data
      setTimeout(() => {
        setCourses([
          { id: 1, code: 'INFO301', name: 'Introduction à la programmation', professor: 'Mohammed El Brak', status: 'validated' },
          { id: 2, code: 'INFO302', name: 'Structures de données', professor: 'Sara Ait', status: 'validated' },
          { id: 3, code: 'INFO401', name: 'Intelligence artificielle', professor: null, status: 'pending' },
          { id: 4, code: 'INFO402', name: 'Développement web', professor: 'Mohamed Kounaidi', status: 'validated' },
          { id: 5, code: 'INFO501', name: 'Sécurité informatique', professor: null, status: 'pending' }
        ]);
      }, 1000);
    }
  }, [activeTab]);

  // Redirect if no admin access
  useEffect(() => {
    if (currentUser && 
        !hasRole(ROLES.CHEF_DEPARTEMENT) && 
        !hasRole(ROLES.ADMIN) && 
        !hasRole(ROLES.COORDINATEUR)) {
      // Non-admin access, could redirect or show message
      console.warn('Unauthorized access attempt to Administration page');
    }
  }, [currentUser, hasRole, ROLES]);
  
  // Render user management tab
  const renderUsersTab = () => (
    <div className="fstt-admin-tab-content ns">
      <div className="fstt-admin-section">
        <h3>{t('admin.userManagement')}</h3>
        <p>{t('admin.userManagementDescription')}</p>
        
        <div className="fstt-admin-actions">
          <button className="fstt-btn fstt-btn-primary" onClick={() => alert('Add User')}>
            {t('admin.addUser')}
          </button>
          <button className="fstt-btn" onClick={() => alert('Import Users')}>
            {t('admin.importUsers')}
          </button>
          <button className="fstt-btn" onClick={() => alert('Export Users')}>
            {t('admin.exportUsers')} 
          </button>
        </div>
        
        <div className="fstt-admin-table-container">
          <h4>{t('admin.usersList')}</h4>
          <div className="fstt-admin-table-controls">
            <input 
              type="text" 
              placeholder={t('common.search')} 
              className="fstt-admin-search" 
            />
            <select className="fstt-admin-filter">
              <option value="all">{t('common.all')}</option>
              <option value="teacher">{t('admin.teachers')}</option>
              <option value="student">{t('admin.students')}</option>
              <option value="staff">{t('admin.staff')}</option>
            </select>
          </div>
          
          <table className="fstt-table fstt-admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{t('admin.name')}</th>
                <th>{t('admin.email')}</th>
                <th>{t('admin.role')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>EL BRAK Mohammed</td>
                <td>melbrak@yahoo.fr</td>
                <td>{t('admin.roles.departmentHead')}</td>
                <td>
                  <button className="fstt-btn fstt-btn-sm">
                    {t('common.view')}
                  </button>
                  <button className="fstt-btn fstt-btn-sm fstt-btn-secondary">
                    {t('common.edit')}
                  </button>
                  <button className="fstt-btn fstt-btn-sm fstt-btn-danger">
                    {t('common.delete')}
                  </button>
                </td>
              </tr>
              <tr>
                <td>10</td>
                <td>KOUNAIDI Mohamed</td>
                <td>m.kounaidi@uae.ac.ma</td>
                <td>{t('admin.roles.coordinator')}</td>
                <td>
                  <button className="fstt-btn fstt-btn-sm">
                    {t('common.view')}
                  </button>
                  <button className="fstt-btn fstt-btn-sm fstt-btn-secondary">
                    {t('common.edit')}
                  </button>
                  <button className="fstt-btn fstt-btn-sm fstt-btn-danger">
                    {t('common.delete')}
                  </button>
                </td>
              </tr>
              <tr>
                <td>202</td>
                <td>RACHIDI Sara</td>
                <td>srachidi@uae.ac.ma</td>
                <td>{t('admin.roles.technician')}</td>
                <td>
                  <button className="fstt-btn fstt-btn-sm">
                    {t('common.view')}
                  </button>
                  <button className="fstt-btn fstt-btn-sm fstt-btn-secondary">
                    {t('common.edit')}
                  </button>
                  <button className="fstt-btn fstt-btn-sm fstt-btn-danger">
                    {t('common.delete')}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div className="fstt-admin-pagination">
            <button className="fstt-btn fstt-btn-sm">&laquo;</button>
            <button className="fstt-btn fstt-btn-sm">1</button>
            <button className="fstt-btn fstt-btn-sm">2</button>
            <button className="fstt-btn fstt-btn-sm">3</button>
            <button className="fstt-btn fstt-btn-sm">&raquo;</button>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Render material management tab (new)
  const renderMaterialsTab = () => {
    const handleMaterialCheck = () => {
      setMaterialStatus('checking');
      setTimeout(() => {
        const unavailable = materials.filter(m => m.available === 0);
        if (unavailable.length > 0) {
          setMaterialStatus('unavailable');
        } else {
          setMaterialStatus('available');
        }
      }, 1500);
    };

    const handleRequestPurchase = (material) => {
      setMaterialRequest({
        material: material,
        quantity: 1,
        justification: '',
        status: 'pending'
      });
    };

    const handleSubmitRequest = (e) => {
      e.preventDefault();
      setMaterialRequest({
        ...materialRequest,
        status: 'submitted'
      });

      // Simulate administration response
      setTimeout(() => {
        const success = Math.random() > 0.3; // 70% success rate
        setMaterialRequest({
          ...materialRequest,
          status: success ? 'approved' : 'rejected'
        });

        if (success) {
          // Update material quantity
          const updatedMaterials = materials.map(m => {
            if (m.id === materialRequest.material.id) {
              return {
                ...m, 
                quantity: m.quantity + materialRequest.quantity,
                available: m.available + materialRequest.quantity
              };
            }
            return m;
          });
          setMaterials(updatedMaterials);
        }
      }, 2000);
    };

    const handleOrganizeMeeting = () => {
      // After rejection, schedule a meeting
      setActiveTab('meetings');
      setNewMeeting({
        ...newMeeting,
        title: `Discussion sur l'achat de ${materialRequest.material.name}`,
        agenda: `Résolution du problème d'achat de ${materialRequest.material.name}`,
        date: new Date().toISOString().split('T')[0]
      });
    };

    return (
      <div className="fstt-admin-tab-content ns">
        <div className="fstt-admin-section">
          <h3>{t('admin.materialManagement')}</h3>
          <p>{t('admin.materialManagementDescription')}</p>
          
          <div className="fstt-admin-actions">
            <button 
              className="fstt-btn fstt-btn-primary"
              onClick={handleMaterialCheck}
              disabled={materialStatus === 'checking'}
            >
              {materialStatus === 'checking' ? 
                t('admin.checkingMaterials') : 
                t('admin.checkMaterials')}
            </button>
          </div>
          
          {materialStatus === 'checking' && (
            <div className="fstt-admin-loading-indicator">
              <div className="fstt-admin-spinner"></div>
              <p>{t('admin.checkingMaterialsMessage')}</p>
            </div>
          )}
          
          {materialStatus === 'unavailable' && !materialRequest && (
            <div className="fstt-admin-alert fstt-admin-alert-warning">
              <p>{t('admin.materialUnavailableMessage')}</p>
            </div>
          )}
          
          {materialStatus === 'available' && (
            <div className="fstt-admin-alert fstt-admin-alert-success">
              <p>{t('admin.materialAvailableMessage')}</p>
            </div>
          )}
          
          {materialRequest && (
            <div className={`fstt-admin-material-request fstt-admin-${materialRequest.status}`}>
              <h4>{t('admin.materialRequestTitle')}: {materialRequest.material.name}</h4>
              
              {materialRequest.status === 'pending' && (
                <form onSubmit={handleSubmitRequest}>
                  <div className="fstt-admin-form-group">
                    <label>{t('admin.requestQuantity')}</label>
                    <input 
                      type="number" 
                      value={materialRequest.quantity}
                      min="1"
                      onChange={(e) => setMaterialRequest({
                        ...materialRequest,
                        quantity: parseInt(e.target.value)
                      })}
                      required
                    />
                  </div>
                  
                  <div className="fstt-admin-form-group">
                    <label>{t('admin.requestJustification')}</label>
                    <textarea
                      value={materialRequest.justification}
                      onChange={(e) => setMaterialRequest({
                        ...materialRequest,
                        justification: e.target.value
                      })}
                      required
                      rows="3"
                    />
                  </div>
                  
                  <button type="submit" className="fstt-btn fstt-btn-primary">
                    {t('admin.submitRequest')}
                  </button>
                </form>
              )}
              
              {materialRequest.status === 'submitted' && (
                <div className="fstt-admin-loading-indicator">
                  <div className="fstt-admin-spinner"></div>
                  <p>{t('admin.processingRequest')}</p>
                </div>
              )}
              
              {materialRequest.status === 'approved' && (
                <div className="fstt-admin-alert fstt-admin-alert-success">
                  <p>{t('admin.requestApproved')}</p>
                  <button 
                    className="fstt-btn fstt-btn-secondary"
                    onClick={() => setMaterialRequest(null)}
                  >
                    {t('common.close')}
                  </button>
                </div>
              )}
              
              {materialRequest.status === 'rejected' && (
                <div className="fstt-admin-alert fstt-admin-alert-danger">
                  <p>{t('admin.requestRejected')}</p>
                  <div className="fstt-admin-actions">
                    <button 
                      className="fstt-btn fstt-btn-primary"
                      onClick={handleOrganizeMeeting}
                    >
                      {t('admin.organizeMeeting')}
                    </button>
                    <button 
                      className="fstt-btn fstt-btn-secondary"
                      onClick={() => setMaterialRequest(null)}
                    >
                      {t('common.close')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="fstt-admin-table-container">
            <h4>{t('admin.materialsList')}</h4>
            <table className="fstt-table fstt-admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('admin.materialName')}</th>
                  <th>{t('admin.materialTotal')}</th>
                  <th>{t('admin.materialAvailable')}</th>
                  <th>{t('admin.materialStatus')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {materials.map(material => (
                  <tr key={material.id}>
                    <td>{material.id}</td>
                    <td>{material.name}</td>
                    <td>{material.quantity}</td>
                    <td>{material.available}</td>
                    <td>
                      <span className={`fstt-status-badge ${material.status}`}>
                        {material.status === 'available' ? t('admin.statusAvailable') : 
                         material.status === 'unavailable' ? t('admin.statusUnavailable') : 
                         t('admin.statusMaintenance')}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="fstt-btn fstt-btn-sm"
                        onClick={() => handleRequestPurchase(material)}
                        disabled={material.status !== 'unavailable' || materialRequest !== null}
                      >
                        {t('admin.requestPurchase')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render budget management tab (new)
  const renderBudgetTab = () => {
    const handleCheckBudget = () => {
      // Do nothing, we already have budget info
      alert(t('admin.budgetCheckedMessage'));
    };

    const handleRequestBudget = () => {
      setBudgetRequest({
        amount: 0,
        justification: '',
        status: 'pending'
      });
    };

    const handleSubmitBudgetRequest = (e) => {
      e.preventDefault();
      setBudgetRequest({
        ...budgetRequest,
        status: 'submitted'
      });

      // Simulate administration response
      setTimeout(() => {
        const success = Math.random() > 0.4; // 60% success rate
        setBudgetRequest({
          ...budgetRequest,
          status: success ? 'approved' : 'rejected'
        });

        if (success) {
          // Update budget
          setBudget({
            ...budget,
            total: budget.total + budgetRequest.amount,
            remaining: budget.remaining + budgetRequest.amount
          });
        }
      }, 2000);
    };

    return (
      <div className="fstt-admin-tab-content ns">
        <div className="fstt-admin-section">
          <h3>{t('admin.budgetManagement')}</h3>
          <p>{t('admin.budgetManagementDescription')}</p>
          
          <div className="fstt-admin-budget-overview">
            <div className="fstt-admin-budget-card">
              <h4>{t('admin.totalBudget')}</h4>
              <div className="fstt-admin-budget-amount">{budget.total.toLocaleString()} DH</div>
            </div>
            <div className="fstt-admin-budget-card">
              <h4>{t('admin.allocatedBudget')}</h4>
              <div className="fstt-admin-budget-amount">{budget.allocated.toLocaleString()} DH</div>
            </div>
            <div className="fstt-admin-budget-card">
              <h4>{t('admin.remainingBudget')}</h4>
              <div className="fstt-admin-budget-amount">{budget.remaining.toLocaleString()} DH</div>
            </div>
          </div>
          
          <div className="fstt-admin-budget-chart">
            <div className="fstt-admin-budget-bar">
              <div 
                className="fstt-admin-budget-progress" 
                style={{width: `${(budget.allocated / budget.total) * 100}%`}}
              ></div>
            </div>
            <div className="fstt-admin-budget-info">
              {Math.round((budget.allocated / budget.total) * 100)}% {t('admin.budgetUsed')}
            </div>
          </div>
          
          <div className="fstt-admin-actions">
            <button 
              className="fstt-btn fstt-btn-primary"
              onClick={handleCheckBudget}
            >
              {t('admin.checkBudget')}
            </button>
            <button 
              className="fstt-btn fstt-btn-secondary"
              onClick={handleRequestBudget}
              disabled={budgetRequest !== null}
            >
              {t('admin.requestAdditionalBudget')}
            </button>
          </div>
          
          {budgetRequest && (
            <div className={`fstt-admin-budget-request fstt-admin-${budgetRequest.status}`}>
              <h4>{t('admin.budgetRequestTitle')}</h4>
              
              {budgetRequest.status === 'pending' && (
                <form onSubmit={handleSubmitBudgetRequest}>
                  <div className="fstt-admin-form-group">
                    <label>{t('admin.requestAmount')}</label>
                    <input 
                      type="number" 
                      value={budgetRequest.amount}
                      min="1000"
                      onChange={(e) => setBudgetRequest({
                        ...budgetRequest,
                        amount: parseInt(e.target.value)
                      })}
                      required
                    />
                  </div>
                  
                  <div className="fstt-admin-form-group">
                    <label>{t('admin.requestJustification')}</label>
                    <textarea
                      value={budgetRequest.justification}
                      onChange={(e) => setBudgetRequest({
                        ...budgetRequest,
                        justification: e.target.value
                      })}
                      required
                      rows="3"
                    />
                  </div>
                  
                  <button type="submit" className="fstt-btn fstt-btn-primary">
                    {t('admin.submitRequest')}
                  </button>
                </form>
              )}
              
              {budgetRequest.status === 'submitted' && (
                <div className="fstt-admin-loading-indicator">
                  <div className="fstt-admin-spinner"></div>
                  <p>{t('admin.processingBudgetRequest')}</p>
                </div>
              )}
              
              {budgetRequest.status === 'approved' && (
                <div className="fstt-admin-alert fstt-admin-alert-success">
                  <p>{t('admin.budgetRequestApproved', { amount: budgetRequest.amount.toLocaleString() })}</p>
                  <button 
                    className="fstt-btn fstt-btn-secondary"
                    onClick={() => setBudgetRequest(null)}
                  >
                    {t('common.close')}
                  </button>
                </div>
              )}
              
              {budgetRequest.status === 'rejected' && (
                <div className="fstt-admin-alert fstt-admin-alert-danger">
                  <p>{t('admin.budgetRequestRejected')}</p>
                  <button 
                    className="fstt-btn fstt-btn-secondary"
                    onClick={() => setBudgetRequest(null)}
                  >
                    {t('common.close')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render courses planning tab (new)
  const renderCoursesTab = () => {
    const handleAssignProfessor = (courseId, professorName) => {
      const updatedCourses = courses.map(course => {
        if (course.id === courseId) {
          return { 
            ...course,
            professor: professorName,
            status: 'validated'
          };
        }
        return course;
      });
      setCourses(updatedCourses);
    };

    const handleCreateSchedule = () => {
      setCoursePlan({
        ...coursePlan,
        status: 'checking'
      });

      // Simulate checking for conflicts
      setTimeout(() => {
        const hasConflicts = Math.random() > 0.5; // 50% chance of conflicts
        if (hasConflicts) {
          setCoursePlan({
            conflicts: [
              {
                course1: "INFO302: Structures de données",
                course2: "INFO402: Développement web",
                day: "Lundi",
                time: "09:00-10:30",
                room: "Salle A4"
              }
            ],
            status: 'conflicts'
          });
        } else {
          setCoursePlan({
            conflicts: [],
            status: 'ready'
          });
        }
      }, 2000);
    };

    const handleAdjustSchedule = () => {
      setCoursePlan({
        ...coursePlan,
        status: 'adjusting'
      });

      // Simulate schedule adjustment
      setTimeout(() => {
        setCoursePlan({
          conflicts: [],
          status: 'ready'
        });
      }, 2000);
    };

    const renderScheduleStatus = () => {
      switch(coursePlan.status) {
        case 'checking':
          return (
            <div className="fstt-admin-loading-indicator">
              <div className="fstt-admin-spinner"></div>
              <p>{t('admin.checkingSchedule')}</p>
            </div>
          );
        case 'conflicts':
          return (
            <div className="fstt-admin-alert fstt-admin-alert-warning">
              <h4>{t('admin.scheduleConflicts')}</h4>
              <ul className="fstt-admin-conflicts-list">
                {coursePlan.conflicts.map((conflict, index) => (
                  <li key={index}>
                    <strong>{t('admin.conflictBetween')}</strong>
                    <p>• {conflict.course1}</p>
                    <p>• {conflict.course2}</p>
                    <strong>{t('admin.conflictAt')}</strong>
                    <p>{conflict.day}, {conflict.time}, {conflict.room}</p>
                  </li>
                ))}
              </ul>
              <button 
                className="fstt-btn fstt-btn-primary"
                onClick={handleAdjustSchedule}
              >
                {t('admin.adjustSchedule')}
              </button>
            </div>
          );
        case 'adjusting':
          return (
            <div className="fstt-admin-loading-indicator">
              <div className="fstt-admin-spinner"></div>
              <p>{t('admin.adjustingSchedule')}</p>
            </div>
          );
        case 'ready':
          return (
            <div className="fstt-admin-alert fstt-admin-alert-success">
              <h4>{t('admin.scheduleReady')}</h4>
              <p>{t('admin.scheduleReadyMessage')}</p>
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div className="fstt-admin-tab-content ns">
        <div className="fstt-admin-section">
          <h3>{t('admin.courseManagement')}</h3>
          <p>{t('admin.courseManagementDescription')}</p>
          
          <div className="fstt-admin-actions">
            <button 
              className="fstt-btn fstt-btn-primary"
              onClick={handleCreateSchedule}
              disabled={coursePlan.status === 'checking' || coursePlan.status === 'adjusting'}
            >
              {t('admin.createSchedule')}
            </button>
          </div>
          
          {renderScheduleStatus()}
          
          <div className="fstt-admin-table-container">
            <h4>{t('admin.coursesList')}</h4>
            <table className="fstt-table fstt-admin-table">
              <thead>
                <tr>
                  <th>{t('courses.code')}</th>
                  <th>{t('courses.name')}</th>
                  <th>{t('courses.teachers')}</th>
                  <th>{t('courses.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course.id}>
                    <td>{course.code}</td>
                    <td>{course.name}</td>
                    <td>{course.professor || '-'}</td>
                    <td>
                      <span className={`fstt-status-badge ${course.status}`}>
                        {course.status === 'validated' ? 
                          t('admin.courseValidated') : t('admin.coursePending')}
                      </span>
                    </td>
                    <td>
                      {!course.professor ? (
                        <button
                          className="fstt-btn fstt-btn-sm"
                          onClick={() => handleAssignProfessor(course.id, "Nouveau Professeur")}
                        >
                          {t('courses.assign')}
                        </button>
                      ) : (
                        <button className="fstt-btn fstt-btn-sm fstt-btn-secondary">
                          {t('common.edit')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  
  // Render meetings tab (new)
  const renderMeetingsTab = () => {
    const handleMeetingChange = (e) => {
      const { name, value } = e.target;
      setNewMeeting({
        ...newMeeting,
        [name]: value
      });
    };

    const handleAddMeeting = (e) => {
      e.preventDefault();
      setMeetings([
        ...meetings,
        {
          ...newMeeting,
          id: Date.now(),
          status: 'scheduled'
        }
      ]);
      setNewMeeting({
        title: '',
        date: '',
        time: '',
        location: '',
        agenda: '',
        participants: []
      });
    };

    return (
      <div className="fstt-admin-tab-content ns">
        <div className="fstt-admin-section">
          <h3>{t('admin.meetingsManagement')}</h3>
          <p>{t('admin.meetingsManagementDescription')}</p>
          
          <div className="fstt-admin-meetings-container">
            <div className="fstt-admin-meetings-form">
              <h4>{t('admin.scheduleMeeting')}</h4>
              <form onSubmit={handleAddMeeting}>
                <div className="fstt-admin-form-group">
                  <label>{t('admin.meetingTitle')}</label>
                  <input 
                    type="text"
                    name="title"
                    value={newMeeting.title}
                    onChange={handleMeetingChange}
                    required
                  />
                </div>
                
                <div className="fstt-admin-form-row">
                  <div className="fstt-admin-form-group">
                    <label>{t('admin.meetingDate')}</label>
                    <input 
                      type="date"
                      name="date"
                      value={newMeeting.date}
                      onChange={handleMeetingChange}
                      required
                    />
                  </div>
                  <div className="fstt-admin-form-group">
                    <label>{t('admin.meetingTime')}</label>
                    <input 
                      type="time"
                      name="time"
                      value={newMeeting.time}
                      onChange={handleMeetingChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="fstt-admin-form-group">
                  <label>{t('admin.meetingLocation')}</label>
                  <input 
                    type="text"
                    name="location"
                    value={newMeeting.location}
                    onChange={handleMeetingChange}
                    required
                  />
                </div>
                
                <div className="fstt-admin-form-group">
                  <label>{t('admin.meetingAgenda')}</label>
                  <textarea
                    name="agenda"
                    value={newMeeting.agenda}
                    onChange={handleMeetingChange}
                    rows="3"
                    required
                  ></textarea>
                </div>
                
                <button type="submit" className="fstt-btn fstt-btn-primary">
                  {t('admin.scheduleMeeting')}
                </button>
              </form>
            </div>
            
            <div className="fstt-admin-meetings-list">
              <h4>{t('admin.upcomingMeetings')}</h4>
              {meetings.length > 0 ? (
                <div className="fstt-admin-meetings-cards">
                  {meetings.map(meeting => (
                    <div className="fstt-admin-meeting-card" key={meeting.id}>
                      <h4>{meeting.title}</h4>
                      <p>
                        <strong>{t('admin.meetingDate')}:</strong> {meeting.date}
                      </p>
                      <p>
                        <strong>{t('admin.meetingTime')}:</strong> {meeting.time}
                      </p>
                      <p>
                        <strong>{t('admin.meetingLocation')}:</strong> {meeting.location}
                      </p>
                      <div className="fstt-admin-meeting-agenda">
                        <strong>{t('admin.meetingAgenda')}:</strong>
                        <p>{meeting.agenda}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="fstt-admin-empty-message">
                  {t('admin.noMeetingsScheduled')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render reports tab
  const renderReportsTab = () => (
    <div className="fstt-admin-tab-content ns">
      <div className="fstt-admin-section">
        <h3>{t('admin.academicReports')}</h3>
        <p>{t('admin.reportsDescription')}</p>
        
        <div className="fstt-admin-reports-grid">
          <div className="fstt-admin-report-card" onClick={() => alert('Student Progress Report')}>
            <h4>{t('admin.reports.studentProgress')}</h4>
            <p>{t('admin.reports.studentProgressDesc')}</p>
          </div>
          
          <div className="fstt-admin-report-card" onClick={() => alert('Course Performance Report')}>
            <h4>{t('admin.reports.coursePerformance')}</h4>
            <p>{t('admin.reports.coursePerformanceDesc')}</p>
          </div>
          
          <div className="fstt-admin-report-card" onClick={() => alert('Department Statistics')}>
            <h4>{t('admin.reports.departmentStats')}</h4>
            <p>{t('admin.reports.departmentStatsDesc')}</p>
          </div>
          
          <div className="fstt-admin-report-card" onClick={() => alert('Incidents Report')}>
            <h4>{t('admin.reports.incidents')}</h4>
            <p>{t('admin.reports.incidentsDesc')}</p>
          </div>
        </div>
        
        <div className="fstt-admin-chart-preview">
          <h4>{t('admin.dataVisualization')}</h4>
          <div className="fstt-admin-chart-placeholder">
            {t('admin.chartPlaceholder')}
          </div>
        </div>
      </div>
    </div>
  );
  
  // Render system configuration tab
  const renderConfigTab = () => (
    <div className="fstt-admin-tab-content ns">
      <div className="fstt-admin-section">
        <h3>{t('admin.systemConfiguration')}</h3>
        <p>{t('admin.configDescription')}</p>
        
        <div className="fstt-admin-config-grid">
          <div className="fstt-admin-config-card">
            <h4>{t('admin.config.general')}</h4>
            <form className="fstt-admin-form">
              <div className="fstt-admin-form-group">
                <label>{t('admin.config.departmentName')}</label>
                <input type="text" defaultValue="GÉNIE INFORMATIQUE" />
              </div>
              <div className="fstt-admin-form-group">
                <label>{t('admin.config.academicYear')}</label>
                <input type="text" defaultValue="2023-2024" />
              </div>
              <div className="fstt-admin-form-group">
                <label>{t('admin.config.language')}</label>
                <select>
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
              <button type="button" className="fstt-btn fstt-btn-primary">
                {t('common.save')}
              </button>
            </form>
          </div>
          
          <div className="fstt-admin-config-card">
            <h4>{t('admin.config.database')}</h4>
            <div className="fstt-admin-db-actions">
              <button className="fstt-btn" onClick={() => alert('Database Backup')}>
                {t('admin.config.backup')}
              </button>
              <button className="fstt-btn" onClick={() => alert('Database Restore')}>
                {t('admin.config.restore')}
              </button>
              <button className="fstt-btn fstt-btn-danger" onClick={() => alert('Reset Database')}>
                {t('admin.config.reset')}
              </button>
            </div>
          </div>
          
          <div className="fstt-admin-config-card">
            <h4>{t('admin.config.logs')}</h4>
            <div className="fstt-admin-log-viewer">
              <pre>[2023-11-15 10:30:22] System initialized\n[2023-11-15 10:45:15] User login: melbrak@yahoo.fr\n[2023-11-15 11:12:03] Course added: Introduction to Programming</pre>
            </div>
            <button className="fstt-btn" onClick={() => alert('Download Logs')}>
              {t('admin.config.downloadLogs')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  
  // If not authorized, show access denied message
  if (currentUser && 
      !hasRole(ROLES.CHEF_DEPARTEMENT) && 
      !hasRole(ROLES.ADMIN) && 
      !hasRole(ROLES.COORDINATEUR)) {
    return (
      <div className="fstt-admin-access-denied ns">
        <h2>{t('common.accessDenied')}</h2>
        <p>{t('common.adminOnly')}</p>
      </div>
    );
  }

  return (
    <div className="fstt-admin ns">
      <h1>{t('nav.admin')}</h1>
      
      <div className="fstt-admin-welcome">
        <h2>{t('admin.welcomeTitle')}</h2>
        <p>{t('admin.welcomeMessage')}</p>
      </div>
      
      <div className="fstt-admin-tabs">
        <div className="fstt-admin-tab-header">
          <button 
            className={`fstt-admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`} 
            onClick={() => setActiveTab('users')}
          >
            {t('admin.userManagement')}
          </button>
          <button 
            className={`fstt-admin-tab-btn ${activeTab === 'materials' ? 'active' : ''}`} 
            onClick={() => setActiveTab('materials')}
          >
            {t('admin.materialManagement')}
          </button>
          <button 
            className={`fstt-admin-tab-btn ${activeTab === 'budget' ? 'active' : ''}`} 
            onClick={() => setActiveTab('budget')}
          >
            {t('admin.budgetManagement')}
          </button>
          <button 
            className={`fstt-admin-tab-btn ${activeTab === 'courses' ? 'active' : ''}`} 
            onClick={() => setActiveTab('courses')}
          >
            {t('admin.courseManagement')}
          </button>
          <button 
            className={`fstt-admin-tab-btn ${activeTab === 'meetings' ? 'active' : ''}`} 
            onClick={() => setActiveTab('meetings')}
          >
            {t('admin.meetingsManagement')}
          </button>
          <button 
            className={`fstt-admin-tab-btn ${activeTab === 'reports' ? 'active' : ''}`} 
            onClick={() => setActiveTab('reports')}
          >
            {t('admin.academicReports')}
          </button>
          <button 
            className={`fstt-admin-tab-btn ${activeTab === 'config' ? 'active' : ''}`} 
            onClick={() => setActiveTab('config')}
          >
            {t('admin.systemConfiguration')}
          </button>
        </div>
        
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'materials' && renderMaterialsTab()}
        {activeTab === 'budget' && renderBudgetTab()}
        {activeTab === 'courses' && renderCoursesTab()}
        {activeTab === 'meetings' && renderMeetingsTab()}
        {activeTab === 'reports' && renderReportsTab()}
        {activeTab === 'config' && renderConfigTab()}
      </div>
    </div>
  );
};

export default Administration;
