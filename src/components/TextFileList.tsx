import { useState, useEffect } from 'react';
import { Search, Copy, Trash2, X, Edit, Tag, Calendar, FileText, Download } from 'lucide-react';
import { supabase, SharedTextFile } from '../lib/supabase';
import { decrypt } from '../lib/encryption';
import { useAuth } from '../contexts/AuthContext';
import { TextFileForm } from './TextFileForm';

export function TextFileList({ refresh }: { refresh: number }) {
  const { profile, user } = useAuth();
  const [textFiles, setTextFiles] = useState<SharedTextFile[]>([]);
  const [filteredTextFiles, setFilteredTextFiles] = useState<SharedTextFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTextFile, setSelectedTextFile] = useState<SharedTextFile | null>(null);
  const [editingTextFile, setEditingTextFile] = useState<SharedTextFile | null>(null);
  const [decryptedContent, setDecryptedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTextFiles();
  }, [refresh]);

  useEffect(() => {
    filterTextFiles();
  }, [searchQuery, textFiles]);

  const loadTextFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_text_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTextFiles(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterTextFiles = () => {
    if (!searchQuery.trim()) {
      setFilteredTextFiles(textFiles);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = textFiles.filter(
      (file) =>
        file.title.toLowerCase().includes(query) ||
        file.description?.toLowerCase().includes(query) ||
        file.file_type.toLowerCase().includes(query) ||
        file.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
        file.environment.toLowerCase().includes(query)
    );
    setFilteredTextFiles(filtered);
  };

  const viewTextFile = async (file: SharedTextFile) => {
    setSelectedTextFile(file);
    setError('');
    try {
      const content = await decrypt(file.content);
      setDecryptedContent(content);

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action_type: 'text_file_access',
          resource_id: file.id,
          resource_name: file.title,
          metadata: {
            action: 'view',
            user_agent: navigator.userAgent,
            environment: file.environment,
          },
        });
      }
    } catch (err: any) {
      setError('Failed to decrypt content');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const downloadTextFile = (content: string, title: string, fileType: string) => {
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const extension = getFileExtension(fileType);
      link.download = `${title}${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download file');
    }
  };

  const getFileExtension = (fileType: string) => {
    const extensions: { [key: string]: string } = {
      json: '.json',
      yaml: '.yaml',
      xml: '.xml',
      markdown: '.md',
      code: '.txt',
      config: '.conf',
      script: '.sh',
      plaintext: '.txt',
    };
    return extensions[fileType] || '.txt';
  };

  const deleteTextFile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this text file?')) return;

    try {
      const { error } = await supabase.from('shared_text_files').delete().eq('id', id);

      if (error) throw error;

      setSelectedTextFile(null);
      loadTextFiles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getEnvironmentBadge = (env: string) => {
    const badges = {
      dev: { label: 'DEV', color: 'bg-blue-900/30 border-blue-700 text-blue-300' },
      qa: { label: 'QA', color: 'bg-yellow-900/30 border-yellow-700 text-yellow-300' },
      prod: { label: 'PROD', color: 'bg-red-900/30 border-red-700 text-red-300' },
    };
    return badges[env as keyof typeof badges] || badges.dev;
  };

  const getFileTypeIcon = () => {
    return <FileText className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by title, description, tags, or environment..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredTextFiles.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-400 mb-2">No text files found</h3>
          <p className="text-slate-500">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Create your first shared text file to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTextFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => viewTextFile(file)}
              className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-blue-600 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400 group-hover:bg-blue-600/30 transition-colors">
                    {getFileTypeIcon()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {file.title}
                    </h3>
                    <p className="text-xs text-slate-400">{file.file_type}</p>
                  </div>
                </div>
              </div>

              {file.description && (
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{file.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                <span
                  className={`inline-block text-xs px-2 py-1 rounded border ${
                    getEnvironmentBadge(file.environment).color
                  } font-semibold`}
                >
                  {getEnvironmentBadge(file.environment).label}
                </span>
                {file.tags?.slice(0, 2).map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-700 text-slate-300"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
                {file.tags && file.tags.length > 2 && (
                  <span className="text-xs px-2 py-1 text-slate-400">
                    +{file.tags.length - 2} more
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="w-3 h-3" />
                {new Date(file.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTextFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedTextFile.title}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-200">{selectedTextFile.file_type}</span>
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded border ${
                        getEnvironmentBadge(selectedTextFile.environment).color
                      } font-semibold`}
                    >
                      {getEnvironmentBadge(selectedTextFile.environment).label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setError('');
                    setSelectedTextFile(null);
                    setDecryptedContent('');
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

              {selectedTextFile.description && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">Description</p>
                  <p className="text-white">{selectedTextFile.description}</p>
                </div>
              )}

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-400">Content</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(decryptedContent)}
                      className="p-2 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-sm text-slate-300"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      onClick={() => downloadTextFile(decryptedContent, selectedTextFile.title, selectedTextFile.file_type)}
                      className="p-2 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-sm text-slate-300"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
                <pre className="text-white font-mono text-sm bg-slate-950 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap break-words">
                  {decryptedContent}
                </pre>
              </div>

              {selectedTextFile.tags && selectedTextFile.tags.length > 0 && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTextFile.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded bg-slate-700 text-slate-300"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Created</p>
                <p className="text-white">
                  {new Date(selectedTextFile.created_at).toLocaleString()}
                </p>
              </div>

              {(profile?.is_admin || selectedTextFile.created_by === profile?.id) && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setEditingTextFile(selectedTextFile);
                      setSelectedTextFile(null);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-5 h-5" />
                    Edit Text File
                  </button>
                  <button
                    onClick={() => deleteTextFile(selectedTextFile.id)}
                    className="bg-red-900/30 hover:bg-red-900/50 border border-red-700 text-red-400 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Text File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingTextFile && (
        <TextFileForm
          editTextFile={editingTextFile}
          onSuccess={() => {
            setEditingTextFile(null);
            loadTextFiles();
          }}
          onClose={() => setEditingTextFile(null)}
        />
      )}
    </div>
  );
}
