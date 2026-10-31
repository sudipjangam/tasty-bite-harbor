import 'dart:convert';
import 'package:flutter/foundation.dart';

/// Variant representation for menu items (e.g., Size, Portions, Add-ons)
class MenuItemVariant {
  final String id;
  final String name;
  final double price;
  final bool isAvailable;

  const MenuItemVariant({
    required this.id,
    required this.name,
    required this.price,
    this.isAvailable = true,
  });

  MenuItemVariant copyWith({
    String? id,
    String? name,
    double? price,
    bool? isAvailable,
  }) {
    return MenuItemVariant(
      id: id ?? this.id,
      name: name ?? this.name,
      price: price ?? this.price,
      isAvailable: isAvailable ?? this.isAvailable,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'is_available': isAvailable,
    };
  }

  factory MenuItemVariant.fromMap(Map<String, dynamic> map) {
    return MenuItemVariant(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      isAvailable: map['is_available'] as bool? ?? map['isAvailable'] as bool? ?? true,
    );
  }

  String toJson() => json.encode(toMap());

  factory MenuItemVariant.fromJson(String source) =>
      MenuItemVariant.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MenuItemVariant &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          price == other.price &&
          isAvailable == other.isAvailable;

  @override
  int get hashCode => Object.hash(id, name, price, isAvailable);
}

/// Core Menu Item Model matching Supabase database and Flutter POS UI
class MenuItem {
  final String id;
  final String restaurantId;
  final String name;
  final double price;
  final String category;
  final String? description;
  final bool isAvailable;
  final String? imageUrl;
  final List<MenuItemVariant> variants;
  final bool? isVeg;
  final bool isSpecial;
  final String? pricingType;
  final String? pricingUnit;
  final double? baseUnitQuantity;
  final DateTime? createdAt;

  const MenuItem({
    required this.id,
    required this.restaurantId,
    required this.name,
    required this.price,
    required this.category,
    this.description,
    this.isAvailable = true,
    this.imageUrl,
    this.variants = const [],
    this.isVeg = true,
    this.isSpecial = false,
    this.pricingType,
    this.pricingUnit,
    this.baseUnitQuantity,
    this.createdAt,
  });

  MenuItem copyWith({
    String? id,
    String? restaurantId,
    String? name,
    double? price,
    String? category,
    String? description,
    bool? isAvailable,
    String? imageUrl,
    List<MenuItemVariant>? variants,
    bool? isVeg,
    bool? isSpecial,
    String? pricingType,
    String? pricingUnit,
    double? baseUnitQuantity,
    DateTime? createdAt,
  }) {
    return MenuItem(
      id: id ?? this.id,
      restaurantId: restaurantId ?? this.restaurantId,
      name: name ?? this.name,
      price: price ?? this.price,
      category: category ?? this.category,
      description: description ?? this.description,
      isAvailable: isAvailable ?? this.isAvailable,
      imageUrl: imageUrl ?? this.imageUrl,
      variants: variants ?? this.variants,
      isVeg: isVeg ?? this.isVeg,
      isSpecial: isSpecial ?? this.isSpecial,
      pricingType: pricingType ?? this.pricingType,
      pricingUnit: pricingUnit ?? this.pricingUnit,
      baseUnitQuantity: baseUnitQuantity ?? this.baseUnitQuantity,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'restaurant_id': restaurantId,
      'name': name,
      'price': price,
      'category': category,
      'description': description,
      'is_available': isAvailable,
      'image_url': imageUrl,
      'variants': variants.map((x) => x.toMap()).toList(),
      'is_veg': isVeg,
      'is_special': isSpecial,
      'pricing_type': pricingType,
      'pricing_unit': pricingUnit,
      'base_unit_quantity': baseUnitQuantity,
      'created_at': createdAt?.toIso8601String(),
    };
  }

  factory MenuItem.fromMap(Map<String, dynamic> map) {
    List<MenuItemVariant> parsedVariants = [];
    if (map['variants'] != null) {
      if (map['variants'] is List) {
        parsedVariants = (map['variants'] as List)
            .map((v) => MenuItemVariant.fromMap(v is Map<String, dynamic> ? v : {}))
            .toList();
      } else if (map['variants'] is String) {
        try {
          final decoded = json.decode(map['variants'] as String);
          if (decoded is List) {
            parsedVariants = decoded
                .map((v) => MenuItemVariant.fromMap(v is Map<String, dynamic> ? v : {}))
                .toList();
          }
        } catch (_) {}
      }
    }

    return MenuItem(
      id: map['id']?.toString() ?? '',
      restaurantId: map['restaurant_id']?.toString() ?? map['restaurantId']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      category: map['category']?.toString() ?? 'General',
      description: map['description']?.toString(),
      isAvailable: map['is_available'] as bool? ?? map['isAvailable'] as bool? ?? true,
      imageUrl: map['image_url']?.toString() ?? map['imageUrl']?.toString(),
      variants: parsedVariants,
      isVeg: map['is_veg'] as bool? ?? map['isVeg'] as bool? ?? true,
      isSpecial: map['is_special'] as bool? ?? map['isSpecial'] as bool? ?? false,
      pricingType: map['pricing_type']?.toString() ?? map['pricingType']?.toString(),
      pricingUnit: map['pricing_unit']?.toString() ?? map['pricingUnit']?.toString(),
      baseUnitQuantity: (map['base_unit_quantity'] as num?)?.toDouble() ??
          (map['baseUnitQuantity'] as num?)?.toDouble(),
      createdAt: map['created_at'] != null ? DateTime.tryParse(map['created_at'].toString()) : null,
    );
  }

  String toJson() => json.encode(toMap());

  factory MenuItem.fromJson(String source) =>
      MenuItem.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MenuItem &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          restaurantId == other.restaurantId &&
          name == other.name &&
          description == other.description &&
          price == other.price &&
          category == other.category &&
          isAvailable == other.isAvailable &&
          imageUrl == other.imageUrl &&
          isVeg == other.isVeg &&
          isSpecial == other.isSpecial &&
          pricingType == other.pricingType &&
          pricingUnit == other.pricingUnit &&
          baseUnitQuantity == other.baseUnitQuantity &&
          createdAt == other.createdAt &&
          listEquals(variants, other.variants);

  @override
  int get hashCode => Object.hash(
        id,
        restaurantId,
        name,
        description,
        price,
        category,
        isAvailable,
        imageUrl,
        isVeg,
        isSpecial,
        pricingType,
        pricingUnit,
        baseUnitQuantity,
        createdAt,
        Object.hashAll(variants),
      );
}
