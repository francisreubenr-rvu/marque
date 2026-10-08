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

// Sem 3 generic slots. Electives, the major course and minor courses differ from
// student to student but carry the same credits for everyone, so each is one generic
// row. To name one, delete it and add your own course code (minor rows come back
// while the minor is on).
export const SEM3_MAJOR_COURSE        = { courseCode: 'MAJOR', courseName: 'Major Course',        credits: 3 }
export const SEM3_UNIVERSITY_ELECTIVE = { courseCode: 'UE',    courseName: 'University Elective', credits: 2 }

// Sem 3 common core, 2024 scheme, AY 2026-27 (same for every student, no EEX/ES split),
// then the major course and the University Elective.
export const SEM3_CORE_COURSES = [
  { courseCode: 'CS2806', courseName: 'Calculus',                          credits: 2 },
  { courseCode: 'CS2000', courseName: 'Design and Analysis of Algorithms', credits: 4 },
  { courseCode: 'CS2403', courseName: 'Computer Networks',                 credits: 3 },
  { courseCode: 'CS2404', courseName: 'Internet of Things',                credits: 3 },
  { courseCode: 'EE',     courseName: 'Environment Education',             credits: 2 },
  SEM3_MAJOR_COURSE,
  SEM3_UNIVERSITY_ELECTIVE,
]

// Core courses added after a semester went live. Saved lists get each one appended
// once (blank marks) on load; see addLaterCoreCourses in semesterStore.js.
export const CORE_ADDED_LATER = { sem3: [SEM3_UNIVERSITY_ELECTIVE] }

// Optional minor: a single on/off switch (true/false in localStorage). When on, the
// semester's minor courses count toward SGPA; when off they stay in the list with
// their marks but are excluded.
export const LS_MINOR = 'sgpa_minor_v2'

export const MINOR_COURSES = {
  sem3: [
    { courseCode: 'MINOR1', courseName: 'Minor Course 1', credits: 3 },
    { courseCode: 'MINOR2', courseName: 'Minor Course 2', credits: 3 },
  ],
}

// Backward-compat alias (used by legacy localStorage loads)
export const DEFAULT_COURSES = EEX_COURSES

// Semesters × divides
// completed: true → grade-only entry mode (results already known)
// comingSoon: true → course data not yet available (sems 4-8)
// common: true → Year 2 onwards, one course list for every student (no EEX/ES divide)
export const SEMESTERS = [
  { id: 'sem1', label: 'Sem 1', available: true,  completed: true,  comingSoon: false },
  { id: 'sem2', label: 'Sem 2', available: true,  completed: false, comingSoon: false },
  { id: 'sem3', label: 'Sem 3', available: true,  completed: false, comingSoon: false, common: true },
  { id: 'sem4', label: 'Sem 4', available: true,  completed: false, comingSoon: true,  common: true },
  { id: 'sem5', label: 'Sem 5', available: true,  completed: false, comingSoon: true,  common: true },
  { id: 'sem6', label: 'Sem 6', available: true,  completed: false, comingSoon: true,  common: true },
  { id: 'sem7', label: 'Sem 7', available: true,  completed: false, comingSoon: true,  common: true },
  { id: 'sem8', label: 'Sem 8', available: true,  completed: false, comingSoon: true,  common: true },
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
