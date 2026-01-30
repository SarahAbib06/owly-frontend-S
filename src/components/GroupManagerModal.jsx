// frontend/src/components/GroupManagerModal.jsx
// 🔥 VERSION AVEC PROMOTION ADMIN + QUITTER LE GROUPE

import { useState, useEffect, useRef } from 'react';
import { Users, UserPlus, UserMinus, Crown, X, Edit2, Camera, Save, LogOut, Shield } from 'lucide-react';
import AddMembersModal from './AddMembersModal';

export default function GroupManagerModal({ groupId, myRole, members, onClose, onMembersUpdated }) {
  const [groupMembers, setGroupMembers] = useState(members || []);
  const [loading, setLoading] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  //promotion
   // 🆕 MODAL PROMOTION
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [memberToPromote, setMemberToPromote] = useState(null);
  const [promoting, setPromoting] = useState(false);
  
  // 🆕 ÉDITION GROUPE
  const [isEditing, setIsEditing] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState('');
  const [editedGroupDescription, setEditedGroupDescription] = useState('');
  const [newGroupPic, setNewGroupPic] = useState(null);
  const [groupPicPreview, setGroupPicPreview] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const fileInputRef = useRef(null);
  const currentUserId = localStorage.getItem('userId');

  // 🆕 COMPTER LES ADMINS
  const adminCount = groupMembers.filter(m => m.role === 'admin').length;
  const isLastAdmin = myRole === 'admin' && adminCount === 1;

  // Charger infos du groupe
  const fetchGroupInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/conversations/${groupId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setGroupInfo(data.conversation);
        setEditedGroupName(data.conversation.groupName || data.conversation.name || '');
        setEditedGroupDescription(data.conversation.groupDescription || '');
        setGroupPicPreview(data.conversation.groupPic || null);
      }
    } catch (err) {
      console.error("❌ Erreur chargement groupe:", err);
    }
  };

  // Recharger les membres
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setGroupMembers(data.members || []);
      }
    } catch (err) {
      console.error("❌ Erreur chargement membres:", err);
    } finally {
      setLoading(false);
    }
  };
  // 🆕 OUVRIR MODAL PROMOTION
  const openPromoteModal = (member) => {
    setMemberToPromote(member);
    setShowPromoteModal(true);
  };

  // 🆕 CONFIRMER PROMOTION
  const confirmPromoteToAdmin = async () => {
    if (!memberToPromote) return;
    
    try {
      setPromoting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/members/${memberToPromote.id}/promote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        console.log('✅ Membre promu admin');
        await fetchMembers();
        if (onMembersUpdated) onMembersUpdated();
        setShowPromoteModal(false);
        setMemberToPromote(null);
      } else {
        throw new Error(data.error || 'Erreur');
      }
    } catch (err) {
      console.error("❌ Erreur promotion:", err);
      alert(err.message);
    } finally {
      setPromoting(false);
    }
  };

  // 🆕 PROMOUVOIR EN ADMIN
  const handlePromoteToAdmin = async (userId) => {
    if (!window.confirm("Promouvoir ce membre en administrateur ?")) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/members/${userId}/promote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        console.log('✅ Membre promu admin');
        await fetchMembers();
        if (onMembersUpdated) onMembersUpdated();
        alert('✅ Membre promu administrateur');
      } else {
        throw new Error(data.error || 'Erreur');
      }
    } catch (err) {
      console.error("❌ Erreur promotion:", err);
      alert(err.message);
    }
  };

  // 🆕 QUITTER LE GROUPE
  const handleLeaveGroup = async () => {
    if (isLastAdmin) {
      alert('⚠️ Vous êtes le seul admin. Promouvez un autre membre en admin avant de quitter.');
      return;
    }

    if (!window.confirm("Êtes-vous sûr de vouloir quitter ce groupe ?")) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/leave`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert('✅ Vous avez quitté le groupe');
        onClose();
        if (onMembersUpdated) onMembersUpdated();
        window.location.reload(); // Recharge pour mettre à jour la liste
      } else {
        throw new Error(data.error || 'Erreur');
      }
    } catch (err) {
      console.error("❌ Erreur quitter groupe:", err);
      alert(err.message);
    }
  };

  // 🆕 SAUVEGARDER MODIFICATIONS DU GROUPE
  const handleSaveGroupInfo = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('groupName', editedGroupName);
      formData.append('groupDescription', editedGroupDescription);
      
      if (newGroupPic) {
        formData.append('groupPic', newGroupPic);
      }

      const res = await fetch(`http://localhost:5000/api/groups/${groupId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.success) {
        console.log('✅ Groupe modifié');
        
        setGroupInfo(prev => ({
          ...prev,
          groupName: data.group.groupName,
          groupDescription: data.group.groupDescription,
          groupPic: data.group.groupPic
        }));
        
        setGroupPicPreview(data.group.groupPic);
        setNewGroupPic(null);
        setIsEditing(false);
        
        if (onMembersUpdated) onMembersUpdated();
        
        alert('✅ Groupe modifié avec succès');
      } else {
        throw new Error(data.error || 'Erreur');
      }
    } catch (err) {
      console.error("❌ Erreur sauvegarde groupe:", err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // 🆕 SÉLECTION IMAGE
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image trop volumineuse (max 5MB)');
      return;
    }

    setNewGroupPic(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setGroupPicPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Supprimer un membre
  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Retirer ce membre du groupe ?")) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        console.log('✅ Membre retiré');
        await fetchMembers();
        if (onMembersUpdated) onMembersUpdated();
      } else {
        throw new Error(data.error || 'Erreur');
      }
    } catch (err) {
      console.error("❌ Erreur suppression membre:", err);
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchGroupInfo();
  }, [groupId]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
          
          {/* 🔥 HEADER */}
          <div className="flex items-center justify-between p-4 border-b dark:border-neutral-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-myYellow" />
              <h2 className="text-lg font-bold">
                {isEditing ? 'Modifier le groupe' : `Groupe (${groupMembers.length} membres)`}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && myRole === 'admin' && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full transition"
                  title="Modifier le groupe"
                >
                  <Edit2 size={18} className="text-myYellow" />
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* 🆕 MODE ÉDITION */}
          {isEditing ? (
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Photo du groupe */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img 
                    src={groupPicPreview || '/group-avatar.png'}
                    className="w-24 h-24 rounded-full object-cover border-4 border-myYellow"
                    alt="Groupe"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-myYellow text-white p-2 rounded-full hover:bg-blue-600 transition shadow-lg"
                  >
                    <Camera size={16} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
                {newGroupPic && (
                  <p className="text-xs text-green-600">✓ Nouvelle image sélectionnée</p>
                )}
              </div>

              {/* Nom du groupe */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nom du groupe
                </label>
                <input
                  type="text"
                  value={editedGroupName}
                  onChange={(e) => setEditedGroupName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 focus:ring-2 focus:ring-myYellow outline-none"
                  placeholder="Nom du groupe"
                  maxLength={50}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (optionnelle)
                </label>
                <textarea
                  value={editedGroupDescription}
                  onChange={(e) => setEditedGroupDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 focus:ring-2 focus:ring-myYellow outline-none resize-none"
                  placeholder="Description du groupe"
                  rows={3}
                  maxLength={200}
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setNewGroupPic(null);
                    setEditedGroupName(groupInfo?.groupName || '');
                    setEditedGroupDescription(groupInfo?.groupDescription || '');
                    setGroupPicPreview(groupInfo?.groupPic || null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-neutral-700 rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-600 transition"
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveGroupInfo}
                  disabled={saving || !editedGroupName.trim()}
                  className="flex-1 px-4 py-2 bg-myYellow text-white rounded-lg hover:bg-myYellow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Sauvegarder
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* MODE VISUALISATION */
            <>
              {/* Info groupe */}
              {groupInfo && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-neutral-700 dark:to-neutral-800 border-b dark:border-neutral-700 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <img 
                      src={groupInfo.groupPic || '/group-avatar.png'}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-neutral-600 shadow-md"
                      alt={groupInfo.groupName}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">
                        {groupInfo.groupName || groupInfo.name}
                      </h3>
                      {groupInfo.groupDescription && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {groupInfo.groupDescription}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 🆕 BANNIÈRE DERNIER ADMIN */}
              {isLastAdmin && (
                <div className="mx-4 mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    ⚠️ Vous êtes le seul administrateur. Promouvez un autre membre avant de quitter le groupe.
                  </p>
                </div>
              )}

              {/* Liste membres */}
              <div className="p-4 overflow-y-auto flex-1">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-myYellow mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Chargement...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupMembers.map(member => (
                      <div 
                        key={member.id} 
                        className="flex items-center justify-between p-3 bg-gray-100 dark:bg-neutral-700 rounded-xl hover:bg-gray-200 dark:hover:bg-neutral-600 transition"
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={member.profilePicture || '/default-avatar.png'} 
                            className="w-12 h-12 rounded-full object-cover"
                            alt={member.username}
                          />
                          <div>
                            <p className="font-medium text-sm">{member.username}</p>
                            {member.role === 'admin' && (
                              <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1 mt-1">
                                <Crown size={12} /> Administrateur
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions admin */}
                        {myRole === 'admin' && member.id !== currentUserId && (
                          <div className="flex items-center gap-2">
                            {/* Promouvoir en admin */}
                            {member.role !== 'admin' && (
  <button 
    onClick={() => openPromoteModal(member)}  
    className="p-2 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 rounded-full transition"
    title="Promouvoir en admin"
  >
    <Shield size={18} />
  </button>
)}
                            
                            {/* Retirer du groupe */}
                            {member.role !== 'admin' && (
                              <button 
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition"
                                title="Retirer du groupe"
                              >
                                <UserMinus size={18} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t dark:border-neutral-700 flex-shrink-0 space-y-2">
                {/* Ajouter membre (admin only) */}
                {myRole === 'admin' && (
                  <button 
                    onClick={() => setShowAddMembersModal(true)}
                    className="w-full bg-myYellow hover:bg-myYellow text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition"
                  >
                    <UserPlus size={18} />
                    Ajouter des membres
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
{/* 🆕 MODAL PROMOTION ADMIN - STYLE MINIMALISTE */}
{showPromoteModal && memberToPromote && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6 text-center max-w-sm w-full">
      
      {/* Avatar */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          <img 
            src={memberToPromote.profilePicture || '/default-avatar.png'} 
            className="w-20 h-20 rounded-full object-cover"
            alt={memberToPromote.username}
          />
          <div className="absolute -bottom-1 -right-1 bg-yellow-500 p-1.5 rounded-full border-2 border-white dark:border-neutral-900">
            <Crown size={16} className="text-white" />
          </div>
        </div>
      </div>

      {/* Titre */}
      <h2 className="text-xl font-semibold mb-2">
        Promouvoir {memberToPromote.username} ?
      </h2>

      {/* Description */}
      <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
        Ce membre deviendra administrateur et pourra gérer le groupe, ajouter/retirer des membres et promouvoir d'autres admins.
      </p>

      {/* Boutons */}
      <div className="flex justify-between gap-4 mt-6">
        <button
          onClick={() => {
            setShowPromoteModal(false);
            setMemberToPromote(null);
          }}
          disabled={promoting}
          className="w-1/2 py-2 rounded-lg bg-gray-300 dark:bg-neutral-700 text-black dark:text-white font-semibold text-sm hover:bg-gray-400 dark:hover:bg-neutral-600 transition disabled:opacity-50"
        >
          Annuler
        </button>

        <button
          onClick={confirmPromoteToAdmin}
          disabled={promoting}
          className="w-1/2 py-2 rounded-lg bg-myYellow text-white font-semibold text-sm hover:bg-myYellow2 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {promoting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>En cours...</span>
            </>
          ) : (
            'Promouvoir'
          )}
        </button>
      </div>

    </div>
  </div>
)}

      {/* Modal ajout membres */}
      {showAddMembersModal && (
        <AddMembersModal
          groupId={groupId}
          currentMembers={groupMembers}
          onClose={() => setShowAddMembersModal(false)}
          onMembersAdded={() => {
            setShowAddMembersModal(false);
            fetchMembers();
            if (onMembersUpdated) onMembersUpdated();
          }}
        />
      )}
    </>
  );
}