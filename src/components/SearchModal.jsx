// src/components/SearchModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, User, MessageCircle, QrCode, Camera, Upload, UserCheck, Users, Image, Plus } from 'lucide-react';
import jsQR from 'jsqr';
import { useTranslation } from 'react-i18next';
import { getApiUrl } from '../utils/apiUrl';


const SearchModal = ({ onClose, onUserSelect, loadConversations }) => {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [error, setError] = useState('');
  
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // 🔥 NOUVEAUX STATES POUR GROUPE
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPic, setGroupPic] = useState(null);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // 🔥 CHARGEMENT DES CONTACTS AU DÉMARRAGE
const fetchContacts = async () => {
  try {
    setLoadingContacts(true);
    const token = localStorage.getItem('token');
    
const response = await api.get('/relations/contacts');
    
    if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
    
    const data = await response.json();
    console.log('📊 Contacts reçus:', data);
    
    // 🔥 DEBUG : Afficher les IDs pour voir les doublons
    console.log('🔍 IDs des contacts:', data.map(c => c._id));
    
    // 🔥 DÉDOUBLONNAGE CÔTÉ FRONTEND (au cas où backend échoue)
    const uniqueContacts = [];
    const seenIds = new Set();
    
    for (const contact of data) {
      const id = contact._id || contact.id;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueContacts.push(contact);
      }
    }
    
    console.log('✅ Contacts uniques après filtrage:', uniqueContacts.length);
    console.log('🔍 IDs uniques:', uniqueContacts.map(c => c._id));
    
    setContacts(uniqueContacts);
  } catch (error) {
    console.error('❌ Erreur chargement contacts:', error);
    setError('Impossible de charger les contacts');
    setContacts([]);
  } finally {
    setLoadingContacts(false);
  }
};

  // 🔥 RECHERCHE PAR USERNAME
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      setUsers([]);

      const token = localStorage.getItem('token');
