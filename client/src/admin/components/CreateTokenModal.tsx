import { useState, useEffect } from 'react';
import { X, Upload, Check, Copy, FolderOpen, File, Folder, ArrowLeft, HardDrive } from 'lucide-react';
import { API_URL } from '../../config/api';

interface CreateTokenModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface FileItem {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

export default function CreateTokenModal({ onClose, onSuccess }: CreateTokenModalProps) {
  const [formData, setFormData] = useState({
    discordUserId: '',
    filePath: '',
    fileName: '',
    maxDownloads: '3',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdToken, setCreatedToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<FileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  useEffect(() => {
    fetchAvailableFiles('');
  }, []);

  const fetchAvailableFiles = async (path: string) => {
    setFilesLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/files/list?path=${encodeURIComponent(path)}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableFiles(data.files);
        setCurrentPath(data.currentPath);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.isDirectory) {
      fetchAvailableFiles(file.relativePath);
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
      setFormData({
        ...formData,
        filePath: file.path,
        fileName: file.name,
      });
    }
  };

  const handleGoBack = () => {
    const parentPath = currentPath.split('\\').slice(0, -1).join('\\');
    fetchAvailableFiles(parentPath);
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.discordUserId || !formData.filePath || !formData.fileName || !formData.maxDownloads) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    const maxDownloads = parseInt(formData.maxDownloads);
    if (isNaN(maxDownloads) || maxDownloads < 1) {
      setError('O máximo de downloads deve ser pelo menos 1');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/downloads/admin/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          discordUserId: formData.discordUserId,
          filePath: formData.filePath,
          fileName: formData.fileName,
          maxDownloads: maxDownloads,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Falha ao criar token');
        return;
      }

      setCreatedToken(data.token);
    } catch (err) {
      setError('Erro de rede. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(createdToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    if (createdToken) {
      onSuccess();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-lg max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Criar Token de Download</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {createdToken ? (
          <div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
              <p className="text-green-400 font-semibold mb-2">Token Criado com Sucesso!</p>
              <p className="text-sm text-gray-400 mb-3">
                Envie este token ao utilizador. Ele pode reivindicá-lo uma vez.
              </p>
              <div className="bg-black/30 rounded p-3 mb-3">
                <code className="text-amber-500 text-sm break-all">{createdToken}</code>
              </div>
              <button
                onClick={copyToken}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 text-black font-semibold px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                disabled={copied}
              >
                {copied ? (
                  <>
                    <Check size={20} className="animate-in zoom-in duration-200" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={20} />
                    Copiar Token
                  </>
                )}
              </button>
            </div>
            <button
              onClick={handleClose}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-3 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ID do Utilizador Discord *
                </label>
                <input
                  type="text"
                  value={formData.discordUserId}
                  onChange={(e) => setFormData({ ...formData, discordUserId: e.target.value })}
                  placeholder="123456789012345678"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  O ID do utilizador Discord que será proprietário deste download
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Seleccionar Ficheiro *
                </label>

                {/* File Browser */}
                <div className="bg-black/30 border border-white/10 rounded-lg overflow-hidden">
                  {/* Path Navigation */}
                  <div className="bg-black/40 border-b border-white/10 px-4 py-3 flex items-center gap-2">
                    {currentPath && (
                      <button
                        onClick={handleGoBack}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                        type="button"
                      >
                        <ArrowLeft size={18} />
                      </button>
                    )}
                    <HardDrive size={16} className="text-amber-500" />
                    <span className="text-sm text-gray-400">
                      {currentPath ? `downloads/${currentPath}` : 'downloads'}
                    </span>
                  </div>

                  {/* File List */}
                  <div className="max-h-[300px] overflow-y-auto">
                    {filesLoading ? (
                      <div className="px-4 py-8 text-center text-gray-400 flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div>
                        Carregando ficheiros...
                      </div>
                    ) : availableFiles.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-400">
                        Nenhum ficheiro encontrado neste diretório
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {availableFiles.map((file) => (
                          <button
                            key={file.path}
                            type="button"
                            onClick={() => handleFileClick(file)}
                            className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left ${
                              selectedFile?.path === file.path ? 'bg-amber-500/10 border-l-2 border-amber-500' : ''
                            }`}
                            disabled={loading}
                          >
                            {file.isDirectory ? (
                              <Folder size={20} className="text-amber-500 flex-shrink-0" />
                            ) : (
                              <File size={20} className="text-blue-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">{file.name}</div>
                              {!file.isDirectory && (
                                <div className="text-xs text-gray-500">
                                  {formatFileSize(file.size)}
                                </div>
                              )}
                            </div>
                            {selectedFile?.path === file.path && (
                              <Check size={18} className="text-amber-500 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <FolderOpen size={12} />
                  Procure ficheiros no diretório de downloads configurado
                </p>
              </div>

              {selectedFile && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ficheiro Seleccionado
                  </label>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 text-amber-400">
                      <File size={16} />
                      <span className="font-medium">{selectedFile.name}</span>
                    </div>
                    <div className="text-xs text-amber-500/70 mt-1">
                      {formatFileSize(selectedFile.size)}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Máximo de Downloads *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxDownloads}
                  onChange={(e) => setFormData({ ...formData, maxDownloads: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Número de vezes que o utilizador pode descarregar este ficheiro
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-3 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    Criando...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Criar Token
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
