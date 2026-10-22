/**
 * estimationEngine.js
 * Calculates hours, minutes, and working days based on Course Length / Seat Time,
 * Number of Modules, Project Type, and specific Complexity Level.
 */

import { DEFAULT_COMPLEXITY_CONFIG, PROJECT_TYPE_COMPLEXITIES } from './complexityConfig.js';

export class EstimationEngine {
  /**
   * Computes the project-wide and per-module hours breakdown based on project parameters.
   */
  static calculateBreakdown({
    projectType = 'storyline-360',
    courseLengthMinutes = 60,
    moduleCount = 4,
    complexity = 'Level 2',
    complexityConfig = DEFAULT_COMPLEXITY_CONFIG
  }) {
    const hoursPerDay = complexityConfig.hoursPerWorkingDay || 7;
    const rates = complexityConfig.rates || DEFAULT_COMPLEXITY_CONFIG.rates;

    // 1. Resolve complexity ratio / config for this project type
    const cpxMap = complexityConfig.projectTypeComplexities || PROJECT_TYPE_COMPLEXITIES;
    const listForType = cpxMap[projectType] || PROJECT_TYPE_COMPLEXITIES[projectType] || [];
    const targetComp = String(complexity || '').trim().toLowerCase();

    let complexityRatio = listForType.find(c => {
      const cId = String(c.id || '').trim().toLowerCase();
      const cName = String(c.name || '').trim().toLowerCase();
      if (cId === targetComp || cName === targetComp) return true;
      if (targetComp.includes('2.5') && (cId.includes('2.5') || cName.includes('2.5'))) return true;
      return false;
    });

    // Fallback search across all types or legacy map
    if (!complexityRatio) {
      for (const tKey of Object.keys(cpxMap)) {
        const found = (cpxMap[tKey] || []).find(c => {
          const cId = String(c.id || '').trim().toLowerCase();
          const cName = String(c.name || '').trim().toLowerCase();
          return cId === targetComp || cName === targetComp || (targetComp.includes('2.5') && (cId.includes('2.5') || cName.includes('2.5')));
        });
        if (found) {
          complexityRatio = found;
          break;
        }
      }
    }

    if (!complexityRatio && complexityConfig.complexityRatios) {
      complexityRatio = complexityConfig.complexityRatios[complexity] ||
        complexityConfig.complexityRatios[Object.keys(complexityConfig.complexityRatios).find(k => k.toLowerCase() === targetComp)];
    }

    if (!complexityRatio) {
      complexityRatio = listForType[1] || listForType[0] || {
        id: complexity,
        name: complexity,
        animatorRatioPercent: 16.67,
        developerRatioPercent: 83.33,
        baselineAnimMinutes: 10,
        baselineDevMinutes: 50,
        effortMultiplier: 1.0
      };
    }

    const totalMinutes = Math.max(1, Number(courseLengthMinutes) || 60);
    const numModules = Math.max(1, Number(moduleCount) || 1);
    const minutesPerModule = totalMinutes / numModules;
    const multiplier = complexityRatio.effortMultiplier || 1.0;

    // Minute splits based on complexity
    const animRatio = (complexityRatio.animatorRatioPercent || 0) / 100;
    const devRatio = (complexityRatio.developerRatioPercent || 100) / 100;

    let totalAnimMinutes = Math.round((totalMinutes * animRatio) * 100) / 100;
    let totalDevMinutes = Math.round((totalMinutes * devRatio) * 100) / 100;

    // Direct baseline match if exactly 60 mins
    if (totalMinutes === 60 && complexityRatio.baselineAnimMinutes !== undefined) {
      totalAnimMinutes = complexityRatio.baselineAnimMinutes;
      totalDevMinutes = complexityRatio.baselineDevMinutes;
    }

    const animMinutesPerModule = totalAnimMinutes / numModules;
    const devMinutesPerModule = totalDevMinutes / numModules;

    // Rates calculation
    // ID Hours
    const idRate = rates.idRateHoursPerMin || 0.4;
    const totalIdHours = totalMinutes * idRate * multiplier;
    const idHoursPerModule = minutesPerModule * idRate * multiplier;

    // Animator / Motion Hours
    const animRate = rates.animatorHoursPerMin || 3.5;
    const totalAnimatorHours = totalAnimMinutes * animRate * multiplier;
    const animatorHoursPerModule = animMinutesPerModule * animRate * multiplier;

    // Developer Hours
    const devRate = rates.developerHoursPerMin || (7 / 3);
    const totalDeveloperHours = totalDevMinutes * devRate * multiplier;
    const developerHoursPerModule = devMinutesPerModule * devRate * multiplier;

    // QA & Visual Design
    const qaRate = rates.qaHoursPerMin || 0.15;
    const totalQaHours = totalMinutes * qaRate * multiplier;
    const qaHoursPerModule = minutesPerModule * qaRate * multiplier;

    const vdRate = rates.visualDesignHoursPerMin || 0.2;
    const totalVdHours = totalMinutes * vdRate * multiplier;
    const vdHoursPerModule = minutesPerModule * vdRate * multiplier;

    const grandTotalHours = totalIdHours + totalAnimatorHours + totalDeveloperHours + totalQaHours + totalVdHours;

    return {
      projectType,
      totalMinutes,
      numModules,
      minutesPerModule,
      complexity: complexityRatio.id || complexity,
      complexityName: complexityRatio.name || complexity,
      effortMultiplier: multiplier,
      hoursPerDay,
      ratios: {
        animRatioPercent: complexityRatio.animatorRatioPercent,
        devRatioPercent: complexityRatio.developerRatioPercent
      },
      minutes: {
        totalAnimMinutes,
        totalDevMinutes,
        animMinutesPerModule,
        devMinutesPerModule
      },
      hours: {
        totalIdHours: Number(totalIdHours.toFixed(1)),
        totalAnimatorHours: Number(totalAnimatorHours.toFixed(1)),
        totalDeveloperHours: Number(totalDeveloperHours.toFixed(1)),
        totalQaHours: Number(totalQaHours.toFixed(1)),
        totalVdHours: Number(totalVdHours.toFixed(1)),
        grandTotalHours: Number(grandTotalHours.toFixed(1)),
        perModule: {
          idHours: Number(idHoursPerModule.toFixed(1)),
          animatorHours: Number(animatorHoursPerModule.toFixed(1)),
          developerHours: Number(developerHoursPerModule.toFixed(1)),
          qaHours: Number(qaHoursPerModule.toFixed(1)),
          vdHours: Number(vdHoursPerModule.toFixed(1))
        }
      },
      workingDays: {
        idDays: Math.max(1, Math.ceil(totalIdHours / hoursPerDay)),
        animatorDays: totalAnimatorHours > 0 ? Math.max(1, Math.ceil(totalAnimatorHours / hoursPerDay)) : 0,
        developerDays: Math.max(1, Math.ceil(totalDeveloperHours / hoursPerDay)),
        qaDays: Math.max(1, Math.ceil(totalQaHours / hoursPerDay)),
        vdDays: Math.max(1, Math.ceil(totalVdHours / hoursPerDay))
      }
    };
  }

  /**
   * Converts hours into working days (ceil(hours / hoursPerWorkingDay)).
   */
  static hoursToWorkingDays(hours, hoursPerDay = 7) {
    if (!hours || hours <= 0) return 1;
    return Math.max(1, Math.ceil(hours / hoursPerDay));
  }
}
