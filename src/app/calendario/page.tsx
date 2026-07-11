"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, Calendar as CalendarIcon, MapPin, Phone, User, Trash2, Package2, List, Loader2, ArrowRight, Check, Minus, Map } from 'lucide-react';
import { format, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type InventoryItem = { id: string; name: string; category: string; price_per_unit: number; total_quantity: number };
type KitRequirement = { id: string; category: string; quantity: number; is_optional: boolean };
type Kit = { id: string; name: string; price: number; kit_requirements: KitRequirement[] };
type OrderItem = { inventory: { name: string }, quantity: number, price_at_booking: number };
type Order = { id: string; event_date: string; total_amount: number; delivery_address: string; client_id: string; client: { full_name: string, phone: string }; order_items?: OrderItem[] };

type CartItem = { uid: string; type: 'single'; inventory_id: string; name: string; quantity: number; price: number; };
type CartKit = { uid: string; type: 'kit'; kit_id: string; name: string; price: number; selections: { req_id: string; category: string; inventory_id: string; name: string; quantity: number }[]; };
type CartElement = CartItem | CartKit;

export default function CalendarioPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Nueva Renta State
  const [openRentaModal, setOpenRentaModal] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cliente & Autocompletado
  const [clientData, setClientData] = useState({ id: '', name: '', phone: '', address: '' });
  const [clientSearchActive, setClientSearchActive] = useState(false);
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);

  // Mapa Autocompletado
  const [mapResults, setMapResults] = useState<any[]>([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const addressTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const [cart, setCart] = useState<CartElement[]>([]);
  const [openSingleModal, setOpenSingleModal] = useState(false);
  const [openKitModal, setOpenKitModal] = useState(false);
  const [activeKit, setActiveKit] = useState<Kit | null>(null);
  const [kitSelections, setKitSelections] = useState<Record<string, InventoryItem>>({});

  // Detalles de Evento
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [openOrderModal, setOpenOrderModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, event_date, total_amount, delivery_address, client_id, clients(full_name, phone)')
        .order('event_date', { ascending: true });
      if (ordersData) setOrders(ordersData.map((o: any) => ({ ...o, client: o.clients })));

      const { data: invData } = await supabase.from('inventory').select('id, name, category, price_per_unit, total_quantity');
      if (invData) setInventory(invData);

      const { data: kitsData } = await supabase.from('kits').select('*, kit_requirements(*)');
      if (kitsData) setKits(kitsData);

      const { data: cliData } = await supabase.from('clients').select('id, full_name, phone, address');
      if (cliData) setClients(cliData);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => {
      if (item.type === 'single') return sum + (item.price * item.quantity);
      if (item.type === 'kit') return sum + item.price;
      return sum;
    }, 0);
  };

  // Autocompletado Mapas OpenStreetMap
  const handleAddressSearch = (text: string) => {
    setClientData({ ...clientData, address: text });
    if (addressTimeout.current) clearTimeout(addressTimeout.current);
    if (text.length < 5) {
      setMapResults([]);
      return;
    }
    addressTimeout.current = setTimeout(async () => {
      setIsSearchingMap(true);
      try {
        const query = encodeURIComponent(`${text}, Sinaloa, Mexico`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5`);
        const data = await res.json();
        setMapResults(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingMap(false);
      }
    }, 800);
  };

  const handleCreateOrder = async () => {
    if (!eventDate || !clientData.name || cart.length === 0) return;
    setIsSubmitting(true);
    try {
      let finalClientId = clientData.id;
      // Si no hay ID, buscar si existe por nombre o crear
      if (!finalClientId) {
        const existing = clients.find(c => c.full_name.toLowerCase() === clientData.name.toLowerCase());
        if (existing) {
          finalClientId = existing.id;
        } else {
          const { data: client, error: clientErr } = await supabase.from('clients')
            .insert([{ full_name: clientData.name, phone: clientData.phone, address: clientData.address }])
            .select().single();
          if (clientErr) throw clientErr;
          finalClientId = client.id;
        }
      }

      const { data: order, error: orderErr } = await supabase.from('orders')
        .insert([{
          client_id: finalClientId,
          event_date: eventDate.toISOString().split('T')[0],
          delivery_address: clientData.address,
          total_amount: calculateTotal()
        }]).select().single();
      if (orderErr) throw orderErr;

      const orderItems = [];
      for (const el of cart) {
        if (el.type === 'single') {
          orderItems.push({ order_id: order.id, inventory_id: el.inventory_id, quantity: el.quantity, price_at_booking: el.price });
        } else if (el.type === 'kit') {
          for (const sel of el.selections) {
            orderItems.push({ order_id: order.id, inventory_id: sel.inventory_id, quantity: sel.quantity, price_at_booking: 0 });
          }
        }
      }
      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
      if (itemsErr) throw itemsErr;

      setOpenRentaModal(false);
      resetForm();
      fetchData();
      alert("¡Renta registrada exitosamente!");
    } catch (error) {
      console.error('Error creating order', error);
      alert('Hubo un error al guardar la renta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setClientData({ id: '', name: '', phone: '', address: '' });
    setEventDate(undefined);
    setCart([]);
    setStep(1);
    setActiveKit(null);
    setKitSelections({});
    setMapResults([]);
  };

  const addSingleItemToCart = (item: InventoryItem, qty: number) => {
    setCart([...cart, { uid: Math.random().toString(), type: 'single', inventory_id: item.id, name: item.name, price: item.price_per_unit, quantity: qty }]);
    setOpenSingleModal(false);
  };

  const updateCartQty = (uid: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.uid === uid && c.type === 'single') {
        const newQty = Math.max(1, c.quantity + delta);
        return { ...c, quantity: newQty };
      }
      return c;
    }));
  };

  const removeFromCart = (uid: string) => {
    setCart(cart.filter(c => c.uid !== uid));
  };

  const handleFinishKit = () => {
    if (!activeKit) return;
    const missing = activeKit.kit_requirements.find(req => !req.is_optional && !kitSelections[req.id]);
    if (missing) return alert(`Falta seleccionar un artículo para la categoría: ${missing.category}`);

    const selections = activeKit.kit_requirements.filter(req => kitSelections[req.id]).map(req => ({
        req_id: req.id, category: req.category, inventory_id: kitSelections[req.id].id, name: kitSelections[req.id].name, quantity: req.quantity
    }));

    setCart([...cart, { uid: Math.random().toString(), type: 'kit', kit_id: activeKit.id, name: activeKit.name, price: activeKit.price, selections }]);
    setActiveKit(null);
    setKitSelections({});
    setOpenKitModal(false);
  };

  // Funciones para Eventos Guardados
  const fetchOrderDetails = async (order: Order) => {
    const { data } = await supabase.from('order_items').select('quantity, price_at_booking, inventory(name)').eq('order_id', order.id);
    setSelectedOrder({ ...order, order_items: data || [] } as any);
    setOpenOrderModal(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm("¿Estás absolutamente seguro de cancelar esta renta? Esta acción no se puede deshacer.")) {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (!error) {
        setOpenOrderModal(false);
        fetchData();
      }
    }
  };

  const generateICS = (order: Order) => {
    const start = new Date(order.event_date + 'T12:00:00');
    const end = addHours(start, 5);
    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:Entrega Fer Eventos - ${order.client.full_name}`,
      `DESCRIPTION:Cliente: ${order.client.full_name}\\nTel: ${order.client.phone || 'N/A'}\\nTotal: $${order.total_amount}`,
      `LOCATION:${order.delivery_address}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `renta_${order.client.full_name.replace(' ', '_')}.ics`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario de Rentas</h1>
          <p className="text-slate-500">Administra eventos y agrega ventas al CRM.</p>
        </div>
        
        <Dialog open={openRentaModal} onOpenChange={(val) => { if(!val) resetForm(); setOpenRentaModal(val); }}>
          <DialogTrigger render={
            <Button className="w-full sm:w-auto h-12 rounded-full px-6 gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
              <Plus className="w-5 h-5" /> Nueva Renta
            </Button>
          } />
          <DialogContent className="sm:max-w-2xl w-full h-[100dvh] sm:h-[85vh] sm:rounded-2xl p-0 overflow-hidden flex flex-col bg-slate-50">
            <div className="bg-white border-b px-6 py-4 flex flex-col">
              <DialogTitle className="text-xl font-bold text-slate-800">Nueva Renta</DialogTitle>
              <div className="flex items-center gap-2 mt-4 text-sm font-medium">
                <span className={cn("px-3 py-1 rounded-full", step >= 1 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400")}>1. Cliente</span>
                <ArrowRight className="w-4 h-4 text-slate-300" />
                <span className={cn("px-3 py-1 rounded-full", step >= 2 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400")}>2. Mobiliario</span>
                <ArrowRight className="w-4 h-4 text-slate-300" />
                <span className={cn("px-3 py-1 rounded-full", step === 3 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400")}>3. Resumen</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {step === 1 && (
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-4">
                    <h3 className="font-bold text-slate-800 mb-2">Datos del Cliente (CRM)</h3>
                    <div className="space-y-2 relative">
                      <Label className="text-slate-500">Nombre completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <Input 
                          className="pl-9 h-12 bg-slate-50" 
                          placeholder="Escribe para buscar o añadir nuevo..." 
                          value={clientData.name} 
                          onFocus={() => setClientSearchActive(true)}
                          onBlur={() => setTimeout(() => setClientSearchActive(false), 200)}
                          onChange={e => setClientData({...clientData, name: e.target.value, id: ''})} 
                        />
                      </div>
                      {clientSearchActive && clientData.name.length > 1 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-48 overflow-auto">
                          {clients.filter(c => c.full_name.toLowerCase().includes(clientData.name.toLowerCase())).map(c => (
                            <div key={c.id} className="p-3 hover:bg-slate-50 cursor-pointer text-sm" onClick={() => {
                              setClientData({ id: c.id, name: c.full_name, phone: c.phone || '', address: c.address || '' });
                              setClientSearchActive(false);
                            }}>
                              <p className="font-bold">{c.full_name}</p>
                              <p className="text-xs text-slate-500">{c.phone}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-500">Teléfono</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <Input className="pl-9 h-12 bg-slate-50" type="tel" value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-4">
                    <h3 className="font-bold text-slate-800 mb-2">Datos del Evento</h3>
                    <div className="space-y-2 flex flex-col">
                      <Label className="text-slate-500">Fecha del Evento</Label>
                      <Popover>
                        <PopoverTrigger render={
                          <Button variant="outline" className={cn("w-full h-12 justify-start text-left font-normal bg-slate-50", !eventDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {eventDate ? format(eventDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                          </Button>
                        } />
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={eventDate} onSelect={setEventDate} locale={es} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2 relative">
                      <Label className="text-slate-500">Dirección de Entrega</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <Input className="pl-9 h-12 bg-slate-50" placeholder="Escribe para buscar calle..." value={clientData.address} onChange={e => handleAddressSearch(e.target.value)} />
                        {isSearchingMap && <Loader2 className="absolute right-3 top-4 h-4 w-4 animate-spin text-slate-400" />}
                      </div>
                      {mapResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-48 overflow-auto">
                          {mapResults.map(res => (
                            <div key={res.place_id} className="p-3 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0 flex gap-2 items-start" onClick={() => {
                              setClientData({...clientData, address: res.display_name});
                              setMapResults([]);
                            }}>
                              <Map className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                              <span className="text-slate-700">{res.display_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
                      <Package2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-slate-700">Canasta Vacía</h3>
                      <p className="text-slate-400 mb-6 text-sm">No has agregado mobiliario a la renta.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((el) => (
                        <div key={el.uid} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {el.type === 'kit' && <span className="bg-indigo-100 text-indigo-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Paquete</span>}
                              <h4 className="font-bold text-slate-800">{el.name}</h4>
                            </div>
                            {el.type === 'kit' && (
                              <ul className="text-xs text-slate-500 mt-2 space-y-1 bg-slate-50 p-2 rounded-lg">
                                {el.selections.map(s => <li key={s.req_id}>• {s.quantity}x {s.name}</li>)}
                              </ul>
                            )}
                          </div>
                          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                            {el.type === 'single' ? (
                              <div className="flex items-center bg-slate-100 rounded-lg">
                                <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-slate-500" onClick={() => updateCartQty(el.uid, -1)}><Minus className="h-3 w-3" /></Button>
                                <span className="w-8 text-center text-sm font-bold">{el.quantity}</span>
                                <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-slate-500" onClick={() => updateCartQty(el.uid, 1)}><Plus className="h-3 w-3" /></Button>
                              </div>
                            ) : (
                              <div className="text-sm font-medium text-slate-400">1 Kit</div>
                            )}
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-blue-600 min-w-16 text-right">${el.type === 'single' ? (el.price * el.quantity).toFixed(2) : el.price.toFixed(2)}</span>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 bg-red-50" onClick={() => removeFromCart(el.uid)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Dialog open={openSingleModal} onOpenChange={setOpenSingleModal}>
                      <DialogTrigger render={
                        <Button variant="outline" className="h-16 flex flex-col gap-1 rounded-xl bg-white border-dashed border-2 hover:bg-slate-50">
                          <List className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-600">Artículo Suelto</span>
                        </Button>
                      } />
                      <DialogContent className="sm:max-w-md bg-slate-50 p-0 rounded-2xl overflow-hidden h-[80vh] flex flex-col">
                        <div className="p-4 bg-white border-b"><DialogTitle>Agregar Artículo</DialogTitle></div>
                        <div className="p-4 flex-1 overflow-y-auto space-y-2">
                          {inventory.map(item => (
                            <div key={item.id} className="bg-white p-3 rounded-xl border flex items-center justify-between">
                              <div>
                                <p className="font-bold text-sm text-slate-800">{item.name}</p>
                                <p className="text-xs text-slate-500">Stock: {item.total_quantity} | ${item.price_per_unit}</p>
                              </div>
                              <Button size="sm" className="h-8 rounded-full bg-slate-900" onClick={() => addSingleItemToCart(item, 1)}>+ Agregar</Button>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={openKitModal} onOpenChange={(val) => { if(!val) setActiveKit(null); setOpenKitModal(val); }}>
                      <DialogTrigger render={
                        <Button variant="outline" className="h-16 flex flex-col gap-1 rounded-xl bg-blue-50/50 border-blue-200 border-dashed border-2 hover:bg-blue-50 text-blue-700">
                          <Package2 className="w-4 h-4" />
                          <span className="text-xs font-semibold">Paquete (Kit)</span>
                        </Button>
                      } />
                      <DialogContent className="sm:max-w-md bg-slate-50 p-0 rounded-2xl overflow-hidden h-[90vh] flex flex-col">
                        <div className="p-4 bg-white border-b"><DialogTitle>{activeKit ? 'Armar Paquete' : 'Seleccionar Paquete'}</DialogTitle></div>
                        
                        <div className="p-4 flex-1 overflow-y-auto">
                          {!activeKit ? (
                            <div className="space-y-3">
                              {kits.map(kit => (
                                <div key={kit.id} className="bg-white p-4 rounded-xl border shadow-sm cursor-pointer hover:border-blue-300" onClick={() => setActiveKit(kit)}>
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800">{kit.name}</h4>
                                    <span className="font-bold text-blue-600">${kit.price}</span>
                                  </div>
                                  <p className="text-xs font-medium text-slate-400">Incluye {kit.kit_requirements.length} elementos</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="bg-blue-600 text-white p-4 rounded-xl shadow-sm">
                                <h4 className="font-bold text-lg">{activeKit.name}</h4>
                                <p className="text-blue-100 text-sm mt-1">Elige los productos específicos.</p>
                              </div>
                              
                              <div className="space-y-4">
                                {activeKit.kit_requirements.map(req => {
                                  const filteredItems = inventory.filter(i => i.category === req.category);
                                  const selectedItem = kitSelections[req.id];
                                  
                                  return (
                                    <div key={req.id} className="bg-white p-4 rounded-xl border space-y-3">
                                      <div className="flex justify-between items-center">
                                        <Label className="font-bold text-slate-700 flex items-center gap-2">
                                          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">{req.quantity}</span>
                                          {req.category}
                                        </Label>
                                        {selectedItem && <Check className="w-4 h-4 text-green-500" />}
                                      </div>
                                      
                                      <Select value={selectedItem?.id || ''} onValueChange={(val) => {
                                          const item = inventory.find(i => i.id === val);
                                          if (item) setKitSelections({...kitSelections, [req.id]: item});
                                      }}>
                                        <SelectTrigger className="bg-slate-50 h-12 rounded-xl">
                                          <SelectValue>{selectedItem ? selectedItem.name : `Selecciona...`}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          {filteredItems.map(item => (
                                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                          ))}
                                          {filteredItems.length === 0 && <SelectItem value="none" disabled>Sin artículos en categoría</SelectItem>}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        {activeKit && (
                          <div className="p-4 bg-white border-t flex gap-3">
                            <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setActiveKit(null)}>Volver</Button>
                            <Button className="flex-1 rounded-xl h-12 bg-blue-600 text-white" onClick={handleFinishKit}>Confirmar</Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <h2 className="text-2xl font-black text-slate-900 mb-1">Total a Cobrar</h2>
                    <p className="text-5xl font-black text-blue-600 my-4">${calculateTotal().toFixed(2)}</p>
                    <p className="text-sm text-slate-500 font-medium">Cliente: {clientData.name}</p>
                    <p className="text-sm text-slate-500 font-medium">Fecha: {eventDate ? format(eventDate, "PPP", { locale: es }) : ''}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border-t p-4 sm:p-6 flex justify-between items-center z-10">
              {step > 1 ? (
                <Button variant="ghost" onClick={() => setStep(step - 1 as any)}>Atrás</Button>
              ) : (
                <Button variant="ghost" onClick={() => setOpenRentaModal(false)}>Cancelar</Button>
              )}
              {step < 3 ? (
                <Button onClick={() => setStep(step + 1 as any)} disabled={(step === 1 && (!clientData.name || !eventDate)) || (step === 2 && cart.length === 0)} className="rounded-full px-8 bg-slate-900 text-white">
                  Continuar
                </Button>
              ) : (
                <Button onClick={handleCreateOrder} disabled={isSubmitting} className="rounded-full px-8 bg-green-600 hover:bg-green-700 text-white shadow-md">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null} Confirmar Renta
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-lg">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No hay rentas programadas.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.map(order => (
                  <div key={order.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition cursor-pointer" onClick={() => fetchOrderDetails(order)}>
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex flex-col items-center justify-center font-bold leading-tight">
                        <span className="text-lg">{format(new Date(order.event_date + 'T12:00:00'), 'd')}</span>
                        <span className="text-[10px] uppercase">{format(new Date(order.event_date + 'T12:00:00'), 'MMM', { locale: es })}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{order.client.full_name}</h4>
                        <p className="text-sm text-slate-500 truncate max-w-[200px]">{order.delivery_address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-800">${order.total_amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden h-fit">
          <CardContent className="p-4 flex justify-center">
             <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md" locale={es} />
          </CardContent>
        </Card>
      </div>

      {/* Modal Detalles Evento */}
      <Dialog open={openOrderModal} onOpenChange={setOpenOrderModal}>
        <DialogContent className="sm:max-w-md bg-white p-0 rounded-2xl overflow-hidden">
          {selectedOrder && (
            <>
              <div className="p-6 bg-blue-50/50 border-b flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-1">{selectedOrder.client.full_name}</h3>
                  <p className="text-slate-500 text-sm flex items-center gap-1"><CalendarIcon className="w-4 h-4" /> {format(new Date(selectedOrder.event_date + 'T12:00:00'), 'PPP', { locale: es })}</p>
                  <p className="text-slate-500 text-sm flex items-center gap-1 mt-1"><MapPin className="w-4 h-4" /> {selectedOrder.delivery_address}</p>
                </div>
              </div>
              <div className="p-6 max-h-[50vh] overflow-y-auto">
                <h4 className="font-bold text-slate-800 mb-3">Mobiliario a Entregar</h4>
                <div className="space-y-3">
                  {selectedOrder.order_items?.map((oi, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                      <span className="text-slate-700"><span className="font-bold text-blue-600 mr-2">{oi.quantity}x</span> {oi.inventory?.name || 'Mobiliario'}</span>
                      {oi.price_at_booking > 0 && <span className="font-medium text-slate-500">${oi.price_at_booking}</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-500 uppercase">Total de Renta</span>
                  <span className="text-2xl font-black text-blue-600">${selectedOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t flex flex-wrap gap-2 justify-end">
                <Button variant="outline" className="rounded-full" onClick={() => generateICS(selectedOrder)}>Añadir a Apple Calendar</Button>
                <Button variant="destructive" className="rounded-full" onClick={() => handleDeleteOrder(selectedOrder.id)}><Trash2 className="w-4 h-4 mr-2" /> Cancelar Renta</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
