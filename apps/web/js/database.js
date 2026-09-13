// =============================================================================
// CivicResolve Database Service - Live Supabase REST & Realtime Integration
// =============================================================================

class SupabaseService {
    constructor() {
        const config = window.CIVIC_CONFIG || {};
        this.supabaseUrl = config.supabaseUrl || 'https://qxiivlfecbklwtnfsnjg.supabase.co';
        this.supabaseKey = config.supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4aWl2bGZlY2JrbHd0bmZzbmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Njk0OTIsImV4cCI6MjEwNDU0NTQ5Mn0.gZXjrzaMiYl_6JyozMfCbnjirQGerkliVEKC_xVCTbA';
        
        this.headers = {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
        
        // Cache configuration
        this.cache = new Map();
        this.cacheTimeout = 30 * 1000; // 30 seconds cache for list views
        this.requestQueue = new Map();
        
        // Initialize Supabase JS Client for Realtime if available
        this.supabaseClient = null;
        this.realtimeChannel = null;
        this.initSupabaseClient();
        
        console.log('🏛️ CivicResolve Database Service initialized (Live Supabase REST + Realtime)');
    }

    initSupabaseClient() {
        try {
            if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
                this.supabaseClient = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
                console.log('📡 Supabase Realtime client ready');
            } else {
                console.log('ℹ️ Supabase JS CDN not loaded yet, REST direct mode active');
            }
        } catch (e) {
            console.warn('⚠️ Supabase JS client init notice:', e.message);
        }
    }

    // =========================================================================
    // Realtime Subscriptions (INSERT & UPDATE on public.reports)
    // =========================================================================

    initRealtimeSubscription(onInsert, onUpdate) {
        if (!this.supabaseClient) {
            this.initSupabaseClient();
        }

        if (!this.supabaseClient) {
            console.warn('⚠️ Cannot init Realtime: Supabase JS client not available');
            return null;
        }

        try {
            if (this.realtimeChannel) {
                this.supabaseClient.removeChannel(this.realtimeChannel);
            }

            console.log('📡 Subscribing to live Realtime events on public:reports...');
            this.realtimeChannel = this.supabaseClient
                .channel('municipal-dashboard-reports')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'reports' },
                    (payload) => {
                        console.log('🔴 Realtime INSERT received:', payload.new);
                        this.invalidateReportsCache();
                        
                        // Dispatch custom window event
                        window.dispatchEvent(new CustomEvent('civicresolve:report-inserted', { detail: payload.new }));
                        
                        if (typeof onInsert === 'function') {
                            onInsert(payload.new);
                        }
                        this.showToast('info', `🚨 New Complaint #${payload.new.id}: ${payload.new.title || 'Submitted'}`);
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'reports' },
                    (payload) => {
                        console.log('🔵 Realtime UPDATE received:', payload.new);
                        this.invalidateReportsCache();
                        
                        // Dispatch custom window event
                        window.dispatchEvent(new CustomEvent('civicresolve:report-updated', { detail: payload.new }));
                        
                        if (typeof onUpdate === 'function') {
                            onUpdate(payload.new);
                        }
                    }
                )
                .subscribe((status, err) => {
                    console.log('📡 Realtime subscription status:', status);
                    if (err) {
                        console.warn('⚠️ Realtime subscription notice:', err);
                    }
                });

