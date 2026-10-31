import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/access/guards.dart';
import '../../../core/theme/app_theme.dart';
import '../models/recipe_model.dart';

class RecipeManagementScreen extends StatefulWidget {
  final String restaurantId;
  final String restaurantName;

  const RecipeManagementScreen({
    super.key,
    this.restaurantId = 'rest_default',
    this.restaurantName = 'Tasty Bite Harbor',
  });

  @override
  State<RecipeManagementScreen> createState() => _RecipeManagementScreenState();
}

class _RecipeManagementScreenState extends State<RecipeManagementScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'All';
  String _sortBy = 'name'; // 'name' | 'cost_asc' | 'cost_desc' | 'margin' | 'food_cost'

  // Map of recipe id to selected portion multiplier (default 1.0)
  final Map<String, double> _portionMultipliers = {};

  // Set of expanded recipe card IDs to show ingredient lists
  final Set<String> _expandedCards = {};

  late List<Recipe> _recipes;

  @override
  void initState() {
    super.initState();
    _initSeedRecipes();
  }

  void _initSeedRecipes() {
    _recipes = [
      Recipe(
        id: 'rec_1',
        name: 'Butter Chicken Masala',
        category: 'Main Course',
        description: 'Tender chicken marinated in yogurt and tandoori spices, cooked in a velvety tomato makhani gravy.',
        sellingPrice: 380.0,
        costPerServing: 104.5,
        servingSize: 1.0,
        servingUnit: 'portion',
        prepTimeMinutes: 20,
        cookTimeMinutes: 25,
        difficulty: 'medium',
        isActive: true,
        ingredients: const [
          RecipeIngredient(id: 'i1', name: 'Fresh Chicken Breast', quantity: 250, unit: 'g', unitCost: 0.24), // 60.0
          RecipeIngredient(id: 'i2', name: 'Amul Butter', quantity: 35, unit: 'g', unitCost: 0.55), // 19.25
          RecipeIngredient(id: 'i3', name: 'Fresh Dairy Cream', quantity: 30, unit: 'ml', unitCost: 0.28), // 8.4
          RecipeIngredient(id: 'i4', name: 'Tomato Makhani Puree', quantity: 150, unit: 'g', unitCost: 0.06), // 9.0
          RecipeIngredient(id: 'i5', name: 'Kasuri Methi & Garam Masala', quantity: 10, unit: 'g', unitCost: 0.785), // 7.85
        ],
      ),
      Recipe(
        id: 'rec_2',
        name: 'Paneer Tikka Platter',
        category: 'Appetizer',
        description: 'Smoky skewered paneer cubes with bell peppers and onions, tossed in chaat masala.',
        sellingPrice: 260.0,
        costPerServing: 68.0,
        servingSize: 1.0,
        servingUnit: 'plate',
        prepTimeMinutes: 15,
        cookTimeMinutes: 12,
        difficulty: 'easy',
        isActive: true,
        ingredients: const [
          RecipeIngredient(id: 'i6', name: 'Fresh Malai Paneer', quantity: 200, unit: 'g', unitCost: 0.25), // 50.0
          RecipeIngredient(id: 'i7', name: 'Hung Curd Marinade', quantity: 60, unit: 'g', unitCost: 0.12), // 7.2
          RecipeIngredient(id: 'i8', name: 'Bell Peppers & Onion', quantity: 80, unit: 'g', unitCost: 0.06), // 4.8
          RecipeIngredient(id: 'i9', name: 'Mustard Oil & Spices', quantity: 15, unit: 'ml', unitCost: 0.40), // 6.0
        ],
      ),
      Recipe(
        id: 'rec_3',
        name: 'Hyderabadi Dum Biryani',
        category: 'Main Course',
        description: 'Long grain aged basmati steamed with whole spices, saffron milk and fried onions.',
        sellingPrice: 320.0,
        costPerServing: 82.0,
        servingSize: 1.0,
        servingUnit: 'handi',
        prepTimeMinutes: 30,
        cookTimeMinutes: 40,
        difficulty: 'hard',
        isActive: true,
        ingredients: const [
          RecipeIngredient(id: 'i10', name: 'Daawat Basmati Rice', quantity: 180, unit: 'g', unitCost: 0.18), // 32.4
          RecipeIngredient(id: 'i11', name: 'Pure Desi Ghee', quantity: 30, unit: 'ml', unitCost: 0.65), // 19.5
          RecipeIngredient(id: 'i12', name: 'Kashmiri Saffron & Spices', quantity: 5, unit: 'g', unitCost: 2.40), // 12.0
          RecipeIngredient(id: 'i13', name: 'Fried Onions (Birista)', quantity: 40, unit: 'g', unitCost: 0.22), // 8.8
          RecipeIngredient(id: 'i14', name: 'Mint & Coriander Bunch', quantity: 25, unit: 'g', unitCost: 0.372), // 9.3
        ],
      ),
      Recipe(
        id: 'rec_4',
        name: 'Belgian Molten Choco Lava',
        category: 'Dessert',
        description: 'Decadent chocolate cake with a warm flowing dark truffle core.',
        sellingPrice: 180.0,
        costPerServing: 42.0,
        servingSize: 1.0,
        servingUnit: 'portion',
        prepTimeMinutes: 10,
        cookTimeMinutes: 14,
        difficulty: 'easy',
        isActive: true,
        ingredients: const [
          RecipeIngredient(id: 'i15', name: 'Callebaut 54% Dark Chocolate', quantity: 50, unit: 'g', unitCost: 0.48), // 24.0
          RecipeIngredient(id: 'i16', name: 'Unsalted Dairy Butter', quantity: 25, unit: 'g', unitCost: 0.44), // 11.0
          RecipeIngredient(id: 'i17', name: 'Organic Egg / Eggless Substitute', quantity: 1, unit: 'unit', unitCost: 5.0), // 5.0
          RecipeIngredient(id: 'i18', name: 'Caster Sugar & Flour', quantity: 20, unit: 'g', unitCost: 0.10), // 2.0
        ],
      ),
      Recipe(
        id: 'rec_5',
        name: 'Artisan Cold Brew Tonic',
        category: 'Beverage',
        description: 'Single-origin washed Arabica coffee, sparkling tonic water and dehydrated orange slice.',
        sellingPrice: 160.0,
        costPerServing: 32.0,
        servingSize: 1.0,
        servingUnit: 'glass',
        prepTimeMinutes: 5,
        cookTimeMinutes: 0,
        difficulty: 'easy',
        isActive: true,
        ingredients: const [
          RecipeIngredient(id: 'i19', name: 'Specialty Cold Brew Extract', quantity: 90, unit: 'ml', unitCost: 0.20), // 18.0
          RecipeIngredient(id: 'i20', name: 'Schweppes Craft Tonic', quantity: 150, unit: 'ml', unitCost: 0.08), // 12.0
          RecipeIngredient(id: 'i21', name: 'Dehydrated Orange Wheel', quantity: 1, unit: 'slice', unitCost: 2.0), // 2.0
        ],
      ),
    ];
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  double _getMultiplier(String recipeId) {
    return _portionMultipliers[recipeId] ?? 1.0;
  }

  void _setMultiplier(String recipeId, double multiplier) {
    setState(() {
      _portionMultipliers[recipeId] = multiplier;
    });
  }

  void _toggleExpanded(String recipeId) {
    setState(() {
      if (_expandedCards.contains(recipeId)) {
        _expandedCards.remove(recipeId);
      } else {
        _expandedCards.add(recipeId);
      }
    });
  }

  Color _getFoodCostColor(double pct) {
    if (pct <= 0) return Colors.grey;
    if (pct < 30.0) return const Color(0xFF10B981); // Emerald / Ideal
    if (pct <= 35.0) return const Color(0xFFF59E0B); // Amber / Moderate
    return const Color(0xFFEF4444); // Red / High Food Cost Alert
  }

  String _getFoodCostStatus(double pct) {
    if (pct <= 0) return 'Neutral (N/A)';
    if (pct < 30.0) return 'Optimal (<30%)';
    if (pct <= 35.0) return 'Acceptable (30-35%)';
    return 'Critical Alert (>35%)';
  }

  List<String> get _categories {
    final cats = _recipes.map((e) => e.category).toSet().toList();
    cats.sort();
    return ['All', ...cats];
  }

  List<Recipe> get _filteredAndSortedRecipes {
    final query = _searchController.text.trim().toLowerCase();

    var list = _recipes.where((recipe) {
      if (_selectedCategory != 'All' && recipe.category != _selectedCategory) {
        return false;
      }
      if (query.isNotEmpty) {
        final matchesName = recipe.name.toLowerCase().contains(query);
        final matchesDesc = recipe.description?.toLowerCase().contains(query) ?? false;
        final matchesIng = recipe.ingredients.any((ing) => ing.name.toLowerCase().contains(query));
        if (!matchesName && !matchesDesc && !matchesIng) return false;
      }
      return true;
    }).toList();

    switch (_sortBy) {
      case 'name':
        list.sort((a, b) => a.name.compareTo(b.name));
        break;
      case 'cost_asc':
        list.sort((a, b) => a.effectiveCostPerServing.compareTo(b.effectiveCostPerServing));
        break;
      case 'cost_desc':
        list.sort((a, b) => b.effectiveCostPerServing.compareTo(a.effectiveCostPerServing));
        break;
      case 'margin':
        list.sort((a, b) => b.marginPercentage.compareTo(a.marginPercentage));
        break;
      case 'food_cost':
        list.sort((a, b) => a.foodCostPercentage.compareTo(b.foodCostPercentage));
        break;
    }

    return list;
  }

  void _openAddRecipeDialog() async {
    final nameCtrl = TextEditingController();
    final catCtrl = TextEditingController(text: 'Main Course');
    final priceCtrl = TextEditingController();
    final costCtrl = TextEditingController();
    final servingCtrl = TextEditingController(text: '1.0');

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(LucideIcons.chefHat, color: AppColors.primary, size: 20),
            const SizedBox(width: 8),
            Text(
              'Add New Recipe',
              style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Recipe Name *',
                  hintText: 'e.g. Tandoori Roti',
                  prefixIcon: Icon(LucideIcons.edit, size: 16),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: catCtrl,
                decoration: const InputDecoration(
                  labelText: 'Category',
                  hintText: 'e.g. Breads / Starters',
                  prefixIcon: Icon(LucideIcons.layers, size: 16),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: priceCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Selling Price (₹)',
                        hintText: '0.00',
                        prefixIcon: Icon(LucideIcons.dollarSign, size: 16),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: costCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Cost Per Serving (₹)',
                        hintText: '0.00',
                        prefixIcon: Icon(LucideIcons.calculator, size: 16),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: servingCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Serving Yield',
                  hintText: '1.0',
                  prefixIcon: Icon(LucideIcons.users, size: 16),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final name = nameCtrl.text.trim();
              if (name.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please enter a recipe name'),
                    backgroundColor: AppColors.destructive,
                  ),
                );
                return;
              }
              final sellingPrice = double.tryParse(priceCtrl.text.trim()) ?? 0.0;
              final costPerServing = double.tryParse(costCtrl.text.trim()) ?? 0.0;
              final servingSize = double.tryParse(servingCtrl.text.trim()) ?? 1.0;
              if (sellingPrice < 0 || costPerServing < 0 || servingSize <= 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Values must be non-negative and serving size > 0'),
                    backgroundColor: AppColors.destructive,
                  ),
                );
                return;
              }

              final newRecipe = Recipe(
                id: 'rec_${DateTime.now().millisecondsSinceEpoch}',
                name: name,
                category: catCtrl.text.trim().isEmpty ? 'General' : catCtrl.text.trim(),
                sellingPrice: sellingPrice,
                costPerServing: costPerServing,
                servingSize: servingSize,
                ingredients: const [],
              );

              setState(() {
                _recipes.insert(0, newRecipe);
              });
              Navigator.of(ctx).pop();

              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Recipe "${newRecipe.name}" created'),
                  backgroundColor: AppColors.available,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Create Recipe'),
          ),
        ],
      ),
    );

    nameCtrl.dispose();
    catCtrl.dispose();
    priceCtrl.dispose();
    costCtrl.dispose();
    servingCtrl.dispose();
  }

  void _confirmDeleteRecipe(Recipe recipe) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Delete Recipe?',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
        ),
        content: Text(
          'Are you sure you want to delete "${recipe.name}"? This will remove all ingredient formulas.',
          style: GoogleFonts.inter(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              setState(() {
                _recipes.removeWhere((r) => r.id == recipe.id);
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Deleted recipe ${recipe.name}'),
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Calculate aggregate stats
    final totalCount = _recipes.length;
    final totalCost = _recipes.fold(0.0, (acc, r) => acc + r.effectiveCostPerServing);
    final avgFoodCostPct = _recipes.isNotEmpty
        ? _recipes.fold(0.0, (acc, r) => acc + r.foodCostPercentage) / _recipes.length
        : 0.0;
    final filtered = _filteredAndSortedRecipes;

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
                    colors: [Color(0xFFEA580C), Color(0xFFF59E0B)],
                  ),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFEA580C).withAlpha(50),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(LucideIcons.calculator, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Recipe Costing',
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.textDark : AppColors.textLight,
                    ),
                  ),
                  Text(
                    'Portion Scaling & Food Costing',
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
              icon: const Icon(LucideIcons.plusCircle, color: Color(0xFFEA580C)),
              tooltip: 'New Recipe',
              onPressed: _openAddRecipeDialog,
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: _openAddRecipeDialog,
          backgroundColor: const Color(0xFFEA580C),
          icon: const Icon(LucideIcons.plus, color: Colors.white),
          label: Text(
            'New Recipe',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: Colors.white),
          ),
        ),
        body: Column(
          children: [
            // KPI Summary Header
            _buildCostingKpiBar(isDark, totalCount, totalCost, avgFoodCostPct),

            // Search Bar & Sort Dropdown
            _buildSearchAndSortBar(isDark),

            // Category Filter Bar
            _buildCategoryBar(isDark),

            const SizedBox(height: 8),

            // Recipe Cards
            Expanded(
              child: filtered.isEmpty
                  ? _buildEmptyState(isDark)
                  : ListView.builder(
                      padding: const EdgeInsets.only(left: 16, right: 16, bottom: 90, top: 4),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        return _buildRecipeCard(filtered[index], isDark);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCostingKpiBar(
    bool isDark,
    int totalCount,
    double totalCost,
    double avgFoodCostPct,
  ) {
    final foodCostColor = _getFoodCostColor(avgFoodCostPct);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: isDark ? AppColors.cardDark.withAlpha(140) : Colors.white,
      child: Row(
        children: [
          // Total Formulas
          _buildKpiCard(
            label: 'Formulas',
            value: totalCount.toString(),
            color: Colors.blue,
            icon: LucideIcons.utensils,
            isDark: isDark,
          ),
          const SizedBox(width: 8),
          // Avg Food Cost %
          _buildKpiCard(
            label: 'Avg Food Cost',
            value: '${avgFoodCostPct.toStringAsFixed(1)}%',
            color: foodCostColor,
            icon: LucideIcons.percent,
            isDark: isDark,
          ),
          const SizedBox(width: 8),
          // Total Portion Cost
          _buildKpiCard(
            label: 'Catalog Cost',
            value: '₹${totalCost.toStringAsFixed(0)}',
            color: const Color(0xFFEA580C),
            icon: LucideIcons.dollarSign,
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard({
    required String label,
    required String value,
    required Color color,
    required IconData icon,
    required bool isDark,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: color.withAlpha(20),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withAlpha(50)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.textDark : AppColors.textLight,
                  ),
                ),
                Icon(icon, size: 14, color: color),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchAndSortBar(bool isDark) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          // Search input
          Expanded(
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: isDark ? AppColors.cardDark : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              ),
              child: TextField(
                controller: _searchController,
                onChanged: (_) => setState(() {}),
                style: GoogleFonts.inter(fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Search recipe or ingredient...',
                  hintStyle: GoogleFonts.inter(fontSize: 12, color: Colors.grey),
                  prefixIcon: const Icon(LucideIcons.search, size: 16),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(LucideIcons.x, size: 14),
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
          ),
          const SizedBox(width: 8),
          // Sort Dropdown
          Container(
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              color: isDark ? AppColors.cardDark : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _sortBy,
                icon: const Icon(LucideIcons.arrowUpDown, size: 16),
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.textDark : AppColors.textLight,
                ),
                dropdownColor: isDark ? AppColors.cardDark : Colors.white,
                items: const [
                  DropdownMenuItem(value: 'name', child: Text('Name')),
                  DropdownMenuItem(value: 'cost_asc', child: Text('Cost: Low to High')),
                  DropdownMenuItem(value: 'cost_desc', child: Text('Cost: High to Low')),
                  DropdownMenuItem(value: 'food_cost', child: Text('Food Cost %')),
                  DropdownMenuItem(value: 'margin', child: Text('Margin %')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _sortBy = val);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryBar(bool isDark) {
    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _categories.length,
        separatorBuilder: (context, index) => const SizedBox(width: 6),
        itemBuilder: (context, idx) {
          final cat = _categories[idx];
          final isSelected = _selectedCategory == cat;
          final count = cat == 'All'
              ? _recipes.length
              : _recipes.where((r) => r.category == cat).length;

          return ChoiceChip(
            showCheckmark: false,
            label: Text('$cat ($count)'),
            selected: isSelected,
            selectedColor: const Color(0xFFEA580C),
            backgroundColor: isDark ? AppColors.cardDark : Colors.white,
            labelStyle: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? Colors.white : (isDark ? AppColors.textDark : AppColors.textLight),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(
                color: isSelected
                    ? const Color(0xFFEA580C)
                    : (isDark ? AppColors.borderDark : AppColors.borderLight),
              ),
            ),
            onSelected: (_) => setState(() => _selectedCategory = cat),
          );
        },
      ),
    );
  }

  Widget _buildRecipeCard(Recipe baseRecipe, bool isDark) {
    final multiplier = _getMultiplier(baseRecipe.id);
    // Apply dynamic portion multiplier
    final recipe = baseRecipe.scaled(multiplier);
    final isExpanded = _expandedCards.contains(recipe.id);

    final costPerServing = baseRecipe.effectiveCostPerServing;
    final totalScaledCost = recipe.totalIngredientCost;
    final sellingPrice = recipe.sellingPrice;
    final foodCostPct = baseRecipe.foodCostPercentage;
    final marginPct = baseRecipe.marginPercentage;
    final foodCostColor = _getFoodCostColor(foodCostPct);
    final foodCostLabel = _getFoodCostStatus(foodCostPct);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(isDark ? 30 : 10),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Card Header with category badge & food cost alert pill
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEA580C).withAlpha(20),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              recipe.category,
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFEA580C),
                              ),
                            ),
                          ),
                          if (recipe.prepTimeMinutes != null) ...[
                            const SizedBox(width: 8),
                            Row(
                              children: [
                                const Icon(LucideIcons.clock, size: 12, color: Colors.grey),
                                const SizedBox(width: 3),
                                Text(
                                  '${recipe.prepTimeMinutes}m prep',
                                  style: GoogleFonts.inter(fontSize: 10, color: Colors.grey),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        recipe.name,
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.textDark : AppColors.textLight,
                        ),
                      ),
                    ],
                  ),
                ),

                // Food Cost % Indicator Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: foodCostColor.withAlpha(25),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: foodCostColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.percent, size: 11, color: foodCostColor),
                          const SizedBox(width: 2),
                          Text(
                            '${foodCostPct.toStringAsFixed(1)}%',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: foodCostColor,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        foodCostLabel,
                        style: GoogleFonts.inter(
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                          color: foodCostColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Cost Metrics Grid
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                _buildMetricColumn('Cost / Serving', '₹${costPerServing.toStringAsFixed(2)}', Colors.blue, isDark),
                _buildMetricColumn('Selling Price', '₹${sellingPrice.toStringAsFixed(2)}', AppColors.available, isDark),
                _buildMetricColumn('Gross Margin', '${marginPct.toStringAsFixed(1)}%', Colors.purple, isDark),
                _buildMetricColumn(
                  multiplier != 1.0 ? 'Scaled Cost (${multiplier}x)' : 'Total Cost',
                  '₹${totalScaledCost.toStringAsFixed(2)}',
                  const Color(0xFFEA580C),
                  isDark,
                ),
              ],
            ),
          ),

          // Portion Multiplier Bar (0.5x, 1x, 2x, 4x, 10x)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            color: isDark ? AppColors.bgDark.withAlpha(80) : AppColors.bgLight,
            child: Row(
              children: [
                const Icon(LucideIcons.scale, size: 14, color: Colors.grey),
                const SizedBox(width: 6),
                Text(
                  'Portion Multiplier:',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.textDark : AppColors.textLight,
                  ),
                ),
                const Spacer(),
                Wrap(
                  spacing: 4,
                  children: [0.5, 1.0, 2.0, 4.0, 10.0].map((val) {
                    final isSel = multiplier == val;
                    return GestureDetector(
                      onTap: () => _setMultiplier(baseRecipe.id, val),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isSel ? const Color(0xFFEA580C) : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSel
                                ? const Color(0xFFEA580C)
                                : (isDark ? AppColors.borderDark : AppColors.borderLight),
                          ),
                        ),
                        child: Text(
                          '${val}x',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                            color: isSel
                                ? Colors.white
                                : (isDark ? AppColors.textDark : AppColors.textLight),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),

          // Expandable Ingredients Section Header
          InkWell(
            onTap: () => _toggleExpanded(baseRecipe.id),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.clipboardList, size: 14, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Ingredient Breakdown (${recipe.ingredients.length} items)',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.textDark : AppColors.textLight,
                    ),
                  ),
                  const Spacer(),
                  Icon(
                    isExpanded ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                    size: 16,
                    color: Colors.grey,
                  ),
                ],
              ),
            ),
          ),

          // Ingredient Breakdown Table
          if (isExpanded)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              color: isDark ? AppColors.bgDark.withAlpha(120) : AppColors.bgLight.withAlpha(120),
              child: Column(
                children: [
                  // Table Header
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 5,
                          child: Text(
                            'Ingredient',
                            style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.grey),
                          ),
                        ),
                        Expanded(
                          flex: 3,
                          child: Text(
                            'Quantity',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.grey),
                          ),
                        ),
                        Expanded(
                          flex: 3,
                          child: Text(
                            'Unit Cost',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.grey),
                          ),
                        ),
                        Expanded(
                          flex: 3,
                          child: Text(
                            'Line Cost',
                            textAlign: TextAlign.right,
                            style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.grey),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  const SizedBox(height: 4),
                  // Ingredient Rows
                  ...recipe.ingredients.map((ing) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 5,
                            child: Text(
                              ing.name,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: isDark ? AppColors.textDark : AppColors.textLight,
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 3,
                            child: Text(
                              '${ing.quantity.toStringAsFixed(ing.quantity.truncateToDouble() == ing.quantity ? 0 : 1)} ${ing.unit}',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.inter(fontSize: 11, color: Colors.grey),
                            ),
                          ),
                          Expanded(
                            flex: 3,
                            child: Text(
                              '₹${ing.unitCost.toStringAsFixed(2)}',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.inter(fontSize: 11, color: Colors.grey),
                            ),
                          ),
                          Expanded(
                            flex: 3,
                            child: Text(
                              '₹${ing.totalCost.toStringAsFixed(2)}',
                              textAlign: TextAlign.right,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.textDark : AppColors.textLight,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),

          // Bottom Action Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton.icon(
                  icon: const Icon(LucideIcons.scale, size: 12),
                  label: Text('Reset to 1x (${recipe.servingUnit ?? "portion"})'),
                  onPressed: () => _setMultiplier(baseRecipe.id, 1.0),
                  style: OutlinedButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(LucideIcons.trash2, size: 16, color: AppColors.destructive),
                  tooltip: 'Delete Recipe',
                  onPressed: () => _confirmDeleteRecipe(baseRecipe),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricColumn(String label, String value, Color color, bool isDark) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
        decoration: BoxDecoration(
          color: color.withAlpha(15),
          borderRadius: BorderRadius.circular(8),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
          ],
        ),
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
                color: const Color(0xFFEA580C).withAlpha(20),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.chefHat, size: 36, color: Color(0xFFEA580C)),
            ),
            const SizedBox(height: 16),
            Text(
              'No recipe formulas found',
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.textDark : AppColors.textLight,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Create a new recipe formula or adjust your search filter.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 12,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
