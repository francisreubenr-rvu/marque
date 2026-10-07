export const GRADING_SCALE = [
  { min: 90, max: 100, grade: 'O',  point: 10, label: 'Outstanding',   color: '#10B981', bg: 'rgba(16,185,129,0.15)'  },
  { min: 80, max: 89,  grade: 'A+', point: 9,  label: 'Excellent',     color: '#06B6D4', bg: 'rgba(6,182,212,0.15)'   },
  { min: 70, max: 79,  grade: 'A',  point: 8,  label: 'Very Good',     color: '#6366F1', bg: 'rgba(99,102,241,0.15)'  },
  { min: 60, max: 69,  grade: 'B+', point: 7,  label: 'Good',          color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)'  },
  { min: 50, max: 59,  grade: 'B',  point: 6,  label: 'Above Average', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  },
  { min: 45, max: 49,  grade: 'C',  point: 5,  label: 'Average',       color: '#FB923C', bg: 'rgba(251,146,60,0.15)'  },
  { min: 40, max: 44,  grade: 'P',  point: 4,  label: 'Pass',          color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' },
  { min: 0,  max: 39,  grade: 'F',  point: 0,  label: 'Fail',          color: '#EF4444', bg: 'rgba(239,68,68,0.15)'   },
]

// CIE 1: 0-20 | CIE 2: 0-25 | CIE 3: 0-25 | SEE: 0-30 | Total: 0-100
export const ASSESSMENT_CAPS = { cie1: 20, cie2: 25, cie3: 25, see: 30 }
export const ASSESSMENT_LABELS = { cie1: 'CIE 1', cie2: 'CIE 2', cie3: 'CIE 3', see: 'SEE' }

// EEX divide — default courses already in the app
export const EEX_COURSES = [
  { courseCode: 'CS1807', courseName: 'Linear Algebra',                          credits: 3 },
  { courseCode: 'CS1006', courseName: 'Data Structures',                         credits: 4 },
  { courseCode: 'CS1211', courseName: 'Database Management Systems',             credits: 4 },
  { courseCode: 'CS1103', courseName: 'Operating Systems',                       credits: 3 },
  { courseCode: 'CS1102', courseName: 'Embedded Systems & ARM Microcontrollers', credits: 4 },
  { courseCode: 'CS1841', courseName: 'Engineering Explorations',                credits: 3 },
  { courseCode: 'CS1904', courseName: 'Entrepreneurial Mindset',                 credits: 2 },
  { courseCode: 'CS1925', courseName: 'Yoga & Wellbeing',                        credits: 2 },
]

// ES divide (Section F) — courses from the second timetable
export const ES_COURSES = [
  { courseCode: 'CS1807', courseName: 'Linear Algebra',                               credits: 3 },
  { courseCode: 'CS1006', courseName: 'Data Structures',                              credits: 4 },
  { courseCode: 'CS1211', courseName: 'Database Management Systems',                  credits: 4 },
  { courseCode: 'CS1103', courseName: 'Operating Systems',                            credits: 3 },
  { courseCode: 'CS1102', courseName: 'Embedded Systems and ARM Microcontrollers',    credits: 4 },
  { courseCode: 'CS1843', courseName: 'Exploring Science',                            credits: 2 },
  { courseCode: 'CS1904', courseName: 'Entrepreneurial Mindset',                      credits: 2 },
  { courseCode: 'CS1912', courseName: 'Constitution of India and Professional Ethics',credits: 2 },
]

// Sem 1 courses — 2024 scheme, AY 2025-26 (extracted from SAP results)
// ES divide: Exploring Science (CS1806) + Constitution (CS1928)
export const SEM1_ES_COURSES = [
  { courseCode: 'CS1101', courseName: 'Digital Systems and Computer Architecture',   credits: 3 },
  { courseCode: 'CS1927', courseName: 'English Communication',                       credits: 2 },
  { courseCode: 'CS1812', courseName: 'Discrete Maths and Set Theory',               credits: 3 },
  { courseCode: 'CS1929', courseName: 'Structured Innovation with Design Thinking',  credits: 2 },
  { courseCode: 'CS1003', courseName: 'Programming in C',                            credits: 4 },
  { courseCode: 'CS1308', courseName: 'Web Fundamentals and UX Design',              credits: 4 },
  { courseCode: 'CS1806', courseName: 'Exploring Science',                           credits: 3 },
  { courseCode: 'CS1928', courseName: 'Constitution of India and Professional Ethics', credits: 2 },
]

// EEX divide: Engineering Explorations (CS1841) + Yoga (CS1925)
export const SEM1_EEX_COURSES = [
  { courseCode: 'CS1101', courseName: 'Digital Systems and Computer Architecture',   credits: 3 },
  { courseCode: 'CS1927', courseName: 'English Communication',                       credits: 2 },
  { courseCode: 'CS1812', courseName: 'Discrete Maths and Set Theory',               credits: 3 },
  { courseCode: 'CS1929', courseName: 'Structured Innovation with Design Thinking',  credits: 2 },
  { courseCode: 'CS1003', courseName: 'Programming in C',                            credits: 4 },
  { courseCode: 'CS1308', courseName: 'Web Fundamentals and UX Design',              credits: 4 },
  { courseCode: 'CS1841', courseName: 'Engineering Explorations',                    credits: 3 },
  { courseCode: 'CS1925', courseName: 'Yoga & Wellbeing',                            credits: 2 },
]

// Sem 3 University Elective: the 2-credit Multidisciplinary / University Elective slot
// (Wednesday slot for every section). Students pick different electives, so the row is
// generic; delete it and add your own course code if you want it named.
export const SEM3_UNIVERSITY_ELECTIVE = { courseCode: 'UE', courseName: 'University Elective', credits: 2 }

// Sem 3 common core, 2024 scheme, AY 2026-27 (same for every section, no EEX/ES split).
// Order follows the attendance report; the major course slots in after CS2403,
// the University Elective comes last.
export const SEM3_CORE_COURSES = [
  { courseCode: 'CS2806', courseName: 'Calculus',                          credits: 2 },
  { courseCode: 'CS2000', courseName: 'Design and Analysis of Algorithms', credits: 4 },
  { courseCode: 'CS2403', courseName: 'Computer Networks',                 credits: 3 },
  { courseCode: 'CS2404', courseName: 'Internet of Things',                credits: 3 },
  { courseCode: 'EE',     courseName: 'Environment Education',             credits: 2 },
  SEM3_UNIVERSITY_ELECTIVE,
]

// Core courses added after a semester went live. Saved lists get each one appended
// once (blank marks) on load; see addLaterCoreCourses in semesterStore.js.
export const CORE_ADDED_LATER = { sem3: [SEM3_UNIVERSITY_ELECTIVE] }

// Minors are optional streams from other schools. When selected, every course
// in the minor is added to the semester and counts toward SGPA.
// To add a minor later, append an entry here with its per-semester courses.
export const LS_MINORS = 'sgpa_minors_v1'

export const MINORS = [
  { id: 'crim', label: 'Criminology', color: '#C9A0FF', glyph: '◇',
    desc: 'School of Law minor stream',
    courses: {
      sem3: [
        { courseCode: 'LW2055', courseName: 'Fundamentals of Criminology', credits: 3 },
        { courseCode: 'LW2032', courseName: 'Criminological Theories',     credits: 3 },
      ],
    },
  },
]

// Backward-compat alias (used by legacy localStorage loads)
export const DEFAULT_COURSES = EEX_COURSES

// Semesters × divides
// completed: true → grade-only entry mode (results already known)
// comingSoon: true → course data not yet available (sems 4-8)
// majorSem: true → courses depend on the chosen major (Year 2 onwards), no EEX/ES divide
export const SEMESTERS = [
  { id: 'sem1', label: 'Sem 1', available: true,  completed: true,  comingSoon: false },
  { id: 'sem2', label: 'Sem 2', available: true,  completed: false, comingSoon: false },
  { id: 'sem3', label: 'Sem 3', available: true,  completed: false, comingSoon: false, majorSem: true },
  { id: 'sem4', label: 'Sem 4', available: true,  completed: false, comingSoon: true,  majorSem: true },
  { id: 'sem5', label: 'Sem 5', available: true,  completed: false, comingSoon: true,  majorSem: true },
  { id: 'sem6', label: 'Sem 6', available: true,  completed: false, comingSoon: true,  majorSem: true },
  { id: 'sem7', label: 'Sem 7', available: true,  completed: false, comingSoon: true,  majorSem: true },
  { id: 'sem8', label: 'Sem 8', available: true,  completed: false, comingSoon: true,  majorSem: true },
]

export const DIVIDES = {
  sem1: [
    { id: 'ES',  courses: SEM1_ES_COURSES  },
    { id: 'EEX', courses: SEM1_EEX_COURSES },
  ],
  sem2: [
    { id: 'EEX', courses: EEX_COURSES },
    { id: 'ES',  courses: ES_COURSES  },
  ],
}

// Cross-divide extrapolation: sem1 divide → recommended sem2 divide
export const CROSS_DIVIDE = { ES: 'EEX', EEX: 'ES' }

export const LS_KEY        = 'sgpa_calc_v2'
export const LS_KEY_PREFIX = 'sgpa_calc_v2'
export const LS_SELECTION  = 'sgpa_selection_v1'

export const TABS = [
  { id: 'courses',   label: 'Courses'      },
  { id: 'dashboard', label: 'Dashboard'    },
  { id: 'reverse',   label: 'Reverse Calc' },
  { id: 'settings',  label: 'Settings'     },
]

export const SGPA_STATUS = [
  { min: 9.0,  label: 'Outstanding', color: '#10B981' },
  { min: 8.0,  label: 'Excellent',   color: '#06B6D4' },
  { min: 7.0,  label: 'Very Good',   color: '#6366F1' },
  { min: 6.0,  label: 'Good',        color: '#8B5CF6' },
  { min: 0,    label: 'Keep Going',  color: '#F59E0B' },
]

export const DIFFICULTY_LEVELS = [
  { id: 'easy',   label: 'Easy',   color: '#10B981', bg: 'rgba(16,185,129,.15)',  desc: 'High confidence in this course.' },
  { id: 'medium', label: 'Medium', color: '#F59E0B', bg: 'rgba(245,158,11,.15)',  desc: 'Uncertain — could go either way.' },
  { id: 'hard',   label: 'Hard',   color: '#EF4444', bg: 'rgba(239,68,68,.15)',   desc: 'Low confidence. Requires significant effort.' },
]

export const LS_MAJOR = 'sgpa_major_v1'

export const MAJORS = [
  { id: 'aiml',  label: 'AI / ML',        color: '#FF2A6D', glyph: '⬡',
    desc: 'Artificial Intelligence & Machine Learning',
    courses: ['Machine Learning', 'Deep Learning', 'Computer Vision', 'NLP', 'MLOps'] },
  { id: 'ds',    label: 'Data Science',    color: '#00F0FF', glyph: '◈',
    desc: 'Data Analytics & Statistical Computing',
    courses: ['Big Data', 'Statistical Analysis', 'Data Engineering', 'Visualisation', 'A/B Testing'] },
  { id: 'cyber', label: 'Cyber Security',  color: '#FF6B00', glyph: '⬟',
    desc: 'Network Security & Ethical Hacking',
    courses: ['Cryptography', 'Penetration Testing', 'SOC Operations', 'Threat Intelligence', 'Secure DevOps'] },
  { id: 'cloud', label: 'Cloud Computing', color: '#00FF9F', glyph: '◎',
    desc: 'Cloud Infrastructure & DevOps',
    courses: ['AWS / Azure / GCP', 'Kubernetes', 'Infrastructure as Code', 'CI/CD Pipelines', 'Serverless'] },
]

// Major specialization courses per semester. Sem 3 holds the real single
// specialization course for each track (3 credits); sem 4 to 8 are still placeholders.
export const MAJOR_SEMESTERS = {
  sem3: {
    aiml:  [{ courseCode: 'CS2227', courseName: 'Artificial Intelligence and Machine Learning', credits: 3 }],
    ds:    [{ courseCode: 'CS2231', courseName: 'Data Science',                                 credits: 3 }],
    cyber: [{ courseCode: 'CS2405', courseName: 'Cyber Security',                               credits: 3 }],
    cloud: [{ courseCode: 'CS2500', courseName: 'Cloud Computing and Big Data',                 credits: 3 }],
  },
  sem4: {
    aiml: [
      { courseCode: 'CS3101', courseName: 'Deep Learning',                credits: 4 },
      { courseCode: 'CS3102', courseName: 'Natural Language Processing',  credits: 4 },
      { courseCode: 'CS3103', courseName: 'Computer Vision',              credits: 3 },
      { courseCode: 'CS3104', courseName: 'MLOps & Model Deployment',     credits: 3 },
      { courseCode: 'CS3105', courseName: 'Reinforcement Learning',       credits: 2 },
    ],
    ds: [
      { courseCode: 'CS3201', courseName: 'Big Data Processing (Spark)', credits: 4 },
      { courseCode: 'CS3202', courseName: 'Predictive Modelling',        credits: 4 },
      { courseCode: 'CS3203', courseName: 'Time Series Analysis',        credits: 3 },
      { courseCode: 'CS3204', courseName: 'Data Engineering & Pipelines', credits: 3 },
      { courseCode: 'CS3205', courseName: 'A/B Testing & Experimentation', credits: 2 },
    ],
    cyber: [
      { courseCode: 'CS3301', courseName: 'Penetration Testing',      credits: 4 },
      { courseCode: 'CS3302', courseName: 'Web Application Security', credits: 4 },
      { courseCode: 'CS3303', courseName: 'Malware Analysis',         credits: 3 },
      { courseCode: 'CS3304', courseName: 'SOC & Incident Response',  credits: 3 },
      { courseCode: 'CS3305', courseName: 'Cloud Security Basics',    credits: 2 },
    ],
    cloud: [
      { courseCode: 'CS3401', courseName: 'AWS / Azure Practitioner',   credits: 4 },
      { courseCode: 'CS3402', courseName: 'Kubernetes & Orchestration', credits: 4 },
      { courseCode: 'CS3403', courseName: 'Infrastructure as Code',     credits: 3 },
      { courseCode: 'CS3404', courseName: 'CI/CD Pipelines',            credits: 3 },
      { courseCode: 'CS3405', courseName: 'Serverless Architecture',    credits: 2 },
    ],
  },
  sem5: {
    aiml: [
      { courseCode: 'CS4101', courseName: 'Large Language Models',        credits: 4 },
      { courseCode: 'CS4102', courseName: 'AI Ethics & Governance',       credits: 2 },
      { courseCode: 'CS4103', courseName: 'Advanced Computer Vision',     credits: 3 },
      { courseCode: 'CS4104', courseName: 'AI for Healthcare / Finance',  credits: 3 },
      { courseCode: 'CS4105', courseName: 'Research Methods in AI',       credits: 3 },
    ],
    ds: [
      { courseCode: 'CS4201', courseName: 'Feature Engineering',          credits: 4 },
      { courseCode: 'CS4202', courseName: 'Advanced Analytics',           credits: 3 },
      { courseCode: 'CS4203', courseName: 'Real-time Data Streaming',     credits: 3 },
      { courseCode: 'CS4204', courseName: 'Graph Analytics & Networks',   credits: 3 },
      { courseCode: 'CS4205', courseName: 'Data Science Ethics',          credits: 2 },
    ],
    cyber: [
      { courseCode: 'CS4301', courseName: 'Threat Intelligence',          credits: 4 },
      { courseCode: 'CS4302', courseName: 'Reverse Engineering',          credits: 3 },
      { courseCode: 'CS4303', courseName: 'Secure Software Development',  credits: 3 },
      { courseCode: 'CS4304', courseName: 'IoT Security',                 credits: 3 },
      { courseCode: 'CS4305', courseName: 'Cyber Law & Compliance',       credits: 2 },
    ],
    cloud: [
      { courseCode: 'CS4401', courseName: 'Multi-cloud Architecture',         credits: 4 },
      { courseCode: 'CS4402', courseName: 'Site Reliability Engineering',     credits: 3 },
      { courseCode: 'CS4403', courseName: 'Cloud Security & Compliance',      credits: 3 },
      { courseCode: 'CS4404', courseName: 'Microservices Design Patterns',    credits: 3 },
      { courseCode: 'CS4405', courseName: 'FinOps & Cost Optimisation',       credits: 2 },
    ],
  },
  sem6: {
    aiml:  [
      { courseCode: 'CS5101', courseName: 'Generative AI Systems',  credits: 4 },
      { courseCode: 'CS5102', courseName: 'AI Product Development', credits: 3 },
      { courseCode: 'CS5103', courseName: 'Advanced MLOps',         credits: 3 },
      { courseCode: 'CS5104', courseName: 'Capstone Project I',     credits: 4 },
    ],
    ds: [
      { courseCode: 'CS5201', courseName: 'Applied Machine Learning', credits: 4 },
      { courseCode: 'CS5202', courseName: 'Data Products & Platforms', credits: 3 },
      { courseCode: 'CS5203', courseName: 'NLP for Data Science',     credits: 3 },
      { courseCode: 'CS5204', courseName: 'Capstone Project I',       credits: 4 },
    ],
    cyber: [
      { courseCode: 'CS5301', courseName: 'Advanced Penetration Testing', credits: 4 },
      { courseCode: 'CS5302', courseName: 'Red Team Operations',          credits: 3 },
      { courseCode: 'CS5303', courseName: 'Blockchain Security',          credits: 3 },
      { courseCode: 'CS5304', courseName: 'Capstone Project I',           credits: 4 },
    ],
    cloud: [
      { courseCode: 'CS5401', courseName: 'Cloud Native Development', credits: 4 },
      { courseCode: 'CS5402', courseName: 'Platform Engineering',     credits: 3 },
      { courseCode: 'CS5403', courseName: 'Edge Computing & IoT Cloud', credits: 3 },
      { courseCode: 'CS5404', courseName: 'Capstone Project I',       credits: 4 },
    ],
  },
  sem7: {
    aiml:  [
      { courseCode: 'CS6101', courseName: 'AI Research Project',     credits: 6 },
      { courseCode: 'CS6102', courseName: 'Industry Elective I',     credits: 3 },
      { courseCode: 'CS6103', courseName: 'Industry Elective II',    credits: 3 },
      { courseCode: 'CS6104', courseName: 'Capstone Project II',     credits: 4 },
    ],
    ds: [
      { courseCode: 'CS6201', courseName: 'Data Science Research Project', credits: 6 },
      { courseCode: 'CS6202', courseName: 'Industry Elective I',           credits: 3 },
      { courseCode: 'CS6203', courseName: 'Industry Elective II',          credits: 3 },
      { courseCode: 'CS6204', courseName: 'Capstone Project II',           credits: 4 },
    ],
    cyber: [
      { courseCode: 'CS6301', courseName: 'Security Research Project', credits: 6 },
      { courseCode: 'CS6302', courseName: 'Industry Elective I',       credits: 3 },
      { courseCode: 'CS6303', courseName: 'Industry Elective II',      credits: 3 },
      { courseCode: 'CS6304', courseName: 'Capstone Project II',       credits: 4 },
    ],
    cloud: [
      { courseCode: 'CS6401', courseName: 'Cloud Research Project', credits: 6 },
      { courseCode: 'CS6402', courseName: 'Industry Elective I',    credits: 3 },
      { courseCode: 'CS6403', courseName: 'Industry Elective II',   credits: 3 },
      { courseCode: 'CS6404', courseName: 'Capstone Project II',    credits: 4 },
    ],
  },
  sem8: {
    aiml:  [
      { courseCode: 'CS7101', courseName: 'Final Year Project',                    credits: 8 },
      { courseCode: 'CS7102', courseName: 'Industry Internship Report',            credits: 4 },
      { courseCode: 'CS7103', courseName: 'Professional Ethics & Communication',   credits: 2 },
    ],
    ds: [
      { courseCode: 'CS7201', courseName: 'Final Year Project',                    credits: 8 },
      { courseCode: 'CS7202', courseName: 'Industry Internship Report',            credits: 4 },
      { courseCode: 'CS7203', courseName: 'Professional Ethics & Communication',   credits: 2 },
    ],
    cyber: [
      { courseCode: 'CS7301', courseName: 'Final Year Project',                    credits: 8 },
      { courseCode: 'CS7302', courseName: 'Industry Internship Report',            credits: 4 },
      { courseCode: 'CS7303', courseName: 'Professional Ethics & Communication',   credits: 2 },
    ],
    cloud: [
      { courseCode: 'CS7401', courseName: 'Final Year Project',                    credits: 8 },
      { courseCode: 'CS7402', courseName: 'Industry Internship Report',            credits: 4 },
      { courseCode: 'CS7403', courseName: 'Professional Ethics & Communication',   credits: 2 },
    ],
  },
}
