import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/access/guards.dart';
import '../../../core/access/access_controller.dart';
import '../../../core/network/supabase_config.dart';

class KDSScreen extends StatefulWidget {
  const KDSScreen({super.key});

  @override
  State<KDSScreen> createState() => _KDSScreenState();
}

class _KDSScreenState extends State<KDSScreen> {
  String _selectedStation = 'All';
  bool _isLoading = false;
  List<Map<String, dynamic>> _tickets = [];

  @override
  void initState() {
    super.initState();
    _loadTickets();
  }

  Future<void> _loadTickets() async {
    setState(() => _isLoading = true);
    final restaurantId = AccessController().restaurantId;

    try {
      if (restaurantId != null && restaurantId.isNotEmpty) {
        // Query kitchen_orders first (direct KOT tickets)
        final kotRes = await SupabaseConfig.client
            .from('kitchen_orders')
            .select('id, order_id, table_name, status, created_at, items, round_number')
            .eq('restaurant_id', restaurantId)
            .inFilter('status', ['new', 'pending', 'cooking', 'preparing'])
            .order('created_at', ascending: true);

        if (kotRes.isNotEmpty) {
          final loaded = (kotRes as List).map<Map<String, dynamic>>((row) {
            final rawItems = row['items'] is List ? (row['items'] as List) : [];
            final items = rawItems.map<Map<String, dynamic>>((item) {
              if (item is Map) {
                return {
                  'name': item['name'] ?? 'Item',
                  'qty': item['quantity'] ?? item['qty'] ?? 1,
                  'notes': item['notes'] ?? '',
                  'station': item['station'] ?? 'Kitchen',
                };
              }
              return {'name': item.toString(), 'qty': 1, 'notes': '', 'station': 'Kitchen'};
            }).toList();

            final createdAt = DateTime.tryParse(row['created_at'].toString()) ?? DateTime.now();
            final diff = DateTime.now().difference(createdAt).inMinutes;
            final status = row['status'].toString().toLowerCase();
            final isCooking = status == 'cooking' || status == 'preparing';

            return {
              'id': row['id'].toString(),
              'order_id': row['order_id']?.toString(),
              'table': row['table_name'] ?? 'Counter',
              'elapsed': '${diff}m',
              'status': isCooking ? 'cooking' : 'pending',
              'station': items.isNotEmpty ? items.first['station'] : 'Kitchen',
              'items': items,
            };
          }).toList();

          if (!mounted) return;
          setState(() {
            _tickets = loaded;
            _isLoading = false;
          });
          return;
        }

        // Fallback to orders table
        final res = await SupabaseConfig.client
            .from('orders')
            .select('id, table_name, status, created_at, items')
            .eq('restaurant_id', restaurantId)
            .inFilter('status', ['pending', 'cooking', 'preparing'])
            .order('created_at', ascending: true);

        if (!mounted) return;
        if (res.isNotEmpty) {
          final loaded = (res as List).map<Map<String, dynamic>>((row) {
            final rawItems = row['items'] is List ? (row['items'] as List) : [];
            final items = rawItems.map<Map<String, dynamic>>((item) {
              if (item is Map) {
                return {
                  'name': item['name'] ?? 'Item',
                  'qty': item['quantity'] ?? item['qty'] ?? 1,
                  'notes': item['notes'] ?? '',
                  'station': item['station'] ?? 'Kitchen',
                };
              }
              return {'name': item.toString(), 'qty': 1, 'notes': '', 'station': 'Kitchen'};
            }).toList();

            final createdAt = DateTime.tryParse(row['created_at'].toString()) ?? DateTime.now();
            final diff = DateTime.now().difference(createdAt).inMinutes;

            return {
              'id': row['id'].toString(),
              'order_id': row['id'].toString(),
              'table': row['table_name'] ?? 'Counter',
              'elapsed': '${diff}m',
              'status': row['status'] == 'pending' ? 'pending' : 'cooking',
              'station': items.isNotEmpty ? items.first['station'] : 'Kitchen',
              'items': items,
            };
          }).toList();

          setState(() {
            _tickets = loaded;
            _isLoading = false;
          });
          return;
        }
      }
    } catch (e) {
      debugPrint('[KDSScreen] Error loading tickets: $e');
    }

    if (!mounted) return;
    setState(() {
      _tickets = kDebugMode ? _getDemoTickets() : [];
      _isLoading = false;
    });
  }

  List<Map<String, dynamic>> _getDemoTickets() {
    return [
      {
        'id': '101',
        'table': 'Table 4',
        'elapsed': '4m',
        'status': 'cooking',
        'station': 'Curry',
        'items': [
          {'name': 'Butter Chicken', 'qty': 2, 'notes': 'Less spicy', 'station': 'Curry'},
          {'name': 'Garlic Naan', 'qty': 4, 'notes': '', 'station': 'Tandoor'},
        ]
      },
      {
        'id': '102',
        'table': 'QSR Counter',
        'elapsed': '1m',
        'status': 'pending',
        'station': 'Tandoor',
        'items': [
          {'name': 'Paneer Tikka Roll', 'qty': 1, 'notes': 'Extra chutney', 'station': 'Tandoor'},
          {'name': 'Cold Coffee', 'qty': 1, 'notes': '', 'station': 'Beverage'},
        ]
      },
    ];
  }

