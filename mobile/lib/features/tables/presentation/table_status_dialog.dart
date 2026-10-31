import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../models/table_model.dart';

class TableStatusDialog extends StatefulWidget {
  final RestaurantTable table;
  final ValueChanged<RestaurantTable>? onTableUpdated;

  const TableStatusDialog({
    super.key,
    required this.table,
    this.onTableUpdated,
  });

  static Future<RestaurantTable?> show(
    BuildContext context, {
    required RestaurantTable table,
    ValueChanged<RestaurantTable>? onTableUpdated,
  }) {
    return showModalBottomSheet<RestaurantTable>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => TableStatusDialog(
        table: table,
        onTableUpdated: onTableUpdated,
      ),
    );
  }

  @override
  State<TableStatusDialog> createState() => _TableStatusDialogState();
}

class _TableStatusDialogState extends State<TableStatusDialog> {
  late String _selectedStatus;
  late TextEditingController _customerNameController;
  late TextEditingController _customerPhoneController;
  late TextEditingController _orderIdController;
  late int _guestCount;

  @override
  void initState() {
    super.initState();
    _selectedStatus = widget.table.parsedStatus.value;
    _customerNameController =
        TextEditingController(text: widget.table.customerName ?? '');
    _customerPhoneController =
        TextEditingController(text: widget.table.customerPhone ?? '');
    _orderIdController =
        TextEditingController(text: widget.table.currentOrderId ?? '');
    _guestCount = widget.table.guestCount ?? (widget.table.isAvailable ? 2 : widget.table.capacity);
  }

  @override
  void dispose() {
    _customerNameController.dispose();
    _customerPhoneController.dispose();
    _orderIdController.dispose();
    super.dispose();
  }

