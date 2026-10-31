import 'package:flutter_test/flutter_test.dart';
import 'package:swadeshi_pos/features/pos/bloc/cart_bloc.dart';
import 'package:swadeshi_pos/features/pos/models/pos_models.dart';
import 'package:swadeshi_pos/features/inventory/models/inventory_item_model.dart';

void main() {
  group('POS & Inventory Unit Tests', () {
    test('CartBloc calculates items, subtotals, and GST correctly', () async {
      final bloc = CartBloc();
      expect(bloc.state.items.isEmpty, isTrue);

      const cartItem = CartItem(
        id: 'c_1',
        menuItemId: 'item_1',
        name: 'Butter Chicken',
        price: 350.0,
        quantity: 2,
      );

      bloc.add(const CartItemAdded(cartItem));
      await pumpEventQueue();

      expect(bloc.state.items.length, equals(1));
      expect(bloc.state.items.first.quantity, equals(2));
      expect(bloc.state.subtotal, equals(700.0));
      // 5% GST on 700 = 35.0 (17.5 CGST + 17.5 SGST)
      expect(bloc.state.gstAmount, equals(35.0));
      expect(bloc.state.grandTotal, equals(735.0));

      await bloc.close();
    });

    test('InventoryItem correctly identifies low stock and total valuation', () {
      const item = InventoryItem(
        id: 'inv_1',
        name: 'Paneer',
        category: 'Dairy',
        quantity: 3.0,
        unit: 'kg',
        reorderLevel: 5.0,
        costPerUnit: 300.0,
        restaurantId: 'rest_1',
      );

      expect(item.isLowStock, isTrue);
      expect(item.isOutOfStock, isFalse);
      expect(item.totalValuation, equals(900.0));
    });
  });
}
