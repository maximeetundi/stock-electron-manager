# 🛠️ Modifications à apporter à BonsCommandePage.jsx

## ✅ Ce qui est déjà fait

1. ✅ Base de données modifiée pour accepter services ET articles
2. ✅ Fonction `createBonCommande` mise à jour
3. ✅ Fonction `updateBonCommandeStatut` mise à jour (ne touche que les articles)
4. ✅ Onglet "Mouvements" ajouté dans StockPage

---

## 🔧 Modifications restantes pour BonsCommandePage.jsx

Pour permettre de créer des bons avec des services (réparations, etc.), vous devez modifier quelques parties du fichier `src/pages/BonsCommandePage.jsx`.

### 1. Ajouter l'état pour le type de ligne

Dans le composant, après les autres `useState`, ajoutez :

```javascript
const [itemType, setItemType] = useState('article'); // 'article' ou 'service'
```

### 2. Modifier le state `newItem`

Remplacez :
```javascript
const [newItem, setNewItem] = useState({
  article_id: '',
  quantite: 1,
  prix_unitaire: 0
});
```

Par :
```javascript
const [newItem, setNewItem] = useState({
  type: 'article',
  article_id: '',
  designation: '',
  unite: 'unité',
  quantite: 1,
  prix_unitaire: 0
});
```

### 3. Modifier la fonction `handleAddItem`

Remplacez toute la fonction par :

```javascript
const handleAddItem = () => {
  if (itemType === 'article') {
    // Article du stock
    if (!newItem.article_id || newItem.quantite <= 0) return;

    const article = articles.find(a => a.id === parseInt(newItem.article_id));
    if (!article) return;

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          type: 'article',
          article_id: article.id,
          code: article.code,
          designation: article.designation,
          unite: article.unite,
          quantite: newItem.quantite,
          prix_unitaire: newItem.prix_unitaire || article.prix_unitaire,
          affecte_stock: true
        }
      ]
    });
  } else {
    // Service (ligne libre)
    if (!newItem.designation.trim() || newItem.quantite <= 0 || newItem.prix_unitaire <= 0) {
      alert('Veuillez remplir tous les champs du service');
      return;
    }

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          type: 'service',
          article_id: null,
          code: 'SERVICE',
          designation: newItem.designation.trim(),
          unite: newItem.unite || 'unité',
          quantite: newItem.quantite,
          prix_unitaire: newItem.prix_unitaire,
          affecte_stock: false
        }
      ]
    });
  }

  // Réinitialiser le formulaire
  setNewItem({ 
    type: itemType, 
    article_id: '', 
    designation: '', 
    unite: 'unité', 
    quantite: 1, 
    prix_unitaire: 0 
  });
};
```

### 4. Ajouter le sélecteur Article/Service dans le formulaire

Dans le modal de création du bon, avant la section "Ajouter un article", ajoutez :

```jsx
{/* Type de ligne */}
<div>
  <label className="block text-sm font-medium mb-2">Type de ligne</label>
  <div className="flex gap-4">
    <label className="flex items-center gap-2">
      <input
        type="radio"
        value="article"
        checked={itemType === 'article'}
        onChange={(e) => {
          setItemType(e.target.value);
          setNewItem({ ...newItem, type: e.target.value });
        }}
      />
      <span>📦 Article de stock</span>
    </label>
    <label className="flex items-center gap-2">
      <input
        type="radio"
        value="service"
        checked={itemType === 'service'}
        onChange={(e) => {
          setItemType(e.target.value);
          setNewItem({ ...newItem, type: e.target.value });
        }}
      />
      <span>🔧 Service / Prestation</span>
    </label>
  </div>
</div>
```

### 5. Remplacer le formulaire d'ajout d'article

Remplacez la section d'ajout d'article par :

