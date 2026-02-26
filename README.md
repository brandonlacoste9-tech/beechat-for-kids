# 🐝 BEEChat for Kids

**Safe messaging app for kids with parental controls** - Une application de messagerie avec la culture québécoise intégrée!

## Fonctionnalités

- 💬 **Messagerie en temps réel** - Propulsée par Socket.io
- 🦫 **Robot TI-GUY** - Mascotte castor qui répond aléatoirement
- 🎙️ **Messages vocaux** - Enregistre et envoie de l'audio
- 📹 **Appels vidéo** - WebRTC prêt
- 👥 **Discussions de groupe** - Crée des "crew" ou des "gangs"
- 💰 **Paiements** - Intégration Interac (bientôt)
- 🎨 **Thèmes québécois** - Vert forêt, or, et castor

## Stack Technique

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Socket.io
- **Base de données**: Supabase (PostgreSQL)
- **Temps réel**: Socket.io

## Démarrage

### 1. Installer les dépendances

```bash
# Installer les dépendances racine
npm install

# Installer le backend
cd backend
npm install

# Installer le frontend
cd ../frontend
npm install
```

### 2. Démarrer les serveurs

```bash
# Depuis le répertoire racine
npm run dev
```

Ça démarre:
- Backend: http://localhost:3001
- Frontend: http://localhost:5173

### 3. Ouvrir l'application

Va sur http://localhost:5173 et commence à chatter!

## Commandes TI-GUY

TI-GUY répond aléatoirement avec du joual québécois:
- "Salut mon chum! 🦫"
- "Osti que c'est beau ça!"
- "Tabarnouche, raconte-moi plus!"

Tape `/nobot` pour désactiver les réponses de TI-GUY.

## Fonctionnalités Québécoises

- 🍁 **Langue**: Français + Joual (argot québécois)
- 🏒 **Thèmes**: Hockey, poutine, sirop d'érable
- ⚜️ **Couleurs**: Vert forêt, or, rouge canadien
- 🦫 **Mascotte**: TI-GUY le castor

## Feuille de Route

- [ ] Messages vocaux
- [ ] Appels vidéo (WebRTC)
- [ ] Partage de fichiers
- [ ] Discussions de groupe
- [ ] Interac e-Transfer
- [ ] Autocollants québécois
- [ ] Fil d'actualité (Moments)
- [ ] Application mobile (React Native)

## Fait avec ❤️ au Québec

Fait avec fierté québécoise! 🍁🐝 ⚜️

---

**Développé par:** L'équipe OuiChat 🦫
**Version:** 1.0.0
**Licence:** MIT