            return this.realtimeChannel;
        } catch (error) {
            console.warn('⚠️ Realtime subscription exception:', error.message);
            return null;
        }
    }

    // =========================================================================
    // Cache Management
    // =========================================================================

    getCacheKey(endpoint, options) {
        return `${endpoint}_${JSON.stringify(options || {})}`;
    }

    isCacheValid(timestamp) {
        return Date.now() - timestamp < this.cacheTimeout;
    }

    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && this.isCacheValid(cached.timestamp)) {
            return cached.data;
        }
        if (cached) {
            this.cache.delete(key);
        }
        return null;
    }

    setCachedData(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    clearCache(pattern = null) {
        if (pattern) {
            for (const [key] of this.cache) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    invalidateReportsCache() {
        this.clearCache('reports');
    }

    // =========================================================================
    // Core REST Fetch Engine
    // =========================================================================

    async fetchData(endpoint, options = {}) {
        const cacheKey = this.getCacheKey(endpoint, options);
        
        // Return cached GET responses if valid
        if (!options.method || options.method === 'GET') {
            const cachedData = this.getCachedData(cacheKey);
            if (cachedData) {
                return cachedData;
            }
        }

        const fetchOptions = {
            method: options.method || 'GET',
            headers: {
                ...this.headers,
                ...(options.headers || {})
            },
            body: options.body || null,
            signal: options.signal || null
        };

        const response = await fetch(`${this.supabaseUrl}/rest/v1/${endpoint}`, fetchOptions);
        
        if (response.ok) {
            // Some endpoints return empty body on 204 No Content
            if (response.status === 204) return null;
            const text = await response.text();
            const data = text ? JSON.parse(text) : [];
            
            if (!options.method || options.method === 'GET') {
                this.setCachedData(cacheKey, data);
            }
            return data;
        } else {
            let errorDetails = '';
            try {
                const errJson = await response.json();
                errorDetails = JSON.stringify(errJson);
            } catch (e) {
                errorDetails = await response.text();
            }
            throw new Error(`Supabase REST Error [${response.status} ${response.statusText}]: ${errorDetails}`);
        }
    }

    // =========================================================================
    // Coordinate & Data Safety Validation
    // =========================================================================

    validateCoordinates(lat, lng) {
        if (lat === null || lat === undefined || lng === null || lng === undefined) {
            return null;
        }
        const parsedLat = typeof lat === 'number' ? lat : parseFloat(lat);
        const parsedLng = typeof lng === 'number' ? lng : parseFloat(lng);
        
        if (isNaN(parsedLat) || isNaN(parsedLng) || !isFinite(parsedLat) || !isFinite(parsedLng)) {
            return null;
        }
        // Latitude: -90 to 90, Longitude: -180 to 180
        if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
            return null;
        }
        return { lat: parsedLat, lng: parsedLng };
    }

    sanitizeReport(report) {
        if (!report) return report;
        
        // Validate coordinates
        let lat = report.latitude;
        let lng = report.longitude;
        if ((lat === undefined || lng === undefined) && report.coordinates) {
            lat = report.coordinates.lat || report.coordinates.latitude;
            lng = report.coordinates.lng || report.coordinates.longitude;
        }
        const validatedCoords = this.validateCoordinates(lat, lng);
        if (validatedCoords) {
            report.latitude = validatedCoords.lat;
            report.longitude = validatedCoords.lng;
        } else {
            report.latitude = null;
            report.longitude = null;
        }

        return report;
    }

    // =========================================================================
    // Live Reports Query Methods (Real Supabase public.reports)
    // =========================================================================

    async getAllReports(filters = {}) {
        try {
            console.log('🔍 Loading live reports from public.reports with filters:', filters);
            
            let query = 'reports?select=*&order=created_at.desc';
            const filterParams = [];
            
            // Status filter
            if (filters.status && filters.status !== 'all') {
                filterParams.push(`status=eq.${encodeURIComponent(filters.status)}`);
            }
            
            // Category filter
            if (filters.category && filters.category !== 'all') {
                filterParams.push(`category=eq.${encodeURIComponent(filters.category)}`);
            }
            
            // Priority filter
            if (filters.priority && filters.priority !== 'all') {
                filterParams.push(`priority=eq.${encodeURIComponent(filters.priority)}`);
            }
            
            // Search filter
            if (filters.search && filters.search.trim()) {
                const term = encodeURIComponent(filters.search.trim());
                filterParams.push(`or=(title.ilike.*${term}*,description.ilike.*${term}*,location.ilike.*${term}*)`);
            }
            
            // Pagination
            const limit = Math.min(filters.limit || 50, 200);
            const offset = filters.offset || 0;
            filterParams.push(`limit=${limit}`);
            if (offset > 0) {
                filterParams.push(`offset=${offset}`);
            }
            
            if (filterParams.length > 0) {
                query += '&' + filterParams.join('&');
            }
            
            const rawReports = await this.fetchData(query);
            const sanitizedReports = (rawReports || []).map(r => this.sanitizeReport(r));
            console.log(`✅ Loaded ${sanitizedReports.length} live database reports`);
            return sanitizedReports;
            
        } catch (error) {
            console.error('❌ Failed to fetch live reports from Supabase:', error.message);
            throw error;
        }
    }

    async getReportsCount(filters = {}) {
        try {
            let query = 'reports?select=id';
            const filterParams = [];
            
            if (filters.status && filters.status !== 'all') {
                filterParams.push(`status=eq.${encodeURIComponent(filters.status)}`);
            }
            if (filters.category && filters.category !== 'all') {
                filterParams.push(`category=eq.${encodeURIComponent(filters.category)}`);
            }
            if (filters.priority && filters.priority !== 'all') {
                filterParams.push(`priority=eq.${encodeURIComponent(filters.priority)}`);
            }
            if (filters.search && filters.search.trim()) {
                const term = encodeURIComponent(filters.search.trim());
                filterParams.push(`or=(title.ilike.*${term}*,description.ilike.*${term}*,location.ilike.*${term}*)`);
            }
            
            if (filterParams.length > 0) {
                query += '&' + filterParams.join('&');
            }
            
            const result = await this.fetchData(query, {
                headers: { 'Prefer': 'count=exact' }
            });
            return Array.isArray(result) ? result.length : 0;
        } catch (error) {
            console.warn('⚠️ Could not fetch reports count from database:', error.message);
            return 0;
        }
    }

    async getRecentReports(limit = 10) {
        try {
            const reports = await this.fetchData(`reports?select=*&order=created_at.desc&limit=${limit}`);
            return (reports || []).map(r => this.sanitizeReport(r));
        } catch (error) {
            console.error('❌ Error loading recent reports from Supabase:', error.message);
            throw error;
        }
    }

    async getReportById(reportId) {
        try {
            const reports = await this.fetchData(`reports?id=eq.${reportId}&select=*`);
            if (reports && reports.length > 0) {
                return this.sanitizeReport(reports[0]);
            }
            return null;
        } catch (error) {
            console.error(`❌ Error fetching report #${reportId}:`, error.message);
            throw error;
        }
    }

    // =========================================================================
    // Dashboard Real Statistics (Derived Directly From Real Database)
    // =========================================================================

    async getDashboardStats() {
        try {
            console.log('📊 Calculating real dashboard statistics from Supabase...');
            
            // Fetch all reports to aggregate stats truthfully
            const reports = await this.fetchData('reports?select=id,status,priority,created_at');
            
            const stats = {
                total: reports.length,
                submitted: 0,
                under_review: 0,
                review: 0,
                assigned: 0,
                in_progress: 0,
                progress: 0,
                resolved: 0,
                verified: 0,
                closed: 0,
                urgent: 0,
                today: 0,
                this_week: 0
            };
            
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            reports.forEach(report => {
                const status = (report.status || 'submitted').toLowerCase();
                const priority = (report.priority || 'medium').toLowerCase();
                const createdAt = report.created_at ? new Date(report.created_at) : null;
                
                // Status counts
                if (status === 'submitted') stats.submitted++;
                else if (status === 'under_review' || status === 'review') {
                    stats.under_review++;
                    stats.review++;
                } else if (status === 'assigned') stats.assigned++;
                else if (status === 'in_progress' || status === 'progress') {
                    stats.in_progress++;
                    stats.progress++;
                } else if (status === 'resolved' || status === 'resolution_submitted') stats.resolved++;
                else if (status === 'verified') stats.verified++;
                else if (status === 'closed') stats.closed++;
                
                // Priority counts
                if (priority === 'critical' || priority === 'high') {
                    stats.urgent++;
                }
                
                // Temporal counts
                if (createdAt) {
                    if (createdAt >= startOfToday) stats.today++;
                    if (createdAt >= sevenDaysAgo) stats.this_week++;
                }
            });
            
            console.log('✅ Real dashboard stats computed:', stats);
            return stats;
        } catch (error) {
            console.error('❌ Failed to calculate dashboard stats from database:', error.message);
            throw error;
        }
    }

    // =========================================================================
    // Report Updates & State Machine Lifecycle
    // =========================================================================

    getStatusWorkflow() {
        return {
            'submitted': { label: 'Submitted', nextStates: ['under_review', 'review', 'assigned'], step: 1 },
            'under_review': { label: 'Under Review', nextStates: ['assigned', 'in_progress'], step: 2 },
            'review': { label: 'Under Review', nextStates: ['assigned', 'in_progress'], step: 2 },
            'assigned': { label: 'Assigned', nextStates: ['in_progress', 'progress', 'resolved'], step: 3 },
            'in_progress': { label: 'In Progress', nextStates: ['resolution_submitted', 'resolved', 'verified'], step: 4 },
            'progress': { label: 'In Progress', nextStates: ['resolution_submitted', 'resolved', 'verified'], step: 4 },
            'resolution_submitted': { label: 'Resolution Submitted', nextStates: ['verified', 'closed'], step: 5 },
            'resolved': { label: 'Resolved', nextStates: ['verified', 'closed'], step: 5 },
            'verified': { label: 'Verified', nextStates: ['closed'], step: 6 },
            'closed': { label: 'Closed', nextStates: [], step: 7 }
        };
    }

    getAllValidStatuses() {
        return ['submitted', 'under_review', 'assigned', 'in_progress', 'resolution_submitted', 'verified', 'closed'];
    }

    async updateReport(reportId, updateData) {
        try {
            console.log(`📝 Sending PATCH update to report #${reportId}:`, updateData);
            
            const payload = {
                ...updateData,
                updated_at: new Date().toISOString()
            };
            
            const result = await this.fetchData(`reports?id=eq.${reportId}`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
            
            this.invalidateReportsCache();
            return result && result.length > 0 ? result[0] : payload;
        } catch (error) {
            console.error(`❌ Failed to update report #${reportId}:`, error.message);
            throw error;
        }
    }

    async updateReportStatus(reportId, newStatus, options = {}) {
        try {
            const normalizedStatus = (newStatus || '').toLowerCase().trim();
            const valid = [...this.getAllValidStatuses(), 'review', 'progress', 'resolved'];
            
            if (!valid.includes(normalizedStatus)) {
                throw new Error(`Invalid status "${newStatus}". Allowed: ${this.getAllValidStatuses().join(', ')}`);
            }
            
            const payload = {
                status: normalizedStatus,
                updated_at: new Date().toISOString()
            };
            
            if (options.resolutionNotes) payload.resolution_notes = options.resolutionNotes;
            if (options.resolutionImageUrl) payload.resolution_image_url = options.resolutionImageUrl;
            if (options.assignedTo) payload.assigned_to = options.assignedTo;
            if (options.adminNotes) payload.admin_notes = options.adminNotes;
            
            const updated = await this.updateReport(reportId, payload);
            
            // Record status history entry if table is available
            this.recordStatusHistory(reportId, normalizedStatus, options.adminNotes || options.resolutionNotes || 'Status updated via command dashboard')
                .catch(err => console.log('ℹ️ Status history logging notice:', err.message));
            
            this.showToast('success', `✅ Report #${reportId} status updated to ${normalizedStatus.toUpperCase()}`);
            return updated;
        } catch (error) {
            this.showToast('error', `❌ Failed to update status: ${error.message}`);
            throw error;
        }
    }

    async recordStatusHistory(reportId, status, notes = '') {
        try {
            const entry = {
                report_id: parseInt(reportId),
                status: status,
                notes: notes,
                created_at: new Date().toISOString()
            };
            await this.fetchData('report_status_history', {
                method: 'POST',
                body: JSON.stringify(entry)
            });
        } catch (e) {
            // Non-blocking: table might not exist in some project states
            console.log('ℹ️ Status history entry notice:', e.message);
        }
    }

    async getReportStatusHistory(reportId) {
        try {
            const history = await this.fetchData(`report_status_history?report_id=eq.${reportId}&order=created_at.asc`);
            return history || [];
        } catch (error) {
            console.warn(`⚠️ Could not fetch status history for #${reportId}:`, error.message);
            return [];
        }
    }

    // =========================================================================
    // Categories & Analytics Queries
    // =========================================================================

    async getCategories() {
        try {
            const reports = await this.fetchData('reports?select=category');
            const unique = [...new Set((reports || []).map(r => r.category).filter(Boolean))];
            
            if (unique.length > 0) {
                return unique.map(cat => ({
                    name: cat.toLowerCase().replace(/\s+/g, '_'),
                    display_name: cat
                }));
            }
            return this.getDefaultCategories();
        } catch (error) {
            console.warn('⚠️ Could not load dynamic categories, using standard list:', error.message);
            return this.getDefaultCategories();
        }
    }

    getDefaultCategories() {
        return [
            { name: 'roads', display_name: 'Roads & Potholes' },
            { name: 'waste', display_name: 'Garbage & Sanitation' },
            { name: 'water', display_name: 'Water Supply & Drainage' },
            { name: 'streetlights', display_name: 'Street Lighting' },
            { name: 'public_safety', display_name: 'Public Safety & Hazards' },
            { name: 'other', display_name: 'Other Issues' }
        ];
    }

    async getReportsOverTime(days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const reports = await this.fetchData(`reports?select=created_at&created_at=gte.${startDate.toISOString()}&order=created_at.asc`);
            
            const dateGroups = {};
            (reports || []).forEach(r => {
                if (r.created_at) {
                    const d = new Date(r.created_at).toISOString().split('T')[0];
                    dateGroups[d] = (dateGroups[d] || 0) + 1;
                }
            });
            
            const result = [];
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                result.push({
                    date: dateStr,
                    count: dateGroups[dateStr] || 0
                });
            }
            return result;
        } catch (error) {
            console.warn('⚠️ Could not load reports over time:', error.message);
            return [];
        }
    }

    async getCategoryBreakdown() {
        try {
            const reports = await this.fetchData('reports?select=category');
            const counts = {};
            (reports || []).forEach(r => {
                const cat = r.category || 'Other';
                counts[cat] = (counts[cat] || 0) + 1;
            });
            
            return Object.keys(counts).map(cat => ({
                category: cat,
                count: counts[cat],
                label: cat
            }));
        } catch (error) {
            console.warn('⚠️ Could not load category breakdown:', error.message);
            return [];
        }
    }

    // =========================================================================
    // Connection Testing & Diagnostics
    // =========================================================================

    async testConnection() {
        try {
            console.log(`🔍 Testing Supabase connection to: ${this.supabaseUrl}...`);
            const startTime = performance.now();
            const result = await this.fetchData('reports?select=id&limit=1');
            const duration = performance.now() - startTime;
            
            return {
                success: true,
                message: `✅ Supabase connection verified (${duration.toFixed(0)}ms)`,
                recordsFound: Array.isArray(result) ? result.length : 0
            };
        } catch (error) {
            console.error('❌ Supabase connection test failed:', error.message);
            return {
                success: false,
                error: error.message,
                message: `❌ Supabase connection error: ${error.message}`
            };
        }
    }

    // =========================================================================
    // UI Feedback Helpers
    // =========================================================================

    showToast(type, message) {
        if (typeof document === 'undefined') return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: #ffffff;
            padding: 12px 18px;
            border-radius: 8px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.25);
            font-size: 13.5px;
            font-weight: 500;
            z-index: 99999;
            transition: opacity 0.3s ease, transform 0.3s ease;
            transform: translateY(10px);
            opacity: 0;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        });
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
}

// Global Singleton Instance
window.supabaseService = new SupabaseService();
console.log('✅ CivicResolve Supabase Service ready for live connectivity');