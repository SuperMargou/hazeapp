#  **HazeApp – Citation**

> *Une expérience minimaliste et apaisante autour de la lecture de citations inspirantes.*

**HazeApp** est une application web élégante et fluide développée par **Cloud Roots Studio**, pensée pour offrir un instant de réflexion et de sérénité à travers des citations inspirantes.
L’interface épurée, optimisée pour mobile et desktop, permet de découvrir, aimer et partager des citations avec fluidité — le tout dans une ambiance douce et immersive.

**Bientôt dispo sur le play store**

---

##  **Fonctionnalités principales**

-  **Affichage dynamique** de citations, avec transition fluide (*fade* ou *slide* selon le device).  
-  **Système de like** avec synchronisation entre *local storage* et **Firebase Firestore**.  
-  **Authentification Google** intégrée (connexion rapide, stockage des favoris dans le cloud).  
-  **Support mobile complet** avec *swipe*, *double tap* et design responsive.  
-  **Partage facile** via *API Web Share* ou copie dans le presse-papier.  
-  **Expérience fluide sans rechargement**, pensée pour la lecture rapide et intuitive.

---

## 🧠 **Stack technique**

| Technologie | Usage |
|--------------|--------|
| **HTML / CSS / JS** | Front-end minimaliste et responsive |
| **Firebase (Auth + Firestore)** | Authentification Google et stockage des likes |
| **Font Awesome** | Icônes interactives (like, share, etc.) |
| **JSON local** | Base de citations légère et personnalisable |

---

## 🚀 **Installation & lancement**

### 1️⃣ **Cloner le projet**
```bash
git clone https://github.com/CloudRoots/citation-app.git
cd hazeapp
```

### 2️⃣ **Configurer Firebase**

- Crée un projet sur [Firebase Console](https://console.firebase.google.com)  
- Active **Authentication → Google**  
- Active **Firestore Database**  
- Remplace la configuration dans `auth.js` par la tienne :

  ```js
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_ID",
    appId: "YOUR_APP_ID",
  };
  ```

### 3️⃣ **Lancer en local**
Utilise un petit serveur local (ex. **VSCode Live Server** ou `python3 -m http.server`).  
>  **Firebase ne fonctionne pas en `file://`**, il faut être sur `http://localhost`.

---

##  **Licence**

**GNU General Public License v3.0**  
Ce projet est open source sous licence **GPLv3** — vous êtes libre de le redistribuer ou de le modifier, tant que toute version dérivée reste open source.

---

##  **À propos de Cloud Roots**

**Cloud Roots** est un studio indépendant mêlant design minimaliste et technologies web modernes.  
Nous créons des expériences numériques **légères**, **humaines** et **élégantes**, à la croisée du code et de la créativité.

---

##  **Exemple de citation**
> “La simplicité est la sophistication suprême.” — *Leonardo da Vinci*

---

## 🏷️ **Badges**
![Made with Love](https://img.shields.io/badge/Made%20with-❤️-ff69b4?style=for-the-badge)
![License: GPLv3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)
![Built with Firebase](https://img.shields.io/badge/Built%20with-Firebase-ffca28?style=for-the-badge)
![Built by Cloud Roots](https://img.shields.io/badge/Built%20by-Cloud%20Roots-6a5acd?style=for-the-badge)

