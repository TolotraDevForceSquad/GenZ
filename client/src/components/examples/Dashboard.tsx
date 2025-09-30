import Dashboard from '../Dashboard';

export default function DashboardExample() {
  // todo: remove mock functionality
  const mockUser = {
    name: "Alex Dubois",
    hasCIN: true
  };

  return <Dashboard user={mockUser} />;
}