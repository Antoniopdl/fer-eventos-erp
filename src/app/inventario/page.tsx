"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, Image as ImageIcon, Loader2, MoreVertical, LayoutGrid, List, LayoutTemplate, Pencil, Trash2, Package2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Tipo de dato para el inventario
type InventoryItem = {
  id: string;
  name: string;
  total_quantity: number;
  price_per_unit: number;
  category: string;
  image_url: string | null;
};

export default function InventarioPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid-large' | 'grid-small' | 'table'>('grid-large');
  
  // Estado del formulario
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Sillas',
    total_quantity: '',
    price_per_unit: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Cargar inventario al iniciar
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching inventory:', error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', category: 'Sillas', total_quantity: '', price_per_unit: '' });
    setImageFile(null);
    setEditingId(null);
  };

  const openEditModal = (item: InventoryItem) => {
    setFormData({
      name: item.name,
      category: item.category,
      total_quantity: item.total_quantity.toString(),
      price_per_unit: item.price_per_unit.toString(),
    });
    setImageFile(null);
    setEditingId(item.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este artículo?')) return;
    
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw error;
      fetchInventory();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Hubo un error al eliminar el artículo.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let imageUrl = null;

      // 1. Subir imagen si existe
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('inventory-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('inventory-images')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrlData.publicUrl;
      }

      const itemData = {
        name: formData.name,
        category: formData.category,
        total_quantity: parseInt(formData.total_quantity),
        price_per_unit: parseFloat(formData.price_per_unit),
      };

      if (imageUrl) {
        Object.assign(itemData, { image_url: imageUrl });
      }

      if (editingId) {
        // Actualizar existente
        const { error: dbError } = await supabase
          .from('inventory')
          .update(itemData)
          .eq('id', editingId);
        if (dbError) throw dbError;
      } else {
        // Crear nuevo
        const { error: dbError } = await supabase
          .from('inventory')
          .insert([itemData]);
        if (dbError) throw dbError;
      }

      // Éxito: limpiar formulario, cerrar modal y recargar
      resetForm();
      setOpen(false);
      fetchInventory();

    } catch (error) {
      console.error('Error saving item:', error);
      alert('Hubo un error al guardar el artículo. Revisa la consola.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gestiona el mobiliario y artículos disponibles.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Buscar sillas, mesas..."
              className="pl-10 h-10 rounded-full bg-slate-100 border-transparent focus:bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* View Toggles */}
            <div className="flex bg-slate-100 p-1 rounded-lg dark:bg-slate-900">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`px-2 py-1 h-8 ${viewMode === 'grid-large' ? 'bg-white shadow-sm dark:bg-slate-800' : 'text-slate-500'}`}
                onClick={() => setViewMode('grid-large')}
                title="Imagen Grande"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`px-2 py-1 h-8 ${viewMode === 'grid-small' ? 'bg-white shadow-sm dark:bg-slate-800' : 'text-slate-500'}`}
                onClick={() => setViewMode('grid-small')}
                title="Imagen Pequeña"
              >
                <LayoutTemplate className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`px-2 py-1 h-8 hidden sm:flex ${viewMode === 'table' ? 'bg-white shadow-sm dark:bg-slate-800' : 'text-slate-500'}`}
                onClick={() => setViewMode('table')}
                title="Tabla"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal de Nuevo Artículo (Responsive) */}
            <Dialog open={open} onOpenChange={(val) => {
              if (!val) resetForm();
              setOpen(val);
            }}>
              <DialogTrigger render={<Button className="gap-2 rounded-full px-5 h-10 shadow-sm" />}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo Artículo</span>
                <span className="sm:hidden">Nuevo</span>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md w-full h-[100dvh] sm:h-auto sm:rounded-2xl p-0 overflow-hidden flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                  <div className="p-6 pb-2 border-b">
                    <DialogTitle className="text-xl">{editingId ? 'Editar Artículo' : 'Nuevo Artículo'}</DialogTitle>
                    <DialogDescription className="mt-2">
                      Detalles del mobiliario para rentas.
                    </DialogDescription>
                  </div>
                  
                  {/* Contenedor scrolleable en móvil */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-600 font-medium">Nombre del artículo</Label>
                      <Input 
                        id="name" 
                        placeholder="ej. Silla Tiffany Blanca" 
                        required 
                        className="h-12 text-base rounded-xl"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-slate-600 font-medium">Categoría</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(val) => setFormData({...formData, category: val || ''})}
                      >
                        <SelectTrigger className="h-12 text-base rounded-xl">
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sillas">Sillas</SelectItem>
                          <SelectItem value="Mesas">Mesas</SelectItem>
                          <SelectItem value="Carpas">Carpas</SelectItem>
                          <SelectItem value="Mantelería">Mantelería</SelectItem>
                          <SelectItem value="Decoración">Decoración</SelectItem>
                          <SelectItem value="Varios">Varios</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-slate-600 font-medium">Stock Total</Label>
                        <Input 
                          id="quantity" 
                          type="text" 
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="0" 
                          required 
                          className="h-12 text-base rounded-xl"
                          value={formData.total_quantity}
                          onChange={(e) => setFormData({...formData, total_quantity: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-slate-600 font-medium">Precio ($)</Label>
                        <Input 
                          id="price" 
                          type="text" 
                          inputMode="decimal"
                          placeholder="0.00" 
                          required 
                          className="h-12 text-base rounded-xl"
                          value={formData.price_per_unit}
                          onChange={(e) => setFormData({...formData, price_per_unit: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="image" className="text-slate-600 font-medium">Fotografía</Label>
                      <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors">
                        <Input 
                          id="image" 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageChange}
                          className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {!imageFile && <p className="text-xs text-slate-500 mt-2">Toca para abrir la galería</p>}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t bg-slate-50 dark:bg-slate-900/50 flex gap-3 pb-8 sm:pb-6">
                    <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                      {isSubmitting ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
          <p>Cargando inventario...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200 dark:bg-slate-900/20 dark:border-slate-800">
          <Package2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Sin artículos</h3>
          <p className="text-slate-500 mb-4">Aún no hay mobiliario registrado.</p>
          <Button onClick={() => setOpen(true)} variant="outline" className="rounded-full">Crear el primero</Button>
        </div>
      ) : (
        <>
          {/* Vista: Tarjetas con Imagen Grande */}
          {viewMode === 'grid-large' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl group">
                  <div className="relative aspect-square bg-slate-100 dark:bg-slate-900">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                        <span className="text-sm">Sin foto</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <ItemMenu item={item} onEdit={() => openEditModal(item)} onDelete={() => handleDelete(item.id)} />
                    </div>
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 line-clamp-1">{item.name}</h3>
                    <div className="flex justify-between items-center mt-3">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Stock</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{item.total_quantity} pzas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Precio</p>
                        <p className="font-bold text-blue-600 dark:text-blue-400">${item.price_per_unit.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Vista: Tarjetas con Imagen Pequeña (Lista Compacta) */}
          {viewMode === 'grid-small' && (
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl p-3 flex items-center gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-100 dark:bg-slate-900 flex-shrink-0 overflow-hidden relative">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-8 h-8 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <p className="text-xs font-semibold text-blue-600 mb-1">{item.category}</p>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 truncate">{item.name}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Stock: {item.total_quantity}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">${item.price_per_unit.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="pr-1">
                    <ItemMenu item={item} onEdit={() => openEditModal(item)} onDelete={() => handleDelete(item.id)} />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Vista: Tabla (Solo visible en pantallas grandes si se selecciona) */}
          {viewMode === 'table' && (
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl overflow-hidden hidden sm:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Artículo</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Precio</th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-900">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="h-12 w-12 object-cover rounded-xl shadow-sm" />
                            ) : (
                              <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-slate-400" />
                              </div>
                            )}
                            <div className="ml-4 font-semibold text-slate-900 dark:text-slate-100">
                              {item.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs font-bold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-600">
                          {item.total_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                          ${item.price_per_unit.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <ItemMenu item={item} onEdit={() => openEditModal(item)} onDelete={() => handleDelete(item.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// Componente auxiliar para el menú de opciones de cada ítem
function ItemMenu({ item, onEdit, onDelete }: { item: InventoryItem, onEdit: () => void, onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="ghost" size="icon-sm" className="h-8 w-8 rounded-full bg-white/50 backdrop-blur-md shadow-sm border border-slate-200/50 hover:bg-white dark:bg-slate-900/50 dark:border-slate-700 dark:hover:bg-slate-800" />
      }>
        <MoreVertical className="w-4 h-4 text-slate-700 dark:text-slate-300" />
        <span className="sr-only">Abrir menú</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-xl">
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer gap-2 py-2">
          <Pencil className="w-4 h-4 text-slate-500" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="cursor-pointer gap-2 py-2 text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950">
          <Trash2 className="w-4 h-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
