/**
 * complexityConfig.js
 * Default productivity rates and project-type-specific complexity level configurations.
 * All values are fully customizable by the PM via the Complexity Adjustment tool.
 */

export const PROJECT_TYPE_COMPLEXITIES = {
  'storyline-360': [
    {
      id: 'Level 1',
      name: 'Level 1',
      description: 'Standard template layout, basic click-to-reveal, 0% custom motion animation.',
      animatorRatioPercent: 0,
      developerRatioPercent: 100,
      baselineAnimMinutes: 0,
      baselineDevMinutes: 60,
      effortMultiplier: 0.8
    },
    {
      id: 'Level 2',
      name: 'Level 2',
      description: 'Standard interactive branching with ~10 mins 2D motion animation per 60 mins of content.',
      animatorRatioPercent: (10 / 60) * 100,
      developerRatioPercent: (50 / 60) * 100,
      baselineAnimMinutes: 10,
      baselineDevMinutes: 50,
      effortMultiplier: 1.0
    },
    {
      id: 'Level 2.5',
      name: 'Level 2.5',
      description: 'Enhanced interactive branching with ~20 mins 2D motion animation per 60 mins of content.',
      animatorRatioPercent: (20 / 60) * 100,
      developerRatioPercent: (40 / 60) * 100,
      baselineAnimMinutes: 20,
      baselineDevMinutes: 40,
      effortMultiplier: 1.15
    },
    {
      id: 'Level 3',
      name: 'Level 3',
      description: 'Rich multimedia course with 50% custom 2D animation and 50% interactive development.',
      animatorRatioPercent: 50,
      developerRatioPercent: 50,
      baselineAnimMinutes: 30,
      baselineDevMinutes: 30,
      effortMultiplier: 1.3
    },
    {
      id: 'Level 4',
      name: 'Level 4',
      description: 'Heavy animation-led experience with ~50 mins custom 2D animation per 60 mins of content.',
      animatorRatioPercent: (50 / 60) * 100,
      developerRatioPercent: (10 / 60) * 100,
      baselineAnimMinutes: 50,
      baselineDevMinutes: 10,
      effortMultiplier: 1.6
    }
  ],
  'rise-360': [
    {
      id: 'Basic (Text + Image)',
      name: 'Basic (Text + Image)',
      description: 'Clean text and imagery blocks, standard knowledge checks, and minimal custom media.',
      animatorRatioPercent: 0,
      developerRatioPercent: 100,
      baselineAnimMinutes: 0,
      baselineDevMinutes: 60,
      effortMultiplier: 0.7
    },
    {
      id: 'Interactive (Clickables + Activities)',
      name: 'Interactive (Clickables + Activities)',
      description: 'Interactive accordions, tabs, flashcards, scenario blocks, sorting activities, and infographics.',
      animatorRatioPercent: 15,
      developerRatioPercent: 85,
      baselineAnimMinutes: 9,
      baselineDevMinutes: 51,
      effortMultiplier: 1.0
    },
    {
      id: 'Custom',
      name: 'Custom',
      description: 'Bespoke CSS styling, embedded Storyline blocks, custom multimedia, and interactive microlearning labs.',
      animatorRatioPercent: 35,
      developerRatioPercent: 65,
      baselineAnimMinutes: 21,
      baselineDevMinutes: 39,
      effortMultiplier: 1.4
    }
  ],
  'mp4-video': [
    {
      id: 'Video Editing',
      name: 'Video Editing',
      description: 'Raw footage trimming, multi-track audio sync, subtitles, lower-thirds, and b-roll assembly.',
      animatorRatioPercent: 70,
      developerRatioPercent: 30,
      baselineAnimMinutes: 42,
      baselineDevMinutes: 18,
      effortMultiplier: 0.85
    },
    {
      id: 'Custom Animated',
      name: 'Custom Animated',
      description: '2D character rigging, custom vector scene animations, and narrative explainer flow.',
      animatorRatioPercent: 85,
      developerRatioPercent: 15,
      baselineAnimMinutes: 51,
      baselineDevMinutes: 9,
      effortMultiplier: 1.15
    },
    {
      id: 'High End (Motion Graphics)',
      name: 'High End (Motion Graphics)',
      description: 'Kinetic motion graphics, 3D elements, dynamic typography, and advanced visual effects.',
      animatorRatioPercent: 95,
      developerRatioPercent: 5,
      baselineAnimMinutes: 57,
      baselineDevMinutes: 3,
      effortMultiplier: 1.55
    },
    {
      id: 'AI Powered (AI + Editing)',
      name: 'AI Powered (AI + Editing)',
      description: 'AI synthetic avatar narration, AI b-roll generation, speech enhancement, and rapid video assembly.',
      animatorRatioPercent: 60,
      developerRatioPercent: 40,
      baselineAnimMinutes: 36,
      baselineDevMinutes: 24,
      effortMultiplier: 0.9
    }
  ],
  'pdf-graphic': [
    {
      id: 'Book',
      name: 'Book',
      description: 'Multi-chapter long-form handbook, training workbook, or guide with structured layout & typography.',
      animatorRatioPercent: 0,
      developerRatioPercent: 100,
      baselineAnimMinutes: 0,
      baselineDevMinutes: 60,
      effortMultiplier: 1.2
    },
    {
      id: 'Brochure',
      name: 'Brochure',
      description: 'High-impact 2-4 page promotional brochure, flyer, or executive summary with bespoke graphic design.',
      animatorRatioPercent: 0,
      developerRatioPercent: 100,
      baselineAnimMinutes: 0,
      baselineDevMinutes: 60,
      effortMultiplier: 0.8
    },
    {
      id: 'Custom designed',
      name: 'Custom designed',
      description: 'Bespoke infographics, custom vector illustrations, diagrams, and branded graphic layouts.',
      animatorRatioPercent: 0,
      developerRatioPercent: 100,
      baselineAnimMinutes: 0,
      baselineDevMinutes: 60,
      effortMultiplier: 1.1
    },
    {
      id: 'Interactive PDF',
      name: 'Interactive PDF',
      description: 'Fillable PDF form fields, interactive bookmarks, clickable TOC, hyperlinks, and digital accessibility.',
      animatorRatioPercent: 0,
      developerRatioPercent: 100,
      baselineAnimMinutes: 0,
      baselineDevMinutes: 60,
      effortMultiplier: 1.0
    }
  ]
};

