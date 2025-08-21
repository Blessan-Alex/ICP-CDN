import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, Coins, TrendingUp, Calculator, Download, Upload, 
  Clock, AlertCircle, CheckCircle, RefreshCw, DollarSign 
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createActor, canisterId } from '../canister_id_patch';
import { HttpAgent } from '@dfinity/agent';
import { initAuth, getIdentity } from '../auth';

export default function CyclesBilling() {
  const { principal, isLoggedIn } = useAuth();
  const [backend, setBackend] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [cyclesBalance, setCyclesBalance] = useState(0);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [costEstimates, setCostEstimates] = useState({
    upload1MB: 0,
    upload10MB: 0,
    storage1Hour: 0,
    storage24Hours: 0,
    storage1Week: 0
  });

  // Initialize backend connection
  useEffect(() => {
    const initBackend = async () => {
      if (isLoggedIn && principal) {
        try {
          console.log('Initializing backend for cycles billing...');
          await initAuth();
          const identity = getIdentity();
          const agent = new HttpAgent({
            host: import.meta.env.VITE_DFX_REPLICA_HOST || "http://127.0.0.1:4943",
            identity
          });
          const backendInstance = createActor(canisterId, { agent });

          // Test the backend connection
          console.log('Testing backend connection for cycles billing...');
          const testResult = await backendInstance.greet("test");
          console.log('Backend test result:', testResult);

          setBackend(backendInstance);
          console.log('Backend initialized successfully for cycles billing');
        } catch (error) {
          console.error('Failed to initialize backend for cycles billing:', error);
          setError(`Failed to initialize backend: ${error.message}`);
        }
      }
    };
    initBackend();
  }, [isLoggedIn, principal]);

  // Load user account and cycles balance
  const loadUserData = async () => {
    if (!backend) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Loading user account data...');

      // Get user account
      const account = await backend.get_user_account();
      setUserAccount(account);

      // Get cycles balance
      const balance = await backend.get_cycles_balance();
      setCyclesBalance(Number(balance));

      // Load cost estimates
      await loadCostEstimates();

      console.log('User data loaded successfully');
    } catch (error) {
      console.error('Failed to load user data:', error);
      setError(`Failed to load user data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load cost estimates
  const loadCostEstimates = async () => {
    if (!backend) return;

    try {
      console.log('Loading cost estimates...');

      const estimates = {
        upload1MB: Number(await backend.estimate_upload_cost(1024 * 1024)),
        upload10MB: Number(await backend.estimate_upload_cost(10 * 1024 * 1024)),
        storage1Hour: Number(await backend.estimate_storage_cost(1024 * 1024, 1)),
        storage24Hours: Number(await backend.estimate_storage_cost(1024 * 1024, 24)),
        storage1Week: Number(await backend.estimate_storage_cost(1024 * 1024, 24 * 7))
      };

      setCostEstimates(estimates);
      console.log('Cost estimates loaded successfully');
    } catch (error) {
      console.error('Failed to load cost estimates:', error);
      // Don't set error here as it's not critical
    }
  };

  // Auto-load data when backend is ready
  useEffect(() => {
    if (backend) {
      loadUserData();
    }
  }, [backend]);

  // Deposit cycles
  const depositCycles = async () => {
    if (!backend || !depositAmount || isDepositing) return;

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsDepositing(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Depositing cycles...');

      // Note: In a real implementation, this would send cycles with the call
      // For now, we'll simulate the deposit
      const result = await backend.deposit_cycles();
      
      setUserAccount(result);
      setCyclesBalance(Number(result.cycles_balance));
      setDepositAmount('');
      setSuccess(`✅ Successfully deposited cycles! New balance: ${Number(result.cycles_balance).toLocaleString()} cycles`);

      console.log('Cycles deposited successfully');
    } catch (error) {
      console.error('Failed to deposit cycles:', error);
      setError(`Failed to deposit cycles: ${error.message}`);
    } finally {
      setIsDepositing(false);
    }
  };

  // Format cycles to human readable
  const formatCycles = (cycles) => {
    if (cycles >= 1_000_000_000) {
      return `${(cycles / 1_000_000_000).toFixed(2)}B cycles`;
    } else if (cycles >= 1_000_000) {
      return `${(cycles / 1_000_000).toFixed(2)}M cycles`;
    } else if (cycles >= 1_000) {
      return `${(cycles / 1_000).toFixed(2)}K cycles`;
    } else {
      return `${cycles.toLocaleString()} cycles`;
    }
  };

  // Calculate cycles to ICP (approximate)
  const cyclesToICP = (cycles) => {
    // Approximate conversion: 1 ICP ≈ 1 trillion cycles
    return (cycles / 1_000_000_000_000).toFixed(6);
  };

  if (!isLoggedIn) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-neutral-950 text-white pt-20"
      >
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-800 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Wallet className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Please Log In</h1>
            <p className="text-lg text-neutral-400 mb-8">
              You need to be logged in to access Cycles Billing
            </p>
            <motion.button
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-orange-500 to-orange-800 py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.97 }}
            >
              Go to Home
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-neutral-950 text-white pt-20"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="py-10 text-center"
        >
          <motion.div className="bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-2xl p-8 border border-orange-500/20 mb-8 shadow-xl shadow-orange-900/10">
            <h1 className="text-4xl font-bold mb-2">Cycles Billing</h1>
            <p className="text-lg text-neutral-400 mb-2">Manage your dCDN cycles and view cost estimates</p>
            {principal && (
              <p className="text-sm text-neutral-500 mt-2">
                Logged in as: <span className="font-mono text-orange-400">{principal.toString()}</span>
              </p>
            )}
          </motion.div>
        </motion.section>

        {/* Refresh Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex justify-end mb-6"
        >
          <motion.button
            onClick={loadUserData}
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-300 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </motion.button>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-6 p-4 bg-red-900/20 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Display */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-6 p-4 bg-green-900/20 border border-green-500/20 text-green-400 rounded-lg flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cycles Balance Card */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
        >
          {/* Current Balance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Wallet className="w-8 h-8 text-orange-500" />
                Current Balance
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-orange-500" />
                <p className="text-neutral-400">Loading balance...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-500 mb-2">
                    {formatCycles(cyclesBalance)}
                  </div>
                  <div className="text-sm text-neutral-400">
                    ≈ {cyclesToICP(cyclesBalance)} ICP
                  </div>
                </div>

                <div className="bg-neutral-800/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-400">Principal:</span>
                      <div className="font-mono text-xs text-white truncate">
                        {userAccount?.user_principal?.toString() || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-neutral-400">Account Status:</span>
                      <div className="text-green-400">Active</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Deposit Cycles */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Coins className="w-8 h-8 text-orange-500" />
                Deposit Cycles
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Amount (cycles)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter cycles amount"
                  className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={isDepositing}
                />
              </div>

              <motion.button
                onClick={depositCycles}
                disabled={!depositAmount || isDepositing}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isDepositing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Depositing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Deposit Cycles
                  </>
                )}
              </motion.button>

              <div className="text-xs text-neutral-400 text-center">
                Note: Cycles are used to pay for dCDN operations
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Cost Estimates */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl mb-8"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-orange-500" />
            Cost Estimates
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Upload Costs */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Upload className="w-5 h-5 text-orange-500" />
                Upload Costs
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
                  <span className="text-sm text-neutral-300">1 MB File</span>
                  <span className="text-sm font-medium text-white">
                    {formatCycles(costEstimates.upload1MB)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
                  <span className="text-sm text-neutral-300">10 MB File</span>
                  <span className="text-sm font-medium text-white">
                    {formatCycles(costEstimates.upload10MB)}
                  </span>
                </div>
              </div>
            </div>

            {/* Storage Costs */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Storage Costs (1 MB)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
                  <span className="text-sm text-neutral-300">1 Hour</span>
                  <span className="text-sm font-medium text-white">
                    {formatCycles(costEstimates.storage1Hour)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
                  <span className="text-sm text-neutral-300">24 Hours</span>
                  <span className="text-sm font-medium text-white">
                    {formatCycles(costEstimates.storage24Hours)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
                  <span className="text-sm text-neutral-300">1 Week</span>
                  <span className="text-sm font-medium text-white">
                    {formatCycles(costEstimates.storage1Week)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cost Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-500" />
                Cost Information
              </h3>
              <div className="space-y-3 text-sm text-neutral-300">
                <div className="p-3 bg-neutral-800/50 rounded-lg">
                  <div className="font-medium text-white mb-1">Upload Fee</div>
                  <div>1 cycle per byte + 1000 cycles base fee</div>
                </div>
                <div className="p-3 bg-neutral-800/50 rounded-lg">
                  <div className="font-medium text-white mb-1">Storage Fee</div>
                  <div>0.1 cycles per byte per hour</div>
                </div>
                <div className="p-3 bg-neutral-800/50 rounded-lg">
                  <div className="font-medium text-white mb-1">Pinning</div>
                  <div>Free with upload (automatic)</div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
