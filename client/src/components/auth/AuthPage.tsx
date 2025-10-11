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

  // Tester mode state - persisted in localStorage
  const [testerModeEnabled, setTesterModeEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('viralforge_tester_mode') === 'true';
    } catch {
      return false;
    }
  });

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

  // Tap counter for enabling tester mode (7 taps within 3 seconds)
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  const handleTesterModeTap = () => {
    const now = Date.now();

    // Reset counter if more than 3 seconds since last tap
    if (now - lastTapTime > 3000) {
      setTapCount(1);
      console.log('[AuthPage] Tester tap counter reset: 1/7');
    } else {
      const newCount = tapCount + 1;
      setTapCount(newCount);
      console.log(`[AuthPage] Tester tap counter: ${newCount}/7`);

      // 7 taps enables tester mode
      if (newCount === 7) {
        localStorage.setItem('viralforge_tester_mode', 'true');
        setTesterModeEnabled(true);
        setTapCount(0);
        console.log('[AuthPage] 🎉 Tester mode ENABLED!');
        alert('🎉 Tester mode enabled! You can now select the Tester Crew tier.');
      }
    }

    setLastTapTime(now);
  };

  // Clear auth step when component unmounts (user logged in)
  useEffect(() => {
    return () => {
      console.log('[AuthPage] Unmounting, clearing auth step');
      localStorage.removeItem('authStep');
    };
  }, []);

  if (currentStep === 'login') {
    return <LoginForm onSwitchToRegister={switchToRegister} onTitleTap={handleTesterModeTap} />;
  }

  if (currentStep === 'planSelection') {
    return <PlanSelection onSelectPlan={handlePlanSelected} onBack={switchToLogin} showTester={testerModeEnabled} />;
  }

  return <RegisterForm onSwitchToLogin={switchToLogin} selectedPlan={selectedPlan} />;
};