import { useState } from 'react';
import { LogOut, UserCog, Lock, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PasswordForm } from './PasswordForm';
import { PasswordList } from './PasswordList';
import { TextFileForm } from './TextFileForm';
import { TextFileList } from './TextFileList';
import { AdminPanel } from './AdminPanel';

export function Dashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'passwords' | 'textfiles' | 'admin'>('passwords');
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePasswordAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleTextFileAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Password Manager</h1>
                <p className="text-xs text-slate-400">{profile?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex gap-2 bg-slate-900 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('passwords')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'passwords'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-4 h-4 inline mr-2" />
                  Passwords
                </button>
                <button
                  onClick={() => setActiveTab('textfiles')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'textfiles'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Text Files
                </button>
                {profile?.is_admin && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      activeTab === 'admin'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserCog className="w-4 h-4 inline mr-2" />
                    Admin
                  </button>
                )}
              </div>

              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'passwords' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Shared Passwords</h2>
                <p className="text-slate-400">Manage your team's service credentials</p>
              </div>
              <PasswordForm onSuccess={handlePasswordAdded} />
            </div>

            <PasswordList refresh={refreshKey} />
          </div>
        )}

        {activeTab === 'textfiles' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Shared Text Files</h2>
                <p className="text-slate-400">Share configuration files, scripts, and notes with your team</p>
              </div>
              <TextFileForm onSuccess={handleTextFileAdded} />
            </div>

            <TextFileList refresh={refreshKey} />
          </div>
        )}

        {activeTab === 'admin' && <AdminPanel />}
      </main>
    </div>
  );
}
