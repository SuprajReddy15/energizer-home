import React, { useState, useEffect } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Zap, Activity, AlertCircle, Cpu, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [energyHistory, setEnergyHistory] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    currentPrediction: 0,
    totalReadings: 0,
    peakUsage: 0,
    activeAppliances: 0,
  });

  const API_BASE = import.meta.env.VITE_API_BASE;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const getAuthHeader = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  // Fetch energy history and prediction
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [historyRes, predictionRes] = await Promise.all([
          fetch(`${API_BASE}/energy/history`, {
            headers: getAuthHeader(),
          }),
          fetch(`${API_BASE}/predict`, {
            headers: getAuthHeader(),
          }),
        ]);

        if (!historyRes.ok || !predictionRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const historyData = await historyRes.json();
        const predictionData = await predictionRes.json();

        setEnergyHistory(historyData || []);
        setPrediction(predictionData);

        // Calculate stats
        const totalReadings = historyData.length;
        const peakUsage = historyData.length > 0 
          ? Math.max(...historyData.map(h => h.power_consumed)) 
          : 0;
        
        const uniqueAppliances = new Set(historyData.map(h => h.appliance_name)).size;

        setStats({
          currentPrediction: predictionData?.predicted_power || 0,
          totalReadings,
          peakUsage,
          activeAppliances: uniqueAppliances,
        });
      } catch (err) {
        setError('Failed to load dashboard data. Please check your connection.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Simulate energy reading
  const handleSimulateReading = async () => {
    try {
      setSimulating(true);
      
      const appliances = ['AC', 'Fan', 'Fridge', 'TV', 'Washing Machine'];
      const randomAppliance = appliances[Math.floor(Math.random() * appliances.length)];
      const randomPower = Math.floor(Math.random() * 10) + 1;

      const response = await fetch(`${API_BASE}/energy`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          appliance_name: randomAppliance,
          power_consumed: randomPower,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to simulate reading');
      }

      // Refresh dashboard data
      const historyRes = await fetch(`${API_BASE}/energy/history`, {
        headers: getAuthHeader(),
      });
      const historyData = await historyRes.json();
      setEnergyHistory(historyData || []);

      // Update stats
      const totalReadings = historyData.length;
      const peakUsage = historyData.length > 0 
        ? Math.max(...historyData.map(h => h.power_consumed)) 
        : 0;
      const uniqueAppliances = new Set(historyData.map(h => h.appliance_name)).size;

      setStats({
        currentPrediction: stats.currentPrediction,
        totalReadings,
        peakUsage,
        activeAppliances: uniqueAppliances,
      });
    } catch (err) {
      setError('Failed to simulate reading. Please try again.');
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  // Prepare appliance usage data for pie chart
  const applianceUsageData = energyHistory.reduce((acc, item) => {
    const existing = acc.find(a => a.name === item.appliance_name);
    if (existing) {
      existing.value += item.power_consumed;
    } else {
      acc.push({ name: item.appliance_name, value: item.power_consumed });
    }
    return acc;
  }, []);

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#6366F1'];

  // Format data for line chart
  const chartData = energyHistory.map((item, index) => ({
    time: new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    power: item.power_consumed,
    appliance: item.appliance_name,
  }));

  const statCards = [
    {
      title: 'Current Prediction (W)',
      value: stats.currentPrediction.toFixed(2),
      icon: Zap,
      color: 'from-blue-600 to-blue-400',
    },
    {
      title: 'Total Readings',
      value: stats.totalReadings,
      icon: Activity,
      color: 'from-purple-600 to-purple-400',
    },
    {
      title: 'Peak Usage',
      value: `${stats.peakUsage}W`,
      icon: AlertCircle,
      color: 'from-pink-600 to-pink-400',
    },
    {
      title: 'Active Appliances',
      value: stats.activeAppliances,
      icon: Cpu,
      color: 'from-amber-600 to-amber-400',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Smart Energy Dashboard</h1>
          <p className="text-gray-400">Real-time energy analytics for your smart home</p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Simulate Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex justify-end"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSimulateReading}
            disabled={simulating}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-600 text-white font-semibold rounded-lg transition-all duration-200 flex items-center gap-2"
          >
            {simulating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Simulating...
              </>
            ) : (
              'Simulate Energy Reading'
            )}
          </motion.button>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {statCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="backdrop-blur-xl bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-gray-400 text-sm font-medium mb-1">{card.title}</p>
                    <h3 className="text-3xl font-bold text-white">{card.value}</h3>
                  </div>
                  <div className={`p-3 bg-gradient-to-br ${card.color} rounded-lg text-white`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                </div>
                <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-transparent rounded-full" />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Charts Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Line Chart */}
          <motion.div
            variants={itemVariants}
            className="backdrop-blur-xl bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 shadow-xl"
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Energy Usage Trend</h2>
              <p className="text-gray-400 text-sm">Last 24 hours consumption</p>
            </div>

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#E5E7EB' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="power"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', r: 5 }}
                    activeDot={{ r: 7 }}
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </motion.div>

          {/* Pie Chart */}
          <motion.div
            variants={itemVariants}
            className="backdrop-blur-xl bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 shadow-xl"
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Appliance Usage</h2>
              <p className="text-gray-400 text-sm">Energy distribution by device</p>
            </div>

            {applianceUsageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={applianceUsageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${value}W)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    isAnimationActive={true}
                  >
                    {applianceUsageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#E5E7EB' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
