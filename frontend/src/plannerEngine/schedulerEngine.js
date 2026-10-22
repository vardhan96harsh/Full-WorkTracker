/**
 * schedulerEngine.js
 * Advanced Multi-Resource Capacity & Dependency Scheduling Engine for eLearning Projects.
 * Scales task duration and throughput dynamically based on the number and capacity of assigned team members,
 * supporting multi-assignee task distribution, pipelining, working-day calendar logic, and manual overrides.
 */

import { CalendarEngine } from './calendarEngine.js';
import { EstimationEngine } from './estimationEngine.js';
import { CriticalPathEngine } from './criticalPathEngine.js';
import { DEFAULT_COMPLEXITY_CONFIG } from './complexityConfig.js';
import { DEFAULT_TEMPLATES } from './defaultTemplates.js';

export class SchedulerEngine {
  /**
   * Generates a complete project schedule from project parameters.
   */
  static generateSchedule({
    projectId = 'proj-1',
    projectName = 'eLearning Courseware',
    clientName = 'Enterprise Client',
    projectType = 'storyline-360',
    startPhaseId = null,
    complexity = 'Medium',
    courseLengthMinutes = 60,
    moduleCount = 4,
    startDate = null,
    projectManager = null,
    assignedTeam = [],
    holidays = [],
    customTemplate = null,
    complexityConfig = DEFAULT_COMPLEXITY_CONFIG,
    manualOverrides = {},
    existingTasks = [],
    includeHld = false
  }) {
    const hoursPerDay = complexityConfig.hoursPerWorkingDay || 7;
    const template = customTemplate || DEFAULT_TEMPLATES.find(t => t.id === projectType) || DEFAULT_TEMPLATES[0];

    // Determine Starting Phase Index (Robust matching for ID, name, number, or keyword)
    let startPhaseIdx = 0;
    if (startPhaseId !== null && startPhaseId !== undefined && startPhaseId !== '') {
      const targetStr = String(startPhaseId).trim().toLowerCase();

      // 1. Exact ID or Name match (case-insensitive)
      let foundIdx = template.phases.findIndex(p =>
        (p.id && p.id.toLowerCase() === targetStr) ||
        (p.name && p.name.toLowerCase() === targetStr)
      );

      // 2. Numeric / phase number matching: e.g. "phase-4", "phase 4", "4", "phase-3"
      if (foundIdx < 0) {
        const numMatch = targetStr.match(/(?:phase[-_\s]*)?(\d+)/i);
        if (numMatch) {
          const phaseNum = parseInt(numMatch[1], 10);
          if (phaseNum >= 1 && phaseNum <= template.phases.length) {
            foundIdx = phaseNum - 1;
          }
        }
      }

      // 3. Keyword / partial matching across phase name or ID
      if (foundIdx < 0) {
        foundIdx = template.phases.findIndex(p => {
          const pId = (p.id || '').toLowerCase();
          const pName = (p.name || '').toLowerCase();
          if (targetStr.includes('dev') || targetStr.includes('anim')) {
            return pId.includes('dev') || pName.includes('dev') || pId.includes('anim');
          }
          if (targetStr.includes('visual') || targetStr.includes('design') || targetStr.includes('asset') || targetStr.includes('layout')) {
            return pId.includes('visual') || pName.includes('visual') || pId.includes('layout');
          }
          if (targetStr.includes('qa') || targetStr.includes('test')) {
            return pId.includes('qa') || pName.includes('qa');
          }
          if (targetStr.includes('storyboard') || targetStr.includes('instruction') || targetStr.includes('script') || targetStr.includes('content') || targetStr.includes('audio')) {
            return pId.includes('instruction') || pId.includes('script') || pName.includes('instruction') || pName.includes('content') || pId.includes('audio');
          }
          if (targetStr.includes('review') || targetStr.includes('client')) {
            return pId.includes('client') || pId.includes('review') || pName.includes('review');
          }
          if (targetStr.includes('delivery') || targetStr.includes('closure') || targetStr.includes('render') || targetStr.includes('publish')) {
            return pId.includes('delivery') || pId.includes('closure') || pName.includes('delivery');
          }
          return pId.includes(targetStr) || pName.includes(targetStr) || targetStr.includes(pId);
        });
      }

      if (foundIdx >= 0) {
        startPhaseIdx = Math.min(foundIdx, template.phases.length - 1);
      }
    }
    const effectiveTemplatePhases = template.phases.slice(startPhaseIdx);
    const activeStartPhase = template.phases[startPhaseIdx] || template.phases[0];

    // Compute hour/minute breakdown
    const estimation = EstimationEngine.calculateBreakdown({
      projectType,
      courseLengthMinutes,
      moduleCount,
      complexity,
      complexityConfig
    });

    const initialDate = startDate || CalendarEngine.toISODate(new Date());
    const parsedStartDate = CalendarEngine.ensureWorkingDay(initialDate, holidays);
    const startIso = CalendarEngine.toISODate(parsedStartDate);

    // Robust Role Category Normalization Helper (maps all variations: ANIM, MGD, DEV, ID, VD, QA, etc.)
    const normalizeRoleKey = (keyOrTitle) => {
      if (!keyOrTitle) return 'DEVELOPER';
      const str = String(keyOrTitle).toUpperCase().trim();
      if (str === 'ANIM' || str === 'ANIMATOR' || str === 'MGD' || str === 'MOTION_GRAPHICS' || str.includes('ANIM') || str.includes('MOTION') || str.includes('VIDEO')) return 'ANIMATOR';
      if (str === 'ID' || str === 'INSTRUCTIONAL_DESIGNER' || str.includes('INSTRUCTION') || str.includes('STORYBOARD') || str.includes('CONTENT') || str.includes('SCRIPT')) return 'ID';
      if (str === 'DEV' || str === 'DEVELOPER' || str.includes('DEVELOP') || str.includes('STORYLINE') || str.includes('RISE') || str.includes('TYPESET') || str.includes('AUTHOR') || str.includes('INTERACTIVE') || str.includes('INTEGRATION') || str.includes('SCORM') || str.includes('PACKAGING') || str.includes('FIX')) return 'DEVELOPER';
      if (str === 'VD' || str === 'DESIGNER' || str.includes('DESIGN') || str.includes('GRAPHIC') || str.includes('UI') || str.includes('VISUAL') || str.includes('ASSET') || str.includes('INFOGRAPHIC')) return 'DESIGNER';
      if (str === 'QA' || str.includes('QA') || str.includes('TEST') || str.includes('VALIDAT') || str.includes('QUALITY') || str.includes('ACCESSIB') || str.includes('PREFLIGHT')) return 'QA';
      if (str === 'VO' || str.includes('VOICE') || str.includes('AUDIO') || str.includes('NARRAT')) return 'VO';
      if (str === 'PM' || str.includes('PM') || str.includes('MANAGER') || str.includes('KICKOFF') || str.includes('APPROVAL') || str.includes('HANDOVER') || str.includes('CLOSURE') || str.includes('BRIEF')) return 'PM';
      return 'DEVELOPER';
    };

    // Group assigned team by normalized role category
    const resourcesByRole = {
      PM: [],
      ID: [],
      DEVELOPER: [],
      ANIMATOR: [],
      DESIGNER: [],
      QA: [],
      VO: []
    };

    assignedTeam.forEach(member => {
      const normCat = normalizeRoleKey(member.roleCategory || member.designation);
      if (resourcesByRole[normCat]) {
        const mId = member.id || member._id || member.user;
        const normalizedMember = {
          ...member,
          id: mId ? String(mId) : "unknown",
          _id: mId ? String(mId) : "unknown",
          user: mId ? String(mId) : "unknown",
          name: member.name || "Team Member",
          avatar: member.avatar || (member.name ? member.name.charAt(0).toUpperCase() : "?")
        };
        resourcesByRole[normCat].push(normalizedMember);
      }
    });

    // Helper to get all assigned resources and combined daily capacity for a role category
    const getRoleCapacityAndResources = (roleKey, isClientTask = false, isExternalVO = false) => {
      if (isClientTask) {
        return {
          resources: [],
          primaryResource: { id: 'client', name: 'Client Reviewers', avatar: 'C', roleCategory: 'CLIENT', count: 0, dailyCapacity: 0 },
          dailyCapacity: 0,
          count: 0,
          isExternal: true
        };
      }

      const normRole = normalizeRoleKey(roleKey);
      let pool = resourcesByRole[normRole] || [];

      if (isExternalVO && pool.length === 0) {
        return {
          resources: [],
          primaryResource: { id: 'external-vo', name: 'External Voice Talent / Studio', avatar: 'VO', roleCategory: 'VO', count: 0, dailyCapacity: 0 },
          dailyCapacity: 0,
          count: 0,
          isExternal: true
        };
      }

      if (pool.length === 0) {
        if (normRole === 'PM' && projectManager) {
          const pmHours = Number(projectManager.dailyHours) || hoursPerDay;
          return {
            resources: [projectManager],
            primaryResource: projectManager,
            dailyCapacity: pmHours,
            count: 1
          };
        }
        // If NO one is assigned from our team squad for this role, return count: 0 and resources: []
        // There should be 0 allocated hours!
        return {
          resources: [],
          primaryResource: { id: 'unassigned', name: 'Unassigned', avatar: '—', roleCategory: normRole, count: 0, dailyCapacity: 0 },
          dailyCapacity: 0,
          count: 0
        };
      }

      const totalDailyCapacity = pool.reduce((sum, m) => sum + (Number(m.dailyHours) || hoursPerDay), 0);
      
      if (pool.length === 1) {
        return {
          resources: pool,
          primaryResource: pool[0],
          dailyCapacity: totalDailyCapacity,
          count: 1
        };
      }

      // Multiple resources assigned: create composite summary object with all members
      const composite = {
        id: pool.map(m => m.id).join('_'),
        name: pool.map(m => m.name).join(', '),
        avatar: pool.map(m => m.avatar).join('+'),
        roleCategory: normRole,
        count: pool.length,
        dailyCapacity: totalDailyCapacity,
        isMultiAssignee: true,
        members: pool
      };

      return {
        resources: pool,
        primaryResource: composite,
        dailyCapacity: totalDailyCapacity,
        count: pool.length
      };
    };

    // 1. Generate Raw Task Structure (Project-level + Module-level tasks)
    const rawTasks = [];
    const phases = [];

    let lastProjectLevelPhase1Id = null;

    effectiveTemplatePhases.forEach((tplPhase) => {
      const originalPhaseIdx = template.phases.findIndex(p => p.id === tplPhase.id);
      const phaseNum = (originalPhaseIdx !== -1 ? originalPhaseIdx : 0) + 1;
      const phaseId = `phase-${phaseNum}`;
      const phaseTasks = [];

      if (!tplPhase.isModuleLevel) {
        // Project-Level Phase (e.g. Initiation & Requirements Audit, Delivery)
        tplPhase.tasks.forEach((tDef) => {
          const taskId = `${phaseId}-${tDef.id}`;
          const isClientTask = Boolean(tDef.isClientTask || tDef.role === 'Client Stakeholder' || (tDef.name.toLowerCase().includes('client') && (tDef.name.toLowerCase().includes('approval') || tDef.name.toLowerCase().includes('review') || tDef.name.toLowerCase().includes('sign-off'))));
          const isExternalVO = Boolean(tDef.isExternalIfNoVO || tDef.role.toLowerCase().includes('voiceover') || tDef.id.includes('vo'));
          const isApproval = tDef.id.includes('approval') || tDef.id.includes('closure') || tDef.id.includes('handover');
          
          let roleKey = 'PM';
          if (isClientTask) roleKey = 'CLIENT';
          else if (tDef.role.includes('Instructional')) roleKey = 'ID';
          else if (tDef.role.includes('Developer')) roleKey = 'DEVELOPER';
          else if (tDef.role.includes('QA')) roleKey = 'QA';
          else if (tDef.role.includes('Visual')) roleKey = 'DESIGNER';
          else if (tDef.role.includes('Voiceover')) roleKey = 'VO';

          const { resources, primaryResource, dailyCapacity, count, isExternal } = getRoleCapacityAndResources(roleKey, isClientTask, isExternalVO);

          let taskHours = tDef.defaultHours !== undefined ? tDef.defaultHours : hoursPerDay;
          if (isClientTask || (isExternalVO && count === 0)) {
            taskHours = 0; // Zero internal team effort for client reviews and external audio recording!
          } else if (tDef.id === 'task-hld-concept') {
            taskHours = Math.max(hoursPerDay, estimation.hours.totalIdHours * 0.2); // 20% of ID hours for HLD
          }

          // Calculate working days duration:
          let durationDays = 0;
          if (isClientTask || (isExternalVO && count === 0)) {
            durationDays = tDef.defaultDays || 2;
          } else if (taskHours > 0) {
            const cap = dailyCapacity > 0 ? dailyCapacity : hoursPerDay;
            durationDays = Math.max(1, Math.ceil(taskHours / cap));
          }

          const existingMatch = existingTasks.find(
            (et) => (et.id && et.id === taskId) || (et.name && et.name.trim().toLowerCase() === tDef.name.trim().toLowerCase())
          );

          const rawTask = {
            id: taskId,
            phaseId,
            phaseName: tplPhase.name,
            isModuleLevel: false,
            moduleNumber: null,
            name: tDef.name,
            roleCategory: roleKey,
            roleTitle: isClientTask ? 'Client Stakeholder Review' : (isExternalVO && count === 0 ? 'External Audio / VO' : tDef.role),
            assignedResource: primaryResource,
            assignedResources: resources,
            resourceCount: count,
            dailyCapacity,
            hours: Number(taskHours.toFixed(1)),
            durationWorkingDays: durationDays,
            isExternal: Boolean(isExternal || isClientTask || (isExternalVO && count === 0)),
            dependsOn: [...tDef.dependsOn.map(dId => `${phaseId}-${dId}`)],
            dependencies: [...tDef.dependsOn.map(dId => `${phaseId}-${dId}`)],
            status: existingMatch?.status || 'Not Started',
            actualUsedHours: existingMatch?.actualUsedHours || 0,
            priority: isApproval ? 'High' : 'Medium'
          };

          if (originalPhaseIdx === 0 || tDef.id === 'task-req-analysis' || tDef.id === 'task-hld-approval' || tDef.id === 'task-curriculum-outline' || tDef.id === 'task-script-approval' || tDef.id === 'task-pdf-concept-approval') {
            lastProjectLevelPhase1Id = taskId;
          }

          rawTasks.push(rawTask);
          phaseTasks.push(rawTask);
        });

        phases.push({
          id: phaseId,
          name: tplPhase.name,
          isModuleLevel: false,
          taskIds: phaseTasks.map(t => t.id)
        });

      } else {
        // Module-Level Phase (e.g. ID, Visual Design, Dev & Animation, QA, Client Review)
        for (let m = 1; m <= moduleCount; m++) {
          const modulePhaseId = `${phaseId}-mod-${m}`;
          const modulePhaseName = `${tplPhase.name} (Module ${m})`;
          const modPhaseTasks = [];

          tplPhase.tasks.forEach((tDef) => {
            // If conditional HLD task and HLD is disabled, skip generating
            if (tDef.conditionalKey === 'includeHld' && !includeHld) {
              return;
            }

            const taskId = `mod-${m}-${tDef.id}`;
            const isClientTask = Boolean(tDef.isClientTask || tDef.role === 'Client Stakeholder' || (tDef.name.toLowerCase().includes('client') && (tDef.name.toLowerCase().includes('review') || tDef.name.toLowerCase().includes('approval') || tDef.name.toLowerCase().includes('sign-off'))));
            const isExternalVO = Boolean(tDef.isExternalIfNoVO || tDef.role.toLowerCase().includes('voiceover') || tDef.id.includes('vo') || tDef.id.includes('audio'));

            let roleKey = tDef.dynamicRole || 'DEVELOPER';
            if (isClientTask) {
              roleKey = 'CLIENT';
            } else if (!tDef.dynamicRole) {
              if (tDef.role.includes('Instructional')) roleKey = 'ID';
              else if (tDef.role.includes('Animator')) roleKey = 'ANIMATOR';
              else if (tDef.role.includes('Developer')) roleKey = 'DEVELOPER';
              else if (tDef.role.includes('Visual')) roleKey = 'DESIGNER';
              else if (tDef.role.includes('Voiceover')) roleKey = 'VO';
              else if (tDef.role.includes('QA')) roleKey = 'QA';
              else roleKey = 'PM';
            }

            const { resources, primaryResource, dailyCapacity, count, isExternal } = getRoleCapacityAndResources(roleKey, isClientTask, isExternalVO);

            // Calculate task hours based on dynamic rate key or default
            let taskHours = tDef.defaultHours !== undefined ? tDef.defaultHours : hoursPerDay;
            if (isClientTask || (isExternalVO && count === 0)) {
              taskHours = 0; // Zero internal team effort for client reviews and external audio recording!
            } else if (tDef.rateKey === 'idStoryboard') {
              taskHours = Math.max(3.5, estimation.hours.perModule.idHours * 0.7); // 70% of ID time on storyboard
            } else if (tDef.id === 'task-script-dev') {
              taskHours = Math.max(3.5, estimation.hours.perModule.idHours * 0.3); // 30% of ID time on script dev
            } else if (tDef.rateKey === 'idReview') {
              taskHours = Math.max(3.5, estimation.hours.perModule.idHours * 0.3);
            } else if (tDef.rateKey === 'animatorRate') {
              taskHours = estimation.hours.perModule.animatorHours;
            } else if (tDef.rateKey === 'developerRate') {
              taskHours = estimation.hours.perModule.developerHours;
            } else if (tDef.rateKey === 'qaRate') {
              taskHours = estimation.hours.perModule.qaHours;
            }

            let durationDays = 0;
            if (isClientTask || (isExternalVO && count === 0)) {
              durationDays = tDef.defaultDays || 2;
            } else if (taskHours > 0) {
              const cap = dailyCapacity > 0 ? dailyCapacity : hoursPerDay;
              durationDays = Math.max(1, Math.ceil(taskHours / cap));
            }

            // Map dependencies
            let effectiveDependsOnDefs = [...tDef.dependsOn];
            if (includeHld && (tDef.id === 'task-2d-anim' || tDef.id === 'task-storyline-dev')) {
              effectiveDependsOnDefs = ['task-client-hld'];
            } else if (!includeHld && (tDef.id === 'task-2d-anim' || tDef.id === 'task-storyline-dev')) {
              effectiveDependsOnDefs = ['task-client-asset-approval'];
            }

            const dependsOn = [];
            effectiveDependsOnDefs.forEach(depDefId => {
              if (depDefId === 'task-req-analysis' || depDefId === 'task-hld-approval' || depDefId === 'task-curriculum-outline' || depDefId === 'task-script-approval' || depDefId === 'task-pdf-concept-approval') {
                if (lastProjectLevelPhase1Id) {
                  dependsOn.push(lastProjectLevelPhase1Id);
                }
              } else {
                dependsOn.push(`mod-${m}-${depDefId}`);
              }
            });

            // Smart Pipelining Hook across consecutive modules:
            // 1. Script / Storyboard / Content Authoring Pipeline
            if ((tDef.id === 'task-script-dev' || tDef.id === 'task-storyboard-dev' || tDef.id === 'task-content-authoring' || tDef.id === 'task-pdf-outline') && m > 1) {
              dependsOn.push(`mod-${m - 1}-${tDef.id}`);
            }

            // 2. Development / Typesetting Pipeline
            if ((tDef.id === 'task-storyline-dev' || tDef.id === 'task-rise-block-dev' || tDef.id === 'task-pdf-typesetting') && m > 1) {
              dependsOn.push(`mod-${m - 1}-${tDef.id}`);
            }

            // 3. Animation & Motion Pipeline
            if ((tDef.id === 'task-2d-anim' || tDef.id === 'task-scene-animation' || tDef.id === 'task-motion-anim') && m > 1 && taskHours > 0) {
              dependsOn.push(`mod-${m - 1}-${tDef.id}`);
            }

            // 4. QA & Functional Testing Pipeline
            if ((tDef.id === 'task-func-qa' || tDef.id === 'task-cross-device-qa' || tDef.id === 'task-video-qa' || tDef.id === 'task-pdf-qa') && m > 1) {
              dependsOn.push(`mod-${m - 1}-${tDef.id}`);
            }

            const taskDisplayName = `Mod ${m}: ${tDef.name}`;
            const existingMatch = existingTasks.find(
              (et) => (et.id && et.id === taskId) || (et.name && et.name.trim().toLowerCase() === taskDisplayName.trim().toLowerCase())
            );

            const rawTask = {
              id: taskId,
              phaseId: modulePhaseId,
              phaseName: modulePhaseName,
              isModuleLevel: true,
              moduleNumber: m,
              name: taskDisplayName,
              roleCategory: roleKey,
              roleTitle: isClientTask ? 'Client Stakeholder Review' : (isExternalVO && count === 0 ? 'External Audio / VO' : tDef.role),
              assignedResource: primaryResource,
              assignedResources: resources,
              resourceCount: count,
              dailyCapacity,
              hours: Number(taskHours.toFixed(1)),
              durationWorkingDays: durationDays,
              isExternal: Boolean(isExternal || isClientTask || (isExternalVO && count === 0)),
              dependsOn,
              dependencies: dependsOn,
              status: existingMatch?.status || 'Not Started',
              actualUsedHours: existingMatch?.actualUsedHours || 0,
              priority: 'Medium'
            };

            rawTasks.push(rawTask);
            modPhaseTasks.push(rawTask);
          });

          phases.push({
            id: modulePhaseId,
            name: modulePhaseName,
            isModuleLevel: true,
            moduleNumber: m,
            taskIds: modPhaseTasks.map(t => t.id)
          });
        }
      }
    });

    // Clean all dependencies so tasks only reference tasks that actually exist in the plan
    const validTaskIds = new Set(rawTasks.map(t => t.id));
    rawTasks.forEach(task => {
      task.dependsOn = task.dependsOn.filter(depId => validTaskIds.has(depId));
    });

    // Connect Delivery Phase to each module's final client approval/completion task
    const deliveryPhase = phases.find(p => p.id.includes('delivery') || p.name.includes('Delivery') || p.name.includes('Closure'));
    if (deliveryPhase) {
      const finalTasksPerModule = [];
      for (let m = 1; m <= moduleCount; m++) {
        const modTasks = rawTasks.filter(t => t.moduleNumber === m);
        if (modTasks.length > 0) {
          const lastModTask = modTasks[modTasks.length - 1];
          finalTasksPerModule.push(lastModTask.id);
        }
      }
      const deliveryStartTask = rawTasks.find(t => t.phaseId === deliveryPhase.id);
      if (deliveryStartTask && finalTasksPerModule.length > 0) {
        deliveryStartTask.dependsOn = [...new Set([...deliveryStartTask.dependsOn, ...finalTasksPerModule])]
          .filter(depId => validTaskIds.has(depId));
      }
    }

    // 2. Schedule Task Dates using Forward-Pass Dependency Resolution
    const taskMap = new Map(rawTasks.map(t => [t.id, t]));
    const scheduledTasks = [];
    const completedTaskDates = new Map(); // taskId -> { startDate, endDate }

    // Helper to calculate start & end for a task
    const resolveTask = (taskId, visited = new Set()) => {
      if (completedTaskDates.has(taskId)) {
        return completedTaskDates.get(taskId);
      }

      if (visited.has(taskId)) {
        return { startDate: startIso, endDate: startIso };
      }
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task) return { startDate: startIso, endDate: startIso };

      // Apply overrides if any
      const override = manualOverrides[taskId] || {};
      const isManual = Boolean(manualOverrides[taskId]);

      const isClientOrExternal = Boolean(task.isExternal || task.roleCategory === 'CLIENT' || (task.roleTitle && task.roleTitle.toLowerCase().includes('client')));

      let finalDurationDays = override.durationWorkingDays !== undefined 
        ? Number(override.durationWorkingDays) 
        : task.durationWorkingDays;

      let finalHours = override.hours !== undefined ? Number(override.hours) : task.hours;
      if (isClientOrExternal && override.hours === undefined) {
        finalHours = 0;
      }

      let finalOwner = override.assignedResource || task.assignedResource;
      let finalStatus = override.status || task.status;
      let finalPriority = override.priority || task.priority;
      let finalName = override.name || task.name;

      if (finalDurationDays <= 0 && finalHours <= 0) {
        finalDurationDays = 0;
      }

      let taskStart = null;

      if (override.startDate) {
        taskStart = CalendarEngine.parseDate(override.startDate);
      } else {
        let latestPredEnd = null;

        task.dependsOn.forEach(predId => {
          const predDates = resolveTask(predId, new Set(visited));
          if (predDates && predDates.endDate) {
            const predEnd = CalendarEngine.parseDate(predDates.endDate);
            if (!latestPredEnd || predEnd > latestPredEnd) {
              latestPredEnd = predEnd;
            }
          }
        });

        if (latestPredEnd) {
          taskStart = CalendarEngine.getNextWorkingDay(latestPredEnd, holidays);
        } else {
          taskStart = parsedStartDate;
        }
      }

      taskStart = CalendarEngine.ensureWorkingDay(taskStart, holidays);

      // Calculate End Date
      let taskEnd;
      if (finalDurationDays <= 0) {
        taskEnd = taskStart;
      } else {
        taskEnd = CalendarEngine.calculateEndDate(taskStart, finalDurationDays, holidays);
      }

      // Determine active assigned resources and count
      let assignedResources = override.assignedResources;
      if (!assignedResources) {
        if (finalOwner && finalOwner.members && Array.isArray(finalOwner.members)) {
          assignedResources = finalOwner.members;
        } else if (finalOwner && finalOwner.id && finalOwner.id !== 'unassigned' && finalOwner.id !== 'client' && finalOwner.id !== 'external-vo') {
          assignedResources = [finalOwner];
        } else {
          assignedResources = task.assignedResources || [];
        }
      }

      let resCount = override.resourceCount !== undefined
        ? Number(override.resourceCount)
        : (assignedResources ? assignedResources.length : (task.resourceCount || 0));

      // If task is unassigned (resCount === 0), or is an external/client task, allocated hours MUST be 0!
      let allocatedHours = 0;
      if (resCount > 0 && finalHours > 0 && !task.isExternal && task.roleCategory !== 'CLIENT' && !isClientOrExternal) {
        allocatedHours = Number((finalDurationDays * resCount * 8).toFixed(1));
      }

      const estimatedHours = isClientOrExternal && override.hours === undefined ? 0 : Number(finalHours.toFixed(1));
      const actualUsedHours = (finalStatus === 'Completed' && !isClientOrExternal) ? estimatedHours : 0;

      const res = {
        ...task,
        name: finalName,
        startDate: CalendarEngine.toISODate(taskStart),
        endDate: CalendarEngine.toISODate(taskEnd),
        hours: finalHours,
        estimatedHours,
        allocatedHours,
        actualUsedHours,
        durationWorkingDays: finalDurationDays,
        assignedResource: finalOwner,
        assignedResources,
        resourceCount: resCount,
        dailyCapacity: override.dailyCapacity || (finalOwner && finalOwner.dailyCapacity ? finalOwner.dailyCapacity : task.dailyCapacity),
        status: finalStatus,
        priority: finalPriority,
        isManualOverride: isManual,
        overrideFields: override
      };

      completedTaskDates.set(taskId, { startDate: res.startDate, endDate: res.endDate });
      return res;
    };

