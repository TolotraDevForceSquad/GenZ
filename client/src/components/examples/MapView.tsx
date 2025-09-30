import MapView from '../MapView';

export default function MapViewExample() {
  // todo: remove mock functionality
  const mockAlerts = [
    {
      id: '1',
      reason: 'Agression',
      description: 'Tentative d\'agression rue Victor Hugo, individu s\'est enfui à pied.',
      location: 'Rue Victor Hugo, 75016 Paris',
      coordinates: { lat: 48.8566, lng: 2.3522 },
      status: 'pending' as const,
      urgency: 'high' as const,
      timestamp: 'Il y a 15 minutes',
      author: { name: 'Marie Dubois', hasCIN: true }
    },
    {
      id: '2',
      reason: 'Vol',
      description: 'Vol de vélo signalé devant la station de métro.',
      location: 'Station Châtelet, 75001 Paris',
      coordinates: { lat: 48.8606, lng: 2.3376 },
      status: 'confirmed' as const,
      urgency: 'medium' as const,
      timestamp: 'Il y a 1 heure',
      author: { name: 'Alex Martin', hasCIN: false }
    },
    {
      id: '3',
      reason: 'Harcèlement',
      description: 'Fausse alerte de harcèlement.',
      location: 'Boulevard Saint-Germain, 75006 Paris',
      coordinates: { lat: 48.8534, lng: 2.3488 },
      status: 'fake' as const,
      urgency: 'low' as const,
      timestamp: 'Il y a 3 heures',
      author: { name: 'Sophie Chen', hasCIN: false }
    }
  ];

  return (
    <MapView 
      alerts={mockAlerts}
      onAlertClick={(alert) => console.log('Alert clicked:', alert)}
      centerLocation={{ lat: 48.8566, lng: 2.3522 }}
    />
  );
}