import React from 'react';
import pkg from '../../package.json';

export default function AboutPage() {
  const version = pkg?.version || '0.0.0';

  return (
    <section className="rounded-3xl bg-white/80 p-8 shadow-xl dark:bg-slate-900/80">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">À propos</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-500">Application</h3>
          <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">Ecole Finances</p>
          <p className="mt-1 text-sm text-slate-500">Gestion financière pour complexe scolaire</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-500">Auteur</h3>
          <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">Maxime ETUNDI</p>
          <a href="mailto:maximeetundi@gmail.com" className="mt-1 inline-block text-sm text-primary-600 hover:underline">maximeetundi@gmail.com</a>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-500">Notre mission</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Ecole Finances simplifie le suivi des entrées/sorties, l’édition de reçus et la production de rapports
            pour les établissements scolaires. L’objectif est d’offrir une visibilité claire et immédiate sur les
            finances afin d’aider la prise de décision et la transparence.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-500">Fonctionnalités clés</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <li>Enregistrements rapides des opérations par catégories.</li>
            <li>Reçus PDF et impression avec logo et mise en page soignée.</li>
            <li>Tableaux de bord et statistiques (évolution, top catégories).</li>
            <li>Rapports filtrés avec export PDF et Excel.</li>
            <li>Sauvegarde/Import de la base SQLite depuis l’interface.</li>
            <li>Codes de récupération pour réinitialiser le mot de passe en cas d’oubli.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-500">Données et sécurité</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Les données sont stockées localement dans une base SQLite chiffrée par le système de fichiers. Les mots de
            passe sont hachés côté base. Avant la suppression d’une catégorie, une sauvegarde est demandée afin de
            préserver l’historique. Vous pouvez exporter/importer la base à tout moment.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-500">Support et contact</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Pour toute question, suggestion ou demande d’assistance, contactez l’auteur à l’adresse
            <a href="mailto:maximeetundi@gmail.com" className="ml-1 text-primary-600 hover:underline">maximeetundi@gmail.com</a>.
          </p>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <span>© {new Date().getFullYear()} Ecole Finances</span>
        <span className="font-semibold">Version {version}</span>
      </div>
    </section>
  );
}