    // Resolve all tasks
    rawTasks.forEach(t => {
      const scheduled = resolveTask(t.id);
      scheduledTasks.push(scheduled);
    });

    // 3. Run Critical Path Analysis
    const criticalAnalysis = CriticalPathEngine.analyze(scheduledTasks, holidays);
    const finalAnnotatedTasks = criticalAnalysis.tasks;

    // 4. Calculate Phase Start & End dates and Phase-Level Effort Totals
    const annotatedPhases = phases.map(p => {
      const pTasks = finalAnnotatedTasks.filter(t => p.taskIds.includes(t.id) && t.durationWorkingDays > 0);
      let pStart = null;
      let pEnd = null;

      pTasks.forEach(t => {
        const s = CalendarEngine.parseDate(t.startDate);
        const e = CalendarEngine.parseDate(t.endDate);
        if (!pStart || s < pStart) pStart = s;
        if (!pEnd || e > pEnd) pEnd = e;
      });

      const pEstimated = Number(pTasks.reduce((sum, t) => sum + (t.estimatedHours || t.hours || 0), 0).toFixed(1));
      const pAllocated = Number(pTasks.reduce((sum, t) => sum + (t.allocatedHours || 0), 0).toFixed(1));
      const pActualUsed = Number(pTasks.filter(t => t.status === 'Completed').reduce((sum, t) => sum + (t.actualUsedHours || t.hours || 0), 0).toFixed(1));
      const pCompletedCount = pTasks.filter(t => t.status === 'Completed').length;
      const pProgress = pTasks.length > 0 ? Math.round((pCompletedCount / pTasks.length) * 100) : 0;

      return {
        ...p,
        startDate: pStart ? CalendarEngine.toISODate(pStart) : startIso,
        endDate: pEnd ? CalendarEngine.toISODate(pEnd) : startIso,
        totalHours: pEstimated,
        estimatedHours: pEstimated,
        allocatedHours: pAllocated,
        actualUsedHours: pActualUsed,
        completedTaskCount: pCompletedCount,
        totalTaskCount: pTasks.length,
        progressPercent: pProgress,
        totalDays: pStart && pEnd ? CalendarEngine.countWorkingDays(pStart, pEnd, holidays) : 0
      };
    });

