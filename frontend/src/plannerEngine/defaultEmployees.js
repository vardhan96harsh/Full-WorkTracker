/**
 * defaultEmployees.js
 * Default Designation Categories and Sample Employee Squad.
 */

export const DESIGNATION_CATEGORIES = [
  { id: 'PM', name: 'Project Manager', color: '#8b5cf6', badgeBg: 'rgba(139, 92, 246, 0.18)', textColor: '#c084fc' },
  { id: 'ID', name: 'Instructional Designer', color: '#10b981', badgeBg: 'rgba(16, 185, 129, 0.18)', textColor: '#34d399' },
  { id: 'DEVELOPER', name: 'Course Developer', color: '#0284c7', badgeBg: 'rgba(2, 132, 199, 0.18)', textColor: '#38bdf8' },
  { id: 'ANIMATOR', name: 'Animator', color: '#a855f7', badgeBg: 'rgba(168, 85, 247, 0.18)', textColor: '#c084fc' },
  { id: 'MOTION_GRAPHICS', name: 'Motion Graphic Designer', color: '#ec4899', badgeBg: 'rgba(236, 72, 153, 0.18)', textColor: '#f472b6' },
  { id: 'DESIGNER', name: 'Visual Designer', color: '#f59e0b', badgeBg: 'rgba(245, 158, 11, 0.18)', textColor: '#fbbf24' },
  { id: 'QA', name: 'QA Specialist', color: '#f43f5e', badgeBg: 'rgba(244, 63, 94, 0.18)', textColor: '#fb7185' },
  { id: 'VO', name: 'Voiceover Artist', color: '#14b8a6', badgeBg: 'rgba(20, 184, 166, 0.18)', textColor: '#2dd4bf' }
];

export const DEFAULT_EMPLOYEES = [
  { id: 'emp-as', name: 'Aman Soni', roleCategory: 'PM', designation: 'Project Manager', dailyHours: 7, avatar: 'AS' },
  { id: 'emp-ss', name: 'Sheetal Sanodia', roleCategory: 'ID', designation: 'Lead ID', dailyHours: 7, avatar: 'SS' },
  { id: 'emp-rt', name: 'Rishabh Thakur', roleCategory: 'ID', designation: 'Instructional Designer', dailyHours: 7, avatar: 'RT' },
  { id: 'emp-m', name: 'Mahima', roleCategory: 'ID', designation: 'Instructional Designer', dailyHours: 7, avatar: 'M' },
  { id: 'emp-i', name: 'Ishita', roleCategory: 'ID', designation: 'Instructional Designer', dailyHours: 7, avatar: 'I' },
  { id: 'emp-td', name: 'Tarun Dhakad', roleCategory: 'ANIMATOR', designation: 'Animator', dailyHours: 7, avatar: 'TD' },
  { id: 'emp-os', name: 'Omkar Sharna', roleCategory: 'MOTION_GRAPHICS', designation: 'Motion Graphic Designer', dailyHours: 7, avatar: 'OS' },
  { id: 'emp-ag1', name: 'Ansh Gaur', roleCategory: 'ANIMATOR', designation: 'Animator', dailyHours: 7, avatar: 'AG' },
  { id: 'emp-dv1', name: 'Deeksha Vishwakarma', roleCategory: 'ANIMATOR', designation: 'Animator', dailyHours: 7, avatar: 'DV' },
  { id: 'emp-gv', name: 'Gaurav Vishwakarma', roleCategory: 'ANIMATOR', designation: 'Animator', dailyHours: 7, avatar: 'GV' },
  { id: 'emp-js', name: 'Jayant Sharma', roleCategory: 'ANIMATOR', designation: 'Animator', dailyHours: 7, avatar: 'JS' },
  { id: 'emp-kk', name: 'Karan Kushwah', roleCategory: 'ANIMATOR', designation: 'Animator', dailyHours: 7, avatar: 'KK' },
  { id: 'emp-ov', name: 'Om Vishwakarma', roleCategory: 'DEVELOPER', designation: 'Storyline Developer', dailyHours: 7, avatar: 'OV' },
  { id: 'emp-ry', name: 'Rajesh Yadav', roleCategory: 'DEVELOPER', designation: 'Storyline Developer', dailyHours: 7, avatar: 'RY' },
  { id: 'emp-vd', name: 'Vivek Dhakad', roleCategory: 'DEVELOPER', designation: 'Storyline Developer', dailyHours: 7, avatar: 'VD' },
  { id: 'emp-kd', name: 'Kripal Dangi', roleCategory: 'DEVELOPER', designation: 'Storyline Developer', dailyHours: 7, avatar: 'KD' },
  { id: 'emp-dv2', name: 'Divya Vishwakarma', roleCategory: 'DEVELOPER', designation: 'Storyline Developer', dailyHours: 7, avatar: 'DV' },
  { id: 'emp-pm', name: 'Prachi Malviya', roleCategory: 'DEVELOPER', designation: 'Storyline Developer', dailyHours: 7, avatar: 'PM' },
  { id: 'emp-kv', name: 'Khushi Vishwakarma', roleCategory: 'DEVELOPER', designation: 'Storyline Developer', dailyHours: 7, avatar: 'KV' },
  { id: 'emp-am', name: 'Anuj Meena', roleCategory: 'DEVELOPER', designation: 'Storyline Developer', dailyHours: 7, avatar: 'AM' },
  { id: 'emp-nk', name: 'Nishi Kushwah', roleCategory: 'DEVELOPER', designation: 'Storyline Developer', dailyHours: 7, avatar: 'NK' },
  { id: 'emp-dg', name: 'Dhruv Gupta', roleCategory: 'DEVELOPER', designation: 'Storyline Developer', dailyHours: 7, avatar: 'DG' },
  { id: 'emp-da', name: 'Deepesh Ahirwar', roleCategory: 'DEVELOPER', designation: 'Storyline Developer', dailyHours: 7, avatar: 'DA' },
  { id: 'emp-sk', name: 'Sumit Kirar', roleCategory: 'DESIGNER', designation: 'Graphic Designer', dailyHours: 7, avatar: 'SK' },
  { id: 'emp-ak1', name: 'Adarsh Kirar', roleCategory: 'DESIGNER', designation: 'Graphic Designer', dailyHours: 7, avatar: 'AK' },
  { id: 'emp-ra', name: 'Rohit Ahirwar', roleCategory: 'DESIGNER', designation: 'Graphic Designer', dailyHours: 7, avatar: 'RA' },
  { id: 'emp-ak2', name: 'Anubhav Kirar', roleCategory: 'DESIGNER', designation: 'Graphic Designer', dailyHours: 7, avatar: 'AK' },
  { id: 'emp-ag2', name: 'Akshat Gupta', roleCategory: 'QA', designation: 'QA Specialist', dailyHours: 7, avatar: 'AG' },
  { id: 'emp-pv', name: 'Priyanshu Vishwakarma', roleCategory: 'QA', designation: 'QA Specialist', dailyHours: 7, avatar: 'PV' }
];
