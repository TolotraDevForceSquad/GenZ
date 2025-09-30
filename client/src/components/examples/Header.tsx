import Header from '../Header';

export default function HeaderExample() {
  // todo: remove mock functionality
  const mockUser = {
    name: "Alex Dubois",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        user={mockUser}
        onLogout={() => console.log('Logout triggered')}
        onProfile={() => console.log('Profile triggered')}
        onSettings={() => console.log('Settings triggered')}
      />
    </div>
  );
}