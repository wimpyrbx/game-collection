import { useState } from 'react';
import type { Mini } from '../types/mini';
import type { MiniatureData } from '../services/miniatureService';
import { createMiniature, updateMiniature, deleteMiniature, updateMiniatureInUse, getMiniature } from '../services/miniatureService';

export function useOptimisticMinis() {
  const [minis, setMinis] = useState<Mini[]>([]);
  const [totalMinis, setTotalMinis] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);

  const optimisticallyUpdateMinis = (updatedMini: Mini) => {
    setMinis(prevMinis => {
      const index = prevMinis.findIndex(m => m.id === updatedMini.id);
      if (index === -1) return prevMinis;
      const newMinis = [...prevMinis];
      newMinis[index] = updatedMini;
      return newMinis;
    });
  };

  const optimisticallyAddMini = (newMini: Mini) => {
    setMinis(prevMinis => {
      // Insert the new mini in the correct alphabetical position
      const index = prevMinis.findIndex(m => m.name.toLowerCase() > newMini.name.toLowerCase());
      const newMinis = [...prevMinis];
      if (index === -1) {
        newMinis.push(newMini);
      } else {
        newMinis.splice(index, 0, newMini);
      }
      return newMinis;
    });
    setTotalMinis(prev => prev + 1);
    setTotalQuantity(prev => prev + (newMini.quantity || 0));
  };

  const optimisticallyDeleteMini = (miniId: number, quantity: number) => {
    setMinis(prevMinis => prevMinis.filter(m => m.id !== miniId));
    setTotalMinis(prev => prev - 1);
    setTotalQuantity(prev => prev - quantity);
  };

  const optimisticallyUpdateInUse = (miniId: number, inUse: boolean) => {
    setMinis(prevMinis => {
      const index = prevMinis.findIndex(m => m.id === miniId);
      if (index === -1) return prevMinis;
      const newMinis = [...prevMinis];
      newMinis[index] = {
        ...newMinis[index],
        in_use: inUse ? new Date().toISOString() : null
      };
      return newMinis;
    });
  };

  const handleAdd = async (miniatureData: Partial<Mini>) => {
    const tempId = -Date.now(); // Temporary negative ID
    const tempMini: Mini = {
      ...miniatureData as Mini,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      in_use: null
    };

    try {
      // Optimistically update UI
      optimisticallyAddMini(tempMini);

      // Transform data to match MiniatureData type
      const transformedData: Partial<MiniatureData> = {
        name: miniatureData.name,
        description: miniatureData.description,
        location: miniatureData.location,
        quantity: miniatureData.quantity,
        painted_by_id: miniatureData.painted_by_id,
        base_size_id: miniatureData.base_size_id,
        product_set_id: miniatureData.product_set_id,
        material_id: miniatureData.material_id,
        types: miniatureData.types?.map(t => ({
          type_id: t.type_id,
          proxy_type: t.proxy_type
        })),
        tags: miniatureData.tags?.map(t => ({
          id: t.tag.id,
          name: t.tag.name
        }))
      };

      // Perform actual API call
      const newMini = await createMiniature(transformedData);

      // Update with real data
      if (newMini) {
        const realMini = await getMiniature(newMini.id);
        if (realMini) {
          optimisticallyUpdateMinis(realMini);
        }
      }

      return newMini;
    } catch (error) {
      // Revert optimistic update on error
      optimisticallyDeleteMini(tempId, tempMini.quantity || 0);
      throw error;
    }
  };

  const handleEdit = async (miniId: number, miniatureData: Partial<Mini>) => {
    const currentMini = minis.find(m => m.id === miniId);
    if (!currentMini) throw new Error('Mini not found');

    try {
      // Create optimistic update
      const optimisticMini: Mini = {
        ...currentMini,
        ...miniatureData as Partial<Mini>,
        updated_at: new Date().toISOString()
      };

      // Optimistically update UI
      optimisticallyUpdateMinis(optimisticMini);

      // Transform data to match MiniatureData type
      const transformedData: Partial<MiniatureData> = {
        name: miniatureData.name,
        description: miniatureData.description,
        location: miniatureData.location,
        quantity: miniatureData.quantity,
        painted_by_id: miniatureData.painted_by_id,
        base_size_id: miniatureData.base_size_id,
        product_set_id: miniatureData.product_set_id,
        material_id: miniatureData.material_id,
        types: miniatureData.types?.map(t => ({
          type_id: t.type_id,
          proxy_type: t.proxy_type
        })),
        tags: miniatureData.tags?.map(t => ({
          id: t.tag.id,
          name: t.tag.name
        }))
      };

      // Perform actual API call
      await updateMiniature(miniId, transformedData);

      // Fetch real data to ensure consistency
      const updatedMini = await getMiniature(miniId);
      if (updatedMini) {
        optimisticallyUpdateMinis(updatedMini);
      }
    } catch (error) {
      // Revert optimistic update on error
      optimisticallyUpdateMinis(currentMini);
      throw error;
    }
  };

  const handleDelete = async (miniId: number) => {
    const miniToDelete = minis.find(m => m.id === miniId);
    if (!miniToDelete) throw new Error('Mini not found');

    try {
      // Optimistically update UI
      optimisticallyDeleteMini(miniId, miniToDelete.quantity || 0);

      // Perform actual API call
      await deleteMiniature(miniId);
    } catch (error) {
      // Revert optimistic update on error
      optimisticallyAddMini(miniToDelete);
      throw error;
    }
  };

  const handleUpdateInUse = async (miniId: number, inUse: boolean) => {
    try {
      // Optimistically update UI
      optimisticallyUpdateInUse(miniId, inUse);

      // Perform actual API call
      await updateMiniatureInUse(miniId, inUse);
    } catch (error) {
      // Revert optimistic update on error
      optimisticallyUpdateInUse(miniId, !inUse);
      throw error;
    }
  };

  return {
    minis,
    setMinis,
    totalMinis,
    setTotalMinis,
    totalQuantity,
    setTotalQuantity,
    handleAdd,
    handleEdit,
    handleDelete,
    handleUpdateInUse,
    optimisticallyUpdateMinis,
    optimisticallyAddMini,
    optimisticallyDeleteMini,
    optimisticallyUpdateInUse
  };
} 