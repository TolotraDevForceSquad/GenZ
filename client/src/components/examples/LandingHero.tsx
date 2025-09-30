import LandingHero from '../LandingHero';

export default function LandingHeroExample() {
  return (
    <LandingHero 
      onLogin={() => console.log('Login triggered')}
      onRegister={() => console.log('Register triggered')}
    />
  );
}