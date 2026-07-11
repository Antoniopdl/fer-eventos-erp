import React from 'react';
import Link from 'next/link';
import { Home, Calendar, Package, Truck, DollarSign, Settings, Users } from 'lucide-react';

const navItems = [
  { name: 'Inicio', href: '/', icon: Home },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Calendario', href: '/calendario', icon: Calendar },
  { name: 'Logística', href: '/logistica', icon: Truck },
  { name: 'Inventario', href: '/inventario', icon: Package },
  { name: 'Finanzas', href: '/finanzas', icon: DollarSign },
];

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="p-6">
          <h2 className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">Fer Eventos</h2>
          <p className="text-sm text-slate-500">ERP Administrador</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Configuración</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto pb-16 md:pb-0">
        <header className="md:hidden flex items-center h-14 px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <h1 className="text-lg font-bold text-blue-600 dark:text-blue-400">Fer Eventos</h1>
        </header>
        <div className="p-4 md:p-8 flex-1 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-50 flex justify-around items-center px-2 pb-safe">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium leading-none">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
