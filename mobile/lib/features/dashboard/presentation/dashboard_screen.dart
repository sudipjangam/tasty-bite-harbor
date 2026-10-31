import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/supabase_config.dart';
import '../../../core/access/access_controller.dart';

class DashboardScreen extends StatefulWidget {
  final VoidCallback? onNavigateToPos;
  final VoidCallback? onNavigateToKitchen;
  final VoidCallback? onNavigateToCheckTables;

  const DashboardScreen({
    super.key,
    this.onNavigateToPos,
    this.onNavigateToKitchen,
    this.onNavigateToCheckTables,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isLoading = false;
  String _chartPeriod = 'today'; // today, yesterday, 7d
  final currencyFormatter = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 0,
  );

  // Dashboard Stats
  double _todayRevenue = 48250;
  int _totalOrders = 128;
  final int _activeTables = 8;
  final int _totalTables = 12;
  final int _kitchenPending = 5;

  List<Map<String, dynamic>> _recentOrders = [];

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);

    try {
      final restaurantId = AccessController().restaurantId;
      if (restaurantId != null && restaurantId.isNotEmpty) {
        // Fetch recent orders from supabase
        final ordersRes = await SupabaseConfig.client
            .from('orders')
            .select('id, order_number, table_name, customer_name, status, total, created_at, order_type')
            .eq('restaurant_id', restaurantId)
            .order('created_at', ascending: false)
            .limit(6);

        if (ordersRes.isNotEmpty) {
          _recentOrders = List<Map<String, dynamic>>.from(ordersRes);
          final computedTotal = ordersRes.fold<double>(0.0, (acc, item) {
            final t = item['total'];
            return acc +
                ((t is num)
                    ? t.toDouble()
                    : double.tryParse(t?.toString() ?? '0') ?? 0.0);
          });
          if (computedTotal > 0) {
            _todayRevenue = computedTotal;
          }
          _totalOrders = ordersRes.length;
        }
      }
    } catch (e) {
      debugPrint('[DashboardScreen] Supabase fetch fallback: $e');
    }

