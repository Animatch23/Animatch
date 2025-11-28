import cron from "node-cron";
import { createBackup } from "./services/backupService.js";

const schedulerState = {
    task: null,
    lastRunAt: null,
    lastSuccess: null,
    lastError: null
};

const getCronExpression = () => process.env.BACKUP_CRON || "0 2 * * *";
const getTimezone = () => process.env.BACKUP_CRON_TZ || "UTC";
const isDisabled = () => String(process.env.DISABLE_BACKUP_CRON).toLowerCase() === "true";

export const startBackupScheduler = () => {
    if (isDisabled()) {
        console.log("[BackupScheduler] Disabled via DISABLE_BACKUP_CRON flag");
        return null;
    }

    if (schedulerState.task) {
        return schedulerState.task;
    }

    const task = cron.schedule(getCronExpression(), async () => {
        schedulerState.lastRunAt = new Date().toISOString();
        try {
            const record = await createBackup("scheduler");
            schedulerState.lastSuccess = {
                at: new Date().toISOString(),
                backupId: record?.id || record?._id || null
            };
            schedulerState.lastError = null;
        } catch (error) {
            schedulerState.lastError = {
                at: new Date().toISOString(),
                message: error.message
            };
            console.error("[BackupScheduler]", error);
        }
    }, {
        timezone: getTimezone()
    });

    task.start();
    schedulerState.task = task;
    console.log(`[BackupScheduler] Daily backups scheduled (${getCronExpression()} ${getTimezone()})`);
    return task;
};

export const getSchedulerStatus = () => ({
    expression: getCronExpression(),
    timezone: getTimezone(),
    disabled: isDisabled(),
    lastRunAt: schedulerState.lastRunAt,
    lastSuccess: schedulerState.lastSuccess,
    lastError: schedulerState.lastError,
    taskStatus: schedulerState.task?.getStatus ? schedulerState.task.getStatus() : (schedulerState.task ? "scheduled" : "stopped")
});

export default {
    startBackupScheduler,
    getSchedulerStatus
};
