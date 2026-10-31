import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../models/pos_models.dart';

class HeldOrdersSheet extends StatelessWidget {
  final List<HeldOrder> heldOrders;
  final ValueChanged<String> onRestoreOrder;
  final ValueChanged<String> onDeleteOrder;

  const HeldOrdersSheet({
    super.key,
    required this.heldOrders,
    required this.onRestoreOrder,
    required this.onDeleteOrder,
  });

  static Future<void> show(
    BuildContext context, {
    required List<HeldOrder> heldOrders,
    required ValueChanged<String> onRestoreOrder,
    required ValueChanged<String> onDeleteOrder,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => HeldOrdersSheet(
        heldOrders: heldOrders,
        onRestoreOrder: onRestoreOrder,
        onDeleteOrder: onDeleteOrder,
      ),
    );
  }

  String _formatElapsed(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return DateFormat('dd MMM, hh:mm a').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.cardDark : AppColors.cardLight;
    final textCol = isDark ? AppColors.textDark : AppColors.textLight;
    final borderCol = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
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
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
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

          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.occupied.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  LucideIcons.pauseCircle,
                  color: AppColors.occupied,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Held Orders (Parked)',
                      style: GoogleFonts.poppins(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: textCol,
                      ),
                    ),
                    Text(
                      '${heldOrders.length} parked tabs waiting',
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
              IconButton(
                icon: const Icon(LucideIcons.x, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Divider(color: borderCol, height: 1),
          const SizedBox(height: 14),

          // Content
          if (heldOrders.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      LucideIcons.checkCircle2,
                      size: 48,
                      color: isDark
                          ? AppColors.textMutedDark
                          : AppColors.textMutedLight,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'No orders currently on hold',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: textCol,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Park active orders to serve walk-ins quickly',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: isDark
                            ? AppColors.textMutedDark
                            : AppColors.textMutedLight,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                itemCount: heldOrders.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final order = heldOrders[index];
                  final itemsSummary = order.items
                      .map((i) => '${i.quantity}x ${i.name}')
                      .join(', ');

                  return Container(
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.bgDark : AppColors.bgLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderCol),
                    ),
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                order.tableOrCustomer,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                            const Spacer(),
                            Icon(
                              LucideIcons.clock,
                              size: 13,
                              color: isDark
                                  ? AppColors.textMutedDark
                                  : AppColors.textMutedLight,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _formatElapsed(order.timestamp),
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: isDark
                                    ? AppColors.textMutedDark
                                    : AppColors.textMutedLight,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          itemsSummary,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            color: textCol,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Text(
                              'Total: ₹${order.total.toStringAsFixed(2)}',
                              style: GoogleFonts.poppins(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                            const Spacer(),
                            // Discard button
                            IconButton(
                              icon: const Icon(
                                LucideIcons.trash2,
                                size: 18,
                                color: AppColors.destructive,
                              ),
                              tooltip: 'Discard',
                              onPressed: () {
                                onDeleteOrder(order.id);
                                Navigator.of(context).pop();
                              },
                            ),
                            const SizedBox(width: 6),
                            // Restore button
                            ElevatedButton.icon(
                              onPressed: () {
                                onRestoreOrder(order.id);
                                Navigator.of(context).pop();
                              },
                              icon: const Icon(LucideIcons.playCircle, size: 16),
                              label: const Text('Restore to Cart'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 8),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