```jsx
<div className="rounded border-2 border-dashed border-slate-300 p-4">
  <h3 className="mb-3 font-medium">
    {itemType === 'article' ? 'Ajouter un article' : 'Ajouter un service'}
  </h3>
  
  {itemType === 'article' ? (
    // Formulaire article (existant)
    <div className="grid grid-cols-3 gap-3">
      <div className="col-span-2">
        <label className="block text-sm">Article</label>
        <select
          value={newItem.article_id}
          onChange={(e) => {
            const article = articles.find(a => a.id === parseInt(e.target.value));
            setNewItem({
              ...newItem,
              article_id: e.target.value,
              prix_unitaire: article?.prix_unitaire || 0
            });
          }}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">Sélectionner...</option>
          {articles.map(a => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.designation} ({a.prix_unitaire} FCFA)
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm">Quantité</label>
        <input
          type="number"
          min="1"
          value={newItem.quantite}
          onChange={(e) => setNewItem({ ...newItem, quantite: parseInt(e.target.value) || 1 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm">Prix unitaire (FCFA)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={newItem.prix_unitaire}
          onChange={(e) => setNewItem({ ...newItem, prix_unitaire: parseFloat(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
    </div>
  ) : (
    // Formulaire service (NOUVEAU)
    <div className="grid grid-cols-4 gap-3">
      <div className="col-span-2">
        <label className="block text-sm">Désignation *</label>
        <input
          type="text"
          value={newItem.designation}
          onChange={(e) => setNewItem({ ...newItem, designation: e.target.value })}
          placeholder="Ex: Réparation panne véhicule scolaire"
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm">Unité</label>
        <input
          type="text"
          value={newItem.unite}
          onChange={(e) => setNewItem({ ...newItem, unite: e.target.value })}
          placeholder="Ex: forfait"
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm">Quantité</label>
        <input
          type="number"
          min="1"
          value={newItem.quantite}
          onChange={(e) => setNewItem({ ...newItem, quantite: parseInt(e.target.value) || 1 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm">Prix unitaire (FCFA) *</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={newItem.prix_unitaire}
          onChange={(e) => setNewItem({ ...newItem, prix_unitaire: parseFloat(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
    </div>
  )}

  <button
    type="button"
    onClick={handleAddItem}
    className="mt-3 flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
  >
    <PlusIcon className="h-4 w-4" />
    Ajouter
  </button>
</div>
```

### 6. Modifier le tableau des lignes ajoutées

Ajoutez une colonne "Type" dans le tableau qui affiche les lignes du bon :

```jsx
<thead>
  <tr className="border-b bg-slate-50">
    <th className="px-2 py-2 text-left">Type</th>
    <th className="px-2 py-2 text-left">Code</th>
    <th className="px-2 py-2 text-left">Désignation</th>
    {/* ... autres colonnes */}
  </tr>
</thead>
<tbody>
  {formData.items.map((item, index) => (
    <tr key={index} className="border-b">
      <td className="px-2 py-2">
        <span className={`inline-block rounded px-2 py-0.5 text-xs ${
          item.type === 'article' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>
          {item.type === 'article' ? 'Article' : 'Service'}
        </span>
      </td>
      <td className="px-2 py-2">{item.code}</td>
      <td className="px-2 py-2">{item.designation}</td>
      {/* ... autres colonnes */}
    </tr>
  ))}
</tbody>
```

---

## ✅ Résultat attendu

Après ces modifications, vous pourrez :

1. ✅ Créer des bons avec des **articles de stock**
2. ✅ Créer des bons avec des **services** (réparations, etc.)
3. ✅ Mixer articles et services dans le même bon
4. ✅ Le stock est mis à jour uniquement pour les articles
5. ✅ Les services n'affectent pas le stock

### Exemple de bon de commande mixte

```
Fournisseur: Garage Auto École
Date: 16/11/2025

Lignes:
1. [Article] Huile moteur 5L - 15 000 FCFA → Affecte stock ✅
2. [Service] Réparation panne véhicule - 85 000 FCFA → N'affecte pas stock ❌
3. [Article] Filtre à air - 8 000 FCFA → Affecte stock ✅

Total: 108 000 FCFA
```

---

## 🎯 Instructions rapides

1. Ouvrez `src/pages/BonsCommandePage.jsx`
2. Appliquez les 6 modifications ci-dessus
3. Testez en créant un bon avec un service
4. Vérifiez que le stock n'est pas affecté par les services

---

**C'est prêt !** Vous pouvez maintenant créer des bons de commande pour des services ! 🎉
