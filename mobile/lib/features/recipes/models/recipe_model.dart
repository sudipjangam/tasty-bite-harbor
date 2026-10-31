import 'dart:convert';

/// Single ingredient item in a recipe
class RecipeIngredient {
  final String id;
  final String name;
  final double quantity;
  final String unit;
  final double unitCost;
  final String? notes;

  const RecipeIngredient({
    required this.id,
    required this.name,
    required this.quantity,
    required this.unit,
    required this.unitCost,
    this.notes,
  });

  /// Total ingredient cost for base serving
  double get totalCost => quantity * unitCost;

  /// Returns scaled ingredient based on portion multiplier
  RecipeIngredient scale(double multiplier) {
    return copyWith(
      quantity: quantity * multiplier,
    );
  }

  RecipeIngredient copyWith({
    String? id,
    String? name,
    double? quantity,
    String? unit,
    double? unitCost,
    String? notes,
  }) {
    return RecipeIngredient(
      id: id ?? this.id,
      name: name ?? this.name,
      quantity: quantity ?? this.quantity,
      unit: unit ?? this.unit,
      unitCost: unitCost ?? this.unitCost,
      notes: notes ?? this.notes,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'quantity': quantity,
      'unit': unit,
      'unit_cost': unitCost,
      'notes': notes,
    };
  }

  factory RecipeIngredient.fromMap(Map<String, dynamic> map) {
    return RecipeIngredient(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ??
          (map['inventory_items'] is Map ? map['inventory_items']['name']?.toString() : null) ??
          'Ingredient',
      quantity: (map['quantity'] as num?)?.toDouble() ?? 0.0,
      unit: map['unit']?.toString() ??
          (map['inventory_items'] is Map ? map['inventory_items']['unit']?.toString() : null) ??
          'unit',
      unitCost: (map['unit_cost'] as num?)?.toDouble() ??
          (map['cost_per_unit'] as num?)?.toDouble() ??
          (map['inventory_items'] is Map
              ? (map['inventory_items']['cost_per_unit'] as num?)?.toDouble()
              : null) ??
          0.0,
      notes: map['notes']?.toString(),
    );
  }

  String toJson() => json.encode(toMap());

  factory RecipeIngredient.fromJson(String source) =>
      RecipeIngredient.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RecipeIngredient &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          quantity == other.quantity &&
          unit == other.unit &&
          unitCost == other.unitCost;

  @override
  int get hashCode => Object.hash(id, name, quantity, unit, unitCost);
}

/// Full Recipe model for food costing and recipe engineering
class Recipe {
  final String id;
  final String? menuItemId;
  final String name;
  final double costPerServing;
  final List<RecipeIngredient> ingredients;
  final String? description;
  final String category;
  final double sellingPrice;
  final double servingSize;
  final String? servingUnit;
  final int? prepTimeMinutes;
  final int? cookTimeMinutes;
  final String? difficulty; // 'easy' | 'medium' | 'hard'
  final String? instructions;
  final bool isActive;
  final String? imageUrl;
  final double? explicitFoodCostPercentage;

  const Recipe({
    required this.id,
    this.menuItemId,
    required this.name,
    required this.costPerServing,
    required this.ingredients,
    this.description,
    this.category = 'General',
    this.sellingPrice = 0.0,
    this.servingSize = 1.0,
    this.servingUnit = 'portion',
    this.prepTimeMinutes,
    this.cookTimeMinutes,
    this.difficulty = 'medium',
    this.instructions,
    this.isActive = true,
    this.imageUrl,
    this.explicitFoodCostPercentage,
  });

  /// Total cost of all raw ingredients in the recipe
  double get totalIngredientCost =>
      ingredients.fold(0.0, (acc, item) => acc + item.totalCost);

  /// Effective cost per single serving
  double get effectiveCostPerServing {
    if (costPerServing > 0) return costPerServing;
    if (servingSize > 0) return totalIngredientCost / servingSize;
    return totalIngredientCost;
  }

  /// Calculated Food Cost Percentage = (Cost Per Serving / Selling Price) * 100
  double get foodCostPercentage {
    if (explicitFoodCostPercentage != null && explicitFoodCostPercentage! > 0) {
      return explicitFoodCostPercentage!;
    }
    if (sellingPrice > 0) {
      return (effectiveCostPerServing / sellingPrice) * 100.0;
    }
    return 0.0;
  }

  /// Gross Margin Percentage = ((Selling Price - Cost) / Selling Price) * 100
  double get marginPercentage {
    if (sellingPrice > 0) {
      final margin = sellingPrice - effectiveCostPerServing;
      return (margin / sellingPrice) * 100.0;
    }
    return 0.0;
  }

