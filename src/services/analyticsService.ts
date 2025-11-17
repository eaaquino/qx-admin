import { supabaseClient } from "../utility";

export interface AnalyticsFilters {
  doctor_id?: string | null;
  clinic_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  metrics?: string[];
}

export interface AnalyticsData {
  avg_consultation_time?: number;
  avg_waiting_time?: number;
  total_patients?: number;
  cancelled_count?: number;
  no_show_count?: number;
  avg_rating?: number;
  rating_count?: number;
  rating_distribution?: Array<{ rating: number; count: number }>;
  demographics?: {
    age?: Array<{ age_group: string; patient_count: number }>;
    sex?: Array<{ sex: string; patient_count: number }>;
    reason?: Array<{ reason: string; patient_count: number }>;
  };
  peak_hours?: Array<{ hour: number; session_count: number }>;
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
  filters: {
    doctor_id?: string | null;
    clinic_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  };
}

export interface CampaignAnalyticsResponse {
  success: boolean;
  data: {
    campaign_id: string;
    campaign_name: string;
    impressions: number;
    clicks: number;
    redeems: number;
    bounces: number;
    ctr: number;
    redemption_rate: number;
    bounce_rate: number;
  };
  filters: {
    start_date?: string | null;
    end_date?: string | null;
  };
}

/**
 * Date range preset helper
 */
export function getDateRange(preset: string): { start_date: string | null; end_date: string | null } {
  const now = new Date();

  switch (preset) {
    case 'today': {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      return {
        start_date: startOfDay.toISOString(),
        end_date: endOfDay.toISOString()
      };
    }

    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      return {
        start_date: yesterday.toISOString(),
        end_date: endOfYesterday.toISOString()
      };
    }

    case '7days': {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return {
        start_date: sevenDaysAgo.toISOString(),
        end_date: new Date().toISOString()
      };
    }

    case '1month': {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      oneMonthAgo.setHours(0, 0, 0, 0);
      return {
        start_date: oneMonthAgo.toISOString(),
        end_date: new Date().toISOString()
      };
    }

    case '1year': {
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      oneYearAgo.setHours(0, 0, 0, 0);
      return {
        start_date: oneYearAgo.toISOString(),
        end_date: new Date().toISOString()
      };
    }

    case 'lifetime':
      return {
        start_date: null,
        end_date: null
      };

    default:
      return { start_date: null, end_date: null };
  }
}

/**
 * Analytics Service
 */
export const analyticsService = {
  /**
   * Get general analytics data
   */
  async getAnalytics(filters: AnalyticsFilters = {}): Promise<AnalyticsResponse> {
    const { data, error } = await supabaseClient.functions.invoke('get-analytics', {
      body: filters
    });

    if (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(
    campaignId: string,
    dateRange?: { start_date?: string; end_date?: string }
  ): Promise<CampaignAnalyticsResponse> {
    const { data, error } = await supabaseClient.functions.invoke('get-campaign-analytics', {
      body: {
        campaign_id: campaignId,
        ...dateRange
      }
    });

    if (error) {
      console.error('Error fetching campaign analytics:', error);
      throw error;
    }

    return data;
  }
};
