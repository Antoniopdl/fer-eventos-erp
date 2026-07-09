import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Plus } from 'lucide-react';

export default function FinanzasPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finanzas y Ahorro</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Control de ingresos en efectivo, gastos del negocio y metas de ahorro.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="w-full sm:w-auto gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
            <Plus className="w-4 h-4" />
            Registrar Gasto
          </Button>
          <Button className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4" />
            Ingreso (Efectivo)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Ingresos (Semana)</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">$8,450.00</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Gastos (Semana)</CardTitle>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">$2,100.00</div>
            <p className="text-xs text-slate-500 mt-1">Gasolina: $1,200 | Sueldos: $900</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Ganancia Neta</CardTitle>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">$6,350.00</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Savings Goal */}
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10">
            <PiggyBank className="w-48 h-48 -mr-10 -mt-10" />
          </div>
          <CardHeader>
            <CardTitle className="text-blue-100 flex items-center gap-2">
              <PiggyBank className="w-5 h-5" />
              Caja de Ahorro / Reinversión
            </CardTitle>
            <CardDescription className="text-blue-200">
              El sistema separa automáticamente el 15% de cada ganancia neta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold tracking-tight">$45,200</div>
            <div className="mt-6">
              <div className="flex justify-between text-sm text-blue-200 mb-2">
                <span>Progreso hacia Meta</span>
                <span>45% ($100,000)</span>
              </div>
              <div className="w-full bg-blue-900/50 rounded-full h-3">
                <div className="bg-white rounded-full h-3 transition-all" style={{ width: '45%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transacciones Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { type: 'income', title: 'Pago Restante - Boda Palmitas', amount: '+$3,500', date: 'Hoy, 14:30 hrs' },
                { type: 'expense', title: 'Gasolina Nissan Redilas', amount: '-$800', date: 'Hoy, 08:15 hrs' },
                { type: 'income', title: 'Anticipo - Bautizo Esperanza', amount: '+$1,200', date: 'Ayer' },
                { type: 'expense', title: 'Reparación de 3 Sillas', amount: '-$300', date: 'Lun, 14 Sep' },
              ].map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.title}</p>
                      <p className="text-xs text-slate-500">{tx.date}</p>
                    </div>
                  </div>
                  <div className={`font-semibold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-slate-100'}`}>
                    {tx.amount}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
