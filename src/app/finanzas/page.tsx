"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Plus, Search, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type PaidOrder = {
  id: string;
  total_amount: number;
  payment_method: string;
  paid_at: string;
  client: { full_name: string };
};

export default function FinanzasPage() {
  const [loading, setLoading] = useState(true);
  const [todayOrders, setTodayOrders] = useState<PaidOrder[]>([]);
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalTransferencia, setTotalTransferencia] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Obtenemos solo los pagados hoy
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('orders')
        .select('id, total_amount, payment_method, paid_at, client:clients(full_name)')
        .eq('payment_status', 'paid')
        .gte('paid_at', startOfDay.toISOString())
        .lte('paid_at', endOfDay.toISOString())
        .order('paid_at', { ascending: false });

      if (error) throw error;
      
      const orders = data as any[];
      setTodayOrders(orders);

      const efectivo = orders.filter(o => o.payment_method === 'efectivo').reduce((sum, o) => sum + o.total_amount, 0);
      const transf = orders.filter(o => o.payment_method === 'transferencia').reduce((sum, o) => sum + o.total_amount, 0);

      setTotalEfectivo(efectivo);
      setTotalTransferencia(transf);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Corte de Caja Diario</h1>
          <p className="text-slate-500">
            Control de lo que han cobrado los repartidores el día de hoy, {format(new Date(), "d 'de' MMMM", { locale: es })}.
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm ring-1 ring-green-200 bg-green-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-green-800 uppercase">Efectivo Físico</CardTitle>
            <DollarSign className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-green-700">${totalEfectivo.toFixed(2)}</div>
            <p className="text-xs text-green-600/80 mt-1 font-medium">Billetes que te deben entregar</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm ring-1 ring-blue-200 bg-blue-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-blue-800 uppercase">Transferencias</CardTitle>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-blue-700">${totalTransferencia.toFixed(2)}</div>
            <p className="text-xs text-blue-600/80 mt-1 font-medium">Revisar capturas en WhatsApp</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 uppercase">Ingreso Total (Hoy)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">${(totalEfectivo + totalTransferencia).toFixed(2)}</div>
            <p className="text-xs text-slate-400 mt-1 font-medium">{todayOrders.length} cobros procesados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-slate-200">
          <CardHeader>
            <CardTitle>Desglose de Cobros (Hoy)</CardTitle>
            <CardDescription>Eventos que han sido marcados como "Pagados" hoy.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayOrders.length === 0 && (
                <div className="text-center p-8 bg-slate-50 rounded-2xl border-dashed border">
                  <p className="text-slate-500">Ningún repartidor ha procesado cobros hoy.</p>
                </div>
              )}
              {todayOrders.map((order, i) => (
                <div key={order.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg", 
                      order.payment_method === 'efectivo' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                    )}>
                      {order.payment_method === 'efectivo' ? '$' : 'T'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{order.client?.full_name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <CalendarIcon className="w-3 h-3" /> {format(new Date(order.paid_at), "hh:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-black text-lg", order.payment_method === 'efectivo' ? 'text-green-600' : 'text-blue-600')}>
                      ${order.total_amount.toFixed(2)}
                    </p>
                    <Badge variant="outline" className="mt-1 text-[10px] uppercase">{order.payment_method}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Savings Goal */}
        <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none shadow-lg overflow-hidden relative h-fit">
          <div className="absolute right-0 top-0 opacity-10">
            <PiggyBank className="w-48 h-48 -mr-10 -mt-10" />
          </div>
          <CardHeader>
            <CardTitle className="text-indigo-100 flex items-center gap-2">
              <PiggyBank className="w-5 h-5" />
              Caja de Ahorro
            </CardTitle>
            <CardDescription className="text-indigo-200">
              Sugerencia de ahorro del 15% del total cobrado hoy para el negocio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold tracking-tight">${((totalEfectivo + totalTransferencia) * 0.15).toFixed(2)}</div>
            <p className="text-sm text-indigo-200 mt-4">Al separar esta cantidad diaria, aseguras el crecimiento y mantenimiento del mobiliario.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
