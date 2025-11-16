# 🔧 Améliorations à apporter au système de stock

Vous avez soulevé deux points importants qui nécessitent des modifications :

## 1️⃣ Bons de commande pour SERVICES (pas seulement articles)

### 🎯 Problème actuel
- Les bons de commande ne peuvent contenir QUE des articles du stock
- Impossible de commander des services comme "Réparation panne véhicule scolaire"

### ✅ Solution proposée

**Modifications nécessaires** :

#### A. Base de données (db.js)
Modifier la table `bons_commande_items` pour accepter NULL dans `article_id` :

```javascript
// Dans initializeSchema()
db.prepare(`
  CREATE TABLE IF NOT EXISTS bons_commande_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bon_commande_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'article' CHECK (type IN ('article', 'service')),
    article_id INTEGER, -- Peut être NULL pour les services
    designation TEXT NOT NULL, -- Obligatoire pour les services
    unite TEXT NOT NULL DEFAULT 'unité',
    quantite INTEGER NOT NULL,
    prix_unitaire REAL NOT NULL,
    montant REAL NOT NULL,
    affecte_stock BOOLEAN NOT NULL DEFAULT 1,
    FOREIGN KEY (bon_commande_id) REFERENCES bons_commande(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE RESTRICT
  )
`).run();
```

#### B. Page BonsCommandePage.jsx

**Ajouter un sélecteur de type** :
- Option "Article de stock" → Sélection depuis la liste
- Option "Service / Prestation" → Saisie libre

**Exemple d'interface** :
```jsx
// Type de ligne
<div>
  <label>Type de ligne</label>
  <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
    <option value="article">📦 Article de stock</option>
    <option value="service">🔧 Service / Prestation</option>
  </select>
</div>

{itemType === 'article' ? (
  // Sélection depuis liste d'articles
  <select>
    {articles.map(a => <option>{a.designation}</option>)}
  </select>
) : (
  // Saisie libre pour service
  <>
    <input 
      placeholder="Ex: Réparation panne véhicule scolaire"
      value={serviceDesignation}
    />
    <input placeholder="Unité (ex: forfait)" />
    <input type="number" placeholder="Prix" />
  </>
)}
```

**Logique de traitement** :
```javascript
const handleAddItem = () => {
  if (itemType === 'article') {
    // Article → affecte_stock = true, article_id renseigné
    setItems([...items, {
      type: 'article',
      article_id: selectedArticle.id,
      designation: selectedArticle.designation,
      affecte_stock: true
    }]);
  } else {
    // Service → affecte_stock = false, article_id = null
    setItems([...items, {
      type: 'service',
      article_id: null,
      designation: serviceDesignation,
      affecte_stock: false
    }]);
  }
};
```

**Mise à jour du stock** :
```javascript
// Lors du changement de statut à LIVREE
for (const item of bonItems) {
  if (item.affecte_stock && item.article_id) {
    // Uniquement pour les articles
    await addMouvementStock({
      article_id: item.article_id,
      type: 'ENTREE',
      quantite: item.quantite
    });
  }
  // Les services ne touchent pas le stock
}
```

---

## 2️⃣ Interface pour saisir les MOUVEMENTS DE STOCK

### 🎯 Problème actuel
- Pas d'interface pour saisir manuellement les mouvements
- Impossible de sortir du stock pour utilisation
- Impossible de faire des ajustements d'inventaire

### ✅ Solution proposée

**Ajouter un onglet "Mouvements" dans StockPage.jsx** :

```jsx
const [activeTab, setActiveTab] = useState('articles');

// Onglets
<div className="flex gap-2">
  <button onClick={() => setActiveTab('articles')}>Articles</button>
  <button onClick={() => setActiveTab('fournisseurs')}>Fournisseurs</button>
  <button onClick={() => setActiveTab('mouvements')}>🔄 Mouvements</button>
</div>

{activeTab === 'mouvements' && (
  <MouvementsStockTab />
)}
```

**Composant MouvementsStockTab** :

