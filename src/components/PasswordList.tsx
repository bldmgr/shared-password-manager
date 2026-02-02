import { useState, useEffect } from 'react';
import { Search, Eye, EyeOff, Copy, Trash2, ExternalLink, Shield, Calendar, X } from 'lucide-react';
import { supabase, SharedPassword } from '../lib/supabase';
import { decrypt } from '../lib/encryption';
import { useAuth } from '../contexts/AuthContext';

export function PasswordList({ refresh }: { refresh: number }) {
  const { profile } = useAuth();
  const [passwords, setPasswords] = useState<SharedPassword[]>([]);
  const [filteredPasswords, setFilteredPasswords] = useState<SharedPassword[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPassword, setSelectedPassword] = useState<SharedPassword | null>(null);
  const [revealedFields, setRevealedFields] = useState<{ [key: string]: boolean }>({});
  const [decryptedValues, setDecryptedValues] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPasswords();
  }, [refresh]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPasswords(passwords);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = passwords.filter(
        (p) =>
          p.service_name.toLowerCase().includes(query) ||
          p.username?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
      setFilteredPasswords(filtered);
    }
  }, [searchQuery, passwords]);

  const loadPasswords = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_passwords')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPasswords(data || []);
      setFilteredPasswords(data || []);
    } catch (err) {
      console.error('Error loading passwords:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleReveal = async (field: string, encryptedValue: string) => {
    const key = `${selectedPassword?.id}-${field}`;

    if (revealedFields[key]) {
      setRevealedFields({ ...revealedFields, [key]: false });
    } else {
      if (!decryptedValues[key]) {
        const decrypted = await decrypt(encryptedValue);
        setDecryptedValues({ ...decryptedValues, [key]: decrypted });
      }
      setRevealedFields({ ...revealedFields, [key]: true });
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const deletePassword = async (id: string) => {
    if (!confirm('Are you sure you want to delete this password?')) {
      return;
    }

    try {
      setError('');
      const { error } = await supabase
        .from('shared_passwords')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSelectedPassword(null);
      await loadPasswords();
    } catch (err: any) {
      console.error('Error deleting password:', err);
      setError(err.message || 'Failed to delete password');
    }
  };

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-slate-400 mt-4">Loading passwords...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services..."
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPasswords.map((password) => (
          <button
            key={password.id}
            onClick={() => {
              setError('');
              setSelectedPassword(password);
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-blue-500 transition-all text-left group"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                {password.service_name}
              </h3>
              {password.two_factor_enabled && (
                <Shield className="w-5 h-5 text-green-400" />
              )}
            </div>

            {password.username && (
              <p className="text-sm text-slate-400 mb-2">{password.username}</p>
            )}

            {password.expiration_date && (
              <div className={`flex items-center gap-1 text-xs ${isExpired(password.expiration_date) ? 'text-red-400' : 'text-slate-500'}`}>
                <Calendar className="w-3 h-3" />
                <span>Expires: {new Date(password.expiration_date).toLocaleDateString()}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {filteredPasswords.length === 0 && (
        <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-700">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">
            {searchQuery ? 'No passwords found matching your search' : 'No passwords saved yet'}
          </p>
        </div>
      )}

      {selectedPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {selectedPassword.service_name}
                  </h2>
                  {selectedPassword.service_url && (
                    <a
                      href={selectedPassword.service_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-200 hover:text-white flex items-center gap-1 text-sm"
                    >
                      {selectedPassword.service_url}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <button
                  onClick={() => {
                    setError('');
                    setSelectedPassword(null);
                  }}
                  className="text-white hover:text-slate-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-start justify-between">
                  <p className="text-red-300">{error}</p>
                  <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {selectedPassword.description && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">Description</p>
                  <p className="text-white">{selectedPassword.description}</p>
                </div>
              )}

              {selectedPassword.username && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-slate-400 mb-1">Username</p>
                      <p className="text-white font-mono">{selectedPassword.username}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedPassword.username!)}
                      className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Copy className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}

              {selectedPassword.password && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-slate-400 mb-1">Password</p>
                      <p className="text-white font-mono">
                        {revealedFields[`${selectedPassword.id}-password`]
                          ? decryptedValues[`${selectedPassword.id}-password`]
                          : '••••••••••••'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleReveal('password', selectedPassword.password!)}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        {revealedFields[`${selectedPassword.id}-password`] ? (
                          <EyeOff className="w-5 h-5 text-slate-400" />
                        ) : (
                          <Eye className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                      {revealedFields[`${selectedPassword.id}-password`] && (
                        <button
                          onClick={() => copyToClipboard(decryptedValues[`${selectedPassword.id}-password`])}
                          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Copy className="w-5 h-5 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedPassword.token && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-slate-400 mb-1">Token / API Key</p>
                      <p className="text-white font-mono break-all">
                        {revealedFields[`${selectedPassword.id}-token`]
                          ? decryptedValues[`${selectedPassword.id}-token`]
                          : '••••••••••••'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleReveal('token', selectedPassword.token!)}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        {revealedFields[`${selectedPassword.id}-token`] ? (
                          <EyeOff className="w-5 h-5 text-slate-400" />
                        ) : (
                          <Eye className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                      {revealedFields[`${selectedPassword.id}-token`] && (
                        <button
                          onClick={() => copyToClipboard(decryptedValues[`${selectedPassword.id}-token`])}
                          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Copy className="w-5 h-5 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedPassword.expiration_date && (
                  <div className={`border rounded-lg p-4 ${isExpired(selectedPassword.expiration_date) ? 'bg-red-900/20 border-red-700' : 'bg-slate-900 border-slate-700'}`}>
                    <p className="text-sm text-slate-400 mb-1">Expiration Date</p>
                    <p className={`font-medium ${isExpired(selectedPassword.expiration_date) ? 'text-red-400' : 'text-white'}`}>
                      {new Date(selectedPassword.expiration_date).toLocaleDateString()}
                    </p>
                    {isExpired(selectedPassword.expiration_date) && (
                      <p className="text-xs text-red-400 mt-1">Expired</p>
                    )}
                  </div>
                )}

                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">Two-Factor Auth</p>
                  <div className="flex items-center gap-2">
                    {selectedPassword.two_factor_enabled ? (
                      <>
                        <Shield className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 font-medium">Enabled</span>
                      </>
                    ) : (
                      <span className="text-slate-500">Disabled</span>
                    )}
                  </div>
                </div>
              </div>

              {(profile?.is_admin || selectedPassword.created_by === profile?.id) && (
                <button
                  onClick={() => deletePassword(selectedPassword.id)}
                  className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-700 text-red-400 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete Password
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
