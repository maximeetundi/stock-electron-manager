import React from 'react';
import PropTypes from 'prop-types';
import PeriodSelector from '@/components/common/PeriodSelector.jsx';
import { TYPE_FILTER_OPTIONS } from '../constants.js';
import {
  ArrowsRightLeftIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TagIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  AdjustmentsHorizontalIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

export default function FiltersPanel({
  filters,
  onPeriodChange,
  onTypeChange,
  onCategoryChange,
  categories,
  categoriesError,
  typeLabel,
  periodLabel,
  categoryLabel,
  onExportPdf,
  onExportExcel,
  exportDisabled,
  exporting
}) {
  const typeFilterIcons = {
    all: ArrowsRightLeftIcon,
    ENTREE: ArrowTrendingUpIcon,
    SORTIE: ArrowTrendingDownIcon
  };

  return (
    <header className="rounded-3xl bg-white/80 p-8 shadow-xl dark:bg-slate-900/80">
      <h1 className="flex items-center gap-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        <DocumentArrowDownIcon className="h-7 w-7 text-primary-500" />
        Rapports financiers
      </h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <AdjustmentsHorizontalIcon className="h-4 w-4 text-primary-400" />
        Exportez les opérations filtrées en PDF ou Excel avec totaux automatiques.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <PeriodSelector
            defaultPeriod="month"
            onChange={onPeriodChange}
            allowCustom
            value={filters}
          />
          <div className="flex flex-wrap gap-2 text-sm">
            {TYPE_FILTER_OPTIONS.map((option) => {
              const Icon = typeFilterIcons[option.key];
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onTypeChange(option.key)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 transition ${filters.typeFilter === option.key ? 'border-primary-500 bg-primary-500 text-white shadow shadow-primary-500/30' : 'border-slate-200 bg-white text-slate-600 hover:border-primary-500 hover:text-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
            <CalendarIcon className="h-3 w-3" />
            {periodLabel}
          </p>
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
            <ArrowsRightLeftIcon className="h-3 w-3" />
            {typeLabel}
          </p>
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
            <TagIcon className="h-3 w-3" />
            {categoryLabel}
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
            <TagIcon className="h-4 w-4 text-primary-500" />
            Catégorie
            <select
              value={filters.categoryId}
              onChange={onCategoryChange}
              className="mt-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Toutes</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nom}
                </option>
              ))}
            </select>
          </label>
          {categoriesError && (
            <span className="text-xs text-rose-500">{categoriesError}</span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={exportDisabled}
            onClick={onExportPdf}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-700/60 dark:bg-primary-500 dark:hover:bg-primary-400"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            {exporting ? 'Génération…' : 'Exporter PDF'}
          </button>
          <button
            type="button"
            disabled={exportDisabled}
            onClick={onExportExcel}
            className="flex items-center gap-2 rounded-2xl border border-primary-500 px-4 py-2 text-sm font-semibold text-primary-500 transition hover:bg-primary-500 hover:text-white disabled:cursor-not-allowed disabled:border-slate-400 disabled:text-slate-400 dark:border-primary-400 dark:text-primary-300 dark:hover:bg-primary-400 dark:hover:text-slate-900"
          >
            <TableCellsIcon className="h-5 w-5" />
            {exporting ? 'Génération…' : 'Exporter Excel'}
          </button>
        </div>
      </div>
    </header>
  );
}
FiltersPanel.propTypes = {
  filters: PropTypes.shape({
    period: PropTypes.string,
    typeFilter: PropTypes.string,
    categoryId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    referenceDate: PropTypes.string,
    startDate: PropTypes.string,
    endDate: PropTypes.string
  }).isRequired,
  onPeriodChange: PropTypes.func.isRequired,
  onTypeChange: PropTypes.func.isRequired,
  onCategoryChange: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      nom: PropTypes.string.isRequired
    })
  ).isRequired,
  categoriesError: PropTypes.string,
  typeLabel: PropTypes.string.isRequired,
  periodLabel: PropTypes.string.isRequired,
  categoryLabel: PropTypes.string.isRequired,
  onExportPdf: PropTypes.func.isRequired,
  onExportExcel: PropTypes.func.isRequired,
  exportDisabled: PropTypes.bool.isRequired,
  exporting: PropTypes.bool.isRequired
};

FiltersPanel.defaultProps = {
  categoriesError: null
};
