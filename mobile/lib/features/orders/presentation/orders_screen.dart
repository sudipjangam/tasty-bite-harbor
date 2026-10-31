import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/supabase_config.dart';
import '../../../core/access/access_controller.dart';
import '../../../core/hardware/thermal_printer_service.dart';
import '../../pos/models/pos_models.dart';
import '../../pos/presentation/payment_dialog.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final currencyFormatter = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
  final timeFormatter = DateFormat('hh:mm a');
  final TextEditingController _searchController = TextEditingController();

  List<Map<String, dynamic>> _orders = [];
  bool _isLoading = true;
  String _selectedStatus = 'all'; // all, pending, preparing, ready, completed, held, cancelled, pay_later
  String _dateFilter = 'today';   // today, yesterday, 7days, all
  final String _sourceFilter = 'all';   // all, pos, qsr, table, swiggy, zomato
  String _sortBy = 'newest';      // newest, oldest, highest

  RealtimeChannel? _ordersSubscription;

  @override
  void initState() {
    super.initState();
    _loadOrders();
    _setupRealtimeSubscription();
  }

  @override
  void dispose() {
    _ordersSubscription?.unsubscribe();
    _searchController.dispose();
    super.dispose();
  }

  void _setupRealtimeSubscription() {
    final restaurantId = AccessController().restaurantId;
    if (restaurantId == null || restaurantId.isEmpty) return;

    try {
      _ordersSubscription = SupabaseConfig.client
          .channel('public:orders:$restaurantId')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'orders',
            filter: PostgresChangeFilter(
              type: PostgresChangeFilterType.eq,
              column: 'restaurant_id',
              value: restaurantId,
            ),
            callback: (payload) {
              _loadOrders(silent: true);
            },
          )
          .subscribe();
    } catch (e) {
      debugPrint('[OrdersScreen] Realtime error: $e');
    }
  }

  Future<void> _loadOrders({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);
    final restaurantId = AccessController().restaurantId;
    if (restaurantId != null && restaurantId.isNotEmpty) {
      try {
        var query = SupabaseConfig.client
            .from('orders')
            .select('*, order_items(*)')
            .eq('restaurant_id', restaurantId);

        // Date filter
        final now = DateTime.now();
        final startOfTodayUtc = DateTime(now.year, now.month, now.day).toUtc().toIso8601String();
        if (_dateFilter == 'today') {
          query = query.gte('created_at', startOfTodayUtc);
        } else if (_dateFilter == 'yesterday') {
          final yday = now.subtract(const Duration(days: 1));
          final startYdayUtc = DateTime(yday.year, yday.month, yday.day).toUtc().toIso8601String();
          query = query.gte('created_at', startYdayUtc).lt('created_at', startOfTodayUtc);
        } else if (_dateFilter == '7days') {
          final sevenDaysAgoUtc = now.subtract(const Duration(days: 7)).toUtc().toIso8601String();
          query = query.gte('created_at', sevenDaysAgoUtc);
        }

        if (_sourceFilter != 'all') {
          query = query.eq('source', _sourceFilter);
        }

        final res = await query.order('created_at', ascending: false).limit(100);

        if (mounted) {
          setState(() {
            _orders = List<Map<String, dynamic>>.from(res);
            _isLoading = false;
          });
          return;
        }
      } catch (e) {
        debugPrint('[OrdersScreen] Load orders error: $e');
      }
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  // ─── Filter & Sort Calculations ────────────────────────────────────────────

  List<Map<String, dynamic>> get _filteredOrders {
    final query = _searchController.text.trim().toLowerCase();
    var list = _orders.where((o) {
      final status = (o['status'] ?? '').toString().toLowerCase();
      final paymentMethod = (o['payment_method'] ?? '').toString().toLowerCase();

      // Status filter
      if (_selectedStatus == 'pay_later') {
        if (paymentMethod != 'pay_later') return false;
      } else if (_selectedStatus != 'all') {
        if (status != _selectedStatus) return false;
      }

      // Search query
      if (query.isNotEmpty) {
        final id = (o['id'] ?? '').toString().toLowerCase();
        final num = (o['order_number'] ?? '').toString().toLowerCase();
        final cust = (o['customer_name'] ?? '').toString().toLowerCase();
        final tbl = (o['table_name'] ?? '').toString().toLowerCase();
        final phone = (o['customer_phone'] ?? '').toString().toLowerCase();
        if (!id.contains(query) &&
            !num.contains(query) &&
            !cust.contains(query) &&
            !tbl.contains(query) &&
            !phone.contains(query)) {
          return false;
        }
      }
      return true;
    }).toList();

    // Sort
    if (_sortBy == 'oldest') {
      list.sort((a, b) => (a['created_at'] ?? '').compareTo(b['created_at'] ?? ''));
    } else if (_sortBy == 'highest') {
      list.sort((a, b) {
        final totalA = (a['total'] is num) ? (a['total'] as num).toDouble() : 0.0;
        final totalB = (b['total'] is num) ? (b['total'] as num).toDouble() : 0.0;
        return totalB.compareTo(totalA);
      });
    }

    return list;
  }

  // ─── KPI Stats ─────────────────────────────────────────────────────────────

  int get _activeCount => _orders.where((o) {
        final s = (o['status'] ?? '').toString().toLowerCase();
        return s == 'pending' || s == 'preparing' || s == 'ready' || s == 'held';
      }).length;

  int get _completedCount => _orders.where((o) => (o['status'] ?? '').toString().toLowerCase() == 'completed').length;

  double get _totalRevenue => _orders.where((o) {
        final s = (o['status'] ?? '').toString().toLowerCase();
        final type = (o['order_type'] ?? '').toString().toLowerCase();
        return s == 'completed' && type != 'nc' && type != 'non-chargeable';
      }).fold(0.0, (sum, o) => sum + ((o['total'] is num) ? (o['total'] as num).toDouble() : 0.0));

  // ─── Order Actions ─────────────────────────────────────────────────────────

  Future<void> _updateOrderStatus(String orderId, String newStatus) async {
    try {
      await SupabaseConfig.client
          .from('orders')
          .update({'status': newStatus, 'updated_at': DateTime.now().toUtc().toIso8601String()})
          .eq('id', orderId);

      // Sync linked kitchen orders
      final updateData = <String, dynamic>{'status': newStatus};
      if (newStatus == 'completed' || newStatus == 'cancelled') {
        updateData['bumped_at'] = DateTime.now().toUtc().toIso8601String();
      } else if (newStatus == 'pending') {
        updateData['bumped_at'] = null;
      }
      await SupabaseConfig.client.from('kitchen_orders').update(updateData).eq('order_id', orderId);

      _loadOrders(silent: true);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Order status updated to ${newStatus.toUpperCase()}'),
          backgroundColor: AppColors.available,
          duration: const Duration(seconds: 1),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update status: $e'), backgroundColor: AppColors.destructive),
      );
    }
  }

  Future<void> _updateOrderPriority(String orderId, String newPriority) async {
    final access = AccessController();
    final hasManage = access.hasPermission('orders.manage') ||
        access.hasPermission('orders.update') ||
        access.isAdmin;
    if (!hasManage) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Access denied: orders manage permission required'),
          backgroundColor: AppColors.destructive,
        ),
      );
      return;
    }

    try {
      await SupabaseConfig.client.from('orders').update({'priority': newPriority}).eq('id', orderId);
      await SupabaseConfig.client.from('kitchen_orders').update({'priority': newPriority}).eq('order_id', orderId);
      _loadOrders(silent: true);
    } catch (e) {
      debugPrint('[OrdersScreen] Priority update error: $e');
    }
  }

  Future<void> _printReceipt(Map<String, dynamic> order) async {
    try {
      final service = ThermalPrinterService();
      final items = (order['order_items'] is List) ? (order['order_items'] as List) : [];
      final total = (order['total'] is num) ? (order['total'] as num).toDouble() : 0.0;
      final subtotal = (order['subtotal'] is num) ? (order['subtotal'] as num).toDouble() : total;
      final rawId = order['id']?.toString() ?? '';
      final shortId = (order['order_number'] != null && order['order_number'].toString().isNotEmpty)
          ? order['order_number'].toString()
          : (rawId.length > 8 ? rawId.substring(0, 8) : rawId);

      final access = AccessController();
      final bytes = service.buildReceiptBytes(
        restaurantName: access.restaurantName ?? 'Kiwi',
        restaurantAddress: access.restaurantAddress,
        restaurantPhone: access.restaurantPhone,
        restaurantGstin: access.restaurantGstin,
        orderNumber: shortId,
        tableName: order['table_name']?.toString() ?? order['customer_name']?.toString() ?? 'POS',
        customerName: order['customer_name']?.toString(),
        serverName: access.serverName ?? 'Staff',
        orderDate: DateTime.tryParse(order['created_at']?.toString() ?? ''),
        items: items.map((i) => {
          'name': i['name'] ?? i['item_name'] ?? 'Item',
          'qty': i['quantity'] ?? 1,
          'rate': (i['price'] as num?)?.toDouble() ?? 0.0,
          'price': (i['price'] as num?)?.toDouble() ?? 0.0,
          'amount': (i['total'] as num?)?.toDouble() ?? ((i['price'] as num?)?.toDouble() ?? 0.0) * (i['quantity'] ?? 1),
        }).toList(),
        subtotal: subtotal,
        discount: (order['discount_amount'] as num?)?.toDouble() ?? (order['discount'] as num?)?.toDouble() ?? 0.0,
        tax: (order['tax_amount'] as num?)?.toDouble() ?? (order['tax'] as num?)?.toDouble() ?? 0.0,
        total: total,
        upiId: access.restaurantUpiVpa,
      );

      final ok = await service.printBuffer(bytes: bytes);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ok ? 'Receipt sent to printer! ✓' : 'Printer unreachable. Check Bluetooth or LAN.'),
          backgroundColor: ok ? AppColors.available : AppColors.destructive,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Print error: $e'), backgroundColor: AppColors.destructive),
      );
    }
  }

  void _showOrderDetails(Map<String, dynamic> order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => _buildOrderDetailsSheet(order),
    );
  }

  // ─── UI Build ──────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredOrders;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Orders Hub',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w800, fontSize: 19, color: const Color(0xFF1E293B)),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          // Sort Dropdown
          PopupMenuButton<String>(
            icon: const Icon(LucideIcons.arrowUpDown, size: 18, color: Color(0xFF475569)),
            tooltip: 'Sort Orders',
            onSelected: (val) => setState(() => _sortBy = val),
            itemBuilder: (ctx) => [
              const PopupMenuItem(value: 'newest', child: Text('Newest first')),
              const PopupMenuItem(value: 'oldest', child: Text('Oldest first')),
              const PopupMenuItem(value: 'highest', child: Text('Highest amount')),
            ],
          ),
          // Refresh Button
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18, color: Color(0xFF475569)),
            onPressed: () => _loadOrders(),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── 1. KPI Micro-Stats Header (1:1 with Web) ───────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 4, 14, 10),
            child: Row(
              children: [
                _buildKpiCard('Active', '$_activeCount', const Color(0xFFF97316), const Color(0xFFFB923C)),
                const SizedBox(width: 8),
                _buildKpiCard('Done', '$_completedCount', const Color(0xFF16A34A), const Color(0xFF22C55E)),
                const SizedBox(width: 8),
                _buildKpiCard('Latest 100', '${_orders.length}', const Color(0xFF2563EB), const Color(0xFF3B82F6)),
                const SizedBox(width: 8),
                _buildKpiCard('Revenue', currencyFormatter.format(_totalRevenue), const Color(0xFF8B5CF6), const Color(0xFFA855F7)),
              ],
            ),
          ),

          // ── 2. Search & Date Bar ───────────────────────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Search order #, table, customer...',
                      prefixIcon: const Icon(LucideIcons.search, size: 16),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                      filled: true,
                      fillColor: const Color(0xFFF1F5F9),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Date Filter Pill
                DropdownButtonHideUnderline(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: DropdownButton<String>(
                      value: _dateFilter,
                      icon: const Icon(LucideIcons.calendar, size: 14, color: Color(0xFF64748B)),
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                      items: const [
                        DropdownMenuItem(value: 'today', child: Text('Today')),
                        DropdownMenuItem(value: 'yesterday', child: Text('Yesterday')),
                        DropdownMenuItem(value: '7days', child: Text('Last 7D')),
                        DropdownMenuItem(value: 'all', child: Text('All Time')),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => _dateFilter = val);
                          _loadOrders();
                        }
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── 3. Status Tabs (8 Web Tabs) ────────────────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildTab('All', 'all', _orders.length),
                  _buildTab('New', 'pending', _orders.where((o) => o['status'] == 'pending').length),
                  _buildTab('Preparing', 'preparing', _orders.where((o) => o['status'] == 'preparing').length),
                  _buildTab('Ready', 'ready', _orders.where((o) => o['status'] == 'ready').length),
                  _buildTab('Completed', 'completed', _orders.where((o) => o['status'] == 'completed').length),
                  _buildTab('Held', 'held', _orders.where((o) => o['status'] == 'held').length),
                  _buildTab('Cancelled', 'cancelled', _orders.where((o) => o['status'] == 'cancelled').length),
                  _buildTab('💰 Pay Later', 'pay_later', _orders.where((o) => o['payment_method'] == 'pay_later').length),
                ],
              ),
            ),
          ),
          const Divider(height: 1),

          // ── 4. Orders List ─────────────────────────────────────────────────
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.receipt, size: 48, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            Text('No orders found', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => _loadOrders(),
                        child: ListView.builder(
                          padding: const EdgeInsets.all(14),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            return _buildOrderCard(filtered[index]);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard(String title, String value, Color col1, Color col2) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [col1, col2]),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(color: col1.withOpacity(0.25), blurRadius: 4, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          children: [
            Text(title.toUpperCase(), style: const TextStyle(color: Colors.white70, fontSize: 9.5, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
            const SizedBox(height: 2),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                value,
                style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTab(String label, String key, int count) {
    final isSel = _selectedStatus == key;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        label: Text('$label ($count)'),
        selected: isSel,
        selectedColor: const Color(0xFF1E3A8A),
        backgroundColor: const Color(0xFFF1F5F9),
        labelStyle: TextStyle(
          color: isSel ? Colors.white : const Color(0xFF475569),
          fontWeight: isSel ? FontWeight.bold : FontWeight.w600,
          fontSize: 11.5,
        ),
        onSelected: (val) {
          if (val) setState(() => _selectedStatus = key);
        },
      ),
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> order) {
    final rawId = order['id']?.toString() ?? '';
    final shortId = (order['order_number'] != null && order['order_number'].toString().isNotEmpty)
        ? '#${order['order_number']}'
        : (rawId.length > 8 ? '#${rawId.substring(0, 8)}' : '#$rawId');

    final status = (order['status'] ?? 'pending').toString().toLowerCase();
    final priority = (order['priority'] ?? 'normal').toString().toLowerCase();
    final orderType = (order['order_type'] ?? 'dine_in').toString().replaceAll('_', ' ').toUpperCase();
    final tableName = order['table_name']?.toString() ?? 'Table';
    final customer = order['customer_name']?.toString() ?? 'Guest';
    final total = (order['total'] is num) ? (order['total'] as num).toDouble() : double.tryParse(order['total']?.toString() ?? '0') ?? 0.0;
    final createdAt = DateTime.tryParse(order['created_at']?.toString() ?? '');
    final items = (order['order_items'] is List) ? (order['order_items'] as List) : [];
    final paymentMethod = (order['payment_method'] ?? '').toString().toUpperCase();

    Color statusColor;
    switch (status) {
      case 'completed':
        statusColor = const Color(0xFF16A34A);
        break;
      case 'preparing':
        statusColor = const Color(0xFFF97316);
        break;
      case 'ready':
        statusColor = const Color(0xFF0284C7);
        break;
      case 'cancelled':
        statusColor = const Color(0xFFDC2626);
        break;
      case 'held':
        statusColor = const Color(0xFF8B5CF6);
        break;
      default:
        statusColor = const Color(0xFFEAB308);
    }

    return GestureDetector(
      onTap: () => _showOrderDetails(order),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Row 1: ID, Priority, Type & Status
            Row(
              children: [
                Text(
                  shortId,
                  style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w800, color: const Color(0xFF1E293B)),
                ),
                const SizedBox(width: 6),
                // Priority Tag
                if (priority == 'rush' || priority == 'vip')
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    margin: const EdgeInsets.only(right: 6),
                    decoration: BoxDecoration(
                      color: priority == 'rush' ? Colors.red.shade100 : Colors.amber.shade100,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      priority == 'rush' ? '⚡ RUSH' : '★ VIP',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.bold,
                        color: priority == 'rush' ? Colors.red.shade700 : Colors.amber.shade800,
                      ),
                    ),
                  ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF2FF),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    orderType,
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF4338CA)),
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: statusColor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Row 2: Customer, Table, Time
            Row(
              children: [
                Icon(LucideIcons.user, size: 13, color: Colors.grey.shade500),
                const SizedBox(width: 4),
                Text(customer, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                const SizedBox(width: 10),
                Icon(LucideIcons.grid, size: 13, color: Colors.grey.shade500),
                const SizedBox(width: 4),
                Text(tableName, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                const Spacer(),
                if (createdAt != null)
                  Text(timeFormatter.format(createdAt.toLocal()), style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500)),
              ],
            ),

            if (items.isNotEmpty) ...[
              const Divider(height: 16),
              Text(
                items.map((it) => '${it['quantity']}x ${it['name'] ?? it['item_name']}').take(3).join(', ') +
                    (items.length > 3 ? ' +${items.length - 3} more' : ''),
                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],

            const Divider(height: 16),

            // Row 3: Total + Action Buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      currencyFormatter.format(total),
                      style: GoogleFonts.poppins(fontSize: 17, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                    ),
                    if (paymentMethod.isNotEmpty)
                      Text(paymentMethod, style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
                  ],
                ),
                Row(
                  children: [
                    // Quick Print Bill Button
                    IconButton(
                      icon: const Icon(LucideIcons.printer, size: 18, color: Color(0xFF2563EB)),
                      tooltip: 'Print Receipt',
                      onPressed: () => _printReceipt(order),
                    ),
                    const SizedBox(width: 4),

                    // Quick Advance Status or Settle
                    if (status == 'pending')
                      ElevatedButton(
                        onPressed: () => _updateOrderStatus(rawId, 'preparing'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF97316),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          minimumSize: Size.zero,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Start Prep', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                      )
                    else if (status == 'preparing')
                      ElevatedButton(
                        onPressed: () => _updateOrderStatus(rawId, 'ready'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          minimumSize: Size.zero,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Mark Ready', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                      )
                    else if (status == 'ready' || status == 'held')
                      ElevatedButton.icon(
                        onPressed: () {
                          PaymentDialog.show(
                            context,
                            total: total,
                            subtotal: total,
                            tax: 0.0,
                            discount: 0.0,
                            items: items.map((it) => CartItem(
                              id: it['id']?.toString() ?? '',
                              menuItemId: it['item_id']?.toString() ?? '',
                              name: it['name'] ?? it['item_name'] ?? 'Item',
                              price: (it['price'] as num?)?.toDouble() ?? 0.0,
                              quantity: (it['quantity'] as num?)?.toInt() ?? 1,
                            )).toList(),
                            customerOrTable: '$tableName - $customer',
                            onPaymentSuccess: (method, details) async {
                              _updateOrderStatus(rawId, 'completed');
                            },
                          );
                        },
                        icon: const Icon(LucideIcons.creditCard, size: 13),
                        label: const Text('Settle', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF16A34A),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          minimumSize: Size.zero,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ─── Order Details Sheet ───────────────────────────────────────────────────

  Widget _buildOrderDetailsSheet(Map<String, dynamic> order) {
    final rawId = order['id']?.toString() ?? '';
    final shortId = (order['order_number'] != null && order['order_number'].toString().isNotEmpty)
        ? '#${order['order_number']}'
        : (rawId.length > 8 ? '#${rawId.substring(0, 8)}' : '#$rawId');

    final status = (order['status'] ?? 'pending').toString().toLowerCase();
    final items = (order['order_items'] is List) ? (order['order_items'] as List) : [];
    final total = (order['total'] is num) ? (order['total'] as num).toDouble() : 0.0;
    final subtotal = (order['subtotal'] is num) ? (order['subtotal'] as num).toDouble() : total;
    final discount = (order['discount_amount'] is num) ? (order['discount_amount'] as num).toDouble() : 0.0;
    final currentPriority = (order['priority'] ?? 'normal').toString().toLowerCase();
    final hasManage = AccessController().hasPermission('orders.manage') ||
        AccessController().hasPermission('orders.update') ||
        AccessController().isAdmin;

    return SafeArea(
      child: Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Sheet Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Order $shortId', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold)),
                    Text('${order['table_name'] ?? "Table"} • ${order['customer_name'] ?? "Guest"}',
                        style: const TextStyle(color: Colors.grey, fontSize: 13)),
                  ],
                ),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const Divider(height: 24),

            // Priority Switcher
            Row(
              children: [
                const Text('Priority:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(width: 10),
                Wrap(
                  spacing: 6,
                  children: ['normal', 'rush', 'vip'].map((p) {
                    final isSel = currentPriority == p;
                    return ChoiceChip(
                      label: Text(p.toUpperCase()),
                      selected: isSel,
                      onSelected: hasManage
                          ? (val) {
                              if (val) {
                                Navigator.pop(context);
                                _updateOrderPriority(rawId, p);
                              }
                            }
                          : null,
                    );
                  }).toList(),
                ),
              ],
            ),
            const Divider(height: 24),

            // Item List
            const Text('Order Items', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.separated(
                itemCount: items.length,
                separatorBuilder: (_, _) => const Divider(height: 12),
                itemBuilder: (ctx, i) {
                  final it = items[i];
                  final name = it['name'] ?? it['item_name'] ?? 'Item';
                  final qty = it['quantity'] ?? 1;
                  final price = (it['price'] as num?)?.toDouble() ?? 0.0;
                  final notes = it['notes']?.toString();

                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('$qty x $name', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                            if (notes != null && notes.isNotEmpty)
                              Text('Note: $notes', style: const TextStyle(fontStyle: FontStyle.italic, fontSize: 11, color: Colors.grey)),
                          ],
                        ),
                      ),
                      Text(currencyFormatter.format(price * qty), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                    ],
                  );
                },
              ),
            ),

            const Divider(height: 16),
            // Totals
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Subtotal:'),
                Text(currencyFormatter.format(subtotal)),
              ],
            ),
            if (discount > 0)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Discount:', style: TextStyle(color: Colors.green)),
                  Text('-${currencyFormatter.format(discount)}', style: const TextStyle(color: Colors.green)),
                ],
              ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Grand Total:', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold)),
                Text(currencyFormatter.format(total), style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary)),
              ],
            ),
            const SizedBox(height: 16),

            // Bottom Actions in Sheet
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _printReceipt(order);
                    },
                    icon: const Icon(LucideIcons.printer, size: 16),
                    label: const Text('Print Receipt'),
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                  ),
                ),
                const SizedBox(width: 10),
                if (status != 'completed' && hasManage)
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _updateOrderStatus(rawId, 'completed');
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text('Mark Completed'),
                    ),
                  )
                else if (status == 'completed' && hasManage)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _updateOrderStatus(rawId, 'pending');
                      },
                      icon: const Icon(LucideIcons.rotateCcw, size: 16),
                      label: const Text('Revert to Pending'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFF59E0B),
                        side: const BorderSide(color: Color(0xFFF59E0B)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
              ],
            ),
            if (status != 'cancelled' && hasManage) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    _confirmCancelOrder(rawId, existingNotes: order['notes']?.toString());
                  },
                  icon: const Icon(LucideIcons.xCircle, size: 15, color: AppColors.destructive),
                  label: const Text('Cancel / Void Order', style: TextStyle(color: AppColors.destructive, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _confirmCancelOrder(String orderId, {String? existingNotes}) async {
    final reasonController = TextEditingController();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel / Void Order', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Enter reason for cancelling this order (mandatory for audit):'),
            const SizedBox(height: 10),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                hintText: 'e.g. Guest changed mind, Entered by mistake',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Back')),
          ElevatedButton(
            onPressed: () {
              if (reasonController.text.trim().isEmpty) {
                ScaffoldMessenger.of(ctx).showSnackBar(
                  const SnackBar(content: Text('Please enter a cancellation reason'), backgroundColor: AppColors.destructive),
                );
                return;
              }
              Navigator.pop(ctx, true);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.destructive),
            child: const Text('Void Order', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final reason = reasonController.text.trim();
      if (reason.isEmpty) return;

      try {
        final noteText = (existingNotes != null && existingNotes.isNotEmpty)
            ? '$existingNotes | Cancelled: $reason'
            : 'Cancelled: $reason';

        await SupabaseConfig.client.from('orders').update({
          'status': 'cancelled',
          'notes': noteText,
          'updated_at': DateTime.now().toUtc().toIso8601String(),
        }).eq('id', orderId);

        await SupabaseConfig.client.from('kitchen_orders').update({
          'status': 'cancelled',
          'bumped_at': DateTime.now().toUtc().toIso8601String(),
        }).eq('order_id', orderId);

        _loadOrders(silent: true);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Order has been cancelled / voided'), backgroundColor: AppColors.destructive),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to cancel order: $e'), backgroundColor: AppColors.destructive),
        );
      }
    }
  }
}
