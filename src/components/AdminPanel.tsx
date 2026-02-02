import { useState, useEffect } from 'react';
import { UserCog, Trash2, Shield, ShieldOff, X, Activity } from 'lucide-react';
import { supabase, UserProfile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AuditLogs } from './AuditLogs';

export function AdminPanel() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_admin: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!profile?.is_admin) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-8 text-center">
        <ShieldOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-300 mb-2">Access Denied</h2>
        <p className="text-red-400">You need administrator privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-white" />
          <div>
            <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
            <p className="text-blue-100">Manage users and view audit logs</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-white text-blue-600'
                : 'bg-blue-500/20 text-white hover:bg-blue-500/30'
            }`}
          >
            <UserCog className="w-4 h-4" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'bg-white text-blue-600'
                : 'bg-blue-500/20 text-white hover:bg-blue-500/30'
            }`}
          >
            <Activity className="w-4 h-4" />
            Audit Logs
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'users' ? (
          <>
            {error && (
              <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-start justify-between">
                <p className="text-red-300">{error}</p>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-slate-400 mt-4">Loading users...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex items-center justify-between hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.is_admin ? 'bg-blue-600' : 'bg-slate-700'}`}>
                        {user.is_admin ? (
                          <Shield className="w-5 h-5 text-white" />
                        ) : (
                          <span className="text-white font-semibold">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.email}</p>
                        <p className="text-sm text-slate-400">
                          {user.is_admin ? 'Administrator' : 'User'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAdmin(user.id, user.is_admin)}
                        disabled={user.id === profile.id}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          user.is_admin
                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        disabled={user.id === profile.id}
                        className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}

                {users.length === 0 && (
                  <div className="text-center py-12">
                    <UserCog className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No users found</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <AuditLogs />
        )}
      </div>
    </div>
  );
}
