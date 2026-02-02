import { useState, useEffect } from 'react';
import { Search, Activity, Eye, LogIn, Shield, Calendar } from 'lucide-react';
import { supabase, AuditLog } from '../lib/supabase';

interface AuditLogWithUser extends AuditLog {
  user_email?: string;
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogWithUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchQuery, actionFilter, logs]);

  const loadLogs = async () => {
    try {
      setError('');
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (logsError) throw logsError;

      const userIds = [...new Set(logsData?.map((log) => log.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const userEmailMap = new Map(profilesData?.map((p) => [p.id, p.email]) || []);

      const logsWithEmail = logsData?.map((log) => ({
        ...log,
        user_email: userEmailMap.get(log.user_id),
      })) || [];

      setLogs(logsWithEmail);
      setFilteredLogs(logsWithEmail);
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action_type === actionFilter);
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.user_email?.toLowerCase().includes(query) ||
          log.resource_name?.toLowerCase().includes(query) ||
          log.action_type.toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'login':
        return <LogIn className="w-4 h-4" />;
      case 'password_access':
        return <Eye className="w-4 h-4" />;
      case 'password_reveal':
        return <Shield className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'login':
        return 'text-green-400 bg-green-500/20 border-green-500';
      case 'password_access':
        return 'text-blue-400 bg-blue-500/20 border-blue-500';
      case 'password_reveal':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500';
      default:
        return 'text-slate-400 bg-slate-500/20 border-slate-500';
    }
  };

  const getActionLabel = (log: AuditLogWithUser) => {
    switch (log.action_type) {
      case 'login':
        return 'Login';
      case 'password_access':
        if (log.metadata?.action === 'update') {
          return 'Updated Password';
        }
        return 'Accessed Password';
      case 'password_reveal':
        return 'Revealed Password';
      default:
        return log.action_type;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-slate-400 mt-4">Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Audit Logs
          </h2>
          <button
            onClick={loadLogs}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user, service, or action..."
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Actions</option>
            <option value="login">Logins</option>
            <option value="password_access">Password Access</option>
            <option value="password_reveal">Password Reveals</option>
          </select>
        </div>

        <div className="text-sm text-slate-400">
          Showing {filteredLogs.length} of {logs.length} logs
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    {searchQuery || actionFilter !== 'all'
                      ? 'No logs found matching your filters'
                      : 'No audit logs yet'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <div>
                          <div>{new Date(log.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{log.user_email || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold ${getActionColor(
                          log.action_type
                        )}`}
                      >
                        {getActionIcon(log.action_type)}
                        {getActionLabel(log)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">
                        {log.resource_name || '-'}
                      </div>
                      {log.metadata?.environment && (
                        <div className="text-xs text-slate-400 mt-1">
                          Env: {log.metadata.environment.toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.metadata?.action === 'update' && (
                        <div className="text-xs text-blue-400 mb-1">
                          Password Updated
                        </div>
                      )}
                      {log.metadata?.field && (
                        <div className="text-xs text-slate-400">
                          Field: {log.metadata.field}
                        </div>
                      )}
                      {log.metadata?.user_agent && (
                        <div className="text-xs text-slate-500 truncate max-w-xs">
                          {log.metadata.user_agent}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
