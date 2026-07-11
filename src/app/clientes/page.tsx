"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Search, User, Phone, MapPin, Calendar as CalendarIcon, Loader2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

type Order = {
  id: string;
  event_date: string;
  total_amount: number;
  delivery_address: string;
  status: string;
  order_items: { quantity: number, inventory: { name: string } }[];
};

type Client = {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  orders: Order[];
};

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id, full_name, phone, address, created_at,
          orders ( id, event_date, total_amount, delivery_address, status, order_items(quantity, inventory(name)) )
        `)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setClients(data as unknown as Client[]);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  const openClientDetails = (client: Client) => {
    // Ordenar las órdenes de más reciente a más antigua
    client.orders.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
    setSelectedClient(client);
    setOpenModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Clientes</h1>
          <p className="text-slate-500">Administra tu base de datos y su historial de rentas.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input 
          type="search" 
          placeholder="Buscar cliente por nombre o teléfono..." 
          className="pl-10 h-12 rounded-full bg-slate-50 border-transparent focus:bg-white text-base shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>
          ) : filteredClients.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <User className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              No se encontraron clientes.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredClients.map(client => (
                <div key={client.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition cursor-pointer" onClick={() => openClientDetails(client)}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xl">
                      {client.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{client.full_name}</h4>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone}</span>}
                        <span className="flex items-center gap-1 font-medium text-slate-400"><CalendarIcon className="w-3 h-3" /> {client.orders.length} Rentas</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-2xl w-full h-[100dvh] sm:h-[85vh] sm:rounded-2xl p-0 overflow-hidden flex flex-col bg-slate-50">
          {selectedClient && (
            <>
              <div className="bg-white border-b p-6 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-black text-3xl mb-4 shadow-md">
                  {selectedClient.full_name.charAt(0).toUpperCase()}
                </div>
                <DialogTitle className="text-2xl font-black text-slate-800">{selectedClient.full_name}</DialogTitle>
                <div className="flex flex-wrap justify-center gap-4 mt-3 text-sm text-slate-600 font-medium">
                  {selectedClient.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-blue-500" /> {selectedClient.phone}</span>}
                  {selectedClient.address && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-amber-500" /> {selectedClient.address}</span>}
                  <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4 text-green-500" /> Registrado: {format(new Date(selectedClient.created_at), 'MMM yyyy', { locale: es })}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="font-bold text-slate-800 mb-4 text-lg">Historial de Rentas ({selectedClient.orders.length})</h3>
                {selectedClient.orders.length === 0 ? (
                  <p className="text-center text-slate-500 py-10">Este cliente aún no tiene rentas registradas.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedClient.orders.map(order => (
                      <div key={order.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-start mb-3 border-b border-slate-50 pb-3">
                          <div>
                            <p className="font-bold text-slate-800 text-lg flex items-center gap-2">
                              {format(new Date(order.event_date + 'T12:00:00'), 'dd MMMM yyyy', { locale: es })}
                              {new Date(order.event_date) >= new Date(new Date().setHours(0,0,0,0)) && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full uppercase font-black tracking-wider">Próximo</span>}
                            </p>
                            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {order.delivery_address}</p>
                          </div>
                          <span className="text-xl font-black text-blue-600">${order.total_amount.toFixed(2)}</span>
                        </div>
                        <div className="space-y-1.5">
                          {order.order_items.map((oi, i) => (
                            <p key={i} className="text-sm text-slate-600">
                              <span className="font-bold text-slate-900">{oi.quantity}x</span> {oi.inventory?.name || 'Artículo eliminado'}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-white border-t text-right">
                <Button variant="ghost" onClick={() => setOpenModal(false)}>Cerrar</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
