class InventoryItem {
  final String id;
  final String name;
  final String category;
  final double quantity;
  final String unit;
  final double reorderLevel;
  final double costPerUnit;
  final String restaurantId;
  final String? barcode;
  final bool isProduced;
  final DateTime? lastRestocked;

  const InventoryItem({
    required this.id,
    required this.name,
    required this.category,
    required this.quantity,
    required this.unit,
    required this.reorderLevel,
    required this.costPerUnit,
    required this.restaurantId,
    this.barcode,
    this.isProduced = false,
    this.lastRestocked,
  });

  bool get isOutOfStock => quantity <= 0;
  bool get isLowStock => quantity > 0 && quantity <= reorderLevel;
  double get totalValuation => quantity * costPerUnit;

  InventoryItem copyWith({
    String? id,
    String? name,
    String? category,
    double? quantity,
    String? unit,
    double? reorderLevel,
    double? costPerUnit,
    String? restaurantId,
    String? barcode,
    bool? isProduced,
    DateTime? lastRestocked,
  }) {
    return InventoryItem(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      quantity: quantity ?? this.quantity,
      unit: unit ?? this.unit,
      reorderLevel: reorderLevel ?? this.reorderLevel,
      costPerUnit: costPerUnit ?? this.costPerUnit,
      restaurantId: restaurantId ?? this.restaurantId,
      barcode: barcode ?? this.barcode,
      isProduced: isProduced ?? this.isProduced,
      lastRestocked: lastRestocked ?? this.lastRestocked,
    );
  }

  factory InventoryItem.fromJson(Map<String, dynamic> json) {
    return InventoryItem(
      id: json['id'] as String,
      name: json['name'] as String,
      category: json['category'] as String? ?? 'General',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0.0,
      unit: json['unit'] as String? ?? 'pcs',
      reorderLevel: (json['reorder_level'] as num?)?.toDouble() ?? 5.0,
      costPerUnit: (json['cost_per_unit'] as num?)?.toDouble() ?? 0.0,
      restaurantId: json['restaurant_id'] as String? ?? '',
      barcode: json['barcode'] as String?,
      isProduced: json['is_produced'] as bool? ?? false,
      lastRestocked: json['last_restocked'] != null
          ? DateTime.tryParse(json['last_restocked'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'quantity': quantity,
      'unit': unit,
      'reorder_level': reorderLevel,
      'cost_per_unit': costPerUnit,
      'restaurant_id': restaurantId,
      'barcode': barcode,
      'is_produced': isProduced,
      'last_restocked': lastRestocked?.toIso8601String(),
    };
  }
}

enum InventoryTransactionType { restock, waste, correction, usage }

class InventoryTransaction {
  final String id;
  final String itemId;
  final InventoryTransactionType type;
  final double changeAmount;
  final double previousQuantity;
  final double newQuantity;
  final String reason;
  final String? notes;
  final DateTime timestamp;

  const InventoryTransaction({
    required this.id,
    required this.itemId,
    required this.type,
    required this.changeAmount,
    required this.previousQuantity,
    required this.newQuantity,
    required this.reason,
    this.notes,
    required this.timestamp,
  });
}

