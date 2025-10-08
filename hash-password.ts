import { hashPassword } from './server/auth';

async function hash() {
  const password = 'Nelson0!';
  const hashed = await hashPassword(password);
  console.log('Password:', password);
  console.log('Hash:', hashed);
}

hash();
