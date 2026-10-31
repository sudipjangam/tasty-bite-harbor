import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

enum TableStatus {
  available,
  occupied,
  billed,
  reserved;

  static TableStatus fromString(String? value) {
    switch (value?.toLowerCase().trim()) {
      case 'occupied':
      case 'seated':
      case 'served':
        return TableStatus.occupied;
      case 'billed':
      case 'billing':
        return TableStatus.billed;
      case 'reserved':
      case 'booking':
        return TableStatus.reserved;
      case 'available':
      default:
        return TableStatus.available;
    }
  }

  String get value {
    switch (this) {
      case TableStatus.available:
        return 'available';
      case TableStatus.occupied:
        return 'occupied';
      case TableStatus.billed:
        return 'billed';
      case TableStatus.reserved:
        return 'reserved';
    }
  }

  String get label {
    switch (this) {
      case TableStatus.available:
        return 'Available';
      case TableStatus.occupied:
        return 'Occupied';
      case TableStatus.billed:
        return 'Billed';
      case TableStatus.reserved:
        return 'Reserved';
    }
  }

  Color get color {
    switch (this) {
      case TableStatus.available:
        return AppColors.available;
      case TableStatus.occupied:
        return AppColors.occupied;
      case TableStatus.billed:
        return AppColors.billed;
      case TableStatus.reserved:
        return AppColors.reserved;
    }
  }
}

class RestaurantTable {
  final String id;
  final String restaurantId;
  final String name;
  final int capacity;
  final String status; // 'available', 'occupied', 'billed', 'reserved'
  final String? currentOrderId;
  final String? customerName;
  final String? customerPhone;
  final int? guestCount;
  final String? section;
  final double? activeTotal;
  final DateTime? occupiedSince;
  final DateTime? updatedAt;

  const RestaurantTable({
    required this.id,
    required this.restaurantId,
    required this.name,
    required this.capacity,
    required this.status,
    this.currentOrderId,
    this.customerName,
    this.customerPhone,
    this.guestCount,
    this.section,
    this.activeTotal,
    this.occupiedSince,
    this.updatedAt,
  });

  TableStatus get parsedStatus => TableStatus.fromString(status);

  bool get isAvailable => parsedStatus == TableStatus.available;
  bool get isOccupied => parsedStatus == TableStatus.occupied;
  bool get isBilled => parsedStatus == TableStatus.billed;
  bool get isReserved => parsedStatus == TableStatus.reserved;

  Color get statusColor => parsedStatus.color;
  String get statusLabel => parsedStatus.label;

  int get occupiedMinutes {
    if (occupiedSince == null) return 0;
    return DateTime.now().difference(occupiedSince!).inMinutes;
  }

  factory RestaurantTable.fromJson(Map<String, dynamic> json) {
    final statusStr = json['status']?.toString().toLowerCase() ?? 'available';
    return RestaurantTable(
      id: json['id']?.toString() ?? '',
      restaurantId: json['restaurant_id']?.toString() ?? json['restaurantId']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Table',
      capacity: (json['capacity'] is num) ? (json['capacity'] as num).toInt() : int.tryParse(json['capacity']?.toString() ?? '4') ?? 4,
      status: statusStr,
      currentOrderId: json['current_order_id']?.toString() ?? json['currentOrderId']?.toString(),
      customerName: json['customer_name']?.toString() ?? json['customerName']?.toString(),
      customerPhone: json['customer_phone']?.toString() ?? json['customerPhone']?.toString(),
      guestCount: json['guest_count'] != null
          ? (json['guest_count'] as num).toInt()
          : null,
      section: json['section']?.toString() ?? 'Main Dining',
      activeTotal: json['active_total'] != null
          ? (json['active_total'] as num).toDouble()
          : (json['total'] != null ? (json['total'] as num).toDouble() : null),
      occupiedSince: json['occupied_since'] != null
          ? DateTime.tryParse(json['occupied_since'].toString())
          : (statusStr != 'available' && json['updated_at'] != null
              ? DateTime.tryParse(json['updated_at'].toString())
              : null),
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'restaurant_id': restaurantId,
      'name': name,
      'capacity': capacity,
      'status': status,
      'current_order_id': currentOrderId,
      'customer_name': customerName,
      'customer_phone': customerPhone,
      'guest_count': guestCount,
      'section': section,
      'active_total': activeTotal,
      'occupied_since': occupiedSince?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  RestaurantTable copyWith({
    String? id,
    String? restaurantId,
    String? name,
    int? capacity,
    String? status,
    String? currentOrderId,
    String? customerName,
    String? customerPhone,
    int? guestCount,
    String? section,
    double? activeTotal,
    DateTime? occupiedSince,
    DateTime? updatedAt,
    bool clearGuestContext = false,
  }) {
    return RestaurantTable(
      id: id ?? this.id,
      restaurantId: restaurantId ?? this.restaurantId,
      name: name ?? this.name,
      capacity: capacity ?? this.capacity,
      status: status ?? this.status,
      currentOrderId: clearGuestContext ? null : (currentOrderId ?? this.currentOrderId),
      customerName: clearGuestContext ? null : (customerName ?? this.customerName),
      customerPhone: clearGuestContext ? null : (customerPhone ?? this.customerPhone),
      guestCount: clearGuestContext ? null : (guestCount ?? this.guestCount),
      section: section ?? this.section,
      activeTotal: clearGuestContext ? null : (activeTotal ?? this.activeTotal),
      occupiedSince: clearGuestContext ? null : (occupiedSince ?? this.occupiedSince),
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
