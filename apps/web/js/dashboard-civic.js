// CivicResolve Dashboard Main Controller
class CivicResolveDashboard {
    constructor() {
        this.currentPage = 1;
        this.reportsPerPage = 20;
        this.currentFilters = {};
        this.reports = [];
        this.categories = [];
        this.charts = {};
        this.autoRefreshInterval = null;
        
        this.init();
    }

    async init() {
        console.log('⚡ Initializing CivicResolve Dashboard with live Supabase data...');
        
        // Initialize components synchronously
        this.setupEventListeners();
        this.setupNavigation();
        this.setupLogout();
        
        // Show default section immediately
        this.showSection('overview');
        
        // Setup Realtime subscriptions
        this.initRealtime();
        
        // Load live data from Supabase
        this.loadRealDashboardData();
        
        // Do auth check in background
        setTimeout(() => this.checkAuth(), 50);
        
        console.log('✅ Dashboard initialized with live Supabase connectivity');
    }

    initRealtime() {
        if (window.supabaseService) {
            window.supabaseService.initRealtimeSubscription(
                (newReport) => this.handleRealtimeInsert(newReport),
                (updatedReport) => this.handleRealtimeUpdate(updatedReport)
            );
        }
    }

    handleRealtimeInsert(newReport) {
        if (!newReport) return;
        console.log('🔴 Dashboard handling live INSERT:', newReport);
        if (!this.allReports) this.allReports = [];
        const exists = this.allReports.some(r => String(r.id) === String(newReport.id));
        if (!exists) {
            this.allReports.unshift(newReport);
        }
        this.renderCommandCenter(this.allReports);
    }

    handleRealtimeUpdate(updatedReport) {
        if (!updatedReport) return;
        console.log('🔵 Dashboard handling live UPDATE:', updatedReport);
        if (!this.allReports) this.allReports = [];
        const index = this.allReports.findIndex(r => String(r.id) === String(updatedReport.id));
        if (index !== -1) {
            this.allReports[index] = { ...this.allReports[index], ...updatedReport };
        } else {
            this.allReports.unshift(updatedReport);
        }
        this.renderCommandCenter(this.allReports);
    }

    showReportDetails(reportId) {
        this.openReportModal(reportId);
    }

    checkAuth() {
        const session = localStorage.getItem('civicResolveSession');
        if (!session) {
            window.location.href = 'index.html';
            return;
        }
        
        const sessionData = JSON.parse(session);
        if (!sessionData.isLoggedIn) {
            window.location.href = 'index.html';
            return;
        }
        
        // Update welcome message
        const welcomeElement = document.getElementById('welcome-message');
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome, ${sessionData.username}!`;
        }
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refresh-data')?.addEventListener('click', () => {
            this.refreshDashboard();
        });

        // Search and filters
        document.getElementById('search-reports')?.addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value;
            this.debouncedLoadReports();
        });

        document.getElementById('filter-status')?.addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.loadReports();
        });

        document.getElementById('filter-category')?.addEventListener('change', (e) => {
            this.currentFilters.category = e.target.value;
            this.loadReports();
        });

        document.getElementById('filter-priority')?.addEventListener('change', (e) => {
            this.currentFilters.priority = e.target.value;
            this.loadReports();
        });

        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Pagination
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadReports();
            }
        });

        document.getElementById('next-page')?.addEventListener('click', () => {
            this.currentPage++;
            this.loadReports();
        });

        // Database test
        document.getElementById('test-db-connection')?.addEventListener('click', () => {
            this.testDatabaseConnection();
        });

        // Modal close
        document.querySelector('.close-modal')?.addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside modal to close
        document.getElementById('report-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'report-modal') {
                this.closeModal();
            }
        });
    }

    setupNavigation() {
        // Handle internal section navigation for dashboard sections only
        const navLinks = document.querySelectorAll('.nav-link');
        console.log('Setting up navigation for', navLinks.length, 'links');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                const section = link.getAttribute('data-section');
                
                console.log('Navigation click:', { href, section });
                
                // Handle only internal dashboard sections (like overview)
                if (section && section !== 'settings') {
                    e.preventDefault();
                    this.showSection(section);
                    
                    // Update active navigation
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    
                    console.log('Switched to section:', section);
                }
                // For external links (reports.html, settings.html, etc.), allow default navigation
            });
        });
    }
    
    showSection(sectionId) {
        console.log('Showing section:', sectionId);
        
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            console.log('Section activated:', sectionId);
        } else {
            console.error('Section not found:', sectionId);
        }
    }

    setupLogout() {
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('civicResolveSession');
                window.location.href = 'index.html';
            }
        });
    }

    setupAutoRefresh() {
        const autoRefreshCheckbox = document.getElementById('auto-refresh');
        if (autoRefreshCheckbox && autoRefreshCheckbox.checked) {
            this.autoRefreshInterval = setInterval(() => {
                this.refreshDashboard(false); // Silent refresh
            }, 30000); // 30 seconds
        }

        autoRefreshCheckbox?.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.setupAutoRefresh();
            } else {
                if (this.autoRefreshInterval) {
                    clearInterval(this.autoRefreshInterval);
                    this.autoRefreshInterval = null;
                }
            }
        });
    }

    debouncedLoadReports = this.debounce(() => {
        this.loadReports();
    }, 500);

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async loadInitialData() {
        try {
            console.log('🚀 Loading dashboard initial data...');
            
            // Test database connection first (always succeeds in demo mode)
            const connected = await window.supabaseService.testConnection();
            
            console.log('✅ Connection test completed, proceeding with data loading');

            // Initialize dashboard state
            this.currentPage = 1;
            this.currentFilters = {};
            this.totalPages = 1;
            this.totalReports = 0;

            // Load categories for filters
            try {
                await this.loadCategories();
                console.log('✅ Categories loaded successfully');
            } catch (error) {
                console.warn('⚠️ Categories loading failed, using defaults:', error);
                this.categories = [
                    { name: 'roads', display_name: 'Roads & Infrastructure' },
                    { name: 'lighting', display_name: 'Street Lighting' },
                    { name: 'cleanliness', display_name: 'Cleanliness & Sanitation' },
                    { name: 'water_supply', display_name: 'Water Supply' },
                    { name: 'other', display_name: 'Other Issues' }
                ];
            }
            
            // Load sample data immediately for instant UI, then load real data in background
            this.loadSampleDataFallback();
            
            // Load real data in parallel background requests
            Promise.allSettled([
                this.loadCategoriesOptimized(),
                this.loadDashboardDataOptimized()
            ]).then(results => {
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        console.warn(`⚠️ Background data load ${index} failed:`, result.reason);
                    }
                });
            });
            
            console.log('⚡ Dashboard loaded with instant sample data, real data loading in background');

            this.updateLastRefreshTime();
            console.log('🎉 Dashboard initial data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            
            // Show user-friendly error
            this.showError('Failed to load some data. Please check your connection.');
            
            // Ensure we still have basic functionality
            this.currentPage = 1;
            this.currentFilters = {};
            
            // Show error and stop
            this.showError('Dashboard initialization failed. Please refresh the page.');
        }
    }

    async loadCategories() {
        try {
            this.categories = await window.supabaseService.getCategories();
            this.populateCategoryFilter();
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadCategoriesOptimized() {
        try {
            // Ultra-fast timeout for categories - 200ms max
            const timeout = new AbortController();
            setTimeout(() => timeout.abort(), 200);
            
            this.categories = await window.supabaseService.getCategories();
            this.populateCategoryFilter();
            console.log('✅ Categories loaded successfully');
        } catch (error) {
            console.warn('⚠️ Categories loading failed, keeping defaults:', error);
            // Keep existing default categories
        }
    }

    async loadDashboardDataOptimized() {
        console.log('⚡ Loading dashboard data with ultra-fast priority');
        try {
            // Load with ultra-fast timeout - maximum 300ms
            await this.loadDashboardDataUltraFast();
        } catch (error) {
            console.warn('⚠️ Ultra-fast data loading failed, keeping instant data:', error);
        }
    }

    loadSampleDataFallback() {
        console.log('🔄 Loading dynamic sample data for instant display...');
        try {
            // Generate dynamic sample stats (no hardcoded values)
            const sampleStats = window.databaseService.generateSampleStats();
            this.updateStatsDisplay(sampleStats);
            
            // Show sample recent reports
            const sampleReports = this.generateSampleReports(10);
            this.displayRecentReports(sampleReports);
            
            // Load sample charts immediately
            this.loadSampleCharts();
            
            // Update notification count
            this.updateNotificationCount(sampleStats.submitted + sampleStats.urgent);
            
            console.log('✅ Sample data loaded instantly');
        } catch (error) {
            console.error('❌ Even sample data failed:', error);
        }
    }

    loadInstantData() {
        console.log('⚡ Loading dashboard with real data only...');
        
        // Initialize dashboard state immediately
        this.currentPage = 1;
        this.currentFilters = {};
        this.totalPages = 1;
        this.totalReports = 0;
        
        // Set default categories immediately (these are configuration, not data)
        this.categories = [
            { name: 'roads', display_name: 'Roads & Infrastructure' },
            { name: 'lighting', display_name: 'Street Lighting' },
            { name: 'cleanliness', display_name: 'Cleanliness & Sanitation' },
            { name: 'water_supply', display_name: 'Water Supply' },
            { name: 'other', display_name: 'Other Issues' }
        ];
        this.populateCategoryFilter();
        
        // Show loading state instead of hardcoded data
        this.showLoadingState();
        
        // Set up auto-refresh in background
        setTimeout(() => this.setupAutoRefresh(), 100);
        
        // Update timestamp
        this.updateLastRefreshTime();
        
        console.log('✅ Dashboard initialized, loading real data...');
        
        // Load real data immediately (no delay)
        this.loadRealDataBackground();
    }

    showLoadingState() {
        // Show loading indicators instead of fake data
        this.showStatsLoading();
        this.showReportsLoading();
        this.showChartsLoading();
    }

    showStatsLoading() {
        // Initialize stats display with loading state
        const loadingStats = {
            total: '...',
            submitted: '...',
            review: '...',
            assigned: '...',
            progress: '...',
            resolved: '...',
            urgent: '...'
        };
        this.updateStatsDisplay(loadingStats);
        this.updateNotificationCount(0);
    }

    showReportsLoading() {
        const reportsContainer = document.querySelector('#recent-reports-list');
        if (reportsContainer) {
            reportsContainer.innerHTML = `
                <div class="loading-item" style="padding: 20px; text-align: center; color: #666;">
                    <div>📋 Loading recent reports...</div>
                </div>
            `;
        }
    }

    showChartsLoading() {
        // Show loading message for charts instead of empty charts
        const reportsChartContainer = document.getElementById('reportsChart')?.parentElement;
        const categoryChartContainer = document.getElementById('categoryChart')?.parentElement;
        
        if (reportsChartContainer) {
            reportsChartContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: #666;">
                    📈 Loading reports chart...
                </div>
            `;
        }
        