const response = await api.get(`/search/users?username=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) throw new Error(t("search_error"));
      
      const data = await response.json();
      console.log("📋 Résultats de recherche:", data);

      setUsers(Array.isArray(data) ? data : []);
      
      if (data.length === 0) {
        setError(t('no_user_found'));
      }
    } catch (error) {
      console.error('❌ Erreur recherche:', error);
      setError(t('suppression'));

    } finally {
      setLoading(false);
    }
  };

  // 🔥 OUVRIR/CRÉER UNE CONVERSATION AVEC UN UTILISATEUR
// Dans SearchModal.jsx, modifiez handleOpenConversation :
// Dans SearchModal.jsx, modifiez handleOpenConversation :
// Dans SearchModal.jsx, modifiez handleOpenConversation :

const handleOpenConversation = async (targetUser) => {
  console.log("💬 Ouverture conversation avec:", targetUser);

  const token = localStorage.getItem('token');

  try {
    // 1️⃣ VÉRIFIER SI UNE CONVERSATION EXISTE DÉJÀ
const existingConvResponse = await api.get(`/conversations/find-private/${targetUser._id}`);

    if (existingConvResponse.ok) {
      const existingData = await existingConvResponse.json();
      
      if (existingData.success && existingData.conversation) {
        console.log("✅ Conversation existante trouvée:", existingData.conversation);
        
        // 🔥 CRÉER L'OBJET CONVERSATION COMPLET AVEC L'HISTORIQUE
        const conversationObj = {
          _id: existingData.conversation._id,
          id: existingData.conversation._id,
          type: "private",
          name: targetUser.username,
          participants: existingData.conversation.participants || [targetUser],
          unreadCount: existingData.conversation.unreadCount || 0,
          lastMessageAt: existingData.conversation.lastMessageAt || new Date(),
          isMessageRequest: existingData.conversation.isMessageRequest ?? false,
          messageRequestFor: existingData.conversation.messageRequestFor,
          messageRequestFrom: existingData.conversation.messageRequestFrom,
          
          // 🔥 AJOUTER targetUser avec photo
          targetUser: {
            _id: targetUser._id,
            username: targetUser.username,
            profilePicture: targetUser.profilePicture
          }
        };
        
        console.log("📦 Conversation existante à ouvrir:", conversationObj);
        
        // Fermer modal et ouvrir conversation
        onUserSelect(conversationObj);
        onClose();
        return;
      }
    }

    // 2️⃣ SI PAS DE CONVERSATION → CRÉER UNE NOUVELLE
    console.log("📝 Aucune conversation trouvée, création d'une nouvelle...");
    
  const res = await api.post('/conversations/private', { 
  receiverId: targetUser._id 
});

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erreur serveur');
    }

    const data = await res.json();
    console.log("✅ Nouvelle conversation créée:", data);

    if (data.success && data.conversation) {
      const conversationObj = {
        _id: data.conversation._id || data.conversation.id,
        id: data.conversation.id || data.conversation._id,
        type: "private",
        name: targetUser.username,
        participants: data.conversation.participants || [targetUser],
        unreadCount: data.conversation.unreadCount || 0,
        lastMessageAt: data.conversation.lastMessageAt || new Date(),
        isMessageRequest: data.conversation.isMessageRequest ?? true,
        messageRequestFor: data.conversation.messageRequestFor,
        messageRequestFrom: data.conversation.messageRequestFrom,
        
        targetUser: {
          _id: targetUser._id,
          username: targetUser.username,
          profilePicture: targetUser.profilePicture
        }
      };
      
      console.log("📦 Nouvelle conversation à ouvrir:", conversationObj);
      
      onUserSelect(conversationObj);
      onClose();
    }
  } catch (err) {
    console.error("❌ Erreur ouverture conversation:", err);
    alert("Erreur lors de l'ouverture de la conversation: " + err.message);
  }
};

// 🔥 NOUVELLE FONCTION : Créer groupe
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      setError('Nom du groupe et au moins 1 participant requis');
      return;
    }

    try {
      setCreatingGroup(true);
      setError('');

      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // 🔥 Envoi vers ta nouvelle route /api/groups
      formData.append('groupName', groupName.trim());
      formData.append('groupDescription', groupDescription.trim());
      formData.append('participantIds', JSON.stringify(selectedUsers.map(id => id)));
      
      if (groupPic) {
        formData.append('groupPic', groupPic);
      }

     const response = await api.post('/groups', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur création groupe');
      }

      console.log('✅ Groupe créé:', data.group);
      
      // 🔥 Refresh conversations + fermer modal
      if (loadConversations) loadConversations();
      onClose();
      
      // Reset form
      setGroupName('');
      setGroupDescription('');
      setGroupPic(null);
      setSelectedUsers([]);

    } catch (err) {
      console.error('❌ Erreur création groupe:', err);
      setError(err.message);
    } finally {
      setCreatingGroup(false);
    }
  };

  // 🔥 NOUVELLE FONCTION : Toggle sélection user pour groupe
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // QR CODE (inchangé)
  const startQRScanner = async () => {
    try {
      setScanning(true);
      setError('');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanFrame();
      }
    } catch (error) {
      console.error('Erreur caméra:', error);
     setError(t('camera_access'));

      setActiveTab('search');
    }
  };

  const stopQRScanner = () => {
    setScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        console.log('QR Code détecté:', code.data);
        handleQRScan(code.data);
        return;
      }
    }
    
    requestAnimationFrame(scanFrame);
  };

  // Dans SearchModal.jsx, remplacez handleQRScan par ceci :


const handleQRScan = async (qrData) => {
  try {
    stopQRScanner(); // Arrêter la caméra si elle tourne
    setError('');
    setLoading(true); // ← AJOUT : Assurer que loading est à true
    
    console.log('🔍 Données QR scannées:', qrData);
    
    const token = localStorage.getItem('token');
    
    // 1️⃣ APPELER LE BACKEND
   const response = await api.post('/qr/scan', { 
  qrContent: qrData 
});
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      setLoading(false); // ← AJOUT
      throw new Error(errorData.message || 'Erreur lors du scan du QR code');
    }
    
    const data = await response.json();
    console.log('📦 Réponse backend:', data);
    
    if (data.success && data.users && data.users.length > 0) {
      const scannedUser = data.users[0];
      
      console.log('👤 Utilisateur trouvé:', scannedUser);
      
      setLoading(false); // ← AJOUT : Arrêter loading AVANT setScanResult
      setScanResult(scannedUser);
      setError('');
    } else {
      setLoading(false); // ← AJOUT
      setError(t('qr_error') || 'QR code invalide ou utilisateur introuvable');
    }
  } catch (error) {
    console.error('❌ Erreur scan QR:', error);
    setLoading(false); // ← AJOUT
    setError(error.message || t('scan_error') || 'Erreur lors du scan du QR code');
  }
};

  // Dans SearchModal.jsx, remplacez handleFileUpload par ceci :

// 🔥 UPLOAD IMAGE ET SCAN QR CODE
const handleFileUpload = async (e) => {
  console.log('🎯 handleFileUpload APPELÉ');
  
  const file = e.target.files[0];
  console.log('📁 Fichier:', file);
  
  if (!file) {
    console.log('❌ Aucun fichier sélectionné');
    return;
  }

  if (!file.type.startsWith('image/')) {
    console.log('❌ Type invalide:', file.type);
    setError('Veuillez sélectionner une image (JPG, PNG, etc.)');
    return;
  }

  console.log('✅ Fichier valide:', file.name, file.type);
  
  try {
    setError('');
    setLoading(true);
    console.log('📖 Lecture du fichier...');

    const reader = new FileReader();
    
    reader.onload = (event) => {
      console.log('✅ Fichier lu');
      
      const img = document.createElement('img'); // ← CORRECTION ICI
      
      img.onload = () => {
        console.log('🖼️ Image chargée:', img.width, 'x', img.height);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        console.log('📊 ImageData extrait');
        
        console.log('🔍 Scan jsQR...');
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });
        
        if (code && code.data) {
          console.log('✅✅ QR CODE TROUVÉ:', code.data);
          handleQRScan(code.data);
        } else {
          console.log('❌ Aucun QR code détecté');
          setLoading(false);
          setError('Aucun QR code détecté. Assurez-vous que le QR code est bien visible et net.');
        }
      };
      
      img.onerror = (err) => {
        console.error('❌ Erreur image:', err);
        setLoading(false);
        setError('Impossible de charger l\'image');
      };
      
      img.src = event.target.result;
    };
    
    reader.onerror = (err) => {
      console.error('❌ Erreur lecture:', err);
      setLoading(false);
      setError('Erreur lors de la lecture du fichier');
    };
    
    reader.readAsDataURL(file);
    
  } catch (error) {
    console.error('❌ ERREUR:', error);
    setLoading(false);
    setError('Erreur: ' + error.message);
  }
};

  // EFFETS
  useEffect(() => {
    if (activeTab === 'scan') {
      startQRScanner();
    } else {
      stopQRScanner();
    }
    
    return () => stopQRScanner();
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && activeTab === 'search') handleSearch();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, activeTab]);

  useEffect(() => {
    if (activeTab === 'search' || activeTab === 'group')  {
      fetchContacts();
    }
  }, [activeTab]);
const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl">
        
        {/* En-tête */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-gray-600" />
            <span className="font-medium">{t('search')}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          
          {/* Onglets */}
          <div className="flex mb-4 bg-gray-100 dark:bg-neutral-700 p-1 rounded-lg">
            <button
              className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-colors ${
                activeTab === 'search' 
                  ? 'bg-white dark:bg-neutral-800 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-300'
              }`}
              onClick={() => setActiveTab('search')}
            >
             {t('search')}
            </button>
            <button
              className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-colors ${
                activeTab === 'scan' 
                  ? 'bg-white dark:bg-neutral-800 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-300'
              }`}
              onClick={() => setActiveTab('scan')}
            >
              {t('qr_code')}
            </button>

{/* 🔥 NOUVEAU ONGLETT GROUPE */}
              <button
            className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-colors ${
              activeTab === 'group' ? 'bg-white dark:bg-neutral-800 shadow-sm' : 'text-gray-600 dark:text-gray-300'
            }`}
            onClick={() => setActiveTab('group')}
          >
            <Users size={16} className="inline mr-1" />
            Groupes
          </button>
          </div>

          {activeTab === 'search' ? (
            <div>
              {/* Champ de recherche */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                   placeholder={t('search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-4 pr-10 py-3 bg-gray-100 dark:bg-neutral-700 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-myYellow"
                    autoFocus
                  />
                  <button
                    onClick={handleSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-500"
                  >
                    <Search size={20} />
                  </button>
                </div>
              </div>
 {/* Résultats de recherche */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-xl mb-4">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">{t('searching')}</p>
                </div>
              ) : users.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3 px-1">  {t('results')}</h3>
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            user.profilePicture 
                              ? '' 
                              : 'bg-gradient-to-br from-blue-400 to-purple-500'
                          }`}>
                            {user.profilePicture ? (
                              <img
                                src={user.profilePicture}
                                alt={user.username}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User size={20} className="text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                              }`}></div>
                              <span className="text-xs text-gray-500">
                                {user.status === 'online' ? 'En ligne' : 'Hors ligne'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenConversation(user)}
                          className="p-2 bg-black hover:bg-gray-800 text-white rounded-full"
                          title={t('send_message')}
                        >
                          <MessageCircle size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : searchQuery && !loading && (
                <div className="text-center py-4 text-gray-500">
                  {t('no_results', { query: searchQuery })}
                </div>
              )}
              {/* Contacts suggérés */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3 px-1">Contacts</h3>
                {loadingContacts ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">{t('loading')}</p>
                  </div>
                ) : contacts.length > 0 ? (
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <div
                        key={contact._id}
                        className="flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            contact.profilePicture 
                              ? '' 
                              : 'bg-gradient-to-br from-blue-400 to-purple-500'
                          }`}>
                            {contact.profilePicture ? (
                              <img
                                src={contact.profilePicture}
                                alt={contact.username}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User size={20} className="text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{contact.username}</p>
                            <div className="flex items-center gap-2">
                              <UserCheck size={12} className="text-blue-500" />
                              <span className="text-xs text-gray-500">Contact</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenConversation(contact)}
                          className="p-2 bg-black hover:bg-gray-800 text-white rounded-full"
                          title={t('send_message')}
                        >
                          <MessageCircle size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                   {t('no_contacts')}
                  </div>
                )}
              </div>

             
            </div>
          ) : (
            /* SCANNER QR CODE (inchangé) */
            <div>
              <div className="text-center mb-6">
                <h3 className="font-medium mb-2">{t('scan_qr_code')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('scan_qr_user')}
                </p>
              </div>
              
              {scanResult ? (
                <div className="text-center p-4">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    {scanResult.profilePicture ? (
                      <img
                        src={scanResult.profilePicture}
                        alt={scanResult.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={32} className="text-white" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold mb-1">{scanResult.username}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                   {t('user_found')}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => {
                        handleOpenConversation(scanResult);
                        onClose();
                      }}
                      className="flex-1 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={18} />
                     {t('message')}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setScanResult(null);
                      setActiveTab('scan');
                      startQRScanner();
                    }}
                    className="mt-4 text-blue-500 hover:text-blue-700 text-sm"
                  >
                    {t('scan_another_code')}
                  </button>
                </div>
              ) : (
                <div>
                  {scanning ? (
                    <div className="relative mb-6">
                      <video 
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-64 object-cover rounded-2xl bg-black"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48">
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-white" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-white" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-white" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-white" />
                      </div>
                    </div>
                  ) : loading ? (
                    <div className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-2xl p-8 text-center mb-6 bg-blue-50 dark:bg-blue-900/20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-blue-700 dark:text-blue-300 font-medium">Scan en cours...</p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 dark:border-neutral-600 rounded-2xl p-8 text-center mb-6">
                      <QrCode className="mx-auto mb-4 text-gray-400" size={48} />
                      <p className="text-gray-600 dark:text-gray-300">{t('preparing')}</p>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 text-center">
                      {t('or_upload_image') || 'Ou importer une image'}
                    </p>
                    
                    <input
                      type="file"
                      id="qr-upload-input"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    
                    <label 
                      htmlFor="qr-upload-input"
                      className="block w-full cursor-pointer"
                    >
                      <div className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 px-6 py-4 rounded-xl transition-colors border-2 border-dashed border-gray-300 dark:border-neutral-600">
                        <Upload size={20} />
                        <span className="font-medium">{t('choose_image') || 'Choisir une image'}</span>
                      </div>
                    </label>
                    
                    {/* Indicateur de chargement */}
                    {loading && (
                      <div className="mt-3 text-center">
                        <div className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm font-medium">Analyse en cours...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-xl mb-4">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

                    {/* 🔥 ONGLETT 3 : NOUVEAU GROUPE - COMPLÈT */}
          {activeTab === 'group' && (
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <Users size={20} className="mr-2 text-blue-500" />
                Nouveau groupe
              </h3>

              {/* Erreur */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-xl mb-4">
                  {error}
                </div>
              )}

              {/* Nom du groupe */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Nom du groupe *</label>
                <input
                  type="text"
                  placeholder="Nom du groupe (ex: Famille, Travail...)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-700 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description (optionnel)</label>
                <input
                  type="text"
                  placeholder="Description du groupe..."
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-700 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Photo de groupe */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 flex items-center">
                  <Image size={16} className="mr-1" />
                  Photo du groupe (optionnel)
                </label>
                <label className="w-full p-6 border-2 border-dashed border-gray-300 dark:border-neutral-600 rounded-2xl text-center hover:border-blue-400 transition-colors cursor-pointer">
                  {groupPic ? (
                    <div className="space-y-2">
                      <img 
                        src={URL.createObjectURL(groupPic)} 
                        alt="Preview" 
                        className="w-20 h-20 mx-auto rounded-full object-cover"
                      />
                      <p className="text-sm text-gray-600">{groupPic.name}</p>
                      <button 
                        onClick={() => setGroupPic(null)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Changer
                      </button>
                    </div>
                  ) : (
                    <>
                      <Image size={32} className="mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Cliquer pour ajouter une photo
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setGroupPic(e.target.files[0])}
                        className="hidden"
                      />
                    </>
                  )}
                </label>
              </div>

              {/* Sélection participants (depuis tes contacts) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium flex items-center">
                    <Users size={16} className="mr-1" />
                    Participants ({selectedUsers.length})
                  </label>
                  <span className="text-xs text-gray-500">
                    {selectedUsers.length === 0 && 'Sélectionne au moins 1 contact'}
                  </span>
                </div>
                
                {loadingContacts ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucun contact. Ajoute des amis d'abord !
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {contacts.slice(0, 10).map((contact) => ( // Limite à 10
                      <div
                        key={contact._id}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                          selectedUsers.includes(contact._id)
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
                            : 'hover:bg-gray-100 dark:hover:bg-neutral-700'
                        }`}
                        onClick={() => toggleUserSelection(contact._id)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-full overflow-hidden ${
                            selectedUsers.includes(contact._id) ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                          }`}>
                            <img
                              src={contact.profilePicture || '/default-avatar.png'}
                              alt={contact.username}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium">{contact.username}</p>
                            <p className="text-xs text-gray-500">Contact</p>
                          </div>
                        </div>
                        {selectedUsers.includes(contact._id) ? (
                          <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                            <Plus size={14} className="text-blue-600" />
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Sélectionné</span>
                          </div>
                        ) : (
                          <Plus size={20} className="text-gray-400 ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bouton Créer */}
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !groupName.trim() || selectedUsers.length === 0}
                className="w-full bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black px-6 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {creatingGroup ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white dark:border-black"></div>
                    Création...
                  </>
                ) : (
                  <>
                    <Users size={20} />
                    Créer groupe ({selectedUsers.length + 1} participants)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;