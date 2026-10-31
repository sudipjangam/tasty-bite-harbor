import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:uuid/uuid.dart';
import '../models/pos_models.dart';

// ─── EVENTS ─────────────────────────────────────────────────────────────

abstract class CartEvent extends Equatable {
  const CartEvent();

  @override
  List<Object?> get props => [];
}

class CartItemAdded extends CartEvent {
  final CartItem item;
  const CartItemAdded(this.item);

  @override
  List<Object?> get props => [item];
}

class CartItemRemoved extends CartEvent {
  final String cartItemId;
  const CartItemRemoved(this.cartItemId);

  @override
  List<Object?> get props => [cartItemId];
}

class CartItemQuantityUpdated extends CartEvent {
  final String cartItemId;
  final int quantity;
  const CartItemQuantityUpdated(this.cartItemId, this.quantity);

  @override
  List<Object?> get props => [cartItemId, quantity];
}

class CartItemNotesUpdated extends CartEvent {
  final String cartItemId;
  final String notes;
  const CartItemNotesUpdated(this.cartItemId, this.notes);

  @override
  List<Object?> get props => [cartItemId, notes];
}

class CartDiscountApplied extends CartEvent {
  final DiscountType type;
  final double value;
  const CartDiscountApplied({required this.type, required this.value});

  @override
  List<Object?> get props => [type, value];
}

class CartDiscountRemoved extends CartEvent {
  const CartDiscountRemoved();
}

class CartGstRateUpdated extends CartEvent {
  final double gstRate;
  const CartGstRateUpdated(this.gstRate);

  @override
  List<Object?> get props => [gstRate];
}

class CartCustomerOrTableUpdated extends CartEvent {
  final String customerOrTable;
  const CartCustomerOrTableUpdated(this.customerOrTable);

  @override
  List<Object?> get props => [customerOrTable];
}

class CartOrderHeld extends CartEvent {
  final String? customerOrTable;
  const CartOrderHeld({this.customerOrTable});

  @override
  List<Object?> get props => [customerOrTable];
}

class CartHeldOrderRestored extends CartEvent {
  final String heldOrderId;
  const CartHeldOrderRestored(this.heldOrderId);

  @override
  List<Object?> get props => [heldOrderId];
}

class CartHeldOrderDeleted extends CartEvent {
  final String heldOrderId;
  const CartHeldOrderDeleted(this.heldOrderId);

  @override
  List<Object?> get props => [heldOrderId];
}

class CartCleared extends CartEvent {
  const CartCleared();
}

// ─── STATE ──────────────────────────────────────────────────────────────

class CartState extends Equatable {
  final List<CartItem> items;
  final List<HeldOrder> heldOrders;
  final String customerOrTable;
  final DiscountType discountType;
  final double discountValue;
  final double gstRate; // Standard 5.0% GST

  const CartState({
    this.items = const [],
    this.heldOrders = const [],
    this.customerOrTable = '',
    this.discountType = DiscountType.percentage,
    this.discountValue = 0.0,
    this.gstRate = 5.0,
  });

  /// Total sum of all items in cart before discounts and tax
  double get subtotal =>
      items.fold(0.0, (sum, item) => sum + item.totalPrice);

  /// Calculated discount value in currency units
  double get discountAmount {
    if (discountValue <= 0) return 0.0;
    if (discountType == DiscountType.percentage) {
      return (subtotal * discountValue) / 100.0;
    } else {
      return discountValue > subtotal ? subtotal : discountValue;
    }
  }

  /// Taxable amount (subtotal - discountAmount)
  double get taxableAmount {
    final diff = subtotal - discountAmount;
    return diff > 0 ? diff : 0.0;
  }

  /// Central GST (half of total GST)
  double get cgst => (taxableAmount * (gstRate / 2.0)) / 100.0;

  /// State GST (half of total GST)
  double get sgst => (taxableAmount * (gstRate / 2.0)) / 100.0;

  /// Total GST tax
  double get gstAmount => cgst + sgst;

  /// Raw total before round-off
  double get rawTotal => taxableAmount + gstAmount;

  /// Round-off difference to nearest integer
  double get roundOff => rawTotal.roundToDouble() - rawTotal;

  /// Final Grand Total rounded to nearest integer
  double get grandTotal => rawTotal.roundToDouble();

