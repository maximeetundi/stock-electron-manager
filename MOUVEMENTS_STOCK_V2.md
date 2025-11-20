# Mouvements de Stock - Version 2.0

## 📋 Vue d'ensemble

La nouvelle version des mouvements de stock offre une gestion complète et professionnelle avec pagination, recherche avancée, modification, suppression et impression.

## ✨ Nouvelles fonctionnalités

### 1. **Spécifier la date du mouvement**
- Lors de l'enregistrement d'un mouvement, vous pouvez maintenant choisir la date
- Utile si vous enregistrez un mouvement qui s'est produit antérieurement
- La date par défaut est la date actuelle

**Localisation**: Onglet "Mouvements" dans la page "Gestion de stock"

### 2. **Page dédiée aux mouvements**
- Nouvelle page accessible via le menu: **Mouvements de stock**
- Affichage professionnel de tous les mouvements

**Fonctionnalités**:
- ✅ **Pagination**: 20 mouvements par page
- ✅ **Recherche**: Recherchez par code article, désignation, référence ou motif
- ✅ **Filtres**: 
  - Type de mouvement (Entrée, Sortie, Ajustement)
  - Plage de dates (Du - Au)
- ✅ **Bouton Réinitialiser**: Efface tous les filtres

### 3. **Modifier un mouvement**
- Cliquez sur l'icône ✏️ (crayon) pour modifier un mouvement
- Vous pouvez modifier:
  - La date du mouvement
  - La quantité
  - La référence
  - Le motif
- Les modifications sont enregistrées immédiatement

### 4. **Supprimer un mouvement**
- Cliquez sur l'icône 🗑️ (poubelle) pour supprimer
- Une confirmation vous sera demandée
- La suppression annule automatiquement l'effet du mouvement sur le stock

### 5. **Imprimer un mouvement**
- Cliquez sur l'icône 🖨️ (imprimante) pour imprimer
- Un document professionnel s'ouvre dans une nouvelle fenêtre
- Vous pouvez l'imprimer ou l'exporter en PDF

**Contenu du document imprimé**:
- Informations du mouvement (type, date, ID)
- Détails de l'article (code, désignation)
- Quantités (base et saisie)
- Référence et motif
- Badges colorés par type

## 🎯 Cas d'usage

### Cas 1: Enregistrement décalé
**Problème**: Hier il n'y avait pas de courant, et c'est aujourd'hui qu'on enregistre les mouvements.

**Solution**:
1. Allez dans "Gestion de stock" → onglet "Mouvements"
2. Remplissez le formulaire normalement
3. Changez la date du mouvement à hier
4. Enregistrez

### Cas 2: Correction d'une erreur
**Problème**: Vous avez enregistré une quantité incorrecte.

**Solution**:
1. Allez dans "Mouvements de stock"
2. Trouvez le mouvement avec la recherche ou les filtres
3. Cliquez sur l'icône ✏️
4. Modifiez la quantité
5. Cliquez "Enregistrer"

### Cas 3: Audit ou documentation
**Problème**: Vous devez imprimer un mouvement pour documentation.

**Solution**:
1. Allez dans "Mouvements de stock"
2. Trouvez le mouvement
3. Cliquez sur l'icône 🖨️
4. Imprimez ou exportez en PDF

## 📊 Tableau des mouvements

| Colonne | Description |
|---------|-------------|
| Date | Date et heure du mouvement |
| Article | Code et désignation de l'article |
| Type | Entrée (vert), Sortie (rouge), Ajustement (bleu) |
| Quantité | Quantité avec unité (+ pour entrée, - pour sortie) |
| Référence | Référence du mouvement (ex: demande service) |
| Motif | Motif du mouvement |
| Actions | Modifier, Imprimer, Supprimer |

## 🔍 Filtres et recherche

### Recherche
- Cherchez par **code article** (ex: "ART001")
- Cherchez par **désignation** (ex: "stylo")
- Cherchez par **référence** (ex: "Demande pédagogique")
- Cherchez par **motif** (ex: "Distribution")

### Filtres
- **Type**: Tous, Entrée, Sortie, Ajustement
- **Du**: Date de début (incluse)
- **Au**: Date de fin (incluse)

### Réinitialiser
Cliquez sur "Réinitialiser" pour effacer tous les filtres et afficher tous les mouvements.

## 💾 Stockage des données

- Tous les mouvements sont stockés dans la base de données SQLite
- Les modifications sont enregistrées immédiatement
- Les suppressions annulent l'effet sur le stock
- L'historique complet est conservé

## 🚀 Accès rapide

- **Menu**: Mouvements de stock
- **Route**: `/mouvements`
- **Raccourci clavier**: Aucun (utilisez le menu)

## ⚠️ Points importants

1. **Modification de quantité**: Modifie uniquement le mouvement, pas le stock directement
2. **Suppression**: Annule l'effet du mouvement sur le stock
3. **Date antérieure**: Vous pouvez enregistrer des mouvements avec une date antérieure
4. **Impression**: Génère un document HTML formaté, compatible avec tous les navigateurs

## 📝 Notes techniques

- **Pagination**: 20 mouvements par page
- **Limite de chargement**: 1000 mouvements maximum (pour performance)
- **Impression**: Utilise `window.open()` pour ouvrir dans une nouvelle fenêtre
- **Recherche**: Insensible à la casse
- **Filtres de date**: Format ISO (YYYY-MM-DD)
