import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, CheckCircle2, Clock } from 'lucide-react';

export default function LogisticaPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Logística y Rutas</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Asignación de entregas a vehículos y optimización de gasolina.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicles Column */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold">Flotilla Hoy</h2>
          
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Nissan Redilas</CardTitle>
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">En Ruta</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm text-slate-500">
              <p>Capacidad: Media • Uso principal</p>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-medium text-slate-700 dark:text-slate-300">Asignado:</span> 3 Entregas (Palmitas)
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Super Duty</CardTitle>
                <Badge variant="outline" className="text-amber-600 border-amber-600">En Base (Cargando)</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm text-slate-500">
              <p>Capacidad: Alta • Eventos grandes</p>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-medium text-slate-700 dark:text-slate-300">Asignado:</span> 1 Entrega (Centro)
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-slate-300">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Tacoma + Remolque</CardTitle>
                <Badge variant="secondary">Disponible</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm text-slate-500">
              <p>Capacidad: Muy Alta • Solo emergencia/volumen</p>
            </CardContent>
          </Card>
        </div>

        {/* Routes Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Ruta Sugerida: Nissan</h2>
            <Button variant="outline" size="sm" className="gap-2">
              <MapPin className="w-4 h-4" />
              Ver Mapa
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="relative pl-6 py-6 pr-4">
                {/* Vertical line for timeline */}
                <div className="absolute top-10 bottom-10 left-[23px] w-px bg-slate-200 dark:bg-slate-800"></div>

                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="relative flex gap-4 items-start">
                    <div className="absolute -left-2 bg-white dark:bg-slate-950 p-1 rounded-full z-10">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="ml-6 w-full">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">Carga en Base (Angostura)</p>
                          <p className="text-sm text-slate-500">100 Sillas, 10 Mesas</p>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">08:00 hrs</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative flex gap-4 items-start">
                    <div className="absolute -left-2 bg-white dark:bg-slate-950 p-1 rounded-full z-10">
                      <div className="w-5 h-5 rounded-full border-2 border-blue-500 bg-blue-100 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      </div>
                    </div>
                    <div className="ml-6 w-full">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-blue-600 dark:text-blue-400">Entrega 1: Rancho Palmitas</p>
                          <p className="text-sm text-slate-500">Familia Pérez • Flete: $150</p>
                        </div>
                        <span className="text-xs font-bold text-blue-600">09:15 hrs</span>
                      </div>
                      <div className="mt-2">
                        <Button size="sm" className="w-full sm:w-auto">Abrir Checklist de Entrega</Button>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative flex gap-4 items-start">
                    <div className="absolute -left-2 bg-white dark:bg-slate-950 p-1 rounded-full z-10">
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white"></div>
                    </div>
                    <div className="ml-6 w-full opacity-60">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-slate-300">Entrega 2: La Esperanza</p>
                          <p className="text-sm text-slate-500">Bautizo • Flete: $200</p>
                        </div>
                        <span className="text-xs text-slate-500">10:30 hrs</span>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
