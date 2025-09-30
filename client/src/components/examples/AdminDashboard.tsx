import AdminDashboard from '../AdminDashboard';

export default function AdminDashboardExample() {
  return (
    <AdminDashboard 
      onUserAction={(userId, action) => console.log('User action:', userId, action)}
      onAlertAction={(alertId, action) => console.log('Alert action:', alertId, action)}
    />
  );
}