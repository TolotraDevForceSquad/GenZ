import ProfilePage from '../ProfilePage';

export default function ProfilePageExample() {
  // todo: remove mock functionality
  const mockUser = {
    id: '1',
    name: 'Alex Dubois',
    phone: '+33 6 12 34 56 78',
    email: 'alex.dubois@email.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=face',
    hasCIN: false,
    joinedAt: 'Mars 2024',
    alertsCount: 5,
    validationsCount: 23
  };

  return (
    <ProfilePage 
      user={mockUser}
      onUpdateProfile={(data) => console.log('Update profile:', data)}
      onUploadCIN={(file) => console.log('Upload CIN:', file.name)}
      onUploadAvatar={(file) => console.log('Upload avatar:', file.name)}
    />
  );
}