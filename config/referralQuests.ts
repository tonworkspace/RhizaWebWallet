import { 
  Users, 
  Star, 
  Trophy, 
  Crown, 
  CircleDot, 
  Rocket, 
  Coins,
  ShieldCheck,
  Target
} from 'lucide-react';

export const RANKS = [
  { 
    level: 1, 
    name: 'Core Node',     
    min: 0,   
    max: 10,  
    color: '#6b7280', 
    glow: 'rgba(107,114,128,0.3)',  
    icon: CircleDot,  
    perks: ['50 RZC per referral', 'Basic dashboard access'] 
  },
  { 
    level: 2, 
    name: 'Silver Node',   
    min: 11,  
    max: 50,  
    color: '#60a5fa', 
    glow: 'rgba(96,165,250,0.3)',   
    icon: Star,       
    perks: ['50 RZC per referral', '10% package commission', 'Priority support'] 
  },
  { 
    level: 3, 
    name: 'Gold Node',     
    min: 51,  
    max: 99,  
    color: '#fbbf24', 
    glow: 'rgba(251,191,36,0.3)',   
    icon: Trophy,     
    perks: ['75 RZC per referral', '10% commission', 'Weekly team bonus', 'Gold badge'] 
  },
  { 
    level: 4, 
    name: 'Elite Partner', 
    min: 100, 
    max: null, 
    color: '#00FF88', 
    glow: 'rgba(0,255,136,0.3)',   
    icon: Crown,      
    perks: ['100 RZC per referral', '10% commission', 'Weekly team bonus', 'Elite badge', 'Creator perks'] 
  },
];

export const buildQuests = (downlineCount: number, rzcBalance: number, totalRzcCommissions: number) => [
  {
    id: 'first_ref',
    title: 'First Recruit',
    desc: 'Refer your first friend to Rhiza',
    reward: '50 RZC',
    icon: Rocket,
    target: 1,
    progress: Math.min(downlineCount, 1),
    color: '#00FF88',
    glow: 'rgba(0,255,136,0.2)',
  },
  {
    id: 'five_refs',
    title: 'Squad Builder',
    desc: 'Grow your network to 5 members',
    reward: '250 RZC',
    icon: Users,
    target: 5,
    progress: Math.min(downlineCount, 5),
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.2)',
  },
  {
    id: 'ten_refs',
    title: 'Node Expander',
    desc: 'Hit 10 direct referrals to unlock Silver',
    reward: 'Silver Rank',
    icon: Star,
    target: 10,
    progress: Math.min(downlineCount, 10),
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.2)',
  },
  {
    id: 'earn_500',
    title: 'Earner I',
    desc: 'Accumulate 500 RZC in your balance',
    reward: 'Earner Badge',
    icon: Coins,
    target: 500,
    progress: Math.min(rzcBalance, 500),
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.2)',
  },
  {
    id: 'team_sales',
    title: 'Networker',
    desc: 'Reach 1,000 RZC in total team commissions',
    reward: 'Bonus Boost',
    icon: ShieldCheck,
    target: 1000,
    progress: Math.min(totalRzcCommissions, 1000),
    color: '#f87171',
    glow: 'rgba(248,113,113,0.2)',
  }
];
