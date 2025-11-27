import { appApi, fileApi } from '@/utils/apiClient';

const LINE_SEPARATOR = /\r?\n/;

const DEFAULT_HEADER_LEFT = [
  'RÉPUBLIQUE DU CAMEROUN',
  'Paix-Travail-Patrie',
  '************',
  "MINISTÈRE DE L'ÉDUCATION DE BASE",
  '************',
  'DÉLÉGATION RÉGIONALE DU CENTRE',
  '************',
  'DÉLÉGATION DÉPARTEMENTALE DE LA MEFOU ET AFAMBA',
  '************',
  "INSPECTION D'ARRONDISSEMENT DE MFOU"
].join('\n');

const DEFAULT_HEADER_RIGHT = [
  'REPUBLIC OF CAMEROON',
  'Peace-Work-Fatherland',
  '************',
  'MINISTRY OF BASIC EDUCATION',
  '************',
  'REGIONAL DELEGATION OF CENTRE',
  '************',
  'DIVISIONAL DELEGATION OF MEFOU-AFAMBA',
  '************',
  'SUB DIVISIONAL INSPECTION OF MFOU'
].join('\n');

const DEFAULT_CENTER_TITLE = 'COMPLEXE SCOLAIRE SAINT-MICHEL ARCHANGE DE MINKAN';
const DEFAULT_CENTER_SUBTITLE = 'BP. 10247 Yaoundé • Tél. : 242 04 15 16';

const DEFAULT_SIGNERS = [
  { slot: 'left', label: 'Directeur Administratif et Financier', name: '' },
  { slot: 'center', label: 'Responsable Logistique', name: '' },
  { slot: 'right', label: 'Comptable', name: '' }
];

const DEFAULT_MARGINS = {
  left: 18,
  right: 195,
  top: 15
};

const FOOTER_HEIGHT = 45;

const parseLines = (value, fallback) => {
  const base = typeof value === 'string' && value.trim().length ? value : fallback || '';
  return base
    .split(LINE_SEPARATOR)
    .map((line) => line.trim())
    .filter(Boolean);
};

const withSeparators = (lines) => {
  const clean = (lines || []).filter(Boolean);
  if (!clean.length) return [];
  // Retourner les lignes sans séparateurs
  return clean.map((line) => ({ text: line, isSeparator: false }));
};

const normalizeSigners = (raw) => {
  let parsed = [];
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = [];
    }
  } else if (Array.isArray(raw)) {
    parsed = raw;
  }

  if (!Array.isArray(parsed) || !parsed.length) {
    return DEFAULT_SIGNERS;
  }

  return parsed
    .map((signer, index) => ({
      slot: signer?.slot || ['left', 'center', 'right'][index] || `slot-${index}`,
      label: signer?.label || '',
      name: signer?.name || ''
    }))
    .filter((signer) => signer.label || signer.name);
};

const getFallbackBranding = () => ({
  header: {
    leftLines: parseLines('', DEFAULT_HEADER_LEFT),
    rightLines: parseLines('', DEFAULT_HEADER_RIGHT),
    centerTitle: DEFAULT_CENTER_TITLE,
    centerSubtitle: DEFAULT_CENTER_SUBTITLE,
    emblemPath: '',
    emblemDataUrl: ''
  },
  footer: {
    signers: DEFAULT_SIGNERS
  }
});

const hydrateBranding = async (settings) => {
  const header = {
    leftLines: parseLines(settings?.doc_header_left, DEFAULT_HEADER_LEFT),
    rightLines: parseLines(settings?.doc_header_right, DEFAULT_HEADER_RIGHT),
    centerTitle: settings?.doc_header_center_title || DEFAULT_CENTER_TITLE,
    centerSubtitle: settings?.doc_header_center_subtitle || DEFAULT_CENTER_SUBTITLE,
    emblemPath: settings?.doc_header_emblem_path || settings?.org_logo_path || '',
    emblemDataUrl: ''
  };

  if (header.emblemPath) {
    try {
      header.emblemDataUrl = await fileApi.readAsDataUrl(header.emblemPath);
    } catch (error) {
      console.warn('Impossible de charger le visuel de la bannière', error);
      header.emblemDataUrl = '';
    }
  }

  const footer = {
    signers: normalizeSigners(settings?.doc_footer_signers)
  };

  return { header, footer };
};

