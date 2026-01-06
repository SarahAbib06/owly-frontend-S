# 🔧 Guide de Débogage des Appels

## Étape 1 : Ouvrir la Console du Navigateur
- Appuie sur `F12` ou `Ctrl+Shift+I`
- Va dans l'onglet **"Console"**

## Étape 2 : Lancer un appel et regarder les logs

Quand tu fais un appel, tu devrais voir dans la console :

```
🚀 [AppelContext] startCall UNIFIÉ appelée:
📤 [AppelContext] Émission INITIATE-CALL:
✅ [AppelContext] Appel initié via call:initiate ET initiate-call
📋 [AppelContext] Setting currentCall:
```

## Étape 3 : Vérifier l'autre côté

Sur l'autre navigateur/utilisateur, tu devrais voir :

```
📞 [AppelContext] Appel entrant RECU via incoming-call:
```

## 🔴 Si tu vois les logs côté APPELANT mais PAS côté DESTINATAIRE :

**C'est un problème de serveur.** Le serveur reçoit bien l'événement `call:initiate` ou `initiate-call` MAIS ne le forward pas à l'autre utilisateur.

### Actions à vérifier sur le serveur :

1. **Est-ce que le serveur écoute `'call:initiate'` ?**
   ```javascript
   socket.on('call:initiate', (data) => {
     // Forward vers receiverId
   })
   ```

2. **Est-ce que le serveur envoie `'call:incoming'` au destinataire ?**
   ```javascript
   io.to(data.receiverId).emit('call:incoming', {
     callId: data.callId,
     callerId: socketId,
     callerName: user.username,
     // ...
   })
   ```

## 🟢 Si tu vois les logs des DEUX côtés :

Bravo! Les appels arrivent. Le problème vient du WebRTC.

## 🔍 Vérifications supplémentaires

### 1. Socket est-il connecté ?
```javascript
// Dans la console, tape :
console.log(window.__SOCKET_ID__);
```

### 2. Utilisateurs ont-ils les bons IDs ?
```javascript
// Ouvre la console et cherche :
// 🔍 [AppelContext] Recherche autre participant:
// Vérifie que otherParticipantFound: true
```

### 3. Cherche les erreurs de connexion
Recherche dans la console pour : `❌ [AppelContext]`

## 📝 Solutions rapides

1. **Recharge la page** - Parfois socket ne se reconnecte pas
2. **Vérifie que les deux utilisateurs sont dans la MÊME conversation**
3. **Vérifie que les IDs utilisateur sont corrects** en base de données
4. **Regarde les logs du serveur** pour voir si l'événement arrive

## 🆘 Si ça marche toujours pas :

Donne-moi les logs exacts de la console (copie-colle tout ce qu'il y a).
