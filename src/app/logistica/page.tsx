"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, MapPin, CheckCircle2, Loader2, Map, Settings, Calculator, Navigation, Plus, Pencil, Trash2, Package2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Vehicle = {
  id: string;
  name: string;
  capacity_desc: string | null;
  fuel_type: string;
  autonomy_km_per_liter: number;
  status: string;
};

type LogisticsSettings = {
  id: string;
  warehouse_address: string;
  warehouse_lat: number | null;
  warehouse_lng: number | null;
  gasoline_price: number;
  diesel_price: number;
};

type Rental = {
  id: string;
  client_id: string;
  event_date: string;
  delivery_address: string;
  status: string;
  total_amount: number;
  delivery_vehicle_id: string | null;
  delivery_route_order: number | null;
  clients: { full_name: string, phone: string };
};

export default function LogisticaPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [settings, setSettings] = useState<LogisticsSettings | null>(null);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Configuracion Modal
  const [openSettingsModal, setOpenSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    warehouse_address: '',
    warehouse_lat: '',
    warehouse_lng: '',
    gasoline_price: '',
    diesel_price: ''
  });

  // Vehiculos Modal
  const [openVehicleModal, setOpenVehicleModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    name: '', capacity_desc: '', fuel_type: 'gasolina', autonomy_km_per_liter: ''
  });

  // Cotizador
  const [quoteDestination, setQuoteDestination] = useState('');
  const [quoteVehicleId, setQuoteVehicleId] = useState('');
  const [quoteMargin, setQuoteMargin] = useState('50');
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteResult, setQuoteResult] = useState<{
    distance_km: number,
    liters: number,
    base_cost: number,
    suggested_price: number,
    time_minutes: number
  } | null>(null);

  // Rutas V2 (LIFO & VRP)
  const [routeDate, setRouteDate] = useState<Date>(new Date());
  const [selectedUnassigned, setSelectedUnassigned] = useState<string[]>([]);
  const [assignToVehicleId, setAssignToVehicleId] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState<string | null>(null); // vehicle_id
  
  // LIFO Manifest Modal
  const [openLifoModal, setOpenLifoModal] = useState(false);
  const [lifoData, setLifoData] = useState<{ vehicle: Vehicle | null, itemsByStop: any[] }>({ vehicle: null, itemsByStop: [] });
  const [isLoadingLifo, setIsLoadingLifo] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vehRes, setRes, rentRes] = await Promise.all([
        supabase.from('vehicles').select('*').order('name'),
        supabase.from('logistics_settings').select('*').limit(1).single(),
        supabase.from('orders').select('*, clients(full_name, phone)').neq('delivery_address', '').not('delivery_address', 'is', null).order('event_date', { ascending: true })
      ]);
      if (setRes.error && setRes.error.code !== 'PGRST116') {
        console.error('Error fetching settings:', setRes.error);
        alert('Error cargando configuración: ' + setRes.error.message);
      }
      if (vehRes.error) {
        console.error('Error fetching vehicles:', vehRes.error);
      }
      if (rentRes.error) {
        console.error('Error fetching orders:', rentRes.error);
      }

      if (vehRes.data) setVehicles(vehRes.data);
      if (rentRes.data) setRentals(rentRes.data);
      if (setRes.data) {
        setSettings(setRes.data);
      } else if (!setRes.error || setRes.error.code === 'PGRST116') {
        // If settings don't exist, create default
        const { data: newSettings, error: insertErr } = await supabase.from('logistics_settings').insert([{}]).select().single();
        if (insertErr) {
          console.error('Error creating default settings:', insertErr);
          // Don't alert here to avoid spamming, but log it
        }
        if (newSettings) setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching logistics data', error);
    } finally {
      setLoading(false);
    }
  };

  const geocodeAddress = async (address: string) => {
    // 1. Detectar si el usuario pegó coordenadas directamente (Ej. "24.123, -107.123" o "24.123 -107.123")
    const coordsMatch = address.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (coordsMatch) {
      return { lat: parseFloat(coordsMatch[1]), lon: parseFloat(coordsMatch[2]) };
    }

    try {
      // 2. Intentar busqueda estricta con Sinaloa, Mexico
      let query = encodeURIComponent(address + ', Sinaloa, Mexico');
      let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      let data = await res.json();
      
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }

      // 3. Si falla, intentar busqueda suelta sin filtros adicionales
      await new Promise(r => setTimeout(r, 1000)); // Respect nominatim limit of 1 req/sec
      query = encodeURIComponent(address);
      res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      data = await res.json();
      
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
    } catch (e) {
      console.error('Geocoding error:', e);
    }
    
    return null;
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let coords = { lat: settings?.warehouse_lat || null, lon: settings?.warehouse_lng || null };
      
      // Si el usuario ingresó manualmente coordenadas numéricas, las usamos. Si no, geocodificamos.
      const manualLat = parseFloat(settingsForm.warehouse_lat);
      const manualLng = parseFloat(settingsForm.warehouse_lng);
      
      if (!isNaN(manualLat) && !isNaN(manualLng) && manualLat !== 0 && manualLng !== 0) {
        coords = { lat: manualLat, lon: manualLng };
      } else if (settingsForm.warehouse_address !== settings?.warehouse_address) {
        const newCoords = await geocodeAddress(settingsForm.warehouse_address);
        if (newCoords) {
          coords = newCoords;
        } else {
          alert('No se pudieron encontrar las coordenadas automáticas. Por favor ingresa Latitud y Longitud manualmente.');
          setIsSaving(false);
          return;
        }
      }

      const updates = {
        warehouse_address: settingsForm.warehouse_address,
        gasoline_price: parseFloat(settingsForm.gasoline_price),
        diesel_price: parseFloat(settingsForm.diesel_price),
        warehouse_lat: coords.lat,
        warehouse_lng: coords.lon
      };

      let saveError = null;
      if (!settings) {
        const { error } = await supabase.from('logistics_settings').insert([updates]);
        saveError = error;
      } else {
        const { error } = await supabase.from('logistics_settings').update(updates).eq('id', settings.id);
        saveError = error;
      }
      
      if (saveError) {
        console.error('Supabase Save Error:', saveError);
        alert('Error al guardar en base de datos: ' + saveError.message);
        setIsSaving(false);
        return;
      }
      
      await fetchData();
      setOpenSettingsModal(false);
    } catch (error) {
      console.error(error);
      alert('Error guardando configuraciones');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: vehicleForm.name,
        capacity_desc: vehicleForm.capacity_desc,
        fuel_type: vehicleForm.fuel_type,
        autonomy_km_per_liter: parseFloat(vehicleForm.autonomy_km_per_liter)
      };

      let saveError = null;
      if (editingVehicleId) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', editingVehicleId);
        saveError = error;
      } else {
        const { error } = await supabase.from('vehicles').insert([payload]);
        saveError = error;
      }
      
      if (saveError) {
        console.error('Vehicle Save Error:', saveError);
        alert('Error al guardar vehículo: ' + saveError.message);
        setIsSaving(false);
        return;
      }

      await fetchData();
      setOpenVehicleModal(false);
    } catch (error) {
      console.error(error);
      alert('Error guardando vehículo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if(!confirm('¿Eliminar vehículo?')) return;
    await supabase.from('vehicles').delete().eq('id', id);
    fetchData();
  };

  const handleCalculateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !settings.warehouse_lat || !settings.warehouse_lng) {
      alert('Debes configurar la dirección de tu bodega primero (y debe ser válida).');
      return;
    }
    const vehicle = vehicles.find(v => v.id === quoteVehicleId);
    if (!vehicle) return;

    setIsQuoting(true);
    setQuoteResult(null);
    try {
      // 1. Geocode destination
      const destCoords = await geocodeAddress(quoteDestination);
      if (!destCoords) {
        alert('No se pudo encontrar la dirección de destino.');
        setIsQuoting(false);
        return;
      }

      // 2. Fetch routing from OSRM
      // Format: {lon},{lat};{lon},{lat}
      const coordsString = `${settings.warehouse_lng},${settings.warehouse_lat};${destCoords.lon},${destCoords.lat}`;
      const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=false`);
      const osrmData = await osrmRes.json();

      if (osrmData.code !== 'Ok' || !osrmData.routes || osrmData.routes.length === 0) {
        alert('No se pudo trazar una ruta hacia el destino.');
        setIsQuoting(false);
        return;
      }

      // OSRM returns distance in meters and duration in seconds
      const distanceMeters = osrmData.routes[0].distance;
      const durationSeconds = osrmData.routes[0].duration;

      const distanceKm = distanceMeters / 1000;
      const distanceRoundTrip = distanceKm * 2; // Ida y vuelta

      // 3. Calculos
      const litersNeeded = distanceRoundTrip / vehicle.autonomy_km_per_liter;
      const fuelPrice = vehicle.fuel_type === 'diesel' ? settings.diesel_price : settings.gasoline_price;
      const baseCost = litersNeeded * fuelPrice;
      const margin = parseFloat(quoteMargin) / 100;
      const suggestedPrice = baseCost + (baseCost * margin);

      setQuoteResult({
        distance_km: distanceRoundTrip,
        liters: litersNeeded,
        base_cost: baseCost,
        suggested_price: suggestedPrice,
        time_minutes: (durationSeconds / 60) * 2 // tiempo ida y vuelta aprox
      });

    } catch (error) {
      console.error(error);
      alert('Hubo un error calculando el flete.');
    } finally {
      setIsQuoting(false);
    }
  };

  const handleAssignVehicle = async (vehicleId: string) => {
    if (selectedUnassigned.length === 0) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_vehicle_id: vehicleId })
        .in('id', selectedUnassigned);
      if (error) throw error;
      
      setSelectedUnassigned([]);
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Error al asignar vehículo");
    }
  };

  const handleUnassignOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.from('orders').update({ delivery_vehicle_id: null, delivery_route_order: null }).eq('id', orderId);
      if (error) throw error;
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOptimizeRouteForVehicle = async (vehicleId: string, vehicleOrders: Rental[]) => {
    if (!settings?.warehouse_lat || !settings?.warehouse_lng) {
      alert('Debes configurar la dirección de tu bodega primero.');
      return;
    }
    if (vehicleOrders.length === 0) return;

    setIsOptimizing(vehicleId);
    try {
      const waypoints = [{ lon: settings.warehouse_lng, lat: settings.warehouse_lat, rental: null as Rental | null }];

      // Geocode each rental
      for (const rent of vehicleOrders) {
        const coords = await geocodeAddress(rent.delivery_address);
        if (coords) {
          waypoints.push({ lon: coords.lon, lat: coords.lat, rental: rent });
        } else {
          alert(`No se encontró dirección para el cliente ${rent.clients?.full_name || 'Desconocido'}. Se omitirá.`);
        }
        await new Promise(r => setTimeout(r, 1000)); // Rate limit Nominatim
      }

      if (waypoints.length < 2) {
        setIsOptimizing(null);
        return;
      }

      const coordsString = waypoints.map(w => `${w.lon},${w.lat}`).join(';');
      const res = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coordsString}?roundtrip=true&source=first&destination=last`);
      const data = await res.json();

      if (data.code !== 'Ok' || !data.waypoints) throw new Error('OSRM API Error');

      // waypoint_index represents its optimal position in the route.
      // Update DB with the optimal order
      const updatePromises = data.waypoints.map((wp: any, originalIndex: number) => {
        const wpData = waypoints[originalIndex];
        if (wpData.rental) {
          // wp.waypoint_index is the stop number (0 is warehouse)
          return supabase.from('orders').update({ delivery_route_order: wp.waypoint_index }).eq('id', wpData.rental.id);
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Hubo un error calculando la ruta óptima.');
    } finally {
      setIsOptimizing(null);
    }
  };

  const handleOpenLifoManifest = async (vehicle: Vehicle, vehicleOrders: Rental[]) => {
    if (vehicleOrders.length === 0) {
      alert("No hay rentas asignadas a este vehículo hoy.");
      return;
    }
    setIsLoadingLifo(true);
    setLifoData({ vehicle, itemsByStop: [] });
    setOpenLifoModal(true);

    try {
      // 1. Fetch order items for all these orders
      const orderIds = vehicleOrders.map(o => o.id);
      const { data: itemsData, error } = await supabase
        .from('order_items')
        .select('order_id, quantity, inventory(name, category)')
        .in('order_id', orderIds);
      
      if (error) throw error;

      // 2. Group by Stop (LIFO - Highest delivery_route_order first)
      const sortedOrders = [...vehicleOrders].sort((a, b) => (b.delivery_route_order || 0) - (a.delivery_route_order || 0));
      
      const itemsByStop = sortedOrders.map(order => {
        const oItems = itemsData?.filter(i => i.order_id === order.id) || [];
        // Sum similar items
        const aggregated: Record<string, number> = {};
        oItems.forEach(i => {
          const name = (i.inventory as any)?.name || 'Mobiliario';
          aggregated[name] = (aggregated[name] || 0) + i.quantity;
        });

        return {
          stopNumber: order.delivery_route_order || 0,
          clientName: order.clients?.full_name,
          address: order.delivery_address,
          items: Object.entries(aggregated).map(([name, qty]) => ({ name, qty }))
        };
      });

      setLifoData({ vehicle, itemsByStop });
    } catch (e) {
      console.error(e);
      alert("Error cargando el manifiesto");
    } finally {
      setIsLoadingLifo(false);
    }
  };

  const openEditVehicle = (v: Vehicle) => {
    setVehicleForm({
      name: v.name,
      capacity_desc: v.capacity_desc || '',
      fuel_type: v.fuel_type,
      autonomy_km_per_liter: v.autonomy_km_per_liter.toString()
    });
    setEditingVehicleId(v.id);
    setOpenVehicleModal(true);
  };

  const openNewVehicle = () => {
    setVehicleForm({ name: '', capacity_desc: '', fuel_type: 'gasolina', autonomy_km_per_liter: '' });
    setEditingVehicleId(null);
    setOpenVehicleModal(true);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Logística y Rutas</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Cotizador de fletes y administración de flotilla.
        </p>
      </div>

      <Tabs defaultValue="cotizador" className="w-full">
        <TabsList className="grid w-full sm:w-[600px] grid-cols-3 mb-6">
          <TabsTrigger value="cotizador" className="gap-2"><Calculator className="w-4 h-4"/> Cotizador</TabsTrigger>
          <TabsTrigger value="rutas" className="gap-2"><Navigation className="w-4 h-4"/> Rutas Inteligentes</TabsTrigger>
          <TabsTrigger value="flotilla" className="gap-2"><Settings className="w-4 h-4"/> Flotilla & Variables</TabsTrigger>
        </TabsList>

        {/* ----------------- TAB: COTIZADOR ----------------- */}
        <TabsContent value="cotizador" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl">
              <CardHeader className="bg-slate-50 border-b rounded-t-2xl">
                <CardTitle>Generar Cotización de Flete</CardTitle>
                <CardDescription>Calcula el costo neto basándote en distancias reales y el consumo de tus vehículos.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCalculateQuote} className="space-y-5">
                  <div className="space-y-2">
                    <Label>Vehículo a utilizar</Label>
                    <Select value={quoteVehicleId} onValueChange={(val) => setQuoteVehicleId(val || '')} required>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Selecciona una camioneta" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name} ({v.autonomy_km_per_liter} km/l)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Dirección Destino</Label>
                    <Input 
                      required 
                      className="h-12 rounded-xl" 
                      placeholder="Ej. Av. Álvaro Obregón 1234, Culiacán" 
                      value={quoteDestination} 
                      onChange={e => setQuoteDestination(e.target.value)} 
                    />
                    <p className="text-xs text-slate-500">Se usará OpenStreetMap para trazar la ruta de tu bodega hacia acá.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Porcentaje de Ganancia Extra (%)</Label>
                    <Input 
                      type="number" 
                      min="0"
                      className="h-12 rounded-xl" 
                      value={quoteMargin} 
                      onChange={e => setQuoteMargin(e.target.value)} 
                    />
                    <p className="text-xs text-slate-500">Lo que quieres cobrar adicional al costo bruto de la gasolina.</p>
                  </div>

                  <Button type="submit" disabled={isQuoting || !settings?.warehouse_lat} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                    {isQuoting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Calculator className="w-5 h-5 mr-2" />}
                    Calcular Costo
                  </Button>
                  {!settings?.warehouse_lat && (
                    <p className="text-red-500 text-sm text-center font-medium">Falta configurar las coordenadas de tu bodega en la pestaña de Flotilla.</p>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Resultado de Cotización */}
            {quoteResult && (
              <Card className="border-0 shadow-sm ring-1 ring-blue-200 rounded-2xl bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="text-blue-800 flex items-center gap-2"><CheckCircle2 className="w-6 h-6"/> Cotización Lista</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Distancia (Ida y Vuelta)</p>
                      <p className="text-2xl font-black text-slate-800">{quoteResult.distance_km.toFixed(1)} <span className="text-sm font-medium text-slate-500">km</span></p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Tiempo Aprox.</p>
                      <p className="text-2xl font-black text-slate-800">{Math.round(quoteResult.time_minutes)} <span className="text-sm font-medium text-slate-500">min</span></p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Consumo Estimado</p>
                      <p className="text-2xl font-black text-slate-800">{quoteResult.liters.toFixed(1)} <span className="text-sm font-medium text-slate-500">Litros</span></p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm bg-red-50/30">
                      <p className="text-xs font-semibold text-red-500 uppercase">Costo Gasolina Neto</p>
                      <p className="text-2xl font-black text-red-600">${quoteResult.base_cost.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-blue-600 text-white p-6 rounded-xl shadow-md text-center">
                    <p className="text-blue-200 font-medium uppercase tracking-wider text-sm mb-1">Precio Sugerido de Flete</p>
                    <p className="text-5xl font-black">${quoteResult.suggested_price.toFixed(2)}</p>
                    <p className="text-blue-200 text-xs mt-2">Incluye el costo de gasolina + {quoteMargin}% de margen.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ----------------- TAB: RUTAS ----------------- */}
        <TabsContent value="rutas" className="space-y-6 m-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Armador de Rutas</h2>
              <p className="text-sm text-slate-500">Planifica las entregas del día y asigna vehículos.</p>
            </div>
            <div className="flex items-center gap-2">
              <Label className="font-bold">Fecha:</Label>
              <Input type="date" className="w-auto bg-slate-50 border-slate-200" value={routeDate.toISOString().split('T')[0]} onChange={(e) => setRouteDate(new Date(e.target.value + 'T12:00:00'))} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* SIN ASIGNAR */}
            <Card className="xl:col-span-1 border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl flex flex-col max-h-[600px]">
              <CardHeader className="bg-slate-50 border-b rounded-t-2xl py-4">
                <CardTitle className="text-base flex justify-between items-center">
                  Pendientes de Asignar
                  <Badge variant="secondary">{rentals.filter(r => r.event_date === routeDate.toISOString().split('T')[0] && !r.delivery_vehicle_id).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1">
                <div className="divide-y">
                  {rentals.filter(r => r.event_date === routeDate.toISOString().split('T')[0] && !r.delivery_vehicle_id).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No hay rentas pendientes para este día.</div>
                  ) : (
                    rentals.filter(r => r.event_date === routeDate.toISOString().split('T')[0] && !r.delivery_vehicle_id).map(rental => (
                      <div key={rental.id} className="p-3 flex items-start gap-3 hover:bg-slate-50">
                        <input 
                          type="checkbox" 
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedUnassigned.includes(rental.id)}
                          onChange={(e) => {
                            if(e.target.checked) setSelectedUnassigned([...selectedUnassigned, rental.id]);
                            else setSelectedUnassigned(selectedUnassigned.filter(id => id !== rental.id));
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 truncate">{rental.clients?.full_name}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5"><MapPin className="w-3 h-3 inline mr-1"/>{rental.delivery_address}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              {selectedUnassigned.length > 0 && (
                <div className="p-3 border-t bg-slate-50 flex gap-2">
                  <Select onValueChange={(val: string | null) => setAssignToVehicleId(val || '')}>
                    <SelectTrigger className="flex-1 bg-white h-10"><SelectValue placeholder="Elegir Vehículo" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button disabled={!assignToVehicleId} className="h-10 bg-blue-600 hover:bg-blue-700" onClick={() => handleAssignVehicle(assignToVehicleId)}>
                    Asignar
                  </Button>
                </div>
              )}
            </Card>

            {/* VEHICULOS */}
            <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {vehicles.map(vehicle => {
                const vehicleOrders = rentals.filter(r => r.event_date === routeDate.toISOString().split('T')[0] && r.delivery_vehicle_id === vehicle.id);
                // Sort by delivery order if optimized
                const isOptimized = vehicleOrders.length > 0 && vehicleOrders.every(o => o.delivery_route_order !== null);
                if (isOptimized) {
                  vehicleOrders.sort((a, b) => (a.delivery_route_order || 0) - (b.delivery_route_order || 0));
                }

                return (
                  <Card key={vehicle.id} className="border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl flex flex-col h-fit">
                    <CardHeader className="bg-slate-800 text-white rounded-t-2xl py-3 px-4 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-blue-300" />
                        <CardTitle className="text-sm">{vehicle.name}</CardTitle>
                      </div>
                      <Badge className="bg-slate-700 hover:bg-slate-700 text-white border-0">{vehicleOrders.length} Paradas</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      {vehicleOrders.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm">Camioneta sin carga hoy.</div>
                      ) : (
                        <div className="divide-y max-h-[300px] overflow-y-auto">
                          {vehicleOrders.map((order, idx) => (
                            <div key={order.id} className="p-3 text-sm flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                                {isOptimized ? order.delivery_route_order : (idx + 1)}
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-slate-800">{order.clients?.full_name}</p>
                                <p className="text-xs text-slate-500 truncate pr-2">{order.delivery_address}</p>
                              </div>
                              <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleUnassignOrder(order.id)}><Trash2 className="w-3 h-3"/></Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {vehicleOrders.length > 0 && (
                        <div className="p-3 border-t bg-slate-50 flex flex-col gap-2 rounded-b-2xl">
                          <Button 
                            variant="outline" 
                            className={cn("w-full h-9", isOptimized ? "border-green-200 text-green-700 bg-green-50" : "border-slate-300")}
                            onClick={() => handleOptimizeRouteForVehicle(vehicle.id, vehicleOrders)}
                            disabled={isOptimizing === vehicle.id}
                          >
                            {isOptimizing === vehicle.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (isOptimized ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Navigation className="w-4 h-4 mr-2" />)}
                            {isOptimized ? 'Ruta Optimizada' : 'Optimizar Ruta OSRM'}
                          </Button>
                          <Button 
                            className="w-full h-9 bg-slate-900 text-white"
                            onClick={() => handleOpenLifoManifest(vehicle, vehicleOrders)}
                            disabled={!isOptimized}
                          >
                            <Package2 className="w-4 h-4 mr-2" /> Hoja de Carga (LIFO)
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ----------------- TAB: FLOTILLA ----------------- */}
        <TabsContent value="flotilla" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Panel de Configuración Global */}
            <Card className="lg:col-span-1 border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl h-fit">
              <CardHeader className="bg-slate-50 border-b rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Variables de Costos</CardTitle>
                    <CardDescription>Configuración global para los cálculos.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    if(settings) {
                      setSettingsForm({
                        warehouse_address: settings.warehouse_address,
                        warehouse_lat: settings.warehouse_lat?.toString() || '',
                        warehouse_lng: settings.warehouse_lng?.toString() || '',
                        gasoline_price: settings.gasoline_price.toString(),
                        diesel_price: settings.diesel_price.toString()
                      });
                    }
                    setOpenSettingsModal(true);
                  }}>Editar</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Ubicación Bodega</p>
                      <p className="text-xs text-slate-500 truncate max-w-[180px]">{settings?.warehouse_address}</p>
                    </div>
                  </div>
                  {settings?.warehouse_lat ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">Geolocalizada</Badge> : <Badge variant="destructive">Sin Coordenadas</Badge>}
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-[10px]">G</div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Gasolina</p>
                      <p className="text-xs text-slate-500">Precio por litro</p>
                    </div>
                  </div>
                  <p className="font-bold">${settings?.gasoline_price.toFixed(2)}</p>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-bold text-[10px]">D</div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Diésel</p>
                      <p className="text-xs text-slate-500">Precio por litro</p>
                    </div>
                  </div>
                  <p className="font-bold">${settings?.diesel_price.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Panel de Flotilla */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Vehículos ({vehicles.length})</h2>
                <Button onClick={openNewVehicle} className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-1"/> Nuevo Vehículo</Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {vehicles.map(v => (
                  <Card key={v.id} className="border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{v.name}</h3>
                            <Badge variant="secondary" className="mt-1 font-normal text-xs">{v.fuel_type.toUpperCase()}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-sm" className="w-8 h-8 rounded-full" onClick={() => openEditVehicle(v)}><Pencil className="w-4 h-4 text-slate-400"/></Button>
                          <Button variant="ghost" size="icon-sm" className="w-8 h-8 rounded-full hover:text-red-600" onClick={() => handleDeleteVehicle(v.id)}><Trash2 className="w-4 h-4"/></Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Rendimiento</p>
                          <p className="font-medium text-slate-700">{v.autonomy_km_per_liter} km/l</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Capacidad</p>
                          <p className="font-medium text-slate-700 truncate">{v.capacity_desc || 'No especificada'}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {vehicles.length === 0 && (
                  <div className="col-span-2 text-center py-10 bg-slate-50 rounded-2xl border-dashed border">
                    <p className="text-slate-500">No hay vehículos registrados.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Settings */}
          <Dialog open={openSettingsModal} onOpenChange={setOpenSettingsModal}>
            <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
              <DialogTitle>Editar Variables Logísticas</DialogTitle>
              <form onSubmit={handleSaveSettings} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Dirección Base (Bodega)</Label>
                  <Input required className="h-12 rounded-xl" value={settingsForm.warehouse_address} onChange={e => setSettingsForm({...settingsForm, warehouse_address: e.target.value})} />
                  <p className="text-xs text-slate-500">Escribe la dirección más completa posible para que el mapa la encuentre bien.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitud (Opcional)</Label>
                    <Input type="text" placeholder="Ej. 24.802" className="h-12 rounded-xl" value={settingsForm.warehouse_lat} onChange={e => {
                      const val = e.target.value;
                      if (val.includes(',')) {
                        const parts = val.split(',');
                        if (parts.length >= 2) {
                          setSettingsForm({...settingsForm, warehouse_lat: parts[0].trim(), warehouse_lng: parts[1].trim()});
                          return;
                        }
                      }
                      setSettingsForm({...settingsForm, warehouse_lat: val});
                    }} />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitud (Opcional)</Label>
                    <Input type="text" placeholder="Ej. -107.39" className="h-12 rounded-xl" value={settingsForm.warehouse_lng} onChange={e => setSettingsForm({...settingsForm, warehouse_lng: e.target.value})} />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Si dejas Latitud y Longitud vacíos, el sistema intentará calcularlos automáticamente buscando la dirección.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Precio Gasolina / L</Label>
                    <Input type="number" step="0.01" required className="h-12 rounded-xl" value={settingsForm.gasoline_price} onChange={e => setSettingsForm({...settingsForm, gasoline_price: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio Diésel / L</Label>
                    <Input type="number" step="0.01" required className="h-12 rounded-xl" value={settingsForm.diesel_price} onChange={e => setSettingsForm({...settingsForm, diesel_price: e.target.value})} />
                  </div>
                </div>
                <Button type="submit" disabled={isSaving} className="w-full h-12 rounded-xl bg-blue-600 text-white">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null} Guardar Cambios
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Modal Vehicle */}
          <Dialog open={openVehicleModal} onOpenChange={setOpenVehicleModal}>
            <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
              <DialogTitle>{editingVehicleId ? 'Editar Vehículo' : 'Nuevo Vehículo'}</DialogTitle>
              <form onSubmit={handleSaveVehicle} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nombre identificador</Label>
                  <Input required placeholder="Ej. Nissan Blanca" className="h-12 rounded-xl" value={vehicleForm.name} onChange={e => setVehicleForm({...vehicleForm, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Capacidad descriptiva</Label>
                  <Input placeholder="Ej. 100 sillas, 10 mesas" className="h-12 rounded-xl" value={vehicleForm.capacity_desc} onChange={e => setVehicleForm({...vehicleForm, capacity_desc: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Combustible</Label>
                    <Select value={vehicleForm.fuel_type} onValueChange={v => setVehicleForm({...vehicleForm, fuel_type: v || 'gasolina'})}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gasolina">Gasolina</SelectItem>
                        <SelectItem value="diesel">Diésel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rendimiento (km/l)</Label>
                    <Input type="number" step="0.1" required placeholder="8.5" className="h-12 rounded-xl" value={vehicleForm.autonomy_km_per_liter} onChange={e => setVehicleForm({...vehicleForm, autonomy_km_per_liter: e.target.value})} />
                  </div>
                </div>
                <Button type="submit" disabled={isSaving} className="w-full h-12 rounded-xl bg-blue-600 text-white">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null} Guardar Vehículo
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Modal LIFO Manifest */}
          <Dialog open={openLifoModal} onOpenChange={setOpenLifoModal}>
            <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package2 className="w-5 h-5 text-blue-600" />
                  Manifiesto de Carga (LIFO)
                </DialogTitle>
                <DialogDescription>Cargar al fondo los artículos de la última parada.</DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto mt-4 space-y-4">
                {isLoadingLifo ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                ) : (
                  lifoData.itemsByStop.map((stop, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-100 p-3 border-b flex justify-between items-center">
                        <div>
                          <Badge variant="outline" className="mr-2 bg-white">Parada #{stop.stopNumber}</Badge>
                          <span className="font-bold text-slate-800">{stop.clientName}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded uppercase">
                          {idx === 0 ? 'Cargar al Fondo (Último destino)' : (idx === lifoData.itemsByStop.length - 1 ? 'Cargar en la Puerta (Primer destino)' : 'Cargar en medio')}
                        </span>
                      </div>
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {stop.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border">
                            <span className="text-sm font-medium text-slate-700 truncate pr-2">{item.name}</span>
                            <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-xs">x{item.qty}</span>
                          </div>
                        ))}
                        {stop.items.length === 0 && (
                          <p className="text-sm text-slate-400 col-span-full">No hay artículos registrados para esta renta.</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="pt-4 border-t mt-4 flex justify-end">
                <Button variant="outline" onClick={() => window.print()} className="gap-2">Imprimir Hoja</Button>
              </div>
            </DialogContent>
          </Dialog>

        </TabsContent>
      </Tabs>
    </div>
  );
}
