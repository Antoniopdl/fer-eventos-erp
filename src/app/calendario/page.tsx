import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';

export default function CalendarioPage() {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const currentWeek = [14, 15, 16, 17, 18, 19, 20]; // Mock dates

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario de Eventos</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Administra las entregas, recolecciones y disponibilidad.
          </p>
        </div>
        <Button className="w-full sm:w-auto gap-2">
          <Plus className="w-4 h-4" />
          Nueva Renta
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-lg font-semibold">Septiembre 2026</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            {days.map((day, i) => (
              <div key={day} className="py-2 text-center text-xs font-medium text-slate-500 border-r last:border-r-0 border-slate-100 dark:border-slate-800">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 h-[120px]">
            {currentWeek.map((date, i) => (
              <div key={date} className={`p-2 border-r last:border-r-0 border-slate-100 dark:border-slate-800 ${date === 18 ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                <span className={`text-sm font-medium ${date === 18 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {date}
                </span>
                {date === 18 && (
                  <div className="mt-1 flex flex-col gap-1">
                    <div className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 truncate">
                      4 Entregas
                    </div>
                    <div className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 truncate">
                      2 Recolecciones
                    </div>
                  </div>
                )}
                {date === 19 && (
                  <div className="mt-1 flex flex-col gap-1">
                    <div className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 truncate">
                      1 Entrega
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Eventos del Viernes 18</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { client: 'Boda Familia Pérez', loc: 'Rancho Palmitas', time: '14:00 hrs', status: 'Por entregar', type: 'Entrega' },
            { client: 'XV Años', loc: 'Colonia Centro', time: '16:30 hrs', status: 'En Ruta (Nissan)', type: 'Entrega' },
            { client: 'Bautizo', loc: 'La Esperanza', time: '09:00 hrs', status: 'Pendiente', type: 'Recolección' },
          ].map((event, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${event.type === 'Entrega' ? 'text-blue-600' : 'text-amber-600'}`}>
                      {event.type}
                    </span>
                    <h3 className="font-semibold text-lg leading-tight mt-0.5">{event.client}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${event.status.includes('Ruta') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {event.status}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{event.loc}</span>
                  </div>
                </div>
                <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                  <span className="text-xs text-slate-500">200 artículos</span>
                  <Button variant="link" className="h-auto p-0 text-xs font-medium text-blue-600">Ver Detalles</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
