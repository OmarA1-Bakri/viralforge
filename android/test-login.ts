import { authService } from './server/auth';

async function test() {
  try {
    console.log('Testing login with username: omar, password: Nelson0!');
    const result = await authService.loginUser('omar', 'Nelson0!');
    console.log('✅ Login successful!');
    console.log('User:', result.user);
    console.log('Token:', result.token.substring(0, 20) + '...');
  } catch (error: any) {
    console.error('❌ Login failed:', error.message);
  }
  process.exit(0);
}

test();
