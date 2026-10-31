import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:uuid/uuid.dart';
import '../../../../core/theme/app_theme.dart';
import '../../models/pos_models.dart';

class ModifierDialog extends StatefulWidget {
  final MenuItem item;
  final ValueChanged<CartItem> onAddToCart;

  const ModifierDialog({
    super.key,
    required this.item,
    required this.onAddToCart,
  });

  static Future<void> show(
    BuildContext context, {
    required MenuItem item,
    required ValueChanged<CartItem> onAddToCart,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ModifierDialog(
        item: item,
        onAddToCart: onAddToCart,
      ),
    );
  }

  @override
  State<ModifierDialog> createState() => _ModifierDialogState();
}

class _ModifierDialogState extends State<ModifierDialog> {
  static const _uuid = Uuid();
  final Set<MenuItemModifier> _selectedModifiers = {};
  int _quantity = 1;
  final TextEditingController _notesController = TextEditingController();

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  double get _unitPrice {
    final modTotal =
        _selectedModifiers.fold(0.0, (sum, mod) => sum + mod.price);
    return widget.item.price + modTotal;
  }

  double get _totalPrice => _unitPrice * _quantity;

  void _handleConfirm() {
    final cartItem = CartItem(
      id: _uuid.v4(),
      menuItemId: widget.item.id,
      name: widget.item.name,
      price: widget.item.price,
      quantity: _quantity,
      selectedModifiers: _selectedModifiers.toList(),
      notes: _notesController.text.trim(),
    );
    widget.onAddToCart(cartItem);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.cardDark : AppColors.cardLight;
    final textCol = isDark ? AppColors.textDark : AppColors.textLight;
    final borderCol = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 16,
            offset: Offset(0, -4),
          ),
        ],
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header: Item name + Veg indicator + Close button
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: widget.item.isVeg
                          ? Colors.green
                          : Colors.redAccent,
                      width: 1.5,
                    ),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Icon(
                    Icons.circle,
                    size: 10,
                    color: widget.item.isVeg
                        ? Colors.green
                        : Colors.redAccent,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.item.name,
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: textCol,
                        ),
                      ),
                      Text(
                        '₹${widget.item.price.toStringAsFixed(2)}',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: AppColors.primary,
                        ),
                      ),
                      if (widget.item.description != null &&
                          widget.item.description!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            widget.item.description!,
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: isDark
                                  ? AppColors.textMutedDark
                                  : AppColors.textMutedLight,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(LucideIcons.x, size: 20),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Divider(color: borderCol, height: 1),
            const SizedBox(height: 16),

            // Modifiers / Extras section
            if (widget.item.modifiers.isNotEmpty) ...[
              Text(
                'Customize / Extras',
                style: GoogleFonts.poppins(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: textCol,
                ),
              ),
              const SizedBox(height: 8),
              ...widget.item.modifiers.map((mod) {
                final isSelected = _selectedModifiers.contains(mod);
                return InkWell(
                  onTap: () {
                    setState(() {
                      if (isSelected) {
                        _selectedModifiers.remove(mod);
                      } else {
                        _selectedModifiers.add(mod);
                      }
                    });
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary.withValues(alpha: 0.08)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : borderCol,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isSelected
                              ? Icons.check_box_rounded
                              : Icons.check_box_outline_blank_rounded,
                          color: isSelected
                              ? AppColors.primary
                              : Colors.grey,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            mod.name,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: isSelected
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                              color: textCol,
                            ),
                          ),
                        ),
                        Text(
                          '+₹${mod.price.toStringAsFixed(2)}',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: isSelected
                                ? AppColors.primary
                                : (isDark
                                    ? AppColors.textMutedDark
                                    : AppColors.textMutedLight),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 16),
            ],

            // Kitchen Special Instructions / Notes
            Text(
              'Kitchen Note / Instructions',
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: textCol,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _notesController,
              decoration: InputDecoration(
                hintText: 'e.g. Less spicy, no onion, extra crispy...',
                hintStyle: GoogleFonts.inter(
                  fontSize: 13,
                  color: isDark
                      ? AppColors.textMutedDark
                      : AppColors.textMutedLight,
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                filled: true,
                fillColor: isDark ? AppColors.bgDark : AppColors.bgLight,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: borderCol),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: borderCol),
                ),
              ),
              style: GoogleFonts.inter(fontSize: 14, color: textCol),
            ),
            const SizedBox(height: 20),

            // Quantity Stepper + Confirm Button
            Row(
              children: [
                // Quantity Stepper
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: borderCol),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(LucideIcons.minus, size: 16),
                        onPressed: _quantity > 1
                            ? () => setState(() => _quantity--)
                            : null,
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          '$_quantity',
                          style: GoogleFonts.poppins(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: textCol,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.plus, size: 16),
                        onPressed: () => setState(() => _quantity++),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 14),

                // Add to Cart Button
                Expanded(
                  child: ElevatedButton(
                    onPressed: _handleConfirm,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      elevation: 0,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(LucideIcons.shoppingBag, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          'Add to Cart • ₹${_totalPrice.toStringAsFixed(2)}',
                          style: GoogleFonts.poppins(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
