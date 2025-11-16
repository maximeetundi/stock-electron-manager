# Ecole Finances - Version 1.2.0

Application de gestion financière et de stock pour complexe scolaire développée avec Electron, React et SQLite.

## Description

Ecole Finances est une application desktop moderne pour la gestion des finances et du stock d'un complexe scolaire. Elle permet de :

### Gestion Financière
- 📊 **Suivi des finances** : Entrées et sorties par catégories
- 📈 **Statistiques** : Graphiques et analyses détaillées
- 📋 **Rapports** : Génération de rapports PDF et Excel
- 🎯 **Tableau de bord** : Vue d'ensemble des flux financiers

### Gestion de Stock (Nouveau v1.2)
- 📦 **Gestion des articles** : Catalogue complet avec codes, prix et quantités
- 🏢 **Gestion des fournisseurs** : Base de données des fournisseurs
- 📝 **Bons de commande** : Création et suivi des commandes
- ⚠️ **Alertes de stock** : Notification automatique des stocks faibles
- 📊 **Mouvements de stock** : Traçabilité complète (entrées, sorties, ajustements)
- 📄 **Export PDF** : Génération de bons de commande au format PDF
- 📈 **Rapports et statistiques** : Rapports complets avec exports PDF/Excel
  - État des stocks (valeurs, alertes)
  - Historique des bons de commande
  - Suivi des mouvements de stock

### Autres fonctionnalités
- ⚙️ **Paramètres** : Gestion des catégories et paramètres utilisateur
- 💾 **Sauvegarde** : Export/Import de la base de données

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

### Gestion Financière
- **Dashboard** (`/`) - Vue d'ensemble avec sélecteur de période
- **Nouvelle opération** (`/operations`) - Formulaire de création de transactions
- **Rapports** (`/rapports`) - Filtres et génération de rapports
- **Statistiques** (`/statistiques`) - Graphiques et analyses

### Gestion de Stock (v1.2)
- **Gestion de stock** (`/stock`) - Articles, fournisseurs et alertes
- **Bons de commande** (`/bons-commande`) - Création et suivi des commandes

### Configuration
- **Sauvegarde** (`/sauvegarde`) - Export/Import de la base de données
- **Paramètres** (`/parametres`) - Configuration utilisateur
- **À propos** (`/apropos`) - Informations sur l'application

## Fonctionnalités détaillées

### Gestion des transactions financières
- Création d'entrées et sorties avec catégorisation
- Historique complet des opérations
- Filtrage par période (jour, semaine, mois, trimestre, semestre, année)
- Filtrage par type (toutes, entrées, sorties)
- Filtrage par catégorie
- Export PDF et Excel des rapports

### Gestion de stock (v1.2)
- **Articles** : Code, désignation, unité, prix unitaire, stock actuel et minimum
- **Fournisseurs** : Nom, adresse, téléphone, email
- **Mouvements de stock** : 
  - Entrées (réception de marchandises)
  - Sorties (utilisation/vente)
  - Ajustements (corrections d'inventaire)
- **Alertes automatiques** : Notification quand le stock atteint le seuil minimum
- **Bons de commande** :
  - Création avec sélection fournisseur et articles
  - Calcul automatique du montant total
  - Suivi du statut (EN_COURS, LIVREE, ANNULEE)
  - Mise à jour automatique du stock à la réception
  - Export PDF du bon de commande

### Statistiques
- Graphiques en barres par catégorie
- Camemberts des soldes
- Tableaux détaillés des transactions

### Sécurité
- Authentification par mot de passe
- Codes de récupération
- Gestion des sessions
- Sauvegarde automatique avant suppression de catégories

## Nouveautés Version 1.2.0

### Gestion complète de stock
- 📦 **Articles** : Gestion d'un catalogue d'articles avec codes, prix et quantités
- 🏢 **Fournisseurs** : Base de données complète des fournisseurs (nom, adresse, contacts)
- 📝 **Bons de commande** : Création, suivi et export PDF des bons de commande
- 📊 **Mouvements de stock** : Traçabilité complète avec entrées, sorties et ajustements
- ⚠️ **Alertes** : Notification automatique des articles en rupture ou stock faible
- 🔄 **Mise à jour automatique** : Le stock est mis à jour automatiquement lors de la réception des commandes

### Améliorations de la base de données
- Nouvelles tables : `fournisseurs`, `articles`, `bons_commande`, `bons_commande_items`, `mouvements_stock`
- Relations entre les tables pour assurer l'intégrité des données
- Contraintes de validation pour éviter les erreurs de saisie

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
