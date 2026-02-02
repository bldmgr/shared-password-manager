import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { supabase, SharedTextFile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { encrypt, decrypt } from '../lib/encryption';

interface TextFileFormProps {
  onSuccess: () => void;
  editTextFile?: SharedTextFile | null;
  onClose?: () => void;
}

export function TextFileForm({ onSuccess, editTextFile, onClose }: TextFileFormProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    file_type: 'plaintext',
    environment: 'dev' as 'dev' | 'qa' | 'prod',
    tags: '',
  });

  useEffect(() => {
    if (editTextFile) {
      loadTextFileData();
    }
  }, [editTextFile]);

  const loadTextFileData = async () => {
    if (!editTextFile) return;

    try {
      const decryptedContent = await decrypt(editTextFile.content);

      setFormData({
        title: editTextFile.title,
        content: decryptedContent,
        description: editTextFile.description || '',
        file_type: editTextFile.file_type || 'plaintext',
        environment: editTextFile.environment,
        tags: editTextFile.tags?.join(', ') || '',
      });
      setIsOpen(true);
    } catch (err) {
      console.error('Error loading text file data:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const encryptedContent = await encrypt(formData.content);
      const tagsArray = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const textFileData = {
        title: formData.title,
        content: encryptedContent,
        description: formData.description || null,
        file_type: formData.file_type,
        environment: formData.environment,
        tags: tagsArray.length > 0 ? tagsArray : null,
      };

      if (editTextFile) {
        const { error } = await supabase
          .from('shared_text_files')
          .update(textFileData)
          .eq('id', editTextFile.id);

        if (error) throw error;

        if (user) {
          await supabase.from('audit_logs').insert({
            user_id: user.id,
            action_type: 'text_file_access',
            resource_id: editTextFile.id,
            resource_name: formData.title,
            metadata: {
              action: 'update',
              user_agent: navigator.userAgent,
              environment: formData.environment,
            },
          });
        }
      } else {
        const { error } = await supabase.from('shared_text_files').insert({
          ...textFileData,
          created_by: user?.id,
        });

        if (error) throw error;
      }

      setFormData({
        title: '',
        content: '',
        description: '',
        file_type: 'plaintext',
        environment: 'dev',
        tags: '',
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
    if (onClose) onClose();
  };

  if (!isOpen && !editTextFile) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add Text File
      </button>
    );
  }

  if (!isOpen && editTextFile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {editTextFile ? 'Edit Text File' : 'Add New Text File'}
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
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Database Config, API Keys, Server Script"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={12}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Paste your configuration, script, or any text content here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description about this file..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                File Type *
              </label>
              <select
                value={formData.file_type}
                onChange={(e) => setFormData({ ...formData, file_type: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="plaintext">Plain Text</option>
                <option value="json">JSON</option>
                <option value="yaml">YAML</option>
                <option value="xml">XML</option>
                <option value="code">Code</option>
                <option value="markdown">Markdown</option>
                <option value="config">Configuration</option>
                <option value="script">Script</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Environment *
              </label>
              <select
                value={formData.environment}
                onChange={(e) =>
                  setFormData({ ...formData, environment: e.target.value as 'dev' | 'qa' | 'prod' })
                }
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dev">Development</option>
                <option value="qa">QA</option>
                <option value="prod">Production</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., database, api, production"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : editTextFile ? 'Update Text File' : 'Save Text File'}
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
