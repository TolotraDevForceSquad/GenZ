import AlertCard from '../AlertCard';

export default function AlertCardExample() {
  // todo: remove mock functionality
  const mockAlert = {
    id: '1',
    reason: 'Agression',
    description: 'Tentative d\'agression rue Victor Hugo, individu s\'est enfui à pied vers le nord. Attention dans ce secteur ce soir.',
    location: 'Rue Victor Hugo, 75016 Paris',
    status: 'pending' as const,
    urgency: 'high' as const,
    timestamp: 'Il y a 15 minutes',
    author: {
      name: 'Marie Dubois',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b169db2c?w=32&h=32&fit=crop&crop=face',
      hasCIN: true
    },
    validations: {
      confirmed: 2,
      rejected: 0
    },
    media: 'photo.jpg'
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto">
        <AlertCard 
          alert={mockAlert}
          onValidate={(id, validation) => console.log('Validation:', id, validation)}
          onViewDetails={(id) => console.log('View details:', id)}
          currentUserId="user123"
          showActions={true}
        />
      </div>
    </div>
  );
}