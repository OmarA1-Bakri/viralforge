import auth from './server/auth';

async function test() {
  try {
    console.log('Testing login: omar / Nelson0!');
    const result = await auth.loginUser('omar', 'Nelson0!');
    console.log('✅ SUCCESS');
    console.log('User ID:', result.user.id);
    console.log('Username:', result.user.username);
  } catch (error: any) {
    console.error('❌ FAILED:', error.message);
  }
  process.exit(0);
}

test();
