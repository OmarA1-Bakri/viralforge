import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { PlanSelection } from './PlanSelection';

type AuthStep = 'login' | 'planSelection' | 'register';

export const AuthPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AuthStep>('login');
  const [selectedPlan, setSelectedPlan] = useState<string>('free');

  const switchToRegister = () => setCurrentStep('planSelection');
  const switchToLogin = () => setCurrentStep('login');

  const handlePlanSelected = (planId: string) => {
    setSelectedPlan(planId);
    setCurrentStep('register');
  };

  if (currentStep === 'login') {
    return <LoginForm onSwitchToRegister={switchToRegister} />;
  }

  if (currentStep === 'planSelection') {
    return <PlanSelection onSelectPlan={handlePlanSelected} onBack={switchToLogin} />;
  }

  return <RegisterForm onSwitchToLogin={switchToLogin} selectedPlan={selectedPlan} />;
};