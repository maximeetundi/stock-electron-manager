# 🐍 Installation de Python pour better-sqlite3

## Problème rencontré

L'installation de `npm install` échoue avec l'erreur :
```
gyp ERR! find Python - Could not find any Python installation to use
```

**Cause** : `better-sqlite3` nécessite Python pour compiler les bindings natifs C++.

---

## ✅ Solution : Installer Python

### Étape 1 : Télécharger Python

1. Allez sur **https://www.python.org/downloads/**
2. Cliquez sur **"Download Python 3.12.x"** (dernière version stable)
3. Le fichier d'installation se télécharge

### Étape 2 : Installer Python

1. **Lancez l'installateur** téléchargé
2. ⚠️ **TRÈS IMPORTANT** : Cochez la case **"Add python.exe to PATH"** en bas
3. Cliquez sur **"Install Now"**
4. Attendez la fin de l'installation
5. Cliquez sur **"Close"**

**Screenshot de ce qu'il faut cocher** :
```
┌─────────────────────────────────────┐
│  ☑ Add python.exe to PATH          │  ← IMPORTANT !
│                                     │
│  [Install Now]                      │
└─────────────────────────────────────┘
```

### Étape 3 : Vérifier l'installation

1. **Ouvrez un NOUVEAU terminal** (important pour que PATH soit rechargé)
2. Tapez :
   ```bash
   python --version
   ```
3. Vous devriez voir quelque chose comme : `Python 3.12.0`

### Étape 4 : Réessayer l'installation npm

```bash
cd C:\Users\D\Desktop\ai\stock-electron-manager
npm install
```

---

## 🔄 Alternative : Utiliser Node.js LTS

Si vous ne voulez pas installer Python, utilisez **Node.js v20 LTS** qui a des binaires précompilés.

### Étape 1 : Désinstaller Node.js actuel

1. Panneau de configuration → Programmes → Désinstaller Node.js
2. Supprimez aussi `C:\Program Files\nodejs` si le dossier existe encore

### Étape 2 : Installer Node.js LTS

1. Allez sur **https://nodejs.org/**
2. Téléchargez la version **LTS (20.x.x)**
3. Installez-la normalement
4. Redémarrez votre terminal

### Étape 3 : Nettoyer et réinstaller

```bash
cd C:\Users\D\Desktop\ai\stock-electron-manager

# Supprimer node_modules et package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Réinstaller
npm install
```

---

## ⚡ Commandes rapides (après installation de Python)

```bash
# Vérifier que Python est installé
python --version

# Vérifier que pip est installé
pip --version

# Si l'erreur persiste, configurer npm pour utiliser Python
npm config set python "C:\Users\D\AppData\Local\Programs\Python\Python312\python.exe"

# Puis réessayer
npm install
```

---

## 🎯 Pourquoi cette erreur ?

- **Node.js v24.11.0** est très récent (sorti récemment)
- `better-sqlite3` n'a pas encore de **binaires précompilés** pour cette version
- node-gyp doit donc **compiler depuis les sources**
- La compilation nécessite **Python + Visual Studio Build Tools** sur Windows

**Solutions** :
1. ✅ Installer Python → node-gyp peut compiler
2. ✅ Utiliser Node LTS v20 → binaires précompilés disponibles
3. ❌ Ne rien faire → l'installation échouera

---

## 📝 Recommandation

Pour un environnement de développement stable, je recommande :

1. **Utiliser Node.js LTS (v20.x)** au lieu de v24
   - Plus stable
   - Meilleur support des packages
   - Binaires précompilés disponibles

2. **Installer Python** quand même
   - Utile pour beaucoup d'autres packages npm
   - Nécessaire pour node-gyp

---

## 🆘 Si ça ne fonctionne toujours pas

### Option 1 : Installer Visual Studio Build Tools

Certains packages nécessitent aussi les outils de compilation C++ :

```bash
npm install --global windows-build-tools
```

**OU** téléchargez manuellement :
- Visual Studio Build Tools : https://visualstudio.microsoft.com/downloads/
- Sélectionnez "C++ build tools" lors de l'installation

### Option 2 : Utiliser une alternative à better-sqlite3

Modifier `package.json` pour utiliser `sql.js` (pure JavaScript, pas de compilation) :

```json
"dependencies": {
  "sql.js": "^1.8.0"
  // au lieu de "better-sqlite3"
}
```

**Inconvénient** : Moins performant que better-sqlite3

---

## ✅ Checklist de résolution

- [ ] Python installé et ajouté au PATH
- [ ] Terminal redémarré après l'installation de Python
- [ ] `python --version` fonctionne
- [ ] node_modules supprimé
- [ ] package-lock.json supprimé
- [ ] `npm install` réessayé
- [ ] Si échec : Node.js downgrader vers v20 LTS

---

## 📞 Commandes de diagnostic

```bash
# Vérifier Node.js
node --version

# Vérifier npm
npm --version

# Vérifier Python
python --version

# Vérifier node-gyp
npm list -g node-gyp

# Voir la config npm pour Python
npm config get python

# Logs détaillés
npm install --verbose
```

---

**Bonne chance !** 🚀

Une fois Python installé, l'installation devrait fonctionner sans problème.
