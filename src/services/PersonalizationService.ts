import { supabase } from '../lib/supabase';
import { RolePageContent, RoleAlert, UserRole } from '../types';

export const PersonalizationService = {
  /**
   * Fetches role-specific soundbites for a given page and role.
   */
  async getPageSoundbites(roleId: UserRole, pageId: string): Promise<RolePageContent[]> {
    try {
      const { data, error } = await supabase
        .from('role_page_content')
        .select('*')
        .eq('role_id', roleId)
        .eq('page_id', pageId);

      if (error) throw error;
      return data as RolePageContent[];
    } catch (error) {
      console.error('Error fetching page soundbites:', error);
      return [];
    }
  },

  /**
   * Fetches active alerts for a user in their current role context.
   */
  async getActiveAlerts(userId: string, roleId: UserRole): Promise<RoleAlert[]> {
    try {
      const { data, error } = await supabase
        .from('role_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('is_resolved', false)
        .order('priority', { ascending: true });

      if (error) throw error;
      return data as RoleAlert[];
    } catch (error) {
      console.error('Error fetching active alerts:', error);
      return [];
    }
  },

  /**
   * Marks an alert as resolved.
   */
  async resolveAlert(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('role_alerts')
        .update({ is_resolved: true })
        .eq('id', alertId);

      if (error) throw error;
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  }
};