export const DEFAULT_COMPLEXITY_CONFIG = {
  hoursPerWorkingDay: 7, // 7 working hours per day

  // Production Rates (Hours required per minute of course output)
  rates: {
    idRateHoursPerMin: 0.4,
    idReviewHoursPerMin: 0.15,
    animatorHoursPerMin: 3.5,
    developerHoursPerMin: 7 / 3,
    qaHoursPerMin: 72 / (60 * 1.3),
    visualDesignHoursPerMin: 0.2
  },

  projectTypeComplexities: PROJECT_TYPE_COMPLEXITIES,

  complexityRatios: {
    Low: {
      name: 'Low Complexity / Level 1',
      animatorRatioPercent: 0,
      developerRatioPercent: 100,
      baselineAnimMinutes: 0,
      baselineDevMinutes: 60,
      description: 'Standard template-driven course, 100% developer authored with no custom motion animation.'
    },
    Medium: {
      name: 'Medium Complexity / Level 2',
      animatorRatioPercent: (10 / 60) * 100,
      developerRatioPercent: (50 / 60) * 100,
      baselineAnimMinutes: 10,
      baselineDevMinutes: 50,
      effortMultiplier: 1.0,
      description: 'Balanced interactive course with ~10 mins of custom 2D animations per 60 mins of content.'
    },
    'Medium-Plus': {
      name: 'Medium-Plus Complexity / Level 2.5',
      animatorRatioPercent: (20 / 60) * 100,
      developerRatioPercent: (40 / 60) * 100,
      baselineAnimMinutes: 20,
      baselineDevMinutes: 40,
      effortMultiplier: 1.15,
      description: 'Enhanced interactive branching with ~20 mins 2D motion animation per 60 mins of content.'
    },
    'Level 2.5': {
      name: 'Level 2.5',
      animatorRatioPercent: (20 / 60) * 100,
      developerRatioPercent: (40 / 60) * 100,
      baselineAnimMinutes: 20,
      baselineDevMinutes: 40,
      effortMultiplier: 1.15,
      description: 'Enhanced interactive branching with ~20 mins 2D motion animation per 60 mins of content.'
    },
    High: {
      name: 'High Complexity / Level 3',
      animatorRatioPercent: 50,
      developerRatioPercent: 50,
      baselineAnimMinutes: 30,
      baselineDevMinutes: 30,
      description: 'Rich multimedia course with 50% custom animation scenarios and 50% interactive development.'
    },
    Extreme: {
      name: 'Extreme Complexity / Level 4',
      animatorRatioPercent: (50 / 60) * 100,
      developerRatioPercent: (10 / 60) * 100,
      baselineAnimMinutes: 50,
      baselineDevMinutes: 10,
      description: 'Heavy animation-led experience with ~50 mins of custom 2D motion animation per 60 mins of content.'
    }
  }
};
