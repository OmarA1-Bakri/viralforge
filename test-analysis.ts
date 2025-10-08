import { backgroundJobService } from './server/services/background-jobs';

async function test() {
  console.log('🚀 Starting profile analysis for @Cohhcarnage...\n');

  const userId = 'a0e21f11-a4ba-4a65-852d-110a98302f51';
  const jobId = await backgroundJobService.createAnalysisJob(userId, {
    youtubeChannelId: '@Cohhcarnage'
  });

  console.log(`✅ Job created: ${jobId}`);
  console.log('⏳ Analysis running in background...');
  console.log('📊 This will take 45-70 seconds\n');

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 30; // 30 attempts = ~2.5 minutes

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    attempts++;

    const job = backgroundJobService.getJobStatus(jobId);

    console.log(`[${attempts}] Status: ${job.status}, Progress: ${job.progress}%`);

    if (job.status === 'completed') {
      console.log('\n✅ ANALYSIS COMPLETE!');
      console.log('Result:', JSON.stringify(job.result, null, 2));

      console.log('\n📝 Now run: npx tsx check-analysis-report.ts');
      console.log('   to verify the niche is "Gaming" not "lifestyle"\n');
      process.exit(0);
    }

    if (job.status === 'failed') {
      console.log('\n❌ ANALYSIS FAILED');
      console.log('Error:', job.error);
      process.exit(1);
    }
  }

  console.log('\n⏱️  Timeout - job still running. Check server logs.');
  process.exit(1);
}

test();
