/**
 * defaultTemplates.js
 * Configurable eLearning project workflow templates.
 * Contains the 4 core project types:
 * 1. Storyline 360 Course
 * 2. Rise 360 Course
 * 3. MP4 Video Output
 * 4. PDF/Graphic Output
 */

export const DEFAULT_TEMPLATES = [
  {
    id: 'storyline-360',
    name: 'Storyline 360 Course',
    description: 'Custom interactive eLearning with branching, animations, and custom interactions in Articulate Storyline 360.',
    icon: 'film',
    phases: [
      {
        id: 'phase-initiation',
        name: 'Phase 1 — Project Initiation & Requirements Audit',
        isModuleLevel: false,
        tasks: [
          { id: 'task-kickoff', name: 'Project Kickoff & Alignment', role: 'Project Manager', defaultHours: 7, dependsOn: [] },
          { id: 'task-req-analysis', name: 'Requirement Analysis & Content Ingestion', role: 'Instructional Designer', defaultHours: 14, dependsOn: ['task-kickoff'] }
        ]
      },
      {
        id: 'phase-instructional-design',
        name: 'Phase 2 — Script Development & Instructional Storyboard',
        isModuleLevel: true,
        tasks: [
          { id: 'task-script-dev', name: 'Script Development & Content Outlining', role: 'Instructional Designer', defaultHours: 7, dependsOn: ['task-req-analysis'] },
          { id: 'task-storyboard-dev', name: 'Storyboard Development: Screen-by-Screen', role: 'Instructional Designer', dynamicRole: 'ID', rateKey: 'idStoryboard', dependsOn: ['task-script-dev'] },
          { id: 'task-internal-sb', name: 'Internal Storyboard Review & Polish', role: 'Instructional Designer', defaultHours: 3.5, dependsOn: ['task-storyboard-dev'] },
          { id: 'task-client-sb', name: 'Client Storyboard Review Cycle', role: 'Client Stakeholder', isClientTask: true, defaultHours: 0, defaultDays: 2, dependsOn: ['task-internal-sb'] },
          { id: 'task-sb-revisions', name: 'Storyboard Revisions & Freeze Sign-off', role: 'Instructional Designer', defaultHours: 7, dependsOn: ['task-client-sb'] }
        ]
      },
      {
        id: 'phase-visual-design',
        name: 'Phase 3 — Visual Design & Asset Creation',
        isModuleLevel: true,
        tasks: [
          { id: 'task-ui-assets', name: 'Custom UI Graphics & Character Development', role: 'Visual Designer', defaultHours: 14, dependsOn: ['task-sb-revisions'] },
          { id: 'task-client-asset-approval', name: 'Client Approval on Visual Assets & Media', role: 'Client Stakeholder', isClientTask: true, defaultHours: 0, defaultDays: 2, dependsOn: ['task-ui-assets'] },
          { id: 'task-audio-vo', name: 'Voiceover Studio Recording in case HVO or AI VO & Clean Delivery', role: 'Voiceover Artist', isExternalIfNoVO: true, defaultHours: 0, defaultDays: 2, dependsOn: ['task-sb-revisions'] }
        ]
      },
      {
        id: 'phase-development',
        name: 'Phase 4 — Development, Animation & Conditional HLD Gate',
        isModuleLevel: true,
        tasks: [
          { id: 'task-hld-concept', name: 'High-Level Design (HLD) Concept Slide', role: 'Course Developer', isConditional: true, conditionalKey: 'includeHld', defaultHours: 7, dependsOn: ['task-client-asset-approval'] },
          { id: 'task-client-hld', name: 'Client HLD Sign-off / CS HLD', role: 'Client Stakeholder', isClientTask: true, isConditional: true, conditionalKey: 'includeHld', defaultHours: 0, defaultDays: 1, dependsOn: ['task-hld-concept'] },
          { id: 'task-2d-anim', name: 'Animation & Visual FX', role: 'Animator', dynamicRole: 'ANIMATOR', rateKey: 'animatorRate', dependsOn: ['task-client-asset-approval'] },
          { id: 'task-storyline-dev', name: 'Storyline Interactive Slide Programming', role: 'Course Developer', dynamicRole: 'DEVELOPER', rateKey: 'developerRate', dependsOn: ['task-client-asset-approval'] },
          { id: 'task-integration', name: 'Internal Media Integration & Alpha Build', role: 'Course Developer', defaultHours: 7, dependsOn: ['task-2d-anim', 'task-storyline-dev'] }
        ]
      },
      {
        id: 'phase-qa',
        name: 'Phase 5 — Quality Assurance & Multi-Device Testing',
        isModuleLevel: true,
        tasks: [
          { id: 'task-func-qa', name: 'Functional, SCORM & a11y QA', role: 'QA Specialist', dynamicRole: 'QA', rateKey: 'qaRate', dependsOn: ['task-integration'] },
          { id: 'task-qa-fixes', name: 'Developer Bug Fixes & Refinements', role: 'Course Developer', defaultHours: 7, dependsOn: ['task-func-qa'] },
          { id: 'task-qa-signoff', name: 'Beta Build QA Sign-off', role: 'QA Specialist', defaultHours: 3.5, dependsOn: ['task-qa-fixes'] }
        ]
      },
      {
        id: 'phase-client-review',
        name: 'Phase 6 — Client Review & Feedback Implementation',
        isModuleLevel: true,
        tasks: [
          { id: 'task-client-beta', name: 'Client Beta Review on Review 360 / Staging LMS', role: 'Client Stakeholder', isClientTask: true, defaultHours: 0, defaultDays: 2, dependsOn: ['task-qa-signoff'] },
          { id: 'task-feedback-fixes', name: 'Client Feedback Implementation & Polish', role: 'Course Developer', defaultHours: 7, dependsOn: ['task-client-beta'] },
          { id: 'task-gold-approval', name: 'Client Gold Master Sign-off', role: 'Client Stakeholder', isClientTask: true, defaultHours: 0, defaultDays: 1, dependsOn: ['task-feedback-fixes'] }
        ]
      },
      {
        id: 'phase-delivery',
        name: 'Phase 7 — LMS Delivery, Staging & Project Closure',
        isModuleLevel: false,
        tasks: [
          { id: 'task-scorm-packaging', name: 'LMS SCORM 1.2 / 2004 / xAPI Final Package Export', role: 'Course Developer', defaultHours: 7, dependsOn: ['task-gold-approval'] },
          { id: 'task-lms-validation', name: 'LMS Staging Validation & Sanity Verification', role: 'QA Specialist', defaultHours: 7, dependsOn: ['task-scorm-packaging'] },
          { id: 'task-final-handover', name: 'Final Source Files (.story) & Asset Handover', role: 'Project Manager', defaultHours: 3.5, dependsOn: ['task-lms-validation'] },
          { id: 'task-project-closure', name: 'Formal Project Retrospective & Contract Closure', role: 'Project Manager', defaultHours: 3.5, dependsOn: ['task-final-handover'] }
        ]
      }
    ]
  },
  {
    id: 'rise-360',
    name: 'Rise 360 Course',
    description: 'Responsive, fast-turnaround microlearning courses built with Articulate Rise 360 and custom media.',
    icon: 'smartphone',
    phases: [
      {
        id: 'phase-initiation',
        name: 'Phase 1 — Project Initiation & Outline',
        isModuleLevel: false,
        tasks: [
          { id: 'task-kickoff', name: 'Project Kickoff & Scope Definition', role: 'Project Manager', defaultHours: 7, dependsOn: [] },
          { id: 'task-curriculum-outline', name: 'Curriculum Outline & Block Architecture', role: 'Instructional Designer', defaultHours: 14, dependsOn: ['task-kickoff'] }
        ]
      },
      {
        id: 'phase-instructional-design',
        name: 'Phase 2 — Content Curation & Authoring',
        isModuleLevel: true,
        tasks: [
          { id: 'task-content-authoring', name: 'Content Draft & Knowledge Check Questions', role: 'Instructional Designer', dynamicRole: 'ID', rateKey: 'idStoryboard', dependsOn: ['task-curriculum-outline'] },
          { id: 'task-client-content-approval', name: 'Client Content Review & Approval', role: 'Client Stakeholder', isClientTask: true, defaultHours: 0, defaultDays: 2, dependsOn: ['task-content-authoring'] }
        ]
      },
      {
        id: 'phase-development',
        name: 'Phase 3 — Rise 360 Development & Media',
        isModuleLevel: true,
        tasks: [
          { id: 'task-media-creation', name: 'Graphic Banners, Infographics & Micro-media', role: 'Visual Designer', defaultHours: 7, dependsOn: ['task-client-content-approval'] },
          { id: 'task-rise-block-dev', name: 'Rise 360 Interactive Block Assembly', role: 'Course Developer', dynamicRole: 'DEVELOPER', rateKey: 'developerRate', dependsOn: ['task-media-creation'] }
        ]
      },
      {
        id: 'phase-qa-delivery',
        name: 'Phase 4 — QA, Client Review & Delivery',
        isModuleLevel: true,
        tasks: [
          { id: 'task-cross-device-qa', name: 'Cross-Device & Mobile Responsiveness QA', role: 'QA Specialist', dynamicRole: 'QA', rateKey: 'qaRate', dependsOn: ['task-rise-block-dev'] },
          { id: 'task-client-review-pkg', name: 'Client Review on Review 360', role: 'Client Stakeholder', isClientTask: true, defaultHours: 0, defaultDays: 2, dependsOn: ['task-cross-device-qa'] },
          { id: 'task-client-fixes', name: 'Client Feedback Implementation & Polish', role: 'Course Developer', defaultHours: 7, dependsOn: ['task-client-review-pkg'] },
          { id: 'task-final-publish', name: 'SCORM Export & LMS Deployment', role: 'Course Developer', defaultHours: 3.5, dependsOn: ['task-client-fixes'] }
        ]
      }
    ]
  },
  {
    id: 'mp4-video',
    name: 'MP4 Video Output',
    description: 'High-engagement explainer videos, motion graphics, and edited video modules delivered as high-res MP4.',
    icon: 'video',
    phases: [
      {
        id: 'phase-concept-script',
        name: 'Phase 1 — Concept & Scriptwriting',
        isModuleLevel: false,
        tasks: [
          { id: 'task-creative-brief', name: 'Creative Brief & Style Direction', role: 'Project Manager', defaultHours: 7, dependsOn: [] },
          { id: 'task-script-dev', name: 'Scriptwriting & Narrative Flow', role: 'Instructional Designer', dynamicRole: 'ID', rateKey: 'idStoryboard', dependsOn: ['task-creative-brief'] },
          { id: 'task-script-approval', name: 'Client Script Approval & Table Read', role: 'Client Stakeholder', isClientTask: true, defaultHours: 0, defaultDays: 2, dependsOn: ['task-script-dev'] }
        ]
      },
      {
        id: 'phase-audio-storyboard',
        name: 'Phase 2 — Audio & Visual Storyboarding',
        isModuleLevel: true,
        tasks: [
          { id: 'task-vo-record', name: 'Voiceover Talent Recording & Mastering', role: 'Voiceover Artist', isExternalIfNoVO: true, defaultHours: 0, defaultDays: 2, dependsOn: ['task-script-approval'] },
          { id: 'task-visual-sb', name: 'Illustrated Scene Storyboard & Style Frames', role: 'Visual Designer', defaultHours: 14, dependsOn: ['task-vo-record'] }
        ]
      },
      {
        id: 'phase-animation-production',
        name: 'Phase 3 — Video Editing & Motion Production',
        isModuleLevel: true,
        tasks: [
          { id: 'task-scene-animation', name: 'Scene Animation & Motion Rigging', role: 'Animator', dynamicRole: 'ANIMATOR', rateKey: 'animatorRate', dependsOn: ['task-visual-sb'] },
          { id: 'task-sound-sfx', name: 'Sound FX & Background Score Mixing', role: 'Animator', defaultHours: 7, dependsOn: ['task-scene-animation'] }
        ]
      },
      {
        id: 'phase-review-render',
        name: 'Phase 4 — Review & Final Render',
        isModuleLevel: true,
        tasks: [
          { id: 'task-video-qa', name: 'Internal Timing, Audio & Subtitles QA', role: 'QA Specialist', defaultHours: 7, dependsOn: ['task-sound-sfx'] },
          { id: 'task-client-video-approval', name: 'Client Video Review & Final Cut Approval', role: 'Client Stakeholder', isClientTask: true, defaultHours: 0, defaultDays: 2, dependsOn: ['task-video-qa'] },
          { id: 'task-mp4-delivery', name: 'High-Res MP4 Video Delivery with Captions', role: 'Animator', defaultHours: 3.5, dependsOn: ['task-client-video-approval'] }
        ]
      }
    ]
  },
  {
    id: 'pdf-graphic',
    name: 'PDF/Graphic Output',
    description: 'Professional visual design, books, brochures, custom infographics, and interactive PDF publications.',
    icon: 'file-text',
    phases: [
      {
        id: 'phase-content-structure',
        name: 'Phase 1 — Discovery & Content Structuring',
        isModuleLevel: false,
        tasks: [
          { id: 'task-pdf-brief', name: 'Creative Brief & Layout Specification', role: 'Project Manager', defaultHours: 7, dependsOn: [] },
          { id: 'task-pdf-outline', name: 'Content Outline & Copy Editing', role: 'Instructional Designer', dynamicRole: 'ID', rateKey: 'idStoryboard', dependsOn: ['task-pdf-brief'] },
          { id: 'task-pdf-concept-approval', name: 'Blueprint & Layout Structure Sign-off', role: 'Client Stakeholder', isClientTask: true, defaultHours: 0, defaultDays: 2, dependsOn: ['task-pdf-outline'] }
        ]
      },
      {
        id: 'phase-layout-design',
        name: 'Phase 2 — Layout Design & Creative Typesetting',
        isModuleLevel: true,
        tasks: [
          { id: 'task-pdf-master-template', name: 'Master Template & Grid Layout Design', role: 'Visual Designer', defaultHours: 14, dependsOn: ['task-pdf-concept-approval'] },
          { id: 'task-pdf-infographics', name: 'Bespoke Graphic Assets & Infographics', role: 'Visual Designer', defaultHours: 14, dependsOn: ['task-pdf-master-template'] },
          { id: 'task-pdf-typesetting', name: 'Full Document Page Typesetting', role: 'Course Developer', dynamicRole: 'DEVELOPER', rateKey: 'developerRate', dependsOn: ['task-pdf-infographics'] }
        ]
      },
      {
        id: 'phase-interactivity-qa',
        name: 'Phase 3 — Review & Interactivity Integration',
        isModuleLevel: true,
        tasks: [
          { id: 'task-pdf-interactivity', name: 'Interactive Bookmarks & Form Controls', role: 'Course Developer', defaultHours: 7, dependsOn: ['task-pdf-typesetting'] },
          { id: 'task-pdf-qa', name: 'Internal Layout & Typography QA', role: 'QA Specialist', dynamicRole: 'QA', rateKey: 'qaRate', dependsOn: ['task-pdf-interactivity'] },
          { id: 'task-pdf-client-review', name: 'Client Review & Feedback', role: 'Client Stakeholder', isClientTask: true, defaultHours: 0, defaultDays: 2, dependsOn: ['task-pdf-qa'] }
        ]
      },
      {
        id: 'phase-pdf-delivery',
        name: 'Phase 4 — Final Sign-off & Production Delivery',
        isModuleLevel: false,
        tasks: [
          { id: 'task-pdf-preflight', name: 'Pre-flight Print & Digital PDF Compliance', role: 'QA Specialist', defaultHours: 7, dependsOn: ['task-pdf-client-review'] },
          { id: 'task-pdf-final-delivery', name: 'High-Res Interactive PDF & Source Assets Delivery', role: 'Project Manager', defaultHours: 3.5, dependsOn: ['task-pdf-preflight'] }
        ]
      }
    ]
  }
];
