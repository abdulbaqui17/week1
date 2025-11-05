import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Zap, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FeaturesSection() {
  const features = [
    {
      icon: DollarSign,
      title: '$5,000 Starting Balance',
      description: 'Every new user gets $5,000 to start trading immediately. No deposit required.',
      color: 'blue',
    },
    {
      icon: TrendingUp,
      title: 'Up to 100x Leverage',
      description: 'Amplify your trading power with flexible leverage options from 1x to 100x.',
      color: 'purple',
    },
    {
      icon: Zap,
      title: 'Real-Time Trading',
      description: 'Live price feeds and instant order execution with WebSocket technology.',
      color: 'emerald',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your account and trades are protected with industry-standard security.',
      color: 'pink',
    },
  ];

  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    pink: 'from-pink-500/10 to-pink-500/5 border-pink-500/20 text-pink-400',
  };

  return (
    <section id="features" className="relative py-24 bg-slate-950">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Why Choose <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">exness</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Everything you need for professional crypto trading in one powerful platform
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
              className={`relative group p-6 bg-gradient-to-br ${colorClasses[feature.color as keyof typeof colorClasses]} border rounded-2xl backdrop-blur-sm`}
            >
              {/* Icon */}
              <div className="mb-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.description}</p>

              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity" />
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <Link
            to="/signup"
            className="inline-block px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-bold text-lg transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-105"
          >
            Start Trading Now
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
