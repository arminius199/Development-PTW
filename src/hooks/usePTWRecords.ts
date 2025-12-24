// hooks/usePTWRecords.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PTWRecord } from '../types/database.types';
import toast from 'react-hot-toast';

interface UsePTWRecordsOptions {
  filters?: Record<string, any>;
  page?: number;
  pageSize?: number;
  enableRealtime?: boolean;
}

export const usePTWRecords = (options: UsePTWRecordsOptions = {}) => {
  const [records, setRecords] = useState<PTWRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const realtimeSubscribed = useRef(false);
  const abortController = useRef<AbortController | null>(null);

  const fetchRecords = useCallback(async () => {
    // Cancel previous request if it exists
    if (abortController.current) {
      abortController.current.abort();
    }

    // Create new abort controller
    abortController.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('ptw_records')
        .select('*', { count: 'exact' });

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (key === 'dateRange' && typeof value === 'object') {
              if (value.from) {
                query = query.gte('day', value.from);
              }
              if (value.to) {
                query = query.lte('day', value.to);
              }
            } else if (Array.isArray(value) && value.length > 0) {
              query = query.in(key, value);
            } else if (typeof value === 'string') {
              if (key === 'search') {
                query = query.or(
                  `description.ilike.%${value}%,` +
                  `number.ilike.%${value}%,` +
                  `company.ilike.%${value}%,` +
                  `location.ilike.%${value}%,` +
                  `owner.ilike.%${value}%`
                );
              } else {
                query = query.ilike(key, `%${value}%`);
              }
            } else {
              query = query.eq(key, value);
            }
          }
        });
      }

      // Apply pagination
      if (options.page && options.pageSize) {
        const from = (options.page - 1) * options.pageSize;
        const to = from + options.pageSize - 1;
        query = query.range(from, to);
      }

      // Apply sorting
      query = query.order('created_at', { ascending: false });

      const { data, error: queryError, count } = await query;

      if (queryError) throw queryError;

      setRecords(data || []);
      setTotalCount(count || 0);
      
      return { data, count };
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        toast.error('Failed to fetch records');
      }
      return { data: null, count: 0 };
    } finally {
      setLoading(false);
    }
  }, [options.filters, options.page, options.pageSize]);

  // Setup real-time subscriptions
  const setupRealtime = useCallback(() => {
    if (realtimeSubscribed.current || !options.enableRealtime) return;

    const channel = supabase
      .channel('ptw-records-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ptw_records'
        },
        (payload) => {
          setRecords(prev => {
            const exists = prev.some(record => record.id === payload.new.id);
            if (!exists) {
              return [payload.new as PTWRecord, ...prev];
            }
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ptw_records'
        },
        (payload) => {
          setRecords(prev =>
            prev.map(record =>
              record.id === payload.new.id
                ? { ...record, ...payload.new }
                : record
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'ptw_records'
        },
        (payload) => {
          setRecords(prev =>
            prev.filter(record => record.id !== payload.old.id)
          );
        }
      )
      .subscribe((status) => {
        realtimeSubscribed.current = status === 'SUBSCRIBED';
      });

    return channel;
  }, [options.enableRealtime]);

  const refetch = useCallback(async () => {
    console.log('Manual refetch triggered');
    
    setRecords([]);
    setLoading(true);
    
    const result = await fetchRecords();
    
    if (!result.data || result.data.length === 0) {
      toast.info('No records found');
    }
    
    return result;
  }, [fetchRecords]);

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ptw_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Record deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete record');
      throw err;
    }
  };

  const updateRecord = async (id: string, updates: Partial<PTWRecord>) => {
    try {
      const { error } = await supabase
        .from('ptw_records')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Record updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update record');
      throw err;
    }
  };

  const addRecord = async (record: Omit<PTWRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('ptw_records')
        .insert([record])
        .select()
        .single();

      if (error) throw error;

      toast.success('Record added successfully');
      return data;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add record');
      throw err;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Setup real-time subscriptions
  useEffect(() => {
    let channel: any;
    
    if (options.enableRealtime) {
      channel = setupRealtime();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        realtimeSubscribed.current = false;
      }
      
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [options.enableRealtime, setupRealtime]);

  // Listen for custom events from UploadExcel
  useEffect(() => {
    const handleRecordsUpdated = () => {
      console.log('Custom event: Records updated');
      refetch();
    };

    window.addEventListener('ptw-records-updated', handleRecordsUpdated);
    
    return () => {
      window.removeEventListener('ptw-records-updated', handleRecordsUpdated);
    };
  }, [refetch]);

  return {
    records,
    loading,
    error,
    totalCount,
    refetch,
    deleteRecord,
    updateRecord,
    addRecord,
  };
};

// Event dispatcher
export const dispatchPTWUpdate = () => {
  window.dispatchEvent(new Event('ptw-records-updated'));
};