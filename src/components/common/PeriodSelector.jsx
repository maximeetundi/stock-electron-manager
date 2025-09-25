import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { PERIOD_OPTIONS } from '@/utils/apiClient';
import { CalendarIcon } from '@heroicons/react/24/outline';
import clsx from 'classnames';

const todayISO = () => new Date().toISOString().slice(0, 10);

const shallowEqual = (a, b) => {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every((key) => Object.is(a[key], b[key]));
};

export default function PeriodSelector({ defaultPeriod = 'month', value, onChange, allowCustom = true }) {
  const [period, setPeriod] = useState(value?.period ?? defaultPeriod);
  const [referenceDate, setReferenceDate] = useState(value?.referenceDate ?? todayISO());
  const [startDate, setStartDate] = useState(value?.startDate ?? '');
  const [endDate, setEndDate] = useState(value?.endDate ?? '');
  const lastPayloadRef = useRef(null);

  const options = useMemo(
    () => (allowCustom ? PERIOD_OPTIONS : PERIOD_OPTIONS.filter((option) => option.key !== 'custom')),
    [allowCustom]
  );

  useEffect(() => {
    if (!value) {
      return;
    }
    if (value.period && value.period !== period) {
      setPeriod(value.period);
    }
    if (Object.prototype.hasOwnProperty.call(value, 'referenceDate')) {
      const nextReference = value.referenceDate || todayISO();
      if (nextReference !== referenceDate) {
        setReferenceDate(nextReference);
      }
    }
    if (Object.prototype.hasOwnProperty.call(value, 'startDate') && (value.startDate ?? '') !== startDate) {
      setStartDate(value.startDate ?? '');
    }
    if (Object.prototype.hasOwnProperty.call(value, 'endDate') && (value.endDate ?? '') !== endDate) {
      setEndDate(value.endDate ?? '');
    }
  }, [value]);

  useEffect(() => {
    const payload =
      period !== 'custom'
        ? { period, referenceDate }
        : { period, startDate: startDate || '', endDate: endDate || '' };

    if (!shallowEqual(lastPayloadRef.current, payload)) {
      lastPayloadRef.current = payload;
      onChange(payload);
    }
  }, [period, referenceDate, startDate, endDate, onChange]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => {
              if (option.key === period) {
                return;
              }
              setPeriod(option.key);
              if (option.key !== 'custom') {
                if (!referenceDate) {
                  setReferenceDate(todayISO());
                }
                setStartDate('');
                setEndDate('');
              }
            }}
            className={clsx(
              'rounded-full border px-4 py-2 text-sm font-medium transition-all',
              period === option.key
                ? 'border-primary-500 bg-primary-500 text-white shadow shadow-primary-500/30'
                : 'border-transparent bg-white text-slate-600 shadow hover:border-primary-500 hover:text-primary-500 dark:bg-slate-900 dark:text-slate-300'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {period !== 'custom' && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow dark:border-slate-800 dark:bg-slate-900">
          <CalendarIcon className="h-5 w-5 text-primary-500" />
          <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span>Date de référence</span>
            <input
              type="date"
              value={referenceDate}
              onChange={(event) => setReferenceDate(event.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
        </div>
      )}
      {period === 'custom' && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow dark:border-slate-800 dark:bg-slate-900">
          <CalendarIcon className="h-5 w-5 text-primary-500" />
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <label className="flex items-center gap-2">
              <span>Du</span>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            <label className="flex items-center gap-2">
              <span>Au</span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

PeriodSelector.propTypes = {
  defaultPeriod: PropTypes.string,
  value: PropTypes.shape({
    period: PropTypes.string,
    referenceDate: PropTypes.string,
    startDate: PropTypes.string,
    endDate: PropTypes.string
  }),
  onChange: PropTypes.func.isRequired,
  allowCustom: PropTypes.bool
};