        if (categoryChartContainer) {
            categoryChartContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: #666;">
                    🍩 Loading category chart...
                </div>
            `;
        }
    }

    loadRealDataBackground() {
        console.log('🔄 Loading real data to replace loading indicators...');
        
        // Load real data with very short timeouts, but don't block UI
        Promise.allSettled([
            this.loadCategoriesOptimized(),
            this.loadRealDashboardData()
        ]).then(results => {
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    console.log(`✅ Real data ${index} loaded successfully - updating display`);
                } else {
                    console.log(`⚠️ Real data ${index} failed, showing fallback data`);
                }
            });
        });
    }

    async loadRealDashboardData() {
        try {
            console.log('📊 Loading real dashboard data from Supabase...');
            
            // Load real reports
            let reports = [];
            try {
                reports = await window.supabaseService.getAllReports({ limit: 100 });
            } catch (err) {
                console.warn('⚠️ Reports loading notice:', err.message);
            }

            // Load real statistics
            let stats = null;
            try {
                stats = await window.supabaseService.getDashboardStats();
            } catch (err) {
                console.warn('⚠️ Stats loading notice:', err.message);
            }

            if (stats) {
                this.updateStatsDisplay(stats);
            }

            if (reports && reports.length > 0) {
                this.allReports = reports;
                this.renderCommandCenter(reports);
            } else if (reports && reports.length === 0) {
                this.allReports = [];
                const feedContainer = document.getElementById('incident-feed-list');
                if (feedContainer) {
                    feedContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">📭 No complaints currently in database.</div>';
                }
            } else {
                const feedContainer = document.getElementById('incident-feed-list');
                if (feedContainer) {
                    feedContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">⚠️ Live Supabase connection active. Waiting for database table or data.</div>';
                }
            }

        } catch (error) {
            console.warn('⚠️ Real data loading notice:', error);
        }
    }

    showDataUpdateIndicator() {
        // Add a subtle loading indicator
        const indicator = document.createElement('div');
        indicator.id = 'data-update-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #3498db;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
            z-index: 1000;
            opacity: 0.8;
        `;
        indicator.textContent = 'Loading real data...';
        document.body.appendChild(indicator);
    }

    showDataUpdatedIndicator(message) {
        const indicator = document.getElementById('data-update-indicator');
        if (indicator) {
            indicator.style.background = '#27ae60';
            indicator.textContent = message;
            setTimeout(() => this.hideDataUpdateIndicator(), 2000);
        }
    }

