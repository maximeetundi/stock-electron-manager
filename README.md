# Ecole Finances

Application de gestion financière pour complexe scolaire développée avec Electron, React et SQLite.

## Description

Ecole Finances est une application desktop moderne pour la gestion des finances d'un complexe scolaire. Elle permet de :

- 📊 **Suivi des finances** : Entrées et sorties par catégories
- 📈 **Statistiques** : Graphiques et analyses détaillées
- 📋 **Rapports** : Génération de rapports PDF et Excel
- ⚙️ **Paramètres** : Gestion des catégories et paramètres utilisateur
- 🎯 **Tableau de bord** : Vue d'ensemble des flux financiers

## Technologies

- **Frontend** : React 18 + Vite
- **UI Framework** : Tailwind CSS + Heroicons
- **Desktop** : Electron
- **Base de données** : SQLite avec better-sqlite3
- **Graphiques** : Recharts
- **Exports** : jsPDF + xlsx

## Prérequis

- Node.js (version 18 ou supérieure)
- npm ou yarn
- Windows/Linux/macOS

## Installation

1. **Cloner le projet**
   ```bash
   git clone <votre-repo>
   cd ecole-finances
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Lancer en mode développement**
   ```bash
   npm run dev
   ```

   L'application s'ouvrira automatiquement dans Electron.

## Scripts disponibles

- `npm run dev` - Lancer en mode développement (Vite + Electron)
- `npm run build` - Construire l'application pour la production
- `npm run build:electron` - Construire l'exécutable Electron
- `npm run package` - Construire et packager l'application complète
- `npm run lint` - Lancer le linter (à configurer)

## Structure du projet

```
ecole-finances/
├── electron/           # Code Electron (main process)
├── public/             # Assets statiques
├── src/                # Code source React
│   ├── components/     # Composants réutilisables
│   ├── pages/          # Pages de l'application
│   ├── state/          # Gestion d'état (Context)
│   ├── utils/          # Utilitaires et API
│   └── App.jsx         # Composant racine
├── dist/               # Build de production (généré)
└── dist-electron/      # Exécutables Electron (généré)
```

## Pages principales

- **Dashboard** (`/`) - Vue d'ensemble avec sélecteur de période
- **Nouvelle opération** (`/new`) - Formulaire de création de transactions
- **Rapports** (`/reports`) - Filtres et génération de rapports
- **Statistiques** (`/statistics`) - Graphiques et analyses
- **Paramètres** (`/settings`) - Configuration utilisateur

## Fonctionnalités

### Gestion des transactions
- Création d'entrées et sorties
- Catégorisation automatique
- Historique des opérations

### Filtres et rapports
- Filtrage par période (jour, semaine, mois, trimestre, semestre, année)
- Filtrage par type (toutes, entrées, sorties)
- Filtrage par catégorie
- Export PDF et Excel

### Statistiques
- Graphiques en barres par catégorie
- Camemberts des soldes
- Tableaux détaillés des transactions

### Sécurité
- Authentification par mot de passe
- Chiffrement des données sensibles
- Gestion des sessions

## Configuration

### Base de données
La base de données SQLite est automatiquement créée dans le dossier `data/` de l'application.

### Thèmes
L'application supporte les thèmes clair et sombre avec basculement automatique.

### Exports
- **PDF** : Rapports détaillés avec jsPDF
- **Excel** : Tableaux de données avec xlsx

## Développement

### Ajouter une nouvelle page
1. Créer le composant dans `src/pages/`
2. Ajouter la route dans `src/App.jsx`
3. Mettre à jour la navigation si nécessaire

### Ajouter un composant
1. Créer dans le dossier approprié de `src/components/`
2. Utiliser les conventions de nommage PascalCase
3. Ajouter PropTypes pour la validation

### Base de données
Les migrations sont gérées automatiquement. Pour ajouter une nouvelle table :
1. Modifier le schéma dans `electron/database.js`
2. Lancer l'application pour appliquer les migrations

## Compilation

### Pour Windows
```bash
npm run package
```

L'exécutable sera généré dans `dist-electron/` avec le nom `Ecole Finances Setup X.X.X.exe`.

### Pour macOS
```bash
npm run package
```

Génère un fichier `.dmg` dans `dist-electron/`.

### Pour Linux
```bash
npm run package
```

Génère des fichiers `.AppImage` et `.deb` dans `dist-electron/`.

## Déploiement

1. Construire l'application : `npm run package`
2. Récupérer l'exécutable dans `dist-electron/`
3. Distribuer selon la plateforme cible

## Support

Pour toute question ou problème :
- Consulter les logs dans la console développeur
- Vérifier la configuration de la base de données
- S'assurer que toutes les dépendances sont installées

## Licence

Ce projet est développé pour un usage éducatif et scolaire.

---

*Développé avec ❤️ pour la communauté éducative*
