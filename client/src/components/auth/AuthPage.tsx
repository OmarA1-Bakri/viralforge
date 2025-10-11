import React, { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { PlanSelection } from './PlanSelection';

type AuthStep = 'login' | 'planSelection' | 'register';

export const AuthPage: React.FC = () => {
  // Persist auth step in localStorage to survive remounts
  const [currentStep, setCurrentStep] = useState<AuthStep>(() => {
    try {
      const saved = localStorage.getItem('authStep');
      return (saved as AuthStep) || 'login';
    } catch {
      return 'login';
    }
  });
  const [selectedPlan, setSelectedPlan] = useState<string>('starter');

  // Save auth step to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('authStep', currentStep);
  }, [currentStep]);

  const switchToRegister = () => {
    console.log('[AuthPage] Switch to register clicked, current step:', currentStep);
    setCurrentStep('planSelection');
  };
  const switchToLogin = () => {
    console.log('[AuthPage] Switch to login clicked');
    localStorage.removeItem('authStep'); // Clear persisted state
    setCurrentStep('login');
  };

  const handlePlanSelected = (planId: string) => {
    console.log('[AuthPage] Plan selected:', planId);
    setSelectedPlan(planId);
    setCurrentStep('register');
  };

  // Clear auth step when component unmounts (user logged in)
  useEffect(() => {
    return () => {
      console.log('[AuthPage] Unmounting, clearing auth step');
      localStorage.removeItem('authStep');
    };
  }, []);

  if (currentStep === 'login') {
    return <LoginForm onSwitchToRegister={switchToRegister} />;
  }

  if (currentStep === 'planSelection') {
    return <PlanSelection onSelectPlan={handlePlanSelected} onBack={switchToLogin} />;
  }

  return <RegisterForm onSwitchToLogin={switchToLogin} selectedPlan={selectedPlan} />;
};