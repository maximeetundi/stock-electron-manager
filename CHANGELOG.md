# Changelog

## Version 1.2.0 - Gestion de Stock (13 Novembre 2025)

### ✨ Nouvelles fonctionnalités

#### Gestion de Stock
- **Articles** : Gestion complète d'un catalogue d'articles
  - Code article unique
  - Désignation et unité de mesure
  - Prix unitaire
  - Quantité en stock
  - Stock minimum pour les alertes
  - Ajout, modification et suppression d'articles
  
- **Fournisseurs** : Base de données des fournisseurs
  - Nom du fournisseur
  - Adresse complète
  - Téléphone et email
  - Gestion CRUD complète

- **Bons de Commande** : Système complet de gestion des commandes
  - Création de bons avec numérotation automatique (BC-ANNÉE-XXX)
  - Sélection du fournisseur
  - Ajout d'articles avec quantités et prix
  - Calcul automatique du montant total
  - Gestion du statut (EN_COURS, LIVREE, ANNULEE)
  - Mise à jour automatique du stock à la livraison
  - Export PDF des bons de commande avec mise en page professionnelle
  - Visualisation détaillée des bons

- **Mouvements de Stock** : Traçabilité complète des mouvements
  - Entrées (réception de marchandises)
  - Sorties (utilisation/vente)
  - Ajustements (corrections d'inventaire)
  - Historique complet avec date, référence et motif
  - Mise à jour automatique des quantités en stock

- **Alertes de Stock** : Notification automatique
  - Affichage des articles en rupture de stock
  - Alerte quand le stock atteint le seuil minimum
  - Mise en évidence visuelle dans le tableau des articles

#### Rapports et Statistiques de Stock
- **Page de rapports dédiée** : Interface complète pour les rapports de stock
  - Statistiques en temps réel (6 indicateurs clés)
  - Valeur totale du stock
  - Nombre d'articles en alerte
  - Suivi des bons de commande
  
- **Trois types de rapports** :
  - État des stocks (articles, quantités, valeurs)
  - Bons de commande (suivi par période et statut)
  - Mouvements de stock (historique complet)

- **Exports professionnels** :
  - Export PDF avec mise en page formatée
  - Export Excel pour analyses
  - Filtres par période (date début/fin)
  - Filtre par statut pour les bons
  
- **Aperçu en temps réel** :
  - Articles en alerte affichés directement
  - Calculs automatiques des totaux
  - Interface intuitive et responsive

#### Dashboard Unifié
- **Dashboard intelligent** avec sélecteur Finances/Stock
  - Basculement instantané entre les deux modes
  - Menu déroulant élégant en haut du dashboard
  - Mode Finances : Préservation de l'ancien dashboard (aucune perturbation)
  - Mode Stock : 6 statistiques colorées + derniers bons de commande
  
- **Configuration de la préférence** :
  - Nouveau paramètre "Dashboard par défaut" dans les Settings
  - Choix entre Finances et Stock
  - Sauvegarde persistante dans la base de données
  - Chargement automatique au démarrage de l'application

#### Interface Utilisateur
- Nouvelle page "Gestion de stock" avec onglets (Articles, Fournisseurs)
- Nouvelle page "Bons de commande" avec tableau de suivi
- **Nouvelle page "Rapports stock"** avec statistiques et exports
- **Dashboard unifié** avec sélecteur de mode
- Icônes dédiées dans le menu de navigation
- Modales de création/édition pour articles et fournisseurs
- Interface intuitive pour la création de bons de commande
- Affichage des alertes de stock en haut de page

### 🔧 Améliorations techniques

#### Base de données
- Nouvelles tables :
  - `fournisseurs` : Informations des fournisseurs
  - `articles` : Catalogue des articles
  - `bons_commande` : En-têtes des bons de commande
  - `bons_commande_items` : Lignes détaillées des bons
  - `mouvements_stock` : Historique des mouvements
- Relations avec clés étrangères pour l'intégrité référentielle
- Contraintes de validation (codes uniques, statuts valides)
- Transactions pour garantir la cohérence des données

#### API Electron
- Nouveaux handlers IPC :
  - `fournisseurs:*` : CRUD fournisseurs
  - `articles:*` : CRUD articles
  - `mouvements:*` : Gestion des mouvements
  - `bons-commande:*` : Gestion des bons de commande
- Exposition des API dans le preload.js
- Validation robuste des données côté serveur

#### Exports
- Export PDF des bons de commande avec jsPDF
- Mise en page professionnelle avec en-tête, informations fournisseur et tableau des articles
- Affichage du montant total

### 📝 Documentation
- README mis à jour avec les nouvelles fonctionnalités
- Description détaillée de la gestion de stock
- Instructions pour les nouvelles pages

### 🔄 Compatibilité
- Migration automatique de la base de données
- Les anciennes données sont préservées
- Aucune action requise lors de la mise à jour

---

## Version 0.1.0 - Version initiale

### ✨ Fonctionnalités de base
- Gestion des transactions financières (entrées/sorties)
- Tableau de bord avec métriques par période
- Statistiques et graphiques
- Rapports avec filtres et exports PDF/Excel
- Gestion des catégories
- Authentification par mot de passe
- Codes de récupération
- Sauvegarde/Restauration de la base de données
- Thème clair/sombre
- Interface moderne avec Tailwind CSS