export const loadDocumentBranding = async () => {
  try {
    const settings = await appApi.getSettings();
    return await hydrateBranding(settings);
  } catch (error) {
    console.error('Impossible de charger la personnalisation des documents', error);
    return getFallbackBranding();
  }
};

const computeHeaderHeight = (branding) => {
  if (!branding?.header) return 60;
  const { leftLines = [], rightLines = [], centerTitle, centerSubtitle, emblemDataUrl } = branding.header;
  const countLeft = withSeparators(leftLines).length;
  const countRight = withSeparators(rightLines).length;
  const centerLines = [centerTitle, centerSubtitle].filter(Boolean);
  const centerCount = centerLines.length + (emblemDataUrl ? 2 : 0);
  const lineHeight = 4.2;
  const maxLines = Math.max(countLeft, countRight, centerCount || 1);
  return DEFAULT_MARGINS.top + maxLines * lineHeight + 18;
};

const drawHeader = (doc, branding) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const { left, right } = DEFAULT_MARGINS;
  const center = pageWidth / 2;
  const top = DEFAULT_MARGINS.top;
  const lineHeight = 4.2;
  const header = branding?.header || {};
  const leftEntries = withSeparators(header.leftLines || []);
  const rightEntries = withSeparators(header.rightLines || []);
  const leftColumnWidth = center - left;
  const rightColumnWidth = right - center;
  const leftColumnCenter = left + Math.max(leftColumnWidth / 2, 0);
  const rightColumnCenter = center + Math.max(rightColumnWidth / 2, 0);

  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  leftEntries.forEach((entry, idx) => {
    const y = top + idx * lineHeight;
    if (entry.isSeparator) {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);
      doc.text(entry.text, leftColumnCenter, y, { align: 'center' });
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
    } else {
      doc.text(entry.text, left, y, { align: 'left' });
    }
  });
  rightEntries.forEach((entry, idx) => {
    const y = top + idx * lineHeight;
    if (entry.isSeparator) {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);
      doc.text(entry.text, rightColumnCenter, y, { align: 'center' });
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
    } else {
      doc.text(entry.text, right, y, { align: 'right' });
    }
  });

  let centerY = top + 4;
  if (header.emblemDataUrl) {
    try {
      const size = 18;
      doc.addImage(header.emblemDataUrl, 'PNG', center - size / 2, top - 2, size, size + 4);
      centerY += size + 4;
    } catch (error) {
      console.warn('Impossible d’ajouter le visuel au PDF', error);
    }
  }
  doc.setFontSize(10);
  if (header.centerTitle) {
    doc.text(header.centerTitle, center, centerY, { align: 'center' });
    centerY += 5;
  }
  doc.setFontSize(9);
  if (header.centerSubtitle) {
    doc.text(header.centerSubtitle, center, centerY, { align: 'center' });
  }
};

const drawFooter = (doc, branding) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const yBase = pageHeight - 25;
  const signers = (branding?.footer?.signers || []).filter((signer) => signer.label || signer.name);

  doc.setDrawColor(203, 213, 225);
  doc.line(18, yBase - 18, pageWidth - 18, yBase - 18);

  if (signers.length) {
    const columnWidth = (pageWidth - 36) / signers.length;
    doc.setFontSize(9);
    signers.forEach((signer, index) => {
      const x = 18 + columnWidth * index + columnWidth / 2;
      doc.line(x - 30, yBase - 6, x + 30, yBase - 6);
      if (signer.name) {
        doc.setFont(undefined, 'bold');
        doc.text(signer.name, x, yBase + 2, { align: 'center' });
      }
      if (signer.label) {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text(signer.label, x, yBase + 8, { align: 'center' });
        doc.setFontSize(9);
      }
    });
  }

  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  const pageInfo =
    typeof doc.internal.getCurrentPageInfo === 'function' ? doc.internal.getCurrentPageInfo() : null;
  const currentPage = pageInfo?.pageNumber || 1;
  const totalPages = (typeof doc.getNumberOfPages === 'function' ? doc.getNumberOfPages() : null) || currentPage;
  doc.text(`Page ${currentPage}/${totalPages}`, pageWidth - 18, yBase + 14, { align: 'right' });

  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Ce document a été généré automatiquement par le système de gestion de stock',
    pageWidth / 2,
    yBase + 14,
    { align: 'center' }
  );
};

