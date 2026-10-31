import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/access/access_controller.dart';
import '../../../core/hardware/thermal_printer_service.dart';
import '../../../core/network/supabase_config.dart';
import '../bloc/cart_bloc.dart';
import '../models/pos_models.dart';
import 'payment_dialog.dart';

class CartDrawer extends StatelessWidget {
  final VoidCallback? onClose;
  final bool isBottomSheet;

  static String? lastCreatedKitchenOrderId;

  const CartDrawer({
    super.key,
    this.onClose,
    this.isBottomSheet = false,
  });

  static Future<void> showAsBottomSheet(BuildContext context, {CartBloc? cartBloc}) {
    final bloc = cartBloc ?? context.read<CartBloc>();
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BlocProvider.value(
        value: bloc,
        child: const FractionallySizedBox(
          heightFactor: 0.88,
          child: CartDrawer(isBottomSheet: true),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.cardDark : AppColors.cardLight;
    final textCol = isDark ? AppColors.textDark : AppColors.textLight;
    final borderCol = isDark ? AppColors.borderDark : AppColors.borderLight;

    return BlocBuilder<CartBloc, CartState>(
      builder: (context, state) {
        final bloc = context.read<CartBloc>();

        return Container(
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: isBottomSheet
                ? const BorderRadius.vertical(top: Radius.circular(20))
                : null,
            border: isBottomSheet
                ? null
                : Border(left: BorderSide(color: borderCol, width: 1)),
            boxShadow: isBottomSheet
                ? const [
                    BoxShadow(
                      color: Colors.black26,
                      blurRadius: 16,
                      offset: Offset(0, -4),
                    )
                  ]
                : null,
          ),
          child: SafeArea(
            top: !isBottomSheet,
            child: Column(
              children: [
                // Drag handle for bottom sheet
                if (isBottomSheet)
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(top: 10, bottom: 4),
                      decoration: BoxDecoration(
                        color: Colors.grey.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),

                // Cart Header
                _buildHeader(context, state, bloc, isDark, textCol, borderCol),
                Divider(color: borderCol, height: 1),

                // Table / Customer Name Bar
                _buildCustomerBar(context, state, bloc, isDark, textCol, borderCol),
                Divider(color: borderCol, height: 1),

                // Items List
                Expanded(
                  child: state.items.isEmpty
                      ? _buildEmptyCart(isDark, textCol)
                      : ListView.separated(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 12),
                          itemCount: state.items.length,
                          separatorBuilder: (_, _) =>
                              Divider(color: borderCol, height: 16),
                          itemBuilder: (context, index) {
                            final item = state.items[index];
                            return _buildCartItemTile(
                              context,
                              item,
                              bloc,
                              isDark,
                              textCol,
                              borderCol,
                            );
                          },
                        ),
                ),

                // Bill Summary & Actions
                if (state.items.isNotEmpty) ...[
                  Divider(color: borderCol, height: 1),
                  _buildDiscountBar(context, state, bloc, isDark, textCol, borderCol),
                  Divider(color: borderCol, height: 1),
                  _buildBillTotals(state, isDark, textCol),
                  _buildBottomActions(
                      context, state, bloc, isDark, textCol, borderCol),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(
    BuildContext context,
    CartState state,
    CartBloc bloc,
    bool isDark,
    Color textCol,
    Color borderCol,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              LucideIcons.shoppingBag,
              color: AppColors.primary,
              size: 18,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Order Cart',
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: textCol,
                  ),
                ),
                Text(
                  '${state.totalQuantity} items • ₹${state.grandTotal.toStringAsFixed(2)}',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: isDark
                        ? AppColors.textMutedDark
                        : AppColors.textMutedLight,
                  ),
                ),
              ],
            ),
          ),
          if (state.items.isNotEmpty)
            IconButton(
              icon: const Icon(LucideIcons.trash2, size: 18),
              color: AppColors.destructive,
              tooltip: 'Clear Cart',
              onPressed: () => _confirmClearCart(context, bloc),
            ),
          if (isBottomSheet || onClose != null)
            IconButton(
              icon: const Icon(LucideIcons.x, size: 20),
              onPressed: onClose ?? () => Navigator.of(context).pop(),
            ),
        ],
      ),
    );
  }

  Widget _buildCustomerBar(
    BuildContext context,
    CartState state,
    CartBloc bloc,
    bool isDark,
    Color textCol,
    Color borderCol,
  ) {
    return Container(
      color: isDark ? AppColors.bgDark.withValues(alpha: 0.4) : AppColors.bgLight,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Icon(
            LucideIcons.mapPin,
            size: 15,
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: InkWell(
              onTap: () => _showEditCustomerDialog(context, state, bloc),
              child: Text(
                state.customerOrTable.isNotEmpty
                    ? state.customerOrTable
                    : 'Tap to assign Table / Customer name',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: state.customerOrTable.isNotEmpty
                      ? FontWeight.w600
                      : FontWeight.normal,
                  color: state.customerOrTable.isNotEmpty
                      ? AppColors.primary
                      : (isDark
                          ? AppColors.textMutedDark
                          : AppColors.textMutedLight),
                ),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(LucideIcons.pencil, size: 14),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            onPressed: () => _showEditCustomerDialog(context, state, bloc),
          ),
        ],
      ),
    );
  }

  Widget _buildCartItemTile(
    BuildContext context,
    CartItem item,
    CartBloc bloc,
    bool isDark,
    Color textCol,
    Color borderCol,
  ) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Name, Modifiers, Notes
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.name,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: textCol,
                ),
              ),
              if (item.selectedModifiers.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Wrap(
                    spacing: 4,
                    runSpacing: 2,
                    children: item.selectedModifiers.map((mod) {
                      return Text(
                        '+ ${mod.name} (₹${mod.price.toStringAsFixed(0)})',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w500,
                        ),
                      );
                    }).toList(),
                  ),
                ),
              if (item.notes.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.messageSquare,
                          size: 11, color: Colors.amber),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          item.notes,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontStyle: FontStyle.italic,
                            color: isDark
                                ? AppColors.textMutedDark
                                : AppColors.textMutedLight,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 4),
              Text(
                '₹${item.unitPrice.toStringAsFixed(2)} each',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: isDark
                      ? AppColors.textMutedDark
                      : AppColors.textMutedLight,
                ),
              ),
            ],
          ),
        ),

        // Stepper & Line Total
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '₹${item.totalPrice.toStringAsFixed(2)}',
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: textCol,
              ),
            ),
            const SizedBox(height: 6),
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: borderCol),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  InkWell(
                    onTap: () => bloc.updateQuantity(item.id, item.quantity - 1),
                    child: Padding(
                      padding: const EdgeInsets.all(4.0),
                      child: Icon(
                        item.quantity == 1
                            ? LucideIcons.trash2
                            : LucideIcons.minus,
                        size: 14,
                        color: item.quantity == 1
                            ? AppColors.destructive
                            : textCol,
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Text(
                      '${item.quantity}',
                      style: GoogleFonts.poppins(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: textCol,
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: () => bloc.updateQuantity(item.id, item.quantity + 1),
                    child: Padding(
                      padding: const EdgeInsets.all(4.0),
                      child: Icon(
                        LucideIcons.plus,
                        size: 14,
                        color: textCol,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildEmptyCart(bool isDark, Color textCol) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            LucideIcons.shoppingBag,
            size: 52,
            color: isDark
                ? AppColors.textMutedDark.withValues(alpha: 0.5)
                : AppColors.textMutedLight.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 12),
          Text(
            'Your Cart is Empty',
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: textCol,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Tap menu items on the left to add',
            style: GoogleFonts.inter(
              fontSize: 13,
              color: isDark
                  ? AppColors.textMutedDark
                  : AppColors.textMutedLight,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDiscountBar(
    BuildContext context,
    CartState state,
    CartBloc bloc,
    bool isDark,
    Color textCol,
    Color borderCol,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          const Icon(LucideIcons.tag, size: 14, color: AppColors.primary),
          const SizedBox(width: 6),
          Text(
            'Discount:',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: textCol,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildDiscountChip(
                    label: '5%',
                    isSelected: state.discountType == DiscountType.percentage &&
                        state.discountValue == 5,
                    onTap: () =>
                        bloc.applyDiscount(DiscountType.percentage, 5),
                  ),
                  const SizedBox(width: 6),
                  _buildDiscountChip(
                    label: '10%',
                    isSelected: state.discountType == DiscountType.percentage &&
                        state.discountValue == 10,
                    onTap: () =>
                        bloc.applyDiscount(DiscountType.percentage, 10),
                  ),
                  const SizedBox(width: 6),
                  _buildDiscountChip(
                    label: '₹50 Flat',
                    isSelected: state.discountType == DiscountType.fixed &&
                        state.discountValue == 50,
                    onTap: () => bloc.applyDiscount(DiscountType.fixed, 50),
                  ),
                  const SizedBox(width: 6),
                  if (state.discountValue > 0)
                    InkWell(
                      onTap: () => bloc.removeDiscount(),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.destructive.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Remove',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.destructive,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDiscountChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary
              : AppColors.primary.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : AppColors.primary,
          ),
        ),
      ),
    );
  }

  Widget _buildBillTotals(CartState state, bool isDark, Color textCol) {
    return Container(
      color: isDark ? AppColors.bgDark.withValues(alpha: 0.3) : AppColors.bgLight,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Column(
        children: [
          _buildRow('Subtotal', '₹${state.subtotal.toStringAsFixed(2)}',
              isDark: isDark),
          if (state.discountAmount > 0)
            _buildRow(
              'Discount',
              '-₹${state.discountAmount.toStringAsFixed(2)}',
              isDark: isDark,
              color: AppColors.available,
            ),
          _buildRow(
            'CGST (2.5%)',
            '₹${state.cgst.toStringAsFixed(2)}',
            isDark: isDark,
          ),
          _buildRow(
            'SGST (2.5%)',
            '₹${state.sgst.toStringAsFixed(2)}',
            isDark: isDark,
          ),
          if (state.roundOff.abs() > 0.001)
            _buildRow(
              'Round-off',
              '${state.roundOff >= 0 ? '+' : ''}₹${state.roundOff.toStringAsFixed(2)}',
              isDark: isDark,
            ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Grand Total',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: textCol,
                ),
              ),
              Text(
                '₹${state.grandTotal.toStringAsFixed(2)}',
                style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRow(String label, String value,
      {required bool isDark, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              color: isDark
                  ? AppColors.textMutedDark
                  : AppColors.textMutedLight,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: color ??
                  (isDark ? AppColors.textDark : AppColors.textLight),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomActions(
    BuildContext context,
    CartState state,
    CartBloc bloc,
    bool isDark,
    Color textCol,
    Color borderCol,
  ) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 1. + Add Custom Item Button (Matching Web App)
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _showAddCustomItemDialog(context, bloc),
              icon: const Icon(LucideIcons.packagePlus, size: 16),
              label: Text(
                '+ Add Custom Item',
                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF334155),
                side: const BorderSide(color: Color(0xFF94A3B8), width: 1.2),
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // 2. Action Buttons: "Send to Kitchen" (Orange) + "Hold Order" (White/Orange border)
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: state.items.isEmpty ? null : () => _sendToKitchen(context, state, bloc),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEA580C), // Orange matching web
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  child: Text(
                    'Send to Kitchen',
                    style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton(
                  onPressed: state.items.isEmpty
                      ? null
                      : () {
                          bloc.holdOrder();
                          if (isBottomSheet) Navigator.of(context).pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Order parked in Held Orders tab!'),
                              backgroundColor: AppColors.occupied,
                            ),
                          );
                        },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFEA580C),
                    side: const BorderSide(color: Color(0xFFEA580C), width: 1.4),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(
                    'Hold Order',
                    style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // 3. "Proceed to Payment" (Teal/Emerald Green matching Web)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: state.items.isEmpty
                  ? null
                  : () {
                      PaymentDialog.show(
                        context,
                        total: state.grandTotal,
                        subtotal: state.subtotal,
                        tax: state.gstAmount,
                        discount: state.discountAmount,
                        items: state.items,
                        customerOrTable: state.customerOrTable,
                        onPaymentSuccess: (method, details) async {
                          final access = AccessController();
                          final rid = access.restaurantId;
                          if (rid != null && rid.isNotEmpty) {
                            final orderItems = state.items.map((i) => {
                              'id': i.menuItemId,
                              'name': i.name,
                              'quantity': i.quantity,
                              'unit_price': i.unitPrice,
                              'total_price': i.totalPrice,
                              'notes': i.notes,
                            }).toList();

                            final orderNum = details['billNumber']?.toString() ??
                                (DateTime.now().millisecondsSinceEpoch % 1000000).toString().padLeft(6, '0');

                            final cleanTable = state.customerOrTable.trim().toUpperCase();
                            final isDirect = cleanTable == 'TAKEAWAY' || cleanTable == 'DELIVERY' || cleanTable == 'NC';

                            // 1. Orders insert: exceptions propagate to PaymentDialog failure handling
                            await SupabaseConfig.client.from('orders').insert({
                              'restaurant_id': rid,
                              'order_number': orderNum,
                              'table_name': state.customerOrTable,
                              'order_type': cleanTable == 'TAKEAWAY'
                                  ? 'takeaway'
                                  : (cleanTable == 'DELIVERY' ? 'delivery' : 'dine_in'),
                              'status': 'completed',
                              'payment_status': 'paid',
                              'payment_method': method.name,
                              'subtotal': state.subtotal,
                              'discount_amount': state.discountAmount,
                              'tax_amount': state.gstAmount,
                              'total_amount': state.grandTotal,
                              'items': orderItems,
                              'created_at': DateTime.now().toUtc().toIso8601String(),
                              'updated_at': DateTime.now().toUtc().toIso8601String(),
                            });

                            // 2. Best-effort completion of kitchen orders
                            try {
                              if (lastCreatedKitchenOrderId != null && lastCreatedKitchenOrderId!.isNotEmpty) {
                                await SupabaseConfig.client.from('kitchen_orders').update({
                                  'status': 'completed',
                                  'bumped_at': DateTime.now().toUtc().toIso8601String(),
                                }).eq('id', lastCreatedKitchenOrderId!);
                                lastCreatedKitchenOrderId = null;
                              } else if (!isDirect) {
                                await SupabaseConfig.client.from('kitchen_orders').update({
                                  'status': 'completed',
                                  'bumped_at': DateTime.now().toUtc().toIso8601String(),
                                }).eq('restaurant_id', rid)
                                  .eq('table_name', state.customerOrTable)
                                  .neq('status', 'completed');
                              }
                            } catch (e) {
                              debugPrint('[CartDrawer] kitchen_orders completion note: $e');
                            }
                          }
                          bloc.clearCart();
                        },
                      );
                    },
              icon: const Icon(LucideIcons.creditCard, size: 17),
              label: Text(
                '💳 Proceed to Payment',
                style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w700),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669), // Emerald Teal matching web
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
            ),
          ),

          // 4. "Clear Order" Text Button
          TextButton(
            onPressed: state.items.isEmpty ? null : () => _confirmClearCart(context, bloc),
            child: Text(
              'Clear Order',
              style: GoogleFonts.inter(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF64748B),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _sendToKitchen(BuildContext context, CartState state, CartBloc bloc) async {
    if (state.items.isEmpty) return;
    try {
      final access = AccessController();
      final rid = access.restaurantId;
      final tableName = state.customerOrTable.isNotEmpty ? state.customerOrTable : 'POS';
      final serverName = access.serverName ?? 'Staff Member';

      int roundNumber = 1;
      bool isAddition = false;
      List<Map<String, dynamic>> itemsToPrint = [];
      bool dbSuccess = false;
      bool printSuccess = false;

      final cleanTable = tableName.trim().toUpperCase();
      final isDirect = cleanTable == 'TAKEAWAY' || cleanTable == 'DELIVERY' || cleanTable == 'NC';

      // 1. Sync kitchen order to Supabase & check existing round
      if (rid != null && rid.isNotEmpty) {
        try {
          if (!isDirect) {
            final existing = await SupabaseConfig.client
                .from('kitchen_orders')
                .select('*')
                .eq('restaurant_id', rid)
                .eq('table_name', tableName)
                .neq('status', 'completed')
                .order('created_at', ascending: false)
                .limit(1);

            if (existing.isNotEmpty) {
              final prevOrder = existing.first;
              final prevRound = (prevOrder['round_number'] is int) ? (prevOrder['round_number'] as int) : 1;
              roundNumber = prevRound + 1;
              isAddition = true;

              final prevRawItems = (prevOrder['items'] is List) ? (prevOrder['items'] as List) : [];
              final Map<String, int> printedMap = {};
              for (final pi in prevRawItems) {
                if (pi is Map) {
                  final n = pi['name']?.toString() ?? '';
                  final q = int.tryParse(pi['quantity']?.toString() ?? '0') ?? 0;
                  printedMap[n] = (printedMap[n] ?? 0) + q;
                }
              }

              // Calculate delta
              for (final i in state.items) {
                final alreadyPrinted = printedMap[i.name] ?? 0;
                final delta = i.quantity - alreadyPrinted;
                if (delta > 0) {
                  itemsToPrint.add({
                    'name': i.name,
                    'quantity': delta,
                    'price': i.unitPrice,
                    'notes': i.notes,
                  });
                }
              }

              if (itemsToPrint.isEmpty) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Nothing new to send to kitchen'),
                    backgroundColor: AppColors.occupied,
                  ),
                );
                return;
              }

              final kotItems = state.items.map((i) => {
                'id': i.menuItemId,
                'name': i.name,
                'quantity': i.quantity,
                'price': i.unitPrice,
                'notes': i.notes,
                'printed_qty': i.quantity,
              }).toList();

              await SupabaseConfig.client.from('kitchen_orders').update({
                'items': kotItems,
                'status': 'pending',
                'round_number': roundNumber,
                'updated_at': DateTime.now().toUtc().toIso8601String(),
              }).eq('id', prevOrder['id']);
              lastCreatedKitchenOrderId = prevOrder['id']?.toString();
              dbSuccess = true;
            } else {
              final kotItems = state.items.map((i) => {
                'id': i.menuItemId,
                'name': i.name,
                'quantity': i.quantity,
                'price': i.unitPrice,
                'notes': i.notes,
                'printed_qty': i.quantity,
              }).toList();

              final inserted = await SupabaseConfig.client.from('kitchen_orders').insert({
                'restaurant_id': rid,
                'table_name': tableName,
                'items': kotItems,
                'status': 'pending',
                'server_name': serverName,
                'round_number': 1,
                'created_at': DateTime.now().toUtc().toIso8601String(),
              }).select('id').maybeSingle();
              if (inserted != null && inserted['id'] != null) {
                lastCreatedKitchenOrderId = inserted['id'].toString();
              }
              itemsToPrint = kotItems;
              dbSuccess = true;
            }
          } else {
            // Direct order (Takeaway / Delivery / NC) - always insert new row
            final kotItems = state.items.map((i) => {
              'id': i.menuItemId,
              'name': i.name,
              'quantity': i.quantity,
              'price': i.unitPrice,
              'notes': i.notes,
              'printed_qty': i.quantity,
            }).toList();

            final inserted = await SupabaseConfig.client.from('kitchen_orders').insert({
              'restaurant_id': rid,
              'table_name': tableName,
              'items': kotItems,
              'status': 'pending',
              'server_name': serverName,
              'round_number': 1,
              'created_at': DateTime.now().toUtc().toIso8601String(),
            }).select('id').maybeSingle();
            if (inserted != null && inserted['id'] != null) {
              lastCreatedKitchenOrderId = inserted['id'].toString();
            }
            itemsToPrint = kotItems;
            dbSuccess = true;
          }
        } catch (e) {
          debugPrint('[CartDrawer] Supabase kitchen order note: $e');
        }
      }

      if (itemsToPrint.isEmpty) {
        itemsToPrint = state.items.map((i) => {
          'name': i.name,
          'quantity': i.quantity,
          'price': i.unitPrice,
          'notes': i.notes,
        }).toList();
      }

      // 2. Punch KOT to Thermal Printer
      try {
        final service = ThermalPrinterService();
        final kotBytes = service.buildKOTBytes(
          tableName: tableName,
          serverName: serverName,
          orderType: isDirect ? tableName : 'Dine-In',
          roundNumber: roundNumber,
          isAddition: isAddition,
          items: itemsToPrint,
        );
        printSuccess = await service.printBuffer(bytes: kotBytes);
      } catch (e) {
        debugPrint('[CartDrawer] KOT print error: $e');
      }

      if (!context.mounted) return;
      if (dbSuccess && printSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isAddition ? 'Addition sent to Kitchen! (Round #$roundNumber) ✓' : 'Order sent to Kitchen! KOT printed ✓'),
            backgroundColor: const Color(0xFF16A34A),
            duration: const Duration(seconds: 2),
          ),
        );
      } else if (dbSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isAddition ? 'Addition sent to Kitchen (printer offline) ✓' : 'Order sent to Kitchen (printer offline) ✓'),
            backgroundColor: const Color(0xFFEAB308),
            duration: const Duration(seconds: 2),
          ),
        );
      } else if (printSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('KOT printed, but order was not synced to kitchen'),
            backgroundColor: Color(0xFFEAB308),
            duration: Duration(seconds: 2),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to send order to kitchen'),
            backgroundColor: AppColors.destructive,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to send to kitchen: $e'), backgroundColor: AppColors.destructive),
      );
    }
  }

  void _showAddCustomItemDialog(BuildContext context, CartBloc bloc) {
    final nameController = TextEditingController();
    final priceController = TextEditingController();
    int qty = 1;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            title: Text(
              'Add Custom Item',
              style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  autofocus: true,
                  decoration: const InputDecoration(
                    labelText: 'Item Name',
                    hintText: 'e.g. Special Dessert',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: priceController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Price (₹)',
                    hintText: 'e.g. 150',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Quantity:', style: TextStyle(fontWeight: FontWeight.w600)),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(LucideIcons.minusCircle, size: 20),
                          onPressed: qty > 1 ? () => setDialogState(() => qty--) : null,
                        ),
                        Text('$qty', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        IconButton(
                          icon: const Icon(LucideIcons.plusCircle, size: 20, color: AppColors.primary),
                          onPressed: () => setDialogState(() => qty++),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () {
                  final name = nameController.text.trim();
                  final price = double.tryParse(priceController.text.trim()) ?? 0.0;
                  if (name.isNotEmpty && price > 0) {
                    final item = CartItem(
                      id: 'custom_${DateTime.now().millisecondsSinceEpoch}',
                      menuItemId: 'custom_${DateTime.now().millisecondsSinceEpoch}',
                      name: name,
                      price: price,
                      quantity: qty,
                    );
                    bloc.addItem(item);
                    Navigator.pop(ctx);
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
                child: const Text('Add to Cart'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showEditCustomerDialog(
      BuildContext context, CartState state, CartBloc bloc) {
    final controller = TextEditingController(text: state.customerOrTable);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'Assign Table or Customer',
          style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'e.g. Table 5, Walk-in, Rahul Sharma',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              bloc.setCustomerOrTable(controller.text.trim());
              Navigator.of(ctx).pop();
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _confirmClearCart(BuildContext context, CartBloc bloc) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear Cart?'),
        content: const Text('Are you sure you want to discard all items in this cart?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.destructive,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              bloc.clearCart();
              Navigator.of(ctx).pop();
            },
            child: const Text('Clear Cart'),
          ),
        ],
      ),
    );
  }
}
