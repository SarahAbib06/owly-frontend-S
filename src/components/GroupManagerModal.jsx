// frontend/src/components/GroupManagerModal.jsx
import { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, Crown, X } from 'lucide-react';
import AddMembersModal from './AddMembersModal';

export default function GroupManagerModal({ groupId, myRole, members, onClose, onMembersUpdated }) {
  const [groupMembers, setGroupMembers] = useState(members || []);
  const [loading, setLoading] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);

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
        await fetchMembers(); // Refresh
        if (onMembersUpdated) onMembersUpdated();
      } else {
        throw new Error(data.error || 'Erreur');
      }
    } catch (err) {
      console.error("❌ Erreur suppression membre:", err);
      alert(err.message);
    }
  };

  // Ouvrir le modal d'ajout de membres
  const handleAddMembers = () => {
    setShowAddMembersModal(true);
  };

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-blue-500" />
              <h2 className="text-lg font-bold">
                Membres du groupe ({groupMembers.length})
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Liste membres */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
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

                    {/* Bouton retirer (admin only + pas sur soi-même + pas sur autre admin) */}
                    {myRole === 'admin' && member.role !== 'admin' && member.id !== localStorage.getItem('userId') && (
                      <button 
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition"
                        title="Retirer du groupe"
                      >
                        <UserMinus size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Bouton ajouter membre (admin only) */}
          {myRole === 'admin' && (
            <div className="p-4 border-t dark:border-neutral-700">
              <button 
                onClick={handleAddMembers}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition"
              >
                <UserPlus size={18} />
                Ajouter des membres
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🆕 MODAL D'AJOUT DE MEMBRES */}
      {showAddMembersModal && (
        <AddMembersModal
          groupId={groupId}
          currentMembers={groupMembers}
          onClose={() => setShowAddMembersModal(false)}
          onMembersAdded={() => {
            setShowAddMembersModal(false);
            fetchMembers(); // Recharge la liste des membres
            if (onMembersUpdated) onMembersUpdated(); // Notifie le parent
          }}
        />
      )}
    </>
  );
}