    // 5. Project overall stats
    let projStart = null;
    let projEnd = null;

    finalAnnotatedTasks.forEach(t => {
      if (t.durationWorkingDays > 0) {
        const s = CalendarEngine.parseDate(t.startDate);
        const e = CalendarEngine.parseDate(t.endDate);
        if (!projStart || s < projStart) projStart = s;
        if (!projEnd || e > projEnd) projEnd = e;
      }
    });

    const projectStartDateIso = projStart ? CalendarEngine.toISODate(projStart) : startIso;
    const projectEndDateIso = projEnd ? CalendarEngine.toISODate(projEnd) : startIso;

    const totalWorkingDays = CalendarEngine.countWorkingDays(projectStartDateIso, projectEndDateIso, holidays);
    const totalCalendarDays = CalendarEngine.countCalendarDays(projectStartDateIso, projectEndDateIso);
    const nonWorkingDays = CalendarEngine.countNonWorkingDays(projectStartDateIso, projectEndDateIso, holidays);

    // Effort Metrics (Strictly scoped to active included phases)
    const estimatedEffortHours = Number(finalAnnotatedTasks.reduce((sum, t) => sum + (t.estimatedHours || t.hours || 0), 0).toFixed(1));
    const allocatedEffortHours = Number(finalAnnotatedTasks.reduce((sum, t) => sum + (t.allocatedHours || 0), 0).toFixed(1));
    const actualUsedEffortHours = Number(finalAnnotatedTasks.filter(t => t.status === 'Completed').reduce((sum, t) => sum + (t.actualUsedHours || t.hours || 0), 0).toFixed(1));
    
