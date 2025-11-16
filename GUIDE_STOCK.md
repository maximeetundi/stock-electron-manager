# Guide d'utilisation - Gestion de Stock v1.2

Ce guide vous explique comment utiliser les nouvelles fonctionnalités de gestion de stock ajoutées dans la version 1.2.0.

## Table des matières
1. [Gestion des Articles](#gestion-des-articles)
2. [Gestion des Fournisseurs](#gestion-des-fournisseurs)
3. [Création de Bons de Commande](#création-de-bons-de-commande)
4. [Suivi des Mouvements de Stock](#suivi-des-mouvements-de-stock)
5. [Alertes de Stock](#alertes-de-stock)

---

## Gestion des Articles

### Ajouter un article

1. Accédez à la page **Gestion de stock** depuis le menu
2. Cliquez sur **Nouvel article**
3. Remplissez les informations :
   - **Code** : Identifiant unique de l'article (ex: ART001)
   - **Désignation** : Nom descriptif de l'article
   - **Unité** : Unité de mesure (ex: unité, kg, litre, boîte)
   - **Prix unitaire** : Prix de l'article en FCFA
   - **Quantité initiale** : Stock de départ (uniquement à la création)
   - **Stock minimum** : Seuil d'alerte pour les ruptures
4. Cliquez sur **Enregistrer**

### Modifier un article

1. Dans le tableau des articles, cliquez sur l'icône ✏️ (crayon)
2. Modifiez les informations souhaitées
3. Note : La quantité en stock ne peut pas être modifiée directement, utilisez les mouvements de stock
4. Cliquez sur **Enregistrer**

### Supprimer un article

1. Cliquez sur l'icône 🗑️ (poubelle) à côté de l'article
2. Confirmez la suppression
3. ⚠️ Attention : Vous ne pouvez pas supprimer un article utilisé dans un bon de commande

---

## Gestion des Fournisseurs

### Ajouter un fournisseur

1. Dans la page **Gestion de stock**, cliquez sur l'onglet **Fournisseurs**
2. Cliquez sur **Nouveau fournisseur**
3. Remplissez les informations :
   - **Nom** : Nom du fournisseur (obligatoire)
   - **Adresse** : Adresse complète
   - **Téléphone** : Numéro de téléphone
   - **Email** : Adresse email
4. Cliquez sur **Enregistrer**

### Modifier/Supprimer un fournisseur

- Utilisez les icônes ✏️ et 🗑️ dans le tableau
- ⚠️ Vous ne pouvez pas supprimer un fournisseur ayant des bons de commande

---

## Création de Bons de Commande

### Créer un bon de commande

1. Accédez à la page **Bons de commande**
2. Cliquez sur **Nouveau bon**
3. Sélectionnez le **Fournisseur**
4. Choisissez la **Date** de commande
5. Ajoutez des articles :
   - Sélectionnez un article dans la liste
   - Indiquez la quantité
   - Le prix unitaire est pré-rempli, vous pouvez le modifier
   - Cliquez sur **Ajouter**
   - Répétez pour tous les articles souhaités
6. Ajoutez des **Observations** si nécessaire
7. Vérifiez le montant total
8. Cliquez sur **Créer le bon**

Le bon de commande reçoit automatiquement un numéro unique (ex: BC-2025-001).

### Gérer un bon de commande

**Consulter les détails** :
- Cliquez sur l'icône 👁️ (œil) pour voir tous les détails
- Vous pouvez exporter le bon en PDF depuis cette vue

**Marquer comme livré** :
- Cliquez sur l'icône ✓ (coche verte) pour les bons EN_COURS
- Le stock est automatiquement mis à jour avec les quantités commandées
- Le statut passe à LIVREE

**Annuler un bon** :
- Cliquez sur l'icône ✕ (croix orange)
- Le statut passe à ANNULEE
- Le stock n'est pas affecté

**Supprimer un bon** :
- Cliquez sur l'icône 🗑️ (poubelle)
- ⚠️ Seuls les bons EN_COURS ou ANNULEE peuvent être supprimés
- Les bons LIVREE ne peuvent pas être supprimés (intégrité des données)

### Export PDF

1. Ouvrez les détails d'un bon de commande
2. Cliquez sur **Export PDF**
3. Le fichier PDF est généré avec :
   - En-tête avec numéro et date
   - Informations du fournisseur
   - Tableau détaillé des articles
   - Montant total
   - Observations

---

## Suivi des Mouvements de Stock

Les mouvements de stock sont automatiquement créés dans plusieurs cas :

### Mouvement automatique (Livraison)
- Quand vous marquez un bon de commande comme LIVREE
- Type : ENTREE
- Référence : Numéro du bon de commande
- Motif : "Réception bon de commande"

### Mouvement manuel
Pour ajouter un mouvement manuel (sortie, ajustement) :
1. Cette fonctionnalité sera ajoutée dans une prochaine version
2. Pour l'instant, les mouvements sont générés automatiquement

### Consulter l'historique
1. Accédez à l'onglet **Mouvements** dans la page Gestion de stock
2. Vous verrez :
   - Date et heure du mouvement
   - Article concerné
   - Type de mouvement (ENTREE, SORTIE, AJUSTEMENT)
   - Quantité
   - Référence (ex: numéro de bon)
   - Motif

---

## Alertes de Stock

### Comment fonctionnent les alertes ?

Une alerte apparaît automatiquement en haut de la page Gestion de stock quand :
- Le stock actuel ≤ Stock minimum défini pour l'article
- L'alerte est visible avec un fond orange
- Les articles en alerte sont mis en évidence en rouge dans le tableau

### Gérer les alertes

1. **Consulter les alertes** : Elles s'affichent automatiquement
2. **Résoudre une alerte** :
   - Créez un bon de commande pour réapprovisionner
   - Ou modifiez le stock minimum si le seuil est incorrect
3. **Éviter les alertes** :
   - Définissez des stocks minimums réalistes
   - Créez des bons de commande avant la rupture

---

## Conseils et Bonnes Pratiques

### Organisation des articles
- Utilisez des codes cohérents (ex: CAT-001, CAT-002)
- Nommez clairement vos articles
- Définissez les bonnes unités de mesure

### Gestion des fournisseurs
- Renseignez toutes les coordonnées
- Maintenez les informations à jour
- Un fournisseur = une source d'approvisionnement

### Bons de commande
- Vérifiez bien les quantités et prix avant création
- Ajoutez des observations pour les conditions spéciales
- Marquez les bons comme livrés rapidement pour un stock à jour
- Conservez les PDF pour vos archives

### Stock
- Définissez des stocks minimums raisonnables
- Surveillez régulièrement les alertes
- Anticipez les ruptures de stock

### Traçabilité
- Consultez régulièrement l'historique des mouvements
- Vérifiez la cohérence entre bons livrés et entrées en stock
- Utilisez les références pour retrouver l'origine des mouvements

---

## FAQ

**Q: Puis-je modifier la quantité en stock directement ?**  
R: Non, la quantité en stock est calculée automatiquement à partir des mouvements pour garantir la traçabilité.

**Q: Que se passe-t-il si je supprime un article ?**  
R: L'article et son historique de mouvements sont supprimés. Les bons de commande existants empêchent la suppression.

**Q: Comment corriger une erreur de stock ?**  
R: Pour l'instant, contactez l'administrateur. La fonctionnalité d'ajustement manuel sera ajoutée prochainement.

**Q: Puis-je exporter tous les articles en Excel ?**  
R: Cette fonctionnalité sera ajoutée dans une future version.

**Q: Les bons de commande annulés affectent-ils le stock ?**  
R: Non, seuls les bons LIVREE mettent à jour le stock.

---

## Support

Pour toute question ou problème :
- Consultez le fichier README.md
- Vérifiez le CHANGELOG.md pour les nouveautés
- Contactez le support technique de votre établissement