```jsx
function MouvementsStockTab() {
  const [mouvementForm, setMouvementForm] = useState({
    article_id: '',
    type: 'SORTIE', // ENTREE, SORTIE, AJUSTEMENT
    quantite: 1,
    reference: '',
    motif: ''
  });

  const handleSubmit = async () => {
    await window.api.mouvements.add(mouvementForm);
    // Le stock est mis à jour automatiquement dans la BDD
  };

  return (
    <Card>
      <h3>Saisir un mouvement de stock</h3>
      
      <div>
        <label>Article</label>
        <select value={mouvementForm.article_id}>
          {articles.map(a => (
            <option value={a.id}>
              {a.code} - {a.designation} (Stock: {a.quantite_stock})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Type de mouvement</label>
        <select value={mouvementForm.type}>
          <option value="ENTREE">⬆️ Entrée (Réception)</option>
          <option value="SORTIE">⬇️ Sortie (Utilisation)</option>
          <option value="AJUSTEMENT">⚙️ Ajustement (Correction inventaire)</option>
        </select>
      </div>

      <div>
        <label>Quantité</label>
        <input 
          type="number" 
          value={mouvementForm.quantite}
        />
      </div>

      <div>
        <label>Référence</label>
        <input 
          placeholder="Ex: Demande service pédagogique"
          value={mouvementForm.reference}
        />
      </div>

      <div>
        <label>Motif</label>
        <textarea 
          placeholder="Ex: Fournitures pour classe de 6ème"
          value={mouvementForm.motif}
        />
      </div>

      <button onClick={handleSubmit}>
        Enregistrer le mouvement
      </button>

      {/* Liste des derniers mouvements */}
      <div className="mt-6">
        <h4>Historique des mouvements</h4>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Article</th>
              <th>Type</th>
              <th>Quantité</th>
              <th>Référence</th>
              <th>Motif</th>
            </tr>
          </thead>
          <tbody>
            {mouvements.map(m => (
              <tr>
                <td>{new Date(m.date_mouvement).toLocaleString()}</td>
                <td>{m.article_designation}</td>
                <td>
                  {m.type === 'ENTREE' && '⬆️ Entrée'}
                  {m.type === 'SORTIE' && '⬇️ Sortie'}
                  {m.type === 'AJUSTEMENT' && '⚙️ Ajustement'}
                </td>
                <td className={m.type === 'SORTIE' ? 'text-red-600' : 'text-green-600'}>
                  {m.type === 'SORTIE' ? '-' : '+'}{m.quantite}
                </td>
                <td>{m.reference}</td>
                <td>{m.motif}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
```

**Logique backend (déjà présente dans db.js)** :
```javascript
function addMouvementStock({ article_id, type, quantite, reference, motif }) {
  return dbTransaction(() => {
    // 1. Insérer le mouvement
    db.prepare(`
      INSERT INTO mouvements_stock (article_id, type, quantite, reference, motif)
      VALUES (?, ?, ?, ?, ?)
    `).run(article_id, type, quantite, reference, motif);

    // 2. Mettre à jour le stock de l'article
    if (type === 'ENTREE' || type === 'AJUSTEMENT' && quantite > 0) {
      db.prepare(`
        UPDATE articles 
        SET quantite_stock = quantite_stock + ?
        WHERE id = ?
      `).run(quantite, article_id);
    } else if (type === 'SORTIE') {
      db.prepare(`
        UPDATE articles 
        SET quantite_stock = quantite_stock - ?
        WHERE id = ?
      `).run(quantite, article_id);
    }
  });
}
```

---

## 📋 Résumé des modifications

### ✅ Bons de commande flexibles
1. Modifier schéma `bons_commande_items` pour accepter services
2. Ajouter sélecteur "Article" vs "Service" dans l'interface
3. Distinction article (affecte stock) vs service (n'affecte pas stock)

### ✅ Mouvements de stock manuels
1. Ajouter onglet "Mouvements" dans StockPage
2. Formulaire de saisie avec :
   - Article (liste déroulante)
   - Type (Entrée/Sortie/Ajustement)
   - Quantité
   - Référence (optionnel)
   - Motif (optionnel)
3. Afficher historique des mouvements

---

## 🎯 Cas d'usage

### Exemple 1 : Bon de commande mixte
```
Fournisseur: Garage Auto École
Date: 16/11/2025

Lignes:
1. [Article] Huile moteur 5L - 15 000 FCFA ✅ Affecte stock
2. [Service] Réparation panne véhicule - 85 000 FCFA ❌ N'affecte pas stock
3. [Article] Filtre à air - 8 000 FCFA ✅ Affecte stock

Total: 108 000 FCFA

Lors de la livraison:
- Huile moteur → Stock +1
- Réparation → Pas de mouvement stock
- Filtre à air → Stock +1
```

### Exemple 2 : Sortie de stock manuelle
```
Article: Cahiers 100 pages (Stock actuel: 250)
Type: SORTIE
Quantité: 50
Référence: Demande Prof. Dupont
Motif: Distribution classe de 5ème A

Résultat → Stock = 200
```

### Exemple 3 : Ajustement d'inventaire
```
Article: Stylos bleus (Stock système: 120)
Type: AJUSTEMENT
Quantité: -15
Référence: Inventaire physique 16/11/2025
Motif: Différence constatée lors comptage

Résultat → Stock = 105
```

---

## 🚀 Prochaines étapes

1. **Modifier la base de données** (db.js)
2. **Créer l'interface mouvements** (StockPage.jsx)
3. **Améliorer bons de commande** (BonsCommandePage.jsx)
4. **Tester** les deux fonctionnalités

---

Voulez-vous que j'implémente ces modifications maintenant ?