  /// Total count of individual physical items
  int get totalQuantity =>
      items.fold(0, (sum, item) => sum + item.quantity);

  bool get isEmpty => items.isEmpty;
  bool get isNotEmpty => items.isNotEmpty;

  CartState copyWith({
    List<CartItem>? items,
    List<HeldOrder>? heldOrders,
    String? customerOrTable,
    DiscountType? discountType,
    double? discountValue,
    double? gstRate,
  }) {
    return CartState(
      items: items ?? this.items,
      heldOrders: heldOrders ?? this.heldOrders,
      customerOrTable: customerOrTable ?? this.customerOrTable,
      discountType: discountType ?? this.discountType,
      discountValue: discountValue ?? this.discountValue,
      gstRate: gstRate ?? this.gstRate,
    );
  }

  @override
  List<Object?> get props => [
        items,
        heldOrders,
        customerOrTable,
        discountType,
        discountValue,
        gstRate,
      ];
}

// ─── BLOC IMPLEMENTATION ────────────────────────────────────────────────

class CartBloc extends Bloc<CartEvent, CartState> {
  static const _uuid = Uuid();

  CartBloc() : super(const CartState()) {
    on<CartItemAdded>(_onItemAdded);
    on<CartItemRemoved>(_onItemRemoved);
    on<CartItemQuantityUpdated>(_onQuantityUpdated);
    on<CartItemNotesUpdated>(_onNotesUpdated);
    on<CartDiscountApplied>(_onDiscountApplied);
    on<CartDiscountRemoved>(_onDiscountRemoved);
    on<CartGstRateUpdated>(_onGstRateUpdated);
    on<CartCustomerOrTableUpdated>(_onCustomerOrTableUpdated);
    on<CartOrderHeld>(_onOrderHeld);
    on<CartHeldOrderRestored>(_onHeldOrderRestored);
    on<CartHeldOrderDeleted>(_onHeldOrderDeleted);
    on<CartCleared>(_onCartCleared);
  }

  void _onItemAdded(CartItemAdded event, Emitter<CartState> emit) {
    final newItem = event.item;
    final currentList = List<CartItem>.from(state.items);

    // Check if duplicate item exists (matching menuItemId, modifiers and notes)
    final existingIndex = currentList.indexWhere(
      (item) =>
          item.menuItemId == newItem.menuItemId &&
          _areModifiersEqual(item.selectedModifiers, newItem.selectedModifiers) &&
          item.notes.trim() == newItem.notes.trim(),
    );

    if (existingIndex >= 0) {
      final existing = currentList[existingIndex];
      currentList[existingIndex] = existing.copyWith(
        quantity: existing.quantity + newItem.quantity,
      );
    } else {
      currentList.add(newItem);
    }

    emit(state.copyWith(items: currentList));
  }

  void _onItemRemoved(CartItemRemoved event, Emitter<CartState> emit) {
    final updated =
        state.items.where((item) => item.id != event.cartItemId).toList();
    emit(state.copyWith(items: updated));
  }

  void _onQuantityUpdated(
      CartItemQuantityUpdated event, Emitter<CartState> emit) {
    if (event.quantity <= 0) {
      add(CartItemRemoved(event.cartItemId));
      return;
    }

    final updated = state.items.map((item) {
      if (item.id == event.cartItemId) {
        return item.copyWith(quantity: event.quantity);
      }
      return item;
    }).toList();

    emit(state.copyWith(items: updated));
  }

  void _onNotesUpdated(CartItemNotesUpdated event, Emitter<CartState> emit) {
    final updated = state.items.map((item) {
      if (item.id == event.cartItemId) {
        return item.copyWith(notes: event.notes);
      }
      return item;
    }).toList();

    emit(state.copyWith(items: updated));
  }

  void _onDiscountApplied(
      CartDiscountApplied event, Emitter<CartState> emit) {
    emit(state.copyWith(
      discountType: event.type,
      discountValue: event.value,
    ));
  }

  void _onDiscountRemoved(
      CartDiscountRemoved event, Emitter<CartState> emit) {
    emit(state.copyWith(
      discountValue: 0.0,
    ));
  }

  void _onGstRateUpdated(
      CartGstRateUpdated event, Emitter<CartState> emit) {
    emit(state.copyWith(gstRate: event.gstRate));
  }

