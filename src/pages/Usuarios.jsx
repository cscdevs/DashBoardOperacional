import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Mail, User, Shield, Check, AlertTriangle, KeyRound, RotateCcw, Layers, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
  fetchUsersAPI, createUserAPI, updateUserAPI, deleteUserAPI, redefinirSenhaAPI,
  fetchPerfisAPI, createPerfilAPI, updatePerfilAPI, deletePerfilAPI,
} from '../services/api';
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
  const [perfis, setPerfis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados dos Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPerfisModalOpen, setIsPerfisModalOpen] = useState(false);

  // Dados do formulário de usuário
  const [editingUserId, setEditingUserId] = useState(null); // null = Criando, string = Editando
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    allowedReports: [],
  });
  // Seleção única do "Perfil de Acesso": '__admin__', '__custom__' ou o id de um perfil.
  const [acessoSel, setAcessoSel] = useState('__custom__');

  const [userToDelete, setUserToDelete] = useState(null);
  const [userToReset, setUserToReset] = useState(null);

  // Formulário de perfil (dentro do modal de gestão de perfis)
  const [editingPerfilId, setEditingPerfilId] = useState(null);
  const [perfilForm, setPerfilForm] = useState({ name: '', allowedReports: [] });
  const [perfilError, setPerfilError] = useState('');
  const [confirmarPerfilId, setConfirmarPerfilId] = useState(null); // exclusão de perfil

  useEffect(() => {
    carregarTudo();
  }, []);

  const carregarTudo = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [dataUsers, dataPerfis] = await Promise.all([fetchUsersAPI(), fetchPerfisAPI()]);
      setUsers(dataUsers);
      setPerfis(dataPerfis);
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  /* -------- Usuários -------- */
  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormData({ name: '', email: '', role: 'user', allowedReports: [] });
    setAcessoSel('__custom__');
    setError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (u) => {
    setEditingUserId(u.id);
    setFormData({
      name: u.name,
      email: u.email,
      role: u.role,
      allowedReports: u.allowedReports || [],
    });
    // Descobre qual opção do dropdown representa o acesso atual do usuário.
    if (u.role === 'admin') {
      setAcessoSel('__admin__');
    } else {
      const igual = perfis.find((p) => mesmosRelatorios(p.allowedReports, u.allowedReports || []));
      setAcessoSel(igual ? igual.id : '__custom__');
    }
    setError('');
    setIsFormModalOpen(true);
  };

  // Troca única do "Perfil de Acesso": Administrador, um perfil (copia os
  // relatórios) ou Personalizado (mantém o que estiver marcado, ajuste avulso).
  const handleAcessoChange = (valor) => {
    setAcessoSel(valor);
    if (valor === '__admin__') {
      setFormData((prev) => ({ ...prev, role: 'admin' }));
    } else if (valor === '__custom__') {
      setFormData((prev) => ({ ...prev, role: 'user' }));
    } else {
      const perfil = perfis.find((p) => p.id === valor);
      setFormData((prev) => ({ ...prev, role: 'user', allowedReports: perfil ? [...perfil.allowedReports] : prev.allowedReports }));
    }
  };

  const handleToggleReport = (reportKey) => {
    setAcessoSel('__custom__'); // ajuste avulso deixa de ser "um perfil puro"
    setFormData((prev) => {
      const allowed = [...prev.allowedReports];
      const idx = allowed.indexOf(reportKey);
      if (idx > -1) allowed.splice(idx, 1);
      else allowed.push(reportKey);
      return { ...prev, allowedReports: allowed };
    });
  };

  const handleSelectAllReports = () => {
    setAcessoSel('__custom__');
    setFormData((prev) => {
      const allKeys = DISPONIVEIS_RELATORIOS.map((r) => r.key);
      const isAllSelected = prev.allowedReports.length === allKeys.length;
      return { ...prev, allowedReports: isAllSelected ? [] : allKeys };
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) return setError('Nome é obrigatório.');
    if (!formData.email.trim()) return setError('Usuário/E-mail é obrigatório.');

    try {
      if (editingUserId) {
        const updated = await updateUserAPI(editingUserId, formData);
        setUsers((prev) => prev.map((u) => (u.id === editingUserId ? updated : u)));
        setSuccessMsg(`Usuário "${updated.name}" atualizado com sucesso.`);
      } else {
        const created = await createUserAPI(formData);
        setUsers((prev) => [...prev, created]);
        setSuccessMsg(`Usuário "${created.name}" cadastrado. Senha inicial: csc123.`);
      }
      setIsFormModalOpen(false);
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao salvar o usuário.');
    }
  };

  const handleOpenDeleteModal = (u) => {
    setUserToDelete(u);
    setError('');
    setIsDeleteModalOpen(true);
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

  const handleOpenResetModal = (u) => {
    setUserToReset(u);
    setError('');
    setIsResetModalOpen(true);
  };

  const handleResetConfirm = async () => {
    if (!userToReset) return;
    setError('');
    try {
      await redefinirSenhaAPI(userToReset.id);
      setUsers((prev) => prev.map((u) => (u.id === userToReset.id ? { ...u, mustChangePassword: true } : u)));
      setSuccessMsg(`Senha de "${userToReset.name}" redefinida para csc123. Ele deverá trocá-la no próximo acesso.`);
      setIsResetModalOpen(false);
    } catch (err) {
      setError(err.message || 'Erro ao redefinir a senha.');
    }
  };

  /* -------- Perfis -------- */
  const resetPerfilForm = () => {
    setEditingPerfilId(null);
    setPerfilForm({ name: '', allowedReports: [] });
    setPerfilError('');
  };

  const handleTogglePerfilReport = (reportKey) => {
    setPerfilForm((prev) => {
      const allowed = [...prev.allowedReports];
      const idx = allowed.indexOf(reportKey);
      if (idx > -1) allowed.splice(idx, 1);
      else allowed.push(reportKey);
      return { ...prev, allowedReports: allowed };
    });
  };

  const handleEditPerfil = (p) => {
    setEditingPerfilId(p.id);
    setPerfilForm({ name: p.name, allowedReports: [...p.allowedReports] });
    setPerfilError('');
  };

  const handleSavePerfil = async (e) => {
    e.preventDefault();
    setPerfilError('');
    if (!perfilForm.name.trim()) return setPerfilError('Dê um nome ao perfil.');
    if (perfilForm.allowedReports.length === 0) return setPerfilError('Selecione ao menos um relatório.');

    try {
      if (editingPerfilId) {
        const updated = await updatePerfilAPI(editingPerfilId, perfilForm);
        setPerfis((prev) => prev.map((p) => (p.id === editingPerfilId ? updated : p)));
      } else {
        const created = await createPerfilAPI(perfilForm);
        setPerfis((prev) => [...prev, created]);
      }
      resetPerfilForm();
    } catch (err) {
      setPerfilError(err.message || 'Erro ao salvar o perfil.');
    }
  };

  const handleDeletePerfil = async (p) => {
    setPerfilError('');
    try {
      await deletePerfilAPI(p.id);
      setPerfis((prev) => prev.filter((x) => x.id !== p.id));
      if (editingPerfilId === p.id) resetPerfilForm();
      setConfirmarPerfilId(null);
    } catch (err) {
      setPerfilError(err.message || 'Erro ao excluir o perfil.');
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
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => { resetPerfilForm(); setIsPerfisModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}>
            <Plus size={20} /> Novo Perfil
          </Button>
          <Button onClick={handleOpenCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}>
            <Plus size={20} /> Novo Usuário
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div style={alertaStyle('success')}>
          <Check size={18} />
          {successMsg}
        </div>
      )}

      {error && !isFormModalOpen && !isDeleteModalOpen && !isResetModalOpen && (
        <div style={alertaStyle('danger')}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Grid de Usuários */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--gray-200)', borderTop: '4px solid var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div className="kanban-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))' }}>
          {users.map((u, idx) => (
            <Card
              key={u.id}
              className="stagger-item"
              style={{ '--delay': `${idx * 0.1}s`, display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: 'var(--glass-bg)', backdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', height: '100%' }}
            >
              {/* Topo do Card: Nome e Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: u.role === 'admin' ? 'var(--blue-50)' : 'var(--gray-100)', color: u.role === 'admin' ? 'var(--blue)' : 'var(--gray-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem' }}>
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

              {/* Perfil (Role) + Status da Senha */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 500 }}>Perfil:</span>
                <span style={{ backgroundColor: u.role === 'admin' ? 'var(--blue-50)' : 'var(--gray-100)', color: u.role === 'admin' ? 'var(--blue)' : 'var(--gray-500)', padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', fontWeight: 600 }}>
                  {u.role === 'admin' ? 'Administrador' : 'Usuário Comum'}
                </span>
                {u.mustChangePassword && (
                  <span title="Ainda está com a senha padrão csc123" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', padding: '0.2rem 0.5rem', fontSize: '0.72rem', borderRadius: '4px', fontWeight: 600 }}>
                    <KeyRound size={11} /> Senha padrão (csc123)
                  </span>
                )}
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

              {/* Ações */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={() => handleOpenResetModal(u)} title="Redefinir senha para csc123" style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  <RotateCcw size={14} /> Redefinir senha
                </Button>
                <Button variant="secondary" onClick={() => handleOpenEditModal(u)} style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  <Edit2 size={14} /> Editar
                </Button>
                <Button variant="danger" onClick={() => handleOpenDeleteModal(u)} disabled={currentUser?.id === u.id} style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', opacity: currentUser?.id === u.id ? 0.4 : 1, cursor: currentUser?.id === u.id ? 'not-allowed' : 'pointer' }} title={currentUser?.id === u.id ? 'Não é possível excluir seu próprio login ativo' : 'Excluir usuário'}>
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
            <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--danger-border)', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Nome */}
          <div>
            <label style={labelStyle}>Nome Completo</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={iconStyle} />
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: João da Silva" style={inputStyle} />
            </div>
          </div>

          {/* E-mail */}
          <div>
            <label style={labelStyle}>Usuário ou E-mail (Login)</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={iconStyle} />
              <input type="text" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Ex: joao.silva ou joao.silva@csc.com.br" style={inputStyle} />
            </div>
          </div>

          {/* Perfil de Acesso (unificado): Administrador, um perfil ou Personalizado */}
          <div>
            <label style={labelStyle}>Perfil de Acesso</label>
            <div style={{ position: 'relative' }}>
              <Shield size={18} style={iconStyle} />
              <select value={acessoSel} onChange={(e) => handleAcessoChange(e.target.value)} style={{ ...inputStyle, paddingLeft: '2.75rem', appearance: 'none', cursor: 'pointer' }}>
                <option value="__admin__">Administrador (acesso total)</option>
                {perfis.length > 0 && (
                  <optgroup label="Perfis">
                    {perfis.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.allowedReports.length} relatórios)</option>
                    ))}
                  </optgroup>
                )}
                <option value="__custom__">Personalizado (escolher relatórios)</option>
              </select>
            </div>
            {acessoSel !== '__admin__' && acessoSel !== '__custom__' && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                Traz os relatórios do perfil. Ajuste avulso abaixo se precisar.
              </p>
            )}
          </div>

          {/* Aviso senha padrão (somente na criação) */}
          {!editingUserId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--blue-50)', color: 'var(--blue)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 500 }}>
              <KeyRound size={16} />
              A senha inicial será <strong>&nbsp;csc123&nbsp;</strong>. O usuário será obrigado a defini-la no primeiro acesso.
            </div>
          )}

          {/* Permissões de Relatórios (quando não é Administrador) */}
          {acessoSel !== '__admin__' && (
            <div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>Relatórios Permitidos</label>
                <button type="button" onClick={handleSelectAllReports} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                  {formData.allowedReports.length === DISPONIVEIS_RELATORIOS.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: 'var(--gray-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                {DISPONIVEIS_RELATORIOS.map((r) => (
                  <label key={r.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--gray-700)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.allowedReports.includes(r.key)} onChange={() => handleToggleReport(r.key)} style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1px solid var(--gray-200)', cursor: 'pointer' }} />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1.25rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsFormModalOpen(false)} style={{ padding: '0.6rem 1.25rem' }}>Cancelar</Button>
            <Button type="submit" style={{ padding: '0.6rem 1.5rem' }}>Salvar Usuário</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Confirmar Exclusão */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} titulo="Confirmar Exclusão">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (<div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--danger-border)', fontSize: '0.85rem', fontWeight: 500 }}>{error}</div>)}
          <p style={{ color: 'var(--gray-700)', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Tem certeza de que deseja excluir permanentemente o usuário <strong>{userToDelete?.name}</strong> (<code>{userToDelete?.email}</code>)?
          </p>
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            Esta ação não pode ser desfeita e ele perderá imediatamente o acesso ao sistema.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1.25rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)} style={{ padding: '0.6rem 1.25rem' }}>Cancelar</Button>
            <Button type="button" variant="danger" onClick={handleDeleteConfirm} style={{ padding: '0.6rem 1.5rem' }}>Excluir Usuário</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Confirmar Redefinição de Senha */}
      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} titulo="Redefinir senha">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (<div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--danger-border)', fontSize: '0.85rem', fontWeight: 500 }}>{error}</div>)}
          <p style={{ color: 'var(--gray-700)', fontSize: '0.95rem', lineHeight: '1.5' }}>
            A senha de <strong>{userToReset?.name}</strong> voltará para <code>csc123</code>. No próximo acesso ele será obrigado a definir uma nova senha.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1.25rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsResetModalOpen(false)} style={{ padding: '0.6rem 1.25rem' }}>Cancelar</Button>
            <Button type="button" onClick={handleResetConfirm} style={{ padding: '0.6rem 1.5rem' }}>Redefinir para csc123</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Gerenciar Perfis de Acesso */}
      <Modal isOpen={isPerfisModalOpen} onClose={() => setIsPerfisModalOpen(false)} titulo="Perfis de Acesso">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.85rem' }}>
            Perfis são modelos de relatórios. Ao criar um usuário, você aplica um perfil para marcar vários de uma vez — e ainda pode ajustar avulso.
          </p>

          {/* Lista de perfis existentes */}
          {perfis.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {perfis.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--gray-200)', backgroundColor: 'var(--gray-50)', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: '1 1 160px' }}>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--gray-900)', fontSize: '0.9rem' }}>{p.name}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.allowedReports.map((rk) => DISPONIVEIS_RELATORIOS.find((r) => r.key === rk)?.label || rk).join(', ')}
                    </p>
                  </div>
                  {confirmarPerfilId === p.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 600 }}>Excluir?</span>
                      <button type="button" onClick={() => handleDeletePerfil(p)} style={{ ...acaoBtn, backgroundColor: 'var(--danger)', color: '#fff' }}>
                        <Check size={14} /> Sim
                      </button>
                      <button type="button" onClick={() => setConfirmarPerfilId(null)} style={acaoBtn}>
                        <X size={14} /> Não
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      <button type="button" onClick={() => handleEditPerfil(p)} style={acaoBtn}>
                        <Edit2 size={14} /> Editar
                      </button>
                      <button type="button" onClick={() => setConfirmarPerfilId(p.id)} style={{ ...acaoBtn, color: 'var(--danger)' }}>
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--gray-400)', fontSize: '0.85rem' }}>Nenhum perfil criado ainda.</p>
          )}

          {/* Formulário de criar/editar perfil */}
          <form onSubmit={handleSavePerfil} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--gray-900)' }}>{editingPerfilId ? 'Editar perfil' : 'Novo perfil'}</h3>
              {editingPerfilId && (
                <button type="button" onClick={resetPerfilForm} style={{ background: 'none', border: 'none', color: 'var(--gray-500)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <X size={14} /> cancelar edição
                </button>
              )}
            </div>

            {perfilError && (
              <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid var(--danger-border)', fontSize: '0.82rem', fontWeight: 500 }}>{perfilError}</div>
            )}

            <div>
              <label style={labelStyle}>Nome do perfil</label>
              <div style={{ position: 'relative' }}>
                <Layers size={18} style={iconStyle} />
                <input type="text" value={perfilForm.name} onChange={(e) => setPerfilForm({ ...perfilForm, name: e.target.value })} placeholder="Ex: Supervisão de Campo" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', backgroundColor: 'var(--gray-50)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
              {DISPONIVEIS_RELATORIOS.map((r) => (
                <label key={r.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem', color: 'var(--gray-700)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={perfilForm.allowedReports.includes(r.key)} onChange={() => handleTogglePerfilReport(r.key)} style={{ width: '18px', height: '18px', borderRadius: '4px', cursor: 'pointer' }} />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" style={{ padding: '0.55rem 1.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {editingPerfilId ? <><Check size={16} /> Salvar perfil</> : <><Plus size={16} /> Criar perfil</>}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

/* Estilos compartilhados */
const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem 0.75rem 2.75rem',
  borderRadius: '6px',
  border: '1px solid var(--gray-200)',
  fontSize: '0.875rem',
  fontFamily: 'Montserrat, sans-serif',
  outline: 'none',
  backgroundColor: 'var(--gray-50)',
  color: 'var(--gray-900)',
  transition: 'border-color 0.2s ease',
};

// Compara dois conjuntos de relatórios ignorando a ordem.
const mesmosRelatorios = (a = [], b = []) => a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');

const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' };
const iconStyle = { position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' };
const acaoBtn = { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.7rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--gray-100)', color: 'var(--gray-700)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'Montserrat, sans-serif' };

const alertaStyle = (tipo) => ({
  backgroundColor: tipo === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
  color: tipo === 'success' ? 'var(--success)' : 'var(--danger)',
  padding: '1rem',
  borderRadius: '8px',
  border: `1px solid ${tipo === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  fontSize: '0.9rem',
  fontWeight: 500,
  animation: 'fadeIn 0.2s ease',
});
