import './server/config/env';
import { db } from './server/db';
import { analysisSchedules, creatorProfiles, profileAnalysisReports } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

(async () => {
  const userId = 'a0e21f11-a4ba-4a65-852d-110a98302f51';

  const schedule = await db.query.analysisSchedules.findFirst({
    where: eq(analysisSchedules.userId, userId),
  });

  if (!schedule) {
    console.log('No schedule found');
    process.exit(1);
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const profile = await db.query.creatorProfiles.findFirst({
    where: eq(creatorProfiles.userId, userId),
  });

  let analysesToday = 0;
  if (profile) {
    const recentAnalyses = await db.query.profileAnalysisReports.findMany({
      where: and(
        eq(profileAnalysisReports.profileId, profile.id),
        sql`${profileAnalysisReports.createdAt} > ${oneDayAgo.toISOString()}`
      ),
    });
    analysesToday = recentAnalyses.length;
  }

  const response = {
    schedule: {
      frequency: schedule.frequency,
      scheduledDate: schedule.scheduledDayOfWeek || schedule.scheduledDayOfMonth,
      scheduledTime: schedule.scheduledTime,
      nextRun: schedule.nextRunAt,
      isActive: schedule.isActive,
    },
    analysesToday,
  };

  console.log('API Response that frontend would receive:');
  console.log(JSON.stringify(response, null, 2));
  process.exit(0);
})();