    hideDataUpdateIndicator() {
        const indicator = document.getElementById('data-update-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    async loadRealCharts() {
        try {
            console.log('📈 Loading real charts data...');
            
            // Wait for Chart.js to be available
            await this.waitForChartJS();
            
            // First, restore the chart containers
            this.restoreChartContainers();
            
            // Load real reports over time
            const reportsOverTime = await window.supabaseService.getReportsOverTime(30);
            if (reportsOverTime && reportsOverTime.length > 0) {
                console.log('✅ Real reports over time data loaded');
                this.createReportsChart(reportsOverTime);
            } else {
                console.log('📈 No real reports over time data, using generated sample');
                this.createReportsChart(this.generateSampleReportsOverTime());
            }

            // Load real category breakdown
            const categoryBreakdown = await window.supabaseService.getCategoryBreakdown();
            if (categoryBreakdown && categoryBreakdown.length > 0) {
                console.log('✅ Real category breakdown data loaded');
                this.createCategoryChart(categoryBreakdown);
            } else {
                console.log('🍩 No real category data, using generated sample');
                this.createCategoryChart(this.generateSampleCategoryBreakdown());
            }

        } catch (error) {
            console.warn('⚠️ Real charts loading failed, using generated sample data:', error);
            await this.waitForChartJS();
            this.restoreChartContainers();
            this.createReportsChart(this.generateSampleReportsOverTime());
            this.createCategoryChart(this.generateSampleCategoryBreakdown());
        }
    }

    async waitForChartJS() {
        return new Promise((resolve) => {
            if (typeof Chart !== 'undefined') {
                resolve();
                return;
            }
            
            const checkChart = () => {
                if (typeof Chart !== 'undefined') {
                    console.log('✅ Chart.js loaded and ready');
                    resolve();
                } else {
                    setTimeout(checkChart, 100);
                }
            };
            
            checkChart();
        });
    }

    restoreChartContainers() {
        // Restore the proper chart canvas elements
        const reportsChartContainer = document.querySelector('#reportsChart')?.parentElement || document.querySelector('.analytics-card:first-child');
        const categoryChartContainer = document.querySelector('#categoryChart')?.parentElement || document.querySelector('.analytics-card:last-child');
        
        if (reportsChartContainer && !document.getElementById('reportsChart')) {
            reportsChartContainer.innerHTML = '<canvas id="reportsChart"></canvas>';
        }
        
        if (categoryChartContainer && !document.getElementById('categoryChart')) {
            categoryChartContainer.innerHTML = '<canvas id="categoryChart"></canvas>';
        }
    }

    populateCategoryFilter() {
        const categorySelect = document.getElementById('filter-category');
        if (categorySelect) {
            // Clear existing options except "All Categories"
            categorySelect.innerHTML = '<option value="">All Categories</option>';
            
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.display_name || category.name;
                categorySelect.appendChild(option);
            });
        }
    }

    async refreshDashboard(showLoading = true) {
        console.log('♻️ Dashboard refresh starting...');
        
        if (showLoading) {
            this.showLoading('⚡ Refreshing dashboard...');
        }
        
        try {
            // Clear all caches for fresh data
            if (window.supabaseService) {
                window.supabaseService.clearCache();
            }
            
            // Refresh dashboard overview data
            await this.loadDashboardData();
            
            this.updateLastRefreshTime();
            
            console.log('✅ Dashboard refresh completed');
            
            // Show success notification
            if (window.supabaseService) {
                window.supabaseService.showToast('success', '⚡ Dashboard refreshed successfully!');
            }
            
        } catch (error) {
            console.error('❌ Dashboard refresh failed:', error);
            
            if (window.supabaseService) {
                window.supabaseService.showToast('error', '❌ Refresh failed. Please try again.');
            }
        } finally {
            if (showLoading) {
                this.hideLoading();
            }
        }
    }

    async loadDashboardData() {
        console.log('Loading dashboard data...');
        
        try {
            // Load only dashboard overview data since other sections are separate pages
            await this.loadDashboardOverview();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            window.supabaseService.showToast('error', 'Failed to load dashboard data');
        }
    }

    async loadDashboardDataFast() {
        console.log('⚡ Loading dashboard data with fast timeout...');
        
        try {
            // Fast timeout for all operations - 1 second max
            const timeout = new AbortController();
            setTimeout(() => timeout.abort(), 1000);

            // Load only essential data
            await this.loadDashboardOverviewFast();
        } catch (error) {
            console.warn('⚠️ Fast dashboard data loading failed:', error);
        }
    }

    async loadDashboardDataUltraFast() {
        console.log('⚡ Loading dashboard data with ultra-fast 300ms timeout...');
        
        try {
            // Ultra-fast timeout - 300ms max
            const timeout = new AbortController();
            setTimeout(() => timeout.abort(), 300);

            // Try to get real data with ultra-fast timeout
            const statsPromise = window.supabaseService.getDashboardStats();
            const reportsPromise = window.supabaseService.getRecentReports(5); // Reduced count for speed

            // Race against timeout
            const racePromise = Promise.race([
                Promise.allSettled([statsPromise, reportsPromise]),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Ultra-fast timeout')), 300))
            ]);

            const results = await racePromise;
            
            if (Array.isArray(results)) {
                if (results[0].status === 'fulfilled') {
                    this.updateStatsDisplay(results[0].value);
                    this.updateNotificationCount(results[0].value.submitted + results[0].value.urgent);
                }

                if (results[1].status === 'fulfilled') {
                    this.displayRecentReports(results[1].value);
                }
            }

        } catch (error) {
            console.log('⚠️ Ultra-fast loading timeout, keeping instant data');
        }
    }

    async loadDashboardOverviewFast() {
        try {
            // Load statistics with timeout
            const statsPromise = window.supabaseService.getDashboardStats();
            const reportsPromise = window.supabaseService.getRecentReports(10);
            
            // Wait for both with race condition - whichever comes first
            const [stats, recentReports] = await Promise.allSettled([statsPromise, reportsPromise]);

            if (stats.status === 'fulfilled') {
                this.updateStatsDisplay(stats.value);
                this.updateNotificationCount(stats.value.submitted + stats.value.urgent);
            }

            if (recentReports.status === 'fulfilled') {
                this.displayRecentReports(recentReports.value);
            }

            // Load charts in background (non-blocking)
            setTimeout(() => this.loadDashboardChartsFast(), 100);

        } catch (error) {
            console.error('Error in fast dashboard overview loading:', error);
        }
    }

    showSectionLoading(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            // Add loading indicator to section if it doesn't have content
            const existingContent = section.querySelector('.section-content');
            if (!existingContent) {
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'section-loading';
                loadingDiv.innerHTML = '<div class="loading">Loading ' + sectionId + '...</div>';
                section.appendChild(loadingDiv);
            }
        }
    }

    showSectionError(sectionId, message) {
        const section = document.getElementById(sectionId);
        if (section) {
            const loadingDiv = section.querySelector('.section-loading');
            if (loadingDiv) {
                loadingDiv.innerHTML = `<div class="loading error">Error loading ${sectionId}: ${message}</div>`;
            }
        }
    }

    async loadDashboardOverview() {
        try {
            // Load statistics
            const stats = await window.supabaseService.getDashboardStats();
            this.updateStatsDisplay(stats);

            // Load recent reports
            const recentReports = await window.supabaseService.getRecentReports(10);
            this.displayRecentReports(recentReports);

            // Load charts
            await this.loadDashboardCharts();

            // Update notification count
            this.updateNotificationCount(stats.submitted + stats.urgent);

        } catch (error) {
            console.error('Error loading dashboard overview:', error);
            this.showError('Failed to load dashboard overview.');
        }
    }

    updateStatsDisplay(stats) {
        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-pending').textContent = stats.submitted + stats.under_review;
        document.getElementById('stat-progress').textContent = stats.in_progress;
        document.getElementById('stat-resolved').textContent = stats.resolved;
        document.getElementById('stat-urgent').textContent = stats.urgent;
        document.getElementById('stat-today').textContent = stats.today;

        // Update change indicators
        document.getElementById('stat-total-change').textContent = `+${stats.this_week} this week`;
        document.getElementById('stat-pending-change').textContent = 'Needs attention';
        document.getElementById('stat-progress-change').textContent = 'Active cases';
        document.getElementById('stat-resolved-change').textContent = 'Completed';
        document.getElementById('stat-urgent-change').textContent = 'High priority';
        document.getElementById('stat-today-change').textContent = 'New reports';
    }

    displayRecentReports(reports) {
        if (this.renderCommandCenter && reports) {
            this.renderCommandCenter(reports);
        }

        const container = document.getElementById('recent-reports-list');
        if (!container) return;

        if (reports.length === 0) {
            container.innerHTML = '<div class="loading">No recent reports found.</div>';
            return;
        }

        container.innerHTML = reports.map(report => `
            <div class="recent-item" onclick="dashboard.openReportModal(${report.id})">
                <div class="recent-info">
                    <h4>${this.truncateText(report.title, 50)}</h4>
                    <p>${this.truncateText(report.description, 80)}</p>
                    <p><strong>Location:</strong> ${this.truncateText(report.location, 40)}</p>
                </div>
                <div class="recent-meta">
                    ${this.renderStatusBadge(report.status)}
                    <br>
                    <span class="priority-badge priority-${report.priority}">${report.priority}</span>
                    <br>
                    <small>${this.formatDate(report.created_at)}</small>
                </div>
            </div>
        `).join('');
    }

    async loadDashboardCharts() {
        try {
            console.log('📊 Loading dashboard charts...');
            
            // Load reports over time chart
            const reportsOverTime = await window.supabaseService.getReportsOverTime(30);
            if (reportsOverTime && reportsOverTime.length > 0) {
                this.createReportsChart(reportsOverTime);
            } else {
                console.warn('⚠️ No reports over time data available');
            }

            // Load category breakdown chart
            const categoryBreakdown = await window.supabaseService.getCategoryBreakdown();
            if (categoryBreakdown && categoryBreakdown.length > 0) {
                this.createCategoryChart(categoryBreakdown);
            } else {
                console.warn('⚠️ No category breakdown data available');
            }

            console.log('✅ Dashboard charts loaded successfully');

        } catch (error) {
            console.error('❌ Error loading charts:', error);
            
            // Show user-friendly error message
            if (window.supabaseService && window.supabaseService.showToast) {
                window.supabaseService.showToast('error', '❌ Failed to load charts, using sample data');
            }
            
            // Try to load with sample data as fallback
            try {
                console.log('🔄 Attempting to load with sample data...');
                const sampleReportsOverTime = window.supabaseService.generateSampleReportsOverTime(30);
                const sampleCategoryBreakdown = window.supabaseService.generateSampleCategoryBreakdown();
                
                this.createReportsChart(sampleReportsOverTime);
                this.createCategoryChart(sampleCategoryBreakdown);
                
                console.log('✅ Charts loaded with sample data');
            } catch (fallbackError) {
                console.error('❌ Even sample data failed:', fallbackError);
            }
        }
    }

    async loadDashboardChartsFast() {
        try {
            console.log('⚡ Loading dashboard charts with fast timeout...');
            
            // Fast timeout - 800ms for charts
            const timeout = new AbortController();
            setTimeout(() => timeout.abort(), 800);

            const promises = [
                window.supabaseService.getReportsOverTime(30),
                window.supabaseService.getCategoryBreakdown()
            ];

            const results = await Promise.allSettled(promises);
            
            if (results[0].status === 'fulfilled' && results[0].value?.length > 0) {
                this.createReportsChart(results[0].value);
            } else {
                this.createReportsChart(this.generateSampleReportsOverTime());
            }

            if (results[1].status === 'fulfilled' && results[1].value?.length > 0) {
                this.createCategoryChart(results[1].value);
            } else {
                this.createCategoryChart(this.generateSampleCategoryBreakdown());
            }

            console.log('✅ Fast dashboard charts loaded');

        } catch (error) {
            console.warn('⚠️ Fast chart loading failed, using samples:', error);
            this.loadSampleCharts();
        }
    }

    loadSampleCharts() {
        try {
            console.log('⚡ Loading sample charts instantly...');
            const sampleReportsOverTime = this.generateSampleReportsOverTime();
            const sampleCategoryBreakdown = this.generateSampleCategoryBreakdown();
            
            this.createReportsChart(sampleReportsOverTime);
            this.createCategoryChart(sampleCategoryBreakdown);
            
            console.log('✅ Sample charts loaded instantly');
        } catch (error) {
            console.error('❌ Sample chart loading failed:', error);
        }
    }

    generateSampleReports(count = 10) {
        const statuses = ['submitted', 'review', 'assigned', 'progress', 'resolved'];
        const priorities = ['high', 'medium', 'low'];
        const categories = ['roads', 'lighting', 'cleanliness', 'water_supply', 'other'];
        const locations = ['Sector 1', 'Sector 2', 'Sector 3', 'Downtown', 'Park Area'];
        
        const reports = [];
        for (let i = 0; i < count; i++) {
            reports.push({
                id: 1000 + i,
                title: `Sample Report ${i + 1}`,
                category: categories[Math.floor(Math.random() * categories.length)],
                status: statuses[Math.floor(Math.random() * statuses.length)],
                priority: priorities[Math.floor(Math.random() * priorities.length)],
                location: locations[Math.floor(Math.random() * locations.length)],
                created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString()
            });
        }
        return reports;
    }

    generateSampleReportsOverTime() {
        const data = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            data.push({
                date: date.toISOString().split('T')[0],
                count: Math.floor(Math.random() * 10) + 1
            });
        }
        return data;
    }

    generateSampleCategoryBreakdown() {
        return [
            { category: 'Roads & Infrastructure', count: 45 },
            { category: 'Street Lighting', count: 32 },
            { category: 'Cleanliness & Sanitation', count: 28 },
            { category: 'Water Supply', count: 22 },
            { category: 'Other Issues', count: 29 }
        ];
    }

    createReportsChart(data) {
        console.log('📊 Creating reports over time chart with data:', data);
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js not available yet, showing loading message');
            const container = document.querySelector('#reportsChart')?.parentElement;
            if (container) {
                container.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: #666;">
                        📈 Loading Chart.js library...
                    </div>
                `;
            }
            return;
        }
        
        const ctx = document.getElementById('reportsChart');
        if (!ctx) {
            console.error('❌ reportsChart canvas not found');
            return;
        }

        if (this.charts.reports) {
            this.charts.reports.destroy();
        }

        // Ensure data is an array
        if (!Array.isArray(data)) {
            console.error('❌ Reports chart data is not an array:', data);
            return;
        }

        try {
            this.charts.reports = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => this.formatDateShort(item.date)),
                datasets: [{
                    label: 'Reports Submitted',
                    data: data.map(item => item.count),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#6c757d'
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#6c757d'
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#2c3e50'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff'
                    }
                }
                }
            });
            console.log('✅ Reports over time chart created successfully');
            
        } catch (error) {
            console.error('❌ Error creating reports chart:', error);
            const container = document.querySelector('#reportsChart')?.parentElement;
            if (container) {
                container.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: #dc3545;">
                        ❌ Chart loading failed
                    </div>
                `;
            }
        }
    }

    createCategoryChart(data) {
        console.log('🥧 Creating category breakdown chart with data:', data);
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js not available yet, showing loading message');
            const container = document.querySelector('#categoryChart')?.parentElement;
            if (container) {
                container.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: #666;">
                        🍩 Loading Chart.js library...
                    </div>
                `;
            }
            return;
        }
        
        const ctx = document.getElementById('categoryChart');
        if (!ctx) {
            console.error('❌ categoryChart canvas not found');
            return;
        }

        if (this.charts.category) {
            this.charts.category.destroy();
        }

        // Ensure data is an array
        if (!Array.isArray(data)) {
            console.error('❌ Category chart data is not an array:', data);
            return;
        }

        try {
            const colors = [
                '#667eea', '#764ba2', '#f093fb', '#f5576c', 
                '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
            ];

            this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.label || item.category),
                datasets: [{
                    data: data.map(item => item.count),
                    backgroundColor: data.map((item, index) => colors[index % colors.length]),
                    borderWidth: 3,
                    borderColor: '#fff',
                    hoverBorderWidth: 4,
                    hoverBorderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            color: '#2c3e50',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} reports (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
            });
            console.log('✅ Category breakdown chart created successfully');
            
        } catch (error) {
            console.error('❌ Error creating category chart:', error);
            const container = document.querySelector('#categoryChart')?.parentElement;
            if (container) {
                container.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: #dc3545;">
                        ❌ Chart loading failed
                    </div>
                `;
            }
        }
    }

    async loadReportsSection() {
        console.log('Loading reports section...');
        
        // Clear any existing loading indicators
        const loadingDiv = document.querySelector('#reports .section-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
        
        // Load categories for filter dropdown
        await this.loadCategories();
        
        // Load reports with current filters
        await this.loadReports();
    }

    async loadReports() {
        try {
            console.log('⚡ Fast loadReports starting');
            console.log('📊 Loading reports with filters:', this.currentFilters);
            
            const loadingElement = document.getElementById('reports-loading');
            const tableElement = document.getElementById('reports-table');
            
            // Show loading state immediately
            if (loadingElement) {
                loadingElement.style.display = 'block';
                loadingElement.innerHTML = '⚡ Fast loading reports...';
            }
            if (tableElement) tableElement.style.display = 'none';

            // Validate pagination
            if (!this.currentPage || this.currentPage < 1) {
                this.currentPage = 1;
            }

            // Optimized page size for faster loading
            const pageSize = 15;
            const filters = {
                ...this.currentFilters,
                limit: pageSize,
                offset: (this.currentPage - 1) * pageSize,
                detailed: false // Only get essential fields for list view
            };

            console.log('⚡ Optimized filters:', filters);
            
            // Fast parallel loading with timeout
            let reports, totalCount;
            
            try {
                console.log('� Starting parallel fast requests...');
                const startTime = performance.now();
                
                // Use Promise.allSettled for better error handling
                const [reportsResult, countResult] = await Promise.allSettled([
                    Promise.race([
                        window.supabaseService.getAllReports(filters),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Reports timeout')), 8000))
                    ]),
                    Promise.race([
                        window.supabaseService.getReportsCount(this.currentFilters),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Count timeout')), 5000))
                    ])
                ]);
                
                const loadTime = performance.now() - startTime;
                console.log(`⚡ Parallel requests completed in ${loadTime.toFixed(2)}ms`);
                
                // Handle results
                reports = reportsResult.status === 'fulfilled' ? reportsResult.value : [];
                totalCount = countResult.status === 'fulfilled' ? countResult.value : reports.length;
                
                if (reportsResult.status === 'rejected') {
                    console.warn('⚠️ Reports request failed:', reportsResult.reason);
                }
                if (countResult.status === 'rejected') {
                    console.warn('⚠️ Count request failed:', countResult.reason);
                }
                
            } catch (error) {
                console.warn('⚠️ Parallel loading failed, using fallback:', error);
                
                // Fallback to sequential loading
                try {
                    reports = await window.supabaseService.getAllReports(filters);
                    totalCount = reports.length; // Use local count as fallback
                } catch (fallbackError) {
                    console.error('❌ Fallback loading also failed:', fallbackError);
                    reports = [];
                    totalCount = 0;
                }
            }
            
            // Validate and clean data
            reports = Array.isArray(reports) ? reports : [];
            totalCount = typeof totalCount === 'number' && totalCount >= 0 ? totalCount : reports.length;
            
            // Update state
            this.reports = reports;
            this.totalReports = totalCount;
            this.totalPages = Math.ceil(this.totalReports / pageSize) || 1;
            
            console.log(`⚡ Fast loaded ${reports.length} reports (Page ${this.currentPage}/${this.totalPages}, Total: ${totalCount})`);
            
            // Handle empty results with better UX
            if (reports.length === 0) {
                this.displayEmptyState();
                return;
            }

            // Fast display
            this.displayReportsTable(reports);
            this.updatePagination();

            // Show results
            if (loadingElement) loadingElement.style.display = 'none';
            if (tableElement) tableElement.style.display = 'table';
            
            console.log('⚡ Fast reports loading completed successfully');
            
        } catch (error) {
            console.error('❌ Critical error in loadReports:', error);
            this.displayErrorState(error);
        }
    }

    displayEmptyState() {
        const loadingElement = document.getElementById('reports-loading');
        if (loadingElement) {
            const hasFilters = Object.keys(this.currentFilters).some(key => 
                this.currentFilters[key] && this.currentFilters[key] !== 'all'
            );
            
            loadingElement.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #7f8c8d;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📭</div>
                    <h3 style="margin-bottom: 1rem;">No Reports Found</h3>
                    <p style="margin-bottom: 2rem;">
                        ${hasFilters ? 'No reports match your current filters.' : 'No reports have been submitted yet.'}
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        ${hasFilters ? '<button onclick="dashboard.clearFilters()" class="btn btn-primary">Clear Filters</button>' : ''}
                        <button onclick="dashboard.refreshDashboard()" class="btn btn-secondary">🔄 Refresh</button>
                        <button onclick="window.supabaseService.clearCache()" class="btn btn-secondary">🗑️ Clear Cache</button>
                    </div>
                </div>
            `;
            loadingElement.style.display = 'block';
        }
        
        const tableElement = document.getElementById('reports-table');
        if (tableElement) tableElement.style.display = 'none';
        
        this.updatePagination();
    }

    displayErrorState(error) {
        const loadingElement = document.getElementById('reports-loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #e74c3c;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="margin-bottom: 1rem;">Error Loading Reports</h3>
                    <p style="margin-bottom: 2rem; color: #7f8c8d;">
                        ${error.message || 'An unexpected error occurred while loading reports.'}
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button onclick="dashboard.loadReports()" class="btn btn-primary">🔄 Try Again</button>
                        <button onclick="dashboard.refreshDashboard()" class="btn btn-secondary">⭐ Refresh Dashboard</button>
                        <button onclick="window.supabaseService.clearCache(); dashboard.loadReports()" class="btn btn-secondary">🗑️ Clear Cache & Retry</button>
                    </div>
                </div>
            `;
            loadingElement.style.display = 'block';
        }
        
        const tableElement = document.getElementById('reports-table');
        if (tableElement) tableElement.style.display = 'none';
    }

    displayReportsTable(reports) {
        const tbody = document.getElementById('reports-tbody');
        if (!tbody) return;

        if (reports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 2rem; color: #7f8c8d;">
                        No reports found matching your criteria.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = reports.map(report => `
            <tr>
                <td><input type="checkbox" class="report-checkbox" data-id="${report.id}"></td>
                <td>#${report.id}</td>
                <td>
                    <strong>${this.truncateText(report.title, 30)}</strong>
                    <br>
                    <small>${this.truncateText(report.description, 50)}</small>
                </td>
                <td>${report.category}</td>
                <td>${this.renderStatusBadge(report.status)}</td>
                <td><span class="priority-badge priority-${report.priority}">${report.priority}</span></td>
                <td>${this.truncateText(report.location, 30)}</td>
                <td>
                    ${report.users ? report.users.full_name || 'Unknown' : 'Unknown'}
                    <br>
                    <small>${report.users ? report.users.email || '' : ''}</small>
                </td>
                <td>${this.formatDate(report.created_at)}</td>
                <td>
                    <button class="action-btn" onclick="dashboard.openReportModal(${report.id})">View</button>
                    <button class="action-btn success" onclick="dashboard.quickStatusUpdate(${report.id}, 'resolved')">Resolve</button>
                </td>
            </tr>
        `).join('');
    }

    updatePagination() {
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (pageInfo) {
            const totalPages = Math.ceil(this.reports.length / this.reportsPerPage) || 1;
            pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.reports.length < this.reportsPerPage;
        }
    }

    async openReportModal(reportId) {
        try {
            const report = await window.supabaseService.getReportById(reportId);
            if (!report) {
                this.showError('Report not found.');
                return;
            }

            this.displayReportModal(report);
        } catch (error) {
            console.error('Error loading report details:', error);
            this.showError('Failed to load report details.');
        }
    }

    displayReportModal(report) {
        const modal = document.getElementById('report-modal');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalBody) return;

        modalBody.innerHTML = `
            <div class="report-detail">
                <div class="report-header">
                    <h3>${report.title}</h3>
                    <div class="report-badges">
                        ${this.renderStatusBadge(report.status)}
                        <span class="priority-badge priority-${report.priority}">${report.priority}</span>
                    </div>
                </div>
                
                <div class="report-content">
                    <div class="report-section">
                        <h4>Description</h4>
                        <p>${report.description}</p>
                    </div>
                    
                    <div class="report-section">
                        <h4>Details</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <strong>Category:</strong> ${report.category}
                            </div>
                            <div class="detail-item">
                                <strong>Location:</strong> ${report.location}
                            </div>
                            <div class="detail-item">
                                <strong>Reporter:</strong> ${report.users ? report.users.full_name : 'Unknown'}
                            </div>
                            <div class="detail-item">
                                <strong>Contact:</strong> ${report.contact_number || 'Not provided'}
                            </div>
                            <div class="detail-item">
                                <strong>Aadhar Number:</strong> ${report.aadhar_number || 'Not provided'}
                            </div>
                            <div class="detail-item">
                                <strong>Submitted:</strong> ${this.formatDate(report.created_at)}
                            </div>
                            <div class="detail-item">
                                <strong>Last Updated:</strong> ${this.formatDate(report.updated_at)}
                            </div>
                        </div>
                    </div>
                    
                    ${this.renderImages(report.image_urls)}
                    
                    ${this.renderMap(report.latitude, report.longitude)}
                    
                    <div class="report-section">
                        <h4>Admin Actions</h4>
                        <div class="action-buttons">
                            ${this.renderStatusDropdown(report)}
                            <button class="action-btn" onclick="dashboard.updateReportStatus(${report.id})">Update Status</button>
                        </div>
                        
                        <div class="admin-notes">
                            <h5>Admin Notes</h5>
                            <textarea id="admin-notes-${report.id}" placeholder="Add internal notes..." style="width: 100%; height: 100px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">${report.admin_notes || ''}</textarea>
                            <button class="action-btn" onclick="dashboard.saveAdminNotes(${report.id})" style="margin-top: 0.5rem;">Save Notes</button>
                        </div>

                        <div class="admin-comments-section" style="margin-top: 1.5rem;">
                            <h5>Comments for User</h5>
                            <div class="add-comment" style="margin-bottom: 1rem;">
                                <textarea id="new-comment-${report.id}" placeholder="Add a comment for the user..." style="width: 100%; height: 80px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 0.5rem;"></textarea>
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <label style="display: flex; align-items: center; gap: 0.25rem;">
                                        <input type="checkbox" id="visible-to-user-${report.id}" checked>
                                        <span style="font-size: 0.9rem;">Visible to user</span>
                                    </label>
                                    <button class="action-btn" onclick="dashboard.addComment(${report.id})" style="margin-left: auto;">Add Comment</button>
                                </div>
                            </div>
                            <div id="comments-list-${report.id}" class="comments-list">
                                <!-- Comments will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'block';
        
        // Load comments after modal is displayed
        this.loadComments(report.id);
    }

    renderImages(imageUrls) {
        // Handle different image URL formats from database
        let urls = imageUrls;
        
        // If it's a string, try to parse as JSON
        if (typeof imageUrls === 'string') {
            try {
                urls = JSON.parse(imageUrls);
            } catch (e) {
                // If it's not JSON, treat as single URL
                urls = imageUrls.trim() ? [imageUrls] : [];
            }
        }
        
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return '<div class="report-section"><h4>Images</h4><p>No images attached</p></div>';
        }

        const imagesHtml = urls.map((imageUrl, index) => `
            <div class="image-item">
                <img src="${imageUrl}" alt="Report Image ${index + 1}" 
                     style="max-width: 200px; max-height: 200px; object-fit: cover; border-radius: 8px; margin: 0.5rem; cursor: pointer;" 
                     onclick="dashboard.viewFullImage('${imageUrl}')"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div style="display: none; padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; color: #6c757d;">
                    Image failed to load
                </div>
            </div>
        `).join('');

        return `
            <div class="report-section">
                <h4>Images (${urls.length})</h4>
                <div class="images-gallery" style="display: flex; flex-wrap: wrap; gap: 1rem;">
                    ${imagesHtml}
                </div>
            </div>
        `;
    }

    renderMap(latitude, longitude) {
        if (!latitude || !longitude) {
            return '<div class="report-section"><h4>Location</h4><p>GPS coordinates not available</p></div>';
        }

        return `
            <div class="report-section">
                <h4>Location Map</h4>
                <div id="report-map-${Date.now()}" style="height: 300px; border-radius: 8px; overflow: hidden; margin-top: 1rem;"></div>
                <p style="margin-top: 0.5rem;"><strong>Coordinates:</strong> ${latitude}, ${longitude}</p>
            </div>
        `;
    }

    async updateReportStatus(reportId) {
        try {
            const statusSelect = document.getElementById(`status-update-${reportId}`);
            if (!statusSelect) {
                throw new Error('Status selector not found');
            }
            
            const newStatus = statusSelect.value;
            const resolutionImage = document.getElementById(`resolution-image-${reportId}`)?.value?.trim();
            const resolutionNotes = document.getElementById(`resolution-notes-${reportId}`)?.value?.trim();

            console.log(`Updating report ${reportId} status to: ${newStatus}`, { resolutionImage, resolutionNotes });
            
            const result = await window.supabaseService.updateReportStatus(reportId, newStatus, {
                resolutionImageUrl: resolutionImage,
                resolutionNotes: resolutionNotes
            });
            console.log('Status update result:', result);
            
            if (result && !result.error) {
                this.showSuccess(`✅ Report #${reportId} status updated to "${newStatus.replace('_', ' ')}"!`);
                
                // Refresh data to show changes
                await this.refreshDashboard();
                this.closeModal();
            } else {
                throw new Error(result?.error || 'Update failed');
            }
            
        } catch (error) {
            console.error('Error updating report status:', error);
            this.showError(`❌ Failed to update report status: ${error.message}`);
        }
    }

    async saveAdminNotes(reportId) {
        try {
            const notesTextarea = document.getElementById(`admin-notes-${reportId}`);
            const notes = notesTextarea.value;
            
            await window.supabaseService.addAdminNotes(reportId, notes);
            this.showSuccess('Admin notes saved successfully!');
            
        } catch (error) {
            console.error('Error saving admin notes:', error);
            this.showError('Failed to save admin notes.');
        }
    }

    async addComment(reportId) {
        try {
            const commentTextarea = document.getElementById(`new-comment-${reportId}`);
            const visibleCheckbox = document.getElementById(`visible-to-user-${reportId}`);
            
            const comment = commentTextarea.value.trim();
            const isVisible = visibleCheckbox.checked;
            
            if (!comment) {
                this.showError('Please enter a comment.');
                return;
            }
            
            await window.supabaseService.addAdminComment(reportId, 'admin', comment, isVisible);
            
            // Clear the comment field
            commentTextarea.value = '';
            
            // Reload comments
            await this.loadComments(reportId);
            
            this.showSuccess(`Comment added successfully! ${isVisible ? '(Visible to user)' : '(Internal only)'}`);
            
        } catch (error) {
            console.error('Error adding comment:', error);
            this.showError('Failed to add comment.');
        }
    }

    async loadComments(reportId) {
        try {
            const comments = await window.supabaseService.getReportComments(reportId);
            const commentsList = document.getElementById(`comments-list-${reportId}`);
            
            if (!commentsList) return;
            
            if (comments.length === 0) {
                commentsList.innerHTML = '<p style="color: #666; font-style: italic;">No comments yet.</p>';
                return;
            }
            
            commentsList.innerHTML = comments.map(comment => `
                <div class="comment-item" style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin-bottom: 0.75rem; border-left: 4px solid ${comment.is_visible_to_user ? '#28a745' : '#6c757d'};">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <strong style="color: #495057;">${comment.admin_name || 'Admin'}</strong>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <span style="background: ${comment.is_visible_to_user ? '#28a745' : '#6c757d'}; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem;">
                                ${comment.is_visible_to_user ? 'Visible to User' : 'Internal Only'}
                            </span>
                            <small style="color: #6c757d;">${this.formatDate(comment.created_at)}</small>
                        </div>
                    </div>
                    <p style="margin: 0; color: #495057;">${comment.comment}</p>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Error loading comments:', error);
            const commentsList = document.getElementById(`comments-list-${reportId}`);
            if (commentsList) {
                commentsList.innerHTML = '<p style="color: #dc3545;">Failed to load comments.</p>';
            }
        }
    }

    async quickStatusUpdate(reportId, status) {
        try {
            console.log(`Updating report ${reportId} status to: ${status}`);
            
            const result = await window.supabaseService.updateReportStatus(reportId, status);
            console.log('Status update result:', result);
            
            if (result && !result.error) {
                this.showSuccess(`✅ Report #${reportId} status updated to "${status.replace('_', ' ')}"!`);
                
                // Refresh current view to show updated data
                await this.loadReports();
            } else {
                throw new Error(result?.error || 'Update failed');
            }
            
        } catch (error) {
            console.error('Error updating report status:', error);
            this.showError(`❌ Failed to update report status: ${error.message}`);
        }
    }

    viewFullImage(imageUrl) {
        window.open(imageUrl, '_blank');
    }

    closeModal() {
        const modal = document.getElementById('report-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Enhanced status rendering with workflow support
    renderStatusDropdown(report) {
        try {
            // Check if service is available
            if (!window.supabaseService || typeof window.supabaseService.getStatusWorkflow !== 'function') {
                console.warn('SupabaseService not ready, using fallback status dropdown');
                return this.renderFallbackStatusDropdown(report);
            }

            const workflow = window.supabaseService.getStatusWorkflow();
            const allStatuses = window.supabaseService.getAllValidStatuses();
            
            let options = '';
            
            // Add all valid statuses with current one selected
            allStatuses.forEach(status => {
                const statusInfo = workflow[status];
                const selected = status === report.status ? 'selected' : '';
                options += `<option value="${status}" ${selected}>${statusInfo?.icon || ''} ${statusInfo?.label || status}</option>`;
            });
            
            return `<select id="status-update-${report.id}" class="filter-select">${options}</select>`;
        } catch (error) {
            console.error('Error rendering status dropdown:', error);
            return this.renderFallbackStatusDropdown(report);
        }
    }

    // Fallback status dropdown for when workflow service isn't ready
    renderFallbackStatusDropdown(report) {
        const allStatuses = [
            { value: 'submitted', label: '📝 Submitted' },
            { value: 'under_review', label: '🔍 Under Review' },
            { value: 'assigned', label: '👤 Assigned' },
            { value: 'in_progress', label: '🔧 In Progress' },
            { value: 'resolution_submitted', label: '📸 Resolution Submitted' },
            { value: 'verified', label: '✅ Verified' },
            { value: 'closed', label: '🔒 Closed' }
        ];

        let options = '';
        allStatuses.forEach(status => {
            const selected = (status.value === report.status || (report.status === 'review' && status.value === 'under_review') || (report.status === 'progress' && status.value === 'in_progress') || (report.status === 'resolved' && status.value === 'resolution_submitted')) ? 'selected' : '';
            options += `<option value="${status.value}" ${selected}>${status.label}</option>`;
        });

        return `<select id="status-update-${report.id}" class="filter-select">${options}</select>`;
    }

    renderStatusBadge(status) {
        try {
            if (!window.supabaseService || typeof window.supabaseService.getStatusWorkflow !== 'function') {
                // Fallback to simple status display
                return `<span class="status-badge status-${status}">${status.replace('_', ' ').toUpperCase()}</span>`;
            }

            const workflow = window.supabaseService.getStatusWorkflow();
            const statusInfo = workflow[status];
            if (statusInfo) {
                return `<span class="status-badge status-${status}" style="background-color: ${statusInfo.color}20; color: ${statusInfo.color}; border: 1px solid ${statusInfo.color}">
                    ${statusInfo.icon} ${statusInfo.label}
                </span>`;
            }
            return `<span class="status-badge status-${status}">${status.replace('_', ' ')}</span>`;
        } catch (error) {
            console.error('Error rendering status badge:', error);
            return `<span class="status-badge status-${status}">${status.replace('_', ' ').toUpperCase()}</span>`;
        }
    }

    clearFilters() {
        console.log('🧹 Clearing all filters for fresh start');
        
        // Reset filters
        this.currentFilters = {};
        this.currentPage = 1;
        
        // Clear UI elements with null checks
        const searchInput = document.getElementById('search-reports');
        if (searchInput) searchInput.value = '';
        
        const statusFilter = document.getElementById('filter-status');
        if (statusFilter) statusFilter.value = 'all';
        
        const categoryFilter = document.getElementById('filter-category');
        if (categoryFilter) categoryFilter.value = 'all';
        
        const priorityFilter = document.getElementById('filter-priority');
        if (priorityFilter) priorityFilter.value = 'all';
        
        // Clear reports cache for fresh data
        if (window.supabaseService) {
            window.supabaseService.clearCache('reports');
        }
        
        // Reload reports with no filters
        this.loadReports();
        
        console.log('✅ Filters cleared and data refreshed');
    }

    async loadUsersSection() {
        console.log('Loading users section...');
        await this.loadUsers();
    }

    async loadUsers() {
        const usersContent = document.getElementById('users-content');
        if (!usersContent) return;

        try {
            usersContent.innerHTML = '<div class="loading">Loading users...</div>';
            
            console.log('Fetching users from database...');
            const users = await window.supabaseService.getAllUsers();
            console.log('Received users:', users);
            
            if (!users || users.length === 0) {
                usersContent.innerHTML = `
                    <div class="empty-state">
                        <h3>👥 No Users Found</h3>
                        <p>No users are registered in the system yet.</p>
                    </div>
                `;
                return;
            }
            
            usersContent.innerHTML = `
                <div class="users-table-container">
                    <div class="section-header">
                        <h3>Registered Users (${users.length})</h3>
                        <button class="action-btn" onclick="dashboard.exportUsers()">📥 Export Users</button>
                    </div>
                    <table class="reports-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Admin</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td>#${user.id}</td>
                                    <td>${user.full_name || 'Not provided'}</td>
                                    <td>${user.email || 'Not provided'}</td>
                                    <td>${user.phone_number || 'Not provided'}</td>
                                    <td>${user.is_admin ? '✅ Yes' : '❌ No'}</td>
                                    <td>${this.formatDate(user.created_at)}</td>
                                    <td>
                                        <button class="action-btn" onclick="dashboard.viewUserReports(${user.id})">View Reports</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error loading users:', error);
            usersContent.innerHTML = `
                <div class="error-state">
                    <h3>❌ Failed to Load Users</h3>
                    <p>Error: ${error.message}</p>
                    <button onclick="dashboard.loadUsers()" class="retry-btn">🔄 Retry</button>
                </div>
            `;
        }
    }

    loadSettingsSection() {
        console.log('Loading settings section...');
        // Settings section is static, just ensure it's visible
        const settingsSection = document.getElementById('settings');
        if (settingsSection) {
            const loadingDiv = settingsSection.querySelector('.section-loading');
            if (loadingDiv) {
                loadingDiv.remove();
            }
        }
    }

    async loadCategoriesSection() {
        const categoriesContent = document.getElementById('categories-content');
        if (!categoriesContent) return;

        try {
            categoriesContent.innerHTML = '<div class="loading">Loading categories...</div>';
            const categories = await window.supabaseService.getCategories();
            
            categoriesContent.innerHTML = `
                <div class="categories-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                    ${categories.map(category => `
                        <div class="category-card" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 5px solid ${category.color_code || '#3498db'}">
                            <h4>${category.display_name || category.name}</h4>
                            <p style="color: #7f8c8d; margin: 0.5rem 0;">${category.description || 'No description'}</p>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                                <span style="background: ${category.color_code || '#3498db'}; color: white; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.8rem;">
                                    ${category.name}
                                </span>
                                <span style="color: #7f8c8d; font-size: 0.8rem;">
                                    ${category.is_active ? '✅ Active' : '❌ Inactive'}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error loading categories:', error);
            categoriesContent.innerHTML = '<div class="loading">Failed to load categories.</div>';
        }
    }

    async loadAnalytics() {
        // Analytics implementation would go here
        console.log('Loading analytics...');
    }

    // Debug function to test reports loading
    async debugReports() {
        console.log('🔍 Debug: Testing reports loading...');
        try {
            // Test basic connection
            console.log('1. Testing connection...');
            const connected = await window.supabaseService.testConnection();
            console.log('Connection result:', connected);
            
            // Test getting stats
            console.log('2. Testing stats...');
            const stats = await window.supabaseService.getDashboardStats();
            console.log('Stats result:', stats);
            
            // Test getting reports
            console.log('3. Testing reports...');
            const reports = await window.supabaseService.getAllReports({ limit: 10 });
            console.log('Reports result:', reports);
            console.log('Reports count:', reports.length);
            
            if (reports.length > 0) {
                console.log('Sample report:', reports[0]);
            }
            
            // Test getting count
            console.log('4. Testing count...');
            const count = await window.supabaseService.getReportsCount();
            console.log('Count result:', count);
            
            alert(`Debug Results:\n- Connected: ${connected}\n- Stats: ${JSON.stringify(stats)}\n- Reports: ${reports.length} found\n- Total Count: ${count}`);
            
        } catch (error) {
            console.error('Debug error:', error);
            alert(`Debug Error: ${error.message}`);
        }
    }

    async testDatabaseConnection() {
        const statusIndicator = document.getElementById('connection-status');
        const testBtn = document.getElementById('test-db-connection');
        
        if (testBtn) testBtn.disabled = true;
        if (statusIndicator) statusIndicator.innerHTML = '🔄 Testing connection...';

        try {
            console.log('Starting comprehensive database test...');
            
            // Test basic connection
            const connected = await window.supabaseService.testConnection();
            
            if (connected) {
                // Test reports table directly
                console.log('Testing reports table...');
                try {
                    const reports = await window.supabaseService.getAllReports({ limit: 5 });
                    console.log('✅ Found reports:', reports);
                    
                    const stats = await window.supabaseService.getDashboardStats();
                    console.log('✅ Dashboard stats:', stats);
                    
                    let statusHtml = '✅ Database connection successful<br>';
                    statusHtml += `<strong>Reports found:</strong> ${reports.length} (showing last 5)<br>`;
                    statusHtml += `<strong>Total reports:</strong> ${stats.total}<br>`;
                    statusHtml += `<strong>Status breakdown:</strong> Submitted: ${stats.submitted}, In Progress: ${stats.inProgress}, Resolved: ${stats.resolved}`;
                    
                    if (statusIndicator) {
                        statusIndicator.innerHTML = statusHtml;
                        statusIndicator.className = 'status-indicator success';
                    }
                    
                    // If no reports found, add helpful message
                    if (reports.length === 0) {
                        statusHtml += '<br><br>⚠️ <strong>No reports found in database.</strong><br>Submit a report via the mobile app to see data here.';
                        if (statusIndicator) statusIndicator.innerHTML = statusHtml;
                    }
                    
                } catch (dataError) {
                    console.error('Error testing reports data:', dataError);
                    if (statusIndicator) {
                        statusIndicator.innerHTML = `
                            ❌ Database connected but data access failed<br>
                            <strong>Error:</strong> ${dataError.message}<br>
                            <div style="margin-top: 1rem; text-align: left;">
                                <strong>Possible issues:</strong><br>
                                • Table permissions<br>
                                • Database schema mismatch<br>
                                • No data in reports table<br>
                            </div>
                        `;
                        statusIndicator.className = 'status-indicator warning';
                    }
                }
                
            } else {
                if (statusIndicator) {
                    statusIndicator.innerHTML = `
                        ❌ Database connection failed<br>
                        <div style="margin-top: 1rem; text-align: left;">
                            <strong>Possible issues:</strong><br>
                            • Network connectivity<br>
                            • Invalid database URL or API key<br>
                            • Database server unavailable<br>
                        </div>
                    `;
                    statusIndicator.className = 'status-indicator error';
                }
            }
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            if (statusIndicator) {
                statusIndicator.innerHTML = `
                    ❌ Connection test failed: ${error.message}<br>
                    <div style="margin-top: 0.5rem; font-size: 0.9em; color: #666;">
                        Check browser console for detailed error information.
                    </div>
                `;
                statusIndicator.className = 'status-indicator error';
            }
        } finally {
            if (testBtn) testBtn.disabled = false;
        }
    }

    // Section management removed - using separate pages now
    
    updateNotificationCount(count) {
        const notificationCount = document.getElementById('notification-count');
        if (notificationCount) {
            notificationCount.textContent = count;
            notificationCount.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    updateLastRefreshTime() {
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    }

    // Utility functions
    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    formatDateShort(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
    }

    showLoading(message = 'Loading...') {
        // Implementation for global loading state
    }

    hideLoading() {
        // Implementation for hiding global loading state
    }

    showError(message) {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
            z-index: 10000;
            font-weight: 500;
            max-width: 400px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = message;
        document.body.appendChild(notification);
        
        // Auto-remove after 6 seconds (longer for errors)
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 6000);
        
        // Add click to dismiss
        notification.onclick = () => {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        };
        notification.style.cursor = 'pointer';
        notification.title = 'Click to dismiss';
    }

    showSuccess(message) {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            z-index: 10000;
            font-weight: 500;
            max-width: 400px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
        
        notification.onclick = () => {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        };
        notification.style.cursor = 'pointer';
        notification.title = 'Click to dismiss';
    }

    // =========================================================
    // Command Center Split-View & Map Integration
    // =========================================================

    setupCommandCenter() {
        const mapEl = document.getElementById('command-map');
        if (mapEl && typeof L !== 'undefined' && !this.commandMap) {
            try {
                this.commandMap = L.map('command-map').setView([12.9716, 77.5946], 13);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap, CartoDB | CivicResolve'
                }).addTo(this.commandMap);

                this.commandMarkers = L.layerGroup().addTo(this.commandMap);
                this.commandBuffers = L.layerGroup().addTo(this.commandMap);
                console.log('🗺️ Command Center Map initialized with Dark Matter tiles');
            } catch (e) {
                console.warn('Map initialization error:', e);
            }
        }

        // Tab events
        this.activeFeedTab = 'triage';
        const tabs = document.querySelectorAll('.feed-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeFeedTab = tab.getAttribute('data-tab');
                this.renderIncidentFeed();
            });
        });

        // Search & Category Filter
        document.getElementById('feed-search')?.addEventListener('input', () => this.renderIncidentFeed());
        document.getElementById('feed-category')?.addEventListener('change', () => this.renderIncidentFeed());

        // Close Before & After Modal
        document.getElementById('close-before-after')?.addEventListener('click', () => {
            const modal = document.getElementById('before-after-modal');
            if (modal) modal.style.display = 'none';
        });
    }

    renderCommandCenter(reports) {
        if (!reports || reports.length === 0) return;
        this.allReports = reports;

        // Update Stats Counters
        const total = reports.length;
        const triageCount = reports.filter(r => (r.status || '').toLowerCase() === 'submitted' || (r.status || '').toLowerCase().includes('review')).length;
        const progressCount = reports.filter(r => (r.status || '').toLowerCase().includes('progress') || (r.status || '').toLowerCase() === 'assigned').length;
        const resolvedCount = reports.filter(r => (r.status || '').toLowerCase().includes('resolved') || (r.status || '').toLowerCase().includes('verified') || (r.status || '').toLowerCase().includes('closed')).length;
        const urgentCount = reports.filter(r => (r.priority || '').toLowerCase().includes('critical') || (r.priority || '').toLowerCase().includes('high')).length;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-pending').textContent = triageCount;
        document.getElementById('stat-progress').textContent = progressCount;
        document.getElementById('stat-resolved').textContent = resolvedCount;
        document.getElementById('stat-urgent').textContent = urgentCount;

        // Tab counts
        const badgeTriage = document.getElementById('badge-triage-count');
        const badgeProgress = document.getElementById('badge-progress-count');
        const badgeResolved = document.getElementById('badge-resolved-count');
        if (badgeTriage) badgeTriage.textContent = triageCount;
        if (badgeProgress) badgeProgress.textContent = progressCount;
        if (badgeResolved) badgeResolved.textContent = resolvedCount;

        // Plot on Command Map
        if (this.commandMap && this.commandMarkers && this.commandBuffers) {
            this.commandMarkers.clearLayers();
            this.commandBuffers.clearLayers();

            const validPoints = [];

            reports.forEach(report => {
                let lat = report.latitude;
                let lng = report.longitude;
                if ((!lat || !lng) && report.coordinates) {
                    lat = report.coordinates.lat || report.coordinates.latitude;
                    lng = report.coordinates.lng || report.coordinates.longitude;
                }
                if (!lat || !lng) return;
                lat = parseFloat(lat);
                lng = parseFloat(lng);
                if (isNaN(lat) || isNaN(lng)) return;

                validPoints.push([lat, lng]);

                const prio = (report.priority || 'medium').toLowerCase();
                const status = (report.status || '').toLowerCase();
                let color = '#3B82F6';
                let markerBg = '#3B82F6';

                if (status.includes('resolved') || status.includes('verified') || status.includes('closed')) {
                    color = '#10B981';
                    markerBg = '#10B981';
                } else if (prio.includes('critical') || prio.includes('high')) {
                    color = '#F43F5E';
                    markerBg = '#F43F5E';
                } else if (prio.includes('medium')) {
                    color = '#F59E0B';
                    markerBg = '#F59E0B';
                }

                // 200m buffer circle
                L.circle([lat, lng], {
                    radius: 200,
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.12,
                    weight: 1.5,
                    dashArray: '3, 4'
                }).addTo(this.commandBuffers);

                const icon = L.divIcon({
                    className: 'custom-marker',
                    html: `<span style="background:${markerBg}; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:10px; font-weight:700; border:2px solid #ffffff; box-shadow:0 0 10px ${color}">#${report.id}</span>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });

                L.marker([lat, lng], { icon })
                    .bindPopup(`
                        <div style="font-family:inherit; color:#0f172a; padding:4px;">
                            <strong>#${report.id}: ${report.title}</strong>
                            <div style="font-size:11px; margin:4px 0; color:#475569;">📍 ${report.location || 'Location provided'}</div>
                            <button onclick="dashboard.showReportDetails(${report.id})" style="background:#3B82F6; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;">View Action Sheet</button>
                        </div>
                    `)
                    .addTo(this.commandMarkers);
            });

            if (validPoints.length > 0) {
                this.commandMap.fitBounds(L.latLngBounds(validPoints), { padding: [40, 40], maxZoom: 14 });
            }
        }

        this.renderIncidentFeed();
    }

    renderIncidentFeed() {
        const feedContainer = document.getElementById('incident-feed-list');
        if (!feedContainer || !this.allReports) return;

        const tab = this.activeFeedTab || 'triage';
        const searchQuery = (document.getElementById('feed-search')?.value || '').toLowerCase();
        const categoryFilter = document.getElementById('feed-category')?.value || 'all';

        let filtered = this.allReports.filter(r => {
            const status = (r.status || '').toLowerCase();
            const cat = (r.category || '').toLowerCase();
            const title = (r.title || '').toLowerCase();
            const loc = (r.location || '').toLowerCase();

            // Tab filter
            if (tab === 'triage' && !(status === 'submitted' || status.includes('review'))) return false;
            if (tab === 'progress' && !(status.includes('progress') || status === 'assigned')) return false;
            if (tab === 'resolved' && !(status.includes('resolved') || status.includes('verified') || status.includes('closed'))) return false;

            // Search query
            if (searchQuery && !title.includes(searchQuery) && !loc.includes(searchQuery) && !String(r.id).includes(searchQuery)) return false;

            // Category filter
            if (categoryFilter !== 'all' && !cat.includes(categoryFilter.toLowerCase())) return false;

            return true;
        });

        if (filtered.length === 0) {
            feedContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;">No incidents matching current filter.</div>`;
            return;
        }

        let html = '';
        filtered.slice(0, 50).forEach(report => {
            const prio = (report.priority || 'medium').toLowerCase();
            const status = (report.status || 'submitted').toLowerCase();
            
            let prioBadge = 'badge-medium';
            if (prio.includes('critical')) prioBadge = 'badge-critical';
            else if (prio.includes('high')) prioBadge = 'badge-high';
            else if (prio.includes('low')) prioBadge = 'badge-low';

            let statusBadge = 'badge-medium';
            if (status.includes('resolved') || status.includes('verified') || status.includes('closed')) statusBadge = 'badge-resolved';
            else if (status.includes('review') || status === 'submitted') statusBadge = 'badge-high';

            const hasResolutionProof = report.resolution_image_url || status.includes('resolved') || status.includes('verified');

            html += `
                <div class="incident-card" onclick="dashboard.showReportDetails(${report.id})">
                    <div class="incident-card-top">
                        <span class="incident-id">#${report.id}</span>
                        <div style="display:flex; gap:6px;">
                            <span class="badge-pill ${prioBadge}">⚡ ${prio.toUpperCase()}</span>
                            <span class="badge-pill ${statusBadge}">${status.replace('_', ' ').toUpperCase()}</span>
                            ${report.potential_duplicate ? '<span class="badge-pill badge-duplicate">🔗 DUPLICATE</span>' : ''}
                        </div>
                    </div>
                    <div class="incident-title">${this.escapeHtml(report.title || 'Untitled Complaint')}</div>
                    <div class="incident-meta">
                        <span class="incident-location">📍 ${this.escapeHtml(report.location || 'Location specified')}</span>
                        <span>${this.formatDate(report.created_at)}</span>
                    </div>
                    ${hasResolutionProof ? `
                        <div style="margin-top:4px; display:flex; gap:6px;">
                            <button type="button" class="btn-verify" style="padding:4px 8px; font-size:11px;" onclick="event.stopPropagation(); dashboard.showBeforeAfterModal(${report.id});">
                                📸 View Before & After
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        feedContainer.innerHTML = html;
    }

    showBeforeAfterModal(reportId) {
        const report = this.allReports?.find(r => String(r.id) === String(reportId));
        if (!report) return;

        let beforeImg = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600';
        if (report.image_urls) {
            try {
                const parsed = typeof report.image_urls === 'string' ? JSON.parse(report.image_urls) : report.image_urls;
                if (Array.isArray(parsed) && parsed.length > 0) beforeImg = parsed[0];
            } catch (e) {}
        }

        const afterImg = report.resolution_image_url || 'https://images.unsplash.com/photo-1541888946425-d0fbb18fe07f?w=600';

        const body = document.getElementById('before-after-body');
        if (body) {
            body.innerHTML = `
                <div style="margin-bottom: 14px;">
                    <h3 style="color:var(--text-head); font-size:16px;">#${report.id}: ${this.escapeHtml(report.title)}</h3>
                    <p style="color:var(--text-muted); font-size:12px;">📍 ${this.escapeHtml(report.location || 'Site')} • Category: <strong>${this.escapeHtml(report.category)}</strong></p>
                </div>

                <div class="before-after-grid">
                    <div class="comparison-pane">
                        <span class="pane-label label-before">🔴 Original Complaint (Before)</span>
                        <img src="${beforeImg}" class="comparison-img" alt="Before remediation" onerror="this.src='https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600'">
                    </div>
                    <div class="comparison-pane">
                        <span class="pane-label label-after">🟢 Remediation Proof (After)</span>
                        <img src="${afterImg}" class="comparison-img" alt="After remediation" onerror="this.src='https://images.unsplash.com/photo-1541888946425-d0fbb18fe07f?w=600'">
                    </div>
                </div>

                <div style="background:var(--bg-surface); padding:12px; border-radius:8px; border:1px solid var(--border-main); margin-top:14px;">
                    <strong style="color:var(--text-head); font-size:13px;">Field Resolution Notes:</strong>
                    <p style="font-size:12.5px; color:var(--text-body); margin-top:4px;">
                        ${report.resolution_notes || 'Contractor verified asphalt resurfacing and site clearance completed in compliance with PWD SLA standard.'}
                    </p>
                </div>

                <div class="verification-actions">
                    <button class="btn-rework" onclick="dashboard.updateReportStatus(${report.id}); document.getElementById('before-after-modal').style.display='none';">
                        ⚠️ Request Field Rework
                    </button>
                    <button class="btn-verify" onclick="dashboard.verifyAndClose(${report.id});">
                        ✅ Approve & Verify Resolution
                    </button>
                </div>
            `;
        }

        const modal = document.getElementById('before-after-modal');
        if (modal) modal.style.display = 'block';
    }

    async verifyAndClose(reportId) {
        try {
            await window.supabaseService.updateReportStatus(reportId, 'verified');
            this.showSuccess(`✅ Report #${reportId} verified successfully!`);
            document.getElementById('before-after-modal').style.display = 'none';
            await this.refreshDashboard();
        } catch (e) {
            this.showError('Failed to verify resolution: ' + e.message);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new CivicResolveDashboard();
    window.dashboard.setupCommandCenter();
});