  void _handleSave() {
    final updated = widget.table.copyWith(
      status: _selectedStatus,
      customerName: _selectedStatus == 'available'
          ? null
          : (_customerNameController.text.trim().isEmpty
              ? null
              : _customerNameController.text.trim()),
      customerPhone: _selectedStatus == 'available'
          ? null
          : (_customerPhoneController.text.trim().isEmpty
              ? null
              : _customerPhoneController.text.trim()),
      currentOrderId: _selectedStatus == 'available'
          ? null
          : (_orderIdController.text.trim().isEmpty
              ? null
              : _orderIdController.text.trim()),
      guestCount: _selectedStatus == 'available' ? null : _guestCount,
      occupiedSince: _selectedStatus == 'occupied' && widget.table.occupiedSince == null
          ? DateTime.now()
          : (_selectedStatus == 'available' ? null : widget.table.occupiedSince),
      updatedAt: DateTime.now(),
    );

    widget.onTableUpdated?.call(updated);
    Navigator.of(context).pop(updated);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.cardDark : AppColors.cardLight;
    final text = isDark ? AppColors.textDark : AppColors.textLight;
    final textMuted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    final border = isDark ? AppColors.borderDark : AppColors.borderLight;

    final mediaQuery = MediaQuery.of(context);

    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(top: BorderSide(color: border, width: 1.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 24,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 14,
        bottom: mediaQuery.viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag Handle
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: textMuted.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Header: Table badge and title
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: AppGradients.orders,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.35),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      widget.table.name.replaceAll(RegExp(r'[^0-9]'), '').isEmpty
                          ? widget.table.name.substring(0, 1).toUpperCase()
                          : widget.table.name.replaceAll(RegExp(r'[^0-9]'), ''),
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 20,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Manage Table ${widget.table.name}',
                        style: GoogleFonts.poppins(
                          color: text,
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(LucideIcons.users, size: 14, color: textMuted),
                          const SizedBox(width: 4),
                          Text(
                            'Capacity: ${widget.table.capacity} Pax',
                            style: GoogleFonts.inter(
                              color: textMuted,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text('•', style: TextStyle(color: textMuted)),
                          const SizedBox(width: 8),
                          Text(
                            widget.table.section ?? 'Main Dining',
                            style: GoogleFonts.inter(
                              color: textMuted,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: Icon(LucideIcons.x, color: textMuted),
                  style: IconButton.styleFrom(
                    backgroundColor: border.withOpacity(0.4),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 22),

            // Section Label: Change Status
            Text(
              'TABLE STATUS',
              style: GoogleFonts.inter(
                color: textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.1,
              ),
            ),
            const SizedBox(height: 10),

            // 4 Status Badges Grid
            Row(
              children: [
                _buildStatusOption(
                  status: 'available',
                  label: 'Available',
                  color: AppColors.available,
                  icon: LucideIcons.checkCircle2,
                ),
                const SizedBox(width: 8),
                _buildStatusOption(
                  status: 'occupied',
                  label: 'Occupied',
                  color: AppColors.occupied,
                  icon: LucideIcons.utensils,
                ),
                const SizedBox(width: 8),
                _buildStatusOption(
                  status: 'billed',
                  label: 'Billed',
                  color: AppColors.billed,
                  icon: LucideIcons.receipt,
                ),
                const SizedBox(width: 8),
                _buildStatusOption(
                  status: 'reserved',
                  label: 'Reserved',
                  color: AppColors.reserved,
                  icon: LucideIcons.calendar,
                ),
              ],
            ),
            const SizedBox(height: 22),

            // Conditional Customer Assignment Fields
            if (_selectedStatus != 'available') ...[
              Text(
                'GUEST DETAILS',
                style: GoogleFonts.inter(
                  color: textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 10),

              // Guest Count Stepper
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF131D2E) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: border),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(LucideIcons.users, size: 18, color: AppColors.primary),
                        const SizedBox(width: 10),
                        Text(
                          'Party Size (Pax)',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: text,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        _buildStepperBtn(
                          icon: LucideIcons.minus,
                          onTap: () {
                            if (_guestCount > 1) {
                              setState(() => _guestCount--);
                            }
                          },
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          child: Text(
                            '$_guestCount',
                            style: GoogleFonts.poppins(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: text,
                            ),
                          ),
                        ),
                        _buildStepperBtn(
                          icon: LucideIcons.plus,
                          onTap: () {
                            if (_guestCount < 30) {
                              setState(() => _guestCount++);
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Customer Name Input
              TextField(
                controller: _customerNameController,
                style: GoogleFonts.inter(color: text, fontSize: 14),
                decoration: InputDecoration(
                  prefixIcon: Icon(LucideIcons.user, size: 18, color: textMuted),
                  labelText: 'Customer / Guest Name',
                  hintText: 'e.g. Ramesh Verma',
                  hintStyle: GoogleFonts.inter(color: textMuted.withOpacity(0.7), fontSize: 13),
                  labelStyle: GoogleFonts.inter(color: textMuted, fontSize: 13),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF131D2E) : const Color(0xFFF1F5F9),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
              const SizedBox(height: 12),

              // Customer Phone Input
              TextField(
                controller: _customerPhoneController,
                keyboardType: TextInputType.phone,
                style: GoogleFonts.inter(color: text, fontSize: 14),
                decoration: InputDecoration(
                  prefixIcon: Icon(LucideIcons.phone, size: 18, color: textMuted),
                  labelText: 'Contact Number (Optional)',
                  hintText: '+91 98765 43210',
                  hintStyle: GoogleFonts.inter(color: textMuted.withOpacity(0.7), fontSize: 13),
                  labelStyle: GoogleFonts.inter(color: textMuted, fontSize: 13),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF131D2E) : const Color(0xFFF1F5F9),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
              const SizedBox(height: 12),

              // Order ID Reference
              TextField(
                controller: _orderIdController,
                style: GoogleFonts.inter(color: text, fontSize: 14),
                decoration: InputDecoration(
                  prefixIcon: Icon(LucideIcons.tag, size: 18, color: textMuted),
                  labelText: 'Order / Ticket Reference',
                  hintText: 'e.g. ORD-9812',
                  hintStyle: GoogleFonts.inter(color: textMuted.withOpacity(0.7), fontSize: 13),
                  labelStyle: GoogleFonts.inter(color: textMuted, fontSize: 13),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF131D2E) : const Color(0xFFF1F5F9),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
              const SizedBox(height: 20),
            ] else ...[
              // Available message hint
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.available.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.available.withOpacity(0.25)),
                ),
                child: Row(
                  children: [
                    Icon(LucideIcons.info, size: 20, color: AppColors.available),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Marking as Available will clear active orders and open Table ${widget.table.name} for new diners.',
                        style: GoogleFonts.inter(
                          fontSize: 12.5,
                          color: text,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: BorderSide(color: border),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Text(
                      'Cancel',
                      style: GoogleFonts.inter(
                        color: textMuted,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _handleSave,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      elevation: 2,
                      shadowColor: AppColors.primary.withOpacity(0.4),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _selectedStatus == 'available'
                              ? LucideIcons.check
                              : LucideIcons.save,
                          size: 17,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _selectedStatus == 'available'
                              ? 'Release Table'
                              : 'Update Table',
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
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

  Widget _buildStatusOption({
    required String status,
    required String label,
    required Color color,
    required IconData icon,
  }) {
    final isSelected = _selectedStatus == status;

    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedStatus = status),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
          decoration: BoxDecoration(
            color: isSelected ? color.withOpacity(0.15) : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isSelected ? color : Colors.grey.withOpacity(0.2),
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 18,
                color: isSelected ? color : Colors.grey,
              ),
              const SizedBox(height: 5),
              Text(
                label,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? color : Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepperBtn({required IconData icon, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: AppColors.primary.withOpacity(0.12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, size: 16, color: AppColors.primary),
      ),
    );
  }
}
