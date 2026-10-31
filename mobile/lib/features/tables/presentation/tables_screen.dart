import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/supabase_config.dart';
import '../../../core/access/access_controller.dart';
import '../models/table_model.dart';
import 'table_status_dialog.dart';

class TablesScreen extends StatefulWidget {
  const TablesScreen({super.key});

  @override
  State<TablesScreen> createState() => _TablesScreenState();
}

class _TablesScreenState extends State<TablesScreen> {
  List<RestaurantTable> _tables = [];
  bool _isLoading = true;
  String _selectedFilter = 'all'; // all, available, occupied, billed, reserved
  String _selectedSection = 'All';
  String _searchQuery = '';

  final currencyFormatter = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadTables();
  }

  List<RestaurantTable> _getDefaultTables() {
    final now = DateTime.now();
    return [
      RestaurantTable(
        id: 't-1',
        restaurantId: 'rest-1',
        name: 'T-01',
        capacity: 2,
        status: 'occupied',
        section: 'Ground Floor',
        customerName: 'Aarav Patel',
        customerPhone: '+91 98201 11223',
        guestCount: 2,
        currentOrderId: 'ORD-9821',
        activeTotal: 840,
        occupiedSince: now.subtract(const Duration(minutes: 32)),
      ),
      RestaurantTable(
        id: 't-2',
        restaurantId: 'rest-1',
        name: 'T-02',
        capacity: 4,
        status: 'available',
        section: 'Ground Floor',
      ),
      RestaurantTable(
        id: 't-3',
        restaurantId: 'rest-1',
        name: 'T-03',
        capacity: 4,
        status: 'billed',
        section: 'Ground Floor',
        customerName: 'Pooja Sharma',
        guestCount: 4,
        currentOrderId: 'ORD-9818',
        activeTotal: 1850,
        occupiedSince: now.subtract(const Duration(minutes: 68)),
      ),
      RestaurantTable(
        id: 't-4',
        restaurantId: 'rest-1',
        name: 'T-04',
        capacity: 6,
        status: 'occupied',
        section: 'Ground Floor',
        customerName: 'Vikram Mehta',
        guestCount: 5,
        currentOrderId: 'ORD-9824',
        activeTotal: 3420,
        occupiedSince: now.subtract(const Duration(minutes: 45)),
      ),
      RestaurantTable(
        id: 't-5',
        restaurantId: 'rest-1',
        name: 'T-05',
        capacity: 2,
        status: 'reserved',
        section: 'Terrace Garden',
        customerName: 'Dr. Sen',
        customerPhone: '+91 99342 55667',
        guestCount: 2,
      ),
      RestaurantTable(
        id: 't-6',
        restaurantId: 'rest-1',
        name: 'T-06',
        capacity: 4,
        status: 'available',
        section: 'Terrace Garden',
      ),
      RestaurantTable(
        id: 't-7',
        restaurantId: 'rest-1',
        name: 'T-07',
        capacity: 8,
        status: 'occupied',
        section: 'Terrace Garden',
        customerName: 'Corporate Group',
        guestCount: 7,
        currentOrderId: 'ORD-9815',
        activeTotal: 5690,
        occupiedSince: now.subtract(const Duration(minutes: 85)),
      ),
      RestaurantTable(
        id: 't-8',
        restaurantId: 'rest-1',
        name: 'T-08',
        capacity: 4,
        status: 'available',
        section: 'AC Lounge',
      ),
      RestaurantTable(
        id: 't-9',
        restaurantId: 'rest-1',
        name: 'T-09',
        capacity: 6,
        status: 'billed',
        section: 'AC Lounge',
        customerName: 'Ananya Roy',
        guestCount: 6,
        currentOrderId: 'ORD-9819',
        activeTotal: 2890,
        occupiedSince: now.subtract(const Duration(minutes: 55)),
      ),
      RestaurantTable(
        id: 't-10',
        restaurantId: 'rest-1',
        name: 'T-10',
        capacity: 10,
        status: 'available',
        section: 'VIP Cabin',
      ),
    ];
  }

  Future<void> _loadTables() async {
    setState(() => _isLoading = true);

    try {
      final restaurantId = AccessController().restaurantId;
      if (restaurantId != null && restaurantId.isNotEmpty) {
        final response = await SupabaseConfig.client
            .from('restaurant_tables')
            .select()
            .eq('restaurant_id', restaurantId)
            .order('name');

        if (!mounted) return;
        if (response.isNotEmpty) {
          final fetched = response
              .map((row) => RestaurantTable.fromJson(row))
              .toList();
          setState(() {
            _tables = fetched;
            _isLoading = false;
          });
          return;
        }
      }
    } catch (e) {
      debugPrint('[TablesScreen] Supabase fetch fallback: $e');
    }

    if (!mounted) return;
    // Fallback to demo tables only in debug mode
    setState(() {
      _tables = kDebugMode ? _getDefaultTables() : [];
      _isLoading = false;
    });
  }

  Future<bool> _updateTableInRemote(RestaurantTable table, {bool isNew = false}) async {
    try {
      final restaurantId = AccessController().restaurantId;
      if (restaurantId != null && restaurantId.isNotEmpty) {
        final data = table.toJson();
        if (isNew) {
          data.remove('id');
        }
        await SupabaseConfig.client
            .from('restaurant_tables')
            .upsert(data);
        return true;
      }
    } catch (e) {
      debugPrint('[TablesScreen] Remote update error: $e');
    }
    return false;
  }

  List<String> get _sections {
    final set = {'All'};
    for (final t in _tables) {
      if (t.section != null && t.section!.isNotEmpty) {
        set.add(t.section!);
      }
    }
    return set.toList();
  }

  List<RestaurantTable> get _filteredTables {
    return _tables.where((t) {
      final matchesStatus = _selectedFilter == 'all' ||
          t.parsedStatus.value.toLowerCase() == _selectedFilter.toLowerCase();
      final matchesSection =
          _selectedSection == 'All' || t.section == _selectedSection;
      final matchesSearch = _searchQuery.isEmpty ||
          t.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (t.customerName?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);

      return matchesStatus && matchesSection && matchesSearch;
    }).toList();
  }

  int _countForStatus(String status) {
    if (status == 'all') return _tables.length;
    return _tables.where((t) => t.parsedStatus.value.toLowerCase() == status.toLowerCase()).length;
  }

  void _onTableTapped(RestaurantTable table) {
    if (table.isAvailable) {
      // Direct action to seat guests or open management dialog
      TableStatusDialog.show(
        context,
        table: table,
        onTableUpdated: (updated) {
          setState(() {
            final idx = _tables.indexWhere((t) => t.id == updated.id);
            if (idx != -1) _tables[idx] = updated;
          });
          _updateTableInRemote(updated);
        },
      );
    } else {
      // Occupied, billed, or reserved: show active table details / bill modal
      _showTableBillDetails(table);
    }
  }

  void _showTableBillDetails(RestaurantTable table) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.cardDark : AppColors.cardLight;
    final text = isDark ? AppColors.textDark : AppColors.textLight;
    final textMuted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    final border = isDark ? AppColors.borderDark : AppColors.borderLight;

    final hasActiveBill = table.activeTotal != null && table.activeTotal! > 0;
    final subtotal = table.activeTotal ?? 0.0;
    final gst = subtotal * 0.05;
    final grandTotal = subtotal + gst;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: bg,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          border: Border(top: BorderSide(color: border, width: 1.5)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: textMuted.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),
            // Header Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: table.statusColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(
                        table.isBilled
                            ? LucideIcons.receipt
                            : table.isOccupied
                                ? LucideIcons.utensils
                                : LucideIcons.calendar,
                        color: table.statusColor,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Table ${table.name}',
                          style: GoogleFonts.poppins(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: text,
                          ),
                        ),
                        Text(
                          '${table.guestCount ?? table.capacity} Guests • ${table.customerName ?? "Walk-in Guest"}',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            color: textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: table.statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: table.statusColor.withOpacity(0.3)),
                  ),
                  child: Text(
                    table.statusLabel.toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: table.statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Bill Breakdown Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF131D2E) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: border),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Ticket Reference',
                        style: GoogleFonts.inter(fontSize: 13, color: textMuted),
                      ),
                      Text(
                        table.currentOrderId ?? 'No linked order',
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: text,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Subtotal', style: GoogleFonts.inter(fontSize: 13, color: textMuted)),
                      Text(hasActiveBill ? currencyFormatter.format(subtotal) : '—',
                          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: text)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('GST (5%)', style: GoogleFonts.inter(fontSize: 13, color: textMuted)),
                      Text(hasActiveBill ? currencyFormatter.format(gst) : '—',
                          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: text)),
                    ],
                  ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Grand Total',
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: text,
                        ),
                      ),
                      Text(
                        hasActiveBill ? currencyFormatter.format(grandTotal) : 'No Active Bill',
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: hasActiveBill ? AppColors.primary : textMuted,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      TableStatusDialog.show(
                        context,
                        table: table,
                        onTableUpdated: (updated) {
                          setState(() {
                            final idx = _tables.indexWhere((t) => t.id == updated.id);
                            if (idx != -1) _tables[idx] = updated;
                          });
                          _updateTableInRemote(updated);
                        },
                      );
                    },
                    icon: const Icon(LucideIcons.edit3, size: 16),
                    label: const Text('Edit Status'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: BorderSide(color: border),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      final updated = table.copyWith(
                        status: 'available',
                        clearGuestContext: true,
                      );
                      _updateTableInRemote(updated).then((success) {
                        if (!mounted) return;
                        if (success) {
                          setState(() {
                            final idx = _tables.indexWhere((t) => t.id == updated.id);
                            if (idx != -1) _tables[idx] = updated;
                          });
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Table ${table.name} cleared and now Available!'),
                              backgroundColor: AppColors.available,
                            ),
                          );
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Failed to clear table'),
                              backgroundColor: AppColors.destructive,
                            ),
                          );
                        }
                      });
                    },
                    icon: const Icon(LucideIcons.checkCheck, size: 16),
                    label: const Text('Clear & Free'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.available,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.bgDark : AppColors.bgLight;
    final cardBg = isDark ? AppColors.cardDark : AppColors.cardLight;
    final text = isDark ? AppColors.textDark : AppColors.textLight;
    final textMuted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    final border = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: cardBg,
        elevation: 0,
        scrolledUnderElevation: 1,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Tables & Seating',
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                color: text,
              ),
            ),
            Text(
              'Live Floor Plan • Dine-In Operations',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: textMuted,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _loadTables,
            icon: Icon(LucideIcons.refreshCw, color: textMuted, size: 20),
            tooltip: 'Refresh Tables',
          ),
          IconButton(
            onPressed: () {
              // Quick add table dialog
              _showAddTableSheet();
            },
            icon: const Icon(LucideIcons.plus, color: AppColors.primary, size: 22),
            tooltip: 'Add Table',
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: border, height: 1),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadTables,
        color: AppColors.primary,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // Status Summary Metrics Bar
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildStatusFilterChip(
                        status: 'all',
                        label: 'All Tables',
                        count: _countForStatus('all'),
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 8),
                      _buildStatusFilterChip(
                        status: 'available',
                        label: 'Available',
                        count: _countForStatus('available'),
                        color: AppColors.available,
                      ),
                      const SizedBox(width: 8),
                      _buildStatusFilterChip(
                        status: 'occupied',
                        label: 'Occupied',
                        count: _countForStatus('occupied'),
                        color: AppColors.occupied,
                      ),
                      const SizedBox(width: 8),
                      _buildStatusFilterChip(
                        status: 'billed',
                        label: 'Billed',
                        count: _countForStatus('billed'),
                        color: AppColors.billed,
                      ),
                      const SizedBox(width: 8),
                      _buildStatusFilterChip(
                        status: 'reserved',
                        label: 'Reserved',
                        count: _countForStatus('reserved'),
                        color: AppColors.reserved,
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Search Bar & Section Filter
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  children: [
                    TextField(
                      onChanged: (v) => setState(() => _searchQuery = v),
                      style: GoogleFonts.inter(fontSize: 14, color: text),
                      decoration: InputDecoration(
                        hintText: 'Search table or customer...',
                        hintStyle: GoogleFonts.inter(color: textMuted, fontSize: 13),
                        prefixIcon: Icon(LucideIcons.search, size: 18, color: textMuted),
                        filled: true,
                        fillColor: cardBg,
                        contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    // Section Selector Pills
                    SizedBox(
                      height: 36,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _sections.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final section = _sections[index];
                          final isSelected = _selectedSection == section;
                          return ChoiceChip(
                            label: Text(section),
                            selected: isSelected,
                            onSelected: (val) {
                              if (val) setState(() => _selectedSection = section);
                            },
                            labelStyle: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                              color: isSelected ? Colors.white : textMuted,
                            ),
                            selectedColor: AppColors.primary,
                            backgroundColor: cardBg,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                              side: BorderSide(
                                color: isSelected ? AppColors.primary : border,
                              ),
                            ),
                            showCheckmark: false,
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Floor Grid
            _isLoading
                ? const SliverFillRemaining(
                    child: Center(
                      child: CircularProgressIndicator(color: AppColors.primary),
                    ),
                  )
                : _filteredTables.isEmpty
                    ? SliverFillRemaining(
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(LucideIcons.grid, size: 48, color: textMuted.withOpacity(0.5)),
                              const SizedBox(height: 12),
                              Text(
                                'No tables found',
                                style: GoogleFonts.poppins(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : SliverPadding(
                        padding: const EdgeInsets.all(16),
                        sliver: SliverGrid(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 14,
                            crossAxisSpacing: 14,
                            childAspectRatio: 0.95,
                          ),
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final table = _filteredTables[index];
                              return _buildTableCard(table);
                            },
                            childCount: _filteredTables.length,
                          ),
                        ),
                      ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusFilterChip({
    required String status,
    required String label,
    required int count,
    required Color color,
  }) {
    final isSelected = _selectedFilter == status;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = status),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color : color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? color : color.withOpacity(0.25),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected ? Colors.white : color,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected ? Colors.white : color,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected ? Colors.white.withOpacity(0.25) : color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '$count',
                style: GoogleFonts.poppins(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : color,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTableCard(RestaurantTable table) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.cardDark : AppColors.cardLight;
    final text = isDark ? AppColors.textDark : AppColors.textLight;
    final textMuted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    final border = isDark ? AppColors.borderDark : AppColors.borderLight;

    final statusColor = table.statusColor;

    return GestureDetector(
      onTap: () => _onTableTapped(table),
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: table.isAvailable ? border : statusColor.withOpacity(0.4),
            width: table.isAvailable ? 1 : 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: table.isAvailable
                  ? Colors.black.withOpacity(0.03)
                  : statusColor.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Strip: Status Pill & Capacity
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                color: statusColor.withOpacity(0.1),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Status Badge with dot
                    Row(
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: statusColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          table.statusLabel,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: statusColor,
                          ),
                        ),
                      ],
                    ),
                    // Capacity Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: border),
                      ),
                      child: Row(
                        children: [
                          Icon(LucideIcons.users, size: 11, color: textMuted),
                          const SizedBox(width: 3),
                          Text(
                            '${table.capacity}',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: text,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Center: Table Number and Icon
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        table.name,
                        style: GoogleFonts.poppins(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: text,
                        ),
                      ),
                      const SizedBox(height: 2),
                      if (table.isAvailable) ...[
                        Text(
                          'Ready to Seat',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            color: AppColors.available,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ] else if (table.customerName != null) ...[
                        Text(
                          table.customerName!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: text,
                          ),
                        ),
                      ],

                      if (table.activeTotal != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          currencyFormatter.format(table.activeTotal),
                          style: GoogleFonts.poppins(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ] else if (table.occupiedSince != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.clock, size: 11, color: textMuted),
                            const SizedBox(width: 3),
                            Text(
                              '${table.occupiedMinutes}m seated',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                color: textMuted,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // Bottom Button Action
              InkWell(
                onTap: () => _onTableTapped(table),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: table.isAvailable
                        ? AppColors.available.withOpacity(0.12)
                        : border.withOpacity(0.3),
                    border: Border(top: BorderSide(color: border)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        table.isAvailable
                            ? LucideIcons.userPlus
                            : LucideIcons.receipt,
                        size: 13,
                        color: table.isAvailable ? AppColors.available : textMuted,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        table.isAvailable ? 'Seat Guest' : 'View Bill',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: table.isAvailable ? AppColors.available : text,
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
    );
  }

  void _showAddTableSheet() async {
    final nameCtrl = TextEditingController(text: 'T-${_tables.length + 1}');
    int cap = 4;
    final availableSections = _sections.where((s) => s != 'All').toList();
    if (availableSections.isEmpty) {
      availableSections.addAll(['Main Dining', 'Ground Floor', 'Balcony', 'Outdoor']);
    }
    String sec = availableSections.first;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          final bg = isDark ? AppColors.cardDark : AppColors.cardLight;
          final text = isDark ? AppColors.textDark : AppColors.textLight;

          return Container(
            decoration: BoxDecoration(
              color: bg,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            ),
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Add New Floor Table',
                  style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700, color: text),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(
                    labelText: 'Table Identifier',
                    filled: true,
                    fillColor: isDark ? const Color(0xFF131D2E) : const Color(0xFFF1F5F9),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  value: sec,
                  decoration: InputDecoration(
                    labelText: 'Section',
                    filled: true,
                    fillColor: isDark ? const Color(0xFF131D2E) : const Color(0xFFF1F5F9),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  items: availableSections
                      .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setSheetState(() => sec = val);
                  },
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Capacity (Seats)', style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: text)),
                    Row(
                      children: [
                        IconButton(
                          onPressed: () {
                            if (cap > 1) setSheetState(() => cap--);
                          },
                          icon: const Icon(LucideIcons.minus),
                        ),
                        Text('$cap Pax', style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
                        IconButton(
                          onPressed: () {
                            if (cap < 24) setSheetState(() => cap++);
                          },
                          icon: const Icon(LucideIcons.plus),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      final newTable = RestaurantTable(
                        id: '',
                        restaurantId: AccessController().restaurantId ?? 'rest-1',
                        name: nameCtrl.text.trim().isEmpty ? 'T-New' : nameCtrl.text.trim(),
                        capacity: cap,
                        status: 'available',
                        section: sec,
                      );
                      final success = await _updateTableInRemote(newTable, isNew: true);
                      if (success) {
                        setState(() => _tables.add(newTable));
                      }
                      if (ctx.mounted) Navigator.pop(ctx);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Add Table', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );

    nameCtrl.dispose();
  }
}
