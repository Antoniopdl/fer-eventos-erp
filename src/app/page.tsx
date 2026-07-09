import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Package, Truck, Plus } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inicio</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Resumen del negocio y rentas activas.
          </p>
        </div>
        <Button className="w-full sm:w-auto gap-2">
          <Plus className="w-4 h-4" />
          Nueva Renta
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Ingresos (Mes)</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,500</div>
            <p className="text-xs text-green-600 font-medium flex items-center mt-1">
              +15% respecto al mes pasado
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Eventos Activos</CardTitle>
            <Calendar className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-slate-500 mt-1">
              4 entregas para hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Vehículos en Ruta</CardTitle>
            <Truck className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2/3</div>
            <p className="text-xs text-slate-500 mt-1">
              Nissan y Super Duty activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Alertas Inventario</CardTitle>
            <Package className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-amber-600 mt-1">
              Mobiliario dañado/perdido
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Entregas de Hoy</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                        B{i}
                      </div>
                      <div>
                        <p className="font-medium">Boda Rancho Palmitas</p>
                        <p className="text-sm text-slate-500">150 Sillas, 15 Mesas, 1 Carpa</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-700 dark:text-slate-300">14:00 hrs</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        Pendiente
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Caja de Ahorro</h2>
          <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-blue-100 text-sm">Fondo para Reinversión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold tracking-tight">$45,200</div>
              <p className="text-blue-200 mt-2 text-sm">
                Meta: $100,000 (Renovación mantelería)
              </p>
              <div className="w-full bg-blue-900/50 rounded-full h-2 mt-4">
                <div className="bg-white rounded-full h-2" style={{ width: '45%' }}></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
