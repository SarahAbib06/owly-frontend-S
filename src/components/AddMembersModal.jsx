// frontend/src/components/AddMembersModal.jsx
import { useState, useEffect } from 'react';
import { X, UserPlus, Loader2, Search } from 'lucide-react';

export default function AddMembersModal({ groupId, currentMembers, onClose, onMembersAdded }) {
  const [contacts, setContacts] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Charger les contacts (qui ne sont PAS déjà dans le groupe)
  useEffect(() => {
    const fetchAvailableContacts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // 1. Récupérer TOUS mes contacts
        const res = await fetch('http://localhost:5000/api/relations/contacts', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const allContacts = await res.json();
        
        console.log('📋 Contacts bruts reçus:', allContacts.length);
        
        // 🔥 DÉDOUBLONNAGE : Utiliser un Map pour garantir l'unicité
        const uniqueContactsMap = new Map();
        allContacts.forEach(contact => {
          const contactId = String(contact._id || contact.id);
          // Garder seulement la première occurrence de chaque ID
          if (!uniqueContactsMap.has(contactId)) {
            uniqueContactsMap.set(contactId, contact);
          }
        });
        
        const uniqueContacts = Array.from(uniqueContactsMap.values());
        console.log('✅ Contacts uniques:', uniqueContacts.length);
        
        // 2. Filtrer ceux qui ne sont PAS déjà dans le groupe
        const currentMemberIds = currentMembers.map(m => String(m.id || m._id));
        
        const available = uniqueContacts.filter(contact => {
          const contactId = String(contact._id || contact.id);
          const isAlreadyMember = currentMemberIds.includes(contactId);
          return !isAlreadyMember;
        });
        
        console.log('✅ Contacts disponibles (non membres):', available.length);
        setContacts(available);
        
      } catch (err) {
        console.error('❌ Erreur chargement contacts:', err);
        alert('Erreur lors du chargement des contacts');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableContacts();
  }, [currentMembers]);

  // Toggle sélection
  const toggleSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Ajouter les membres sélectionnés
  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      alert('Sélectionnez au moins un contact');
      return;
    }

    try {
      setAdding(true);
      const token = localStorage.getItem('token');
      
      console.log('📤 Envoi requête ajout membres:', {
        groupId,
        userIds: selectedUsers
      });
      
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userIds: selectedUsers })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'ajout');
      }

      console.log('✅ Membres ajoutés avec succès');
      
      // Callback pour rafraîchir la liste
      if (onMembersAdded) {
        onMembersAdded();
      }
      
      onClose();
      
    } catch (err) {
      console.error('❌ Erreur ajout membres:', err);
      alert(err.message || 'Erreur lors de l\'ajout des membres');
    } finally {
      setAdding(false);
    }
  };

  // Filtrer par recherche
  const filteredContacts = contacts.filter(contact =>
    contact.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-blue-500" />
            <h2 className="text-lg font-bold">Ajouter des membres</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="p-4 border-b dark:border-neutral-700">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Liste des contacts */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="animate-spin mx-auto mb-2" size={32} />
              <p className="text-sm text-gray-600">Chargement...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Aucun contact trouvé' 
                  : 'Tous vos contacts sont déjà dans ce groupe'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map(contact => {
                const contactId = contact._id || contact.id;
                const isSelected = selectedUsers.includes(contactId);
                
                return (
                  <div
                    key={contactId}
                    onClick={() => toggleSelection(contactId)}
                    className={`
                      flex items-center justify-between p-3 rounded-xl cursor-pointer transition
                      ${isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                        : 'hover:bg-gray-100 dark:hover:bg-neutral-700'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={contact.profilePicture || '/default-avatar.png'} 
                        alt={contact.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-sm">{contact.username}</p>
                        <p className="text-xs text-gray-500">Contact</p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-neutral-700 bg-gray-50 dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedUsers.length} membre{selectedUsers.length > 1 ? 's' : ''} sélectionné{selectedUsers.length > 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-neutral-600 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleAddMembers}
              disabled={selectedUsers.length === 0 || adding}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {adding ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Ajout...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Ajouter ({selectedUsers.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}