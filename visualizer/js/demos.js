// ─────────────────────────────────────────────────────────────
// Demo datasets
// ─────────────────────────────────────────────────────────────
export const DEMOS = [
  {
    label: 'Sales Orders', sub: 'Flat array',
    title: 'Flat array of orders — sort, filter, search, and export to CSV.',
    data: [
      { order_id: 'ORD-001', customer: 'Alice Brown',    product: 'Laptop Pro',     qty: 1, unit_price: 1299.99, total: 1299.99, status: 'shipped',   region: 'West'  },
      { order_id: 'ORD-002', customer: 'Bob Chen',       product: 'Wireless Mouse', qty: 3, unit_price:   29.99, total:   89.97, status: 'delivered', region: 'East'  },
      { order_id: 'ORD-003', customer: 'Carol Davis',    product: 'USB-C Hub',      qty: 2, unit_price:   49.99, total:   99.98, status: 'pending',   region: 'North' },
      { order_id: 'ORD-004', customer: 'Dave Evans',     product: 'Laptop Pro',     qty: 1, unit_price: 1299.99, total: 1299.99, status: 'shipped',   region: 'East'  },
      { order_id: 'ORD-005', customer: 'Eve Foster',     product: 'Monitor 27"',    qty: 1, unit_price:  399.00, total:  399.00, status: 'delivered', region: 'West'  },
      { order_id: 'ORD-006', customer: 'Frank Garcia',   product: 'Mechanical KB',  qty: 2, unit_price:   89.99, total:  179.98, status: 'pending',   region: 'South' },
      { order_id: 'ORD-007', customer: 'Grace Hall',     product: 'Webcam HD',      qty: 1, unit_price:   79.99, total:   79.99, status: 'returned',  region: 'West'  },
      { order_id: 'ORD-008', customer: 'Hank Irving',    product: 'USB-C Hub',      qty: 4, unit_price:   49.99, total:  199.96, status: 'shipped',   region: 'North' },
      { order_id: 'ORD-009', customer: 'Iris James',     product: 'Wireless Mouse', qty: 1, unit_price:   29.99, total:   29.99, status: 'delivered', region: 'East'  },
      { order_id: 'ORD-010', customer: 'Jack Kim',       product: 'Monitor 27"',    qty: 2, unit_price:  399.00, total:  798.00, status: 'shipped',   region: 'South' },
      { order_id: 'ORD-011', customer: 'Karen Lee',      product: 'Laptop Pro',     qty: 1, unit_price: 1299.99, total: 1299.99, status: 'delivered', region: 'West'  },
      { order_id: 'ORD-012', customer: 'Leo Martin',     product: 'Webcam HD',      qty: 3, unit_price:   79.99, total:  239.97, status: 'pending',   region: 'North' }
    ]
  },
  {
    label: 'Events log', sub: 'Flat array',
    title: 'Simple flat list — timestamps, level, message. Good for log-style data.',
    data: [
      { ts: '2024-01-15T09:00:00Z', level: 'info',  message: 'Server started',        source: 'api' },
      { ts: '2024-01-15T09:01:22Z', level: 'warn',  message: 'High memory usage',     source: 'worker' },
      { ts: '2024-01-15T09:05:11Z', level: 'error', message: 'Connection timeout',    source: 'api' },
      { ts: '2024-01-15T09:12:00Z', level: 'info',  message: 'Cache warmed',          source: 'cron' },
      { ts: '2024-01-15T09:15:33Z', level: 'debug', message: 'Request completed',     source: 'api' },
      { ts: '2024-01-15T09:20:01Z', level: 'info',  message: 'Backup finished',        source: 'cron' },
      { ts: '2024-01-15T09:22:44Z', level: 'warn',  message: 'Retry attempt 2/3',     source: 'worker' },
      { ts: '2024-01-15T09:30:00Z', level: 'info',  message: 'Health check passed',   source: 'api' }
    ]
  },
  {
    label: 'Team Stats', sub: 'Grouped by department',
    title: 'Grouped by department — collapse groups, filter by column values.',
    data: {
      'Engineering': { members: [
        { name: 'Sam Torres',  role: 'Backend',  level: 'Senior', tickets_closed: 87, pr_reviews: 34, bugs_filed: 12, velocity: 42.5, satisfaction: 4.8 },
        { name: 'Mia Patel',   role: 'Frontend', level: 'Mid',    tickets_closed: 61, pr_reviews: 28, bugs_filed:  8, velocity: 36.0, satisfaction: 4.5 },
        { name: 'Raj Gupta',   role: 'DevOps',   level: 'Senior', tickets_closed: 45, pr_reviews: 19, bugs_filed:  5, velocity: 51.0, satisfaction: 4.9 },
        { name: 'Lily Zhang',  role: 'Backend',  level: 'Junior', tickets_closed: 33, pr_reviews: 11, bugs_filed: 15, velocity: 24.0, satisfaction: 4.2 },
        { name: 'Owen Clarke', role: 'QA',       level: 'Mid',    tickets_closed: 72, pr_reviews:  8, bugs_filed: 41, velocity: 38.5, satisfaction: 4.6 }
      ]},
      'Product': { members: [
        { name: 'Nina Ross', role: 'PM',       level: 'Senior', tickets_closed: 21, pr_reviews: 5, bugs_filed: 3, velocity: 28.0, satisfaction: 4.7 },
        { name: 'Tom Baker', role: 'Designer', level: 'Mid',    tickets_closed: 18, pr_reviews: 9, bugs_filed: 2, velocity: 22.0, satisfaction: 4.4 },
        { name: 'Amy Chen',  role: 'PM',       level: 'Junior', tickets_closed: 14, pr_reviews: 3, bugs_filed: 1, velocity: 18.5, satisfaction: 4.1 }
      ]},
      'Marketing': { members: [
        { name: 'Dan Kim',   role: 'Growth',  level: 'Senior', tickets_closed: 12, pr_reviews: 2, bugs_filed: 0, velocity: 15.0, satisfaction: 4.6 },
        { name: 'Sara Hill', role: 'Content', level: 'Mid',    tickets_closed:  9, pr_reviews: 1, bugs_filed: 0, velocity: 11.0, satisfaction: 4.3 },
        { name: 'Jake Ford', role: 'SEO',     level: 'Junior', tickets_closed:  6, pr_reviews: 0, bugs_filed: 0, velocity:  8.5, satisfaction: 3.9 }
      ]},
      'Sales': { members: [
        { name: 'Cleo Ward', role: 'AE',  level: 'Senior', tickets_closed: 31, pr_reviews: 1, bugs_filed: 2, velocity: 19.0, satisfaction: 4.8 },
        { name: 'Ben Stone', role: 'SDR', level: 'Junior', tickets_closed: 28, pr_reviews: 0, bugs_filed: 1, velocity: 16.5, satisfaction: 4.2 },
        { name: 'Zoe Marsh', role: 'AE',  level: 'Mid',    tickets_closed: 35, pr_reviews: 2, bugs_filed: 3, velocity: 21.0, satisfaction: 4.5 }
      ]}
    }
  },
  {
    label: 'Project Activity', sub: 'Grouped + nested history',
    title: 'Grouped by project with period metrics — use Pivot to pick a user and metric across projects.',
    data: {
      'COSP': { users: [
        { name: 'Dave',  role: 'lead',     history: { '12m': { tickets: 14, dynamic_percentage: 13.3 }, '6m': { tickets: 6,  dynamic_percentage: 17.1 }, '3m': { tickets: 0, dynamic_percentage: 0.0  }, '1m': { tickets: 0, dynamic_percentage: 0.0  } } },
        { name: 'Alice', role: 'member',   history: { '12m': { tickets:  8, dynamic_percentage:  8.4 }, '6m': { tickets: 4,  dynamic_percentage: 11.2 }, '3m': { tickets: 2, dynamic_percentage: 9.5  }, '1m': { tickets: 1, dynamic_percentage: 7.3  } } },
        { name: 'Bob',   role: 'member',   history: { '12m': { tickets:  5, dynamic_percentage:  5.1 }, '6m': { tickets: 3,  dynamic_percentage:  7.8 }, '3m': { tickets: 1, dynamic_percentage: 4.2  }, '1m': { tickets: 0, dynamic_percentage: 0.0  } } }
      ]},
      'ACME': { users: [
        { name: 'Dave',  role: 'member',   history: { '12m': { tickets:  9, dynamic_percentage: 11.2 }, '6m': { tickets: 4,  dynamic_percentage: 12.5 }, '3m': { tickets: 1, dynamic_percentage: 5.1  }, '1m': { tickets: 2, dynamic_percentage: 8.4  } } },
        { name: 'Carol', role: 'lead',     history: { '12m': { tickets: 22, dynamic_percentage: 19.7 }, '6m': { tickets: 11, dynamic_percentage: 22.4 }, '3m': { tickets: 5, dynamic_percentage: 18.3 }, '1m': { tickets: 3, dynamic_percentage: 14.6 } } },
        { name: 'Alice', role: 'reviewer', history: { '12m': { tickets: 11, dynamic_percentage: 10.8 }, '6m': { tickets: 5,  dynamic_percentage: 13.1 }, '3m': { tickets: 3, dynamic_percentage: 11.4 }, '1m': { tickets: 1, dynamic_percentage: 6.2  } } }
      ]},
      'NOVA': { users: [
        { name: 'Dave',  role: 'observer', history: { '12m': { tickets:  3, dynamic_percentage:  4.1 }, '6m': { tickets: 2,  dynamic_percentage:  5.8 }, '3m': { tickets: 0, dynamic_percentage: 0.0  }, '1m': { tickets: 0, dynamic_percentage: 0.0  } } },
        { name: 'Eve',   role: 'lead',     history: { '12m': { tickets: 31, dynamic_percentage: 24.6 }, '6m': { tickets: 16, dynamic_percentage: 28.3 }, '3m': { tickets: 7, dynamic_percentage: 21.5 }, '1m': { tickets: 4, dynamic_percentage: 17.9 } } },
        { name: 'Bob',   role: 'member',   history: { '12m': { tickets:  7, dynamic_percentage:  7.9 }, '6m': { tickets: 4,  dynamic_percentage:  9.4 }, '3m': { tickets: 2, dynamic_percentage: 7.1  }, '1m': { tickets: 1, dynamic_percentage: 5.3  } } }
      ]},
      'DELTA': { users: [
        { name: 'Carol', role: 'member',   history: { '12m': { tickets: 15, dynamic_percentage: 14.2 }, '6m': { tickets: 7,  dynamic_percentage: 16.8 }, '3m': { tickets: 4, dynamic_percentage: 13.7 }, '1m': { tickets: 2, dynamic_percentage: 11.2 } } },
        { name: 'Alice', role: 'lead',     history: { '12m': { tickets: 18, dynamic_percentage: 16.9 }, '6m': { tickets: 9,  dynamic_percentage: 19.3 }, '3m': { tickets: 5, dynamic_percentage: 15.8 }, '1m': { tickets: 3, dynamic_percentage: 12.7 } } }
      ]}
    }
  },
  {
    label: 'People per project', sub: 'Pivot by person · see user info',
    title: 'People per project — pivot by person to see hours/tasks across projects; click a row to see full user info.',
    data: {
      'Platform': { people: [
        { name: 'Jordan Lee',   email: 'jordan@co.io',     role: 'Tech Lead',   allocation: { '12m': { hours: 420, tasks: 48 }, '6m': { hours: 210, tasks: 24 }, '3m': { hours: 105, tasks: 12 }, '1m': { hours: 38, tasks: 4 } } },
        { name: 'Sam Chen',     email: 'sam@co.io',       role: 'Backend',    allocation: { '12m': { hours: 380, tasks: 42 }, '6m': { hours: 190, tasks: 21 }, '3m': { hours: 92, tasks: 10 }, '1m': { hours: 32, tasks: 3 } } },
        { name: 'Alex Rivera',  email: 'alex@co.io',       role: 'Frontend',   allocation: { '12m': { hours: 360, tasks: 38 }, '6m': { hours: 178, tasks: 19 }, '3m': { hours: 88, tasks: 9 }, '1m': { hours: 30, tasks: 3 } } },
        { name: 'Morgan Kim',   email: 'morgan@co.io',     role: 'QA',         allocation: { '12m': { hours: 320, tasks: 35 }, '6m': { hours: 158, tasks: 17 }, '3m': { hours: 78, tasks: 8 }, '1m': { hours: 26, tasks: 2 } } }
      ]},
      'Mobile': { people: [
        { name: 'Jordan Lee',   email: 'jordan@co.io',     role: 'Tech Lead',   allocation: { '12m': { hours: 80, tasks: 8 }, '6m': { hours: 42, tasks: 4 }, '3m': { hours: 20, tasks: 2 }, '1m': { hours: 6, tasks: 1 } } },
        { name: 'Sam Chen',     email: 'sam@co.io',       role: 'Backend',    allocation: { '12m': { hours: 120, tasks: 12 }, '6m': { hours: 58, tasks: 6 }, '3m': { hours: 28, tasks: 3 }, '1m': { hours: 10, tasks: 1 } } },
        { name: 'Casey Wong',  email: 'casey@co.io',     role: 'Mobile',    allocation: { '12m': { hours: 400, tasks: 44 }, '6m': { hours: 198, tasks: 22 }, '3m': { hours: 98, tasks: 11 }, '1m': { hours: 34, tasks: 4 } } },
        { name: 'Riley Park',  email: 'riley@co.io',      role: 'Mobile',    allocation: { '12m': { hours: 350, tasks: 36 }, '6m': { hours: 172, tasks: 18 }, '3m': { hours: 85, tasks: 9 }, '1m': { hours: 28, tasks: 3 } } }
      ]},
      'Data': { people: [
        { name: 'Alex Rivera',  email: 'alex@co.io',       role: 'Frontend',   allocation: { '12m': { hours: 60, tasks: 6 }, '6m': { hours: 30, tasks: 3 }, '3m': { hours: 14, tasks: 1 }, '1m': { hours: 4, tasks: 0 } } },
        { name: 'Morgan Kim',   email: 'morgan@co.io',     role: 'QA',         allocation: { '12m': { hours: 180, tasks: 20 }, '6m': { hours: 88, tasks: 10 }, '3m': { hours: 44, tasks: 5 }, '1m': { hours: 15, tasks: 2 } } },
        { name: 'Casey Wong',   email: 'casey@co.io',     role: 'Mobile',    allocation: { '12m': { hours: 40, tasks: 4 }, '6m': { hours: 20, tasks: 2 }, '3m': { hours: 10, tasks: 1 }, '1m': { hours: 3, tasks: 0 } } },
        { name: 'Jamie Fox',    email: 'jamie@co.io',     role: 'Data Eng',  allocation: { '12m': { hours: 440, tasks: 52 }, '6m': { hours: 218, tasks: 26 }, '3m': { hours: 108, tasks: 13 }, '1m': { hours: 36, tasks: 4 } } }
      ]}
    }
  },
  {
    label: 'SaaS Metrics', sub: 'Nested data, many columns',
    title: 'Grouped accounts with nested health by period — click nested cells to see period breakdown.',
    data: {
      'Growth': { accounts: [
        { name: 'Acme Corp',      tier: 'Enterprise', mrr: 12400, arr: 148800, seats: 240, active_seats: 198, usage_pct: 82.5, nps: 72, churn_risk: 'low',      csm: 'Leila', health: { '1m': { logins: 3200, tickets:  4 }, '3m': { logins:  9100, tickets: 11 }, '6m': { logins: 17800, tickets: 22 } } },
        { name: 'Globex',         tier: 'Growth',     mrr:  3200, arr:  38400, seats:  80, active_seats:  71, usage_pct: 88.8, nps: 61, churn_risk: 'low',      csm: 'Marco', health: { '1m': { logins:  910, tickets:  2 }, '3m': { logins:  2700, tickets:  5 }, '6m': { logins:  5200, tickets:  9 } } },
        { name: 'Initech',        tier: 'Startup',    mrr:   890, arr:  10680, seats:  20, active_seats:  11, usage_pct: 55.0, nps: 42, churn_risk: 'high',     csm: 'Leila', health: { '1m': { logins:  120, tickets:  7 }, '3m': { logins:   410, tickets: 18 }, '6m': { logins:   780, tickets: 31 } } }
      ]},
      'Expansion': { accounts: [
        { name: 'Hooli',          tier: 'Enterprise', mrr: 28600, arr: 343200, seats: 500, active_seats: 487, usage_pct: 97.4, nps: 81, churn_risk: 'low',      csm: 'Priya', health: { '1m': { logins: 8100, tickets:  6 }, '3m': { logins: 23400, tickets: 14 }, '6m': { logins: 45900, tickets: 27 } } },
        { name: 'Umbrella Co',    tier: 'Growth',     mrr:  5600, arr:  67200, seats: 120, active_seats:  96, usage_pct: 80.0, nps: 55, churn_risk: 'medium',   csm: 'Marco', health: { '1m': { logins: 1400, tickets:  9 }, '3m': { logins:  4100, tickets: 21 }, '6m': { logins:  7800, tickets: 38 } } },
        { name: 'Dunder Mifflin', tier: 'Startup',    mrr:  1200, arr:  14400, seats:  30, active_seats:  27, usage_pct: 90.0, nps: 68, churn_risk: 'low',      csm: 'Priya', health: { '1m': { logins:  390, tickets:  1 }, '3m': { logins:  1100, tickets:  3 }, '6m': { logins:  2100, tickets:  6 } } }
      ]},
      'At Risk': { accounts: [
        { name: 'Vandelay',       tier: 'Growth',     mrr:  2900, arr:  34800, seats:  60, active_seats:  22, usage_pct: 36.7, nps: 28, churn_risk: 'critical', csm: 'Leila', health: { '1m': { logins:  180, tickets: 14 }, '3m': { logins:   540, tickets: 38 }, '6m': { logins:   990, tickets: 61 } } },
        { name: 'Massive Dyn',    tier: 'Enterprise', mrr:  8100, arr:  97200, seats: 180, active_seats:  91, usage_pct: 50.6, nps: 33, churn_risk: 'high',     csm: 'Marco', health: { '1m': { logins:  820, tickets: 19 }, '3m': { logins:  2300, tickets: 47 }, '6m': { logins:  4100, tickets: 88 } } }
      ]}
    }
  }
];
