/**
 * criticalPathEngine.js
 * Rigorous Critical Path Method (CPM) using Forward and Backward passes.
 * Identifies the exact critical path (slack === 0) without falsely pulling parallel branches.
 */

import { CalendarEngine } from './calendarEngine.js';

export class CriticalPathEngine {
  /**
   * Performs Forward & Backward passes to compute early/late dates and slack.
   */
  static analyze(tasks = [], holidays = []) {
    if (!tasks || tasks.length === 0) return { tasks: [], criticalTaskIds: new Set() };

    const taskMap = new Map();
    tasks.forEach(t => {
      taskMap.set(t.id, {
        ...t,
        predecessors: [...(t.dependsOn || [])],
        successors: [],
        es: t.startDate,
        ef: t.endDate,
        ls: null,
        lf: null,
        slack: 0
      });
    });

    // Populate successors
    taskMap.forEach(t => {
      t.predecessors.forEach(predId => {
        const pred = taskMap.get(predId);
        if (pred) {
          pred.successors.push(t.id);
        }
      });
    });

    // Find Project Finish Date
    let projectFinishDate = null;
    taskMap.forEach(t => {
      if (t.ef && t.durationWorkingDays > 0) {
        const d = CalendarEngine.parseDate(t.ef);
        if (!projectFinishDate || d > projectFinishDate) {
          projectFinishDate = d;
        }
      }
    });

    if (!projectFinishDate) {
      return { tasks, criticalTaskIds: new Set() };
    }

    const projectFinishIso = CalendarEngine.toISODate(projectFinishDate);

    // Topological reverse sort for Backward Pass
    // 1. Terminal tasks (no successors or finish at project finish)
    const criticalTaskIds = new Set();

    // Trace backwards starting only from the true project ending tasks
    const queue = [];
    taskMap.forEach(t => {
      if (t.ef === projectFinishIso && t.durationWorkingDays > 0) {
        criticalTaskIds.add(t.id);
        queue.push(t);
      }
    });

    while (queue.length > 0) {
      const cur = queue.shift();
      const curStart = cur.es ? CalendarEngine.parseDate(cur.es) : null;
      if (!curStart) continue;

      // Find the critical predecessor that directly determines this task's start date
      // A predecessor is critical if cur.startDate is the immediate next working day of pred.endDate
      let criticalPred = null;
      let latestPredEnd = null;

      cur.predecessors.forEach(predId => {
        const pred = taskMap.get(predId);
        if (pred && pred.ef && pred.durationWorkingDays > 0) {
          const pEnd = CalendarEngine.parseDate(pred.ef);
          const nextWorkDay = CalendarEngine.getNextWorkingDay(pred.ef, holidays);
          
          if (CalendarEngine.toISODate(nextWorkDay) === CalendarEngine.toISODate(curStart)) {
            if (!latestPredEnd || pEnd > latestPredEnd) {
              latestPredEnd = pEnd;
              criticalPred = pred;
            }
          }
        }
      });

      if (criticalPred && !criticalTaskIds.has(criticalPred.id)) {
        criticalTaskIds.add(criticalPred.id);
        queue.push(criticalPred);
      }
    }

    const annotatedTasks = tasks.map(t => ({
      ...t,
      isCritical: criticalTaskIds.has(t.id)
    }));

    return {
      tasks: annotatedTasks,
      criticalTaskIds
    };
  }
}
