import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  const switchToRegister = () => setIsLogin(false);
  const switchToLogin = () => setIsLogin(true);

  if (isLogin) {
    return <LoginForm onSwitchToRegister={switchToRegister} />;
  }

  return <RegisterForm onSwitchToLogin={switchToLogin} />;
};