  /// Create a scaled version of this recipe by a multiplier (e.g. 2x, 5x, 0.5x)
  Recipe scaled(double multiplier) {
    return copyWith(
      servingSize: servingSize * multiplier,
      ingredients: ingredients.map((ing) => ing.scale(multiplier)).toList(),
    );
  }

  Recipe copyWith({
    String? id,
    String? menuItemId,
    String? name,
    double? costPerServing,
    List<RecipeIngredient>? ingredients,
    String? description,
    String? category,
    double? sellingPrice,
    double? servingSize,
    String? servingUnit,
    int? prepTimeMinutes,
    int? cookTimeMinutes,
    String? difficulty,
    String? instructions,
    bool? isActive,
    String? imageUrl,
    double? explicitFoodCostPercentage,
  }) {
    return Recipe(
      id: id ?? this.id,
      menuItemId: menuItemId ?? this.menuItemId,
      name: name ?? this.name,
      costPerServing: costPerServing ?? this.costPerServing,
      ingredients: ingredients ?? this.ingredients,
      description: description ?? this.description,
      category: category ?? this.category,
      sellingPrice: sellingPrice ?? this.sellingPrice,
      servingSize: servingSize ?? this.servingSize,
      servingUnit: servingUnit ?? this.servingUnit,
      prepTimeMinutes: prepTimeMinutes ?? this.prepTimeMinutes,
      cookTimeMinutes: cookTimeMinutes ?? this.cookTimeMinutes,
      difficulty: difficulty ?? this.difficulty,
      instructions: instructions ?? this.instructions,
      isActive: isActive ?? this.isActive,
      imageUrl: imageUrl ?? this.imageUrl,
      explicitFoodCostPercentage: explicitFoodCostPercentage ?? this.explicitFoodCostPercentage,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'menu_item_id': menuItemId,
      'name': name,
      'cost_per_serving': costPerServing,
      'ingredients': ingredients.map((x) => x.toMap()).toList(),
      'description': description,
      'category': category,
      'selling_price': sellingPrice,
      'serving_size': servingSize,
      'serving_unit': servingUnit,
      'prep_time_minutes': prepTimeMinutes,
      'cook_time_minutes': cookTimeMinutes,
      'difficulty': difficulty,
      'instructions': instructions,
      'is_active': isActive,
      'image_url': imageUrl,
      'food_cost_percentage': explicitFoodCostPercentage,
    };
  }

  factory Recipe.fromMap(Map<String, dynamic> map) {
    List<RecipeIngredient> parsedIngredients = [];
    if (map['ingredients'] != null && map['ingredients'] is List) {
      parsedIngredients = (map['ingredients'] as List)
          .map((i) => RecipeIngredient.fromMap(i is Map<String, dynamic> ? i : {}))
          .toList();
    } else if (map['recipe_ingredients'] != null && map['recipe_ingredients'] is List) {
      parsedIngredients = (map['recipe_ingredients'] as List)
          .map((i) => RecipeIngredient.fromMap(i is Map<String, dynamic> ? i : {}))
          .toList();
    }

    final double cost = (map['cost_per_serving'] as num?)?.toDouble() ??
        (map['total_cost'] as num?)?.toDouble() ??
        0.0;
    final double selling = (map['selling_price'] as num?)?.toDouble() ?? 0.0;
    final double? fcPct = (map['food_cost_percentage'] as num?)?.toDouble();

    return Recipe(
      id: map['id']?.toString() ?? '',
      menuItemId: map['menu_item_id']?.toString() ?? map['menuItemId']?.toString(),
      name: map['name']?.toString() ?? '',
      costPerServing: cost,
      ingredients: parsedIngredients,
      description: map['description']?.toString(),
      category: map['category']?.toString() ?? 'General',
      sellingPrice: selling,
      servingSize: (map['serving_size'] as num?)?.toDouble() ?? 1.0,
      servingUnit: map['serving_unit']?.toString() ?? 'portion',
      prepTimeMinutes: (map['prep_time_minutes'] as num?)?.toInt(),
      cookTimeMinutes: (map['cook_time_minutes'] as num?)?.toInt(),
      difficulty: map['difficulty']?.toString() ?? 'medium',
      instructions: map['instructions']?.toString(),
      isActive: map['is_active'] as bool? ?? true,
      imageUrl: map['image_url']?.toString(),
      explicitFoodCostPercentage: fcPct,
    );
  }

  String toJson() => json.encode(toMap());

  factory Recipe.fromJson(String source) =>
      Recipe.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Recipe &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          costPerServing == other.costPerServing &&
          sellingPrice == other.sellingPrice;

  @override
  int get hashCode => Object.hash(id, name, costPerServing, sellingPrice);
}