    const completedTasksCount = finalAnnotatedTasks.filter(t => t.status === 'Completed').length;
    const totalTasksCount = finalAnnotatedTasks.length;
    const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
    const actualUsedPercent = estimatedEffortHours > 0 ? Math.round((actualUsedEffortHours / estimatedEffortHours) * 100) : 0;

    // Scoped role breakdown strictly for active tasks in the plan:
    const totalIdHours = Number(finalAnnotatedTasks.filter(t => t.roleCategory === 'ID').reduce((sum, t) => sum + (t.hours || 0), 0).toFixed(1));
    const totalDeveloperHours = Number(finalAnnotatedTasks.filter(t => t.roleCategory === 'DEVELOPER').reduce((sum, t) => sum + (t.hours || 0), 0).toFixed(1));
    const totalAnimatorHours = Number(finalAnnotatedTasks.filter(t => t.roleCategory === 'ANIMATOR').reduce((sum, t) => sum + (t.hours || 0), 0).toFixed(1));
    const totalQaHours = Number(finalAnnotatedTasks.filter(t => t.roleCategory === 'QA').reduce((sum, t) => sum + (t.hours || 0), 0).toFixed(1));
    const totalVdHours = Number(finalAnnotatedTasks.filter(t => t.roleCategory === 'DESIGNER').reduce((sum, t) => sum + (t.hours || 0), 0).toFixed(1));
    const totalPmHours = Number(finalAnnotatedTasks.filter(t => t.roleCategory === 'PM').reduce((sum, t) => sum + (t.hours || 0), 0).toFixed(1));