export const createPdfBranding = (doc, branding) => {
  const headerHeight = computeHeaderHeight(branding);
  const marginTop = headerHeight - 5;
  const marginBottom = FOOTER_HEIGHT;
  return {
    headerBottomY: headerHeight,
    marginTop,
    marginBottom,
    contentStartY: marginTop + 6,
    applyOnPage: () => {
      drawHeader(doc, branding);
      drawFooter(doc, branding);
    },
    renderHeader: () => drawHeader(doc, branding),
    renderFooter: () => drawFooter(doc, branding)
  };
};

export const getPrintBrandingBlocks = (branding) => {
  const activeBranding = branding || getFallbackBranding();
  const { header, footer } = activeBranding;
  const leftEntries = withSeparators(header.leftLines || []);
  const rightEntries = withSeparators(header.rightLines || []);

  const renderColumn = (entries) =>
    entries
      .map((entry) =>
        entry.isSeparator
          ? `<span class="doc-branding-separator">${entry.text}</span>`
          : `<span>${entry.text}</span>`
      )
      .join('');

  const headerHtml = `
    <div class="doc-branding-header">
      <div class="doc-branding-columns">
        <div class="doc-branding-col">
          ${renderColumn(leftEntries)}
        </div>
        <div class="doc-branding-center">
          ${header.emblemDataUrl ? `<img src="${header.emblemDataUrl}" alt="Emblème" />` : ''}
          ${header.centerTitle ? `<strong>${header.centerTitle}</strong>` : ''}
          ${header.centerSubtitle ? `<span>${header.centerSubtitle}</span>` : ''}
        </div>
        <div class="doc-branding-col doc-branding-col--right">
          ${renderColumn(rightEntries)}
        </div>
      </div>
    </div>
  `;

  const footerSigners = (footer.signers || []).filter((signer) => signer.label || signer.name);
  const footerHtml = footerSigners.length
    ? `
      <div class="doc-branding-footer">
        ${footerSigners
          .map(
            (signer) => `
            <div class="doc-branding-signer">
              ${signer.name ? `<strong>${signer.name}</strong>` : ''}
              ${signer.label ? `<span>${signer.label}</span>` : ''}
            </div>
          `
          )
          .join('')}
      </div>
    `
    : '';

  const styles = `
    .doc-branding-header {
      text-align: center;
      margin-bottom: 20px;
    }
    .doc-branding-columns {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      font-size: 11px;
      text-transform: uppercase;
      color: #111827;
    }
    .doc-branding-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      text-align: left;
    }
    .doc-branding-col--right {
      text-align: right;
    }
    .doc-branding-col span {
      display: block;
      letter-spacing: 0.5px;
    }
    .doc-branding-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .doc-branding-center strong {
      font-size: 13px;
    }
    .doc-branding-center img {
      height: 60px;
      width: 60px;
      object-fit: contain;
      margin-bottom: 6px;
    }
    .doc-branding-footer {
      margin-top: 40px;
      display: flex;
      justify-content: space-around;
      gap: 25px;
    }
    .doc-branding-signer {
      text-align: center;
      font-size: 11px;
      flex: 1;
    }
    .doc-branding-separator {
      letter-spacing: 2px;
      font-size: 10px;
      display: block;
      width: 100%;
      text-align: center;
      color: #475569;
    }
    .doc-branding-footnote {
      margin-top: 40px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
  `;

  return { headerHtml, footerHtml, styles };
};

