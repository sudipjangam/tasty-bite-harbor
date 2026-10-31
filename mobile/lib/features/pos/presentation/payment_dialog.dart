import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/access/access_controller.dart';
import '../../../core/hardware/thermal_printer_service.dart';
import '../models/pos_models.dart';

class PaymentDialog extends StatefulWidget {
  final double total;
  final double subtotal;
  final double tax;
  final double discount;
  final List<CartItem> items;
  final String customerOrTable;
  final Future<void> Function(
    PaymentMethod method,
    Map<String, dynamic> paymentDetails,
  )
  onPaymentSuccess;

  const PaymentDialog({
    super.key,
    required this.total,
    required this.subtotal,
    required this.tax,
    required this.discount,
    required this.items,
    required this.customerOrTable,
    required this.onPaymentSuccess,
  });

  static Future<void> show(
    BuildContext context, {
    required double total,
    required double subtotal,
    required double tax,
    required double discount,
    required List<CartItem> items,
    required String customerOrTable,
    required Future<void> Function(
      PaymentMethod method,
      Map<String, dynamic> paymentDetails,
    )
    onPaymentSuccess,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => PaymentDialog(
        total: total,
        subtotal: subtotal,
        tax: tax,
        discount: discount,
        items: items,
        customerOrTable: customerOrTable,
        onPaymentSuccess: onPaymentSuccess,
      ),
    );
  }

  @override
  State<PaymentDialog> createState() => _PaymentDialogState();
}

class _PaymentDialogState extends State<PaymentDialog> {
  late final String _billNumber;
  PaymentMethod _selectedMethod = PaymentMethod.cash;
  bool _isProcessing = false;
  bool _isSuccess = false;
  bool _printReceipt = true;
  String _customerMobile = '';

  // Cash state
  late TextEditingController _cashTenderedController;
  double _cashTendered = 0.0;

  // Card state
  final TextEditingController _cardRefController = TextEditingController();
  String _selectedTerminal = 'Terminal 1 (PineLabs)';

  // Split state
  final TextEditingController _splitCashController = TextEditingController();
  final TextEditingController _splitUpiController = TextEditingController();
  final TextEditingController _splitCardController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _billNumber = (DateTime.now().millisecondsSinceEpoch % 1000000)
        .toString()
        .padLeft(6, '0');
    _cashTendered = widget.total;
    _cashTenderedController = TextEditingController(
      text: widget.total.toStringAsFixed(0),
    );
    _cashTenderedController.addListener(() {
      final parsed = double.tryParse(_cashTenderedController.text) ?? 0.0;
      setState(() => _cashTendered = parsed);
    });

