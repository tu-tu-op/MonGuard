import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import MonGuardClient from '@monguard/sdk';
import TransactionGraph from '../src/components/TransactionGraph';
import RiskMetrics from '../src/components/RiskMetrics';
import AlertsPanel from '../src/components/AlertsPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Shield, 
  AlertTriangle, 
  BarChart3, 
  Home,
  Bell,
  Settings,
  Search,
  Menu,
  X,
  User,
  ChevronRight
} from 'lucide-react';

export default function Dashboard() {
  const [client, setClient] = useState<MonGuardClient | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    flaggedTransactions: 0,
    highRiskWallets: 0,
    activeAlerts: 0
  });

  useEffect(() => {
    // Initialize MonGuard client
    const initClient = async () => {
      try {
        const monguard = new MonGuardClient({
          rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || '',
          riskRegistryAddress: process.env.NEXT_PUBLIC_RISK_REGISTRY_ADDRESS || '',
          complianceOracleAddress: process.env.NEXT_PUBLIC_COMPLIANCE_ORACLE_ADDRESS || '',
          transactionMonitorAddress: process.env.NEXT_PUBLIC_TRANSACTION_MONITOR_ADDRESS || '',
          enforcementAddress: process.env.NEXT_PUBLIC_ENFORCEMENT_ADDRESS || '',
          apiUrl: process.env.NEXT_PUBLIC_API_URL,
        });

        setClient(monguard);

        // Fetch real dashboard stats from API
        await fetchDashboardStats();
      } catch (error) {
        console.error('Failed to initialize MonGuard client:', error);
      }
    };

    initClient();
  }, []);

  // Fetch real-time dashboard statistics from MonGuard API
  const fetchDashboardStats = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        console.warn('API URL not configured, using mock data');
        return;
      }

      // Fetch from existing MonGuard API monitoring endpoint
      const response = await fetch(`${apiUrl}/api/monitoring/stats`);
      const data = await response.json();

      setStats({
        totalTransactions: data.transactions?.total || 0,
        flaggedTransactions: data.transactions?.flagged || 0,
        highRiskWallets: data.wallets?.highRisk || 0,
        activeAlerts: data.alerts?.active || 0,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Keep showing 0 or show error state
    }
  };

  return (
    <>
      <Head>
        <title>MonGuard Analytics Dashboard</title>
        <meta name="description" content="AI-Powered On-Chain Compliance & AML Analytics" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main Content Area */}
        <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          {/* Top Bar */}
          <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

          {/* Main Content */}
          <main className="px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-2"
            >
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                Analytics Overview
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Real-time monitoring and compliance analytics for Monad blockchain
              </p>
            </motion.div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Transactions"
                value={stats.totalTransactions.toLocaleString()}
                change="+12.5%"
                positive={true}
                icon={BarChart3}
                delay={0.1}
              />
              <StatCard
                title="Flagged Transactions"
                value={stats.flaggedTransactions.toLocaleString()}
                change="-3.2%"
                positive={true}
                icon={AlertTriangle}
                delay={0.2}
              />
              <StatCard
                title="High Risk Wallets"
                value={stats.highRiskWallets.toLocaleString()}
                change="+5.8%"
                positive={false}
                icon={Shield}
                delay={0.3}
              />
              <StatCard
                title="Active Alerts"
                value={stats.activeAlerts.toLocaleString()}
                change="-8.1%"
                positive={true}
                icon={Activity}
                delay={0.4}
              />
            </div>

            {/* Main Dashboard Grid */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Transaction Graph - Takes up 2 columns */}
              <Card className="lg:col-span-2 border-none shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <CardTitle className="text-2xl font-bold">Transaction Network</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Interactive visualization of transaction relationships and risk patterns
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                  <TransactionGraph client={client} />
                </CardContent>
              </Card>

              {/* Alerts Panel */}
              <Card className="lg:col-span-1 border-none shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-red-50/50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20">
                  <CardTitle className="text-2xl font-bold">Recent Alerts</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Real-time security alerts and anomaly detection
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <AlertsPanel client={client} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Risk Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Card className="border-none shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
                  <CardTitle className="text-2xl font-bold">Risk Metrics & Analytics</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Comprehensive overview of risk patterns and compliance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                  <RiskMetrics client={client} />
                </CardContent>
              </Card>
            </motion.div>
          </main>
        </div>
      </div>
    </>
  );
}

// Sidebar Component
interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const navItems = [
    { icon: Home, label: 'Dashboard', active: true },
    { icon: AlertTriangle, label: 'Alerts', active: false },
    { icon: BarChart3, label: 'Analytics', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -280 }}
        className={`fixed top-0 left-0 h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 z-50 transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-20'
        } hidden lg:block`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg relative"
              >
                <Shield className="h-7 w-7 text-white relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl blur-md opacity-50" />
              </motion.div>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                    MonGuard
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">v2.0</p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item, index) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  item.active
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon className={`h-5 w-5 ${item.active ? '' : 'group-hover:scale-110 transition-transform'}`} />
                {isOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
                {isOpen && item.active && (
                  <ChevronRight className="h-4 w-4 ml-auto" />
                )}
              </motion.button>
            ))}
          </nav>

          {/* Network Status */}
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 border-t border-gray-200 dark:border-gray-800"
            >
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400">Network Active</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Monad Mainnet</p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.aside>

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isOpen ? 0 : -280 }}
        className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 z-50 lg:hidden shadow-2xl"
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  MonGuard
                </h2>
                <p className="text-xs text-gray-500">v2.0</p>
              </div>
            </div>
            <button onClick={onToggle} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  item.active
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </motion.aside>
    </>
  );
}

// Topbar Component
interface TopbarProps {
  onMenuClick: () => void;
}

function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Center: Search Bar */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions, wallets, alerts..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100/80 dark:bg-slate-800/80 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Network Badge */}
            <Badge variant="secondary" className="gap-1.5 hidden sm:flex bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              <Activity className="h-3 w-3" />
              Monad
            </Badge>

            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            </motion.button>

            {/* User Avatar */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
}

// Enhanced StatCard Component
interface StatCardProps {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ElementType;
  delay?: number;
}

function StatCard({ title, value, change, positive, icon: Icon, delay = 0 }: StatCardProps) {
  const gradients = {
    positive: 'from-green-500 to-emerald-600',
    negative: 'from-red-500 to-rose-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <Card className="relative border-none shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group">
        {/* Gradient Border Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
              className={`h-12 w-12 rounded-xl bg-gradient-to-br ${
                positive ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-red-600'
              } flex items-center justify-center shadow-lg`}
            >
              <Icon className="h-6 w-6 text-white" />
            </motion.div>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight mb-3 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {value}
            </p>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                positive 
                  ? 'bg-green-100 dark:bg-green-950/30' 
                  : 'bg-red-100 dark:bg-red-950/30'
              }`}>
                {positive ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-xs font-semibold ${
                  positive 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {change}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-500">vs last week</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