  List<Map<String, dynamic>> get _filteredTickets {
    if (_selectedStation == 'All') return _tickets;
    return _tickets.where((t) {
      final station = (t['station'] ?? 'Curry').toString().toLowerCase();
      return station == _selectedStation.toLowerCase();
    }).toList();
  }

  Future<void> _advanceTicketStatus(Map<String, dynamic> ticket) async {
    final hasMutationAccess = AccessController().hasPermission('kitchen.manage') ||
        AccessController().hasPermission('kitchen.view') ||
        AccessController().isAdmin;

    if (!hasMutationAccess) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Access denied: kitchen write permission required'),
          backgroundColor: AppColors.destructive,
        ),
      );
      return;
    }

    final isCooking = ticket['status'] == 'cooking';
    final nextStatus = isCooking ? 'ready' : 'cooking';
    final linkedOrderId = ticket['order_id']?.toString();

    try {
      final restaurantId = AccessController().restaurantId;
      if (restaurantId != null && restaurantId.isNotEmpty) {
        await SupabaseConfig.client
            .from('kitchen_orders')
            .update({
              'status': nextStatus,
              'bumped_at': isCooking ? DateTime.now().toUtc().toIso8601String() : null,
              'started_at': !isCooking ? DateTime.now().toUtc().toIso8601String() : null,
            })
            .eq('id', ticket['id']);

        if (linkedOrderId != null && linkedOrderId.isNotEmpty) {
          if (!isCooking) {
            // Setting ticket to cooking -> parent order becomes preparing
            await SupabaseConfig.client
                .from('orders')
                .update({
                  'status': 'preparing',
                  'updated_at': DateTime.now().toUtc().toIso8601String(),
                })
                .eq('id', linkedOrderId);
          } else {
            // Setting ticket to ready -> update orders only if all sibling tickets are ready
            final siblings = await SupabaseConfig.client
                .from('kitchen_orders')
                .select('id, status')
                .eq('order_id', linkedOrderId);

            final allReady = siblings.every((s) {
              final st = s['status']?.toString().toLowerCase();
              return st == 'ready' || st == 'completed';
            });

            if (allReady) {
              await SupabaseConfig.client
                  .from('orders')
                  .update({
                    'status': 'ready',
                    'updated_at': DateTime.now().toUtc().toIso8601String(),
                  })
                  .eq('id', linkedOrderId);
            }
          }
        }
      }
    } catch (e) {
      debugPrint('[KDSScreen] Remote update error: $e');
    }

    if (!mounted) return;
    setState(() {
      if (isCooking) {
        _tickets.removeWhere((t) => t['id'] == ticket['id']);
      } else {
        ticket['status'] = 'cooking';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return PermissionGuard(
      permission: 'kitchen.view',
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            'Kitchen Display (KDS)',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
          ),
          elevation: 0,
          actions: [
            IconButton(
              icon: const Icon(LucideIcons.refreshCw),
              tooltip: 'Refresh Tickets',
              onPressed: _loadTickets,
            ),
          ],
        ),
        body: Column(
          children: [
            // Station Selector Filter Chips
            Container(
              height: 48,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: ['All', 'Curry', 'Tandoor', 'Beverage', 'Dessert'].map((station) {
                  final isSelected = _selectedStation == station;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(station),
                      selected: isSelected,
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : null,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                      onSelected: (_) {
                        setState(() => _selectedStation = station);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const Divider(height: 1),
            if (_isLoading)
              const LinearProgressIndicator(minHeight: 2, color: AppColors.primary),
            // Ticket Column View
            Expanded(
              child: _filteredTickets.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(LucideIcons.chefHat, size: 48, color: Colors.grey),
                          const SizedBox(height: 12),
                          Text(
                            'No Active Kitchen Tickets',
                            style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Orders placed in Fast POS will appear here instantly',
                            style: TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _filteredTickets.length,
                      itemBuilder: (context, index) {
                        final ticket = _filteredTickets[index];
                        final isCooking = ticket['status'] == 'cooking';

                        return Card(
                          margin: const EdgeInsets.only(bottom: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: BorderSide(
                              color: isCooking ? AppColors.occupied : AppColors.borderLight,
                              width: isCooking ? 2 : 1,
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          '#${ticket['id']}',
                                          style: GoogleFonts.poppins(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 17,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Chip(
                                          label: Text(ticket['table']),
                                          backgroundColor: Colors.grey.shade100,
                                          visualDensity: VisualDensity.compact,
                                        ),
                                      ],
                                    ),
                                    Row(
                                      children: [
                                        const Icon(LucideIcons.clock, size: 14, color: AppColors.occupied),
                                        const SizedBox(width: 4),
                                        Text(
                                          ticket['elapsed'],
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.occupied,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const Divider(height: 20),
                                // Ticket items
                                ...(ticket['items'] as List).map((item) {
                                  return Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 4),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${item['qty']}x',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 15,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                item['name'],
                                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                                              ),
                                              if ((item['notes'] ?? '').isNotEmpty)
                                                Text(
                                                  item['notes'],
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                    color: AppColors.destructive,
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }),
                                const SizedBox(height: 12),
                                // Action button: Advance status
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor:
                                          isCooking ? AppColors.available : AppColors.primary,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                    ),
                                    onPressed: () => _advanceTicketStatus(ticket),
                                    child: Text(
                                      isCooking ? 'Mark as Ready ✓' : 'Start Cooking →',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
