import 'dotenv/config';
import { PostgresStorage } from '../storage-postgres';

async function testStorage() {
  console.log('🧪 Testing PostgreSQL storage...');
  
  const storage = new PostgresStorage();
  
  try {
    // Test user creation
    const testUser = await storage.createUser({
      username: 'test-user-' + Date.now()
    });
    console.log('✅ Created test user:', testUser.id);
    
    // Test user retrieval
    const retrievedUser = await storage.getUser(testUser.id);
    console.log('✅ Retrieved user by ID:', retrievedUser?.username);
    
    // Test user retrieval by username
    const userByUsername = await storage.getUserByUsername(testUser.username);
    console.log('✅ Retrieved user by username:', userByUsername?.id);
    
    // Test trend creation
    const testTrend = await storage.createTrend({
      title: 'Test Trend',
      description: 'A test trend for validation',
      category: 'test',
      platform: 'tiktok',
      hotness: 'trending',
      engagement: 1000,
      hashtags: ['#test', '#viralforge'],
      suggestion: 'Test this trend out!',
      timeAgo: '1h'
    });
    console.log('✅ Created test trend:', testTrend.id);
    
    // Test trends retrieval
    const trends = await storage.getTrends('tiktok', 5);
    console.log('✅ Retrieved trends:', trends.length, 'found');
    
    // Test user content creation
    const testContent = await storage.createUserContent({
      userId: testUser.id,
      platform: 'tiktok',
      title: 'Test Content',
      status: 'draft'
    });
    console.log('✅ Created test content:', testContent.id);
    
    // Test user content retrieval
    const userContent = await storage.getUserContent(testUser.id);
    console.log('✅ Retrieved user content:', userContent.length, 'items');
    
    // Test user trend action
    const trendAction = await storage.createUserTrendAction({
      userId: testUser.id,
      trendId: testTrend.id,
      action: 'saved'
    });
    console.log('✅ Created trend action:', trendAction.id);
    
    // Test user activity
    const activity = await storage.createUserActivity({
      userId: testUser.id,
      activityType: 'test',
      title: 'Test Activity',
      status: 'completed'
    });
    console.log('✅ Created user activity:', activity.id);
    
    console.log('\n🎉 All storage tests passed! PostgreSQL integration is working correctly.');
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

testStorage();