    // Scoped allocated breakdown by role (8h/resource/day):
    const allocatedIdHours = Number(finalAnnotatedTasks.filter(t => t.roleCategory === 'ID').reduce((sum, t) => sum + (t.allocatedHours || 0), 0).toFixed(1));
    const allocatedDevHours = Number(finalAnnotatedTasks.filter(t => t.roleCategory === 'DEVELOPER').reduce((sum, t) => sum + (t.allocatedHours || 0), 0).toFixed(1));
    const allocatedAnimHours = Number(finalAnnotatedTasks.filter(t => t.roleCategory === 'ANIMATOR').reduce((sum, t) => sum + (t.allocatedHours || 0), 0).toFixed(1));
    const allocatedQaHours = Number(finalAnnotatedTasks.filter(t => t.roleCategory === 'QA').reduce((sum, t) => sum + (t.allocatedHours || 0), 0).toFixed(1));
    const allocatedVdHours = Number(finalAnnotatedTasks.filter(t => t.roleCategory === 'DESIGNER').reduce((sum, t) => sum + (t.allocatedHours || 0), 0).toFixed(1));
    const allocatedPmHours = Number(finalAnnotatedTasks.filter(t => t.roleCategory === 'PM').reduce((sum, t) => sum + (t.allocatedHours || 0), 0).toFixed(1));

