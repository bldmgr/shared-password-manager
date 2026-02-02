import { useState, useEffect } from 'react';
import { Plus, X, RefreshCw, Eye, EyeOff, Zap } from 'lucide-react';
import { supabase, SharedPassword } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { encrypt, decrypt } from '../lib/encryption';
import { generatePassword, getPasswordStrength, PasswordGeneratorOptions } from '../lib/passwordGenerator';

interface PasswordFormProps {
  onSuccess: () => void;
  editPassword?: SharedPassword | null;
  onClose?: () => void;
}

export function PasswordForm({ onSuccess, editPassword, onClose }: PasswordFormProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorOptions, setGeneratorOptions] = useState<PasswordGeneratorOptions>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
  });

  const [formData, setFormData] = useState({
    service_name: '',
    service_url: '',
    username: '',
    password: '',
    token: '',
    description: '',
    expiration_date: '',
    two_factor_enabled: false,
    environment: 'dev' as 'dev' | 'qa' | 'prod',
  });

  useEffect(() => {
    if (editPassword) {
      loadPasswordData();
    }
  }, [editPassword]);

  const loadPasswordData = async () => {
    if (!editPassword) return;

    try {
      const decryptedPassword = editPassword.password ? await decrypt(editPassword.password) : '';
      const decryptedToken = editPassword.token ? await decrypt(editPassword.token) : '';

      setFormData({
        service_name: editPassword.service_name,
        service_url: editPassword.service_url || '',
        username: editPassword.username || '',
        password: decryptedPassword,
        token: decryptedToken,
        description: editPassword.description || '',
        expiration_date: editPassword.expiration_date || '',
        two_factor_enabled: editPassword.two_factor_enabled,
        environment: editPassword.environment,
      });
      setIsOpen(true);
    } catch (err) {
      console.error('Error loading password data:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const encryptedPassword = formData.password ? await encrypt(formData.password) : '';
      const encryptedToken = formData.token ? await encrypt(formData.token) : '';

      const passwordData = {
        service_name: formData.service_name,
        service_url: formData.service_url || null,
        username: formData.username || null,
        password: encryptedPassword || null,
        token: encryptedToken || null,
        description: formData.description || null,
        expiration_date: formData.expiration_date || null,
        two_factor_enabled: formData.two_factor_enabled,
        environment: formData.environment,
      };

      if (editPassword) {
        const { error } = await supabase
          .from('shared_passwords')
          .update(passwordData)
          .eq('id', editPassword.id);

        if (error) throw error;

        if (user) {
          await supabase.from('audit_logs').insert({
            user_id: user.id,
            action_type: 'password_access',
            resource_id: editPassword.id,
            resource_name: formData.service_name,
            metadata: {
              action: 'update',
              user_agent: navigator.userAgent,
              environment: formData.environment,
            },
          });
        }
      } else {
        const { error } = await supabase.from('shared_passwords').insert({
          ...passwordData,
          created_by: user?.id,
        });

        if (error) throw error;
      }

      setFormData({
        service_name: '',
        service_url: '',
        username: '',
        password: '',
        token: '',
        description: '',
        expiration_date: '',
        two_factor_enabled: false,
        environment: 'dev',
      });
      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowGenerator(false);
    if (onClose) onClose();
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword(generatorOptions);
    setFormData({ ...formData, password: newPassword });
    setShowPassword(true);
  };

  const passwordStrength = formData.password ? getPasswordStrength(formData.password) : null;

  if (!isOpen && !editPassword) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add Password
      </button>
    );
  }

  if (!isOpen && editPassword) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {editPassword ? 'Edit Password' : 'Add New Password'}
          </h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-slate-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Service Name *
            </label>
            <input
              type="text"
              value={formData.service_name}
              onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., GitHub, AWS, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Service URL
            </label>
            <input
              type="url"
              value={formData.service_url}
              onChange={(e) => setFormData({ ...formData, service_url: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 pr-20 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGenerator(!showGenerator)}
                    className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                    title="Password Generator"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          passwordStrength.strength === 'weak'
                            ? 'bg-red-500 w-1/4'
                            : passwordStrength.strength === 'medium'
                            ? 'bg-yellow-500 w-1/2'
                            : passwordStrength.strength === 'strong'
                            ? 'bg-blue-500 w-3/4'
                            : 'bg-green-500 w-full'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength.strength === 'weak'
                          ? 'text-red-400'
                          : passwordStrength.strength === 'medium'
                          ? 'text-yellow-400'
                          : passwordStrength.strength === 'strong'
                          ? 'text-blue-400'
                          : 'text-green-400'
                      }`}
                    >
                      {passwordStrength.strength.replace('-', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{passwordStrength.feedback}</p>
                </div>
              )}
              {showGenerator && (
                <div className="mt-3 p-4 bg-slate-900 border border-slate-700 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-300">Length: {generatorOptions.length}</label>
                    <input
                      type="range"
                      min="8"
                      max="32"
                      value={generatorOptions.length}
                      onChange={(e) =>
                        setGeneratorOptions({ ...generatorOptions, length: parseInt(e.target.value) })
                      }
                      className="w-32"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={generatorOptions.includeUppercase}
                        onChange={(e) =>
                          setGeneratorOptions({ ...generatorOptions, includeUppercase: e.target.checked })
                        }
                        className="w-4 h-4 bg-slate-900 border-slate-700 rounded"
                      />
                      Uppercase (A-Z)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={generatorOptions.includeLowercase}
                        onChange={(e) =>
                          setGeneratorOptions({ ...generatorOptions, includeLowercase: e.target.checked })
                        }
                        className="w-4 h-4 bg-slate-900 border-slate-700 rounded"
                      />
                      Lowercase (a-z)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={generatorOptions.includeNumbers}
                        onChange={(e) =>
                          setGeneratorOptions({ ...generatorOptions, includeNumbers: e.target.checked })
                        }
                        className="w-4 h-4 bg-slate-900 border-slate-700 rounded"
                      />
                      Numbers (0-9)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={generatorOptions.includeSymbols}
                        onChange={(e) =>
                          setGeneratorOptions({ ...generatorOptions, includeSymbols: e.target.checked })
                        }
                        className="w-4 h-4 bg-slate-900 border-slate-700 rounded"
                      />
                      Symbols (!@#$)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Generate Password
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Token / API Key
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                className="w-full px-4 py-2 pr-10 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="API token or key"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notes about this service..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Expiration Date
              </label>
              <input
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Environment *
              </label>
              <select
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value as 'dev' | 'qa' | 'prod' })}
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dev">Development</option>
                <option value="qa">QA</option>
                <option value="prod">Production</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="2fa"
              checked={formData.two_factor_enabled}
              onChange={(e) => setFormData({ ...formData, two_factor_enabled: e.target.checked })}
              className="w-4 h-4 bg-slate-900 border-slate-700 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="2fa" className="text-sm text-slate-300">
              Two-Factor Authentication Enabled
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : editPassword ? 'Update Password' : 'Save Password'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-6 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
