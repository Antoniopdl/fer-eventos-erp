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
import { Truck, MapPin, CheckCircle2, Loader2, Map, Settings, Calculator, Navigation, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  address: string;
  status: string;
  total_price: number;
  clients: { name: string, phone: string };
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

  // Rutas
  const [selectedRentals, setSelectedRentals] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<{rental: Rental, distance: number}[] | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vehRes, setRes, rentRes] = await Promise.all([
        supabase.from('vehicles').select('*').order('name'),
        supabase.from('logistics_settings').select('*').limit(1).single(),
        supabase.from('rentals').select('*, clients(name, phone)').in('status', ['Confirmada', 'Entregado']).not('address', 'is', null).order('event_date', { ascending: true })
      ]);
      if (setRes.error && setRes.error.code !== 'PGRST116') {
        console.error('Error fetching settings:', setRes.error);
        alert('Error cargando configuración: ' + setRes.error.message);
      }
      if (vehRes.error) {
        console.error('Error fetching vehicles:', vehRes.error);
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
    const query = encodeURIComponent(address + ', Sinaloa, Mexico');
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
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

      if (editingVehicleId) {
        await supabase.from('vehicles').update(payload).eq('id', editingVehicleId);
      } else {
        await supabase.from('vehicles').insert([payload]);
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

  const handleOptimizeRoute = async () => {
    if (!settings?.warehouse_lat || !settings?.warehouse_lng) {
      alert('Debes configurar la dirección de tu bodega primero.');
      return;
    }
    if (selectedRentals.length === 0) {
      alert('Selecciona al menos una renta para la ruta.');
      return;
    }

    setIsOptimizing(true);
    setOptimizedRoute(null);
    try {
      const selected = rentals.filter(r => selectedRentals.includes(r.id));
      const waypoints = [{ lon: settings.warehouse_lng, lat: settings.warehouse_lat, rental: null as Rental | null }];

      // Geocode each rental with a 1s delay to respect Nominatim limits
      for (const rent of selected) {
        const coords = await geocodeAddress(rent.address);
        if (coords) {
          waypoints.push({ lon: coords.lon, lat: coords.lat, rental: rent });
        } else {
          alert(`No se encontró dirección para el cliente ${rent.clients?.name || 'Desconocido'}. Se omitirá de la ruta.`);
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      if (waypoints.length < 2) {
        alert('No hay suficientes destinos válidos para trazar una ruta.');
        setIsOptimizing(false);
        return;
      }

      const coordsString = waypoints.map(w => `${w.lon},${w.lat}`).join(';');
      const res = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coordsString}?roundtrip=true&source=first&destination=last`);
      const data = await res.json();

      if (data.code !== 'Ok' || !data.waypoints) {
        throw new Error('OSRM API Error');
      }

      // data.waypoints has the same length as our input array.
      // waypoint_index represents its optimal position in the route.
      const optimalOrder = new Array(waypoints.length);
      data.waypoints.forEach((wp: any, originalIndex: number) => {
        optimalOrder[wp.waypoint_index] = waypoints[originalIndex];
      });

      // Filter out the warehouse (index 0) and map to the required state format
      const finalRoute = optimalOrder.filter(w => w.rental !== null).map(w => ({
        rental: w.rental as Rental,
        distance: 0 // Simplification for now
      }));

      setOptimizedRoute(finalRoute);
    } catch (error) {
      console.error(error);
      alert('Hubo un error calculando la ruta óptima.');
    } finally {
      setIsOptimizing(false);
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl">
              <CardHeader className="bg-slate-50 border-b rounded-t-2xl">
                <CardTitle>Eventos a Entregar</CardTitle>
                <CardDescription>Selecciona los eventos para calcular la ruta más rápida.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-y-auto divide-y">
                  {rentals.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No hay rentas con direcciones válidas.</div>
                  ) : (
                    rentals.map(rental => (
                      <div key={rental.id} className="p-4 flex items-start gap-4 hover:bg-slate-50">
                        <input 
                          type="checkbox" 
                          className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedRentals.includes(rental.id)}
                          onChange={(e) => {
                            if(e.target.checked) setSelectedRentals([...selectedRentals, rental.id]);
                            else setSelectedRentals(selectedRentals.filter(id => id !== rental.id));
                          }}
                        />
                        <div>
                          <p className="font-bold text-slate-800">{rental.clients?.name || 'Cliente'}</p>
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {rental.address}</p>
                          <p className="text-xs text-blue-600 font-medium mt-1">
                            {new Date(rental.event_date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 border-t bg-slate-50 rounded-b-2xl">
                  <Button 
                    onClick={handleOptimizeRoute} 
                    disabled={isOptimizing || selectedRentals.length === 0} 
                    className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    {isOptimizing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Navigation className="w-5 h-5 mr-2" />}
                    {isOptimizing ? 'Calculando Ruta...' : `Optimizar Ruta para ${selectedRentals.length} destinos`}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-blue-200 rounded-2xl bg-blue-50/30 overflow-hidden">
              <CardHeader className="bg-blue-600 text-white">
                <CardTitle className="flex items-center gap-2"><Map className="w-5 h-5"/> Ruta Sugerida</CardTitle>
                <CardDescription className="text-blue-100">Orden óptimo calculado por Inteligencia Artificial (OSRM).</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {!optimizedRoute ? (
                  <div className="p-12 text-center">
                    <Map className="w-12 h-12 text-blue-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Selecciona eventos y calcula la ruta.</p>
                  </div>
                ) : (
                  <div className="p-6 relative">
                    <div className="absolute top-10 bottom-10 left-[43px] w-0.5 bg-blue-200"></div>
                    <div className="space-y-6 relative">
                      <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold shadow-md z-10 flex-shrink-0">
                          B
                        </div>
                        <div className="pt-2">
                          <p className="font-bold text-slate-800">Bodega (Inicio)</p>
                          <p className="text-sm text-slate-500">{settings?.warehouse_address}</p>
                        </div>
                      </div>
                      
                      {optimizedRoute.map((node, index) => (
                        <div key={node.rental.id} className="flex gap-4 items-start">
                          <div className="w-10 h-10 rounded-full bg-white border-2 border-blue-500 text-blue-600 flex items-center justify-center font-bold shadow-sm z-10 flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="pt-1">
                            <p className="font-bold text-blue-700">{node.rental.clients?.name}</p>
                            <p className="text-sm text-slate-600">{node.rental.address}</p>
                            <Badge variant="outline" className="mt-2 text-xs bg-white">{new Date(node.rental.event_date).toLocaleDateString()}</Badge>
                          </div>
                        </div>
                      ))}

                      <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 border border-slate-300 flex items-center justify-center font-bold shadow-sm z-10 flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5"/>
                        </div>
                        <div className="pt-2">
                          <p className="font-bold text-slate-500">Regreso a Bodega</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