  void _onCustomerOrTableUpdated(
      CartCustomerOrTableUpdated event, Emitter<CartState> emit) {
    emit(state.copyWith(customerOrTable: event.customerOrTable));
  }

  void _onOrderHeld(CartOrderHeld event, Emitter<CartState> emit) {
    if (state.items.isEmpty) return;

    final targetName = (event.customerOrTable?.trim().isNotEmpty ?? false)
        ? event.customerOrTable!.trim()
        : (state.customerOrTable.trim().isNotEmpty
            ? state.customerOrTable.trim()
            : 'Order #${state.heldOrders.length + 1}');

    final held = HeldOrder(
      id: _uuid.v4(),
      tableOrCustomer: targetName,
      items: List.unmodifiable(state.items),
      timestamp: DateTime.now(),
      subtotal: state.subtotal,
      discountAmount: state.discountAmount,
      tax: state.gstAmount,
      total: state.grandTotal,
    );

    final updatedHeldOrders = List<HeldOrder>.from(state.heldOrders)..add(held);

    emit(state.copyWith(
      items: const [],
      heldOrders: updatedHeldOrders,
      customerOrTable: '',
      discountValue: 0.0,
    ));
  }

  void _onHeldOrderRestored(
      CartHeldOrderRestored event, Emitter<CartState> emit) {
    final matchIndex =
        state.heldOrders.indexWhere((h) => h.id == event.heldOrderId);
    if (matchIndex < 0) return;

    final held = state.heldOrders[matchIndex];
    final updatedHeldOrders = List<HeldOrder>.from(state.heldOrders)
      ..removeAt(matchIndex);

    // If active cart is non-empty, park current cart as a held order so it is not lost
    if (state.items.isNotEmpty) {
      updatedHeldOrders.add(HeldOrder(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        tableOrCustomer: state.customerOrTable.isEmpty ? 'Parked Cart' : state.customerOrTable,
        items: List<CartItem>.from(state.items),
        timestamp: DateTime.now(),
        subtotal: state.subtotal,
        discountAmount: state.discountAmount,
        tax: state.gstAmount,
        total: state.grandTotal,
      ));
    }

    emit(state.copyWith(
      items: List<CartItem>.from(held.items),
      heldOrders: updatedHeldOrders,
      customerOrTable: held.tableOrCustomer,
      discountValue: held.discountAmount > 0 ? held.discountAmount : 0.0,
      discountType: DiscountType.fixed,
    ));
  }

  void _onHeldOrderDeleted(
      CartHeldOrderDeleted event, Emitter<CartState> emit) {
    final updatedHeld =
        state.heldOrders.where((h) => h.id != event.heldOrderId).toList();
    emit(state.copyWith(heldOrders: updatedHeld));
  }

  void _onCartCleared(CartCleared event, Emitter<CartState> emit) {
    emit(state.copyWith(
      items: const [],
      customerOrTable: '',
      discountValue: 0.0,
    ));
  }

  bool _areModifiersEqual(
      List<MenuItemModifier> a, List<MenuItemModifier> b) {
    if (a.length != b.length) return false;
    final aIds = a.map((m) => m.id).toSet();
    final bIds = b.map((m) => m.id).toSet();
    return aIds.containsAll(bIds);
  }

  // ─── Convenience Helper Methods for UI ───────────────────────────────

  void addItem(CartItem item) => add(CartItemAdded(item));

  void removeItem(String cartItemId) => add(CartItemRemoved(cartItemId));

  void updateQuantity(String cartItemId, int quantity) =>
      add(CartItemQuantityUpdated(cartItemId, quantity));

  void updateNotes(String cartItemId, String notes) =>
      add(CartItemNotesUpdated(cartItemId, notes));

  void applyDiscount(DiscountType type, double value) =>
      add(CartDiscountApplied(type: type, value: value));

  void removeDiscount() => add(const CartDiscountRemoved());

  void setGstRate(double gstRate) => add(CartGstRateUpdated(gstRate));

  void setCustomerOrTable(String name) =>
      add(CartCustomerOrTableUpdated(name));

  void holdOrder([String? name]) => add(CartOrderHeld(customerOrTable: name));

  void restoreHeldOrder(String id) => add(CartHeldOrderRestored(id));

  void deleteHeldOrder(String id) => add(CartHeldOrderDeleted(id));

  void clearCart() => add(const CartCleared());
}
