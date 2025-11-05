import { motion, useScroll, useTransform } from 'framer-motion';
import { TrendingUp, Activity, BarChart3, Zap } from 'lucide-react';
import { useRef } from 'react';

export default function DashboardPreview() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.8, 1, 1, 0.8]);

  return (
    <section ref={ref} id="trading" className="relative py-32 overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-blue-500/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div 
        className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1.2, 1, 1.2],
          x: [0, 50, 0],
          y: [0, -50, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          style={{ opacity }}
          className="text-center space-y-6 mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full text-sm backdrop-blur-xl"
          >
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 font-semibold">Live Trading Dashboard</span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl font-black"
          >
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Professional Trading
            </span>
            <br />
            <span className="text-white">Dashboard</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-slate-400 max-w-2xl mx-auto"
          >
            Real-time charts, advanced order management, and powerful position tracking
          </motion.p>
        </motion.div>

        {/* Dashboard Mockup with 3D effect */}
        <motion.div
          style={{ y, scale, opacity }}
          className="relative max-w-7xl mx-auto"
        >
          {/* Enhanced multiple glowing borders */}
          <motion.div 
            className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur-xl opacity-40"
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="absolute -inset-2 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 rounded-3xl blur-2xl opacity-30"
            animate={{ 
              rotate: [360, 0],
              scale: [1.05, 1, 1.05]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />

          {/* Dashboard container with 3D transform */}
          <motion.div
            initial={{ rotateX: 15, rotateY: -10 }}
            whileInView={{ rotateX: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, type: "spring" }}
            whileHover={{ rotateY: 2, scale: 1.02 }}
            className="relative bg-slate-900/95 backdrop-blur-2xl border-2 border-slate-800 rounded-3xl overflow-hidden shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)]"
          >
            {/* Top bar with enhanced glow */}
            <div className="border-b border-slate-700 px-8 py-5 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
              <div className="flex items-center space-x-5">
                <div className="flex items-center space-x-2.5">
                  <motion.div 
                    className="w-3.5 h-3.5 rounded-full bg-red-500"
                    whileHover={{ scale: 1.3, boxShadow: "0 0 10px rgba(239, 68, 68, 0.8)" }}
                  />
                  <motion.div 
                    className="w-3.5 h-3.5 rounded-full bg-yellow-500"
                    whileHover={{ scale: 1.3, boxShadow: "0 0 10px rgba(234, 179, 8, 0.8)" }}
                  />
                  <motion.div 
                    className="w-3.5 h-3.5 rounded-full bg-green-500"
                    whileHover={{ scale: 1.3, boxShadow: "0 0 10px rgba(34, 197, 94, 0.8)" }}
                  />
                </div>
                <span className="text-sm font-mono text-slate-400 font-semibold">exness Trading Platform</span>
              </div>
              <div className="flex items-center space-x-2">
                <motion.div 
                  className="flex items-center space-x-2 text-xs px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full"
                  animate={{ 
                    boxShadow: ['0 0 0px rgba(16, 185, 129, 0.3)', '0 0 20px rgba(16, 185, 129, 0.6)', '0 0 0px rgba(16, 185, 129, 0.3)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-emerald-400 font-bold">Live</span>
                </motion.div>
              </div>
            </div>

            {/* Crypto pairs tabs with hover effects */}
            <div className="border-b border-slate-700 px-8 py-4 flex items-center space-x-4 bg-slate-950/50 overflow-x-auto">
              {[
                { icon: TrendingUp, name: 'BTC/USDT', change: '+2.34%', price: '$94,523', color: 'blue', active: true },
                { icon: Activity, name: 'ETH/USDT', change: '+1.82%', price: '$3,421', color: 'purple' },
                { icon: BarChart3, name: 'SOL/USDT', change: '-0.45%', price: '$182.34', color: 'pink', isNegative: true }
              ].map((pair, idx) => (
                <motion.div
                  key={pair.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className={`flex items-center space-x-3 px-5 py-3 rounded-xl cursor-pointer transition-all ${
                    pair.active 
                      ? 'bg-blue-500/20 border-2 border-blue-500/40 shadow-lg shadow-blue-500/20' 
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <pair.icon className={`w-5 h-5 text-${pair.color}-400`} />
                  <div>
                    <div className="text-sm font-bold text-white">{pair.name}</div>
                    <div className={`text-xs ${pair.isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {pair.change}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-white">{pair.price}</div>
                </motion.div>
              ))}
            </div>

            {/* Chart area with enhanced animations */}
            <div className="relative h-[500px] bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8">
              {/* Animated grid */}
              <div className="absolute inset-0 opacity-20">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={`col-${i}`}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: [0, 0.3, 0.15] }}
                    transition={{ duration: 2, delay: i * 0.05, repeat: Infinity }}
                    className="absolute border-r border-slate-600"
                    style={{ left: `${(i / 12) * 100}%`, height: '100%' }}
                  />
                ))}
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={`row-${i}`}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: [0, 0.3, 0.15] }}
                    transition={{ duration: 2, delay: i * 0.05, repeat: Infinity }}
                    className="absolute border-b border-slate-600"
                    style={{ top: `${(i / 8) * 100}%`, width: '100%' }}
                  />
                ))}
              </div>

              {/* Enhanced chart line with glow */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 500" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.7 }}
                  viewport={{ once: true }}
                  transition={{ duration: 2.5, delay: 0.5, ease: "easeOut" }}
                  d="M 0 400 Q 100 380 200 320 T 400 250 T 600 200 T 800 150 T 1000 100"
                  fill="url(#chartGradient)"
                />
                <motion.path
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 2.5, delay: 0.5, ease: "easeOut" }}
                  d="M 0 400 Q 100 380 200 320 T 400 250 T 600 200 T 800 150 T 1000 100"
                  fill="none"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />
              </svg>

              {/* Animated data points */}
              {[20, 35, 50, 65, 80].map((pos, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1 + idx * 0.2 }}
                  whileHover={{ scale: 1.5 }}
                  className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg shadow-blue-500/50"
                  style={{ left: `${pos}%`, top: `${60 - idx * 8}%` }}
                />
              ))}

              {/* Enhanced indicators */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1 }}
                className="absolute bottom-8 left-8 space-y-3"
              >
                <div className="px-4 py-2 bg-slate-950/90 backdrop-blur-xl border border-slate-700 rounded-lg text-sm shadow-xl">
                  <span className="text-slate-400">Price: </span>
                  <span className="text-white font-bold text-lg">$94,523.00</span>
                </div>
                <motion.div 
                  className="px-4 py-2 bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/30 rounded-lg text-sm shadow-xl shadow-emerald-500/20"
                  animate={{ 
                    boxShadow: ['0 0 0px rgba(16, 185, 129, 0.2)', '0 0 20px rgba(16, 185, 129, 0.4)', '0 0 0px rgba(16, 185, 129, 0.2)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="text-emerald-400 font-bold">24h Change: +2.34%</span>
                </motion.div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.2 }}
                className="absolute top-8 right-8 space-y-3"
              >
                <div className="px-4 py-2 bg-slate-950/90 backdrop-blur-xl border border-slate-700 rounded-lg text-sm shadow-xl">
                  <span className="text-slate-400">Balance: </span>
                  <span className="text-white font-bold text-lg">$5,000.00</span>
                </div>
                <div className="px-4 py-2 bg-blue-500/20 backdrop-blur-xl border border-blue-500/30 rounded-lg text-sm shadow-xl">
                  <span className="text-blue-400 font-bold">Leverage: 100x</span>
                </div>
              </motion.div>
            </div>

            {/* Bottom stats with animations */}
            <div className="border-t border-slate-700 px-8 py-6 grid grid-cols-4 gap-6 bg-slate-950/50">
              {[
                { label: '24h Volume', value: '$2.4B' },
                { label: '24h High', value: '$95,234' },
                { label: '24h Low', value: '$92,145' },
                { label: 'Market Cap', value: '$1.8T' }
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.5 + idx * 0.1 }}
                  whileHover={{ y: -5, scale: 1.05 }}
                  className="space-y-2 p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 transition-all"
                >
                  <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Enhanced reflection with animated gradient */}
          <motion.div 
            className="absolute -bottom-40 left-0 right-0 h-40 bg-gradient-to-b from-blue-500/20 via-purple-500/10 to-transparent blur-3xl transform scale-y-[-1]"
            animate={{ 
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </section>
  );
}