    if (_recentOrders.isEmpty && kDebugMode) {
      _recentOrders = [
        {
          'id': 'TB-2041',
          'customer_name': 'Aarav Patel',
          'order_type': 'dine_in',
          'table_name': 'T-01',
          'total': 840,
          'status': 'preparing',
          'created_at': DateTime.now()
              .subtract(const Duration(minutes: 6))
              .toIso8601String(),
        },
        {
          'id': 'TB-2040',
          'customer_name': 'Pooja Sharma',
          'order_type': 'dine_in',
          'table_name': 'T-03',
          'total': 1850,
          'status': 'billed',
          'created_at': DateTime.now()
              .subtract(const Duration(minutes: 18))
              .toIso8601String(),
        },
        {
          'id': 'TB-2039',
          'customer_name': 'Rohan Gupta',
          'order_type': 'takeaway',
          'table_name': 'Counter #2',
          'total': 620,
          'status': 'ready',
          'created_at': DateTime.now()
              .subtract(const Duration(minutes: 25))
              .toIso8601String(),
        },
        {
          'id': 'TB-2038',
          'customer_name': 'Vikram Mehta',
          'order_type': 'dine_in',
          'table_name': 'T-04',
          'total': 3420,
          'status': 'preparing',
          'created_at': DateTime.now()
              .subtract(const Duration(minutes: 42))
              .toIso8601String(),
        },
        {
          'id': 'TB-2037',
          'customer_name': 'Simran Kaur',
          'order_type': 'takeaway',
          'table_name': 'Online Swiggy',
          'total': 1140,
          'status': 'completed',
          'created_at': DateTime.now()
              .subtract(const Duration(minutes: 58))
              .toIso8601String(),
        },
      ];
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  List<FlSpot> _getChartSpots() {
    switch (_chartPeriod) {
      case 'yesterday':
        return const [
          FlSpot(9, 3200),
          FlSpot(11, 7500),
          FlSpot(13, 16800),
          FlSpot(15, 21500),
          FlSpot(17, 26000),
          FlSpot(19, 36200),
          FlSpot(21, 41800),
          FlSpot(23, 44100),
        ];
      case '7d':
        return const [
          FlSpot(1, 38000),
          FlSpot(2, 42100),
          FlSpot(3, 40500),
          FlSpot(4, 49200),
          FlSpot(5, 54300),
          FlSpot(6, 61000),
          FlSpot(7, 48250),
        ];
      case 'today':
      default:
        return const [
          FlSpot(9, 2400),
          FlSpot(11, 8900),
          FlSpot(13, 19400),
          FlSpot(15, 24200),
          FlSpot(17, 29800),
          FlSpot(19, 41200),
          FlSpot(21, 46900),
          FlSpot(23, 48250),
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.bgDark : AppColors.bgLight;
    final cardBg = isDark ? AppColors.cardDark : AppColors.cardLight;
    final text = isDark ? AppColors.textDark : AppColors.textLight;
    final textMuted = isDark
        ? AppColors.textMutedDark
        : AppColors.textMutedLight;
    final border = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadDashboardData,
          color: AppColors.primary,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              if (_isLoading)
                const SliverToBoxAdapter(
                  child: LinearProgressIndicator(
                    minHeight: 2,
                    color: AppColors.primary,
                  ),
                ),
              // Top Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'Tasty Bite Harbor',
                                style: GoogleFonts.poppins(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                  color: text,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 7,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.available.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: AppColors.available.withOpacity(0.3),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: const BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: AppColors.available,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      'LIVE',
                                      style: GoogleFonts.inter(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.available,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            DateFormat(
                              'EEEE, d MMMM yyyy',
                            ).format(DateTime.now()),
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: textMuted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: cardBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: border),
                        ),
                        child: IconButton(
                          padding: EdgeInsets.zero,
                          icon: Icon(LucideIcons.bell, size: 20, color: text),
                          onPressed: () {},
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Quick Action Buttons
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: _buildQuickActionBtn(
                          title: 'New Order',
                          subtitle: 'Fast POS',
                          icon: LucideIcons.plusCircle,
                          gradient: AppGradients.qsrPos,
                          onTap: widget.onNavigateToPos,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildQuickActionBtn(
                          title: 'View Kitchen',
                          subtitle: '$_kitchenPending Tickets',
                          icon: LucideIcons.chefHat,
                          gradient: AppGradients.kitchen,
                          onTap: widget.onNavigateToKitchen,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildQuickActionBtn(
                          title: 'Check Tables',
                          subtitle: '$_activeTables Active',
                          icon: LucideIcons.grid,
                          gradient: AppGradients.orders,
                          onTap: widget.onNavigateToCheckTables,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Quick Stats Row (2x2 grid on mobile for optimal legibility)
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverGrid.count(
                  crossAxisCount: 2,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 1.05,
                  children: [
                    _buildStatCard(
                      title: "Today's Revenue",
                      value: currencyFormatter.format(_todayRevenue),
                      trend: '+14.8%',
                      isPositiveTrend: true,
                      icon: LucideIcons.indianRupee,
                      accentColor: AppColors.primary,
                    ),
                    _buildStatCard(
                      title: 'Total Orders',
                      value: '$_totalOrders',
                      trend: '+9.2%',
                      isPositiveTrend: true,
                      icon: LucideIcons.shoppingBag,
                      accentColor: const Color(0xFFF59E0B),
                    ),
                    _buildStatCard(
                      title: 'Active Tables',
                      value: '$_activeTables / $_totalTables',
                      subtitle: '67% Occupancy',
                      icon: LucideIcons.layoutGrid,
                      accentColor: AppColors.occupied,
                    ),
                    _buildStatCard(
                      title: 'Kitchen Pending',
                      value: '$_kitchenPending Tickets',
                      subtitle: 'Avg Prep: 14 mins',
                      icon: LucideIcons.flame,
                      accentColor: AppColors.destructive,
                    ),
                  ],
                ),
              ),

              // Live Revenue Line Chart Section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(color: border),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.03),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Chart Header (Responsive Wrap allows title and period tabs to stack or wrap on narrow viewports)
                        Wrap(
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Revenue Velocity',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.poppins(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: text,
                                  ),
                                ),
                                Text(
                                  'Sample cumulative earnings',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(
                                    fontSize: 11.5,
                                    color: textMuted,
                                  ),
                                ),
                              ],
                            ),
                            // Filter Pills
                            Container(
                              padding: const EdgeInsets.all(2),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? const Color(0xFF131D2E)
                                    : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _buildPeriodTab('Today', 'today'),
                                  _buildPeriodTab('Yday', 'yesterday'),
                                  _buildPeriodTab('7D', '7d'),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // Line Chart
                        SizedBox(
                          height: 190,
                          child: LineChart(
                            LineChartData(
                              gridData: FlGridData(
                                show: true,
                                drawVerticalLine: false,
                                horizontalInterval: 15000,
                                getDrawingHorizontalLine: (value) => FlLine(
                                  color: border.withOpacity(0.6),
                                  strokeWidth: 1,
                                  dashArray: [4, 4],
                                ),
                              ),
                              titlesData: FlTitlesData(
                                show: true,
                                rightTitles: const AxisTitles(
                                  sideTitles: SideTitles(showTitles: false),
                                ),
                                topTitles: const AxisTitles(
                                  sideTitles: SideTitles(showTitles: false),
                                ),
                                leftTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    reservedSize: 38,
                                    interval: 20000,
                                    getTitlesWidget: (value, meta) {
                                      if (value == 0) return const SizedBox();
                                      return Text(
                                        '${(value / 1000).toInt()}k',
                                        style: GoogleFonts.inter(
                                          color: textMuted,
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      );
                                    },
                                  ),
                                ),
                                bottomTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    reservedSize: 26,
                                    getTitlesWidget: (value, meta) {
                                      if (_chartPeriod == '7d') {
                                        const days = [
                                          'Mon',
                                          'Tue',
                                          'Wed',
                                          'Thu',
                                          'Fri',
                                          'Sat',
                                          'Sun',
                                        ];
                                        final idx = (value.toInt() - 1).clamp(
                                          0,
                                          6,
                                        );
                                        return Padding(
                                          padding: const EdgeInsets.only(
                                            top: 6,
                                          ),
                                          child: Text(
                                            days[idx],
                                            style: GoogleFonts.inter(
                                              color: textMuted,
                                              fontSize: 10.5,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        );
                                      }

                                      String label = '';
                                      if (value == 9) label = '9 AM';
                                      if (value == 13) label = '1 PM';
                                      if (value == 17) label = '5 PM';
                                      if (value == 21) label = '9 PM';

                                      if (label.isEmpty) {
                                        return const SizedBox();
                                      }

                                      return Padding(
                                        padding: const EdgeInsets.only(top: 6),
                                        child: Text(
                                          label,
                                          style: GoogleFonts.inter(
                                            color: textMuted,
                                            fontSize: 10.5,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              ),
                              borderData: FlBorderData(show: false),
                              minX: _chartPeriod == '7d' ? 1 : 9,
                              maxX: _chartPeriod == '7d' ? 7 : 23,
                              minY: 0,
                              maxY: _chartPeriod == '7d' ? 65000 : 52000,
                              lineTouchData: LineTouchData(
                                touchTooltipData: LineTouchTooltipData(
                                  getTooltipColor: (_) => cardBg,
                                  getTooltipItems: (touchedSpots) {
                                    return touchedSpots.map((spot) {
                                      return LineTooltipItem(
                                        currencyFormatter.format(spot.y),
                                        GoogleFonts.poppins(
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 12,
                                        ),
                                      );
                                    }).toList();
                                  },
                                ),
                              ),
                              lineBarsData: [
                                LineChartBarData(
                                  spots: _getChartSpots(),
                                  isCurved: true,
                                  curveSmoothness: 0.35,
                                  barWidth: 3.2,
                                  color: AppColors.primary,
                                  isStrokeCapRound: true,
                                  dotData: FlDotData(
                                    show: true,
                                    getDotPainter:
                                        (spot, percent, barData, index) {
                                          return FlDotCirclePainter(
                                            radius:
                                                index ==
                                                    barData.spots.length - 1
                                                ? 5
                                                : 0,
                                            color: AppColors.primary,
                                            strokeWidth: 2.5,
                                            strokeColor: Colors.white,
                                          );
                                        },
                                  ),
                                  belowBarData: BarAreaData(
                                    show: true,
                                    gradient: LinearGradient(
                                      begin: Alignment.topCenter,
                                      end: Alignment.bottomCenter,
                                      colors: [
                                        AppColors.primary.withOpacity(0.28),
                                        AppColors.primary.withOpacity(0.0),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // Recent Orders Section Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Recent Orders',
                        style: GoogleFonts.poppins(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: text,
                        ),
                      ),
                      TextButton(
                        onPressed: widget.onNavigateToPos,
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          'View All',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Recent Orders List
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final order = _recentOrders[index];
                    return _buildRecentOrderTile(order);
                  }, childCount: _recentOrders.length),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionBtn({
    required String title,
    required String subtitle,
    required IconData icon,
    required LinearGradient gradient,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: gradient.colors.first.withOpacity(0.3),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          children: [
            Icon(icon, color: Colors.white, size: 22),
            const SizedBox(height: 6),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 12.5,
              ),
            ),
            Text(
              subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                color: Colors.white.withOpacity(0.85),
                fontSize: 10.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    String? trend,
    bool isPositiveTrend = true,
    String? subtitle,
    required IconData icon,
    required Color accentColor,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.cardDark : AppColors.cardLight;
    final text = isDark ? AppColors.textDark : AppColors.textLight;
    final textMuted = isDark
        ? AppColors.textMutedDark
        : AppColors.textMutedLight;
    final border = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 10),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    color: textMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 14, color: accentColor),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  value,
                  maxLines: 1,
                  style: GoogleFonts.poppins(
                    fontSize: 16.5,
                    fontWeight: FontWeight.w700,
                    color: text,
                  ),
                ),
              ),
              const SizedBox(height: 2),
              if (trend != null)
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isPositiveTrend
                            ? LucideIcons.trendingUp
                            : LucideIcons.trendingDown,
                        size: 12,
                        color: isPositiveTrend
                            ? AppColors.available
                            : AppColors.destructive,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        '$trend vs yday',
                        maxLines: 1,
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          color: isPositiveTrend
                              ? AppColors.available
                              : AppColors.destructive,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                )
              else if (subtitle != null)
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    subtitle,
                    maxLines: 1,
                    style: GoogleFonts.inter(
                      fontSize: 10.5,
                      color: textMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodTab(String label, String period) {
    final isSelected = _chartPeriod == period;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () => setState(() => _chartPeriod = period),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.cardDark : Colors.white)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 4,
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11.5,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? AppColors.primary : Colors.grey,
          ),
        ),
      ),
    );
  }

  Widget _buildRecentOrderTile(Map<String, dynamic> order) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.cardDark : AppColors.cardLight;
    final text = isDark ? AppColors.textDark : AppColors.textLight;
    final textMuted = isDark
        ? AppColors.textMutedDark
        : AppColors.textMutedLight;
    final border = isDark ? AppColors.borderDark : AppColors.borderLight;

    final status = (order['status'] ?? 'pending').toString().toLowerCase();
    Color statusColor;
    String statusLabel;

    switch (status) {
      case 'completed':
      case 'paid':
        statusColor = AppColors.available;
        statusLabel = 'Completed';
        break;
      case 'preparing':
      case 'cooking':
        statusColor = AppColors.occupied;
        statusLabel = 'Preparing';
        break;
      case 'ready':
      case 'served':
      case 'billed':
        statusColor = AppColors.billed;
        statusLabel = 'Ready / Billed';
        break;
      case 'cancelled':
        statusColor = AppColors.destructive;
        statusLabel = 'Cancelled';
        break;
      default:
        statusColor = AppColors.reserved;
        statusLabel = 'Pending';
    }

    final total = (order['total'] is num)
        ? (order['total'] as num).toDouble()
        : double.tryParse(order['total']?.toString() ?? '0') ?? 0.0;

    final customer = order['customer_name'] ?? 'Walk-in Guest';
    final rawTable = order['table_name']?.toString().trim();
    final location = (rawTable != null && rawTable.isNotEmpty)
        ? rawTable
        : (order['order_type'] == 'takeaway'
            ? 'Takeaway'
            : (order['order_type'] == 'delivery' ? 'Delivery' : 'Dine-In'));
    final rawId = order['id']?.toString() ?? '';
    final orderNum = order['order_number']?.toString().trim();
    final shortId = (orderNum != null && orderNum.isNotEmpty)
        ? '#$orderNum'
        : (rawId.length > 8 ? '#${rawId.substring(0, 8)}' : '#$rawId');

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              order['order_type'] == 'takeaway'
                  ? LucideIcons.shoppingBag
                  : LucideIcons.utensils,
              size: 18,
              color: statusColor,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        shortId,
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: text,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text('•', style: TextStyle(color: textMuted)),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        location,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: textMuted,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  customer,
                  style: GoogleFonts.inter(fontSize: 12.5, color: textMuted),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                currencyFormatter.format(total),
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: text,
                ),
              ),
              const SizedBox(height: 3),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  statusLabel,
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
