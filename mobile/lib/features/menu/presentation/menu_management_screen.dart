import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/access/guards.dart';
import '../../../core/access/access_controller.dart';
import '../../../core/network/supabase_config.dart';
import '../../../core/theme/app_theme.dart';
import '../models/menu_item_model.dart';
import 'edit_menu_item_dialog.dart';

/// Helper to get category emoji mirroring web CategoryBar.tsx
String getCategoryEmoji(String category) {
  final cat = category.toLowerCase();
  if (cat.contains('noodle') || cat.contains('pasta') || cat.contains('chowmein')) return '🍜';
  if (cat.contains('pizza')) return '🍕';
  if (cat.contains('burger')) return '🍔';
  if (cat.contains('sandwich') || cat.contains('toast') || cat.contains('bread')) return '🥪';
  if (cat.contains('starter') || cat.contains('tikka') || cat.contains('momo') || cat.contains('roll')) return '🥟';
  if (cat.contains('rice') || cat.contains('biryani') || cat.contains('thali') || cat.contains('pulao')) return '🍛';
  if (cat.contains('soup')) return '🍲';
  if (cat.contains('coffee') || cat.contains('tea')) return '☕';
  if (cat.contains('drink') || cat.contains('shake') || cat.contains('beverage') || cat.contains('cold')) return '🥤';
  if (cat.contains('dessert') || cat.contains('ice cream') || cat.contains('cake') || cat.contains('sweet')) return '🍨';
  if (cat.contains('snack') || cat.contains('fries') || cat.contains('chaat')) return '🍟';
  return '🍽️';
}

