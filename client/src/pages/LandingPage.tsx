import LandingHero from "@/components/LandingHero";
import { useLocation } from "wouter";

interface LandingPageProps {
  onLogin?: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [, setLocation] = useLocation();

  return (
    <LandingHero
      onLogin={onLogin || (() => setLocation('/login'))}
      onRegister={() => setLocation('/register')}
    />
  );
}