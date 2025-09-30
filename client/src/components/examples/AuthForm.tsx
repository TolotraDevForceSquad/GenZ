import AuthForm from '../AuthForm';
import { useState } from 'react';

export default function AuthFormExample() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [loading, setLoading] = useState(false);
  
  // todo: remove mock functionality
  const handleSubmit = (data: any) => {
    setLoading(true);
    console.log('Form submitted:', data);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <AuthForm 
      mode={mode}
      onSubmit={handleSubmit}
      onToggleMode={() => setMode(mode === 'login' ? 'register' : 'login')}
      loading={loading}
      error={mode === 'login' ? "Numéro ou mot de passe incorrect" : undefined}
    />
  );
}