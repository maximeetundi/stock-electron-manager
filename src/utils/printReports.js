import { getPrintBrandingBlocks } from '@/utils/documentBranding';

export const generateEtatStockPrintHtml = (articles, stats, branding) => {
  const { headerHtml, footerHtml, styles: brandingStyles } = getPrintBrandingBlocks(branding);
  const tableRows = articles.map(a => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${a.code}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${a.designation}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${a.unite}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${a.quantite_stock}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${a.quantite_min}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${a.prix_unitaire.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${(a.quantite_stock * a.prix_unitaire).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${a.quantite_stock <= a.quantite_min ? '<span style="background-color: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-size: 12px;">ALERTE</span>' : '<span style="background-color: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 12px;">OK</span>'}</td>
    </tr>
  `).join('');

  const totalStock = articles.reduce((sum, a) => sum + a.quantite_stock, 0);
  const articlesEnRupture = articles.filter(a => a.quantite_stock === 0).length;
  const valeurMoyenne = articles.length > 0 ? (stats.valeurTotaleStock / articles.length).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>État des Stocks</title>
      <style>
        ${brandingStyles}
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; }
        .header h1 { margin: 0; color: #1e293b; font-size: 28px; }
        .header p { margin: 5px 0; color: #64748b; }
        .info-section { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
        .info-box { background-color: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; }
        .info-box-label { font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase; }
        .info-box-value { font-size: 20px; font-weight: bold; color: #1e293b; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background-color: #3b82f6; color: white; padding: 12px; text-align: left; font-weight: bold; }
        .stats { background-color: #f1f5f9; padding: 20px; border-radius: 6px; margin-top: 20px; }
        .stats h3 { margin-top: 0; color: #1e293b; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .stat-item { background-color: white; padding: 15px; border-radius: 4px; border: 1px solid #e2e8f0; }
        .stat-label { font-size: 12px; color: #64748b; font-weight: bold; }
        .stat-value { font-size: 18px; font-weight: bold; color: #1e293b; margin-top: 5px; }
      </style>
    </head>
    <body>
      ${headerHtml}
      <div class="container">
        <div class="header">
          <h1>ÉTAT DES STOCKS</h1>
          <p>Document généré le ${new Date().toLocaleString('fr-FR')}</p>
        </div>

        <div class="info-section">
          <div class="info-box">
            <div class="info-box-label">Nombre d'articles</div>
            <div class="info-box-value">${stats.totalArticles}</div>
          </div>
          <div class="info-box">
            <div class="info-box-label">Valeur totale</div>
            <div class="info-box-value">${stats.valeurTotaleStock.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA</div>
          </div>
          <div class="info-box">
            <div class="info-box-label">Articles en alerte</div>
            <div class="info-box-value">${stats.articlesEnAlerte}</div>
          </div>
          <div class="info-box">
            <div class="info-box-label">Articles en rupture</div>
            <div class="info-box-value">${articlesEnRupture}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Désignation</th>
              <th>Unité</th>
              <th style="text-align: right;">Stock</th>
              <th style="text-align: right;">Stock Min</th>
              <th style="text-align: right;">P.U. (FCFA)</th>
              <th style="text-align: right;">Valeur (FCFA)</th>
              <th style="text-align: center;">État</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="stats">
          <h3>STATISTIQUES</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">Total quantités</div>
              <div class="stat-value">${totalStock.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} unités</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Articles en rupture</div>
              <div class="stat-value">${articlesEnRupture}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Valeur moyenne</div>
              <div class="stat-value">${valeurMoyenne} FCFA</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Taux d'alerte</div>
              <div class="stat-value">${((stats.articlesEnAlerte / stats.totalArticles) * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>

      </div>
      ${footerHtml}
      <div class="doc-branding-footnote">Ce document a été généré automatiquement par le système de gestion de stock.</div>
    </body>
    </html>
  `;
};

export const generateBonsCommandePrintHtml = (filtered, stats, filters, selectedPeriod, PERIOD_CHOICES, branding) => {
  const { headerHtml, footerHtml, styles: brandingStyles } = getPrintBrandingBlocks(branding);
  const tableRows = filtered.map(b => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${b.numero}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${new Date(b.date_commande).toLocaleDateString('fr-FR')}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${b.fournisseur_nom}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">
        <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; ${
          b.statut === 'EN_COURS' ? 'background-color: #fef3c7; color: #92400e;' :
          b.statut === 'LIVREE' ? 'background-color: #dcfce7; color: #166534;' :
          'background-color: #fee2e2; color: #991b1b;'
        }">${b.statut}</span>
      </td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${b.montant_total.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
    </tr>
  `).join('');

  const totalMontant = filtered.reduce((sum, b) => sum + b.montant_total, 0);
  const bonsEnCours = filtered.filter(b => b.statut === 'EN_COURS').length;
  const bonsLivres = filtered.filter(b => b.statut === 'LIVREE').length;
  const bonsAnnules = filtered.filter(b => b.statut === 'ANNULEE').length;
  const montantMoyen = filtered.length > 0 ? (totalMontant / filtered.length).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : 0;

  let periodeText = 'Toutes les périodes';
  if (filters.dateDebut && filters.dateFin) {
    const dateDebut = new Date(filters.dateDebut).toLocaleDateString('fr-FR');
    const dateFin = new Date(filters.dateFin).toLocaleDateString('fr-FR');
    periodeText = `${dateDebut} au ${dateFin}`;
  } else if (selectedPeriod !== 'all' && selectedPeriod !== 'custom') {
    const periodLabel = PERIOD_CHOICES.find(p => p.key === selectedPeriod)?.label || '';
    periodeText = periodLabel;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Rapport Bons de Commande</title>
      <style>
        ${brandingStyles}
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; }
        .header h1 { margin: 0; color: #1e293b; font-size: 28px; }
        .header p { margin: 5px 0; color: #64748b; }
        .info-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
        .info-box { background-color: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; }
        .info-box-label { font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase; }
        .info-box-value { font-size: 20px; font-weight: bold; color: #1e293b; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background-color: #3b82f6; color: white; padding: 12px; text-align: left; font-weight: bold; }
        .stats { background-color: #f1f5f9; padding: 20px; border-radius: 6px; margin-top: 20px; }
        .stats h3 { margin-top: 0; color: #1e293b; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .stat-item { background-color: white; padding: 15px; border-radius: 4px; border: 1px solid #e2e8f0; }
        .stat-label { font-size: 12px; color: #64748b; font-weight: bold; }
        .stat-value { font-size: 18px; font-weight: bold; color: #1e293b; margin-top: 5px; }
      </style>
    </head>
    <body>
      ${headerHtml}
      <div class="container">
        <div class="header">
          <h1>RAPPORT BONS DE COMMANDE</h1>
          <p>Document généré le ${new Date().toLocaleString('fr-FR')}</p>
        </div>

        <div class="info-section">
          <div class="info-box">
            <div class="info-box-label">Période</div>
            <div class="info-box-value" style="font-size: 14px;">${periodeText}</div>
          </div>
          <div class="info-box">
            <div class="info-box-label">Nombre de bons</div>
            <div class="info-box-value">${filtered.length}</div>
          </div>
          <div class="info-box">
            <div class="info-box-label">Montant total</div>
            <div class="info-box-value" style="font-size: 16px;">${totalMontant.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>N° Bon</th>
              <th>Date</th>
              <th>Fournisseur</th>
              <th style="text-align: center;">Statut</th>
              <th style="text-align: right;">Montant (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="stats">
          <h3>STATISTIQUES</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">Bons en cours</div>
              <div class="stat-value">${bonsEnCours}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Bons livrés</div>
              <div class="stat-value">${bonsLivres}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Bons annulés</div>
              <div class="stat-value">${bonsAnnules}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Montant moyen</div>
              <div class="stat-value">${montantMoyen} FCFA</div>
            </div>
          </div>
        </div>

      </div>
      ${footerHtml}
      <div class="doc-branding-footnote">Ce document a été généré automatiquement par le système de gestion de stock.</div>
    </body>
    </html>
  `;
};

export const generateMouvementsPrintHtml = (filtered, filters, selectedPeriod, PERIOD_CHOICES, branding) => {
  const { headerHtml, footerHtml, styles: brandingStyles } = getPrintBrandingBlocks(branding);
  const tableRows = filtered.map(m => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${new Date(m.date_mouvement).toLocaleDateString('fr-FR')}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${m.code}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${m.designation}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">
        <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; ${
          m.type === 'ENTREE' ? 'background-color: #dcfce7; color: #166534;' :
          m.type === 'SORTIE' ? 'background-color: #fee2e2; color: #991b1b;' :
          'background-color: #dbeafe; color: #1e40af;'
        }">${m.type}</span>
      </td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${m.quantite}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${m.reference || '-'}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${m.motif || '-'}</td>
    </tr>
  `).join('');

  const entrees = filtered.filter(m => m.type === 'ENTREE');
  const sorties = filtered.filter(m => m.type === 'SORTIE');
  const totalEntrees = entrees.length;
  const totalSorties = sorties.length;
  const quantiteEntrees = entrees.reduce((sum, m) => sum + m.quantite, 0);
  const quantiteSorties = sorties.reduce((sum, m) => sum + m.quantite, 0);
  const quantiteMoyenne = filtered.length > 0 ? (filtered.reduce((sum, m) => sum + m.quantite, 0) / filtered.length).toFixed(1) : 0;

  let periodeText = 'Toutes les périodes';
  if (filters.dateDebut && filters.dateFin) {
    const dateDebut = new Date(filters.dateDebut).toLocaleDateString('fr-FR');
    const dateFin = new Date(filters.dateFin).toLocaleDateString('fr-FR');
    periodeText = `${dateDebut} au ${dateFin}`;
  } else if (selectedPeriod !== 'all' && selectedPeriod !== 'custom') {
    const periodLabel = PERIOD_CHOICES.find(p => p.key === selectedPeriod)?.label || '';
    periodeText = periodLabel;
  }

  let typeText = 'Tous les mouvements';
  if (filters.typeMouvement === 'ENTREE') {
    typeText = 'Entrées uniquement';
  } else if (filters.typeMouvement === 'SORTIE') {
    typeText = 'Sorties uniquement';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Rapport Mouvements de Stock</title>
      <style>
        ${brandingStyles}
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; }
        .header h1 { margin: 0; color: #1e293b; font-size: 28px; }
        .header p { margin: 5px 0; color: #64748b; }
        .info-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
        .info-box { background-color: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; }
        .info-box-label { font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase; }
        .info-box-value { font-size: 20px; font-weight: bold; color: #1e293b; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background-color: #3b82f6; color: white; padding: 12px; text-align: left; font-weight: bold; }
        .stats { background-color: #f1f5f9; padding: 20px; border-radius: 6px; margin-top: 20px; }
        .stats h3 { margin-top: 0; color: #1e293b; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .stat-item { background-color: white; padding: 15px; border-radius: 4px; border: 1px solid #e2e8f0; }
        .stat-label { font-size: 12px; color: #64748b; font-weight: bold; }
        .stat-value { font-size: 18px; font-weight: bold; color: #1e293b; margin-top: 5px; }
      </style>
    </head>
    <body>
      ${headerHtml}
      <div class="container">
        <div class="header">
          <h1>MOUVEMENTS DE STOCK</h1>
          <p>Document généré le ${new Date().toLocaleString('fr-FR')}</p>
        </div>

        <div class="info-section">
          <div class="info-box">
            <div class="info-box-label">Période</div>
            <div class="info-box-value" style="font-size: 14px;">${periodeText}</div>
          </div>
          <div class="info-box">
            <div class="info-box-label">Type</div>
            <div class="info-box-value" style="font-size: 14px;">${typeText}</div>
          </div>
          <div class="info-box">
            <div class="info-box-label">Nombre de mouvements</div>
            <div class="info-box-value">${filtered.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Code</th>
              <th>Désignation</th>
              <th style="text-align: center;">Type</th>
              <th style="text-align: right;">Quantité</th>
              <th>Référence</th>
              <th>Motif</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="stats">
          <h3>STATISTIQUES</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">Total entrées</div>
              <div class="stat-value">${totalEntrees} (${quantiteEntrees.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} u.)</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Total sorties</div>
              <div class="stat-value">${totalSorties} (${quantiteSorties.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} u.)</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Quantité moyenne</div>
              <div class="stat-value">${quantiteMoyenne} unités</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Balance</div>
              <div class="stat-value">${(quantiteEntrees - quantiteSorties > 0 ? '+' : '')}${(quantiteEntrees - quantiteSorties).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} u.</div>
            </div>
          </div>
        </div>

      </div>
      ${footerHtml}
      <div class="doc-branding-footnote">Ce document a été généré automatiquement par le système de gestion de stock.</div>
    </body>
    </html>
  `;
};
