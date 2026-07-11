"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, Calendar as CalendarIcon, MapPin, Phone, User, Trash2, Package2, List, Loader2, ArrowRight, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// Tipos
type InventoryItem = { id: string; name: string; category: string; price_per_unit: number; total_quantity: number };
type KitRequirement = { id: string; category: string; quantity: number; is_optional: boolean };
type Kit = { id: string; name: string; price: number; kit_requirements: KitRequirement[] };
type Order = { id: string; event_date: string; total_amount: number; client: { full_name: string } };

type CartItem = {
  uid: string;
  type: 'single';
  inventory_id: string;
  name: string;
  quantity: number;
  price: number;
};

type CartKit = {
  uid: string;
  type: 'kit';
  kit_id: string;
  name: string;
  price: number;
  selections: { req_id: string; category: string; inventory_id: string; name: string; quantity: number }[];
};

type CartElement = CartItem | CartKit;

export default function CalendarioPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // Data de catálogos
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de "Nueva Renta"
  const [openRentaModal, setOpenRentaModal] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Info Cliente, 2: Carrito, 3: Resumen
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario Cliente
  const [clientData, setClientData] = useState({ name: '', phone: '', address: '' });
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);

  // Carrito
  const [cart, setCart] = useState<CartElement[]>([]);
  
  // Modales de selección
  const [openSingleModal, setOpenSingleModal] = useState(false);
  const [openKitModal, setOpenKitModal] = useState(false);
  
  // Estado para armar un Kit en progreso
  const [activeKit, setActiveKit] = useState<Kit | null>(null);
  const [kitSelections, setKitSelections] = useState<Record<string, InventoryItem>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Traer órdenes
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, event_date, total_amount, clients(full_name)')
        .order('event_date', { ascending: true });
      
      if (ordersData) {
        setOrders(ordersData.map((o: any) => ({
          ...o, client: o.clients
        })));
      }

      // Traer inventario
      const { data: invData } = await supabase.from('inventory').select('id, name, category, price_per_unit, total_quantity');
      if (invData) setInventory(invData);

      // Traer Kits
      const { data: kitsData } = await supabase.from('kits').select('*, kit_requirements(*)');
      if (kitsData) setKits(kitsData);

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

  const handleCreateOrder = async () => {
    if (!eventDate || !clientData.name || cart.length === 0) return;
    setIsSubmitting(true);
    
    try {
      // 1. Crear Cliente
      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .insert([{ full_name: clientData.name, phone: clientData.phone, address: clientData.address }])
        .select().single();
      if (clientErr) throw clientErr;

      // 2. Crear Orden
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert([{
          client_id: client.id,
          event_date: eventDate.toISOString().split('T')[0],
          delivery_address: clientData.address,
          total_amount: calculateTotal()
        }])
        .select().single();
      if (orderErr) throw orderErr;

      // 3. Crear Order Items
      const orderItems = [];
      for (const el of cart) {
        if (el.type === 'single') {
          orderItems.push({
            order_id: order.id,
            inventory_id: el.inventory_id,
            quantity: el.quantity,
            price_at_booking: el.price
          });
        } else if (el.type === 'kit') {
          // Desglosar el kit en sus componentes. El precio se asigna 0 porque el total de la orden ya cubre el precio del paquete.
          for (const sel of el.selections) {
            orderItems.push({
              order_id: order.id,
              inventory_id: sel.inventory_id,
              quantity: sel.quantity,
              price_at_booking: 0 
            });
          }
        }
      }

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
      if (itemsErr) throw itemsErr;

      // Éxito
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
    setClientData({ name: '', phone: '', address: '' });
    setEventDate(undefined);
    setCart([]);
    setStep(1);
    setActiveKit(null);
    setKitSelections({});
  };

  const addSingleItemToCart = (item: InventoryItem, qty: number) => {
    setCart([...cart, {
      uid: Math.random().toString(),
      type: 'single',
      inventory_id: item.id,
      name: item.name,
      price: item.price_per_unit,
      quantity: qty
    }]);
    setOpenSingleModal(false);
  };

  const handleStartKit = (kit: Kit) => {
    setActiveKit(kit);
    setKitSelections({});
  };

  const handleFinishKit = () => {
    if (!activeKit) return;
    
    // Validar requerimientos obligatorios
    const missing = activeKit.kit_requirements.find(req => !req.is_optional && !kitSelections[req.id]);
    if (missing) {
      alert(`Falta seleccionar un artículo para la categoría: ${missing.category}`);
      return;
    }

    const selections = activeKit.kit_requirements
      .filter(req => kitSelections[req.id]) // Ignorar opcionales no seleccionados
      .map(req => ({
        req_id: req.id,
        category: req.category,
        inventory_id: kitSelections[req.id].id,
        name: kitSelections[req.id].name,
        quantity: req.quantity
      }));

    setCart([...cart, {
      uid: Math.random().toString(),
      type: 'kit',
      kit_id: activeKit.id,
      name: activeKit.name,
      price: activeKit.price,
      selections
    }]);
    
    setActiveKit(null);
    setKitSelections({});
    setOpenKitModal(false);
  };

  const removeFromCart = (uid: string) => {
    setCart(cart.filter(c => c.uid !== uid));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario de Rentas</h1>
          <p className="text-slate-500 dark:text-slate-400">Administra tus próximos eventos y cotizaciones.</p>
        </div>
        
        <Dialog open={openRentaModal} onOpenChange={(val) => { if(!val) resetForm(); setOpenRentaModal(val); }}>
          <DialogTrigger render={
            <Button className="w-full sm:w-auto h-12 rounded-full px-6 gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
              <Plus className="w-5 h-5" /> Nueva Renta
            </Button>
          } />
          <DialogContent className="sm:max-w-2xl w-full h-[100dvh] sm:h-[85vh] sm:rounded-2xl p-0 overflow-hidden flex flex-col bg-slate-50">
            {/* Header del Modal */}
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

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
              
              {/* PASO 1: CLIENTE */}
              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="font-bold text-slate-800 mb-2">Datos del Cliente</h3>
                    <div className="space-y-2">
                      <Label className="text-slate-500">Nombre completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <Input className="pl-9 h-12 bg-slate-50" placeholder="Ej. María Sánchez" value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-500">Teléfono</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <Input className="pl-9 h-12 bg-slate-50" type="tel" placeholder="10 dígitos" value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
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
                    <div className="space-y-2">
                      <Label className="text-slate-500">Dirección de Entrega</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <Input className="pl-9 h-12 bg-slate-50" placeholder="Calle, Colonia, C.P." value={clientData.address} onChange={e => setClientData({...clientData, address: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 2: CARRITO */}
              {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
                      <Package2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-slate-700">Canasta Vacía</h3>
                      <p className="text-slate-400 mb-6 text-sm">No has agregado mobiliario a la renta.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((el) => (
                        <div key={el.uid} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              {el.type === 'kit' && <span className="bg-indigo-100 text-indigo-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Paquete</span>}
                              <h4 className="font-bold text-slate-800">{el.name}</h4>
                            </div>
                            {el.type === 'single' ? (
                              <p className="text-sm text-slate-500 mt-1">Cantidad: {el.quantity} pzas</p>
                            ) : (
                              <ul className="text-xs text-slate-500 mt-2 space-y-1">
                                {el.selections.map(s => (
                                  <li key={s.req_id}>• {s.quantity}x {s.name}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            <span className="font-bold text-blue-600">${el.type === 'single' ? (el.price * el.quantity).toFixed(2) : el.price.toFixed(2)}</span>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500" onClick={() => removeFromCart(el.uid)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Botones para agregar */}
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
                                <div key={kit.id} className="bg-white p-4 rounded-xl border shadow-sm cursor-pointer hover:border-blue-300 transition" onClick={() => handleStartKit(kit)}>
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800">{kit.name}</h4>
                                    <span className="font-bold text-blue-600">${kit.price}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 line-clamp-2 mb-2">{kit.description}</p>
                                  <p className="text-xs font-medium text-slate-400">Incluye: {kit.kit_requirements.length} elementos</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="bg-blue-600 text-white p-4 rounded-xl shadow-sm">
                                <h4 className="font-bold text-lg">{activeKit.name}</h4>
                                <p className="text-blue-100 text-sm mt-1">Elige los productos específicos para este paquete.</p>
                              </div>
                              
                              <div className="space-y-4">
                                {activeKit.kit_requirements.map(req => {
                                  const filteredItems = inventory.filter(i => i.category === req.category);
                                  const selectedItem = kitSelections[req.id];
                                  
                                  return (
                                    <div key={req.id} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                      <div className="flex justify-between items-center">
                                        <Label className="font-bold text-slate-700 flex items-center gap-2">
                                          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">{req.quantity}</span>
                                          {req.category}
                                          {req.is_optional && <span className="text-xs font-normal text-slate-400">(Opcional)</span>}
                                        </Label>
                                        {selectedItem && <Check className="w-4 h-4 text-green-500" />}
                                      </div>
                                      
                                      <Select 
                                        value={selectedItem?.id || ''} 
                                        onValueChange={(val) => {
                                          const item = inventory.find(i => i.id === val);
                                          if (item) setKitSelections({...kitSelections, [req.id]: item});
                                        }}
                                      >
                                        <SelectTrigger className="bg-slate-50 h-12 rounded-xl">
                                          <SelectValue placeholder={`Selecciona ${req.category.toLowerCase()}...`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {filteredItems.map(item => (
                                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                          ))}
                                          {filteredItems.length === 0 && <SelectItem value="none" disabled>No hay artículos en esta categoría</SelectItem>}
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
                            <Button className="flex-1 rounded-xl h-12 bg-blue-600" onClick={handleFinishKit}>Confirmar Paquete</Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}

              {/* PASO 3: RESUMEN */}
              {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <h2 className="text-2xl font-black text-slate-900 mb-1">Total a Cobrar</h2>
                    <p className="text-5xl font-black text-blue-600 my-4">${calculateTotal().toFixed(2)}</p>
                    <p className="text-sm text-slate-500 font-medium">Cliente: {clientData.name}</p>
                    <p className="text-sm text-slate-500 font-medium">Fecha: {eventDate ? format(eventDate, "PPP", { locale: es }) : ''}</p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                    <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-800">Al guardar la renta, el mobiliario se apartará automáticamente del inventario para la fecha seleccionada.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navegación del Modal */}
            <div className="bg-white border-t p-4 sm:p-6 flex justify-between items-center mt-auto shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10">
              {step > 1 ? (
                <Button variant="ghost" onClick={() => setStep(step - 1 as any)} className="text-slate-500">Atrás</Button>
              ) : (
                <Button variant="ghost" onClick={() => setOpenRentaModal(false)} className="text-slate-500">Cancelar</Button>
              )}
              
              {step < 3 ? (
                <Button 
                  onClick={() => setStep(step + 1 as any)} 
                  disabled={(step === 1 && (!clientData.name || !eventDate)) || (step === 2 && cart.length === 0)}
                  className="rounded-full px-8 bg-slate-900 text-white hover:bg-slate-800"
                >
                  Continuar
                </Button>
              ) : (
                <Button 
                  onClick={handleCreateOrder} 
                  disabled={isSubmitting}
                  className="rounded-full px-8 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Confirmar Renta
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
              <div className="p-12 text-center">
                <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No hay rentas programadas.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.map(order => (
                  <div key={order.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex flex-col items-center justify-center font-bold leading-tight">
                        <span className="text-lg">{format(new Date(order.event_date + 'T12:00:00'), 'd')}</span>
                        <span className="text-[10px] uppercase">{format(new Date(order.event_date + 'T12:00:00'), 'MMM', { locale: es })}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{order.client.full_name}</h4>
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> Evento agendado</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-800">${order.total_amount.toFixed(2)}</p>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mt-1 inline-block">Pendiente</span>
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
    </div>
  );
}
