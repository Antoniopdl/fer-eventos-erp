"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Image as ImageIcon, Loader2, MoreVertical, LayoutGrid, List, LayoutTemplate, Pencil, Trash2, Package2, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';

type InventoryItem = {
  id: string;
  name: string;
  total_quantity: number;
  price_per_unit: number;
  category: string;
  image_url: string | null;
};

type KitRequirement = {
  id?: string;
  category: string;
  quantity: number;
  is_optional: boolean;
};

type Kit = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  kit_requirements: KitRequirement[];
};

export default function InventarioPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [openItemModal, setOpenItemModal] = useState(false);
  const [openKitModal, setOpenKitModal] = useState(false);
  
  const [viewMode, setViewMode] = useState<'grid-large' | 'grid-small' | 'table'>('grid-large');
  
  // Estado Formulario Categorías
  const [openCategoryEditModal, setOpenCategoryEditModal] = useState(false);
  const [openCategoryDeleteModal, setOpenCategoryDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [reassignCategoryName, setReassignCategoryName] = useState('');
  
  // Estado Formulario Artículos
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemFormData, setItemFormData] = useState({ name: '', category: 'Sillas', total_quantity: '', price_per_unit: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Estado Formulario Kits
  const [isSubmittingKit, setIsSubmittingKit] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [kitFormData, setKitFormData] = useState({ name: '', price: '', description: '' });
  const [kitRequirements, setKitRequirements] = useState<KitRequirement[]>([{ category: 'Mesas', quantity: 1, is_optional: false }]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Items
    const { data: itemsData, error: itemsError } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (itemsError) console.error('Error fetching inventory:', itemsError);
    else setItems(itemsData || []);

    // Fetch Kits
    const { data: kitsData, error: kitsError } = await supabase
      .from('kits')
      .select('*, kit_requirements(*)')
      .order('created_at', { ascending: false });
      
    if (kitsError) console.error('Error fetching kits:', kitsError);
    else setKits(kitsData || []);

    setLoading(false);
  };

  /* ----------------- FUNCIONES ARTÍCULOS ----------------- */
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsCompressing(true);
      try {
        const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        setImageFile(compressedFile);
      } catch (error) {
        console.error("Error compressing image:", error);
        setImageFile(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const resetItemForm = () => {
    setItemFormData({ name: '', category: 'Sillas', total_quantity: '', price_per_unit: '' });
    setImageFile(null);
    setEditingItemId(null);
  };

  const openEditItemModal = (item: InventoryItem) => {
    setItemFormData({
      name: item.name,
      category: item.category,
      total_quantity: item.total_quantity.toString(),
      price_per_unit: item.price_per_unit.toString(),
    });
    setImageFile(null);
    setEditingItemId(item.id);
    setOpenItemModal(true);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este artículo?')) return;
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Hubo un error al eliminar el artículo.');
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingItem(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error: uploadError } = await supabase.storage.from('inventory-images').upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('inventory-images').getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      }

      const itemData = {
        name: itemFormData.name,
        category: itemFormData.category,
        total_quantity: parseInt(itemFormData.total_quantity),
        price_per_unit: parseFloat(itemFormData.price_per_unit),
      };

      if (imageUrl) Object.assign(itemData, { image_url: imageUrl });

      if (editingItemId) {
        const { error: dbError } = await supabase.from('inventory').update(itemData).eq('id', editingItemId);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase.from('inventory').insert([itemData]);
        if (dbError) throw dbError;
      }
      resetItemForm();
      setOpenItemModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Hubo un error al guardar el artículo.');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  /* ----------------- FUNCIONES KITS ----------------- */
  const resetKitForm = () => {
    setKitFormData({ name: '', price: '', description: '' });
    setKitRequirements([{ category: 'Mesas', quantity: 1, is_optional: false }]);
    setEditingKitId(null);
  };

  const addKitRequirement = () => {
    setKitRequirements([...kitRequirements, { category: 'Sillas', quantity: 1, is_optional: false }]);
  };

  const removeKitRequirement = (index: number) => {
    setKitRequirements(kitRequirements.filter((_, i) => i !== index));
  };

  const updateKitRequirement = (index: number, field: keyof KitRequirement, value: any) => {
    const updated = [...kitRequirements];
    updated[index] = { ...updated[index], [field]: value };
    setKitRequirements(updated);
  };

  const handleKitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingKit(true);
    try {
      const kitData = {
        name: kitFormData.name,
        description: kitFormData.description,
        price: parseFloat(kitFormData.price)
      };

      if (editingKitId) {
        // Actualizar kit
        const { error: kitError } = await supabase.from('kits').update(kitData).eq('id', editingKitId);
        if (kitError) throw kitError;
        
        // Borrar requerimientos viejos y meter nuevos (manera más sencilla por ahora)
        await supabase.from('kit_requirements').delete().eq('kit_id', editingKitId);
        const reqsToInsert = kitRequirements.map(req => ({ ...req, kit_id: editingKitId }));
        await supabase.from('kit_requirements').insert(reqsToInsert);

      } else {
        // Crear nuevo kit
        const { data: newKit, error: kitError } = await supabase.from('kits').insert([kitData]).select().single();
        if (kitError) throw kitError;
        
        // Insertar requerimientos
        const reqsToInsert = kitRequirements.map(req => ({ ...req, kit_id: newKit.id }));
        const { error: reqError } = await supabase.from('kit_requirements').insert(reqsToInsert);
        if (reqError) throw reqError;
      }

      resetKitForm();
      setOpenKitModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving kit:', error);
      alert('Hubo un error al guardar el paquete.');
    } finally {
      setIsSubmittingKit(false);
    }
  };

  const handleDeleteKit = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este paquete?')) return;
    try {
      const { error } = await supabase.from('kits').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting kit:', error);
    }
  };

  const openEditKitModal = (kit: Kit) => {
    setKitFormData({
      name: kit.name,
      price: kit.price.toString(),
      description: kit.description || ''
    });
    setKitRequirements(kit.kit_requirements);
    setEditingKitId(kit.id);
    setOpenKitModal(true);
  };

  const handleRenameCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName || newCategoryName === selectedCategory) return;
    setIsSubmittingItem(true);
    try {
      const { error: invErr } = await supabase.from('inventory').update({ category: newCategoryName }).eq('category', selectedCategory);
      if (invErr) throw invErr;
      const { error: kitErr } = await supabase.from('kit_requirements').update({ category: newCategoryName }).eq('category', selectedCategory);
      if (kitErr) throw kitErr;
      setOpenCategoryEditModal(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Error renombrando categoría.');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleDeleteCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignCategoryName || reassignCategoryName === selectedCategory) return;
    setIsSubmittingItem(true);
    try {
      const { error: invErr } = await supabase.from('inventory').update({ category: reassignCategoryName }).eq('category', selectedCategory);
      if (invErr) throw invErr;
      const { error: kitErr } = await supabase.from('kit_requirements').update({ category: reassignCategoryName }).eq('category', selectedCategory);
      if (kitErr) throw kitErr;
      setOpenCategoryDeleteModal(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Error eliminando categoría.');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const uniqueCategories = Array.from(new Set([
    "Sillas", "Mesas", "Carpas", "Manteles", "Sobremanteles", "Decoración", "Luz y Sonido", "Varios",
    ...items.map(item => item.category)
  ])).sort();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gestiona mobiliario individual y arma paquetes especiales.
          </p>
        </div>
      </div>

      <Tabs defaultValue="articulos" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <TabsList className="grid w-full sm:w-[500px] grid-cols-3">
            <TabsTrigger value="articulos">Artículos Sueltos</TabsTrigger>
            <TabsTrigger value="paquetes">Paquetes</TabsTrigger>
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
          </TabsList>
        </div>

        {/* -------------------- TAB: ARTICULOS SUELTOS -------------------- */}
        <TabsContent value="articulos" className="space-y-6 m-0">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input type="search" placeholder="Buscar sillas, mesas..." className="pl-10 h-10 rounded-full bg-slate-100 border-transparent focus:bg-white" />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex bg-slate-100 p-1 rounded-lg dark:bg-slate-900">
                <Button variant="ghost" size="sm" className={`px-2 py-1 h-8 ${viewMode === 'grid-large' ? 'bg-white shadow-sm' : 'text-slate-500'}`} onClick={() => setViewMode('grid-large')}><LayoutGrid className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" className={`px-2 py-1 h-8 ${viewMode === 'grid-small' ? 'bg-white shadow-sm' : 'text-slate-500'}`} onClick={() => setViewMode('grid-small')}><LayoutTemplate className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" className={`px-2 py-1 h-8 hidden sm:flex ${viewMode === 'table' ? 'bg-white shadow-sm' : 'text-slate-500'}`} onClick={() => setViewMode('table')}><List className="w-4 h-4" /></Button>
              </div>

              {/* Modal de Nuevo Artículo */}
              <Dialog open={openItemModal} onOpenChange={(val) => { if (!val) resetItemForm(); setOpenItemModal(val); }}>
                <DialogTrigger render={<Button className="gap-2 rounded-full px-5 h-10 shadow-sm" />}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nuevo Artículo</span>
                  <span className="sm:hidden">Nuevo</span>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md w-full h-[100dvh] sm:h-auto sm:rounded-2xl p-0 overflow-hidden flex flex-col">
                  <form onSubmit={handleItemSubmit} className="flex flex-col h-full">
                    <div className="p-6 pb-2 border-b">
                      <DialogTitle className="text-xl">{editingItemId ? 'Editar Artículo' : 'Nuevo Artículo'}</DialogTitle>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nombre del artículo</Label>
                        <Input id="name" placeholder="ej. Silla Tiffany" required className="h-12 text-base rounded-xl" value={itemFormData.name} onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Input 
                          list="category-options"
                          placeholder="Ej. Sillas, Mesas, Manteles..." 
                          className="h-12 text-base rounded-xl bg-slate-50" 
                          value={itemFormData.category} 
                          onChange={(e) => setItemFormData({...itemFormData, category: e.target.value})} 
                        />
                        <datalist id="category-options">
                          {uniqueCategories.map(cat => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Stock Total</Label>
                          <Input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0" required className="h-12 text-base rounded-xl" value={itemFormData.total_quantity} onChange={(e) => setItemFormData({...itemFormData, total_quantity: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Precio ($)</Label>
                          <Input type="text" inputMode="decimal" placeholder="0.00" required className="h-12 text-base rounded-xl" value={itemFormData.price_per_unit} onChange={(e) => setItemFormData({...itemFormData, price_per_unit: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Fotografía</Label>
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors">
                          <Input type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                          {isCompressing && <p className="text-xs text-blue-600 mt-2 flex items-center justify-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Comprimiendo imagen...</p>}
                        </div>
                      </div>
                    </div>
                    <div className="p-6 border-t bg-slate-50 flex gap-3 pb-8 sm:pb-6">
                      <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setOpenItemModal(false)}>Cancelar</Button>
                      <Button type="submit" disabled={isSubmittingItem || isCompressing} className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                        {isSubmittingItem ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        {isSubmittingItem ? 'Guardando...' : (editingItemId ? 'Actualizar' : 'Guardar')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500"><Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" /><p>Cargando inventario...</p></div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Package2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">Sin artículos</h3>
              <p className="text-slate-500 mb-4">Aún no hay mobiliario registrado.</p>
              <Button onClick={() => setOpenItemModal(true)} variant="outline" className="rounded-full">Crear el primero</Button>
            </div>
          ) : (
            <>
              {/* Grid Grande */}
              {viewMode === 'grid-large' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {items.map((item) => (
                    <Card key={item.id} className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl group">
                      <div className="relative aspect-square bg-slate-100">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400"><ImageIcon className="w-12 h-12 mb-2 opacity-50" /><span className="text-sm">Sin foto</span></div>
                        )}
                        <div className="absolute top-3 right-3"><ItemMenu onEdit={() => openEditItemModal(item)} onDelete={() => handleDeleteItem(item.id)} /></div>
                        <div className="absolute top-3 left-3"><span className="bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-bold px-2 py-1 rounded-lg shadow-sm">{item.category}</span></div>
                      </div>
                      <CardContent className="p-5">
                        <h3 className="font-bold text-lg line-clamp-1">{item.name}</h3>
                        <div className="flex justify-between items-center mt-3">
                          <div><p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Stock</p><p className="font-medium text-slate-900">{item.total_quantity} pzas</p></div>
                          <div className="text-right"><p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Precio</p><p className="font-bold text-blue-600">${item.price_per_unit.toFixed(2)}</p></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {/* Grid Pequeño */}
              {viewMode === 'grid-small' && (
                <div className="flex flex-col gap-3">
                  {items.map((item) => (
                    <Card key={item.id} className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl p-3 flex flex-row items-center gap-4">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden relative">
                        {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon className="w-8 h-8 opacity-50" /></div>}
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <p className="text-xs font-semibold text-blue-600 mb-1">{item.category}</p>
                        <h3 className="font-bold text-base sm:text-lg truncate">{item.name}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-sm font-medium text-slate-600">Stock: {item.total_quantity}</p>
                          <p className="text-sm font-bold">${item.price_per_unit.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="pr-1"><ItemMenu onEdit={() => openEditItemModal(item)} onDelete={() => handleDeleteItem(item.id)} /></div>
                    </Card>
                  ))}
                </div>
              )}
              {/* Tabla */}
              {viewMode === 'table' && (
                <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden hidden sm:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Artículo</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Precio</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {item.image_url ? <img src={item.image_url} alt={item.name} className="h-12 w-12 object-cover rounded-xl shadow-sm" /> : <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center"><ImageIcon className="h-5 w-5 text-slate-400" /></div>}
                                <div className="ml-4 font-semibold text-slate-900">{item.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className="px-3 py-1 inline-flex text-xs font-bold rounded-lg bg-blue-50 text-blue-700">{item.category}</span></td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-600">{item.total_quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">${item.price_per_unit.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><ItemMenu onEdit={() => openEditItemModal(item)} onDelete={() => handleDeleteItem(item.id)} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* -------------------- TAB: PAQUETES (KITS) -------------------- */}
        <TabsContent value="paquetes" className="space-y-6 m-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Tus Paquetes Armados</h2>
            
            <Dialog open={openKitModal} onOpenChange={(val) => { if (!val) resetKitForm(); setOpenKitModal(val); }}>
              <DialogTrigger render={<Button className="gap-2 rounded-full px-5 h-10 shadow-sm" />}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Armar Paquete</span>
                <span className="sm:hidden">Armar</span>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl p-0 overflow-hidden flex flex-col">
                <form onSubmit={handleKitSubmit} className="flex flex-col h-full overflow-hidden">
                  <div className="p-6 pb-4 border-b">
                    <DialogTitle className="text-xl">{editingKitId ? 'Editar Paquete' : 'Armar Nuevo Paquete'}</DialogTitle>
                    <DialogDescription className="mt-2">Define el precio especial y qué artículos lo componen.</DialogDescription>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nombre del Paquete</Label>
                        <Input placeholder="ej. Paquete Boda (Mesa Imperial + 12 Sillas)" required className="h-12 text-base rounded-xl bg-white" value={kitFormData.name} onChange={(e) => setKitFormData({...kitFormData, name: e.target.value})} />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Precio del Paquete ($)</Label>
                          <Input type="text" inputMode="decimal" placeholder="0.00" required className="h-12 text-base rounded-xl bg-white font-semibold text-blue-600" value={kitFormData.price} onChange={(e) => setKitFormData({...kitFormData, price: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Descripción (Opcional)</Label>
                          <Input placeholder="Detalles extra..." className="h-12 text-base rounded-xl bg-white" value={kitFormData.description} onChange={(e) => setKitFormData({...kitFormData, description: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-base font-bold">¿Qué incluye este paquete?</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addKitRequirement} className="rounded-full gap-2 text-xs h-8">
                          <Plus className="w-3 h-3" /> Agregar Elemento
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {kitRequirements.map((req, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex-1 space-y-1">
                              <p className="text-xs text-slate-500 font-semibold uppercase">Categoría</p>
                              <Input 
                                list="category-options"
                                placeholder="Escribe..."
                                className="h-10 border-slate-200 bg-slate-50" 
                                value={req.category} 
                                onChange={(e) => updateKitRequirement(index, 'category', e.target.value)} 
                              />
                            </div>
                            
                            <div className="w-24 space-y-1">
                              <p className="text-xs text-slate-500 font-semibold uppercase">Cant.</p>
                              <Input type="number" min="1" required className="h-10 border-0 bg-slate-50" value={req.quantity || ''} onChange={(e) => updateKitRequirement(index, 'quantity', parseInt(e.target.value) || 0)} />
                            </div>

                            <Button type="button" variant="ghost" size="icon" onClick={() => removeKitRequirement(index)} className="mt-5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full" disabled={kitRequirements.length === 1}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t bg-white flex gap-3 pb-8 sm:pb-6">
                    <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setOpenKitModal(false)}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmittingKit} className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                      {isSubmittingKit ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Layers className="w-5 h-5 mr-2" />}
                      {editingKitId ? 'Actualizar Paquete' : 'Guardar Paquete'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500"><Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" /></div>
          ) : kits.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">Sin Paquetes</h3>
              <p className="text-slate-500 mb-4">Aún no has armado ningún paquete (Kits).</p>
              <Button onClick={() => setOpenKitModal(true)} variant="outline" className="rounded-full">Armar el primero</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {kits.map((kit) => (
                <Card key={kit.id} className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl flex flex-col">
                  <div className="bg-gradient-to-br from-blue-50 to-slate-100 p-5 flex justify-between items-start border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-xl text-slate-900">{kit.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{kit.description}</p>
                    </div>
                    <ItemMenu onEdit={() => openEditKitModal(kit)} onDelete={() => handleDeleteKit(kit.id)} />
                  </div>
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Incluye</p>
                    <ul className="space-y-2 mb-6 flex-1">
                      {kit.kit_requirements.map((req, i) => (
                        <li key={i} className="flex items-center text-sm text-slate-700">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs mr-3">{req.quantity}</span>
                          {req.category}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-4 border-t border-slate-100 mt-auto flex justify-between items-end">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Precio Especial</span>
                      <span className="text-2xl font-black text-blue-600">${kit.price.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* -------------------- TAB: CATEGORIAS -------------------- */}
        <TabsContent value="categorias" className="space-y-6 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uniqueCategories.map(cat => {
              const catItems = items.filter(i => i.category === cat);
              return (
                <Card key={cat} className="border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{cat}</h3>
                      <p className="text-sm text-slate-500">{catItems.length} artículos</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => {
                        setSelectedCategory(cat);
                        setNewCategoryName(cat);
                        setOpenCategoryEditModal(true);
                      }}>
                        Editar
                      </Button>
                      <Button variant="destructive" size="icon-sm" className="w-9 h-9 rounded-full" onClick={() => {
                        setSelectedCategory(cat);
                        setReassignCategoryName(uniqueCategories.find(c => c !== cat) || '');
                        setOpenCategoryDeleteModal(true);
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Dialog open={openCategoryEditModal} onOpenChange={setOpenCategoryEditModal}>
            <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
              <DialogTitle>Renombrar Categoría</DialogTitle>
              <DialogDescription>
                Esto actualizará automáticamente la categoría de todos los artículos que pertenecen a "{selectedCategory}".
              </DialogDescription>
              <form onSubmit={handleRenameCategory} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nuevo Nombre</Label>
                  <Input required className="h-12 rounded-xl" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setOpenCategoryEditModal(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmittingItem} className="flex-1 h-12 rounded-xl bg-blue-600 text-white">
                    {isSubmittingItem ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null} Guardar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={openCategoryDeleteModal} onOpenChange={setOpenCategoryDeleteModal}>
            <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
              <DialogTitle className="text-red-600">Eliminar Categoría</DialogTitle>
              <DialogDescription>
                Estás a punto de eliminar la categoría "{selectedCategory}". Selecciona a qué categoría se moverán los artículos huérfanos.
              </DialogDescription>
              <form onSubmit={handleDeleteCategory} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Reasignar a</Label>
                  <Select value={reassignCategoryName} onValueChange={setReassignCategoryName}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Selecciona categoría destino" /></SelectTrigger>
                    <SelectContent>
                      {uniqueCategories.filter(c => c !== selectedCategory).map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setOpenCategoryDeleteModal(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmittingItem || !reassignCategoryName} className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white">
                    {isSubmittingItem ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null} Eliminar y Reasignar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Menú de acciones simplificado
function ItemMenu({ onEdit, onDelete }: { onEdit: () => void, onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="h-8 w-8 rounded-full bg-white/50 backdrop-blur-md shadow-sm border border-slate-200/50 hover:bg-white text-slate-600" />}>
        <MoreVertical className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-xl">
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer gap-2 py-2"><Pencil className="w-4 h-4 text-slate-500" /> Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="cursor-pointer gap-2 py-2 text-red-600 focus:bg-red-50"><Trash2 className="w-4 h-4" /> Eliminar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
