import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export function Card({ title, subtitle, actions, loading, children }) {
  return (
    <section className="rounded-3xl bg-white/80 p-8 shadow-xl dark:bg-slate-900/80">
      {(title || subtitle || actions) && (
        <header className="flex flex-col gap-3 border-b border-slate-100 pb-6 dark:border-slate-800/60 md:flex-row md:items-center md:justify-between">
          <div>
            {title && (
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            )}
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </header>
      )}
      <CardContent loading={loading}>{children}</CardContent>
    </section>
  );
}

Card.propTypes = {
  title: PropTypes.node,
  subtitle: PropTypes.node,
  actions: PropTypes.node,
  loading: PropTypes.bool,
  children: PropTypes.node.isRequired
};

Card.defaultProps = {
  title: null,
  subtitle: null,
  actions: null,
  loading: false
};

export function CardContent({ loading, children }) {
  return (
    <div
      className={classNames('mt-6', {
        'pointer-events-none opacity-50': loading
      })}
    >
      {children}
    </div>
  );
}

CardContent.propTypes = {
  loading: PropTypes.bool,
  children: PropTypes.node
};

CardContent.defaultProps = {
  loading: false,
  children: null
};
