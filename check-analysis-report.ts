import { db } from './server/db';
import { profileAnalysisReports, creatorProfiles } from './shared/schema';
import { eq, desc } from 'drizzle-orm';

async function check() {
  const profile = await db.query.creatorProfiles.findFirst({
    where: eq(creatorProfiles.userId, 'a0e21f11-a4ba-4a65-852d-110a98302f51'),
  });

  if (!profile) {
    console.log('❌ No profile found');
    process.exit(1);
  }

  const report = await db.query.profileAnalysisReports.findFirst({
    where: eq(profileAnalysisReports.profileId, profile.id),
    orderBy: desc(profileAnalysisReports.createdAt),
  });

  if (!report) {
    console.log('❌ No analysis report found');
    process.exit(1);
  }

  console.log('=== LATEST ANALYSIS REPORT ===');
  console.log('Profile:', profile.youtubeChannelId);
  console.log('Created:', report.createdAt);
  console.log('\n=== FULL REPORT JSON ===');
  console.log(JSON.stringify(report, null, 2));

  console.log('\n=== SEARCH FOR "LIFESTYLE" ===');
  const reportJson = JSON.stringify(report);
  const matches = reportJson.match(/lifestyle/gi);
  if (matches) {
    console.log(`✅ FOUND "lifestyle" ${matches.length} time(s) in report`);
  } else {
    console.log('❌ "lifestyle" NOT found in report');
  }

  process.exit(0);
}

check();