/// Helper to get category gradient mirroring web getCategoryGradient
LinearGradient getCategoryGradient(String category, bool? isVeg) {
  final cat = category.toLowerCase();
  if (cat.contains('noodle') || cat.contains('chinese')) {
    return const LinearGradient(
      colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }
  if (cat.contains('starter') || cat.contains('momo') || cat.contains('tikka')) {
    return const LinearGradient(
      colors: [Color(0xFF10B981), Color(0xFF06B6D4)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }
  if (cat.contains('pizza') || cat.contains('burger')) {
    return const LinearGradient(
      colors: [Color(0xFFF97316), Color(0xFFE11D48)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }
  if (cat.contains('beverage') || cat.contains('coffee') || cat.contains('shake')) {
    return const LinearGradient(
      colors: [Color(0xFF06B6D4), Color(0xFF3B82F6)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }
  if (cat.contains('dessert') || cat.contains('sweet')) {
    return const LinearGradient(
      colors: [Color(0xFFEC4899), Color(0xFF8B5CF6)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }
  if (isVeg == false) {
    return const LinearGradient(
      colors: [Color(0xFFEF4444), Color(0xFFEA580C)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }
  return const LinearGradient(
    colors: [Color(0xFF10B981), Color(0xFF059669)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

class MenuManagementScreen extends StatefulWidget {
  final String restaurantId;
  final String restaurantName;

  const MenuManagementScreen({
    super.key,
    this.restaurantId = 'rest_default',
    this.restaurantName = 'Tasty Bite Harbor',
  });

  @override
  State<MenuManagementScreen> createState() => _MenuManagementScreenState();
}

class _MenuManagementScreenState extends State<MenuManagementScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'All';
  String _activeFilter = 'all'; // 'all' | 'in_stock' | 'out_of_stock' | 'veg' | 'non_veg'

  List<MenuItem> _menuItems = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadMenuItems();
  }

  Future<void> _loadMenuItems() async {
    setState(() => _isLoading = true);
    final rid = AccessController().restaurantId ?? widget.restaurantId;
    if (rid.isNotEmpty && rid != 'rest_default') {
      try {
        final res = await SupabaseConfig.client
            .from('menu_items')
            .select()
            .eq('restaurant_id', rid)
            .order('name');
        if (res.isNotEmpty && mounted) {
          setState(() {
            _menuItems = (res as List).map((r) => MenuItem.fromMap(r)).toList();
            _isLoading = false;
          });
          return;
        }
      } catch (e) {
        debugPrint('[MenuManagementScreen] Load error: $e');
      }
    }
    if (mounted) {
      setState(() {
        _menuItems = kDebugMode ? _getSeedMenuItems() : [];
        _isLoading = false;
      });
    }
  }

  List<MenuItem> _getSeedMenuItems() {
    return [
      MenuItem(
        id: 'item_1',
        restaurantId: widget.restaurantId,
        name: 'Paneer Butter Masala',
        price: 280.0,
        category: 'Main Course',
        description: 'Rich cottage cheese cubes simmered in spiced tomato & creamy butter gravy.',
        isAvailable: true,
        isVeg: true,
        isSpecial: true,
      ),
      MenuItem(
        id: 'item_2',
        restaurantId: widget.restaurantId,
        name: 'Butter Chicken',
        price: 360.0,
        category: 'Main Course',
        description: 'Tender tandoori chicken cooked in velvety tomato, makhani sauce and fresh cream.',
        isAvailable: true,
        isVeg: false,
        isSpecial: true,
      ),
      MenuItem(
        id: 'item_3',
        restaurantId: widget.restaurantId,
        name: 'Veg Dum Biryani',
        price: 240.0,
        category: 'Biryani',
        description: 'Fragrant basmati rice layered with garden vegetables, saffron and fried onions.',
        isAvailable: true,
        isVeg: true,
      ),
      MenuItem(
        id: 'item_4',
        restaurantId: widget.restaurantId,
        name: 'Crispy Paneer Tikka',
        price: 220.0,
        category: 'Starters',
        description: 'Chargrilled cottage cheese marinated in hung curd, mustard oil & carom seeds.',
        isAvailable: false, // 86'd out of stock demo
        isVeg: true,
      ),
      MenuItem(
        id: 'item_5',
        restaurantId: widget.restaurantId,
        name: 'Schezwan Hakka Noodles',
        price: 190.0,
        category: 'Noodles',
        description: 'Wok tossed noodles with crunchy bell peppers, cabbage and spicy schezwan sauce.',
        isAvailable: true,
        isVeg: true,
      ),
      MenuItem(
        id: 'item_6',
        restaurantId: widget.restaurantId,
        name: 'Double Cheese Margherita',
        price: 320.0,
        category: 'Pizzas',
        description: 'San Marzano tomato sauce, fresh mozzarella pearls, basil leaves and olive oil.',
        isAvailable: true,
        isVeg: true,
      ),
      MenuItem(
        id: 'item_7',
        restaurantId: widget.restaurantId,
        name: 'Artisan Cold Brew Coffee',
        price: 140.0,
        category: 'Beverages',
        description: '18-hour slow extracted Arabica blend poured over crystal ice with vanilla cold foam.',
        isAvailable: true,
        isVeg: true,
      ),
      MenuItem(
        id: 'item_8',
        restaurantId: widget.restaurantId,
        name: 'Warm Choco Lava Brownie',
        price: 160.0,
        category: 'Desserts',
        description: 'Gooey belgian chocolate molten cake served with a scoop of madagascar vanilla bean.',
        isAvailable: true,
        isVeg: true,
        isSpecial: true,
      ),
    ];
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  // Quick 86 instant toggle action
  Future<void> _toggleAvailability(String itemId) async {
    final index = _menuItems.indexWhere((it) => it.id == itemId);
    if (index == -1) return;

    final current = _menuItems[index];
    final newStatus = !current.isAvailable;

    try {
      final rid = AccessController().restaurantId ?? widget.restaurantId;
      var q = SupabaseConfig.client
          .from('menu_items')
          .update({'is_available': newStatus})
          .eq('id', itemId);
      if (rid.isNotEmpty && rid != 'rest_default') {
        q = q.eq('restaurant_id', rid);
      }
      await q;
    } catch (e) {
      debugPrint('[MenuManagementScreen] Toggle 86 remote error: $e');
    }

    if (!mounted) return;
    setState(() {
      _menuItems[index] = current.copyWith(isAvailable: newStatus);
    });

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              newStatus ? LucideIcons.checkCircle2 : LucideIcons.alertCircle,
              color: Colors.white,
              size: 18,
            ),
            const SizedBox(width: 8),
            Text(
              newStatus
                ? '${current.name} is now IN STOCK'
                : '${current.name} is now 86\'d (OUT OF STOCK)',
              style: GoogleFonts.inter(fontWeight: FontWeight.w600),
            ),
          ],
        ),
        backgroundColor: newStatus ? AppColors.available : AppColors.destructive,
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _openEditDialog([MenuItem? item]) async {
    final activeRid = AccessController().restaurantId ?? widget.restaurantId;
    final result = await EditMenuItemDialog.show(
      context,
      item: item,
      restaurantId: activeRid,
    );

    if (result != null) {
      try {
        await SupabaseConfig.client
            .from('menu_items')
            .upsert(result.toMap());
      } catch (e) {
        debugPrint('[MenuManagementScreen] Persist error: $e');
      }

      if (!mounted) return;
      setState(() {
        if (item != null) {
          final idx = _menuItems.indexWhere((it) => it.id == item.id);
          if (idx != -1) {
            _menuItems[idx] = result;
          }
        } else {
          _menuItems.insert(0, result);
        }
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            item != null ? 'Item updated successfully' : 'New item added to catalog',
            style: GoogleFonts.inter(),
          ),
          backgroundColor: AppColors.available,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _confirmDelete(MenuItem item) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Delete Menu Item?',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
        ),
        content: Text(
          'Are you sure you want to remove "${item.name}" from your menu?',
          style: GoogleFonts.inter(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                await SupabaseConfig.client
                    .from('menu_items')
                    .delete()
                    .eq('id', item.id);
              } catch (e) {
                debugPrint('[MenuManagementScreen] Delete error: $e');
              }
              if (!mounted) return;
              setState(() {
                _menuItems.removeWhere((it) => it.id == item.id);
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('${item.name} removed from menu'),
                  backgroundColor: AppColors.destructive,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.destructive),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  List<String> get _categories {
    final cats = _menuItems.map((e) => e.category).toSet().toList();
    cats.sort();
    return ['All', ...cats];
  }

  List<MenuItem> get _filteredItems {
    final query = _searchController.text.trim().toLowerCase();

    return _menuItems.where((item) {
      // Category filter
      if (_selectedCategory != 'All' && item.category != _selectedCategory) {
        return false;
      }

      // Stock & Dietary filter
      if (_activeFilter == 'in_stock' && !item.isAvailable) return false;
      if (_activeFilter == 'out_of_stock' && item.isAvailable) return false;
      if (_activeFilter == 'veg' && item.isVeg != true) return false;
      if (_activeFilter == 'non_veg' && item.isVeg != false) return false;

      // Search query
      if (query.isNotEmpty) {
        final matchesName = item.name.toLowerCase().contains(query);
        final matchesDesc = item.description?.toLowerCase().contains(query) ?? false;
        final matchesCat = item.category.toLowerCase().contains(query);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final totalCount = _menuItems.length;
    final availableCount = _menuItems.where((i) => i.isAvailable).length;
    final outOfStockCount = totalCount - availableCount;
    final filtered = _filteredItems;

    return PermissionGuard(
      permission: 'menu.view',
      child: Scaffold(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        appBar: AppBar(
          elevation: 0,
          backgroundColor: isDark ? AppColors.cardDark : Colors.white,
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF059669), Color(0xFF10B981)],
                  ),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF10B981).withAlpha(50),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(LucideIcons.chefHat, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Menu Catalog',
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.textDark : AppColors.textLight,
                    ),
                  ),
                  Text(
                    widget.restaurantName,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(LucideIcons.plusCircle, color: AppColors.primary),
              tooltip: 'Add Menu Item',
              onPressed: () => _openEditDialog(),
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _openEditDialog(),
          backgroundColor: AppColors.primary,
          icon: const Icon(LucideIcons.plus, color: Colors.white),
          label: Text(
            'New Item',
            style: GoogleFonts.inter(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        body: Column(
          children: [
            // KPI Summary Row (Total, In Stock, 86'd)
            _buildKpiSummaryBar(isDark, totalCount, availableCount, outOfStockCount),

            // Search Bar & Filter Chips
            _buildSearchAndFilters(isDark),

            // Category Tabs
            _buildCategoryBar(isDark),

            const SizedBox(height: 8),

            // Item Cards List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : filtered.isEmpty
                      ? _buildEmptyState(isDark)
                      : ListView.builder(
                      padding: const EdgeInsets.only(left: 16, right: 16, bottom: 90, top: 4),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        return _buildMenuItemCard(filtered[index], isDark);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiSummaryBar(
    bool isDark,
    int totalCount,
    int availableCount,
    int outOfStockCount,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: isDark ? AppColors.cardDark.withAlpha(128) : Colors.white,
      child: Row(
        children: [
          _buildStatPill('Total Items', totalCount.toString(), isDark, Colors.indigo),
          const SizedBox(width: 8),
          _buildStatPill('In Stock', availableCount.toString(), isDark, AppColors.available),
          const SizedBox(width: 8),
          _buildStatPill('86\'d Out', outOfStockCount.toString(), isDark, AppColors.destructive),
        ],
      ),
    );
  }

  Widget _buildStatPill(String label, String value, bool isDark, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: color.withAlpha(20),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withAlpha(45)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: isDark ? AppColors.textDark : AppColors.textLight,
              ),
            ),
            Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchAndFilters(bool isDark) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      color: isDark ? AppColors.bgDark : AppColors.bgLight,
      child: Column(
        children: [
          // Search TextField
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.cardDark : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(8),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
              style: GoogleFonts.inter(fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Search dishes, categories, ingredients...',
                hintStyle: GoogleFonts.inter(fontSize: 13, color: Colors.grey),
                prefixIcon: const Icon(LucideIcons.search, size: 18),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(LucideIcons.x, size: 16),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {});
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          const SizedBox(height: 8),
          // Sub-Filter Pills
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip('All Status', 'all', isDark),
                const SizedBox(width: 6),
                _buildFilterChip('🟢 In Stock', 'in_stock', isDark),
                const SizedBox(width: 6),
                _buildFilterChip('🔴 86\'d (Out)', 'out_of_stock', isDark),
                const SizedBox(width: 6),
                _buildFilterChip('🌱 Pure Veg', 'veg', isDark),
                const SizedBox(width: 6),
                _buildFilterChip('🍗 Non-Veg', 'non_veg', isDark),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value, bool isDark) {
    final isSelected = _activeFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _activeFilter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary
              : (isDark ? AppColors.cardDark : Colors.white),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? AppColors.primary
                : (isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected
                ? Colors.white
                : (isDark ? AppColors.textDark : AppColors.textLight),
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryBar(bool isDark) {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _categories.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, idx) {
          final cat = _categories[idx];
          final isSelected = _selectedCategory == cat;
          final emoji = cat == 'All' ? '✨' : getCategoryEmoji(cat);
          final count = cat == 'All'
              ? _menuItems.length
              : _menuItems.where((i) => i.category == cat).length;

          return ChoiceChip(
            showCheckmark: false,
            avatar: Text(emoji, style: const TextStyle(fontSize: 13)),
            label: Text('$cat ($count)'),
            selected: isSelected,
            selectedColor: AppColors.primary,
            backgroundColor: isDark ? AppColors.cardDark : Colors.white,
            labelStyle: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? Colors.white : (isDark ? AppColors.textDark : AppColors.textLight),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(
                color: isSelected
                    ? AppColors.primary
                    : (isDark ? AppColors.borderDark : AppColors.borderLight),
              ),
            ),
            onSelected: (_) => setState(() => _selectedCategory = cat),
          );
        },
      ),
    );
  }

  Widget _buildMenuItemCard(MenuItem item, bool isDark) {
    final isAvailable = item.isAvailable;
    final hasCustomImage = item.imageUrl != null &&
        item.imageUrl!.isNotEmpty &&
        !item.imageUrl!.contains('placeholder');
    final emoji = getCategoryEmoji(item.category);
    final gradient = getCategoryGradient(item.category, item.isVeg);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: !isAvailable
              ? AppColors.destructive.withAlpha(90)
              : (isDark ? AppColors.borderDark : AppColors.borderLight),
          width: !isAvailable ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(isDark ? 30 : 12),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top Accent Line
          Container(
            height: 3,
            color: !isAvailable
                ? Colors.grey
                : (item.isSpecial
                    ? Colors.purpleAccent
                    : (item.isVeg == true ? Colors.green : Colors.deepOrange)),
          ),

          // Main Row: Image/Emoji Thumbnail + Info
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Food Image or Gradient Fallback Box
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: hasCustomImage ? null : gradient,
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (hasCustomImage)
                        Image.network(
                          item.imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Center(
                            child: Text(emoji, style: const TextStyle(fontSize: 34)),
                          ),
                        )
                      else
                        Center(
                          child: Text(
                            emoji,
                            style: const TextStyle(fontSize: 36),
                          ),
                        ),
                      // Availability overlay if 86'd
                      if (!isAvailable)
                        Container(
                          color: Colors.black.withAlpha(140),
                          child: Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.destructive,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '86\'D',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                const SizedBox(width: 12),

                // Details Column
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badge Row
                      Row(
                        children: [
                          // Veg / Non-Veg Indicator Icon
                          Container(
                            width: 14,
                            height: 14,
                            padding: const EdgeInsets.all(2.5),
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: item.isVeg == true ? Colors.green : Colors.red,
                                width: 1.5,
                              ),
                              borderRadius: BorderRadius.circular(3),
                            ),
                            child: Container(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: item.isVeg == true ? Colors.green : Colors.red,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          // Category
                          Text(
                            item.category,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF059669),
                            ),
                          ),
                          if (item.isSpecial) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Colors.purple, Colors.pink],
                                ),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '⭐ Special',
                                style: GoogleFonts.inter(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),

                      const SizedBox(height: 4),

                      // Name
                      Text(
                        item.name,
                        style: GoogleFonts.poppins(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          decoration: isAvailable ? null : TextDecoration.lineThrough,
                          color: isAvailable
                              ? (isDark ? AppColors.textDark : AppColors.textLight)
                              : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),

                      if (item.description != null && item.description!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          item.description!,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],

                      const SizedBox(height: 6),

                      // Price Tag
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF0F172A) : const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '₹${item.price.toStringAsFixed(2)}',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Divider
          Divider(
            height: 1,
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),

          // Bottom Bar: Instant Quick 86 Toggle + Edit & Delete
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            color: isDark ? AppColors.bgDark.withAlpha(90) : AppColors.bgLight.withAlpha(180),
            child: Row(
              children: [
                // Quick 86 Switch
                Expanded(
                  child: Row(
                    children: [
                      Switch.adaptive(
                        value: isAvailable,
                        activeTrackColor: AppColors.available,
                        onChanged: (_) => _toggleAvailability(item.id),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isAvailable ? 'In Stock' : '86\'d Out',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: isAvailable ? AppColors.available : AppColors.destructive,
                        ),
                      ),
                    ],
                  ),
                ),

                // Edit Button
                OutlinedButton.icon(
                  icon: const Icon(LucideIcons.edit2, size: 13),
                  label: const Text('Edit'),
                  onPressed: () => _openEditDialog(item),
                  style: OutlinedButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    side: BorderSide(
                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                    ),
                  ),
                ),

                const SizedBox(width: 6),

                // Delete Button
                IconButton(
                  icon: const Icon(LucideIcons.trash2, size: 16, color: AppColors.destructive),
                  tooltip: 'Delete item',
                  onPressed: () => _confirmDelete(item),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withAlpha(20),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.utensils, size: 36, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            Text(
              'No menu items found',
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.textDark : AppColors.textLight,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Try clearing your search query or category filters.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 12,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () {
                _searchController.clear();
                setState(() {
                  _selectedCategory = 'All';
                  _activeFilter = 'all';
                });
              },
              icon: const Icon(LucideIcons.refreshCw, size: 14),
              label: const Text('Reset Filters'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
