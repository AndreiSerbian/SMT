/**
 * DesignService: Supabase CRUD for the designs table
 */

import { supabase } from '../utils/supabase.js';

export const DesignService = {
  async create(designData) {
    const { data, error } = await supabase
      .from('designs')
      .insert(designData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('designs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async get(id) {
    const { data, error } = await supabase
      .from('designs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getByProductId(productId) {
    const { data, error } = await supabase
      .from('designs')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'saved')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data?.[0] || null;
  },
};