    const scopedEstimation = {
      ...estimation,
      hours: {
        ...estimation.hours,
        totalIdHours,
        totalDeveloperHours,
        totalAnimatorHours,
        totalQaHours,
        totalVdHours,
        totalPmHours,
        grandTotalHours: estimatedEffortHours
      }
    };

    return {
      projectId,
      projectName,
      clientName,
      projectType,
      startPhaseId: activeStartPhase.id,
      startPhaseName: activeStartPhase.name,
      complexity,
      courseLengthMinutes,
      moduleCount,
      startDate: projectStartDateIso,
      calculatedEndDate: projectEndDateIso,
      totalWorkingDays,
      totalCalendarDays,
      nonWorkingDays,
      projectManager: projectManager || getRoleCapacityAndResources('PM').primaryResource,
      assignedTeam,
      teamCapacityByRole: {
        PM: getRoleCapacityAndResources('PM').dailyCapacity,
        ID: getRoleCapacityAndResources('ID').dailyCapacity,
        DEVELOPER: getRoleCapacityAndResources('DEVELOPER').dailyCapacity,
        ANIMATOR: getRoleCapacityAndResources('ANIMATOR').dailyCapacity,
        DESIGNER: getRoleCapacityAndResources('DESIGNER').dailyCapacity,
        QA: getRoleCapacityAndResources('QA').dailyCapacity
      },
      estimatedEffortHours,
      allocatedEffortHours,
      actualUsedEffortHours,
      actualUsedPercent,
      completedTasksCount,
      totalTasksCount,
      progressPercent,
      allocatedHoursByRole: {
        PM: allocatedPmHours,
        ID: allocatedIdHours,
        DEVELOPER: allocatedDevHours,
        ANIMATOR: allocatedAnimHours,
        DESIGNER: allocatedVdHours,
        QA: allocatedQaHours
      },
      estimation: scopedEstimation,
      phases: annotatedPhases,
      tasks: finalAnnotatedTasks,
      criticalPathTaskIds: criticalAnalysis.criticalPathTaskIds,
      criticalPathDays: criticalAnalysis.criticalPathDays,
      manualOverrides,
      holidays
    };
  }
}
