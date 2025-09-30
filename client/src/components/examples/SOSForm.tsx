import SOSForm from '../SOSForm';
import { useState } from 'react';

export default function SOSFormExample() {
  const [loading, setLoading] = useState(false);
  
  // todo: remove mock functionality
  const handleSubmit = (data: any) => {
    setLoading(true);
    console.log('SOS submitted:', data);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-6 flex items-center">
      <SOSForm 
        onSubmit={handleSubmit}
        onClose={() => console.log('Close triggered')}
        loading={loading}
      />
    </div>
  );
}