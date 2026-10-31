import 'package:equatable/equatable.dart';

/// Modifier or extra add-on for a menu item (e.g. Extra Cheese, Spicy Mayo, Medium Size)
class MenuItemModifier extends Equatable {
  final String id;
  final String name;
  final double price;

  const MenuItemModifier({
    required this.id,
    required this.name,
    this.price = 0.0,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'price': price,
      };

  factory MenuItemModifier.fromJson(Map<String, dynamic> json) =>
      MenuItemModifier(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        price: (json['price'] as num?)?.toDouble() ?? 0.0,
      );

  @override
  List<Object?> get props => [id, name, price];
}

/// Catalog menu item displayed in the POS grid
class MenuItem extends Equatable {
  final String id;
  final String name;
  final String category;
  final double price;
  final String? description;
  final String? imageUrl;
  final bool isAvailable;
  final bool isVeg;
  final List<MenuItemModifier> modifiers;

  const MenuItem({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    this.description,
    this.imageUrl,
    this.isAvailable = true,
    this.isVeg = true,
    this.modifiers = const [],
  });

  MenuItem copyWith({
    String? id,
    String? name,
    String? category,
    double? price,
    String? description,
    String? imageUrl,
    bool? isAvailable,
    bool? isVeg,
    List<MenuItemModifier>? modifiers,
  }) {
    return MenuItem(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      price: price ?? this.price,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      isAvailable: isAvailable ?? this.isAvailable,
      isVeg: isVeg ?? this.isVeg,
      modifiers: modifiers ?? this.modifiers,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'category': category,
        'price': price,
        'description': description,
        'imageUrl': imageUrl,
        'isAvailable': isAvailable,
        'isVeg': isVeg,
        'modifiers': modifiers.map((m) => m.toJson()).toList(),
      };

  factory MenuItem.fromJson(Map<String, dynamic> json) => MenuItem(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        category: json['category'] as String? ?? 'General',
        price: (json['price'] as num?)?.toDouble() ?? 0.0,
        description: json['description'] as String?,
        imageUrl: json['imageUrl'] as String?,
        isAvailable: json['isAvailable'] as bool? ?? true,
        isVeg: json['isVeg'] as bool? ?? true,
        modifiers: (json['modifiers'] as List<dynamic>?)
                ?.map((e) =>
                    MenuItemModifier.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
      );

  @override
  List<Object?> get props => [
        id,
        name,
        category,
        price,
        description,
        imageUrl,
        isAvailable,
        isVeg,
        modifiers,
      ];
}

/// Item in the active POS Cart
class CartItem extends Equatable {
  final String id; // Unique line item key (e.g. uuid or id_modifiers)
  final String menuItemId;
  final String name;
  final double price; // Base item unit price
  final int quantity;
  final List<MenuItemModifier> selectedModifiers;
  final String notes;

  const CartItem({
    required this.id,
    required this.menuItemId,
    required this.name,
    required this.price,
    this.quantity = 1,
    this.selectedModifiers = const [],
    this.notes = '',
  });

  /// Total unit price including modifiers
  double get unitPrice {
    final modifiersTotal =
        selectedModifiers.fold(0.0, (sum, mod) => sum + mod.price);
    return price + modifiersTotal;
  }

  /// Total price for this line item (unitPrice * quantity)
  double get totalPrice => unitPrice * quantity;

  CartItem copyWith({
    String? id,
    String? menuItemId,
    String? name,
    double? price,
    int? quantity,
    List<MenuItemModifier>? selectedModifiers,
    String? notes,
  }) {
    return CartItem(
      id: id ?? this.id,
      menuItemId: menuItemId ?? this.menuItemId,
      name: name ?? this.name,
      price: price ?? this.price,
      quantity: quantity ?? this.quantity,
      selectedModifiers: selectedModifiers ?? this.selectedModifiers,
      notes: notes ?? this.notes,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'menuItemId': menuItemId,
        'name': name,
        'price': price,
        'quantity': quantity,
        'selectedModifiers':
            selectedModifiers.map((m) => m.toJson()).toList(),
        'notes': notes,
      };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
        id: json['id'] as String? ?? '',
        menuItemId: json['menuItemId'] as String? ?? '',
        name: json['name'] as String? ?? '',
        price: (json['price'] as num?)?.toDouble() ?? 0.0,
        quantity: json['quantity'] as int? ?? 1,
        selectedModifiers: (json['selectedModifiers'] as List<dynamic>?)
                ?.map((e) =>
                    MenuItemModifier.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
        notes: json['notes'] as String? ?? '',
      );

  @override
  List<Object?> get props => [
        id,
        menuItemId,
        name,
        price,
        quantity,
        selectedModifiers,
        notes,
      ];
}

/// Order held in parking / pending tab
class HeldOrder extends Equatable {
  final String id;
  final String tableOrCustomer; // table or customer name
  final List<CartItem> items;
  final DateTime timestamp;
  final double subtotal;
  final double discountAmount;
  final double tax;
  final double total;
  final String notes;

  const HeldOrder({
    required this.id,
    required this.tableOrCustomer,
    required this.items,
    required this.timestamp,
    required this.subtotal,
    this.discountAmount = 0.0,
    required this.tax,
    required this.total,
    this.notes = '',
  });

  HeldOrder copyWith({
    String? id,
    String? tableOrCustomer,
    List<CartItem>? items,
    DateTime? timestamp,
    double? subtotal,
    double? discountAmount,
    double? tax,
    double? total,
    String? notes,
  }) {
    return HeldOrder(
      id: id ?? this.id,
      tableOrCustomer: tableOrCustomer ?? this.tableOrCustomer,
      items: items ?? this.items,
      timestamp: timestamp ?? this.timestamp,
      subtotal: subtotal ?? this.subtotal,
      discountAmount: discountAmount ?? this.discountAmount,
      tax: tax ?? this.tax,
      total: total ?? this.total,
      notes: notes ?? this.notes,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'tableOrCustomer': tableOrCustomer,
        'items': items.map((i) => i.toJson()).toList(),
        'timestamp': timestamp.toIso8601String(),
        'subtotal': subtotal,
        'discountAmount': discountAmount,
        'tax': tax,
        'total': total,
        'notes': notes,
      };

  factory HeldOrder.fromJson(Map<String, dynamic> json) => HeldOrder(
        id: json['id'] as String? ?? '',
        tableOrCustomer: json['tableOrCustomer'] as String? ?? 'Quick Serve',
        items: (json['items'] as List<dynamic>?)
                ?.map((e) => CartItem.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
        timestamp: json['timestamp'] != null
            ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now()
            : DateTime.now(),
        subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
        discountAmount: (json['discountAmount'] as num?)?.toDouble() ?? 0.0,
        tax: (json['tax'] as num?)?.toDouble() ?? 0.0,
        total: (json['total'] as num?)?.toDouble() ?? 0.0,
        notes: json['notes'] as String? ?? '',
      );

  @override
  List<Object?> get props => [
        id,
        tableOrCustomer,
        items,
        timestamp,
        subtotal,
        discountAmount,
        tax,
        total,
        notes,
      ];
}

enum DiscountType { percentage, fixed }

enum PaymentMethod { cash, upi, card, split }

class SplitPaymentEntry extends Equatable {
  final PaymentMethod method;
  final double amount;

  const SplitPaymentEntry({
    required this.method,
    required this.amount,
  });

  @override
  List<Object?> get props => [method, amount];
}
