import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/access/guards.dart';
import '../../../core/access/access_controller.dart';
import '../../../core/network/supabase_config.dart';
import '../models/inventory_item_model.dart';
import 'barcode_scanner_dialog.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'All';
  bool _showLowStockOnly = false;
  List<InventoryItem> _items = [];

  final List<String> _categories = [
    'All',
    'Dairy',
    'Produce',
    'Meat & Poultry',
    'Grains & Staples',
    'Beverages',
    'Packaging',
  ];

  @override
  void initState() {
    super.initState();
    _loadInventory();
  }

  Future<void> _loadInventory() async {
    final restaurantId = AccessController().restaurantId;
    if (restaurantId != null && restaurantId.isNotEmpty) {
      try {
        final res = await SupabaseConfig.client
            .from('inventory_items')
            .select()
            .eq('restaurant_id', restaurantId);
        if (res.isNotEmpty && mounted) {
          setState(() {
            _items = (res as List).map((r) => InventoryItem.fromJson(r)).toList();
          });
          return;
        }
      } catch (e) {
        debugPrint('[InventoryScreen] Supabase load error: $e');
      }
    }
    if (mounted) {
      setState(() {
        _items = kDebugMode ? _generateSampleInventory() : [];
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<InventoryItem> _generateSampleInventory() {
    return [
      const InventoryItem(
        id: 'inv-1',
        name: 'Fresh Malai Paneer',
        category: 'Dairy',
        quantity: 3.5,
        unit: 'kg',
        reorderLevel: 5.0,
        costPerUnit: 340.0,
        restaurantId: 'rest-1',
        barcode: '8901030891234',
      ),
      const InventoryItem(
        id: 'inv-2',
        name: 'Mozzarella Cheese Blend',
        category: 'Dairy',
        quantity: 12.0,
        unit: 'kg',
        reorderLevel: 8.0,
        costPerUnit: 480.0,
        restaurantId: 'rest-1',
        barcode: '8901030891235',
      ),
      const InventoryItem(
        id: 'inv-3',
        name: 'Chicken Breast Boneless',
        category: 'Meat & Poultry',
        quantity: 2.0,
        unit: 'kg',
        reorderLevel: 6.0,
        costPerUnit: 260.0,
        restaurantId: 'rest-1',
        barcode: '8901030891236',
      ),
      const InventoryItem(
        id: 'inv-4',
        name: 'Basmati Rice Premium (Daawat)',
        category: 'Grains & Staples',
        quantity: 45.0,
        unit: 'kg',
        reorderLevel: 20.0,
        costPerUnit: 110.0,
        restaurantId: 'rest-1',
        barcode: '8901030891237',
      ),
      const InventoryItem(
        id: 'inv-5',
        name: 'Red Onions (Nashik Grade A)',
        category: 'Produce',
        quantity: 18.0,
        unit: 'kg',
        reorderLevel: 15.0,
        costPerUnit: 32.0,
        restaurantId: 'rest-1',
        barcode: '8901030891238',
      ),
      const InventoryItem(
        id: 'inv-6',
        name: 'Hybrid Roma Tomatoes',
        category: 'Produce',
        quantity: 0.0,
        unit: 'kg',
        reorderLevel: 10.0,
        costPerUnit: 28.0,
        restaurantId: 'rest-1',
        barcode: '8901030891239',
      ),
      const InventoryItem(
        id: 'inv-7',
        name: 'Refined Sunflower Oil (Fortune)',
        category: 'Grains & Staples',
        quantity: 25.0,
        unit: 'L',
        reorderLevel: 15.0,
        costPerUnit: 135.0,
        restaurantId: 'rest-1',
        barcode: '8901030891240',
      ),
      const InventoryItem(
        id: 'inv-8',
        name: 'Paper Meal Box 750ml (Eco-Friendly)',
        category: 'Packaging',
        quantity: 120.0,
        unit: 'pcs',
        reorderLevel: 100.0,
        costPerUnit: 6.5,
        restaurantId: 'rest-1',
        barcode: '8901030891241',
      ),
      const InventoryItem(
        id: 'inv-9',
        name: 'Coca-Cola Cans 330ml',
        category: 'Beverages',
        quantity: 8.0,
        unit: 'cans',
        reorderLevel: 24.0,
        costPerUnit: 32.0,
        restaurantId: 'rest-1',
        barcode: '8901030891242',
      ),
    ];
  }

  List<InventoryItem> get _filteredItems {
    final query = _searchController.text.trim().toLowerCase();
    return _items.where((item) {
      if (_selectedCategory != 'All' && item.category != _selectedCategory) {
        return false;
      }
      if (_showLowStockOnly && !item.isLowStock && !item.isOutOfStock) {
        return false;
      }
      if (query.isNotEmpty) {
        final matchesName = item.name.toLowerCase().contains(query);
        final matchesBarcode = item.barcode?.toLowerCase().contains(query) ?? false;
        final matchesCategory = item.category.toLowerCase().contains(query);
        return matchesName || matchesBarcode || matchesCategory;
      }
      return true;
    }).toList();
  }

  int get _lowStockCount =>
      _items.where((i) => i.isLowStock || i.isOutOfStock).length;
  double get _totalValuation =>
      _items.fold(0.0, (sum, item) => sum + item.totalValuation);

  void _openBarcodeScanner() async {
    final scannedCode = await showDialog<String>(
      context: context,
      builder: (context) => const BarcodeScannerDialog(),
    );

    if (scannedCode != null && mounted) {
      setState(() {
        _searchController.text = scannedCode;
      });

      final matchedItem = _items.where((i) => i.barcode == scannedCode).firstOrNull;
      if (matchedItem != null) {
        _showStockAdjustDialog(matchedItem);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Scanned: $scannedCode (No item matched, search applied)'),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  void _showStockAdjustDialog(InventoryItem item) {
    final qtyController = TextEditingController();
    String adjustType = 'restock'; // restock, waste, correction

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final double? inputVal = double.tryParse(qtyController.text);
            double calculatedNewStock = item.quantity;
            if (inputVal != null) {
              if (adjustType == 'restock') {
                calculatedNewStock = item.quantity + inputVal;
              } else if (adjustType == 'waste') {
                calculatedNewStock = (item.quantity - inputVal).clamp(0.0, double.infinity);
              } else if (adjustType == 'correction') {
                calculatedNewStock = inputVal.clamp(0.0, double.infinity);
              }
            }

            return Padding(
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Adjust Stock',
                            style: GoogleFonts.poppins(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            item.name,
                            style: TextStyle(
                              color: Theme.of(context).textTheme.bodySmall?.color,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.x),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Action Type Segmented Bar
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: AppColors.bgLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: _AdjustTypeTab(
                            title: 'Restock (+)',
                            color: AppColors.available,
                            isSelected: adjustType == 'restock',
                            onTap: () {
                              setModalState(() {
                                adjustType = 'restock';
                              });
                            },
                          ),
                        ),
                        Expanded(
                          child: _AdjustTypeTab(
                            title: 'Waste (-)',
                            color: AppColors.occupied,
                            isSelected: adjustType == 'waste',
                            onTap: () {
                              setModalState(() {
                                adjustType = 'waste';
                              });
                            },
                          ),
                        ),
                        Expanded(
                          child: _AdjustTypeTab(
                            title: 'Audit (=)',
                            color: AppColors.primary,
                            isSelected: adjustType == 'correction',
                            onTap: () {
                              setModalState(() {
                                adjustType = 'correction';
                              });
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Current vs New Stock Display
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Column(
                          children: [
                            const Text('Current Stock', style: TextStyle(fontSize: 11, color: Colors.grey)),
                            const SizedBox(height: 4),
                            Text(
                              '${item.quantity} ${item.unit}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ],
                        ),
                        const Icon(LucideIcons.arrowRight, size: 18, color: AppColors.primary),
                        Column(
                          children: [
                            const Text('Resulting Stock', style: TextStyle(fontSize: 11, color: Colors.grey)),
                            const SizedBox(height: 4),
                            Text(
                              '${calculatedNewStock.toStringAsFixed(1)} ${item.unit}',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: calculatedNewStock <= item.reorderLevel
                                    ? AppColors.occupied
                                    : AppColors.available,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Quantity Input
                  TextField(
                    controller: qtyController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    autofocus: true,
                    onChanged: (_) => setModalState(() {}),
                    decoration: InputDecoration(
                      labelText: adjustType == 'correction' ? 'Exact Audited Count' : 'Quantity (${item.unit})',
                      prefixIcon: const Icon(LucideIcons.packagePlus),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Confirm Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () {
                        final val = double.tryParse(qtyController.text);
                        if (val == null || val < 0 || (val == 0 && adjustType != 'correction')) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please enter a valid non-negative amount')),
                          );
                          return;
                        }

                        final updatedItem = item.copyWith(
                          quantity: calculatedNewStock,
                          lastRestocked: adjustType == 'restock' ? DateTime.now() : item.lastRestocked,
                        );

                        setState(() {
                          final idx = _items.indexWhere((i) => i.id == item.id);
                          if (idx != -1) {
                            _items[idx] = updatedItem;
                          }
                        });

                        _persistStockAdjustment(item, calculatedNewStock, adjustType);

                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Updated ${item.name} stock to $calculatedNewStock ${item.unit}'),
                            backgroundColor: AppColors.available,
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Confirm Adjustment', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showAddItemDialog() {
    final nameCtrl = TextEditingController();
    final qtyCtrl = TextEditingController();
    final unitCtrl = TextEditingController(text: 'kg');
    final reorderCtrl = TextEditingController(text: '5');
    final costCtrl = TextEditingController();
    final barcodeCtrl = TextEditingController();
    String selectedCat = 'Produce';

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDlgState) {
            return AlertDialog(
              title: Text('Add Inventory Item', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(labelText: 'Item Name *', prefixIcon: Icon(LucideIcons.tag)),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: selectedCat,
                      decoration: const InputDecoration(labelText: 'Category'),
                      items: _categories.where((c) => c != 'All').map((c) {
                        return DropdownMenuItem(value: c, child: Text(c));
                      }).toList(),
                      onChanged: (val) => setDlgState(() => selectedCat = val!),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: TextField(
                            controller: qtyCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(labelText: 'Initial Qty *'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: unitCtrl,
                            decoration: const InputDecoration(labelText: 'Unit (kg, L, pcs)'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: reorderCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(labelText: 'Min Level'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: costCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(labelText: 'Cost/Unit (₹)'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: barcodeCtrl,
                            decoration: const InputDecoration(
                              labelText: 'SKU / Barcode',
                              prefixIcon: Icon(LucideIcons.scanLine),
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(LucideIcons.scanLine, color: AppColors.primary),
                          onPressed: () async {
                            final code = await showDialog<String>(
                              context: context,
                              builder: (_) => const BarcodeScannerDialog(),
                            );
                            if (code != null) {
                              setDlgState(() => barcodeCtrl.text = code);
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    final name = nameCtrl.text.trim();
                    if (name.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Item name cannot be empty')),
                      );
                      return;
                    }
                    final qty = double.tryParse(qtyCtrl.text.trim());
                    final reorder = double.tryParse(reorderCtrl.text.trim());
                    final cost = double.tryParse(costCtrl.text.trim());
                    if (qty == null || qty < 0 || reorder == null || reorder < 0 || cost == null || cost < 0) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Quantity, reorder level, and cost must be non-negative numbers')),
                      );
                      return;
                    }

                    final activeRestaurantId = AccessController().restaurantId ?? 'rest-1';
                    final newItem = InventoryItem(
                      id: 'inv-${DateTime.now().millisecondsSinceEpoch}',
                      name: name,
                      category: selectedCat,
                      quantity: qty,
                      unit: unitCtrl.text.trim().isEmpty ? 'pcs' : unitCtrl.text.trim(),
                      reorderLevel: reorder,
                      costPerUnit: cost,
                      restaurantId: activeRestaurantId,
                      barcode: barcodeCtrl.text.trim().isEmpty ? null : barcodeCtrl.text.trim(),
                    );

                    setState(() {
                      _items.insert(0, newItem);
                    });
                    _persistNewItem(newItem);
                    Navigator.pop(ctx);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Add Item'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  bool get _canWriteInventory =>
      AccessController().hasPermission('inventory.manage') ||
      AccessController().hasPermission('inventory.edit') ||
      AccessController().isAdmin;

  Future<void> _persistNewItem(InventoryItem item) async {
    final restaurantId = AccessController().restaurantId;
    if (restaurantId != null && restaurantId.isNotEmpty) {
      try {
        await SupabaseConfig.client
            .from('inventory_items')
            .upsert(item.toJson());
      } catch (e) {
        debugPrint('[InventoryScreen] Failed to persist new item: $e');
      }
    }
  }

  Future<void> _persistStockAdjustment(InventoryItem item, double newQuantity, String type) async {
    final restaurantId = AccessController().restaurantId;
    if (restaurantId != null && restaurantId.isNotEmpty) {
      try {
        await SupabaseConfig.client
            .from('inventory_items')
            .update({
              'quantity': newQuantity,
              'last_restocked': DateTime.now().toIso8601String(),
            })
            .eq('id', item.id);

        await SupabaseConfig.client.from('inventory_transactions').insert({
          'restaurant_id': restaurantId,
          'item_id': item.id,
          'type': type,
          'quantity_change': newQuantity - item.quantity,
          'created_at': DateTime.now().toIso8601String(),
        });
      } catch (e) {
        debugPrint('[InventoryScreen] Failed to persist stock adjustment: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SubscriptionGate(
      component: 'inventory',
      child: PermissionGuard(
        permission: 'inventory:view',
        child: FeatureLock(
          feature: 'inventory_management',
          child: Scaffold(
            appBar: AppBar(
              title: Text(
                'Inventory',
                style: GoogleFonts.poppins(fontWeight: FontWeight.bold),
              ),
              actions: [
                if (_canWriteInventory) ...[
                  IconButton(
                    icon: const Icon(LucideIcons.scanLine),
                    tooltip: 'Scan Barcode',
                    onPressed: _openBarcodeScanner,
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.plus),
                    tooltip: 'Add Item',
                    onPressed: _showAddItemDialog,
                  ),
                ],
              ],
            ),
            body: Column(
              children: [
                // KPI Metric Cards
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: _KpiCard(
                          title: 'Total Items',
                          value: '${_items.length}',
                          icon: LucideIcons.boxes,
                          iconColor: AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _KpiCard(
                          title: 'Low / Out',
                          value: '$_lowStockCount',
                          icon: LucideIcons.alertTriangle,
                          iconColor: _lowStockCount > 0 ? AppColors.occupied : AppColors.available,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _KpiCard(
                          title: 'Total Value',
                          value: '₹${_totalValuation.toStringAsFixed(0)}',
                          icon: LucideIcons.indianRupee,
                          iconColor: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),

                // Search & Filter Row
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: 'Search items, SKU, category...',
                            prefixIcon: const Icon(LucideIcons.search, size: 20),
                            suffixIcon: _searchController.text.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(LucideIcons.x, size: 18),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() {});
                                    },
                                  )
                                : null,
                            contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilterChip(
                        selected: _showLowStockOnly,
                        label: const Text('Low Stock'),
                        avatar: Icon(
                          LucideIcons.alertCircle,
                          size: 16,
                          color: _showLowStockOnly ? Colors.white : AppColors.occupied,
                        ),
                        selectedColor: AppColors.occupied,
                        onSelected: (val) {
                          setState(() => _showLowStockOnly = val);
                        },
                      ),
                    ],
                  ),
                ),

                // Category Filter Pills
                SizedBox(
                  height: 48,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    itemCount: _categories.length,
                    separatorBuilder: (context, index) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final cat = _categories[index];
                      final isSelected = cat == _selectedCategory;
                      return ChoiceChip(
                        label: Text(cat),
                        selected: isSelected,
                        onSelected: (selected) {
                          if (selected) {
                            setState(() => _selectedCategory = cat);
                          }
                        },
                      );
                    },
                  ),
                ),

                const Divider(height: 1),

                // Inventory Items List
                Expanded(
                  child: _filteredItems.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.box, size: 48, color: Colors.grey.withValues(alpha: 0.5)),
                              const SizedBox(height: 12),
                              Text(
                                'No inventory items match filter',
                                style: GoogleFonts.inter(color: Colors.grey, fontSize: 15),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredItems.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final item = _filteredItems[index];
                            return _InventoryItemCard(
                              item: item,
                              canWrite: _canWriteInventory,
                              onAdjust: () => _showStockAdjustDialog(item),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color iconColor;

  const _KpiCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 11, color: Colors.grey)),
              Icon(icon, size: 16, color: iconColor),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: GoogleFonts.poppins(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
}

class _InventoryItemCard extends StatelessWidget {
  final InventoryItem item;
  final VoidCallback onAdjust;
  final bool canWrite;

  const _InventoryItemCard({
    required this.item,
    required this.onAdjust,
    this.canWrite = true,
  });

  @override
  Widget build(BuildContext context) {
    final bool isOut = item.isOutOfStock;
    final bool isLow = item.isLowStock;
    final Color statusColor = isOut
        ? AppColors.occupied
        : isLow
            ? AppColors.billed
            : AppColors.available;

    final String statusText = isOut
        ? 'OUT OF STOCK'
        : isLow
            ? 'LOW STOCK'
            : 'IN STOCK';

    final double stockRatio = item.reorderLevel > 0
        ? (item.quantity / (item.reorderLevel * 2)).clamp(0.0, 1.0)
        : 1.0;

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLow || isOut ? statusColor.withValues(alpha: 0.5) : AppColors.borderLight,
          width: isLow || isOut ? 1.5 : 1.0,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Name + Status Badge
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.name,
                        style: GoogleFonts.poppins(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              item.category,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.primary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          if (item.barcode != null) ...[
                            const SizedBox(width: 8),
                            Icon(LucideIcons.scanLine, size: 14, color: Colors.grey.shade600),
                            const SizedBox(width: 4),
                            Text(
                              item.barcode!,
                              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    statusText,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Stock Meter
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${item.quantity} ${item.unit}',
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
                Text(
                  'Min: ${item.reorderLevel} ${item.unit}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: stockRatio,
                backgroundColor: AppColors.borderLight,
                valueColor: AlwaysStoppedAnimation<Color>(statusColor),
                minHeight: 6,
              ),
            ),
            const SizedBox(height: 12),

            // Bottom Actions & Valuation Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '₹${item.costPerUnit.toStringAsFixed(1)}/${item.unit} • Total: ₹${item.totalValuation.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                if (canWrite)
                  ElevatedButton.icon(
                    onPressed: onAdjust,
                    icon: const Icon(LucideIcons.sliders, size: 14),
                    label: const Text('Adjust'),
                    style: ElevatedButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AdjustTypeTab extends StatelessWidget {
  final String title;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _AdjustTypeTab({
    required this.title,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          title,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : Colors.black87,
          ),
        ),
      ),
    );
  }
}
