# 🚀 Solution Rapide - Node.js LTS

## Problème actuel

✅ Python installé  
❌ Visual Studio Build Tools manquant

**Solution** : Utiliser Node.js LTS v20 qui a des binaires précompilés !

---

## 📝 Instructions (5 minutes)

### Étape 1 : Désinstaller Node.js v24

1. Appuyez sur `Windows + R`
2. Tapez : `appwiz.cpl`
3. Cherchez "Node.js" dans la liste
4. Clic droit → Désinstaller
5. Attendez la fin de la désinstallation

### Étape 2 : Télécharger Node.js v20 LTS

1. Allez sur **https://nodejs.org/**
2. Cliquez sur le bouton vert **"20.x.x LTS"** (à gauche)
3. Le fichier `.msi` se télécharge
4. Lancez l'installateur
5. Suivez les étapes (tout par défaut)
6. Cliquez sur "Finish"

### Étape 3 : Vérifier l'installation

Ouvrez un **nouveau terminal** PowerShell :

```powershell
node --version
# Devrait afficher : v20.x.x
```

### Étape 4 : Nettoyer le projet

```powershell
cd C:\Users\D\Desktop\ai\stock-electron-manager

# Supprimer node_modules
Remove-Item -Recurse -Force node_modules

# Supprimer package-lock.json
Remove-Item -Force package-lock.json
```

### Étape 5 : Réinstaller les dépendances

```powershell
npm install
```

**Résultat attendu** : Installation réussie en 1-2 minutes ✅

---

## 🎯 Pourquoi ça fonctionne ?

| Node.js v24 | Node.js v20 LTS |
|-------------|-----------------|
| ❌ Trop récent | ✅ Stable |
| ❌ Pas de binaires précompilés | ✅ Binaires disponibles |
| ❌ Nécessite Visual Studio | ✅ Pas besoin de compiler |
| ❌ Problèmes de compatibilité | ✅ Testé et éprouvé |

---

## ✅ Checklist

- [ ] Node.js v24 désinstallé
- [ ] Node.js v20 LTS téléchargé
- [ ] Node.js v20 LTS installé
- [ ] Terminal redémarré
- [ ] `node --version` affiche v20.x.x
- [ ] node_modules supprimé
- [ ] package-lock.json supprimé
- [ ] `npm install` exécuté avec succès

---

## 🆘 Si ça ne fonctionne pas

### Problème : `node --version` affiche toujours v24

**Solution** : Redémarrez complètement votre ordinateur

### Problème : npm install échoue toujours

**Vérifiez** :
```powershell
# Version de Node.js
node --version

# Version de npm
npm --version

# Nettoyer le cache npm
npm cache clean --force
```

Puis réessayez :
```powershell
npm install
```

---

## 📞 Commande complète (copier-coller)

```powershell
# Aller dans le dossier
cd C:\Users\D\Desktop\ai\stock-electron-manager

# Nettoyer
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

# Nettoyer le cache
npm cache clean --force

# Réinstaller
npm install
```

---

## 🎉 Après installation réussie

Lancez l'application :

```powershell
npm run dev
```

L'application devrait démarrer sans erreur ! 🚀

---

## 💡 Alternative (si vous voulez garder Node v24)

Si vous préférez garder Node.js v24, installez Visual Studio Build Tools :

1. **PowerShell en tant qu'administrateur** :
   ```powershell
   npm install --global windows-build-tools
   ```

2. **Attendez 20-30 minutes** (téléchargement + installation)

3. **Redémarrez le terminal**

4. **Réessayez** :
   ```powershell
   npm install
   ```

**Inconvénient** : Installation longue et lourde (~10 Go)

---

## 🎯 Recommandation finale

👉 **Utilisez Node.js v20 LTS** pour un environnement stable et sans complications !

Node.js v24 est trop récent pour un projet Electron en production.

---

**Bonne chance !** 🚀
