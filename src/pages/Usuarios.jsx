import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Mail, User, Shield, Key, Check, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { fetchUsersAPI, createUserAPI, updateUserAPI, deleteUserAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DISPONIVEIS_RELATORIOS = [
  { key: 'rotas-supervisao', label: 'Rotas de Supervisão' },
  { key: 'fluxo-atestados-faltas', label: 'Fluxo de Atestados / Faltas' },
  { key: 'geracao-cartao-ponto', label: 'Geração de Cartão de Ponto' },
  { key: 'posto-descoberto', label: 'Posto Descoberto' },
  { key: 'quadro-operacional', label: 'Quadro Operacional' },
];

export const Usuarios = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados dos Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Dados do formulário
  const [editingUserId, setEditingUserId] = useState(null); // null = Criando, string = Editando
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    allowedReports: [],
  });

  // Usuário a ser excluído
  const [userToDelete, setUserToDelete] = useState(null);

  // Carrega os usuários no mount
  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchUsersAPI();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Erro ao carregar lista de usuários.');
    } finally {
      setIsLoading(false);
    }
  };

  // Temporizador para limpar alertas de sucesso
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      allowedReports: [],
    });
    setError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (u) => {
    setEditingUserId(u.id);
    setFormData({
      name: u.name,
      email: u.email,
      password: '', // Senha vazia para não alterar por padrão
      role: u.role,
      allowedReports: u.allowedReports || [],
    });
    setError('');
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteModal = (u) => {
    setUserToDelete(u);
    setError('');
    setIsDeleteModalOpen(true);
  };

  const handleToggleReport = (reportKey) => {
    setFormData((prev) => {
      const allowed = [...prev.allowedReports];
      const idx = allowed.indexOf(reportKey);
      if (idx > -1) {
        allowed.splice(idx, 1);
      } else {
        allowed.push(reportKey);
      }
      return { ...prev, allowedReports: allowed };
    });
  };

  const handleSelectAllReports = () => {
    setFormData((prev) => {
      const allKeys = DISPONIVEIS_RELATORIOS.map((r) => r.key);
      const isAllSelected = prev.allowedReports.length === allKeys.length;
      return {
        ...prev,
        allowedReports: isAllSelected ? [] : allKeys,
      };
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setError('');

    // Validações básicas
    if (!formData.name.trim()) return setError('Nome é obrigatório.');
    if (!formData.email.trim()) return setError('E-mail é obrigatório.');
    if (!editingUserId && !formData.password) return setError('Senha é obrigatória para novos usuários.');

    try {
      if (editingUserId) {
        // Modo Edição
        const updated = await updateUserAPI(editingUserId, formData);
        setUsers((prev) => prev.map((u) => (u.id === editingUserId ? updated : u)));
        setSuccessMsg(`Usuário "${updated.name}" atualizado com sucesso.`);
      } else {
        // Modo Criação
        const created = await createUserAPI(formData);
        setUsers((prev) => [...prev, created]);
        setSuccessMsg(`Usuário "${created.name}" cadastrado com sucesso.`);
      }
      setIsFormModalOpen(false);
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao salvar o usuário.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setError('');
    try {
      await deleteUserAPI(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setSuccessMsg(`Usuário "${userToDelete.name}" excluído com sucesso.`);
      setIsDeleteModalOpen(false);
    } catch (err) {
      setError(err.message || 'Erro ao excluir usuário.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Cabeçalho com Ações */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--gray-900)', margin: 0 }}>Gestão de Usuários</h1>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem' }}>
            Gerencie credenciais de acesso e atribua permissões de visualização para cada relatório.
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}>
          <Plus size={20} /> Novo Usuário
        </Button>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div style={{
          backgroundColor: 'var(--success-bg)',
          color: 'var(--success)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--success-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.9rem',
          fontWeight: 500,
          animation: 'fadeIn 0.2s ease'
        }}>
          <Check size={18} />
          {successMsg}
        </div>
      )}

      {error && !isFormModalOpen && !isDeleteModalOpen && (
        <div style={{
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--danger-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.9rem',
          fontWeight: 500,
          animation: 'fadeIn 0.2s ease'
        }}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Grid de Usuários */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--gray-200)',
            borderTop: '4px solid var(--blue)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      ) : (
        <div className="kanban-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {users.map((u, idx) => (
            <Card
              key={u.id}
              className="stagger-item"
              style={{
                '--delay': `${idx * 0.1}s`,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                backgroundColor: 'var(--glass-bg)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--glass-border)',
                height: '100%'
              }}
            >
              {/* Topo do Card: Nome e Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: u.role === 'admin' ? 'var(--blue-50)' : 'var(--gray-100)',
                  color: u.role === 'admin' ? 'var(--blue)' : 'var(--gray-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.25rem'
                }}>
                  {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '1.1rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--gray-500)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
                    <Mail size={12} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                  </div>
                </div>
              </div>

              {/* Perfil (Role) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 500 }}>Perfil:</span>
                <span className={`status-badge ${u.role === 'admin' ? 'success' : 'neutral'}`} style={{
                  backgroundColor: u.role === 'admin' ? 'var(--blue-50)' : 'var(--gray-100)',
                  color: u.role === 'admin' ? 'var(--blue)' : 'var(--gray-500)',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.75rem',
                  borderRadius: '4px',
                  fontWeight: 600
                }}>
                  {u.role === 'admin' ? 'Administrador' : 'Usuário Comum'}
                </span>
              </div>

              {/* Relatórios Permitidos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 500 }}>Relatórios Permitidos ({u.role === 'admin' ? 'Todos' : u.allowedReports?.length || 0}):</span>
                {u.role === 'admin' ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--blue-50)', color: 'var(--blue)', borderRadius: '4px', fontWeight: 500 }}>
                      Acesso Irrestrito (Admin)
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {u.allowedReports && u.allowedReports.length > 0 ? (
                      u.allowedReports.map((rk) => {
                        const rel = DISPONIVEIS_RELATORIOS.find((r) => r.key === rk);
                        return (
                          <span key={rk} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--gray-100)', color: 'var(--gray-700)', borderRadius: '4px', fontWeight: 500 }}>
                            {rel ? rel.label : rk}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                        Nenhum relatório permitido
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Ações de Edição e Exclusão */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1rem', marginTop: 'auto' }}>
                <Button
                  variant="secondary"
                  onClick={() => handleOpenEditModal(u)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  <Edit2 size={14} /> Editar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleOpenDeleteModal(u)}
                  disabled={currentUser?.id === u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                    opacity: currentUser?.id === u.id ? 0.4 : 1,
                    cursor: currentUser?.id === u.id ? 'not-allowed' : 'pointer'
                  }}
                  title={currentUser?.id === u.id ? 'Não é possível excluir seu próprio login ativo' : 'Excluir usuário'}
                >
                  <Trash2 size={14} /> Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL: Criar / Editar Usuário */}
      <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} titulo={editingUserId ? 'Editar Usuário' : 'Novo Usuário'}>
        <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--danger-border)',
              fontSize: '0.85rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Nome */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
              Nome Completo
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João da Silva"
                style={inputStyle}
              />
            </div>
          </div>

          {/* E-mail */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
              Usuário ou E-mail (Login)
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                type="text"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: joao.silva ou joao.silva@csc.com.br"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Perfil */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
              Perfil de Acesso
            </label>
            <div style={{ position: 'relative' }}>
              <Shield size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={{ ...inputStyle, paddingLeft: '2.75rem', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="user">Usuário Comum (Visualizador)</option>
                <option value="admin">Administrador (Controle Total)</option>
              </select>
            </div>
          </div>

          {/* Senha */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
              Senha {editingUserId && '(Deixe em branco para manter)'}
            </label>
            <div style={{ position: 'relative' }}>
              <Key size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                type="password"
                required={!editingUserId}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUserId ? "••••••••" : "Digite a senha de acesso"}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Permissões de Relatórios (Apenas se não for admin) */}
          {formData.role !== 'admin' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                  Atribuir Relatórios Permitidos
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllReports}
                  style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {formData.allowedReports.length === DISPONIVEIS_RELATORIOS.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                {DISPONIVEIS_RELATORIOS.map((r) => {
                  const isChecked = formData.allowedReports.includes(r.key);
                  return (
                    <label key={r.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--gray-700)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleReport(r.key)}
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: '1px solid var(--gray-300)',
                          cursor: 'pointer',
                        }}
                      />
                      <span>{r.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rodapé Ações */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1.25rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsFormModalOpen(false)} style={{ padding: '0.6rem 1.25rem' }}>
              Cancelar
            </Button>
            <Button type="submit" style={{ padding: '0.6rem 1.5rem' }}>
              Salvar Usuário
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Confirmar Exclusão */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} titulo="Confirmar Exclusão">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--danger-border)',
              fontSize: '0.85rem',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <p style={{ color: 'var(--gray-700)', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Tem certeza de que deseja excluir permanentemente o usuário <strong>{userToDelete?.name}</strong> (<code>{userToDelete?.email}</code>)?
          </p>
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            Esta ação não pode ser desfeita e ele perderá imediatamente o acesso ao sistema.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1.25rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)} style={{ padding: '0.6rem 1.25rem' }}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteConfirm} style={{ padding: '0.6rem 1.5rem' }}>
              Excluir Usuário
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Estilo padronizado de inputs
const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem 0.75rem 2.75rem',
  borderRadius: '6px',
  border: '1px solid var(--gray-200)',
  fontSize: '0.875rem',
  fontFamily: 'Montserrat, sans-serif',
  outline: 'none',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  color: 'var(--gray-900)',
  transition: 'border-color 0.2s ease',
};
