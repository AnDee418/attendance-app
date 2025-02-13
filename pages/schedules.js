import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function SchedulesPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUsers();
      fetchSchedules();
    }
  }, [status]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.data) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/schedules');
      const data = await res.json();
      if (data.data) {
        setSchedules(data.data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">みんなの予定</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user.rowIndex} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-4 mb-4">
              {user.data[6] ? (
                <img
                  src={user.data[6]}
                  alt={user.data[0]}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <UserCircleIcon className="w-12 h-12 text-gray-400" />
              )}
              <div>
                <h2 className="font-medium text-gray-900">{user.data[0]}</h2>
                <p className="text-sm text-gray-500">{user.data[4]}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {schedules
                .filter(schedule => schedule.userId === user.data[1])
                .map((schedule, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg text-sm"
                  >
                    <div className="font-medium text-gray-900">
                      {schedule.date}
                    </div>
                    <div className="text-gray-600">
                      {schedule.startTime} - {schedule.endTime}
                    </div>
                    <div className="text-gray-500">
                      {schedule.workType}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 