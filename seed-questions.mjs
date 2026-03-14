import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const questions = [
  // ORGANIZATIONAL
  { category: 'organizational', questionText: 'How well does your organization support continuous professional development and training?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = No support at all, 5 = Excellent support with dedicated resources', weight: 1.2, sortOrder: 1 },
  { category: 'organizational', questionText: 'To what extent does your organization have a formal training needs assessment process?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = No formal process, 5 = Comprehensive structured process', weight: 1.0, sortOrder: 2 },
  { category: 'organizational', questionText: 'How aligned is the current training program with your organization\'s strategic goals?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = Not aligned, 5 = Fully aligned', weight: 1.1, sortOrder: 3 },
  { category: 'organizational', questionText: 'Does your organization have adequate budget allocated for training and development?', questionType: 'yes_no', minValue: 1, maxValue: 5, weight: 1.0, sortOrder: 4 },
  { category: 'organizational', questionText: 'How effective is leadership in promoting a learning culture within the organization?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = Leadership does not promote learning, 5 = Leadership actively champions learning', weight: 1.0, sortOrder: 5 },
  { category: 'organizational', questionText: 'How regularly does your organization review and update its training programs?', questionType: 'multiple_choice', options: ['Never','Annually','Semi-annually','Quarterly','Monthly'], weight: 0.9, sortOrder: 6 },
  // JOB/TASK
  { category: 'job_task', questionText: 'How well do you understand the specific competencies required for your current role?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = Very unclear, 5 = Completely clear', weight: 1.2, sortOrder: 1 },
  { category: 'job_task', questionText: 'To what extent do you have access to the tools and resources needed to perform your job effectively?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = No access, 5 = Full access to all needed resources', weight: 1.0, sortOrder: 2 },
  { category: 'job_task', questionText: 'How often are job performance standards reviewed and communicated to employees?', questionType: 'multiple_choice', options: ['Never','Rarely','Sometimes','Often','Always'], weight: 0.9, sortOrder: 3 },
  { category: 'job_task', questionText: 'Are there clearly defined performance indicators for your role?', questionType: 'yes_no', minValue: 1, maxValue: 5, weight: 1.0, sortOrder: 4 },
  { category: 'job_task', questionText: 'How frequently do you encounter tasks that require skills you currently lack?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = Never, 5 = Very frequently', weight: 1.1, sortOrder: 5 },
  { category: 'job_task', questionText: 'How well do current training materials reflect the actual job tasks and requirements?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = Not at all, 5 = Perfectly aligned', weight: 1.0, sortOrder: 6 },
  // INDIVIDUAL
  { category: 'individual', questionText: 'How would you rate your current proficiency level in your primary area of work?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = Beginner, 5 = Expert', weight: 1.3, sortOrder: 1 },
  { category: 'individual', questionText: 'How motivated are you to participate in training and professional development activities?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = Not motivated, 5 = Highly motivated', weight: 1.0, sortOrder: 2 },
  { category: 'individual', questionText: 'Have you received formal training or certification in your current field within the last 2 years?', questionType: 'yes_no', minValue: 1, maxValue: 5, weight: 1.0, sortOrder: 3 },
  { category: 'individual', questionText: 'How confident are you in applying new skills learned through training to your actual work?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = Not confident, 5 = Very confident', weight: 1.1, sortOrder: 4 },
  { category: 'individual', questionText: 'How would you assess the gap between your current skills and the skills required for career advancement?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = Very large gap, 5 = No gap', weight: 1.2, sortOrder: 5 },
  { category: 'individual', questionText: 'Do you have a personal development plan that outlines your training goals?', questionType: 'yes_no', minValue: 1, maxValue: 5, weight: 0.9, sortOrder: 6 },
  // TRAINING FEASIBILITY
  { category: 'training_feasibility', questionText: 'How feasible is it for you to attend training programs given your current workload?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = Not feasible at all, 5 = Very feasible', weight: 1.1, sortOrder: 1 },
  { category: 'training_feasibility', questionText: 'Does your organization provide paid time off for training and professional development?', questionType: 'yes_no', minValue: 1, maxValue: 5, weight: 1.0, sortOrder: 2 },
  { category: 'training_feasibility', questionText: 'What is your preferred mode of training delivery?', questionType: 'multiple_choice', options: ['Face-to-face classroom','Online/e-learning','Blended learning','On-the-job training','Workshops and seminars'], weight: 0.8, sortOrder: 3 },
  { category: 'training_feasibility', questionText: 'How accessible are training facilities or online learning platforms in your location?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = Very inaccessible, 5 = Very accessible', weight: 1.0, sortOrder: 4 },
  { category: 'training_feasibility', questionText: 'Does your organization have the infrastructure to support blended or e-learning programs?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = No infrastructure, 5 = Fully equipped', weight: 1.0, sortOrder: 5 },
  { category: 'training_feasibility', questionText: 'How willing is management to release staff for training activities?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = Not willing, 5 = Very supportive', weight: 1.1, sortOrder: 6 },
  // EVALUATION & SUCCESS
  { category: 'evaluation_success', questionText: 'How effectively does your organization measure the impact of training on job performance?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = No measurement, 5 = Comprehensive measurement system', weight: 1.2, sortOrder: 1 },
  { category: 'evaluation_success', questionText: 'Are training outcomes and success criteria clearly defined before programs begin?', questionType: 'yes_no', minValue: 1, maxValue: 5, weight: 1.0, sortOrder: 2 },
  { category: 'evaluation_success', questionText: 'How regularly is post-training follow-up conducted to assess skill retention?', questionType: 'multiple_choice', options: ['Never','After each program','Quarterly','Annually','Only when issues arise'], weight: 1.0, sortOrder: 3 },
  { category: 'evaluation_success', questionText: 'To what extent do you feel training programs have improved your work performance?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = No improvement, 5 = Significant improvement', weight: 1.1, sortOrder: 4 },
  { category: 'evaluation_success', questionText: 'How well does your organization use training evaluation data to improve future programs?', questionType: 'rating', minValue: 1, maxValue: 5, helpText: '1 = Data is not used, 5 = Data drives all program improvements', weight: 1.0, sortOrder: 5 },
  { category: 'evaluation_success', questionText: 'Does your organization track return on investment (ROI) for training programs?', questionType: 'yes_no', minValue: 1, maxValue: 5, weight: 0.9, sortOrder: 6 },
];

const targetRoles = JSON.stringify(['industry_worker','trainer','assessor','hr_officer']);

for (const q of questions) {
  const opts = q.options ? JSON.stringify(q.options) : null;
  await conn.execute(
    'INSERT INTO `questions` (`sectorId`, `skillAreaId`, `category`, `targetRoles`, `questionText`, `questionType`, `options`, `minValue`, `maxValue`, `isRequired`, `isActive`, `sortOrder`, `helpText`, `weight`) VALUES (NULL, NULL, ?, ?, ?, ?, ?, ?, ?, true, true, ?, ?, ?)',
    [q.category, targetRoles, q.questionText, q.questionType, opts, q.minValue ?? null, q.maxValue ?? null, q.sortOrder, q.helpText ?? null, q.weight]
  );
}

console.log('Seeded', questions.length, 'questions');
await conn.end();