    _splitCashController.addListener(() => setState(() {}));
    _splitUpiController.addListener(() => setState(() {}));
    _splitCardController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _cashTenderedController.dispose();
    _cardRefController.dispose();
    _splitCashController.dispose();
    _splitUpiController.dispose();
    _splitCardController.dispose();
    super.dispose();
  }

  String? _buildUpiString() {
    final vpa = AccessController().restaurantUpiVpa;
    if (vpa == null || vpa.isEmpty) return null;
    final amountStr = widget.total.toStringAsFixed(2);
    final payeeName = Uri.encodeComponent(
      AccessController().restaurantName ?? 'Tasty Bite Harbor',
    );
    final note = Uri.encodeComponent(
      'POS Bill #${widget.customerOrTable.isEmpty ? "Direct" : widget.customerOrTable}',
    );
    return 'upi://pay?pa=$vpa&pn=$payeeName&am=$amountStr&cu=INR&tn=$note';
  }

  double get _splitTotal {
    final cash = double.tryParse(_splitCashController.text) ?? 0.0;
    final upi = double.tryParse(_splitUpiController.text) ?? 0.0;
    final card = double.tryParse(_splitCardController.text) ?? 0.0;
    return cash + upi + card;
  }

  double get _splitRemaining => widget.total - _splitTotal;

  Future<void> _handleCompletePayment() async {
    setState(() => _isProcessing = true);

    try {
      final details = <String, dynamic>{
        'billNumber': _billNumber,
        'method': _selectedMethod.name,
        'total': widget.total,
        'subtotal': widget.subtotal,
        'tax': widget.tax,
        'discount': widget.discount,
        'customerOrTable': widget.customerOrTable,
        'customerMobile': _customerMobile,
        'timestamp': DateTime.now().toIso8601String(),
      };

      if (_selectedMethod == PaymentMethod.cash) {
        details['tendered'] = _cashTendered;
        details['change'] = (_cashTendered - widget.total).clamp(
          0.0,
          double.infinity,
        );
      } else if (_selectedMethod == PaymentMethod.card) {
        details['terminal'] = _selectedTerminal;
        details['reference'] = _cardRefController.text.trim();
      } else if (_selectedMethod == PaymentMethod.split) {
        details['splitDetails'] = {
          'cash': double.tryParse(_splitCashController.text) ?? 0.0,
          'upi': double.tryParse(_splitUpiController.text) ?? 0.0,
          'card': double.tryParse(_splitCardController.text) ?? 0.0,
        };
      }

      // Simulate slight network or hardware delay for realism
      await Future.delayed(const Duration(milliseconds: 600));

      await widget.onPaymentSuccess(_selectedMethod, details);

      if (_printReceipt) {
        _triggerReceiptPrint();
      }

      if (mounted) {
        setState(() {
          _isProcessing = false;
          _isSuccess = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment failed: $e'),
            backgroundColor: AppColors.destructive,
          ),
        );
      }
    }
  }

  Future<bool> _triggerReceiptPrint() async {
    try {
      final service = ThermalPrinterService();
      final access = AccessController();
      final itemsMap = widget.items
          .map(
            (i) => {
              'name': i.name,
              'qty': i.quantity,
              'rate': i.unitPrice,
              'price': i.unitPrice,
              'amount': i.totalPrice,
            },
          )
          .toList();

      final bytes = service.buildReceiptBytes(
        restaurantName: access.restaurantName ?? 'Kiwi',
        restaurantAddress: access.restaurantAddress,
        restaurantPhone: access.restaurantPhone,
        restaurantGstin: access.restaurantGstin,
        orderNumber: _billNumber,
        tableName: widget.customerOrTable,
        serverName: access.serverName ?? 'Staff',
        orderDate: DateTime.now(),
        items: itemsMap,
        subtotal: widget.subtotal,
        discount: widget.discount,
        tax: widget.tax,
        total: widget.total,
        upiId: access.restaurantUpiVpa,
      );
      return await service.printBuffer(bytes: bytes);
    } catch (e) {
      debugPrint('Receipt print error: $e');
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.cardDark : AppColors.cardLight;
    final textCol = isDark ? AppColors.textDark : AppColors.textLight;
    final borderCol = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Dialog(
      backgroundColor: cardBg,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 720),
        child: _isSuccess
            ? _buildSuccessView(context, isDark, textCol)
            : _buildPaymentForm(context, isDark, textCol, borderCol),
      ),
    );
  }

  Widget _buildPaymentForm(
    BuildContext context,
    bool isDark,
    Color textCol,
    Color borderCol,
  ) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 16, 12),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  LucideIcons.creditCard,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Payment Checkout',
                      style: GoogleFonts.poppins(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: textCol,
                      ),
                    ),
                    Text(
                      widget.customerOrTable.isNotEmpty
                          ? widget.customerOrTable
                          : 'Walk-in Customer',
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
              IconButton(
                icon: const Icon(LucideIcons.x, size: 20),
                onPressed: _isProcessing
                    ? null
                    : () => Navigator.of(context).pop(),
              ),
            ],
          ),
        ),
        Divider(color: borderCol, height: 1),

        // Total Banner
        Container(
          width: double.infinity,
          color: isDark ? AppColors.bgDark : AppColors.bgLight,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total Payable:',
                style: GoogleFonts.poppins(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: isDark
                      ? AppColors.textMutedDark
                      : AppColors.textMutedLight,
                ),
              ),
              Text(
                '₹${widget.total.toStringAsFixed(2)}',
                style: GoogleFonts.poppins(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
        Divider(color: borderCol, height: 1),

        // Body Content
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Payment Method Selector Tabs
                Text(
                  'Select Payment Method',
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: textCol,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _buildMethodTab(
                      method: PaymentMethod.cash,
                      label: 'Cash',
                      icon: LucideIcons.banknote,
                    ),
                    const SizedBox(width: 8),
                    _buildMethodTab(
                      method: PaymentMethod.upi,
                      label: 'UPI / QR',
                      icon: LucideIcons.qrCode,
                    ),
                    const SizedBox(width: 8),
                    _buildMethodTab(
                      method: PaymentMethod.card,
                      label: 'Card',
                      icon: LucideIcons.creditCard,
                    ),
                    const SizedBox(width: 8),
                    _buildMethodTab(
                      method: PaymentMethod.split,
                      label: 'Split',
                      icon: LucideIcons.split,
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Method-specific views
                if (_selectedMethod == PaymentMethod.cash)
                  _buildCashView(isDark, textCol, borderCol)
                else if (_selectedMethod == PaymentMethod.upi)
                  _buildUpiView(isDark, textCol, borderCol)
                else if (_selectedMethod == PaymentMethod.card)
                  _buildCardView(isDark, textCol, borderCol)
                else if (_selectedMethod == PaymentMethod.split)
                  _buildSplitView(isDark, textCol, borderCol),

                const SizedBox(height: 20),
                Divider(color: borderCol, height: 1),
                const SizedBox(height: 14),

                // WhatsApp Bill Notification & Print Receipt Toggles
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        keyboardType: TextInputType.phone,
                        onChanged: (val) => _customerMobile = val,
                        decoration: InputDecoration(
                          hintText: 'Customer Phone (e-Bill WhatsApp)',
                          prefixIcon: const Icon(LucideIcons.phone, size: 16),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          filled: true,
                          fillColor: isDark
                              ? AppColors.bgDark
                              : AppColors.bgLight,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide(color: borderCol),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide(color: borderCol),
                          ),
                        ),
                        style: GoogleFonts.inter(fontSize: 13, color: textCol),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Checkbox(
                      value: _printReceipt,
                      activeColor: AppColors.primary,
                      onChanged: (v) =>
                          setState(() => _printReceipt = v ?? true),
                    ),
                    Text(
                      'Auto-print thermal kitchen & customer receipt',
                      style: GoogleFonts.inter(fontSize: 13, color: textCol),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),

        // Action Buttons
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _isProcessing
                      ? null
                      : () => Navigator.of(context).pop(),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: BorderSide(color: borderCol),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: Text(
                    'Cancel',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: isDark
                          ? AppColors.textMutedDark
                          : AppColors.textMutedLight,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: _isProcessing || !_canCompletePayment()
                      ? null
                      : _handleCompletePayment,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.available,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    elevation: 0,
                  ),
                  child: _isProcessing
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.white,
                            ),
                          ),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(LucideIcons.check, size: 18),
                            const SizedBox(width: 8),
                            Text(
                              'Confirm Payment',
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
        ),
      ],
    );
  }

  bool _canCompletePayment() {
    if (_selectedMethod == PaymentMethod.cash) {
      return _cashTendered >= widget.total;
    }
    if (_selectedMethod == PaymentMethod.split) {
      return _splitRemaining.abs() < 0.01;
    }
    return true;
  }

  Widget _buildMethodTab({
    required PaymentMethod method,
    required String label,
    required IconData icon,
  }) {
    final isSelected = _selectedMethod == method;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedMethod = method),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primary
                : AppColors.primary.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 20,
                color: isSelected ? Colors.white : AppColors.primary,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  color: isSelected ? Colors.white : AppColors.primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCashView(bool isDark, Color textCol, Color borderCol) {
    final change = _cashTendered - widget.total;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Tendered Amount',
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: textCol,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _cashTenderedController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            prefixText: '₹ ',
            prefixStyle: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: textCol,
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 12,
            ),
            filled: true,
            fillColor: isDark ? AppColors.bgDark : AppColors.bgLight,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: borderCol),
            ),
          ),
          style: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: textCol,
          ),
        ),
        const SizedBox(height: 10),

        // Quick tender pills
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _buildQuickCashButton('Exact', widget.total),
            _buildQuickCashButton('₹100', 100),
            _buildQuickCashButton('₹200', 200),
            _buildQuickCashButton('₹500', 500),
            _buildQuickCashButton('₹2000', 2000),
          ],
        ),
        const SizedBox(height: 16),

        // Change return status indicator
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: change >= 0
                ? AppColors.available.withValues(alpha: 0.12)
                : AppColors.destructive.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: change >= 0
                  ? AppColors.available.withValues(alpha: 0.3)
                  : AppColors.destructive.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                change >= 0 ? 'Change to Return:' : 'Remaining Due:',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: change >= 0
                      ? AppColors.available
                      : AppColors.destructive,
                ),
              ),
              Text(
                '₹${change.abs().toStringAsFixed(2)}',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: change >= 0
                      ? AppColors.available
                      : AppColors.destructive,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQuickCashButton(String label, double amount) {
    return ActionChip(
      label: Text(label),
      labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500),
      backgroundColor: AppColors.primary.withValues(alpha: 0.08),
      onPressed: () {
        setState(() {
          _cashTendered = amount;
          _cashTenderedController.text = amount.toStringAsFixed(0);
        });
      },
    );
  }

  Widget _buildUpiView(bool isDark, Color textCol, Color borderCol) {
    final upiUrl = _buildUpiString();

    if (upiUrl == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 30),
          child: Column(
            children: [
              const Icon(
                LucideIcons.alertCircle,
                size: 40,
                color: AppColors.occupied,
              ),
              const SizedBox(height: 12),
              Text(
                'No UPI VPA Configured',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: textCol,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Configure UPI ID in Settings to accept QR payments',
                style: GoogleFonts.inter(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    return Center(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderCol),
              boxShadow: const [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: QrImageView(
              data: upiUrl,
              version: QrVersions.auto,
              size: 190.0,
              backgroundColor: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Scan with any UPI App (GPay, PhonePe, Paytm)',
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: textCol,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              'UPI ID: ${AccessController().restaurantUpiVpa}',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardView(bool isDark, Color textCol, Color borderCol) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'EDC Card Terminal',
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: textCol,
          ),
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          initialValue: _selectedTerminal,
          items: const [
            DropdownMenuItem(
              value: 'Terminal 1 (PineLabs)',
              child: Text('Terminal 1 (PineLabs)'),
            ),
            DropdownMenuItem(
              value: 'Terminal 2 (Paytm POS)',
              child: Text('Terminal 2 (Paytm POS)'),
            ),
            DropdownMenuItem(
              value: 'Terminal 3 (Mswipe)',
              child: Text('Terminal 3 (Mswipe)'),
            ),
          ],
          onChanged: (val) =>
              setState(() => _selectedTerminal = val ?? _selectedTerminal),
          decoration: InputDecoration(
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 10,
            ),
            filled: true,
            fillColor: isDark ? AppColors.bgDark : AppColors.bgLight,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: borderCol),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'Transaction Reference / Approval Code (Optional)',
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: textCol,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _cardRefController,
          decoration: InputDecoration(
            hintText: 'e.g. TXN-948214',
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 10,
            ),
            filled: true,
            fillColor: isDark ? AppColors.bgDark : AppColors.bgLight,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: borderCol),
            ),
          ),
          style: GoogleFonts.inter(fontSize: 14, color: textCol),
        ),
      ],
    );
  }

  Widget _buildSplitView(bool isDark, Color textCol, Color borderCol) {
    final remaining = _splitRemaining;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Split Across Payment Modes',
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: textCol,
              ),
            ),
            TextButton(
              onPressed: () {
                // Auto fill remaining onto active or first field
                final currentTotal = _splitTotal;
                final diff = widget.total - currentTotal;
                if (diff > 0) {
                  _splitCashController.text =
                      ((double.tryParse(_splitCashController.text) ?? 0.0) +
                              diff)
                          .toStringAsFixed(0);
                }
              },
              child: const Text('Auto-balance'),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Cash portion
        TextField(
          controller: _splitCashController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'Cash Split Amount',
            prefixText: '₹ ',
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 10,
            ),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
        ),
        const SizedBox(height: 10),

        // UPI portion
        TextField(
          controller: _splitUpiController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'UPI Split Amount',
            prefixText: '₹ ',
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 10,
            ),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
        ),
        const SizedBox(height: 10),

        // Card portion
        TextField(
          controller: _splitCardController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'Card Split Amount',
            prefixText: '₹ ',
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 10,
            ),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
        ),
        const SizedBox(height: 12),

        // Remaining indicator
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: remaining.abs() < 0.01
                ? AppColors.available.withValues(alpha: 0.12)
                : AppColors.occupied.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                remaining.abs() < 0.01
                    ? 'Split Matched 100%'
                    : 'Remaining to Allocate:',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: remaining.abs() < 0.01
                      ? AppColors.available
                      : AppColors.occupied,
                ),
              ),
              Text(
                '₹${remaining.abs().toStringAsFixed(2)}',
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: remaining.abs() < 0.01
                      ? AppColors.available
                      : AppColors.occupied,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSuccessView(BuildContext context, bool isDark, Color textCol) {
    return Padding(
      padding: const EdgeInsets.all(28.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.available.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              LucideIcons.checkCheck,
              color: AppColors.available,
              size: 54,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Payment Successful!',
            style: GoogleFonts.poppins(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: textCol,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '₹${widget.total.toStringAsFixed(2)} collected via ${_selectedMethod.name.toUpperCase()}',
            style: GoogleFonts.inter(
              fontSize: 14,
              color: isDark
                  ? AppColors.textMutedDark
                  : AppColors.textMutedLight,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final ok = await _triggerReceiptPrint();
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          ok
                              ? 'Receipt sent to printer ✓'
                              : 'Failed to print receipt. Check printer connection.',
                        ),
                        backgroundColor: ok
                            ? AppColors.available
                            : AppColors.destructive,
                      ),
                    );
                  },
                  icon: const Icon(LucideIcons.printer, size: 16),
                  label: const Text('Reprint'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text('Done / New Order'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
